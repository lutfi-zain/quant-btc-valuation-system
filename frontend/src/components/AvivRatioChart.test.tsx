import { test, expect, describe } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { AvivRatioChart } from './AvivRatioChart';

describe('AvivRatioChart Component', () => {
  test('renders loading state initially', () => {
    // Mock fetch to prevent state updates after test completes
    // @ts-ignore
    globalThis.fetch = () => new Promise(() => {});
    render(<AvivRatioChart />);
    const loadingText = screen.getByText(/Loading Playground.../i);
    expect(loadingText).toBeDefined();
  });
});
