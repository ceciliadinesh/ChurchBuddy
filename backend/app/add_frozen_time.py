from sqlalchemy import text
from app.database import engine

with engine.begin() as conn:
    conn.execute(text(
        "ALTER TABLE frozen_dates "
        "ADD COLUMN IF NOT EXISTS frozen_time VARCHAR(20)"
    ))

print("frozen_time column is ready")