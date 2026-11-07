
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import time

from app.database import get_db
from app.models import MassSlot


router = APIRouter(
    prefix="/mass-slots",
    tags=["Mass Slots"]
)


class MassSlotCreate(BaseModel):
    mass_time: time
    mass_type: str
    is_sunday: bool = False


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_mass_slot(
    slot_data: MassSlotCreate,
    db: Session = Depends(get_db)
):

    if slot_data.mass_type not in ["Weekday", "Saturday", "Sunday"]:
        raise HTTPException(
            status_code=400,
            detail="Mass type must be Weekday, Saturday or Sunday."
        )

    if slot_data.mass_type == "Sunday" and not slot_data.is_sunday:
        raise HTTPException(
            status_code=400,
            detail="Sunday Mass slots must have is_sunday set to true."
        )

    if slot_data.mass_type != "Sunday" and slot_data.is_sunday:
        raise HTTPException(
            status_code=400,
            detail="Only Sunday Mass slots can have is_sunday set to true."
        )

    existing_slot = db.query(MassSlot).filter(
        MassSlot.mass_time == slot_data.mass_time,
        MassSlot.mass_type == slot_data.mass_type
    ).first()

    if existing_slot:
        raise HTTPException(
            status_code=400,
            detail="This Mass slot already exists."
        )

    is_manual_only = (
        slot_data.mass_type == "Sunday"
        and slot_data.mass_time in [time(7, 30), time(9, 45)]
    )

    new_slot = MassSlot(
        mass_time=slot_data.mass_time,
        mass_type=slot_data.mass_type,
        is_sunday=slot_data.is_sunday,
        is_manual_only=is_manual_only
    )

    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)

    return {
        "message": "Mass slot created successfully.",
        "id": new_slot.id,
        "mass_time": new_slot.mass_time,
        "mass_type": new_slot.mass_type,
        "is_sunday": new_slot.is_sunday,
        "is_manual_only": new_slot.is_manual_only
    }


@router.get("/")
def get_mass_slots(
    db: Session = Depends(get_db)
):
    return db.query(MassSlot).order_by(
        MassSlot.mass_time
    ).all()
