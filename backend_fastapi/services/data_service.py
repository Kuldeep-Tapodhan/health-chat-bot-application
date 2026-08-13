import pandas as pd
import os

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = os.path.join(BASE_DIR, "data")

def save_csv(file_path: str):
    # This is already handled by the upload route, but we can add validation here if needed
    pass

def get_csv_path(filename: str) -> str:
    return os.path.join(DATA_DIR, filename)

def list_csvs() -> list[str]:
    if not os.path.exists(DATA_DIR):
        return []
    return [f for f in os.listdir(DATA_DIR) if f.endswith(".csv")]
