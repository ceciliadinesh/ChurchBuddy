import calendar
from datetime import date, datetime, time, timedelta

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
    SundaySlotNote,
)


router = APIRouter(
    prefix="/assignments",
    tags=["Assignments"]
)


# --------------------------------------------------
# SUNDAY FROZEN MASS TIMES
# --------------------------------------------------

SUNDAY_FROZEN_TIMES = {
    time(7, 30),
    time(9, 45),
}

MAX_ASSIGNMENTS_PER_MONTH = 5


def is_frozen_sunday_slot(assignment, mass_slot):
    """
    Automatically freeze only:
    - Sunday at 7:30 AM
    - Sunday at 9:45 AM

    All other Sunday Mass times remain unaffected.
    """

    return (
        assignment.assignment_date.weekday() == 6
        and mass_slot.mass_time in SUNDAY_FROZEN_TIMES
    )


# --------------------------------------------------
# FROZEN DATE + TIME HELPERS
# --------------------------------------------------

def normalize_time(value) -> str:
    """'7:00 AM', '07:00:00', '07:00', datetime.time -> '07:00'"""

    if value is None:
        return "07:00"

    if hasattr(value, "strftime"):
        return value.strftime("%H:%M")

    raw = str(value).strip().upper()

    for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(raw, fmt).strftime("%H:%M")
        except ValueError:
            continue

    return raw


def load_frozen_slots(db: Session, monthly_form_id: int) -> set:
    """Set of (date, 'HH:MM') pairs that are frozen for this month."""

    rows = db.query(FrozenDate).filter(
        FrozenDate.monthly_form_id == monthly_form_id
    ).all()

    return {
        (row.frozen_date, normalize_time(row.frozen_time or "7:00 AM"))
        for row in rows
    }


def is_position_frozen(assignment, mass_slot, frozen_slots: set) -> bool:
    """
    True only when this position's date AND Mass time are frozen.
    Other Masses on the same date are not affected.
    """

    if mass_slot is None:
        return False

    return (
        assignment.assignment_date,
        normalize_time(mass_slot.mass_time),
    ) in frozen_slots


def migrate_frozen_sunday_assignments(
    db: Session,
    monthly_form_id: int
):
    """
    Transfer legacy special_text values into SundaySlotNote.

    Existing notes are preserved.
    Distinct old text is appended.
    All legacy assignment positions for Sunday 7:30 AM
    and 9:45 AM are deleted, including lector assignments.

    This function flushes but does not commit.
    The calling route must commit the transaction.
    """

    legacy_rows = db.query(
        Assignment,
        MassSlot
    ).join(
        MassSlot,
        Assignment.mass_slot_id == MassSlot.id
    ).filter(
        Assignment.monthly_form_id == monthly_form_id,
        MassSlot.mass_time.in_(SUNDAY_FROZEN_TIMES)
    ).all()

    deleted_count = 0
    transferred_text_count = 0

    for assignment, mass_slot in legacy_rows:

        # Only migrate Sunday assignments.
        if not is_frozen_sunday_slot(assignment, mass_slot):
            continue

        existing_note = db.query(SundaySlotNote).filter(
            SundaySlotNote.monthly_form_id == monthly_form_id,
            SundaySlotNote.mass_slot_id == assignment.mass_slot_id,
            SundaySlotNote.slot_date == assignment.assignment_date
        ).first()

        old_text = (
            assignment.special_text.strip()
            if assignment.special_text
            else None
        )

        if old_text:

            if not existing_note:
                existing_note = SundaySlotNote(
                    monthly_form_id=monthly_form_id,
                    mass_slot_id=assignment.mass_slot_id,
                    slot_date=assignment.assignment_date,
                    note=None
                )

                db.add(existing_note)
                db.flush()

            current_note = existing_note.note or ""

            existing_blocks = [
                block.strip()
                for block in current_note.split("\n\n")
                if block.strip()
            ]

            # Preserve existing note content.
            # Append only if the old text is not already present.
            if old_text not in existing_blocks:

                existing_note.note = (
                    f"{current_note.rstrip()}\n\n{old_text}"
                    if current_note.strip()
                    else old_text
                )

                transferred_text_count += 1

        # Delete all legacy positions.
        # Old lector assignments are intentionally not retained.
        db.delete(assignment)
        deleted_count += 1

    db.flush()

    return {
        "deleted_positions": deleted_count,
        "special_text_entries_transferred": transferred_text_count
    }


# --------------------------------------------------
# REQUEST SCHEMAS
# --------------------------------------------------

class ManualAssignmentUpdate(BaseModel):
    lector_id: int
    override_availability: bool = False


class SpecialTextUpdate(BaseModel):
    special_text: str | None = None


# --------------------------------------------------
# VALIDATE MONTHLY FORM
# --------------------------------------------------

def ensure_monthly_form_exists(
    db: Session,
    monthly_form_id: int
):
    """
    The monthly form only needs to exist.

    Closing a form stops availability collection.
    Scheduling can continue after the form is closed.
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

def get_responsibility_positions(
    mass_slot,
    assignment_date
):
    weekday = assignment_date.weekday()
    hour = mass_slot.mass_time.hour

    is_evening = hour >= 12
    is_saturday = weekday == 5
    is_sunday = weekday == 6

    # Sunday morning Masses.
    # Sunday 7:30 AM and 9:45 AM are skipped
    # before this function is called.
    if is_sunday and not is_evening:
        return {
            "Angelus": 1,
            "Reading": 2,
            "POF": 1,
        }

    # Saturday and Sunday evening Masses.
    if is_evening and (is_saturday or is_sunday):
        return {
            "Angelus": 1,
            "Reading": 2,
            "POF": 1,
        }

    # Weekday Masses and Saturday morning.
    return {
        "Angelus": 1,
        "Reading": 1,
    }


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
    Return availability preferences that the lector
    has not met for this assignment.

    Manual assignments can override these warnings
    after administrator confirmation.

    Automatic assignments cannot override them.
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
    """
    Creates positions for every date in the month.

    Sunday 7:30 AM and 9:45 AM:
    - Have no assignment positions.
    - Have separate SundaySlotNote records.

    All other Masses follow normal scheduling rules.
    """

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

    days_in_month = calendar.monthrange(
        monthly_form.year,
        monthly_form.month
    )[1]

    created_count = 0
    skipped_count = 0
    protection_updated_count = 0

    try:

        # Migrate legacy Sunday positions first.
        migration_result = migrate_frozen_sunday_assignments(
            db,
            monthly_form_id
        )

        for day_number in range(1, days_in_month + 1):

            assignment_date = date(
                monthly_form.year,
                monthly_form.month,
                day_number
            )

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

                # Completely skip Sunday 7:30 AM and 9:45 AM.
                # No Angelus, Reading, POF, or dummy positions.
                if (
                    assignment_date.weekday() == 6
                    and mass_slot.mass_time in SUNDAY_FROZEN_TIMES
                ):
                    continue

                required_positions = get_responsibility_positions(
                    mass_slot,
                    assignment_date
                )

                requires_manual_assignment = (
                    mass_slot.is_manual_only
                )

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

                            # Correct old generated protection settings.
                            # Do not alter manual assignments, special text,
                            # or existing lector assignments.

                            if (
                                not existing.is_manual
                                and existing.lector_id is None
                                and not existing.special_text
                            ):

                                expected_protection = (
                                    mass_slot.is_manual_only
                                )

                                if (
                                    existing.is_protected
                                    != expected_protection
                                ):
                                    existing.is_protected = (
                                        expected_protection
                                    )
                                    protection_updated_count += 1

                            skipped_count += 1
                            continue

                        new_assignment = Assignment(
                            monthly_form_id=monthly_form_id,
                            mass_slot_id=mass_slot.id,
                            assignment_date=assignment_date,
                            responsibility=responsibility,
                            position_number=position,
                            lector_id=None,
                            special_text=None,
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
        "existing_positions_skipped": skipped_count,
        "existing_protection_updated": protection_updated_count,
        "legacy_positions_deleted": migration_result[
            "deleted_positions"
        ],
        "special_text_entries_transferred": migration_result[
            "special_text_entries_transferred"
        ]
    }


# --------------------------------------------------
# DELETE EVERYTHING FOR THE MONTH
# --------------------------------------------------

@router.delete("/delete-all/{monthly_form_id}")
def delete_all_assignments(
    monthly_form_id: int,
    db: Session = Depends(get_db)
):
    """
    Full reset of the month's schedule:

    1. Deletes EVERY assignment position: normal, manual, protected,
       custom text, and positions inside frozen slots.
    2. Deletes every FrozenDate row (date, time and note).
    3. Clears the text of every SundaySlotNote. The rows are kept so
       the Sunday 7:30 AM / 9:45 AM "+ Add note" buttons still appear.
    """

    ensure_monthly_form_exists(db, monthly_form_id)

    try:

        deleted_assignments = db.query(Assignment).filter(
            Assignment.monthly_form_id == monthly_form_id
        ).delete(synchronize_session=False)

        deleted_frozen = db.query(FrozenDate).filter(
            FrozenDate.monthly_form_id == monthly_form_id
        ).delete(synchronize_session=False)

        cleared_notes = db.query(SundaySlotNote).filter(
            SundaySlotNote.monthly_form_id == monthly_form_id,
            SundaySlotNote.note.isnot(None)
        ).update(
            {SundaySlotNote.note: None},
            synchronize_session=False
        )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message": (
            f"Deleted {deleted_assignments} assignment positions, "
            f"{deleted_frozen} frozen dates and cleared "
            f"{cleared_notes} Sunday notes."
        ),
        "monthly_form_id": monthly_form_id,
        "deleted": deleted_assignments,
        "deleted_frozen_dates": deleted_frozen,
        "cleared_sunday_notes": cleared_notes
    }


# --------------------------------------------------
# CLEAR ALL LECTORS - KEEP POSITIONS
# RESTRICTED TO JANUARY 2027
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

    # SAFETY: Restrict this operation to January 2027,
    # monthly form ID 2.

    if (
        monthly_form_id != 2
        or monthly_form.year != 2027
        or monthly_form.month != 1
    ):
        raise HTTPException(
            status_code=400,
            detail="Bulk clearing is currently allowed only for January 2027."
        )

    # Frozen date + time pairs.

    frozen_slots = load_frozen_slots(db, monthly_form_id)

    # Load all Mass slots.

    mass_slot_map = {
        slot.id: slot
        for slot in db.query(MassSlot).all()
    }

    # Load manual-only Mass slot IDs.

    manual_only_slot_ids = {
        slot.id
        for slot in mass_slot_map.values()
        if slot.is_manual_only
    }

    assignments = db.query(Assignment).filter(
        Assignment.monthly_form_id == monthly_form_id
    ).all()

    cleared_count = 0
    frozen_count = 0
    special_text_count = 0

    try:

        for assignment in assignments:

            mass_slot = mass_slot_map.get(
                assignment.mass_slot_id
            )

            # Preserve positions in a frozen date + time.

            if is_position_frozen(assignment, mass_slot, frozen_slots):
                frozen_count += 1
                continue

            # Preserve legacy Sunday frozen rows.
            # The generation route migrates these to SundaySlotNote.

            frozen_sunday_slot = (
                mass_slot is not None
                and is_frozen_sunday_slot(
                    assignment,
                    mass_slot
                )
            )

            if frozen_sunday_slot:
                frozen_count += 1
                continue

            # Preserve manually entered special labels.

            if assignment.special_text:
                special_text_count += 1
                continue

            # Clear ordinary lector assignments.
            # Keep manual-only Mass positions protected.

            if assignment.lector_id is not None:
                cleared_count += 1

            assignment.lector_id = None
            assignment.is_manual = False

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
        "frozen_positions_skipped": frozen_count,
        "special_text_positions_preserved": special_text_count
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

    # Frozen date + time pairs. Only the frozen Mass time is skipped;
    # other Masses on the same date are still auto-assigned.

    frozen_slots = load_frozen_slots(db, monthly_form_id)

    # Load only active lectors.

    active_lectors = db.query(Lector).filter(
        Lector.is_active.is_(True)
    ).order_by(
        Lector.id
    ).all()

    # Load monthly availability submissions.

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

    lector_ids = [
        lector.id for lector in eligible_pool
    ]

    # Initialise workload counts.

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

    # Responsibility ordering.

    responsibility_order = {
        "Angelus": 1,
        "Reading": 2,
        "POF": 3
    }

    # Each responsibility gets its own rotating tie-break.

    rotation_cursor = {
        "Angelus": 0,
        "Reading": 0,
        "POF": 0
    }

    lector_positions = {
        lector.id: index
        for index, lector in enumerate(eligible_pool)
    }

    pool_size = len(eligible_pool)

    assigned_count = 0
    protected_count = 0
    frozen_date_skipped_count = 0
    sunday_frozen_skipped_count = 0
    already_filled_count = 0
    unfilled_count = 0

    try:

        # Migrate old Sunday positions before workload counts
        # and automatic assignment processing.
        migration_result = migrate_frozen_sunday_assignments(
            db,
            monthly_form_id
        )

        # Count existing assignments, including manual and
        # protected assignments and assignments in frozen slots.

        existing_filled_assignments = db.query(Assignment).filter(
            Assignment.monthly_form_id == monthly_form_id,
            Assignment.lector_id.isnot(None)
        ).all()

        for item in existing_filled_assignments:

            lector_id = item.lector_id

            if lector_id not in assignment_counts:
                continue

            # Defensive check: do not count a legacy special Sunday slot.
            item_mass_slot = mass_slot_map.get(item.mass_slot_id)

            if (
                item_mass_slot is not None
                and is_frozen_sunday_slot(item, item_mass_slot)
            ):
                continue

            assignment_counts[lector_id] += 1

            if item.responsibility in responsibility_counts[lector_id]:
                responsibility_counts[lector_id][item.responsibility] += 1

        # Load all assignment positions after migration.

        assignments = db.query(Assignment).filter(
            Assignment.monthly_form_id == monthly_form_id
        ).all()

        # Sort positions chronologically.

        assignments.sort(
            key=lambda item: (
                item.assignment_date,
                mass_slot_map[item.mass_slot_id].mass_time,
                responsibility_order.get(item.responsibility, 99),
                item.position_number
            )
        )

        # Assign positions chronologically.

        for assignment in assignments:

            mass_slot = mass_slot_map.get(
                assignment.mass_slot_id
            )

            if not mass_slot:
                continue

            # Skip ONLY the frozen date + time.

            if is_position_frozen(assignment, mass_slot, frozen_slots):
                frozen_date_skipped_count += 1
                continue

            # Defensive skip for legacy Sunday special positions.

            if is_frozen_sunday_slot(assignment, mass_slot):
                sunday_frozen_skipped_count += 1
                continue

            # Manual-only Masses must be handled manually.

            if mass_slot.is_manual_only:
                protected_count += 1
                continue

            # Never change protected or manual positions.

            if assignment.is_protected or assignment.is_manual:
                protected_count += 1
                continue

            # Never replace an existing lector or special text.

            if (
                assignment.lector_id is not None
                or assignment.special_text is not None
            ):
                already_filled_count += 1
                continue

            eligible_lectors = []

            # Check each monthly eligible lector.

            for lector in eligible_pool:

                # Monthly cap.

                if (
                    assignment_counts[lector.id]
                    >= MAX_ASSIGNMENTS_PER_MONTH
                ):
                    continue

                submission = submission_map[lector.id]

                # Availability preferences.

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

            # Fair workload selection:
            # 1. Fewest total assignments.
            # 2. Fewest assignments of this responsibility.
            # 3. Rotating tie-break.

            responsibility = assignment.responsibility

            cursor = rotation_cursor.get(
                responsibility,
                0
            )

            eligible_lectors.sort(
                key=lambda lector: (
                    assignment_counts[lector.id],
                    responsibility_counts[lector.id].get(
                        responsibility,
                        0
                    ),
                    (
                        lector_positions[lector.id] - cursor
                    ) % pool_size
                )
            )

            selected_lector = eligible_lectors[0]

            # Save assignment.

            assignment.lector_id = selected_lector.id
            assignment.is_manual = False
            assignment.is_protected = False

            # Flush so subsequent conflict checks see this assignment.

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

    # Return lector distribution.

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
        "max_assignments_per_lector": MAX_ASSIGNMENTS_PER_MONTH,
        "assignments_created": assigned_count,
        "frozen_date_positions_skipped": frozen_date_skipped_count,
        "sunday_frozen_slots_skipped": sunday_frozen_skipped_count,
        "frozen_positions_skipped": (
            frozen_date_skipped_count + sunday_frozen_skipped_count
        ),
        "protected_positions_skipped": protected_count,
        "already_filled_positions_skipped": already_filled_count,
        "positions_left_unfilled": unfilled_count,
        "legacy_positions_deleted": migration_result[
            "deleted_positions"
        ],
        "special_text_entries_transferred": migration_result[
            "special_text_entries_transferred"
        ],
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

    ensure_monthly_form_exists(
        db,
        monthly_form_id
    )

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
            "special_text": assignment.special_text,
            "lector_name": (
                f"{lector.first_name} {lector.last_name}"
                if lector else None
            ),
            "is_manual": assignment.is_manual,
            "is_protected": assignment.is_protected,
            "is_sunday_frozen": is_frozen_sunday_slot(
                assignment,
                mass_slot
            )
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

    # Special Sunday Masses cannot have lector assignments.

    mass_slot = db.query(MassSlot).filter(
        MassSlot.id == assignment.mass_slot_id
    ).first()

    if mass_slot and is_frozen_sunday_slot(assignment, mass_slot):
        raise HTTPException(
            status_code=409,
            detail=(
                "Sunday 7:30 AM and 9:45 AM are special Masses "
                "and cannot have lector assignments."
            )
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

    # Hard rules cannot be overridden.

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

    # Availability rules can be overridden manually.

    warnings = []

    submission = db.query(AvailabilitySubmission).filter(
        AvailabilitySubmission.lector_id == lector.id,
        AvailabilitySubmission.monthly_form_id == assignment.monthly_form_id
    ).first()

    if not submission:

        warnings.append(
            "This lector has not submitted availability for this month."
        )

    elif mass_slot:

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

    # Save manual assignment and protect it.

    assignment.lector_id = lector.id
    assignment.special_text = None
    assignment.is_manual = True
    assignment.is_protected = True

    try:
        db.commit()
        db.refresh(assignment)

    except Exception:
        db.rollback()
        raise

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


# --------------------------------------------------
# UPDATE SPECIAL TEXT
# --------------------------------------------------

@router.patch("/{assignment_id}/special-text")
def update_special_text(
    assignment_id: int,
    data: SpecialTextUpdate,
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

    mass_slot = db.query(MassSlot).filter(
        MassSlot.id == assignment.mass_slot_id
    ).first()

    if not mass_slot:
        raise HTTPException(
            status_code=404,
            detail="Mass slot not found."
        )

    # Sunday special notes must use SundaySlotNote instead.

    if is_frozen_sunday_slot(assignment, mass_slot):
        raise HTTPException(
            status_code=409,
            detail=(
                "Sunday 7:30 AM and 9:45 AM notes must be "
                "edited through the Sunday slot notes endpoint."
            )
        )

    # Trim whitespace.
    # Empty text means clear this position.

    special_text = (
        data.special_text.strip()
        if data.special_text
        else None
    )

    if special_text == "":
        special_text = None

    if special_text and len(special_text) > 100:
        raise HTTPException(
            status_code=422,
            detail="Special text cannot exceed 100 characters."
        )

    try:

        # Special text replaces any lector in this position.

        assignment.special_text = special_text
        assignment.lector_id = None

        assignment.is_manual = special_text is not None

        # Protect:
        # - Positions with special text.
        # - Manual-only Mass slots.

        assignment.is_protected = (
            special_text is not None
            or mass_slot.is_manual_only
        )

        db.commit()
        db.refresh(assignment)

    except Exception:
        db.rollback()
        raise

    return {
        "message": (
            "Special text saved successfully."
            if special_text
            else "Special text cleared successfully."
        ),
        "assignment_id": assignment.id,
        "special_text": assignment.special_text,
        "lector_id": assignment.lector_id,
        "is_manual": assignment.is_manual,
        "is_protected": assignment.is_protected,
        "is_sunday_frozen": False
    }