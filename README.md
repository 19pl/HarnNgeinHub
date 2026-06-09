# HarnNgeinHub — Split Money App

A group expense-splitting web app. Built with plain HTML/CSS/JS on the frontend and Node.js + Express + MongoDB on the backend.

## Setup

1. Clone the repo and go into the project folder.

2. Copy `.env.example` to `.env` and fill in your values:
   - `MONGO_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET` — any random secret string
   - `PORT` — default is 5000

3. Install dependencies:
```bash
   cd backend
   npm install
```

4. Run the development server:
```bash
   npm run dev
```

5. Open your browser at `http://localhost:5000`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/groups | Create a new group `{ name, members[] }` |
| GET | /api/groups/:id | Get group data with expenses |
| POST | /api/expenses | Add an expense `{ groupId, payer, amount, detail }` |
| GET | /api/expenses/group/:groupId | Get all expenses for a group |
| GET | /api/summary/:groupId | Get totals and settlement transactions |
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login and receive JWT |
| GET | /api/auth/me | Get current user (requires Bearer token) |

## MongoDB Schemas

**Group** — `name: String`, `members: [String]`, `createdBy: ObjectId (optional)`

**Expense** — `group: ObjectId`, `payer: String`, `amount: Number`, `detail: String`, `category: String`, `splitBetween: [{ user, amount }]`, `date: Date`

**User** — `username: String`, `email: String`, `password: String (bcrypt hashed)`, `role: user|admin`
