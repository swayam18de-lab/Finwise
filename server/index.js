const express = require('express');
const path = require('path');
const { PORT } = require('./config');
require('./db'); // opens the database and creates the tables on first run

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/transactions'));
app.use('/api', require('./routes/goals'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

app.use(express.static(path.join(__dirname, '..', 'public')));

// Bad JSON bodies and anything unexpected come back as JSON, never as an HTML stack trace.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => console.log(`FinWise running at http://localhost:${PORT}`));
