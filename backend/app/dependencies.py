# ============================================================
# dependencies.py
#
# PURPOSE:
#   This file contains SHARED TOOLS that any route can request.
#   Right now we have one tool: get_db()
#
#   get_db() is a "dependency" — a function FastAPI calls
#   automatically to provide a resource to a route.
#
# WHAT IS DEPENDENCY INJECTION?
#   Instead of every route function creating and managing its
#   own database session (error-prone), routes simply DECLARE
#   "I need a database session" using Depends(get_db).
#   FastAPI handles the rest:
#     - calls get_db() before the route runs
#     - passes the session to the route
#     - closes the session after the route finishes
#
# HOW TO USE IN A ROUTE (example):
#   from fastapi import APIRouter, Depends
#   from sqlalchemy.orm import Session
#   from app.dependencies import get_db
#
#   router = APIRouter()
#
#   @router.get("/contacts")
#   def get_all_contacts(db: Session = Depends(get_db)):
#       #                  ↑              ↑
#       #               type hint     tells FastAPI to
#       #               (for editor)  call get_db() and
#       #                             pass the result here
#       contacts = db.query(Contact).all()
#       return contacts
#
# DEPENDENCY CHAIN:
#   database.py (SessionLocal)
#    └── dependencies.py (get_db uses SessionLocal)
#         └── routers/*.py (every route uses get_db)
# ============================================================


# Generator: a Python function that uses "yield" instead of "return".
# This is the standard Python pattern for managing resources that
# need guaranteed cleanup (like files, network connections, db sessions).
# We import the type hint here so editors and FastAPI understand
# what type of object get_db() produces.
from typing import Generator

# Session is imported for the TYPE HINT only.
# It tells Python (and your code editor) that get_db() yields
# a SQLAlchemy Session object. This enables auto-complete in the editor.
# It does NOT do anything functional by itself.
from sqlalchemy.orm import Session

# SessionLocal is our session factory from database.py.
# Calling SessionLocal() creates a real, live database session.
# We import it here so get_db() can use it.
from app.database import SessionLocal


# ============================================================
# get_db() — The Database Session Dependency
# ============================================================
#
# This is a GENERATOR FUNCTION.
# You know it's a generator because it uses "yield" not "return".
#
# How generators work with FastAPI:
#   FastAPI is smart about generator dependencies.
#   It runs the function UP TO the "yield" line first.
#   Then it pauses the function and gives the yielded value
#   to the route. After the route finishes, FastAPI resumes
#   the generator — running the code AFTER "yield" (cleanup).
#
# Return type annotation:  Generator[Session, None, None]
#   Generator[YieldType, SendType, ReturnType]
#   YieldType  = Session  → what we yield (a db session)
#   SendType   = None     → we don't accept sent values
#   ReturnType = None     → generator returns nothing
#
#   This annotation is optional but makes the code clearer
#   and helps your editor understand what type "db" will be.
def get_db() -> Generator[Session, None, None]:

    # --------------------------------------------------------
    # SETUP: Create a new database session.
    #
    # SessionLocal() calls the factory we built in database.py.
    # This creates a FRESH session — a private channel between
    # this one request and the database.
    #
    # Each HTTP request gets its OWN session.
    # They never share sessions with each other.
    # This prevents one request's changes from accidentally
    # affecting another request's data.
    # --------------------------------------------------------
    db = SessionLocal()

    # --------------------------------------------------------
    # try / yield / finally — the safety pattern
    #
    # try:
    #   Everything inside "try" is protected.
    #   If any error occurs inside the route that uses "db",
    #   Python catches it and jumps to "finally".
    #
    # yield db:
    #   This line does two things:
    #   1. Pauses this function
    #   2. Sends "db" to whoever called Depends(get_db)
    #   The route function then runs with this db session.
    #   When the route finishes (success OR error), Python
    #   comes back here and falls into the "finally" block.
    #
    # finally:
    #   This block ALWAYS runs — no matter what happened.
    #   Success? → finally runs.
    #   Exception? → finally runs.
    #   This is the GUARANTEE that the session always closes.
    #
    # WHY IS THIS IMPORTANT?
    #   Every open session holds one connection from the pool.
    #   If sessions are never closed, the pool runs out.
    #   New requests cannot get a connection → app crashes.
    #   finally: db.close() prevents this from ever happening.
    # --------------------------------------------------------
    try:
        yield db          # ← route gets the session here

    finally:
        db.close()        # ← ALWAYS runs: session returned to pool
