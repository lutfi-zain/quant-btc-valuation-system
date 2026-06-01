export interface MetricSummary {
  name: string;
  date: string;
  raw_value: number;
  normalized_value: number;
  category: 'fundamental' | 'technical' | 'sentiment' | string;
}

export interface MetricDataPoint {
  date: string;
  raw_value: number;
  normalized_value: number;
  btc_price: number | null;
}

export interface CompositeDataPoint {
  date: string;
  composite_value: number;
  raw_composite_value?: number;
  component_count: number;
  btc_price: number | null;
}

export interface MetricConfig {
  metric_name: string;
  t_minus_2: number | null;
  t_minus_1: number | null;
  t_zero: number | null;
  t_plus_1: number | null;
  t_plus_2: number | null;
}

export interface BtcOhlcData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CompositeParams {
  run_date: string;
  raw_min: number;
  raw_max: number;
  raw_p2_5: number;
  raw_p50: number;
  raw_p97_5: number;
  rescale_method: string;
}

export interface IndicatorStat {
  metric_name: string;
  count: number;
  mean: number;
  std: number;
  skewness: number;
  kurtosis: number;
  p2_5: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  p97_5: number;
  min_val: number;
  max_val: number;
  pct_at_plus2: number;
  pct_at_minus2: number;
}

export interface CorrelationEntry {
  metric_a: string;
  metric_b: string;
  pearson: number;
  spearman: number;
}

export interface AuditSummary {
  run_date: string;
  composite_params: CompositeParams;
  indicator_stats: IndicatorStat[];
  correlations: CorrelationEntry[];
}

