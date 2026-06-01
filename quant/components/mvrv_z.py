import pandas as pd
from quant.components.base import BaseComponent
from quant.components.bitview_client import fetch_series
from quant.components.normalization import normalize_metric

class MvrvZComponent(BaseComponent):
    METRIC_NAME = "mvrv_z"
    DESCRIPTION = "MVRV Z-Score"
    CATEGORY = "fundamental"

    def fetch_data(self, full_rebuild: bool = False) -> pd.DataFrame:
        # Fetch full history to compute standard deviation correctly
        df_mc = fetch_series("market_cap")
        df_rc = fetch_series("realized_cap")
        df_p = fetch_series("price")
        
        if df_mc.empty or df_rc.empty or df_p.empty:
            return pd.DataFrame()
            
        df = pd.merge(df_mc, df_rc, on="date", suffixes=("_mc", "_rc"))
        df = pd.merge(df, df_p, on="date")
        df = df.rename(columns={"value": "value_price"})
        
        df = df.dropna(subset=["value_mc", "value_rc", "value_price"])
        df = df.sort_values("date").reset_index(drop=True)
        
        if df.empty:
            return pd.DataFrame()
            
        # Compute standard deviation of market cap
        std_mc = df["value_mc"].std()
        
        # Compute MVRV Z-Score: (MC - RC) / StdDev(MC)
        if std_mc > 0:
            df["raw_value"] = (df["value_mc"] - df["value_rc"]) / std_mc
        else:
            df["raw_value"] = 0.0
            
        df["btc_price"] = df["value_price"]
        
        # Filter for delta if not full_rebuild
        if not full_rebuild:
            start_date = self.get_latest_date()
            if start_date:
                df = df[df["date"] > start_date]
                
        return df

    def normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        df["normalized_value"] = df["raw_value"].apply(
            lambda val: normalize_metric(self.db_path, self.METRIC_NAME, val)
        )
        return df

    def store(self, df: pd.DataFrame) -> int:
        return self._default_store(df)

    def run_pipeline(self, full_rebuild: bool = False) -> dict:
        return self._default_run_pipeline(full_rebuild=full_rebuild)

if __name__ == "__main__":
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description=f"Run {MvrvZComponent.METRIC_NAME} pipeline")
    parser.add_argument("--rebuild", action="store_true", help="Trigger full rebuild")
    args = parser.parse_args()
    
    comp = MvrvZComponent()
    res = comp.run_pipeline(full_rebuild=args.rebuild)
    print(json.dumps(res, indent=2))
