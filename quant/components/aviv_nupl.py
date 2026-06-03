import pandas as pd
from quant.components.base import BaseComponent
from quant.components.bitview_client import fetch_series
from quant.components.normalization import normalize_metric

class AvivNuplComponent(BaseComponent):
    METRIC_NAME = "aviv_nupl"
    DESCRIPTION = "AVIV NUPL"
    CATEGORY = "fundamental"

    def fetch_data(self, full_rebuild: bool = False) -> pd.DataFrame:
        start_date = None if full_rebuild else self.get_latest_date()
        
        df_tmm = fetch_series("true_market_mean", start_date=start_date)
        df_p = fetch_series("price", start_date=start_date)
        
        if df_tmm.empty or df_p.empty:
            return pd.DataFrame()
            
        # Merge true_market_mean and price
        df = pd.merge(df_tmm, df_p, on="date", suffixes=("_tmm", "_p"))
        
        # Drop rows where values are <= 0 or None
        df = df.dropna(subset=["value_tmm", "value_p"])
        df = df[(df["value_tmm"] > 0) & (df["value_p"] > 0)]
        return df

    def normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        df["raw_value"] = (df["value_p"] - df["value_tmm"]) / df["value_p"]
        df["btc_price"] = df["value_p"]
        
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
    
    parser = argparse.ArgumentParser(description=f"Run {AvivNuplComponent.METRIC_NAME} pipeline")
    parser.add_argument("--rebuild", action="store_true", help="Trigger full rebuild")
    args = parser.parse_args()
    
    comp = AvivNuplComponent()
    res = comp.run_pipeline(full_rebuild=args.rebuild)
    print(json.dumps(res, indent=2))
