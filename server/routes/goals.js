const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware');
const v = require('../validate');

const router = express.Router();
router.use('/goals', requireAuth);

router.get('/goals', (req, res) => {
  const goals = db.prepare('SELECT id, name, target, saved, deadline FROM goals WHERE user_id = ? ORDER BY rowid DESC').all(req.user.id);
  res.json({ goals });
});

router.post('/goals', (req, res) => {
  const { value, error } = v.goal(req.body);
  if (error) return res.status(400).json({ error });
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO goals (id, user_id, name, target, saved, deadline) VALUES (?,?,?,?,?,?)')
    .run(id, req.user.id, value.name, value.target, value.saved, value.deadline);
  res.status(201).json({ goal: { id, ...value } });
});

// Add money to a goal. The addition happens inside SQL so two quick requests never overwrite each other.
router.post('/goals/:id/fund', (req, res) => {
  const amount = req.body && req.body.amount;
  if (!v.money(amount)) return res.status(400).json({ error: 'Amount must be a number above zero.' });
  const info = db.prepare('UPDATE goals SET saved = saved + ? WHERE id = ? AND user_id = ?').run(amount, req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Goal not found.' });
  res.json(db.prepare('SELECT id, name, target, saved, deadline FROM goals WHERE id = ?').get(req.params.id));
});

router.delete('/goals/:id', (req, res) => {
  const info = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Goal not found.' });
  res.json({ ok: true });
});

module.exports = router;
