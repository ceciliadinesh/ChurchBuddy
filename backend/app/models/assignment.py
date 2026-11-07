from sqlalchemy import (
    Column, Integer, String, Date, Boolean,
    ForeignKey, DateTime, func, UniqueConstraint
)

from app.database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)

    monthly_form_id = Column(
        Integer,
        ForeignKey("monthly_forms.id"),
        nullable=False
    )

    mass_slot_id = Column(
        Integer,
        ForeignKey("mass_slots.id"),
        nullable=False
    )

    assignment_date = Column(Date, nullable=False)

    responsibility = Column(String(30), nullable=False)

    position_number = Column(Integer, default=1, nullable=False)

    lector_id = Column(
        Integer,
        ForeignKey("lectors.id"),
        nullable=True
    )
    special_text = Column(String(100), nullable=True)

    is_manual = Column(Boolean, default=False, nullable=False)

    is_protected = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "mass_slot_id",
            "assignment_date",
            "responsibility",
            "position_number",
            name="uq_mass_date_responsibility_position"
        ),
    )