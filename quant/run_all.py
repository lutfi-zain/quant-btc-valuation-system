import argparse
import logging
import sys
from quant.components.registry import discover_components

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_all(db_path: str = "database/metrics.db", rebuild: bool = False) -> list[dict]:
    """Runs all registered component pipelines sequentially with exception isolation."""
    component_classes = discover_components()
    logger.info(f"Running data pipeline for {len(component_classes)} discovered components on database '{db_path}' (rebuild={rebuild})...")
    
    results = []
    
    for comp_class in component_classes:
        logger.info(f"Starting pipeline for '{comp_class.METRIC_NAME}'...")
        try:
            # Instantiate component with custom db path
            comp = comp_class(db_path=db_path)
            res = comp.run_pipeline(full_rebuild=rebuild)
            results.append(res)
        except Exception as e:
            logger.error(f"Critical exception in pipeline '{comp_class.METRIC_NAME}': {type(e).__name__}: {str(e)}")
            results.append({
                "metric_name": comp_class.METRIC_NAME,
                "rows_fetched": 0,
                "rows_stored": 0,
                "status": "error",
                "message": f"Exception: {type(e).__name__}: {str(e)}"
            })
            
    return results

def print_summary(results: list[dict]):
    """Prints a neat text summary table of the pipeline runs."""
    print("\n" + "=" * 90)
    print(f"{'PIPELINE RUN SUMMARY':^90}")
    print("=" * 90)
    print(f"{'Metric Name':<25} | {'Status':<8} | {'Fetched':<8} | {'Stored':<8} | {'Message':<30}")
    print("-" * 90)
    
    success_count = 0
    for res in results:
        name = res.get("metric_name", "unknown")
        status = res.get("status", "error").upper()
        fetched = res.get("rows_fetched", 0)
        stored = res.get("rows_stored", 0)
        msg = res.get("message", "")[:30]
        
        if status == "SUCCESS":
            success_count += 1
            
        print(f"{name:<25} | {status:<8} | {fetched:<8} | {stored:<8} | {msg:<30}")
        
    print("=" * 90)
    print(f"Total: {success_count}/{len(results)} pipelines completed successfully.")
    print("=" * 90 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run BTC Cycle Valuation System data pipelines")
    parser.add_argument("--rebuild", action="store_true", help="Trigger a full historical rebuild of all metrics")
    parser.add_argument("--db-path", default="database/metrics.db", help="Path to the SQLite database file")
    args = parser.parse_args()
    
    results = run_all(db_path=args.db_path, rebuild=args.rebuild)
    print_summary(results)
    
    # Exit with code 1 if any pipeline failed
    any_failed = any(res.get("status") == "error" for res in results)
    if any_failed:
        sys.exit(1)
    sys.exit(0)
