import asyncio
from dataclasses import dataclass, field
from typing import Any, Optional

import pandas as pd


@dataclass
class AgentContext:
    """Context injected into all agent tools via PydanticAI dependency injection."""

    datasets: dict[str, pd.DataFrame] = field(default_factory=dict)
    dataset_info: str = ""
    current_dataframe: Optional[pd.DataFrame] = None
    # Async queue for real-time tool event streaming
    event_queue: asyncio.Queue[tuple[str, dict[str, Any]] | None] = field(
        default_factory=asyncio.Queue
    )
