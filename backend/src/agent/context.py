from dataclasses import dataclass, field
from typing import Optional

import pandas as pd


@dataclass
class AgentContext:
    """Dependency bag passed to every tool call via PydanticAI."""

    datasets: dict[str, pd.DataFrame] = field(default_factory=dict)
    dataset_info: str = ""
    # Set by query_data, read by visualize
    current_dataframe: Optional[pd.DataFrame] = None
