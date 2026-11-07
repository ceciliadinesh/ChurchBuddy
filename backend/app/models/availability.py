
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
    Text,
    UniqueConstraint,
    func,
)

from app.database import Base


class AvailabilitySubmission(Base):
    __tablename__ = "availability_submissions"

    id = Column(Integer, primary_key=True, index=True)

    lector_id = Column(
        Integer,
        ForeignKey("lectors.id"),
        nullable=False
    )

    monthly_form_id = Column(
        Integer,
        ForeignKey("monthly_forms.id"),
        nullable=False
    )

    day_availability = Column(String(30), nullable=False)

    mass_preference = Column(String(20), nullable=False)

    additional_requests = Column(Text, nullable=True)

    submitted_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "lector_id",
            "monthly_form_id",
            name="uq_lector_monthly_form"
        ),
    )
