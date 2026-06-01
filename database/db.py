import sqlite3
from typing import List, Dict, Any, Optional

DB_PATH = 'database/metrics.db'

def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path: str = DB_PATH) -> None:
    """Initialize the database schema and indices."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    
    # Create the timeseries_metrics table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS timeseries_metrics (
            date TEXT,
            metric_name TEXT,
            raw_value REAL,
            normalized_value REAL,
            btc_price REAL,
            PRIMARY KEY (metric_name, date)
        )
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_metric_date 
        ON timeseries_metrics (metric_name, date)
    ''')
    
    # Create the btc_ohlc table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS btc_ohlc (
            date TEXT PRIMARY KEY,
            open REAL,
            high REAL,
            low REAL,
            close REAL
        )
    ''')
    
    # Create the metric_config table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS metric_config (
            metric_name TEXT PRIMARY KEY,
            t_minus_2 REAL,
            t_minus_1 REAL,
            t_zero REAL,
            t_plus_1 REAL,
            t_plus_2 REAL
        )
    ''')
    
    conn.commit()
    conn.close()

def insert_metric(
    date: str, 
    metric_name: str, 
    raw_value: float, 
    normalized_value: float, 
    btc_price: float,
    db_path: str = DB_PATH
) -> None:
    """Insert or replace a metric record."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT OR REPLACE INTO timeseries_metrics 
        (date, metric_name, raw_value, normalized_value, btc_price)
        VALUES (?, ?, ?, ?, ?)
    ''', (date, metric_name, raw_value, normalized_value, btc_price))
    
    conn.commit()
    conn.close()

def insert_ohlc(
    date: str, 
    open_price: float, 
    high: float, 
    low: float, 
    close: float,
    db_path: str = DB_PATH
) -> None:
    """Insert or replace an OHLC record."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT OR REPLACE INTO btc_ohlc 
        (date, open, high, low, close)
        VALUES (?, ?, ?, ?, ?)
    ''', (date, open_price, high, low, close))
    
    conn.commit()
    conn.close()

def get_metrics(metric_name: str, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Retrieve all records for a specific metric."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT date, raw_value, normalized_value, btc_price 
        FROM timeseries_metrics 
        WHERE metric_name = ?
        ORDER BY date ASC
    ''', (metric_name,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def get_ohlc(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Retrieve all OHLC records."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT date, open, high, low, close 
        FROM btc_ohlc 
        ORDER BY date ASC
    ''')
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]
