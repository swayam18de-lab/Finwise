// Small input checks shared by the routes. Each returns { value } or { error }.
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (s) => typeof s === 'string' && DATE.test(s) && !Number.isNaN(Date.parse(s));
const money = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0 && n < 1e10;
const text = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.trim().length <= max;

function transaction(b = {}) {
  const type = b.type;
  if (!['income', 'expense'].includes(type)) return { error: 'Type must be income or expense.' };
  if (!text(b.desc, 120)) return { error: 'Add a description (up to 120 characters).' };
  if (!money(b.amount)) return { error: 'Amount must be a number above zero.' };
  if (!isDate(b.date)) return { error: 'Use a valid date (YYYY-MM-DD).' };
  const category = type === 'income' ? 'income' : b.category;
  if (!['needs', 'wants', 'savings', 'income'].includes(category) || (type === 'expense' && category === 'income'))
    return { error: 'Category must be needs, wants or savings.' };
  return { value: { type, descr: b.desc.trim(), amount: b.amount, category, date: b.date } };
}

function goal(b = {}) {
  if (!text(b.name, 80)) return { error: 'Give the goal a name (up to 80 characters).' };
  if (!money(b.target)) return { error: 'Target must be a number above zero.' };
  const saved = b.saved === undefined || b.saved === null ? 0 : b.saved;
  if (typeof saved !== 'number' || !Number.isFinite(saved) || saved < 0 || saved >= 1e10)
    return { error: 'Saved amount must be zero or more.' };
  if (!isDate(b.deadline)) return { error: 'Use a valid deadline date.' };
  return { value: { name: b.name.trim(), target: b.target, saved, deadline: b.deadline } };
}

module.exports = { transaction, goal, money };
