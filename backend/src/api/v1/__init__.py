from fastapi import APIRouter
from .data.data_routeur import router as data_router
from .llm.llm_routeur import router as llm_router

router = APIRouter(prefix="/v1", tags=["v1"])

router.include_router(data_router)
router.include_router(llm_router)

@router.get("/version")
def get_version():
    return {"version": "1.0.0"}