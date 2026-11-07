from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MonthlyForm, FrozenDate

from datetime import date
from pydantic import BaseModel


router = APIRouter(
    prefix="/frozen-dates",
    tags=["Frozen Dates"]
)


class FrozenDateCreate(BaseModel):
    monthly_form_id: int
    frozen_date: date
    reason: str | None = None


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

    existing_date = db.query(FrozenDate).filter(
        FrozenDate.monthly_form_id == frozen_data.monthly_form_id,
        FrozenDate.frozen_date == frozen_data.frozen_date
    ).first()

    if existing_date:
        raise HTTPException(
            status_code=400,
            detail="This date is already frozen."
        )

    new_frozen_date = FrozenDate(**frozen_data.model_dump())

    db.add(new_frozen_date)
    db.commit()
    db.refresh(new_frozen_date)

    return {
        "message": "Date frozen successfully.",
        "frozen_date_id": new_frozen_date.id,
        "monthly_form_id": new_frozen_date.monthly_form_id,
        "frozen_date": new_frozen_date.frozen_date
    }


@router.get("/{monthly_form_id}")
def get_frozen_dates(
    monthly_form_id: int,
    db: Session = Depends(get_db)
):
    return db.query(FrozenDate).filter(
        FrozenDate.monthly_form_id == monthly_form_id
    ).order_by(FrozenDate.frozen_date).all()


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

    db.delete(frozen_date)
    db.commit()

    return {
        "message": "Frozen date removed successfully."
    }