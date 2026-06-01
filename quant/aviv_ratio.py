import sqlite3
import statistics
import requests
import os
import math
from datetime import datetime, timedelta
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from database.db import init_db, insert_metric



def fetch_aviv_data():
    """
    Fetch True Market Mean Price (cointime_price) and spot Price from bitview.space API,
    and compute the correct AVIV Ratio = Price / True Market Mean Price.
    Returns a list of dicts: [{'date': 'YYYY-MM-DD', 'aviv_ratio': float, 'btc_price': float}]
    """
    cp_url = "https://bitview.space/api/series/cointime_price/day1/data"
    price_url = "https://bitview.space/api/series/price/day1/data"
    
    print(f"Fetching cointime_price from {cp_url}...")
    cp_resp = requests.get(cp_url)
    cp_resp.raise_for_status()
    cp_data = cp_resp.json()
    
    print(f"Fetching spot price from {price_url}...")
    price_resp = requests.get(price_url)
    price_resp.raise_for_status()
    price_data = price_resp.json()
    
    start_date = datetime(2009, 1, 3)
    results = []
    
    limit = min(len(cp_data), len(price_data))
    for i in range(limit):
        cp_val = cp_data[i]
        p_val = price_data[i]
        
        current_date = start_date + timedelta(days=i)
        
        if cp_val is None or p_val is None or cp_val <= 0:
            continue
            
        aviv_val = float(p_val) / float(cp_val)
        
        results.append({
            "date": current_date.strftime("%Y-%m-%dT00:00:00Z"),
            "aviv_ratio": aviv_val,
            "btc_price": float(p_val)
        })
        
    return results

def normalize_aviv(data):
    """
    Calculate Z-score and bound between -2 and +2.
    """
    if not data:
        return []
        
    aviv_values = [d['aviv_ratio'] for d in data]
    mean = statistics.mean(aviv_values)
    
    if len(aviv_values) > 1:
        std = statistics.stdev(aviv_values)
    else:
        std = 0.0
    
    for d in data:
        if std == 0:
            normalized = 0.0
        else:
            normalized = (d['aviv_ratio'] - mean) / std
            
        # Unclamped all-time Z-Score
        d['normalized_value'] = normalized
        
    return data

def insert_to_db(normalized_data):
    for row in normalized_data:
        insert_metric(
            date=row['date'],
            metric_name='aviv_ratio',
            raw_value=row['aviv_ratio'],
            normalized_value=row['normalized_value'],
            btc_price=row['btc_price']
        )

def run_pipeline():
    init_db()
    raw_data = fetch_aviv_data()
    normalized = normalize_aviv(raw_data)
    insert_to_db(normalized)

if __name__ == "__main__":
    run_pipeline()
    print("AVIV Ratio pipeline executed successfully.")
