
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Lector as LectorModel
from app import schemas


router = APIRouter(
    prefix="/lectors",
    tags=["Lectors"]
)


# CREATE a new lector
@router.post("/", response_model=schemas.LectorResponse, status_code=status.HTTP_201_CREATED)
def create_lector(
    lector: schemas.LectorCreate,
    db: Session = Depends(get_db)
):
    # Check whether the email is already registered
    if lector.email:
        existing_lector = db.query(LectorModel).filter(
            LectorModel.email == lector.email
        ).first()

        if existing_lector:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A lector with this email already exists."
            )

    new_lector = LectorModel(**lector.model_dump())

    db.add(new_lector)
    db.commit()
    db.refresh(new_lector)

    return new_lector


# GET all lectors
@router.get("/", response_model=list[schemas.LectorResponse])
def get_lectors(db: Session = Depends(get_db)):
    return db.query(LectorModel).order_by(LectorModel.id).all()


# GET one lector by ID
@router.get("/{lector_id}", response_model=schemas.LectorResponse)
def get_lector(
    lector_id: int,
    db: Session = Depends(get_db)
):
    lector = db.query(LectorModel).filter(
        LectorModel.id == lector_id
    ).first()

    if not lector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lector not found."
        )

    return lector


# UPDATE a lector
@router.put("/{lector_id}", response_model=schemas.LectorResponse)
def update_lector(
    lector_id: int,
    lector_data: schemas.LectorUpdate,
    db: Session = Depends(get_db)
):
    lector = db.query(LectorModel).filter(
        LectorModel.id == lector_id
    ).first()

    if not lector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lector not found."
        )

    update_data = lector_data.model_dump(exclude_unset=True)

    # Check for duplicate email when email is being changed
    new_email = update_data.get("email")

    if new_email:
        existing_lector = db.query(LectorModel).filter(
            LectorModel.email == new_email,
            LectorModel.id != lector_id
        ).first()

        if existing_lector:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Another lector is already registered with this email."
            )

    for field, value in update_data.items():
        setattr(lector, field, value)

    db.commit()
    db.refresh(lector)

    return lector


# DELETE a lector (soft delete: mark as inactive)
@router.delete("/{lector_id}")
def delete_lector(
    lector_id: int,
    db: Session = Depends(get_db)
):
    lector = db.query(LectorModel).filter(
        LectorModel.id == lector_id
    ).first()

    if not lector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lector not found."
        )

    lector.is_active = False

    db.commit()

    return {
        "message": "Lector deactivated successfully."
    }
