```js
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware');
const v = require('../validate');

const router = express.Router();

router.use('/transactions', requireAuth);

const shape = (r) => ({
  id: r.id,
  type: r.type,
  desc: r.descr,
  amount: Number(r.amount),
  category: r.category,
  date: r.date,
});

const COLS = 'id, type, descr, amount, category, date';

router.get('/transactions', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT ${COLS}
       FROM transactions
       WHERE user_id = $1
       ORDER BY date DESC, id DESC`,
      [req.user.id]
    );

    res.json({ transactions: result.rows.map(shape) });
  } catch (err) {
    next(err);
  }
});

router.post('/transactions', async (req, res, next) => {
  try {
    const { value, error } = v.transaction(req.body);

    if (error) {
      return res.status(400).json({ error });
    }

    const id = crypto.randomUUID();

    const result = await db.query(
      `INSERT INTO transactions
       (id, user_id, type, descr, amount, category, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${COLS}`,
      [
        id,
        req.user.id,
        value.type,
        value.descr,
        value.amount,
        value.category,
        value.date,
      ]
    );

    res.status(201).json({
      transaction: shape(result.rows[0]),
    });
  } catch (err) {
    next(err);
  }
});

router.put('/transactions/:id', async (req, res, next) => {
  try {
    const { value, error } = v.transaction(req.body);

    if (error) {
      return res.status(400).json({ error });
    }

    const result = await db.query(
      `UPDATE transactions
       SET type = $1, descr = $2, amount = $3,
           category = $4, date = $5
       WHERE id = $6 AND user_id = $7
       RETURNING ${COLS}`,
      [
        value.type,
        value.descr,
        value.amount,
        value.category,
        value.date,
        req.params.id,
        req.user.id,
      ]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: 'Transaction not found.',
      });
    }

    res.json({ transaction: shape(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.delete('/transactions/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: 'Transaction not found.',
      });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```
