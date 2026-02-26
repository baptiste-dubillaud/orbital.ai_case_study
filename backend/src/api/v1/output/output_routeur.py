import os
import logging

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/output", tags=["output"])

OUTPUT_DIR = os.path.join(os.getcwd(), "output")


@router.get("/{filename}")
async def get_output_file(filename: str):
    """Serve a generated output file (HTML plot, CSV, etc.)."""
    filepath = os.path.join(OUTPUT_DIR, filename)

    # Prevent directory traversal
    real_output = os.path.realpath(OUTPUT_DIR)
    real_file = os.path.realpath(filepath)
    if not real_file.startswith(real_output):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    if not os.path.isfile(real_file):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File '{filename}' not found",
        )

    # Determine media type from extension
    ext = os.path.splitext(filename)[1].lower()
    media_types = {
        ".html": "text/html",
        ".csv": "text/csv",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".svg": "image/svg+xml",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(real_file, media_type=media_type)
