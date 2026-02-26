import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.config import settings
from api.v1 import router as v1_router

# Override uvicorn's root logger so our level/format takes effect
logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
    force=True,
)

log = logging.getLogger(__name__)

for noisy in ['httpcore', 'httpx']:
    logging.getLogger(noisy).setLevel(logging.WARNING)


app = FastAPI(
    title="Data Analysis API",
    description="Chat with an LLM agent that queries CSV datasets and builds visualizations.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api")


@app.get("/")
async def hello_world():
    return {"message": "Hello, world!"}