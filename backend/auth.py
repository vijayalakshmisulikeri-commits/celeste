"""
auth.py
--------
Handles two security-critical jobs:
1. Password hashing -- we NEVER store a user's actual password. We store
   a one-way scrambled version (a "hash"). Even if our database leaked,
   nobody could recover the real passwords from it.
2. JWT (JSON Web Tokens) -- after login, instead of asking for a password
   on every single request, we give the client a signed token. The client
   sends that token with every future request, and we verify its signature
   to confirm "yes, this really is user X, and this token hasn't been
   tampered with."

WHY bcrypt for hashing?
bcrypt is deliberately SLOW (by design). That's a feature, not a bug --
it makes brute-force password guessing attacks impractical, since an
attacker would need to compute a slow bcrypt hash for every guess.

WHY JWT for sessions?
JWTs are "stateless" -- the server doesn't need to remember who's logged
in (no session storage needed). The token itself contains the user's ID
and an expiry time, cryptographically signed so it can't be faked.
"""

import os
import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError

# In production this MUST come from an environment variable, never
# hardcoded -- anyone who has this secret can forge valid login tokens.
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-only-insecure-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Using the bcrypt library directly (rather than through passlib) --
# same underlying algorithm, fewer moving parts.


def hash_password(plain_password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: str) -> str:
    """
    Builds a signed JWT containing the user's id ('sub' = subject, the
    standard JWT field for "who this token is about") and an expiry time.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """
    Verifies the token's signature and expiry. Returns the user_id if
    valid, or None if the token is invalid/expired/tampered with.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
