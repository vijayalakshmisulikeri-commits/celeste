# Deploying Celeste — full walkthrough

Follow this top to bottom, on your own laptop, in a terminal. Every
command is copy-pasteable. Do it in order — later steps depend on
earlier ones.

---

## Part 0: One-time laptop setup

Check you have these installed (run each command):

```
git --version
python3 --version
node --version
npm --version
```

If any are missing:
- **git**: https://git-scm.com/downloads
- **Python 3.10+**: https://www.python.org/downloads/
- **Node.js 18+**: https://nodejs.org (this includes npm)

---

## Part 1: Get the code into GitHub

```
cd ~/projects/celeste          # wherever you unzipped it
git init
git add .
git commit -m "Initial commit: Celeste to-do app"
```

Go to github.com → click `+` (top right) → **New repository** → name
it `celeste` → do NOT check "Add a README" → **Create repository**.

GitHub then shows you commands almost identical to these — run them:
```
git remote add origin https://github.com/YOUR_USERNAME/celeste.git
git branch -M main
git push -u origin main
```

Refresh the GitHub page — your code should now be there.

**Going forward, whenever you make changes:**
```
git add .
git commit -m "describe what you changed"
git push
```

---

## Part 2: Database — MongoDB Atlas (free)

1. Go to https://www.mongodb.com/cloud/atlas/register and sign up.
2. When asked, create a **free (M0) cluster** — any cloud provider/region is fine, pick one close to you.
3. **Database Access** (left sidebar) → **Add New Database User**:
   - Username: anything, e.g. `celeste_app`
   - Password: click "Autogenerate" and **save it somewhere** — you'll need it in a moment
   - User privileges: "Read and write to any database" is fine
4. **Network Access** (left sidebar) → **Add IP Address** → **Allow access from anywhere** (0.0.0.0/0). This is fine for a personal project.
5. **Database** (left sidebar) → **Connect** on your cluster → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://celeste_app:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with the real password from step 3. **Save this full string** — you'll paste it into Render in Part 3.

---

## Part 3: Backend — Render (free)

1. Go to https://render.com and sign up (you can sign up directly with your GitHub account — easiest option).
2. Dashboard → **New** → **Web Service**.
3. Connect your `celeste` GitHub repo.
4. Settings:
   - **Root Directory**: `backend`
   - **Environment**: Render should auto-detect the `Dockerfile` — if it asks, choose **Docker**.
   - **Instance type**: Free
5. Scroll to **Environment Variables** → add these three:
   | Key | Value |
   |---|---|
   | `MONGODB_URI` | the full connection string from Part 2 |
   | `DB_NAME` | `celeste` |
   | `JWT_SECRET_KEY` | run `python3 -c "import secrets; print(secrets.token_hex(32))"` on your laptop and paste the output |
6. Click **Create Web Service**. Wait for the build to finish (a few minutes).
7. Once live, you'll get a URL like `https://celeste-xxxx.onrender.com`. Test it by opening `https://celeste-xxxx.onrender.com/docs` in your browser — you should see the interactive API docs. **Save this URL** for Part 4.

> Free Render services "sleep" after inactivity and take ~30-60 seconds to
> wake up on the next request. That's normal for the free tier, not a bug.

---

## Part 4: Frontend — Vercel (free)

1. Go to https://vercel.com and sign up with GitHub.
2. **Add New** → **Project** → import your `celeste` repo.
3. Settings:
   - **Root Directory**: `frontend`
   - Framework preset: Vercel should auto-detect **Vite**
4. **Environment Variables** → add:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | your Render backend URL from Part 3 (no trailing slash) |
5. Click **Deploy**. When it finishes, you'll get a URL like `https://celeste-yourname.vercel.app` — that's your live app.

---

## Part 5: Tighten security (optional but recommended)

Right now the backend accepts requests from any website (`allow_origins=["*"]`).
Once your Vercel URL is final, lock it down:

1. On your laptop, open `backend/main.py`, find:
   ```python
   allow_origins=["*"],
   ```
   change it to:
   ```python
   allow_origins=["https://celeste-yourname.vercel.app"],
   ```
2. Save, then:
   ```
   git add .
   git commit -m "Restrict CORS to production frontend"
   git push
   ```
   Render will automatically redeploy on push (that's the default setting).

---

## Part 6: Using it day-to-day

- **Visit your app**: `https://celeste-yourname.vercel.app`
- **Making code changes**: edit locally → test with `npm run dev` (frontend)
  or `uvicorn main:app --reload` (backend) → `git add .` → `git commit -m "..."` → `git push`
  → Render and Vercel both auto-redeploy on every push. No manual redeploy step needed.
- **Checking backend logs**: Render dashboard → your service → **Logs** tab
- **Checking database contents**: MongoDB Atlas → Database → **Browse Collections**

## Troubleshooting

- **Frontend loads but login/register fails**: almost always `VITE_API_URL` is wrong or missing on Vercel — check Vercel → Project → Settings → Environment Variables, then redeploy.
- **Render backend won't start**: check the **Logs** tab — usually a missing/mistyped environment variable.
- **"CORS error" in browser console**: your Vercel URL doesn't match `allow_origins` in `main.py` (see Part 5) — or you haven't restricted it yet, which is also fine (means `*` is still active, so this shouldn't happen until you do Part 5).
