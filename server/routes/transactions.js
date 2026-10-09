const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware');
const v = require('../validate');

const router = express.Router();
router.use('/transactions', requireAuth);

const shape = (r) => ({ id: r.id, type: r.type, desc: r.descr, amount: r.amount, category: r.category, date: r.date });
const COLS = 'id, type, descr, amount, category, date';

router.get('/transactions', (req, res) => {
  const rows = db.prepare(`SELECT ${COLS} FROM transactions WHERE user_id = ? ORDER BY date DESC, rowid DESC`).all(req.user.id);
  res.json({ transactions: rows.map(shape) });
});

router.post('/transactions', (req, res) => {
  const { value, error } = v.transaction(req.body);
  if (error) return res.status(400).json({ error });
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO transactions (id, user_id, type, descr, amount, category, date) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.user.id, value.type, value.descr, value.amount, value.category, value.date);
  res.status(201).json({ transaction: shape({ id, ...value }) });
});

router.put('/transactions/:id', (req, res) => {
  const { value, error } = v.transaction(req.body);
  if (error) return res.status(400).json({ error });
  const info = db.prepare('UPDATE transactions SET type=?, descr=?, amount=?, category=?, date=? WHERE id=? AND user_id=?')
    .run(value.type, value.descr, value.amount, value.category, value.date, req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Transaction not found.' });
  res.json({ transaction: shape({ id: req.params.id, ...value }) });
});

router.delete('/transactions/:id', (req, res) => {
  const info = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Transaction not found.' });
  res.json({ ok: true });
});

module.exports = router;
