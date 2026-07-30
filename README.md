# Celeste — a to-do app that actually remembers

A full-stack, multi-user to-do app: FastAPI + MongoDB backend, React frontend.
Three sections (Personal & Habits, Academic, Reminders), editable tasks,
subtask checklists, streaks, completion progress bars, and a small
motivational nudge every time you finish something.

## Project structure

```
celeste/
├── backend/
│   ├── main.py          # all API routes
│   ├── models.py         # Pydantic request/response schemas
│   ├── database.py        # MongoDB connection (real or in-memory demo)
│   ├── auth.py              # password hashing + JWT tokens
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api.js                    # all backend calls
    │   ├── context/AuthContext.jsx    # login state
    │   ├── pages/                     # Login, Register, Dashboard, Profile
    │   └── components/                # TaskCard, NewTaskForm, ProgressBar, etc.
    └── package.json
```

## Features

- **Multi-user accounts** — email/password signup, bcrypt-hashed passwords, JWT sessions
- **Three sections**: Personal & Habits, Academic, Reminders — each with its own quick-add and progress bar
- **Editable tasks** — title, description, priority, due date, category, all editable after creation
- **Subtask checklists** inside any task
- **Archiving** (not deleting) — completed tasks move to a collapsible "completed" list per section, restorable any time
- **Streaks** — completing a task within ~36 hours of your last completion continues the streak; a bigger gap resets it to 1
- **Progress bars** — overall and per-section completion percentage
- **A quiet motivational nudge** after finishing a task (original phrases, not quoted from anywhere)
- **Interactive API docs** at `/docs` (Swagger UI, generated automatically by FastAPI)

## Running it locally

### Backend
```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
Without a `MONGODB_URI` set, it automatically uses an in-memory mock database
so you can try everything immediately — just know data resets when the
server restarts. See "Going live" below to connect a real, persistent database.

### Frontend
```
cd frontend
npm install
npm run dev
```
Create a `.env` file in `frontend/` if your backend isn't at the default
`http://localhost:8000`:
```
VITE_API_URL=http://localhost:8000
```

## Going live (free tier, real persistence)

**1. Database — MongoDB Atlas**
- Create a free cluster at https://www.mongodb.com/cloud/atlas
- Database Access → add a user with a password
- Network Access → allow access from anywhere (0.0.0.0/0) for simplicity
- Database → Connect → Drivers → copy the connection string

**2. Backend — Render (or Railway/Fly.io)**
- Push the `backend/` folder to a GitHub repo
- On Render: New → Web Service → connect the repo
- Environment: Docker (it'll pick up the included `Dockerfile` automatically)
- Add environment variables:
  - `MONGODB_URI` = the Atlas connection string
  - `JWT_SECRET_KEY` = output of `python3 -c "import secrets; print(secrets.token_hex(32))"`
  - `DB_NAME` = `celeste`
- Deploy. You'll get a URL like `https://celeste-api.onrender.com`

**3. Frontend — Vercel (or Netlify)**
- Push `frontend/` to GitHub (same repo or separate)
- On Vercel: New Project → import the repo, root directory = `frontend`
- Add environment variable: `VITE_API_URL` = your Render backend URL
- Deploy. You'll get a URL like `https://celeste.vercel.app`

**4. Update backend CORS (optional but more secure)**
In `main.py`, change `allow_origins=["*"]` to
`allow_origins=["https://celeste.vercel.app"]` (your real frontend URL),
then redeploy the backend.

## Architecture notes (useful for interviews)

- **Separation of concerns**: `fetch`/`clean`/`analyze`-style split — `models.py`
  defines shape, `database.py` handles the connection, `auth.py` handles
  security, `main.py` wires routes together.
- **Per-user data isolation**: every task query filters by `user_id` pulled
  from the verified JWT — never from anything the client claims. Tested
  explicitly: a second account cannot see or delete the first account's tasks.
- **Stateless auth**: no server-side session storage. The JWT itself carries
  identity + expiry, verified on each request via FastAPI's dependency
  injection (`Depends(get_current_user)`).
- **Streak logic** lives in one dedicated endpoint (`POST /tasks/{id}/complete`)
  rather than being folded into the generic PATCH — keeps "mark as done"
  business logic (the streak math) separate from "edit any field" logic.
