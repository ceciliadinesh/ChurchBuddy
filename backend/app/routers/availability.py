
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas
from app.models import (
    Lector,
    MonthlyForm,
    AvailabilitySubmission,
    LectorAvailableDay,
    LectorResponsibility,
    UnavailableDate,
)

router = APIRouter(
    prefix="/availability",
    tags=["Availability"]
)


@router.post("/", status_code=status.HTTP_201_CREATED)
def submit_availability(
    submission: schemas.AvailabilitySubmissionCreate,
    db: Session = Depends(get_db)
):
    # Check whether the lector exists and is active
    lector = db.query(Lector).filter(
        Lector.id == submission.lector_id,
        Lector.is_active == True
    ).first()

    if not lector:
        raise HTTPException(
            status_code=404,
            detail="Active lector not found."
        )

    # Check whether the monthly form exists and is open
    monthly_form = db.query(MonthlyForm).filter(
        MonthlyForm.id == submission.monthly_form_id
    ).first()

    if not monthly_form:
        raise HTTPException(
            status_code=404,
            detail="Monthly form not found."
        )

    if not monthly_form.is_open:
        raise HTTPException(
            status_code=400,
            detail="This monthly availability form is closed."
        )

    # Prevent duplicate submissions
    existing_submission = db.query(AvailabilitySubmission).filter(
        AvailabilitySubmission.lector_id == submission.lector_id,
        AvailabilitySubmission.monthly_form_id == submission.monthly_form_id
    ).first()

    if existing_submission:
        raise HTTPException(
            status_code=400,
            detail="You have already submitted availability for this month."
        )

    # Validate unavailable dates belong to the monthly form
    for unavailable in submission.unavailable_dates:
        for date_value in (unavailable.start_date, unavailable.end_date):
            if date_value.month != monthly_form.month or date_value.year != monthly_form.year:
                raise HTTPException(
                    status_code=400,
                    detail="Unavailable dates must belong to the selected form month."
                )

    # Save the main availability submission
    new_submission = AvailabilitySubmission(
        lector_id=submission.lector_id,
        monthly_form_id=submission.monthly_form_id,
        day_availability=submission.day_availability,
        mass_preference=submission.mass_preference,
        additional_requests=submission.additional_requests
    )

    try:
        db.add(new_submission)
        db.flush()

        # Save selected weekdays
        for day in submission.available_days:
            db.add(
                LectorAvailableDay(
                    submission_id=new_submission.id,
                    day_name=day
                )
            )

        # Save responsibilities
        for responsibility in submission.responsibilities:
            db.add(
                LectorResponsibility(
                    submission_id=new_submission.id,
                    responsibility=responsibility
                )
            )

        # Save unavailable dates and date ranges
        for unavailable in submission.unavailable_dates:
            db.add(
                UnavailableDate(
                    submission_id=new_submission.id,
                    start_date=unavailable.start_date,
                    end_date=unavailable.end_date,
                    reason=unavailable.reason
                )
            )

        db.commit()
        db.refresh(new_submission)

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Availability submitted successfully.",
        "submission_id": new_submission.id,
        "lector_id": new_submission.lector_id,
        "monthly_form_id": new_submission.monthly_form_id
    }

@router.get("/monthly-form/{monthly_form_id}")
def get_monthly_availability(
    monthly_form_id: int,
    db: Session = Depends(get_db)
):
    submissions = db.query(AvailabilitySubmission).filter(
        AvailabilitySubmission.monthly_form_id == monthly_form_id
    ).all()

    result = []

    for submission in submissions:
        lector = db.query(Lector).filter(
            Lector.id == submission.lector_id
        ).first()

        available_days = db.query(LectorAvailableDay).filter(
            LectorAvailableDay.submission_id == submission.id
        ).all()

        responsibilities = db.query(LectorResponsibility).filter(
            LectorResponsibility.submission_id == submission.id
        ).all()

        unavailable_dates = db.query(UnavailableDate).filter(
            UnavailableDate.submission_id == submission.id
        ).all()

        result.append({
            "submission_id": submission.id,
            "lector_id": submission.lector_id,
            "lector": lector,
            "day_availability": submission.day_availability,
            "mass_preference": submission.mass_preference,
            "available_days": [
                day.day_name for day in available_days
            ],
            "responsibilities": [
                item.responsibility for item in responsibilities
            ],
            "unavailable_dates": [
                {
                    "start_date": item.start_date,
                    "end_date": item.end_date,
                    "reason": item.reason
                }
                for item in unavailable_dates
            ],
            "additional_requests": submission.additional_requests
        })

    return result