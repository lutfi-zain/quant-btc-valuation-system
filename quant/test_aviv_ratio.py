import pytest
import sqlite3
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from database.db import init_db, DB_PATH
from quant.aviv_ratio import fetch_aviv_data, normalize_aviv, insert_to_db

def test_fetch_aviv_data():
    data = fetch_aviv_data()
    assert len(data) > 3000
    assert 'date' in data[0]
    assert 'aviv_ratio' in data[0]
    assert 'btc_price' in data[0]

def test_normalize_aviv():
    data = [
        {"date": "2023-01-01T00:00:00Z", "aviv_ratio": 1.0, "btc_price": 50000},
        {"date": "2023-01-02T00:00:00Z", "aviv_ratio": 2.0, "btc_price": 51000},
        {"date": "2023-01-03T00:00:00Z", "aviv_ratio": 3.0, "btc_price": 52000},
    ]
    normalized = normalize_aviv(data)
    assert len(normalized) == 3
    # Mean is 2.0. Std is 1.0
    # Values: (1-2)/1 = -1.0; (2-2)/1 = 0.0; (3-2)/1 = 1.0
    assert normalized[0]['normalized_value'] == -1.0
    assert normalized[1]['normalized_value'] == 0.0
    assert normalized[2]['normalized_value'] == 1.0

def test_db_insertion():
    init_db()
    
    data = [
        {"date": "2023-01-01T00:00:00Z", "aviv_ratio": 1.0, "normalized_value": -1.0, "btc_price": 50000},
    ]
    insert_to_db(data)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM timeseries_metrics WHERE date = '2023-01-01T00:00:00Z' AND metric_name = 'aviv_ratio'")
    row = cursor.fetchone()
    conn.close()
    
    assert row is not None
    # row: date, metric_name, raw_value, normalized_value, btc_price
    assert row[0] == "2023-01-01T00:00:00Z"
    assert row[1] == "aviv_ratio"
    assert row[2] == 1.0
    assert row[3] == -1.0
    assert row[4] == 50000.0
