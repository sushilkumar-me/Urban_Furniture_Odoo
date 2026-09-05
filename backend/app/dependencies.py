# ============================================================
# dependencies.py
#
# WHY THIS FILE EXISTS:
#   FastAPI has a powerful feature called "Dependency Injection".
#   Instead of each route creating its own database session,
#   routes declare "I need a database session" and FastAPI
#   calls the function here to provide it automatically.
#
#   This file contains reusable "tools" that any route can
#   request. Right now we only have one: get_db().
#
# WHO USES THIS FILE:
#   Every router that needs to talk to the database will
#   import get_db from here.
#
#   Example usage inside a router:
#       from app.dependencies import get_db
#       from sqlalchemy.orm import Session
#       from fastapi import Depends
#
#       @router.get("/invoices")
#       def get_invoices(db: Session = Depends(get_db)):
#           # db is now a live database session, ready to use
#           pass
# ============================================================


# Generator: a special Python function that uses "yield" instead of "return".
# The code BEFORE yield runs first (setup).
# The caller gets the yielded value and uses it.
# The code AFTER yield runs when the caller is done (cleanup).
# This is the perfect pattern for opening/closing resources safely.

# Session is a TYPE HINT only — it tells Python (and us) what
# type of object "db" is. It does not do anything by itself.
from sqlalchemy.orm import Session

# We import SessionLocal (our session factory) from database.py.
# Calling SessionLocal() creates a brand new database session.
from app.database import SessionLocal


# ---- THE DEPENDENCY FUNCTION --------------------------------
# This is a GENERATOR FUNCTION (notice "yield" not "return").
#
# FastAPI recognizes generator functions as dependencies.
# It knows to:
#   1. Run everything BEFORE yield  →  setup (open session)
#   2. Give the yielded value to the route  →  use the session
#   3. Run everything AFTER yield  →  cleanup (close session)
#
# The "-> Generator" return type annotation is optional,
# but we keep it simple and skip it for clarity.
def get_db():
    # SessionLocal() calls our factory to create a NEW session.
    # This session is a private "conversation channel" with the
    # database for this one request only.
    db = SessionLocal()

    # "try" block: the route will use db here.
    # If the route crashes with an error, Python still runs
    # the "finally" block below — guaranteeing cleanup.
    try:
        # "yield" pauses this function and hands "db" to whoever called it.
        # The route function runs with this db session.
        # When the route finishes (success or error), Python comes
        # back here and continues to the "finally" block.
        yield db

    finally:
        # This line ALWAYS runs — whether the route succeeded or crashed.
        # It closes the session and returns the connection back to the pool.
        # Without this, our database would run out of connections over time.
        db.close()
