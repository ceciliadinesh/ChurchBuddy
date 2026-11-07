import calendar
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db

from app.models import (
    MonthlyForm,
    MassSlot,
    FrozenDate,
    Assignment,
    Lector,
    AvailabilitySubmission,
    LectorAvailableDay,
    LectorResponsibility,
    UnavailableDate,
)


router = APIRouter(
    prefix="/assignments",
    tags=["Assignments"]
)


# --------------------------------------------------
# REQUEST SCHEMA FOR MANUAL ASSIGNMENT
# --------------------------------------------------

class ManualAssignmentUpdate(BaseModel):
    lector_id: int
    override_availability: bool = False


# --------------------------------------------------
# VALIDATE MONTHLY FORM AND FROZEN DATES
# --------------------------------------------------

def ensure_monthly_form_exists(
    db: Session,
    monthly_form_id: int
):
    """
    The monthly form only needs to EXIST.

    Closing a form means "stop collecting availability".
    Scheduling happens AFTER the form is closed, so we
    must not block scheduling when the form is closed.
    """

    monthly_form = db.query(MonthlyForm).filter(
        MonthlyForm.id == monthly_form_id
    ).first()

    if not monthly_form:
        raise HTTPException(
            status_code=404,
            detail="Monthly form not found."
        )

    return monthly_form


def ensure_assignment_date_is_not_frozen(
    db: Session,
    assignment: Assignment
):
    frozen_date = db.query(FrozenDate).filter(
        FrozenDate.monthly_form_id == assignment.monthly_form_id,
        FrozenDate.frozen_date == assignment.assignment_date
    ).first()

    if frozen_date:
        raise HTTPException(
            status_code=409,
            detail="This date is frozen. Assignments cannot be changed."
        )


# --------------------------------------------------
# CHECK HARD SCHEDULING RESTRICTIONS
# --------------------------------------------------

def find_lector_assignment_conflict(
    db: Session,
    lector_id: int,
    assignment: Assignment
):
    """
    A lector:
    - Can serve at only one Mass per calendar day.
    - Must have at least one complete calendar day
      without an assignment between serving days.

    These restrictions cannot be overridden.
    """

    previous_date = assignment.assignment_date - timedelta(days=1)
    next_date = assignment.assignment_date + timedelta(days=1)

    return db.query(Assignment).filter(
        Assignment.lector_id == lector_id,
        Assignment.assignment_date >= previous_date,
        Assignment.assignment_date <= next_date,
        Assignment.id != assignment.id
    ).order_by(
        Assignment.assignment_date,
        Assignment.mass_slot_id
    ).first()


# --------------------------------------------------
# DETERMINE REQUIRED POSITIONS FOR EACH MASS
# --------------------------------------------------

def get_responsibility_positions(mass_slot):

    positions = {
        "Angelus": 1,
        "Reading": 1,
        "POF": 1,
    }

    # Two readers are required at:
    # Saturday 6 PM
    # Sunday 7:30 AM
    # Sunday 9:45 AM
    # Sunday 6 PM

    if (
        mass_slot.mass_type == "Saturday"
        and mass_slot.mass_time.hour == 18
    ) or (
        mass_slot.mass_type == "Sunday"
        and mass_slot.mass_time.hour in [7, 9, 18]
    ):
        positions["Reading"] = 2

    return positions


# --------------------------------------------------
# GET AVAILABILITY WARNINGS
# --------------------------------------------------

def get_availability_warnings(
    db: Session,
    submission: AvailabilitySubmission,
    assignment: Assignment,
    mass_slot: MassSlot
):
    """
    Return all availability preferences that the lector
    has not met for this assignment.

    Manual assignments can override these warnings
    after administrator confirmation.

    Automatic assignments must have no warnings.
    """

    warnings = []

    # Check responsibility preference.

    responsibility = db.query(LectorResponsibility).filter(
        LectorResponsibility.submission_id == submission.id,
        LectorResponsibility.responsibility == assignment.responsibility
    ).first()

    if not responsibility:
        warnings.append(
            "This lector did not select this responsibility."
        )

    # Check weekday and weekend availability.

    weekday = assignment.assignment_date.weekday()

    if (
        submission.day_availability == "weekdays"
        and weekday > 4
    ):
        warnings.append(
            "This lector selected weekdays only."
        )

    elif (
        submission.day_availability == "weekends"
        and weekday < 5
    ):
        warnings.append(
            "This lector selected weekends only."
        )

    # Check specifically selected days.

    elif submission.day_availability == "specific_days":

        day_name = assignment.assignment_date.strftime("%A")

        available_day = db.query(LectorAvailableDay).filter(
            LectorAvailableDay.submission_id == submission.id,
            LectorAvailableDay.day_name == day_name
        ).first()

        if not available_day:
            warnings.append(
                f"This lector did not select {day_name} as an available day."
            )

    # Check morning and evening preferences.

    is_morning = mass_slot.mass_time.hour < 12

    if (
        submission.mass_preference == "Morning"
        and not is_morning
    ):
        warnings.append(
            "This lector selected morning Masses only."
        )

    elif (
        submission.mass_preference == "Evening"
        and is_morning
    ):
        warnings.append(
            "This lector selected evening Masses only."
        )

    # Check unavailable date ranges.

    unavailable = db.query(UnavailableDate).filter(
        UnavailableDate.submission_id == submission.id,
        UnavailableDate.start_date <= assignment.assignment_date,
        UnavailableDate.end_date >= assignment.assignment_date
    ).first()

    if unavailable:
        warnings.append(
            "This lector marked this date as unavailable."
        )

    return warnings


# --------------------------------------------------
# CHECK AUTOMATIC ASSIGNMENT AVAILABILITY
# --------------------------------------------------

def lector_meets_availability(
    db: Session,
    submission: AvailabilitySubmission,
    assignment: Assignment,
    mass_slot: MassSlot
):
    warnings = get_availability_warnings(
        db,
        submission,
        assignment,
        mass_slot
    )

    return len(warnings) == 0


# --------------------------------------------------
# GENERATE ASSIGNMENT POSITIONS FOR THE MONTH
# --------------------------------------------------

@router.post("/generate/{monthly_form_id}")
def generate_assignments(
    monthly_form_id: int,
    db: Session = Depends(get_db)
):

    monthly_form = ensure_monthly_form_exists(
        db,
        monthly_form_id
    )

    mass_slots = db.query(MassSlot).order_by(
        MassSlot.mass_time
    ).all()

    if not mass_slots:
        raise HTTPException(
            status_code=400,
            detail="No Mass slots have been configured."
        )

    frozen_dates = {
        item.frozen_date
        for item in db.query(FrozenDate).filter(
            FrozenDate.monthly_form_id == monthly_form_id
        ).all()
    }

    days_in_month = calendar.monthrange(
        monthly_form.year,
        monthly_form.month
    )[1]

    created_count = 0
    skipped_count = 0

    try:

        for day_number in range(1, days_in_month + 1):

            assignment_date = date(
                monthly_form.year,
                monthly_form.month,
                day_number
            )

            # Completely skip frozen dates.

            if assignment_date in frozen_dates:
                continue

            weekday = assignment_date.weekday()

            if weekday <= 4:
                day_type = "Weekday"
            elif weekday == 5:
                day_type = "Saturday"
            else:
                day_type = "Sunday"

            daily_slots = [
                slot for slot in mass_slots
                if slot.mass_type == day_type
            ]

            for mass_slot in daily_slots:

                required_positions = get_responsibility_positions(
                    mass_slot
                )

                requires_manual_assignment = mass_slot.is_manual_only

                for responsibility, number_of_positions in (
                    required_positions.items()
                ):

                    for position in range(
                        1,
                        number_of_positions + 1
                    ):

                        existing = db.query(Assignment).filter(
                            Assignment.monthly_form_id == monthly_form_id,
                            Assignment.mass_slot_id == mass_slot.id,
                            Assignment.assignment_date == assignment_date,
                            Assignment.responsibility == responsibility,
                            Assignment.position_number == position
                        ).first()

                        if existing:
                            skipped_count += 1
                            continue

                        new_assignment = Assignment(
                            monthly_form_id=monthly_form_id,
                            mass_slot_id=mass_slot.id,
                            assignment_date=assignment_date,
                            responsibility=responsibility,
                            position_number=position,
                            lector_id=None,
                            is_manual=False,
                            is_protected=requires_manual_assignment
                        )

                        db.add(new_assignment)
                        created_count += 1

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Assignment positions generated successfully.",
        "monthly_form_id": monthly_form_id,
        "year": monthly_form.year,
        "month": monthly_form.month,
        "positions_created": created_count,
        "existing_positions_skipped": skipped_count
    }


# --------------------------------------------------
# DELETE ALL ASSIGNMENT POSITIONS FOR A MONTH
# --------------------------------------------------

@router.delete("/delete-all/{monthly_form_id}")
def delete_all_assignments(
    monthly_form_id: int,
    db: Session = Depends(get_db)
):
    """
    Removes every assignment position for the month,
    including any left over on dates that were frozen
    after positions were generated.

    Generate Positions can be run again afterwards.
    """

    ensure_monthly_form_exists(db, monthly_form_id)

    try:
        deleted_count = db.query(Assignment).filter(
            Assignment.monthly_form_id == monthly_form_id
        ).delete(synchronize_session=False)

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message": f"{deleted_count} assignment positions deleted.",
        "monthly_form_id": monthly_form_id,
        "deleted": deleted_count
    }


# --------------------------------------------------
# CLEAR ALL LECTORS (KEEP POSITIONS) FOR JANUARY 2027
# --------------------------------------------------

@router.delete("/clear-all/{monthly_form_id}")
def clear_all_monthly_assignments(
    monthly_form_id: int,
    db: Session = Depends(get_db)
):
    monthly_form = ensure_monthly_form_exists(
        db,
        monthly_form_id
    )

    # SAFETY: This bulk-clear operation is restricted
    # to January 2027, monthly form ID 2.
    if (
        monthly_form_id != 2
        or monthly_form.year != 2027
        or monthly_form.month != 1
    ):
        raise HTTPException(
            status_code=400,
            detail="Bulk clearing is currently allowed only for January 2027."
        )

    # Get frozen dates. Never modify assignments on these dates.
    frozen_dates = {
        item.frozen_date
        for item in db.query(FrozenDate).filter(
            FrozenDate.monthly_form_id == monthly_form_id
        ).all()
    }

    # Identify Mass slots that must always remain manual-only.
    manual_only_slot_ids = {
        slot.id
        for slot in db.query(MassSlot).filter(
            MassSlot.is_manual_only.is_(True)
        ).all()
    }

    assignments = db.query(Assignment).filter(
        Assignment.monthly_form_id == monthly_form_id
    ).all()

    cleared_count = 0
    frozen_count = 0

    try:
        for assignment in assignments:

            # Preserve frozen dates completely.
            if assignment.assignment_date in frozen_dates:
                frozen_count += 1
                continue

            # Clear the lector without deleting the position.
            if assignment.lector_id is not None:
                cleared_count += 1

            assignment.lector_id = None
            assignment.is_manual = False

            # Preserve the manual-only restriction.
            assignment.is_protected = (
                assignment.mass_slot_id in manual_only_slot_ids
            )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message": "January 2027 lector assignments cleared successfully.",
        "monthly_form_id": monthly_form_id,
        "assignments_cleared": cleared_count,
        "positions_preserved": len(assignments),
        "frozen_positions_skipped": frozen_count
    }


# --------------------------------------------------
# AUTOMATICALLY ASSIGN LECTORS FOR THE MONTH
# --------------------------------------------------

@router.post("/auto-assign/{monthly_form_id}")
def auto_assign_lectors(
    monthly_form_id: int,
    db: Session = Depends(get_db)
):

    monthly_form = ensure_monthly_form_exists(
        db,
        monthly_form_id
    )

    mass_slots = db.query(MassSlot).order_by(
        MassSlot.mass_time
    ).all()

    if not mass_slots:
        raise HTTPException(
            status_code=400,
            detail="No Mass slots configured."
        )

    mass_slot_map = {
        slot.id: slot
        for slot in mass_slots
    }

    frozen_dates = {
        item.frozen_date
        for item in db.query(FrozenDate).filter(
            FrozenDate.monthly_form_id == monthly_form_id
        ).all()
    }

    # LOAD ONLY ACTIVE LECTORS

    active_lectors = db.query(Lector).filter(
        Lector.is_active.is_(True)
    ).order_by(
        Lector.id
    ).all()

    # LOAD MONTHLY AVAILABILITY SUBMISSIONS

    submissions = db.query(AvailabilitySubmission).filter(
        AvailabilitySubmission.monthly_form_id == monthly_form_id
    ).all()

    submission_map = {
        submission.lector_id: submission
        for submission in submissions
    }

    # Only active lectors who submitted availability
    # for this particular month can be automatically assigned.

    eligible_pool = [
        lector
        for lector in active_lectors
        if lector.id in submission_map
    ]

    if not eligible_pool:
        raise HTTPException(
            status_code=400,
            detail=(
                "No active lectors have submitted availability "
                "for this month."
            )
        )

    lector_ids = [lector.id for lector in eligible_pool]

    # INITIALISE WORKLOAD COUNTS

    assignment_counts = {
        lector_id: 0
        for lector_id in lector_ids
    }

    responsibility_counts = {
        lector_id: {
            "Angelus": 0,
            "Reading": 0,
            "POF": 0
        }
        for lector_id in lector_ids
    }

    # Count existing assignments, including manual and
    # protected assignments, so they are included in fairness.

    existing_filled_assignments = db.query(Assignment).filter(
        Assignment.monthly_form_id == monthly_form_id,
        Assignment.lector_id.isnot(None)
    ).all()

    for item in existing_filled_assignments:

        lector_id = item.lector_id

        if lector_id not in assignment_counts:
            continue

        assignment_counts[lector_id] += 1

        if item.responsibility in responsibility_counts[lector_id]:
            responsibility_counts[lector_id][item.responsibility] += 1

    # LOAD ALL ASSIGNMENT POSITIONS

    assignments = db.query(Assignment).filter(
        Assignment.monthly_form_id == monthly_form_id
    ).all()

    responsibility_order = {
        "Angelus": 1,
        "Reading": 2,
        "POF": 3
    }

    assignments.sort(
        key=lambda item: (
            item.assignment_date,
            mass_slot_map[item.mass_slot_id].mass_time,
            responsibility_order.get(item.responsibility, 99),
            item.position_number
        )
    )

    # Each responsibility gets its own rotating tie-break.

    rotation_cursor = {
        "Angelus": 0,
        "Reading": 0,
        "POF": 0
    }

    assigned_count = 0
    protected_count = 0
    already_filled_count = 0
    unfilled_count = 0

    # ASSIGN POSITIONS CHRONOLOGICALLY

    try:

        for assignment in assignments:

            mass_slot = mass_slot_map.get(
                assignment.mass_slot_id
            )

            if not mass_slot:
                continue

            # Skip frozen dates completely.

            if assignment.assignment_date in frozen_dates:
                protected_count += 1
                continue

            # Manual-only Masses must be handled manually.

            if mass_slot.is_manual_only:
                protected_count += 1
                continue

            # Never change protected or manual positions.

            if assignment.is_protected or assignment.is_manual:
                protected_count += 1
                continue

            # Never replace an existing lector.

            if assignment.lector_id is not None:
                already_filled_count += 1
                continue

            eligible_lectors = []

            # CHECK EACH MONTHLY ELIGIBLE LECTOR

            for lector in eligible_pool:

                submission = submission_map[lector.id]

                if not lector_meets_availability(
                    db,
                    submission,
                    assignment,
                    mass_slot
                ):
                    continue

                # Enforce one Mass per day and one full rest day.

                conflict = find_lector_assignment_conflict(
                    db,
                    lector.id,
                    assignment
                )

                if conflict:
                    continue

                eligible_lectors.append(lector)

            if not eligible_lectors:
                unfilled_count += 1
                continue

            # FAIR WORKLOAD SELECTION

            responsibility = assignment.responsibility

            cursor = rotation_cursor.get(responsibility, 0)
            pool_size = len(eligible_pool)

            lector_positions = {
                lector.id: index
                for index, lector in enumerate(eligible_pool)
            }

            eligible_lectors.sort(
                key=lambda lector: (
                    responsibility_counts[lector.id].get(
                        responsibility,
                        0
                    ),
                    assignment_counts[lector.id],
                    (
                        lector_positions[lector.id] - cursor
                    ) % pool_size
                )
            )

            selected_lector = eligible_lectors[0]

            # SAVE ASSIGNMENT

            assignment.lector_id = selected_lector.id
            assignment.is_manual = False
            assignment.is_protected = False

            db.flush()

            assignment_counts[selected_lector.id] += 1

            responsibility_counts[
                selected_lector.id
            ][responsibility] += 1

            rotation_cursor[responsibility] = (
                lector_positions[selected_lector.id] + 1
            ) % pool_size

            assigned_count += 1

        db.commit()

    except Exception:
        db.rollback()
        raise

    # RETURN RESULTS

    distribution = {}

    for lector in eligible_pool:

        distribution[lector.id] = {
            "lector_name": (
                f"{lector.first_name} {lector.last_name}"
            ),
            "total_assignments": assignment_counts[lector.id],
            "Angelus": responsibility_counts[lector.id]["Angelus"],
            "Reading": responsibility_counts[lector.id]["Reading"],
            "POF": responsibility_counts[lector.id]["POF"]
        }

    return {
        "message": "Automatic assignments completed.",
        "monthly_form_id": monthly_form_id,
        "eligible_lectors": len(eligible_pool),
        "assignments_created": assigned_count,
        "protected_positions_skipped": protected_count,
        "already_filled_positions_skipped": already_filled_count,
        "positions_left_unfilled": unfilled_count,
        "lector_distribution": distribution
    }


# --------------------------------------------------
# VIEW ALL ASSIGNMENTS FOR A MONTH
# --------------------------------------------------

@router.get("/{monthly_form_id}")
def get_assignments(
    monthly_form_id: int,
    db: Session = Depends(get_db)
):

    ensure_monthly_form_exists(db, monthly_form_id)

    results = db.query(
        Assignment,
        Lector,
        MassSlot
    ).outerjoin(
        Lector,
        Assignment.lector_id == Lector.id
    ).join(
        MassSlot,
        Assignment.mass_slot_id == MassSlot.id
    ).filter(
        Assignment.monthly_form_id == monthly_form_id
    ).order_by(
        Assignment.assignment_date,
        MassSlot.mass_time,
        Assignment.responsibility,
        Assignment.position_number
    ).all()

    return [
        {
            "id": assignment.id,
            "assignment_date": assignment.assignment_date,
            "mass_slot_id": assignment.mass_slot_id,
            "mass_time": (
                mass_slot.mass_time.strftime("%I:%M %p").lstrip("0")
                if mass_slot.mass_time else None
            ),
            "mass_type": mass_slot.mass_type,
            "responsibility": assignment.responsibility,
            "position_number": assignment.position_number,
            "lector_id": assignment.lector_id,
            "lector_name": (
                f"{lector.first_name} {lector.last_name}"
                if lector else None
            ),
            "is_manual": assignment.is_manual,
            "is_protected": assignment.is_protected
        }
        for assignment, lector, mass_slot in results
    ]


# --------------------------------------------------
# MANUALLY ASSIGN OR REPLACE A LECTOR
# --------------------------------------------------

@router.patch("/{assignment_id}/manual")
def manually_assign_lector(
    assignment_id: int,
    assignment_data: ManualAssignmentUpdate,
    db: Session = Depends(get_db)
):

    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment position not found."
        )

    ensure_monthly_form_exists(
        db,
        assignment.monthly_form_id
    )

    ensure_assignment_date_is_not_frozen(
        db,
        assignment
    )

    lector = db.query(Lector).filter(
        Lector.id == assignment_data.lector_id,
        Lector.is_active.is_(True)
    ).first()

    if not lector:
        raise HTTPException(
            status_code=404,
            detail="Active lector not found."
        )

    # HARD RULES: these cannot be overridden.

    conflict = find_lector_assignment_conflict(
        db,
        lector.id,
        assignment
    )

    if conflict:

        if conflict.assignment_date == assignment.assignment_date:

            message = (
                "This lector is already assigned to another "
                "Mass on this date. A lector can serve at only "
                "one Mass per day."
            )

        else:

            message = (
                "This lector has an assignment on an adjacent "
                "calendar day. At least one full calendar day "
                "of rest is required between assignments."
            )

        raise HTTPException(
            status_code=409,
            detail={
                "message": message,
                "conflicting_assignment_id": conflict.id,
                "conflicting_date": conflict.assignment_date.isoformat(),
                "requires_confirmation": False,
                "can_override": False
            }
        )

    # AVAILABILITY RULES: these can be overridden manually.

    warnings = []

    submission = db.query(AvailabilitySubmission).filter(
        AvailabilitySubmission.lector_id == lector.id,
        AvailabilitySubmission.monthly_form_id == assignment.monthly_form_id
    ).first()

    if not submission:

        warnings.append(
            "This lector has not submitted availability for this month."
        )

    else:

        mass_slot = db.query(MassSlot).filter(
            MassSlot.id == assignment.mass_slot_id
        ).first()

        if mass_slot:

            warnings = get_availability_warnings(
                db,
                submission,
                assignment,
                mass_slot
            )

    if warnings and not assignment_data.override_availability:

        raise HTTPException(
            status_code=409,
            detail={
                "message": (
                    "Availability warning. "
                    "Tick the override box to confirm."
                ),
                "warnings": warnings,
                "requires_confirmation": True
            }
        )

    # Save the manual assignment and protect it.

    assignment.lector_id = lector.id
    assignment.is_manual = True
    assignment.is_protected = True

    db.commit()
    db.refresh(assignment)

    return {
        "message": "Lector assigned manually and protected successfully.",
        "assignment_id": assignment.id,
        "lector_id": assignment.lector_id,
        "is_manual": assignment.is_manual,
        "is_protected": assignment.is_protected,
        "warnings_overridden": (
            warnings if assignment_data.override_availability else []
        )
    }


# --------------------------------------------------
# DELETE ONE ASSIGNMENT POSITION FROM THE CALENDAR
# --------------------------------------------------

@router.delete("/{assignment_id}/manual")
def clear_manual_assignment(
    assignment_id: int,
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment position not found."
        )

    ensure_monthly_form_exists(
        db,
        assignment.monthly_form_id
    )

    ensure_assignment_date_is_not_frozen(
        db,
        assignment
    )

    try:
        db.delete(assignment)
        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Assignment position removed from the calendar.",
        "assignment_id": assignment_id,
        "deleted": True
    }