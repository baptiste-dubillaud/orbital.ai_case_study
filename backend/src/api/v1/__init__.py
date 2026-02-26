from fastapi import APIRouter

from api.models import VersionResponse
from .data.data_routeur import router as data_router
from .llm.llm_routeur import router as llm_router
from .output.output_routeur import router as output_router

router = APIRouter(prefix="/v1")
router.include_router(data_router)
router.include_router(llm_router)
router.include_router(output_router)


@router.get("/version", summary="API version", response_model=VersionResponse)
def get_version() -> VersionResponse:
    """Return the current API version."""
    return VersionResponse(version="1.0.0")