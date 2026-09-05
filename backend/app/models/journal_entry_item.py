from sqlalchemy import Column, Integer, String, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class JournalEntryItem(Base):
    __tablename__ = "journal_entry_items"

    id               = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id       = Column(Integer, ForeignKey("chart_of_accounts.id", ondelete="RESTRICT"), nullable=False, index=True)
    partner_id       = Column(Integer, ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True, index=True)
    debit            = Column(Numeric(12, 2), default=0.00, nullable=True)
    credit           = Column(Numeric(12, 2), default=0.00, nullable=True)
    description      = Column(Text, nullable=True)

    # Relationships
    journal_entry = relationship("JournalEntry", back_populates="items")
    account       = relationship("Account", lazy="joined")
    partner       = relationship("Contact", lazy="joined")
