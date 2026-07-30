"""
main.py
--------
The FastAPI application itself: every URL route the frontend can call.

REST API DESIGN CONVENTION used throughout:
  GET    /tasks       -> list tasks
  POST   /tasks        -> create a task
  PATCH  /tasks/{id}    -> partially update a task
  DELETE /tasks/{id}     -> delete a task
This "resource + HTTP verb" pattern is the industry-standard way to
design APIs -- interviewers will recognize it immediately.
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone, timedelta, date
from typing import Optional
import uuid

from models import (
    UserRegister, UserLogin, UserOut, UserUpdate,
    TaskCreate, TaskUpdate, TaskOut, SubTaskCreate,
    Token,
)
from database import users_collection, tasks_collection
from auth import hash_password, verify_password, create_access_token, decode_access_token

app = FastAPI(
    title="Celeste API",
    description="Backend for Celeste, a multi-user to-do app with persistent, per-account task data.",
    version="1.0.0",
)

# CORS: by default browsers block a webpage on one domain from calling
# an API on another domain, as a security measure. Since our frontend
# (e.g. celeste.vercel.app) and backend (e.g. celeste-api.onrender.com)
# live on different domains, we have to explicitly allow it here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in a stricter production setup, list exact frontend URL(s) instead
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tells FastAPI's auto-generated docs (Swagger UI) that routes needing
# auth expect a "Bearer <token>" header, and gives us a dependency
# we can reuse everywhere below.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# ---------- Helpers ----------

def serialize_user(doc) -> UserOut:
    return UserOut(id=str(doc["_id"]), name=doc["name"], email=doc["email"], created_at=doc["created_at"])


def app_date(dt: datetime) -> str:
    """
    Returns the 'app day' for a given moment, as a 'YYYY-MM-DD' string.

    Habits reset at 3am rather than midnight -- so if you're up late and
    it's 1am, that still counts as "yesterday" for habit purposes (you
    haven't started your new day yet). This matches how people actually
    think about a daily routine much better than a strict midnight cutoff.
    """
    if dt.hour < 3:
        dt = dt - timedelta(days=1)
    return dt.date().isoformat()


def compute_streak(completion_dates: list, today_str: str) -> int:
    """
    Counts consecutive app-days ending at today (or yesterday, if today
    hasn't been completed yet -- you get a grace period until the day
    is actually over, same idea as a GitHub contribution streak: missing
    *today* so far doesn't break the streak until the day fully passes).
    """
    dates = {date.fromisoformat(d) for d in set(completion_dates)}
    today = date.fromisoformat(today_str)

    if today in dates:
        anchor = today
    elif (today - timedelta(days=1)) in dates:
        anchor = today - timedelta(days=1)
    else:
        return 0

    streak = 0
    cur = anchor
    while cur in dates:
        streak += 1
        cur -= timedelta(days=1)
    return streak


def serialize_task(doc) -> TaskOut:
    completion_dates = doc.get("completion_dates", [])
    today_str = app_date(datetime.now(timezone.utc))
    return TaskOut(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc.get("description", ""),
        priority=doc["priority"],
        due_date=doc.get("due_date"),
        archived=doc.get("archived", False),
        category=doc.get("category", "personal"),
        subtasks=doc.get("subtasks", []),
        streak=doc.get("streak", 0),
        last_completed_at=doc.get("last_completed_at"),
        recurring=doc.get("recurring", False),
        completion_dates=completion_dates,
        done_today=today_str in completion_dates,
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    A FastAPI "dependency" -- any route that includes
    `user = Depends(get_current_user)` in its signature automatically
    runs this first. It pulls the token from the request header,
    verifies it, and fetches the matching user -- or rejects the
    request with 401 Unauthorized if anything's wrong.

    This is what makes each user only ever see THEIR OWN tasks.
    """
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except InvalidId:
        user = None
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
    return user


# ---------- Auth routes ----------

@app.post("/auth/register", response_model=UserOut, status_code=201)
async def register(payload: UserRegister):
    existing = await users_collection.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc),
    }
    result = await users_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_user(doc)


@app.post("/auth/login", response_model=Token)
async def login(payload: UserLogin):
    user = await users_collection.find_one({"email": payload.email})
    # Deliberately vague error message -- never reveal whether it was the
    # email or password that was wrong. That distinction helps attackers
    # enumerate valid accounts.
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token(str(user["_id"]))
    return Token(access_token=token)


@app.get("/auth/me", response_model=UserOut)
async def get_me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


@app.patch("/auth/me", response_model=UserOut)
async def update_me(payload: UserUpdate, user: dict = Depends(get_current_user)):
    updates = {}
    if payload.name is not None:
        updates["name"] = payload.name
    if payload.password is not None:
        updates["password_hash"] = hash_password(payload.password)

    if updates:
        await users_collection.update_one({"_id": user["_id"]}, {"$set": updates})
        user = await users_collection.find_one({"_id": user["_id"]})
    return serialize_user(user)


# ---------- Task routes ----------

@app.get("/tasks", response_model=list[TaskOut])
async def list_tasks(include_archived: bool = False, user: dict = Depends(get_current_user)):
    query = {"user_id": user["_id"]}
    if not include_archived:
        query["archived"] = False

    cursor = tasks_collection.find(query)
    tasks = [serialize_task(t) async for t in cursor]

    # Sort by priority (high first) then by due date (soonest first,
    # with tasks that have no due date pushed to the end).
    #
    # NOTE: MongoDB (and mongomock) can hand back naive datetimes even
    # when an aware one was stored. Comparing a naive and an aware
    # datetime raises a TypeError, so we normalize every due_date to
    # naive-UTC before comparing -- avoids a subtle bug that only shows
    # up when two tasks share a priority and only one has a due date.
    def sort_key(t):
        priority_rank = {"high": 0, "medium": 1, "low": 2}
        if t.due_date:
            due = t.due_date.replace(tzinfo=None) if t.due_date.tzinfo else t.due_date
        else:
            due = datetime.max
        return (priority_rank[t.priority], due)

    tasks.sort(key=sort_key)
    return tasks


@app.post("/tasks", response_model=TaskOut, status_code=201)
async def create_task(payload: TaskCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user["_id"],
        "title": payload.title,
        "description": payload.description or "",
        "priority": payload.priority,
        "due_date": payload.due_date,
        "archived": False,
        "category": payload.category,
        "subtasks": [],
        "streak": 0,
        "last_completed_at": None,
        "recurring": payload.recurring,
        "completion_dates": [],
        "created_at": now,
        "updated_at": now,
    }
    result = await tasks_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_task(doc)


async def _get_owned_task(task_id: str, user: dict):
    """Shared lookup: fetch a task ONLY if it belongs to the current user.
    This is the key line that prevents User A from editing User B's tasks
    just by guessing a task ID."""
    try:
        oid = ObjectId(task_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Task not found")

    task = await tasks_collection.find_one({"_id": oid, "user_id": user["_id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post("/tasks/{task_id}/complete", response_model=TaskOut)
async def complete_task(task_id: str, user: dict = Depends(get_current_user)):
    """
    Marks a task done for today and updates its streak.

    TWO DIFFERENT BEHAVIORS:
    - One-off task: archived permanently (existing behavior) -- streak
      is based on the gap since it was last completed.
    - Recurring (daily habit) task: NEVER archived. Instead, today's
      app-date is toggled in `completion_dates`. Because `done_today`
      is computed live from "is today's app-date in this list", the
      task automatically shows as "not done" again once the app-day
      rolls over past 3am -- no background job or cron needed.
    """
    task = await _get_owned_task(task_id, user)
    now = datetime.now(timezone.utc)

    if task.get("recurring", False):
        today_str = app_date(now)
        completion_dates = list(set(task.get("completion_dates", [])))

        if today_str in completion_dates:
            # Already done today -- treat a second click as "undo".
            completion_dates.remove(today_str)
        else:
            completion_dates.append(today_str)

        new_streak = compute_streak(completion_dates, today_str)

        await tasks_collection.update_one(
            {"_id": task["_id"]},
            {"$set": {
                "completion_dates": completion_dates,
                "streak": new_streak,
                "last_completed_at": now,
                "updated_at": now,
            }},
        )
    else:
        # One-off task: original archive + gap-based streak behavior.
        last_completed = task.get("last_completed_at")
        if last_completed:
            if last_completed.tzinfo is None:
                last_completed = last_completed.replace(tzinfo=timezone.utc)
            gap_hours = (now - last_completed).total_seconds() / 3600
            new_streak = task.get("streak", 0) + 1 if gap_hours <= 36 else 1
        else:
            new_streak = 1

        await tasks_collection.update_one(
            {"_id": task["_id"]},
            {"$set": {
                "archived": True,
                "streak": new_streak,
                "last_completed_at": now,
                "updated_at": now,
            }},
        )

    updated = await tasks_collection.find_one({"_id": task["_id"]})
    return serialize_task(updated)


@app.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(task_id: str, payload: TaskUpdate, user: dict = Depends(get_current_user)):
    task = await _get_owned_task(task_id, user)

    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    updates["updated_at"] = datetime.now(timezone.utc)

    await tasks_collection.update_one({"_id": task["_id"]}, {"$set": updates})
    updated = await tasks_collection.find_one({"_id": task["_id"]})
    return serialize_task(updated)


@app.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await _get_owned_task(task_id, user)
    await tasks_collection.delete_one({"_id": task["_id"]})


# ---------- Subtask (checklist) routes ----------

@app.post("/tasks/{task_id}/subtasks", response_model=TaskOut, status_code=201)
async def add_subtask(task_id: str, payload: SubTaskCreate, user: dict = Depends(get_current_user)):
    task = await _get_owned_task(task_id, user)
    subtask = {"id": str(uuid.uuid4()), "title": payload.title, "done": False}

    await tasks_collection.update_one(
        {"_id": task["_id"]},
        {"$push": {"subtasks": subtask}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    updated = await tasks_collection.find_one({"_id": task["_id"]})
    return serialize_task(updated)


@app.patch("/tasks/{task_id}/subtasks/{subtask_id}", response_model=TaskOut)
async def toggle_subtask(task_id: str, subtask_id: str, done: bool, user: dict = Depends(get_current_user)):
    task = await _get_owned_task(task_id, user)

    subtasks = task.get("subtasks", [])
    found = False
    for s in subtasks:
        if s["id"] == subtask_id:
            s["done"] = done
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Subtask not found")

    await tasks_collection.update_one(
        {"_id": task["_id"]},
        {"$set": {"subtasks": subtasks, "updated_at": datetime.now(timezone.utc)}},
    )
    updated = await tasks_collection.find_one({"_id": task["_id"]})
    return serialize_task(updated)


@app.delete("/tasks/{task_id}/subtasks/{subtask_id}", response_model=TaskOut)
async def delete_subtask(task_id: str, subtask_id: str, user: dict = Depends(get_current_user)):
    task = await _get_owned_task(task_id, user)
    subtasks = [s for s in task.get("subtasks", []) if s["id"] != subtask_id]

    await tasks_collection.update_one(
        {"_id": task["_id"]},
        {"$set": {"subtasks": subtasks, "updated_at": datetime.now(timezone.utc)}},
    )
    updated = await tasks_collection.find_one({"_id": task["_id"]})
    return serialize_task(updated)


@app.get("/")
async def root():
    return {"status": "Celeste API is running", "docs": "/docs"}
