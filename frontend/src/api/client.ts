import type { MetricSummary, MetricDataPoint, CompositeDataPoint, MetricConfig, BtcOhlcData, AuditSummary } from '../types/metrics';

const API_BASE = '/api';

export async function fetchAuditSummary(): Promise<AuditSummary> {
  const res = await fetch(`${API_BASE}/audit/summary`);
  if (!res.ok) throw new Error('Failed to fetch statistical audit summary');
  return res.json();
}

export async function fetchMetrics(): Promise<MetricSummary[]> {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics summary list');
  return res.json();
}

export async function fetchMetricData(name: string): Promise<MetricDataPoint[]> {
  const res = await fetch(`${API_BASE}/metrics/${name}`);
  if (!res.ok) throw new Error(`Failed to fetch metric data for '${name}'`);
  return res.json();
}

export async function fetchComposite(start?: string, end?: string): Promise<CompositeDataPoint[]> {
  let url = `${API_BASE}/composite`;
  const params = new URLSearchParams();
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch composite valuation metrics');
  return res.json();
}

export async function fetchMetricConfigs(): Promise<MetricConfig[]> {
  const res = await fetch(`${API_BASE}/metrics/configs`);
  if (!res.ok) throw new Error('Failed to fetch metrics configurations');
  return res.json();
}

export async function fetchBtcOhlc(): Promise<BtcOhlcData[]> {
  const res = await fetch(`${API_BASE}/metrics/btc_ohlc`);
  if (!res.ok) throw new Error('Failed to fetch BTC OHLC historical data');
  return res.json();
}

export async function runPipeline(metric?: string | null, rebuild?: boolean): Promise<{ success: boolean; run_all: string; audit: string }> {
  const res = await fetch(`${API_BASE}/pipeline/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metric, rebuild })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to execute data pipeline');
  }
  return res.json();
}

export async function renormalizeMetric(metricName: string): Promise<{ success: boolean; metric_name: string; rows_updated: number }> {
  const res = await fetch(`${API_BASE}/metrics/renormalize/${metricName}`, {
    method: 'POST'
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to renormalize metric '${metricName}'`);
  }
  return res.json();
}

export async function fetchMetricConfigDefaults(): Promise<MetricConfig[]> {
  const res = await fetch(`${API_BASE}/metrics/config/defaults`);
  if (!res.ok) throw new Error('Failed to fetch default metric configurations');
  return res.json();
}

export async function saveMetricConfig(config: MetricConfig): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/metrics/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to save metric configuration');
  }
  return res.json();
}
