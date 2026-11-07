
from sqlalchemy import (
    Column,
    Integer,
    Date,
    ForeignKey,
    Text,
    DateTime,
    func,
    UniqueConstraint,
)

from app.database import Base


class FrozenDate(Base):
    __tablename__ = "frozen_dates"

    id = Column(Integer, primary_key=True, index=True)

    monthly_form_id = Column(
        Integer,
        ForeignKey("monthly_forms.id"),
        nullable=False
    )

    frozen_date = Column(Date, nullable=False)

    reason = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "monthly_form_id",
            "frozen_date",
            name="uq_frozen_date_per_month"
        ),
    )
