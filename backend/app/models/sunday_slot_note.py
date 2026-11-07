
from sqlalchemy import (
    Column,
    Integer,
    Date,
    ForeignKey,
    Text,
    DateTime,
    Time,
    func,
    UniqueConstraint,
)

from app.database import Base


class SundaySlotNote(Base):
    __tablename__ = "sunday_slot_notes"

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

    slot_date = Column(Date, nullable=False)

    note = Column(Text, nullable=True)

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
            "monthly_form_id",
            "mass_slot_id",
            "slot_date",
            name="uq_sunday_slot_note"
        ),
    )
