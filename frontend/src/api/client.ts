import { MetricSummary, MetricDataPoint, CompositeDataPoint, MetricConfig } from '../types/metrics';

const API_BASE = '/api';

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
