
from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    ForeignKey,
    Text,
    CheckConstraint,
)

from app.database import Base


class LectorAvailableDay(Base):
    __tablename__ = "lector_available_days"

    id = Column(Integer, primary_key=True, index=True)

    submission_id = Column(
        Integer,
        ForeignKey("availability_submissions.id"),
        nullable=False
    )

    day_name = Column(String(15), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "day_name IN ('Monday', 'Tuesday', 'Wednesday', "
            "'Thursday', 'Friday', 'Saturday', 'Sunday')",
            name="ck_available_day_name"
        ),
    )


class LectorResponsibility(Base):
    __tablename__ = "lector_responsibilities"

    id = Column(Integer, primary_key=True, index=True)

    submission_id = Column(
        Integer,
        ForeignKey("availability_submissions.id"),
        nullable=False
    )

    responsibility = Column(String(30), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "responsibility IN ('Angelus', 'Reading', 'POF')",
            name="ck_lector_responsibility"
        ),
    )


class UnavailableDate(Base):
    __tablename__ = "unavailable_dates"

    id = Column(Integer, primary_key=True, index=True)

    submission_id = Column(
        Integer,
        ForeignKey("availability_submissions.id"),
        nullable=False
    )

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    reason = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "end_date >= start_date",
            name="ck_unavailable_date_range"
        ),
    )
