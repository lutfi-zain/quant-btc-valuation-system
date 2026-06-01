import { test, expect, describe, beforeAll } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { AuditPanel } from './AuditPanel';

const mockAuditSummary = {
  run_date: '2026-06-02',
  composite_params: {
    run_date: '2026-06-02',
    raw_min: -0.86,
    raw_max: 1.2,
    raw_p2_5: -0.8,
    raw_p50: 0.15,
    raw_p97_5: 1.0,
    rescale_method: 'percentile_piecewise'
  },
  indicator_stats: [
    {
      metric_name: 'aviv_ratio',
      count: 1000,
      mean: 0.1,
      std: 0.5,
      skewness: 0.05,
      kurtosis: -0.1,
      p2_5: -1.0,
      p5: -0.8,
      p25: -0.2,
      p50: 0.05,
      p75: 0.4,
      p95: 0.9,
      p97_5: 1.1,
      min_val: -1.5,
      max_val: 1.6,
      pct_at_plus2: 0.02,
      pct_at_minus2: 0.015
    }
  ],
  correlations: [
    {
      metric_a: 'aviv_ratio',
      metric_b: 'mvrv_z',
      pearson: 0.88,
      spearman: 0.86
    }
  ]
};

const mockCompositeData = [
  {
    date: '2026-06-01',
    composite_value: 0.3,
    raw_composite_value: 0.3,
    component_count: 2,
    btc_price: 60000.0
  }
];

describe('AuditPanel Component', () => {
  beforeAll(() => {
    // Mock global fetch
    // @ts-ignore
    globalThis.fetch = (url: string) => {
      if (url.includes('/api/audit/summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAuditSummary)
        });
      }
      if (url.includes('/api/composite')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCompositeData)
        });
      }
      return Promise.reject(new Error('Unknown url: ' + url));
    };
    
    // Mock HTMLCanvasElement.prototype.getContext to return a mock 2d context
    // @ts-ignore
    HTMLCanvasElement.prototype.getContext = (type: string) => {
      if (type === '2d') {
        return {
          clearRect: () => {},
          fillRect: () => {},
          strokeRect: () => {},
          fillText: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          stroke: () => {},
          fill: () => {},
          save: () => {},
          restore: () => {},
          translate: () => {},
          rotate: () => {},
          setLineDash: () => {},
          measureText: () => ({ width: 10 })
        };
      }
      return null;
    };
  });

  test('renders audit params and table data', async () => {
    render(<AuditPanel />);
    
    // Wait for data to load
    const title = await screen.findByText('SYSTEM_STATISTICAL_AUDIT');
    expect(title).toBeDefined();
    
    // Check parameters bento
    expect(await screen.findByText('RESCALED_MEAN')).toBeDefined();
    // Check stats table contains indicators
    const avivElements = await screen.findAllByText(/AVIV_RATIO/);
    expect(avivElements.length).toBeGreaterThan(0);
  });
});
