
from datetime import datetime, date
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    model_validator,
)
class LectorCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr | None = None
    phone: str | None = None


class LectorUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    is_active: bool | None = None


class LectorResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr | None
    phone: str | None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


from typing import Literal


# Unavailable date range
class UnavailableDateCreate(BaseModel):
    start_date: date
    end_date: date
    reason: str | None = None

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.end_date < self.start_date:
            raise ValueError("End date cannot be before start date.")
        return self


# Monthly availability submission
class AvailabilitySubmissionCreate(BaseModel):
    lector_id: int
    monthly_form_id: int

    day_availability: Literal[
        "weekdays",
        "weekends",
        "all_days",
        "specific_days"
    ]

    mass_preference: Literal[
        "Morning",
        "Evening",
        "Both"
    ]

    available_days: list[
        Literal[
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
        ]
    ] = Field(default_factory=list)

    responsibilities: list[
        Literal[
            "Angelus",
            "Reading",
            "POF"
        ]
    ] = Field(min_length=1)

    unavailable_dates: list[UnavailableDateCreate] = Field(
        default_factory=list
    )

    additional_requests: str | None = None

    @model_validator(mode="after")
    def validate_available_days(self):
        if self.day_availability == "specific_days" and not self.available_days:
            raise ValueError(
                "Please select at least one available day."
            )

        if self.day_availability != "specific_days" and self.available_days:
            raise ValueError(
                "Select specific days only when using specific_days availability."
            )

        return self


from datetime import date
from pydantic import model_validator


class MonthlyFormCreate(BaseModel):
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2026)
    title: str = Field(min_length=3, max_length=150)
    opening_date: date | None = None
    closing_date: date | None = None
    is_open: bool = True

    @model_validator(mode="after")
    def validate_dates(self):
        if (
            self.opening_date is not None
            and self.closing_date is not None
            and self.closing_date < self.opening_date
        ):
            raise ValueError("Closing date cannot be before opening date.")

        return self



class MonthlyFormResponse(BaseModel):
    id: int
    month: int
    year: int
    title: str
    opening_date: date | None
    closing_date: date | None
    is_open: bool

    google_form_id: str | None = None
    google_form_url: str | None = None
    google_form_edit_url: str | None = None

    model_config = ConfigDict(from_attributes=True)

