from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

router = APIRouter(prefix="/output", tags=["Output files"])

OUTPUT_DIR = Path.cwd() / "output"

# Extension -> Content-Type for files the agent can produce
MEDIA_TYPES = {
    ".html": "text/html",
}


@router.get(
    "/{filename}",
    summary="Download a generated file",
)
async def get_output_file(filename: str):
    """Serve a plot or table previously created by the agent."""
    filepath = (OUTPUT_DIR / filename).resolve()

    # Block path traversal (e.g. "../../etc/passwd")
    if not filepath.is_relative_to(OUTPUT_DIR.resolve()):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")

    if not filepath.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"'{filename}' not found")

    media_type = MEDIA_TYPES.get(filepath.suffix.lower(), "application/octet-stream")
    return FileResponse(filepath, media_type=media_type)
