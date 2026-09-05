# ============================================================
# main.py
#
# WHY THIS FILE EXISTS:
#   This is the ENTRY POINT of the entire FastAPI application.
#   It is the first file that runs when we start the server.
#
# HOW THE SERVER STARTS:
#   We run this command from the /backend folder:
#       uvicorn app.main:app --reload
#
#   Breaking that command down:
#       uvicorn        → the server program that runs our app
#       app.main       → the Python file to load (app/main.py)
#       :app           → the variable name inside main.py to use
#       --reload       → auto-restart when we save code changes
#                        (only use this during development)
#
# WHAT THIS FILE DOES:
#   1. Creates the FastAPI "app" object
#   2. Configures it with our project name and version
#   3. Adds a health-check route to confirm the server is running
#   4. (In Phase 3) Will register all our routers here
# ============================================================


# FastAPI is the main class of the FastAPI framework.
# We create one instance of it and call it "app".
# This "app" object is what uvicorn looks for when starting.
from fastapi import FastAPI

# We import our settings object so we can use APP_NAME
# and APP_VERSION to label our API documentation.
from app.config import settings


# ---- CREATE THE APP OBJECT ---------------------------------
# FastAPI() creates the application.
#
# title      → shown at the top of the auto-generated docs page
# version    → shown in the docs (helps users know which version they use)
# description → a short explanation shown in the docs
#
# FastAPI automatically generates an interactive documentation
# page at:  http://127.0.0.1:8000/docs
# You can test every endpoint directly from that page — no
# extra tools needed during development.
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Accounting system for Urban Furniture — tracks invoices, payments, and expenses."
)


# ---- HEALTH CHECK ROUTE ------------------------------------
# A "route" is a URL the server responds to.
# This is the simplest possible route.
#
# @app.get("/")  →  means: when someone visits GET http://localhost:8000/
#                   run the function below it
#
# "GET" is an HTTP method. It means "please give me some data".
# Other methods: POST (create), PUT (update), DELETE (remove)
#
# This specific route is called a "health check" — it is used
# to quickly confirm the server is alive and responding.
# A jury will appreciate seeing this work immediately.
@app.get("/")
def health_check():
    # This function returns a Python dictionary.
    # FastAPI automatically converts it to JSON for the browser.
    # {"key": "value"}  becomes  {"key": "value"} in JSON
    return {
        "status": "running",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "message": "Welcome to the Urban Furniture Accounting API"
    }


# ---- FUTURE ROUTERS ----------------------------------------
# In Phase 3, we will register our routers here like this:
#
# from app.routers import customers, invoices, payments
# app.include_router(customers.router)
# app.include_router(invoices.router)
# app.include_router(payments.router)
#
# include_router() "attaches" all the routes from a router file
# onto our main app. We keep them commented out for now because
# those files don't exist yet.
