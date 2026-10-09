```js
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware');
const v = require('../validate');

const router = express.Router();

router.use('/goals', requireAuth);

router.get('/goals', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, target, saved, deadline
       FROM goals
       WHERE user_id = $1
       ORDER BY id DESC`,
      [req.user.id]
    );

    res.json({ goals: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/goals', async (req, res, next) => {
  try {
    const { value, error } = v.goal(req.body);

    if (error) {
      return res.status(400).json({ error });
    }

    const id = crypto.randomUUID();

    const result = await db.query(
      `INSERT INTO goals (id, user_id, name, target, saved, deadline)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, target, saved, deadline`,
      [
        id,
        req.user.id,
        value.name,
        value.target,
        value.saved,
        value.deadline,
      ]
    );

    res.status(201).json({ goal: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Add money to a goal directly in SQL.
router.post('/goals/:id/fund', async (req, res, next) => {
  try {
    const amount = req.body && req.body.amount;

    if (!v.money(amount)) {
      return res.status(400).json({
        error: 'Amount must be a number above zero.',
      });
    }

    const result = await db.query(
      `UPDATE goals
       SET saved = saved + $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, name, target, saved, deadline`,
      [amount, req.params.id, req.user.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Goal not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/goals/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Goal not found.' });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```
