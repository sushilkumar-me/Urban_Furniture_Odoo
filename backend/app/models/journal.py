from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Journal(Base):
    __tablename__ = "journals"

    id           = Column(Integer, primary_key=True, index=True)
    journal_name = Column(String(100), nullable=False)
    journal_type = Column(String(30), nullable=False)

    # default_account_id: FK to chart_of_accounts.id
    # Every journal must have a default account.
    # This account is pre-filled when creating journal entries.
    # ON DELETE RESTRICT → cannot delete an account if a journal uses it.
    default_account_id = Column(
        Integer,
        ForeignKey("chart_of_accounts.id"),
        nullable=False,
        index=True
    )

    created_at = Column(DateTime, default=func.now())

    # relationship: loads the full Account object automatically.
    # After this, we can write:
    #   journal.default_account.account_name  → "Bank Account - HDFC"
    #   journal.default_account.account_type  → "Asset"
    # SQLAlchemy runs a JOIN automatically — no second query needed.
    # lazy="joined" → loads in the same SQL query as the journal.
    default_account = relationship("Account", lazy="joined")
