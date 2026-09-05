from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id           = Column(Integer, primary_key=True, index=True)
    journal_id   = Column(Integer, ForeignKey("journals.id", ondelete="RESTRICT"), nullable=False, index=True)
    created_by   = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    entry_number = Column(String(30), unique=True, nullable=False, index=True)
    entry_date   = Column(Date, nullable=False)
    reference    = Column(String(150), nullable=True)
    status       = Column(String(20), default="Draft", nullable=True)
    created_at   = Column(DateTime, default=func.now())

    # Relationships
    journal = relationship("Journal", lazy="joined")
    creator = relationship("User", lazy="joined")
    items   = relationship(
        "JournalEntryItem",
        back_populates="journal_entry",
        cascade="all, delete-orphan",
        lazy="joined"
    )
