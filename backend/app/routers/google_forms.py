import json
import hmac
import re
from datetime import date
from typing import Any
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db, settings
from app.models import (
    MonthlyForm,
    Lector,
    AvailabilitySubmission,
    LectorAvailableDay,
    LectorResponsibility,
    UnavailableDate,
)

router = APIRouter(
    prefix="/google-forms",
    tags=["Google Forms Integration"]
)


class GoogleFormWebhookPayload(BaseModel):
    monthly_form_id: int
    google_form_id: str
    response_id: str
    answers: dict[str, Any]


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().casefold()


def split_lector_name(value: str):
    parts = re.sub(r"\s+", " ", value).strip().split(maxsplit=1)

    first_name = parts[0].capitalize()
    last_name = parts[1] if len(parts) > 1 else ""

    return first_name, last_name


def parse_unavailable_dates(value: Any, month: int, year: int):
    if not value:
        return []

    if not isinstance(value, str):
        raise ValueError("Unavailable dates must be entered as text.")

    results = []

    for line in value.splitlines():
        line = line.strip()

        if not line:
            continue

        match = re.fullmatch(
            r"(\d{4}-\d{2}-\d{2})\s+to\s+"
            r"(\d{4}-\d{2}-\d{2})"
            r"(?:\s*\|\s*(.*))?",
            line
        )

        if not match:
            raise ValueError(
                "Invalid unavailable date format. Use "
                "YYYY-MM-DD to YYYY-MM-DD | Reason."
            )

        try:
            start_date = date.fromisoformat(match.group(1))
            end_date = date.fromisoformat(match.group(2))
        except ValueError:
            raise ValueError("Please enter valid calendar dates.")

        reason = (match.group(3) or "").strip() or None

        if end_date < start_date:
            raise ValueError(
                "An unavailable date range ends before it starts."
            )

        if (
            start_date.month != month
            or start_date.year != year
            or end_date.month != month
            or end_date.year != year
        ):
            raise ValueError(
                "Unavailable dates must belong to the selected month."
            )

        results.append({
            "start_date": start_date,
            "end_date": end_date,
            "reason": reason
        })

    return results


# --------------------------------------------------
# GOOGLE APPS SCRIPT HELPERS
# --------------------------------------------------

def call_apps_script(payload: dict) -> dict:
    """POST a JSON payload to the Apps Script web app and return its result."""
    request = Request(
        settings.GOOGLE_APPS_SCRIPT_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))

    except (HTTPError, URLError, TimeoutError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"Could not contact Google Apps Script: {error}"
        )

    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(
            status_code=502,
            detail="Google Apps Script returned an invalid response."
        )

    if not result.get("success"):
        raise HTTPException(
            status_code=502,
            detail=result.get("message", "Google Apps Script request failed.")
        )

    return result


def set_google_form_accepting(monthly_form: MonthlyForm, accepting: bool):
    """
    Open or close the linked Google Form.
    Does nothing if no Google Form has been created yet.

    Call this from the monthly-forms close/reopen endpoints BEFORE
    changing is_open, so a Google failure leaves the database untouched.
    """
    if not monthly_form.google_form_id:
        return

    call_apps_script({
        "action": "set_accepting_responses",
        "secret": settings.GOOGLE_APPS_SCRIPT_CREATE_SECRET,
        "google_form_id": monthly_form.google_form_id,
        "accepting": accepting
    })


# --------------------------------------------------
# ROUTES
# --------------------------------------------------

@router.post("/{monthly_form_id}/create")
def create_google_form(
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

    if not monthly_form.is_open:
        raise HTTPException(
            status_code=400,
            detail="This monthly form is closed."
        )

    result = call_apps_script({
        "action": "create_form",
        "secret": settings.GOOGLE_APPS_SCRIPT_CREATE_SECRET,
        "monthly_form_id": monthly_form.id,
        "month": monthly_form.month,
        "year": monthly_form.year
    })

    required_fields = ["form_id", "form_url", "edit_url"]

    if not all(result.get(field) for field in required_fields):
        raise HTTPException(
            status_code=502,
            detail="Google Apps Script did not return all form details."
        )

    monthly_form.google_form_id = result["form_id"]
    monthly_form.google_form_url = result["form_url"]
    monthly_form.google_form_edit_url = result["edit_url"]

    try:
        db.commit()
        db.refresh(monthly_form)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Google Form was created, but its details could not be saved."
        )

    return {
        "message": "Google Form created successfully.",
        "monthly_form_id": monthly_form.id,
        "google_form_id": monthly_form.google_form_id,
        "form_url": monthly_form.google_form_url,
        "edit_url": monthly_form.google_form_edit_url
    }


@router.post("/{monthly_form_id}/sync-status")
def sync_google_form_status(
    monthly_form_id: int,
    db: Session = Depends(get_db)
):
    """Make the Google Form's accepting-responses state match is_open."""
    monthly_form = db.query(MonthlyForm).filter(
        MonthlyForm.id == monthly_form_id
    ).first()

    if not monthly_form:
        raise HTTPException(
            status_code=404,
            detail="Monthly form not found."
        )

    if not monthly_form.google_form_id:
        return {"synced": False, "message": "No Google Form to update."}

    accepting = bool(monthly_form.is_open)
    set_google_form_accepting(monthly_form, accepting)

    return {
        "synced": True,
        "accepting": accepting,
        "message": (
            "Google Form is now accepting responses."
            if accepting
            else "Google Form is now closed."
        )
    }


@router.post("/webhook")
def receive_google_form_submission(
    payload: GoogleFormWebhookPayload,
    x_webhook_secret: str | None = Header(
        default=None,
        alias="X-Webhook-Secret"
    ),
    db: Session = Depends(get_db)
):
    # 1. Verify webhook secret.
    expected_secret = settings.GOOGLE_FORMS_WEBHOOK_SECRET

    if (
        not x_webhook_secret
        or not hmac.compare_digest(x_webhook_secret, expected_secret)
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid webhook secret."
        )

    # 2. Find the monthly form.
    monthly_form = db.query(MonthlyForm).filter(
        MonthlyForm.id == payload.monthly_form_id
    ).first()

    if not monthly_form:
        raise HTTPException(
            status_code=404,
            detail="Monthly form not found."
        )

    if not monthly_form.is_open:
        raise HTTPException(
            status_code=400,
            detail="This monthly form is closed."
        )

    if monthly_form.google_form_id != payload.google_form_id:
        raise HTTPException(
            status_code=400,
            detail="Google Form does not match the selected monthly form."
        )

    answers = payload.answers

    # 3. Read lector name.
    # EMAIL IS NOT USED FOR IDENTIFICATION.
    lector_name = str(
        answers.get("Lector Name", "")
    ).strip()

    if not lector_name:
        raise HTTPException(
            status_code=400,
            detail="Please enter your name."
        )

    submitted_name = normalize_name(lector_name)

    # 4. Find this name among ALL lectors, including inactive lectors.
    all_lectors = db.query(Lector).all()

    matching_lectors = [
        lector
        for lector in all_lectors
        if normalize_name(
            f"{lector.first_name} {lector.last_name}"
        ) == submitted_name
    ]

    if len(matching_lectors) > 1:
        raise HTTPException(
            status_code=409,
            detail=(
                "More than one lector has this name. "
                "Please contact the administrator."
            )
        )

    if matching_lectors:
        # Existing lector: activate automatically.
        lector = matching_lectors[0]
        lector.is_active = True

    else:
        # New lector: create an active record automatically.
        first_name, last_name = split_lector_name(lector_name)

        lector = Lector(
            first_name=first_name,
            last_name=last_name,
            is_active=True
        )

        db.add(lector)
        db.flush()

    # 5. Check whether this lector has already submitted for this month.
    existing_submission = db.query(
        AvailabilitySubmission
    ).filter(
        AvailabilitySubmission.lector_id == lector.id,
        AvailabilitySubmission.monthly_form_id == monthly_form.id
    ).first()

    if existing_submission:
        db.commit()

        return {
            "success": True,
            "duplicate": True,
            "message": "You have already submitted availability for this month.",
            "lector_id": lector.id,
            "monthly_form_id": monthly_form.id
        }

    # 6. Validate availability type.
    day_availability = answers.get("Availability Type")

    allowed_availability = {
        "weekdays",
        "weekends",
        "all_days",
        "specific_days"
    }

    if day_availability not in allowed_availability:
        raise HTTPException(
            status_code=400,
            detail="Invalid availability type."
        )

    # 7. Validate Mass preference.
    mass_preference = answers.get("Mass Preference")

    if mass_preference not in {"Morning", "Evening", "Both"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid Mass preference."
        )

    # 8. Validate available weekdays.
    available_days = answers.get("Available Days") or []

    if not isinstance(available_days, list):
        raise HTTPException(
            status_code=400,
            detail="Available Days must be a list."
        )

    allowed_days = {
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
    }

    if any(day not in allowed_days for day in available_days):
        raise HTTPException(
            status_code=400,
            detail="One or more selected weekdays are invalid."
        )

    if day_availability == "specific_days" and not available_days:
        raise HTTPException(
            status_code=400,
            detail="Please select at least one available weekday."
        )

    if day_availability != "specific_days":
        available_days = []

    # 9. Validate responsibilities.
    responsibilities = answers.get("Responsibilities") or []

    allowed_responsibilities = {
        "Angelus",
        "Reading",
        "POF"
    }

    if (
        not isinstance(responsibilities, list)
        or not responsibilities
        or any(
            responsibility not in allowed_responsibilities
            for responsibility in responsibilities
        )
    ):
        raise HTTPException(
            status_code=400,
            detail="Select at least one valid responsibility."
        )

    # 10. Validate unavailable date ranges.
    try:
        unavailable_dates = parse_unavailable_dates(
            answers.get("Unavailable Date Ranges", ""),
            monthly_form.month,
            monthly_form.year
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    additional_requests = answers.get("Additional Requests") or ""

    # 11. Save the lector's monthly availability.
    new_submission = AvailabilitySubmission(
        lector_id=lector.id,
        monthly_form_id=monthly_form.id,
        day_availability=day_availability,
        mass_preference=mass_preference,
        additional_requests=str(additional_requests).strip() or None
    )

    try:
        db.add(new_submission)
        db.flush()

        for day in available_days:
            db.add(
                LectorAvailableDay(
                    submission_id=new_submission.id,
                    day_name=day
                )
            )

        for responsibility in responsibilities:
            db.add(
                LectorResponsibility(
                    submission_id=new_submission.id,
                    responsibility=responsibility
                )
            )

        for unavailable in unavailable_dates:
            db.add(
                UnavailableDate(
                    submission_id=new_submission.id,
                    start_date=unavailable["start_date"],
                    end_date=unavailable["end_date"],
                    reason=unavailable["reason"]
                )
            )

        db.commit()
        db.refresh(new_submission)

    except Exception:
        db.rollback()
        raise

    return {
        "success": True,
        "message": "Your availability has been saved successfully.",
        "submission_id": new_submission.id,
        "lector_id": lector.id,
        "lector_name": lector_name,
        "monthly_form_id": monthly_form.id
    }