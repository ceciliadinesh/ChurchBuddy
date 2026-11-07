from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MonthlyForm, FrozenDate


router = APIRouter(
    prefix="/frozen-dates",
    tags=["Frozen Dates"]
)


# Must match the time columns in the downloaded roster.
ALLOWED_FROZEN_TIMES = {"7:00 AM", "7:30 AM", "9:45 AM", "6:00 PM"}
DEFAULT_FROZEN_TIME = "7:00 AM"
MAX_NOTE_LENGTH = 100

ALREADY_FROZEN_MESSAGE = "That date and time has already been frozen."


def clean_note(value: str | None) -> str | None:
    if value is None:
        return None

    value = value.strip()

    if not value:
        return None

    if len(value) > MAX_NOTE_LENGTH:
        raise ValueError(
            f"Frozen date note cannot exceed {MAX_NOTE_LENGTH} characters."
        )

    return value


def clean_time(value: str | None) -> str | None:
    if value is None:
        return None

    value = value.strip().upper()

    # Accept "07:00 AM" as well as "7:00 AM".
    if value.startswith("0"):
        value = value[1:]

    if value not in ALLOWED_FROZEN_TIMES:
        raise ValueError(
            "Frozen time must be 7:00 AM, 7:30 AM, 9:45 AM or 6:00 PM."
        )

    return value


class FrozenDateCreate(BaseModel):
    monthly_form_id: int
    frozen_date: date
    frozen_time: str | None = None
    reason: str | None = None

    @field_validator("frozen_time")
    @classmethod
    def validate_time(cls, value):
        return clean_time(value)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value):
        return clean_note(value)


class FrozenDateUpdate(BaseModel):
    frozen_time: str | None = None
    reason: str | None = None

    @field_validator("frozen_time")
    @classmethod
    def validate_time(cls, value):
        return clean_time(value)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value):
        return clean_note(value)


def serialize_frozen_date(item: FrozenDate) -> dict:
    return {
        "id": item.id,
        "monthly_form_id": item.monthly_form_id,
        "frozen_date": item.frozen_date,
        # Older rows created before frozen_time existed show 7:00 AM.
        "frozen_time": item.frozen_time or DEFAULT_FROZEN_TIME,
        "reason": item.reason,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_frozen_date(
    frozen_data: FrozenDateCreate,
    db: Session = Depends(get_db)
):
    monthly_form = db.query(MonthlyForm).filter(
        MonthlyForm.id == frozen_data.monthly_form_id
    ).first()

    if not monthly_form:
        raise HTTPException(
            status_code=404,
            detail="Monthly form not found."
        )

    if (
        frozen_data.frozen_date.month != monthly_form.month
        or frozen_data.frozen_date.year != monthly_form.year
    ):
        raise HTTPException(
            status_code=400,
            detail="Frozen date must belong to the selected monthly form."
        )

    frozen_time = frozen_data.frozen_time or DEFAULT_FROZEN_TIME

    # The same date may be frozen several times, but only once per time.
    existing = db.query(FrozenDate).filter(
        FrozenDate.monthly_form_id == frozen_data.monthly_form_id,
        FrozenDate.frozen_date == frozen_data.frozen_date,
        FrozenDate.frozen_time == frozen_time,
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=ALREADY_FROZEN_MESSAGE
        )

    new_frozen_date = FrozenDate(
        monthly_form_id=frozen_data.monthly_form_id,
        frozen_date=frozen_data.frozen_date,
        frozen_time=frozen_time,
        reason=frozen_data.reason,
    )

    try:
        db.add(new_frozen_date)
        db.commit()
        db.refresh(new_frozen_date)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=ALREADY_FROZEN_MESSAGE
        )

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Date frozen successfully.",
        "frozen_date_id": new_frozen_date.id,
        **serialize_frozen_date(new_frozen_date),
    }


@router.get("/{monthly_form_id}")
def get_frozen_dates(
    monthly_form_id: int,
    db: Session = Depends(get_db)
):
    items = db.query(FrozenDate).filter(
        FrozenDate.monthly_form_id == monthly_form_id
    ).order_by(
        FrozenDate.frozen_date,
        FrozenDate.id
    ).all()

    return [serialize_frozen_date(item) for item in items]


@router.patch("/{frozen_date_id}")
def update_frozen_date(
    frozen_date_id: int,
    frozen_data: FrozenDateUpdate,
    db: Session = Depends(get_db)
):
    frozen_date = db.query(FrozenDate).filter(
        FrozenDate.id == frozen_date_id
    ).first()

    if not frozen_date:
        raise HTTPException(
            status_code=404,
            detail="Frozen date not found."
        )

    # Update only the fields the frontend actually sent.
    if "reason" in frozen_data.model_fields_set:
        frozen_date.reason = frozen_data.reason

    if (
        "frozen_time" in frozen_data.model_fields_set
        and frozen_data.frozen_time
    ):
        # Moving to another time must not collide with a row that
        # already freezes that date + time.
        clash = db.query(FrozenDate).filter(
            FrozenDate.monthly_form_id == frozen_date.monthly_form_id,
            FrozenDate.frozen_date == frozen_date.frozen_date,
            FrozenDate.frozen_time == frozen_data.frozen_time,
            FrozenDate.id != frozen_date.id,
        ).first()

        if clash:
            raise HTTPException(
                status_code=400,
                detail=ALREADY_FROZEN_MESSAGE
            )

        frozen_date.frozen_time = frozen_data.frozen_time

    try:
        db.commit()
        db.refresh(frozen_date)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=ALREADY_FROZEN_MESSAGE
        )

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Frozen date note saved successfully.",
        **serialize_frozen_date(frozen_date),
    }


@router.delete("/{frozen_date_id}")
def delete_frozen_date(
    frozen_date_id: int,
    db: Session = Depends(get_db)
):
    frozen_date = db.query(FrozenDate).filter(
        FrozenDate.id == frozen_date_id
    ).first()

    if not frozen_date:
        raise HTTPException(
            status_code=404,
            detail="Frozen date not found."
        )

    try:
        db.delete(frozen_date)
        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Frozen date removed successfully."
    }