import { test, expect, describe } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { MetricCard } from './MetricCard';
import { MetricSummary } from '../types/metrics';

const mockMetric: MetricSummary = {
  name: 'aviv_ratio',
  date: '2026-06-01T00:00:00Z',
  raw_value: 1.5,
  normalized_value: 0.5,
  category: 'fundamental'
};

const mockSparkline = [
  { date: '2026-05-31', value: 0.4 },
  { date: '2026-06-01', value: 0.5 }
];

describe('MetricCard Component', () => {
  test('renders metric metadata and value', () => {
    // Mock ResizeObserver which is used inside Recharts but not defined in happy-dom environment
    // @ts-ignore
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    render(
      <MetricCard 
        metric={mockMetric} 
        sparklineData={mockSparkline} 
        isActive={false} 
        onClick={() => {}} 
      />
    );
    
    // Check metric name renders
    expect(screen.getByText('AVIV_RATIO')).toBeDefined();
    // Check raw value renders
    expect(screen.getByText('1.5000')).toBeDefined();
    // Check score badge renders
    expect(screen.getByText('0.50')).toBeDefined();
  });
});
