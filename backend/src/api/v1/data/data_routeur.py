from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from data.loader import get_info

router = APIRouter(prefix="/data", tags=["data"])

@router.get("")
def get_data_info(): 
    """Get summary info of the loaded datasets."""
    try:
        info = get_info()
        return JSONResponse(content={"datasets": info})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get dataset info")
