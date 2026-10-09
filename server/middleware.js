const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config');

// Reads "Authorization: Bearer <token>" and sets req.user = { id, username }.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: Number(payload.sub), username: payload.username };
    next();
  } catch {
    res.status(401).json({ error: 'Your session expired. Please log in again.' });
  }
}

module.exports = { requireAuth };
