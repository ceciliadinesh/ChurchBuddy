
import calendar
from datetime import date, time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MonthlyForm, MassSlot, SundaySlotNote


router = APIRouter(
    prefix="/sunday-slots",
    tags=["Sunday Slots"]
)

SUNDAY_FROZEN_TIMES = {
    time(7, 30),
    time(9, 45),
}


class SundaySlotNoteUpdate(BaseModel):
    slot_date: date
    mass_slot_id: int
    note: str | None = None


def validate_sunday_slot(
    db: Session,
    monthly_form_id: int,
    slot_date: date,
    mass_slot_id: int
):
    monthly_form = db.query(MonthlyForm).filter(
        MonthlyForm.id == monthly_form_id
    ).first()

    if not monthly_form:
        raise HTTPException(
            status_code=404,
            detail="Monthly form not found."
        )

    if (
        slot_date.month != monthly_form.month
        or slot_date.year != monthly_form.year
    ):
        raise HTTPException(
            status_code=400,
            detail="Date must belong to the selected monthly form."
        )

    if slot_date.weekday() != 6:
        raise HTTPException(
            status_code=400,
            detail="Sunday slot notes are only allowed on Sundays."
        )

    mass_slot = db.query(MassSlot).filter(
        MassSlot.id == mass_slot_id
    ).first()

    if not mass_slot:
        raise HTTPException(
            status_code=404,
            detail="Mass slot not found."
        )

    if mass_slot.mass_time not in SUNDAY_FROZEN_TIMES:
        raise HTTPException(
            status_code=400,
            detail="Only Sunday 7:30 AM and 9:45 AM slots are supported."
        )

    return mass_slot


@router.get("/{monthly_form_id}")
def get_sunday_slots(
    monthly_form_id: int,
    db: Session = Depends(get_db)
):
    monthly_form = db.query(MonthlyForm).filter(
        MonthlyForm.id == monthly_form_id
    ).first()

    if not monthly_form:
        raise HTTPException(
            status_code=404,
            detail="Monthly form not found."
        )

    mass_slots = db.query(MassSlot).filter(
        MassSlot.mass_time.in_(SUNDAY_FROZEN_TIMES)
    ).order_by(
        MassSlot.mass_time
    ).all()

    days_in_month = calendar.monthrange(
        monthly_form.year,
        monthly_form.month
    )[1]

    saved_notes = db.query(SundaySlotNote).filter(
        SundaySlotNote.monthly_form_id == monthly_form_id
    ).all()

    note_map = {
        (item.slot_date, item.mass_slot_id): item
        for item in saved_notes
    }

    results = []

    for day_number in range(1, days_in_month + 1):
        slot_date = date(
            monthly_form.year,
            monthly_form.month,
            day_number
        )

        if slot_date.weekday() != 6:
            continue

        for mass_slot in mass_slots:
            saved = note_map.get(
                (slot_date, mass_slot.id)
            )

            results.append({
                "id": saved.id if saved else None,
                "monthly_form_id": monthly_form_id,
                "slot_date": slot_date,
                "mass_slot_id": mass_slot.id,
                "mass_time": mass_slot.mass_time.strftime("%I:%M %p").lstrip("0"),
                "note": saved.note if saved else None,
                "is_frozen": True
            })

    return results


@router.put("/{monthly_form_id}")
def save_sunday_slot_note(
    monthly_form_id: int,
    data: SundaySlotNoteUpdate,
    db: Session = Depends(get_db)
):
    validate_sunday_slot(
        db,
        monthly_form_id,
        data.slot_date,
        data.mass_slot_id
    )

    note = data.note.strip() if data.note else None

    if note == "":
        note = None

    existing = db.query(SundaySlotNote).filter(
        SundaySlotNote.monthly_form_id == monthly_form_id,
        SundaySlotNote.mass_slot_id == data.mass_slot_id,
        SundaySlotNote.slot_date == data.slot_date
    ).first()

    try:
        if existing:
            existing.note = note
            saved = existing
        else:
            saved = SundaySlotNote(
                monthly_form_id=monthly_form_id,
                mass_slot_id=data.mass_slot_id,
                slot_date=data.slot_date,
                note=note
            )
            db.add(saved)

        db.commit()
        db.refresh(saved)

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Sunday slot note saved successfully.",
        "id": saved.id,
        "slot_date": saved.slot_date,
        "mass_slot_id": saved.mass_slot_id,
        "note": saved.note,
        "is_frozen": True
    }
