const crypto = require('crypto');
const db = require('./db');

// Dates are placed in the current and previous two months so the charts always look current.
function monthDate(monthsAgo, day) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const TX = [
  [2, 1, 'Salary', 'income', 62000], [2, 3, 'Rent', 'needs', 18000], [2, 10, 'Groceries', 'needs', 6500],
  [2, 15, 'Dining out', 'wants', 3200], [2, 20, 'Mutual fund SIP', 'savings', 8000],
  [1, 1, 'Salary', 'income', 62000], [1, 12, 'Freelance project', 'income', 9000], [1, 3, 'Rent', 'needs', 18000],
  [1, 9, 'Groceries', 'needs', 7000], [1, 18, 'Shopping', 'wants', 5500], [1, 22, 'Emergency fund top-up', 'savings', 10000],
  [0, 1, 'Salary', 'income', 65000], [0, 2, 'Rent', 'needs', 18000], [0, 5, 'Electricity bill', 'needs', 2300],
  [0, 6, 'OTT subscriptions', 'wants', 899], [0, 7, 'Weekend trip', 'wants', 2800], [0, 8, 'Emergency fund top-up', 'savings', 12000],
];
const GOALS = [
  ['Emergency fund', 300000, 120000, 12], ['Goa trip', 60000, 18000, 3], ['New laptop', 90000, 30000, 6],
];

function load(userId) {
  const addTx = db.prepare('INSERT INTO transactions (id, user_id, type, descr, amount, category, date) VALUES (?,?,?,?,?,?,?)');
  const addGoal = db.prepare('INSERT INTO goals (id, user_id, name, target, saved, deadline) VALUES (?,?,?,?,?,?)');
  db.exec('BEGIN');
  try {
    TX.forEach(([m, day, desc, cat, amt]) =>
      addTx.run(crypto.randomUUID(), userId, cat === 'income' ? 'income' : 'expense', desc, amt, cat, monthDate(m, day)));
    GOALS.forEach(([name, target, saved, monthsAhead]) => {
      const d = new Date();
      d.setMonth(d.getMonth() + monthsAhead);
      addGoal.run(crypto.randomUUID(), userId, name, target, saved, d.toISOString().slice(0, 10));
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

module.exports = { load };
