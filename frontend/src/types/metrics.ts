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

