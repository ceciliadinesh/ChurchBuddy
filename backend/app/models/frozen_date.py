from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    ForeignKey,
    Text,
    DateTime,
    func,
    UniqueConstraint,
)

from app.database import Base


class FrozenDate(Base):
    """
    A frozen DATE + MASS TIME. The same date can have several rows
    (e.g. 7:00 AM frozen and 6:00 PM frozen), but each date/time
    pair can only be frozen once.
    """

    __tablename__ = "frozen_dates"

    id = Column(Integer, primary_key=True, index=True)

    monthly_form_id = Column(
        Integer,
        ForeignKey("monthly_forms.id"),
        nullable=False
    )

    frozen_date = Column(Date, nullable=False)

    # Which Mass time is frozen:
    # "7:00 AM", "7:30 AM", "9:45 AM" or "6:00 PM"
    frozen_time = Column(String(20), nullable=False, default="7:00 AM")

    reason = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "monthly_form_id",
            "frozen_date",
            "frozen_time",
            name="uq_frozen_date_time_per_month"
        ),
    )