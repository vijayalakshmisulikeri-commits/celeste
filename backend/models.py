"""
models.py
----------
Defines the SHAPE of our data using Pydantic. Pydantic models do two jobs:
1. Validation: reject bad data automatically (e.g. missing email, wrong type)
2. Serialization: convert between Python objects <-> JSON automatically

We keep separate models for "what comes IN from the client" vs
"what goes OUT to the client" -- e.g. we never want to accidentally
send a user's hashed password back in an API response. This separation
is a standard, important security practice.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ---------- Shared enums ----------

class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Category(str, Enum):
    personal = "personal"    # personal / habitual tasks (recurring routines, habits)
    academic = "academic"    # coursework, assignments, exams
    reminder = "reminder"    # longer-horizon items, ~1-2 weeks out and beyond


# ---------- User models ----------

class UserRegister(BaseModel):
    """What the client sends us when signing up."""
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, description="Plain password, only ever used once to create a hash")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    """What we send BACK to the client. Notice: no password field, ever."""
    id: str
    name: str
    email: EmailStr
    created_at: datetime


class UserUpdate(BaseModel):
    """For the profile page -- all fields optional, only send what changes."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    password: Optional[str] = Field(default=None, min_length=8)


# ---------- Subtask (checklist item inside a task) ----------

class SubTask(BaseModel):
    id: str
    title: str
    done: bool = False


class SubTaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


# ---------- Task models ----------

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default="", max_length=2000)
    priority: Priority = Priority.medium
    due_date: Optional[datetime] = None
    category: Category = Category.personal
    recurring: bool = Field(default=False, description="True for daily habits -- resets each day instead of archiving permanently")


class TaskUpdate(BaseModel):
    """All optional -- PATCH-style partial update."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    priority: Optional[Priority] = None
    due_date: Optional[datetime] = None
    archived: Optional[bool] = None
    category: Optional[Category] = None
    recurring: Optional[bool] = None


class TaskOut(BaseModel):
    id: str
    title: str
    description: str
    priority: Priority
    due_date: Optional[datetime]
    archived: bool
    category: Category
    subtasks: List[SubTask]
    streak: int
    last_completed_at: Optional[datetime]
    recurring: bool
    completion_dates: List[str]   # "YYYY-MM-DD" app-days this task was completed, for the streak heatmap
    done_today: bool              # computed: has this recurring task already been done for the current app-day?
    created_at: datetime
    updated_at: datetime


# ---------- Auth token ----------

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
