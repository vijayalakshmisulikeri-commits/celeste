"""
database.py
------------
Handles the connection to MongoDB.

WHY MOTOR (not pymongo)?
FastAPI is an "async" framework -- it can handle many requests at once
without blocking. pymongo (the standard MongoDB driver) is SYNCHRONOUS --
it would block the whole server while waiting on the database. Motor is
the async version of the same driver, built to work with FastAPI properly.

LOCAL TESTING NOTE:
This sandbox doesn't have a real MongoDB server installed, so for local
testing we fall back to `mongomock_motor`, an in-memory fake that behaves
like real MongoDB. In production (with a real MONGODB_URI set, e.g. from
MongoDB Atlas), it uses the real thing automatically. Nothing else in the
app needs to know or care which one is active.
"""

import os

MONGODB_URI = os.environ.get("MONGODB_URI")
DB_NAME = os.environ.get("DB_NAME", "celeste")

if MONGODB_URI:
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(MONGODB_URI)
    print("Connected to real MongoDB.")
else:
    # No real connection string set -> use the in-memory mock so the app
    # is still fully runnable for development/demo purposes.
    from mongomock_motor import AsyncMongoMockClient
    client = AsyncMongoMockClient()
    print("WARNING: No MONGODB_URI set -- using in-memory mock database. "
          "Data will NOT persist between restarts. Set MONGODB_URI for real use.")

db = client[DB_NAME]
users_collection = db["users"]
tasks_collection = db["tasks"]
