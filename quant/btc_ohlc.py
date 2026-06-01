import requests
from datetime import datetime, timedelta
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from database.db import init_db, insert_ohlc

def fetch_bitview_ohlc():
    """
    Fetch OHLC data from bitview.space API and insert into DB.
    """
    url = "https://bitview.space/api/series/price_ohlc_cents/day1/data"
    print(f"Fetching OHLC data from {url}...")
    resp = requests.get(url)
    resp.raise_for_status()
    data = resp.json()
    
    start_date = datetime(2009, 1, 3)
    results = []
    
    for i, row in enumerate(data):
        if len(row) != 4:
            continue
        o, h, l, c = row
        # Skip days with 0 data (early days)
        if c == 0:
            continue
            
        current_date = start_date + timedelta(days=i)
        
        # Convert cents to dollars
        results.append({
            "date": current_date.strftime("%Y-%m-%dT00:00:00Z"),
            "open": o / 100.0,
            "high": h / 100.0,
            "low": l / 100.0,
            "close": c / 100.0
        })
    
    return results

def run_pipeline():
    init_db()
    data = fetch_bitview_ohlc()
    
    for row in data:
        insert_ohlc(
            date=row['date'],
            open_price=row['open'],
            high=row['high'],
            low=row['low'],
            close=row['close']
        )
        
    print(f"BTC OHLC pipeline executed successfully. Inserted {len(data)} rows.")

if __name__ == "__main__":
    run_pipeline()
