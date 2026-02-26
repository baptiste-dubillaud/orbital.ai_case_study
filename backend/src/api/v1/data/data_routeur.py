from fastapi import APIRouter

from api.models import DatasetsResponse
from data.loader import get_info

router = APIRouter(prefix="/data", tags=["Datasets"])


@router.get("", summary="List loaded datasets", response_model=DatasetsResponse)
def list_datasets() -> DatasetsResponse:
    """Return column info and row counts for every CSV that was loaded at startup."""
    return DatasetsResponse(datasets=get_info())
