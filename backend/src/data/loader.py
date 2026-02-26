import re
import logging
from pathlib import Path

import pandas as pd

log = logging.getLogger(__name__)


class DataLoader:
    """Singleton that reads every CSV in a directory at import time.

    After construction, `.datasets` holds name->DataFrame mappings and
    `.info` holds lightweight metadata dicts for the API.
    """

    _instance: "DataLoader | None" = None

    datasets: dict[str, pd.DataFrame]
    info: list[dict]

    def __new__(cls, data_path: str | None = None):
        if cls._instance is not None:
            return cls._instance

        if data_path is None:
            raise ValueError("data_path required on first instantiation")

        inst = super().__new__(cls)
        inst.datasets = {}
        inst.info = []
        inst._load(Path(data_path))
        cls._instance = inst
        return inst

    # Skip __init__ on subsequent calls (singleton already set up)
    def __init__(self, data_path: str | None = None):
        pass

    def _load(self, data_dir: Path) -> None:
        if not data_dir.exists():
            raise FileNotFoundError(f"Data directory '{data_dir}' not found")

        csv_files = sorted(data_dir.glob("*.csv"))
        if not csv_files:
            raise FileNotFoundError(f"No CSV files in '{data_dir}'")

        log.info("Loading %d CSV files from %s", len(csv_files), data_dir)

        for path in csv_files:
            name = re.sub(r"[^a-zA-Z0-9_]", "_", path.stem).strip("_").lower()
            df = pd.read_csv(path)
            self.datasets[name] = df
            self.info.append({
                "name": name,
                "rows": df.shape[0],
                "columns": df.shape[1],
                "column_names": df.columns.tolist(),
            })


# Loaded once at import time
_loader = DataLoader(data_path="./data")


def get_datasets() -> dict[str, pd.DataFrame]:
    return _loader.datasets


def get_info() -> list[dict]:
    return _loader.info


def get_dataset_info_str() -> str:
    """Markdown-formatted summary of every dataset (used in the system prompt)."""
    lines = []
    for ds in _loader.info:
        cols = ", ".join(ds["column_names"])
        lines.append(f"- **{ds['name']}**: {ds['rows']} rows, {ds['columns']} columns. Columns: {cols}")
    return "\n".join(lines)