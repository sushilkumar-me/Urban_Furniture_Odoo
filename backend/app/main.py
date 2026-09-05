from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
import os

from app.config import settings
from app.dependencies import get_db
from app.routers import auth, contacts, categories, products, accounts

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Accounting API for Urban Furniture."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(contacts.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(accounts.router)

# ---- STATIC FILES (product images) ----------------------
# StaticFiles lets FastAPI serve files from a folder directly.
#
# mount() attaches a static file handler to a URL path.
#   "/uploads"    → the URL prefix browsers use to request images
#   StaticFiles() → the handler that reads files from disk
#   directory     → the folder on disk to serve files from
#   name="uploads"→ an internal name FastAPI uses for this mount
#
# How it works end-to-end:
#   1. Admin uploads sofa.jpg → saved as "1725432345.jpg" in uploads/
#   2. DB stores: product.image = "1725432345.jpg"
#   3. React builds: http://localhost:8000/uploads/1725432345.jpg
#   4. Browser requests that URL → FastAPI finds the file → returns it
#
# UPLOAD_PATH: we build an absolute path to backend/uploads/
# os.path.dirname(__file__) → directory of main.py = backend/app/
# os.path.join(..., "..", "uploads") → go up one level to backend/,
#                                       then into uploads/
UPLOAD_PATH = os.path.join(os.path.dirname(__file__), "..", "uploads")
app.mount("/uploads", StaticFiles(directory=UPLOAD_PATH), name="uploads")

@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "running",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "message": "Urban Furniture Accounting API is live."
    }

@app.get("/db-health", tags=["Health"])
def database_health_check(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT 1")).scalar()
        return {
            "status": "connected",
            "database": "urban_furniture_accounting_db",
            "ping": result,
            "message": "PostgreSQL connection is healthy."
        }
    except Exception as error:
        return {
            "status": "failed",
            "error": str(error),
            "message": "Could not connect to PostgreSQL."
        }


# -------------------------------------------------------
# CUSTOM OPENAPI SCHEMA
#
# By default FastAPI shows an OAuth2 username/password form
# in the Authorize popup — which doesn't work for our API
# because we use login_id not username.
#
# This function replaces that with a simple "Bearer token"
# input box (HTTP Bearer scheme). You paste your token
# directly — much simpler and correct for our setup.
#
# How it works:
#   1. Get the default schema FastAPI generates
#   2. Replace the securitySchemes section
#   3. Change from OAuth2 to simple HTTP Bearer
#   4. Now the Authorize button shows a plain token input
# -------------------------------------------------------
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Accounting API for Urban Furniture.",
        routes=app.routes,
    )

    # Replace OAuth2 with simple HTTP Bearer scheme.
    # In the Authorize popup you will now see one field:
    # "Value" — paste your token there (without "Bearer " prefix).
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Paste your JWT token here. Get it from POST /auth/login"
        }
    }

    # Apply BearerAuth to all paths that have security requirements
    for path in schema.get("paths", {}).values():
        for operation in path.values():
            if "security" in operation:
                operation["security"] = [{"BearerAuth": []}]

    app.openapi_schema = schema
    return app.openapi_schema

app.openapi = custom_openapi
