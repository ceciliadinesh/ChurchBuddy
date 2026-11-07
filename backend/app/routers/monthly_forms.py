
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MonthlyForm
from app import schemas

router = APIRouter(
    prefix="/monthly-forms",
    tags=["Monthly Forms"]
)


# CREATE a monthly availability form
@router.post(
    "/",
    response_model=schemas.MonthlyFormResponse,
    status_code=status.HTTP_201_CREATED
)
def create_monthly_form(
    form: schemas.MonthlyFormCreate,
    db: Session = Depends(get_db)
):
    # Prevent duplicate forms for the same month and year
    existing_form = db.query(MonthlyForm).filter(
        MonthlyForm.month == form.month,
        MonthlyForm.year == form.year
    ).first()

    if existing_form:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A monthly form already exists for this month and year."
        )

    new_form = MonthlyForm(**form.model_dump())

    db.add(new_form)
    db.commit()
    db.refresh(new_form)

    return new_form


# GET all monthly forms
@router.get("/", response_model=list[schemas.MonthlyFormResponse])
def get_monthly_forms(db: Session = Depends(get_db)):
    return db.query(MonthlyForm).order_by(
        MonthlyForm.year.desc(),
        MonthlyForm.month.desc()
    ).all()


# GET one monthly form by ID
@router.get("/{form_id}", response_model=schemas.MonthlyFormResponse)
def get_monthly_form(
    form_id: int,
    db: Session = Depends(get_db)
):
    form = db.query(MonthlyForm).filter(
        MonthlyForm.id == form_id
    ).first()

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Monthly form not found."
        )

    return form


# CLOSE a monthly form
@router.patch("/{form_id}/close")
def close_monthly_form(
    form_id: int,
    db: Session = Depends(get_db)
):
    form = db.query(MonthlyForm).filter(
        MonthlyForm.id == form_id
    ).first()

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Monthly form not found."
        )

    form.is_open = False
    db.commit()

    return {
        "message": "Monthly availability form closed successfully."
    }


# REOPEN a monthly form
@router.patch("/{form_id}/reopen")
def reopen_monthly_form(
    form_id: int,
    db: Session = Depends(get_db)
):
    form = db.query(MonthlyForm).filter(
        MonthlyForm.id == form_id
    ).first()

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Monthly form not found."
        )

    form.is_open = True
    db.commit()
    db.refresh(form)

    return {
        "message": "Monthly availability form reopened successfully.",
        "id": form.id,
        "is_open": form.is_open
    }
