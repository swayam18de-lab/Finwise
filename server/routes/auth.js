```js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const db = require('../db');
const { JWT_SECRET, TOKEN_TTL } = require('../config');
const { requireAuth } = require('../middleware');
const sample = require('../sample');

const router = express.Router();
const USERNAME = /^[A-Za-z0-9_.-]{3,24}$/;
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});

const issue = (u) => ({
  token: jwt.sign(
    { sub: String(u.id), username: u.username },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  ),
  user: { id: u.id, username: u.username },
});

router.post('/auth/register', limiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (typeof username !== 'string' || !USERNAME.test(username.trim())) {
      return res.status(400).json({
        error: 'Username needs 3 to 24 letters, numbers, dots, dashes or underscores.',
      });
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({
        error: 'Use 8 to 128 characters for your password.',
      });
    }

    const name = username.trim();
    const existing = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [name]
    );

    if (existing.rowCount) {
      return res.status(409).json({
        error: 'That username is taken. Pick another, or log in.',
      });
    }

    const passHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (username, pass_hash) VALUES ($1, $2) RETURNING id, username',
      [name, passHash]
    );

    res.status(201).json(issue(result.rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'That username is taken. Pick another, or log in.',
      });
    }
    next(err);
  }
});

router.post('/auth/login', limiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    const result = typeof username === 'string'
      ? await db.query(
          'SELECT id, username, pass_hash FROM users WHERE LOWER(username) = LOWER($1)',
          [username.trim()]
        )
      : { rows: [] };

    const row = result.rows[0];
    const ok = await bcrypt.compare(
      typeof password === 'string' ? password : '',
      row ? row.pass_hash : DUMMY_HASH
    );

    if (!row || !ok) {
      return res.status(401).json({ error: 'Wrong username or password.' });
    }

    res.json(issue(row));
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, username FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!result.rowCount) {
      return res.status(401).json({
        error: 'Account not found. Please log in again.',
      });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/sample', requireAuth, async (req, res, next) => {
  try {
    await sample.load(req.user.id);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT pass_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const row = result.rows[0];
    const password = req.body && req.body.password;

    if (
      !row ||
      typeof password !== 'string' ||
      !(await bcrypt.compare(password, row.pass_hash))
    ) {
      return res.status(403).json({ error: 'Password is incorrect.' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```
