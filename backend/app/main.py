# ============================================================
# main.py
#
# PURPOSE:
#   This is the ENTRY POINT of the entire FastAPI application.
#   It is the first file that runs when we start the server.
#
# HOW THE SERVER STARTS:
#   Run this command from the /backend folder:
#       uvicorn app.main:app --reload
#
#   Breaking that down:
#       uvicorn      → the server program
#       app.main     → Python path to this file (app/main.py)
#       :app         → the variable name inside this file to use
#       --reload     → auto-restart when code changes (dev only)
#
# EXECUTION ORDER when server starts:
#   1. Python imports this file
#   2. Imports at the top run (config, database, dependencies)
#   3. FastAPI() creates the app object
#   4. @app.get decorators register the routes
#   5. uvicorn starts listening on http://127.0.0.1:8000
#
# WHAT THIS FILE CONTAINS (Phase 2):
#   - GET /           → health check (server alive?)
#   - GET /db-health  → database check (PostgreSQL connected?)
# ============================================================


# ---- IMPORTS -----------------------------------------------

# FastAPI: the main class. We create one instance called "app".
# This "app" object is what uvicorn looks for when starting.
from fastapi import FastAPI

# Depends: tells FastAPI to call a dependency function and
# inject its result into the route function parameter.
# Without Depends, get_db() would never be called automatically.
from fastapi import Depends

# Session: used as a TYPE HINT for the "db" parameter.
# It tells Python and the editor what type "db" is.
# FastAPI also uses it internally to understand the dependency.
from sqlalchemy.orm import Session

# text(): wraps a raw SQL string so SQLAlchemy can execute it.
# SQLAlchemy does not accept plain strings as SQL for safety.
# text() marks the string as intentional SQL. Safe to use for
# simple fixed queries like "SELECT 1".
from sqlalchemy import text

# settings: our configuration object from config.py.
# We use it to display APP_NAME and APP_VERSION in responses.
from app.config import settings

# get_db: our dependency function from dependencies.py.
# Routes use this to get a safe, managed database session.
from app.dependencies import get_db


# ---- CREATE THE APP OBJECT ---------------------------------
#
# FastAPI() creates the application instance.
# This is the central object — everything attaches to it:
#   - routes (via @app.get, @app.post, etc.)
#   - middleware
#   - event handlers
#
# title, version, description:
#   These appear on the automatic docs page at /docs
#   The jury will see this page — make it look professional.
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Accounting API for Urban Furniture — "
        "manages contacts, invoices, payments, and financial reports."
    )
)


# ============================================================
# ROUTE 1: Health Check
# ============================================================
#
# @app.get("/")
#   This is a DECORATOR. It wraps the function below it.
#   It tells FastAPI: "when someone sends a GET request to /,
#   run this function and return its result as JSON."
#
# "GET" is an HTTP METHOD:
#   GET    → read data (no side effects)
#   POST   → create new data
#   PUT    → update existing data
#   DELETE → remove data
#
# The function name "health_check" is just for us to read.
# FastAPI cares about the decorator, not the function name.
@app.get("/")
def health_check():
    # This returns a Python dictionary.
    # FastAPI automatically converts it to JSON.
    # {"key": value}  →  {"key": value} in the browser
    return {
        "status": "running",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "message": "Urban Furniture Accounting API is live."
    }


# ============================================================
# ROUTE 2: Database Health Check
# ============================================================
#
# @app.get("/db-health")
#   When someone sends GET to /db-health, FastAPI:
#   1. Sees "db: Session = Depends(get_db)"
#   2. Calls get_db() to create a session
#   3. Passes the session as "db" to this function
#   4. After the function returns, calls db.close()
#
# db: Session = Depends(get_db)
#   db         → the parameter name we use inside the function
#   Session    → type hint (tells editor this is a SQLAlchemy session)
#   Depends()  → FastAPI's dependency injection marker
#   get_db     → the function to call (from dependencies.py)
#
# This is DEPENDENCY INJECTION in action.
# The route does not create or close the session — it just uses it.
@app.get("/db-health")
def database_health_check(db: Session = Depends(get_db)):

    # We wrap the database call in try/except.
    # try:   attempt to connect and query
    # except: if anything goes wrong, catch the error
    #         and return a meaningful message instead of crashing
    try:
        # db.execute() runs a SQL command using our session.
        #
        # text("SELECT 1"):
        #   "SELECT 1" is the simplest SQL query possible.
        #   It does not read any table. It just asks PostgreSQL
        #   to return the number 1. If PostgreSQL responds,
        #   the connection is confirmed working.
        #   text() wraps it because SQLAlchemy requires SQL
        #   strings to be wrapped in text() for safety.
        #
        # .scalar():
        #   Executes the query and returns the FIRST VALUE
        #   of the FIRST ROW as a plain Python value.
        #   "SELECT 1" returns one row with one column: 1
        #   .scalar() extracts that 1 directly.
        #   So "result" will equal the integer 1.
        result = db.execute(text("SELECT 1")).scalar()

        # If we reach this line, PostgreSQL responded successfully.
        # We return a success JSON with proof (the result = 1).
        return {
            "status": "connected",
            "database": "urban_furniture_accounting_db",
            "ping": result,           # will be 1 — proof the query ran
            "message": "PostgreSQL connection is healthy."
        }

    except Exception as error:
        # Exception is the base class for ALL Python errors.
        # If anything goes wrong (wrong password, DB offline,
        # network issue, etc.), we catch it here.
        #
        # str(error) converts the error object to a readable
        # string so we can include it in the response.
        # This helps us debug without reading server logs.
        return {
            "status": "failed",
            "error": str(error),
            "message": "Could not connect to PostgreSQL."
        }


# ============================================================
# FUTURE ROUTERS (Phase 3 onwards)
# ============================================================
#
# When we build our feature routes, we will add them like this:
#
# from app.routers import contacts, invoices, payments
# app.include_router(contacts.router,  prefix="/contacts",  tags=["Contacts"])
# app.include_router(invoices.router,  prefix="/invoices",  tags=["Invoices"])
# app.include_router(payments.router,  prefix="/payments",  tags=["Payments"])
#
# prefix → all routes in that router get this URL prefix
#           e.g. prefix="/contacts" means the route "/list"
#           becomes accessible at "/contacts/list"
#
# tags   → groups the routes together on the /docs page
#           makes the docs page easier to navigate
