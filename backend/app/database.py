# ============================================================
# database.py
#
# PURPOSE:
#   This file is the HEART of the database layer.
#   It creates three objects that the entire app depends on:
#
#   1. engine       → the actual connection to PostgreSQL
#   2. SessionLocal → a factory for creating database sessions
#   3. Base         → the parent class all our models inherit from
#
# DEPENDENCY CHAIN:
#   .env
#    └── config.py  (reads DATABASE_URL)
#         └── database.py  (uses DATABASE_URL to create engine)
#              └── dependencies.py  (uses SessionLocal)
#              └── models/*.py      (use Base)
#              └── main.py          (uses engine to test connection)
#
# IMPORTANT CONCEPT — SQLAlchemy is LAZY:
#   When Python runs this file, it does NOT open a database
#   connection immediately. SQLAlchemy only connects when the
#   first real database query is made. This is called lazy
#   initialization — it saves resources and speeds up startup.
# ============================================================


# ---- IMPORTS -----------------------------------------------

# create_engine: the function that creates our database engine.
# It takes the DATABASE_URL string and knows how to speak
# to PostgreSQL using that information.
from sqlalchemy import create_engine

# text: lets us write raw SQL as a string and execute it safely.
# We use it in main.py to run "SELECT 1" as a connection test.
# Without text(), SQLAlchemy would not accept a raw SQL string.
from sqlalchemy import text

# sessionmaker: a FACTORY function.
# It does NOT create a session — it creates a CLASS that
# can produce sessions. You call that class to get a session.
from sqlalchemy.orm import sessionmaker

# declarative_base: creates the Base class.
# Every table we define in models/ will inherit from Base.
# This is how SQLAlchemy knows a Python class = a database table.
from sqlalchemy.orm import declarative_base

# We import our settings object to get DATABASE_URL.
# We NEVER hardcode the URL here — we always read from settings.
from app.config import settings


# ============================================================
# 1. THE ENGINE
# ============================================================
#
# create_engine() does the following:
#   - Reads the DATABASE_URL string
#   - Understands it starts with "postgresql://" so it uses
#     the psycopg2 driver (which we installed) to talk to Postgres
#   - Creates an internal "connection pool" — a group of ready
#     connections that sessions can borrow and return
#
# What is a CONNECTION POOL?
#   Opening a brand new database connection is slow.
#   A connection pool pre-opens several connections and keeps
#   them alive. When a session needs one, it borrows from the
#   pool. When done, it returns it. This is much faster.
#
# pool_pre_ping=True:
#   Before lending a connection to a session, SQLAlchemy sends
#   a tiny "are you alive?" ping to PostgreSQL.
#   If the connection dropped (e.g. database restarted),
#   it discards it and creates a fresh one automatically.
#   Without this, you get "connection closed" errors after idle time.
#
# NO actual connection is opened when this line runs.
# SQLAlchemy is lazy — it connects on the first real query.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True  # auto-heal stale connections
)


# ============================================================
# 2. THE SESSION FACTORY
# ============================================================
#
# sessionmaker() is a CLASS FACTORY — a function that returns
# a CLASS (not an instance). We store that class in SessionLocal.
#
# To understand why this matters:
#   SessionLocal        → the class (a blueprint)
#   SessionLocal()      → an instance (one real session)
#
# You NEVER use SessionLocal directly in routes.
# The get_db() function in dependencies.py calls SessionLocal()
# to create a real session, uses it, then closes it.
#
# Parameters explained:
#
#   autocommit=False
#       When False, changes you make (INSERT, UPDATE, DELETE)
#       are NOT saved to the database automatically.
#       You must call db.commit() yourself to save them.
#       WHY: if something goes wrong halfway through,
#       you can call db.rollback() to undo everything.
#       This protects your data from partial saves.
#       Example: you're saving an invoice AND updating the
#       balance. If the balance update fails, you don't want
#       the invoice saved either. rollback() undoes both.
#
#   autoflush=False
#       When False, SQLAlchemy does NOT automatically send
#       pending changes to the database before each query.
#       You control exactly when data is written.
#       More predictable behavior during development.
#
#   bind=engine
#       Connects this session factory to our engine above.
#       Every session created by SessionLocal() will use
#       this engine to communicate with PostgreSQL.
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# ============================================================
# 3. THE BASE CLASS
# ============================================================
#
# declarative_base() returns an empty Python class called Base.
# It has special SQLAlchemy magic built in.
#
# Every table we define in our models/ folder will inherit
# from this Base:
#
#   class Contact(Base):          ← inherits Base
#       __tablename__ = "contacts"
#       id = Column(Integer, ...)
#       name = Column(String, ...)
#
# WHY inherit from Base?
#   When SQLAlchemy sees a class inheriting Base, it registers
#   that class as a table definition. Base keeps an internal
#   "registry" of ALL tables.
#
#   Later, if we call:
#       Base.metadata.create_all(engine)
#   SQLAlchemy looks at every class in that registry and
#   creates the corresponding tables in PostgreSQL.
#
#   In our case the tables already exist — so we won't need
#   create_all() — but Base is still required for SQLAlchemy
#   to understand our model classes.
Base = declarative_base()
