from pathlib import Path
import re
import pandas as pd
import logging

logger = logging.getLogger(__name__)

class DataLoader:
    _instance = None
    
    datasets: dict[str, pd.DataFrame] = {}
    info: list[dict] = []

    def __new__(cls, data_path: str = None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            if data_path is None:
                raise ValueError("data_path is required for first instantiation")
            cls._instance.__initialized = False
        return cls._instance

    def __init__(self, data_path: str = None):
        if self.__initialized:
            return
        self.__initialized = True
        self.__load_data(data_path)
        self.__init_info()

    def __load_data(self, data_path: str):
        """Load data from the specified path."""
        
        data_dir = Path(data_path)

        # Check if the data directory exists
        logger.debug(f"Checking data path: {data_path}")
        if not data_dir.exists():
            raise FileNotFoundError(f"Data path '{data_path}' does not exist.")
        
        # Get all csv files in the data directory
        logger.debug(f"Looking for CSV files in: {data_path}")
        csv_files = list(data_dir.glob("*.csv"))
        if not csv_files:
            raise FileNotFoundError(f"No CSV files found in data path '{data_path}'.")
        
        # Load data from each CSV file
        logger.info(f"Found {len(csv_files)} CSV files. Loading datasets...")
        for csv_file in csv_files:
            name = re.sub(r"[^a-zA-Z0-9_]", "_", csv_file.stem).strip("_").lower()
            df = pd.read_csv(csv_file)
            self.datasets[name] = df

    def __init_info(self):
        """Get a summary of the loaded datasets."""
        logger.debug("Generating dataset info summary.")

        if not self.datasets:
            raise FileNotFoundError("No datasets loaded.")
        
        for name, df in self.datasets.items():
            self.info.append({
                "name": name,
                "rows": df.shape[0],
                "columns": df.shape[1],
                "column_names": df.columns.tolist()
            })


data_loader = DataLoader(data_path="./data")

def get_datasets() -> dict[str, pd.DataFrame]:
    """Get the loaded datasets."""
    return data_loader.datasets

def get_info() -> list[dict]:
    """Get the summary info of the loaded datasets."""
    return data_loader.info

def get_dataset_info_str() -> str:
    """Get a formatted string describing all loaded datasets for the system prompt."""
    parts = []
    for ds in data_loader.info:
        cols = ", ".join(ds["column_names"])
        parts.append(f"- **{ds['name']}**: {ds['rows']} rows, {ds['columns']} columns. Columns: {cols}")
    return "\n".join(parts)