# ============================================================
# database.py
#
# WHY THIS FILE EXISTS:
#   This file sets up everything needed to communicate with
#   our PostgreSQL database using SQLAlchemy.
#
#   It creates two important things:
#   1. engine       → the actual connection to the database
#   2. SessionLocal → a factory that produces database sessions
#   3. Base         → the parent class all our models inherit from
#
# WHO USES THIS FILE:
#   - dependencies.py  (uses SessionLocal to create a session per request)
#   - models/          (every model imports Base from here)
#
# NOTE:
#   In Phase 1 we are NOT connecting to PostgreSQL yet.
#   The engine is defined but no real connection is made until
#   the app actually makes a database request.
# ============================================================


# create_engine: creates the connection to the database.
# It uses the DATABASE_URL we defined in .env to know
# WHICH database to connect to and HOW.
from sqlalchemy import create_engine

# sessionmaker: a factory (a blueprint) for creating database sessions.
# A "session" is like a temporary conversation with the database.
# You open it, do your work (read/write), then close it.
from sqlalchemy.orm import sessionmaker

# declarative_base: creates a Base class.
# Every database table we define (in /models) will INHERIT from this Base.
# This is how SQLAlchemy knows which classes represent database tables.
from sqlalchemy.orm import declarative_base

# We import our settings object from config.py
# so we can get the DATABASE_URL without hardcoding it here.
from app.config import settings


# ---- ENGINE ------------------------------------------------
# The engine is the core connection to PostgreSQL.
# create_engine() reads the DATABASE_URL and prepares the connection.
#
# DATABASE_URL format:
#   postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
#   Example: postgresql://postgres:1234@localhost:5432/urban_furniture_db
#
# What each part means:
#   postgresql  → the type of database (we use PostgreSQL)
#   postgres    → the database username
#   1234        → the database password
#   localhost   → the server address (our own machine during development)
#   5432        → the port PostgreSQL listens on (default)
#   urban_furniture_db → the name of our database
#
# NOTE: No real connection happens here yet.
# SQLAlchemy is lazy — it only connects when the first query runs.
engine = create_engine(settings.DATABASE_URL)


# ---- SESSION FACTORY ---------------------------------------
# SessionLocal is NOT a session itself — it is a FACTORY.
# A factory is something you call to CREATE the real thing.
# Every time we need to talk to the database, we call
# SessionLocal() to get a fresh session object.
#
# autocommit=False → changes are NOT saved automatically.
#   We must call session.commit() ourselves. This is safer
#   because if something goes wrong, we can call session.rollback()
#   to undo everything.
#
# autoflush=False  → changes are NOT sent to the database automatically
#   before each query. We control when that happens.
#
# bind=engine      → tells the session which database engine to use.
#   This connects our sessions to the engine we created above.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ---- BASE CLASS --------------------------------------------
# Base is the parent class for all our database models.
# Every table we create (Invoice, Customer, Product, etc.)
# will start with:  class Invoice(Base):
#
# When SQLAlchemy sees a class inheriting from Base,
# it treats that class as a database table definition.
# Base keeps track of ALL these table definitions internally.
# Later, when we call Base.metadata.create_all(engine),
# it creates all the tables in the database at once.
Base = declarative_base()
