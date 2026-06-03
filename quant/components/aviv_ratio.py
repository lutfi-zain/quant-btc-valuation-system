import pandas as pd
from quant.components.base import BaseComponent
from quant.components.bitview_client import fetch_series
from quant.components.normalization import normalize_metric

class AvivRatioComponent(BaseComponent):
    """
    AVIV (Active-Value-to-Investor-Value) Ratio Component.

    Mathematical formula:
    AVIV Ratio = price / true_market_mean

    The True Market Mean (TMM) is fetched from bitview.space, and represents
    the denominator for the AVIV Z-Score.
    """
    METRIC_NAME = "aviv_ratio"
    DESCRIPTION = "AVIV Ratio-Z"
    CATEGORY = "fundamental"

    def fetch_data(self, full_rebuild: bool = False) -> pd.DataFrame:
        # Fetch full history to compute historical distribution parameters correctly
        df_tmm = fetch_series("true_market_mean")
        df_p = fetch_series("price")
        
        if df_tmm.empty or df_p.empty:
            return pd.DataFrame()
            
        # Merge true_market_mean and price
        df = pd.merge(df_tmm, df_p, on="date", suffixes=("_tmm", "_p"))
        
        # Drop rows where values are <= 0 or None
        df = df.dropna(subset=["value_tmm", "value_p"])
        df = df[(df["value_tmm"] > 0) & (df["value_p"] > 0)]
        df = df.sort_values("date").reset_index(drop=True)
        
        if df.empty:
            return pd.DataFrame()
            
        # Compute raw ratio
        df["ratio"] = df["value_p"] / df["value_tmm"]
        
        # Derive Z-score from the ratio's historical distribution
        mean_ratio = df["ratio"].mean()
        std_ratio = df["ratio"].std()
        
        if std_ratio > 0:
            df["raw_value"] = (df["ratio"] - mean_ratio) / std_ratio
        else:
            df["raw_value"] = 0.0
            
        df["btc_price"] = df["value_p"]
        
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
    
    parser = argparse.ArgumentParser(description=f"Run {AvivRatioComponent.METRIC_NAME} pipeline")
    parser.add_argument("--rebuild", action="store_true", help="Trigger full rebuild")
    args = parser.parse_args()
    
    comp = AvivRatioComponent()
    res = comp.run_pipeline(full_rebuild=args.rebuild)
    print(json.dumps(res, indent=2))
