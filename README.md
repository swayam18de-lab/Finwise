# FinWise

A personal finance app with a real three-part structure:

| Part | What it is | Where |
|---|---|---|
| Frontend | React 18 + Tailwind CSS + Recharts single page app | `public/index.html` |
| Backend | Node.js + Express REST API with login (bcrypt + JWT) | `server/` |
| Database | SQLite file (Node built-in `node:sqlite`) with `users`, `transactions`, `goals` | `data/finwise.db` (created on first run) |

Features: dashboard (income, spending, savings, money level, saving streak, 50/30/20 check, charts),
savings goals with milestones, SIP calculator with growth chart, expense tracker (add, edit, delete,
needs / wants / savings), dark mode, per-user accounts.

## Run it

You need Node.js 22.13 or newer (Node 24 or 26 are fine). The SQLite database is built into Node, so there is no native package to compile.

```bash
npm install
npm start
```

Open http://localhost:3000, create an account, then press "Load sample data" on the dashboard to explore.

Change the port with `PORT=4000 npm start`. `npm run dev` restarts the server when files change.

The frontend loads React, Tailwind, Recharts and the fonts from CDNs, so the browser needs internet access.
The server itself works offline.

## Project layout

```
finwise/
  package.json
  .env.example
  public/index.html        the whole frontend
  server/
    index.js               starts Express, mounts routes, serves public/
    config.js              port, data folder, JWT secret
    db.js                  opens SQLite and creates the tables
    middleware.js          requireAuth: checks the Bearer token
    validate.js            input checks for transactions and goals
    sample.js              sample data for new accounts
    routes/auth.js         register, login, me, sample, delete account
    routes/transactions.js CRUD for transactions
    routes/goals.js        CRUD for goals, plus "fund" (add money)
  data/                    created at runtime (database + JWT secret)
```

## Database

```sql
users(id, username UNIQUE NOCASE, pass_hash, created_at)
transactions(id, user_id -> users, type income|expense, descr, amount > 0,
             category income|needs|wants|savings, date)
goals(id, user_id -> users, name, target > 0, saved >= 0, deadline)
```

Deleting a user deletes their transactions and goals (`ON DELETE CASCADE`). To look inside the database:
`sqlite3 data/finwise.db` or any SQLite viewer (for example DB Browser for SQLite).

## API

All routes are under `/api`. Everything except register and login needs the header
`Authorization: Bearer <token>`.

| Method | Path | Body | Result |
|---|---|---|---|
| POST | /auth/register | `{username, password}` | `{token, user}` |
| POST | /auth/login | `{username, password}` | `{token, user}` |
| GET | /me | | `{user}` |
| POST | /sample | | adds sample data to your account |
| DELETE | /account | `{password}` | deletes your account and data |
| GET | /transactions | | `{transactions}` |
| POST | /transactions | `{type, desc, amount, category, date}` | `{transaction}` |
| PUT | /transactions/:id | same as POST | `{transaction}` |
| DELETE | /transactions/:id | | `{ok}` |
| GET | /goals | | `{goals}` |
| POST | /goals | `{name, target, saved?, deadline}` | `{goal}` |
| POST | /goals/:id/fund | `{amount}` | updated goal |
| DELETE | /goals/:id | | `{ok}` |

Quick test with curl:

```bash
curl -s -X POST localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"demo12345"}'
```

## Security notes

- Passwords are hashed with bcrypt (cost 10). Plain passwords are never stored or logged.
- Every query uses bound parameters, so SQL injection is not possible through the API.
- Every transaction and goal query filters by the logged-in user's id, so users cannot see or change each other's data.
- Login and register are rate limited (30 attempts per 15 minutes per IP).
- The token is kept in the browser's localStorage for 7 days. That is simple and fine for a project; for a
  production app, move it to an HttpOnly cookie.
- Before putting this online: serve it over HTTPS, set a strong `JWT_SECRET`, and back up `data/finwise.db`.

## Ideas for next steps

Password change, CSV export, recurring transactions, budgets per category, moving the frontend into a
Vite + React project with components in separate files.
