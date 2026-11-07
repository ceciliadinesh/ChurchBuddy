
from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, func
from app.database import Base


class MonthlyForm(Base):
    __tablename__ = "monthly_forms"

    id = Column(Integer, primary_key=True, index=True)

    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)

    title = Column(String(150), nullable=False)

    opening_date = Column(Date, nullable=True)
    closing_date = Column(Date, nullable=True)

    is_open = Column(Boolean, default=True, nullable=False)

    # Google Forms integration
    google_form_id = Column(
        String(255),
        unique=True,
        nullable=True
    )

    google_form_url = Column(
        String(1000),
        nullable=True
    )

    google_form_edit_url = Column(
        String(1000),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
