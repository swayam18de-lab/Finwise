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
// Compared against when a username does not exist, so a miss takes as long as a hit.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});

const issue = (u) => ({
  token: jwt.sign({ sub: u.id, username: u.username }, JWT_SECRET, { expiresIn: TOKEN_TTL }),
  user: { id: u.id, username: u.username },
});

router.post('/auth/register', limiter, (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || !USERNAME.test(username.trim()))
    return res.status(400).json({ error: 'Username needs 3 to 24 letters, numbers, dots, dashes or underscores.' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 128)
    return res.status(400).json({ error: 'Use 8 to 128 characters for your password.' });
  const name = username.trim();
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(name))
    return res.status(409).json({ error: 'That username is taken. Pick another, or log in.' });
  const info = db.prepare('INSERT INTO users (username, pass_hash) VALUES (?, ?)').run(name, bcrypt.hashSync(password, 10));
  res.status(201).json(issue({ id: Number(info.lastInsertRowid), username: name }));
});

router.post('/auth/login', limiter, (req, res) => {
  const { username, password } = req.body || {};
  const row = typeof username === 'string'
    ? db.prepare('SELECT id, username, pass_hash FROM users WHERE username = ?').get(username.trim())
    : null;
  const ok = bcrypt.compareSync(typeof password === 'string' ? password : '', row ? row.pass_hash : DUMMY_HASH);
  if (!row || !ok) return res.status(401).json({ error: 'Wrong username or password.' });
  res.json(issue(row));
});

router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(401).json({ error: 'Account not found. Please log in again.' });
  res.json({ user: row });
});

router.post('/sample', requireAuth, (req, res) => {
  sample.load(req.user.id);
  res.status(201).json({ ok: true });
});

router.delete('/account', requireAuth, (req, res) => {
  const row = db.prepare('SELECT pass_hash FROM users WHERE id = ?').get(req.user.id);
  const pw = req.body && req.body.password;
  if (!row || typeof pw !== 'string' || !bcrypt.compareSync(pw, row.pass_hash))
    return res.status(403).json({ error: 'Password is incorrect.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id); // transactions and goals cascade
  res.json({ ok: true });
});

module.exports = router;
