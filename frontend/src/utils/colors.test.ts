import { test, expect, describe } from 'bun:test';
import { getValuationColor, valuationToHex } from './colors';

describe('colors utility', () => {
  test('getValuationColor maps values correctly', () => {
    // Extreme undervalued (+2) -> emerald green
    expect(getValuationColor(2)).toBe('hsl(145, 85%, 50%)');
    // Extreme overvalued (-2) -> crimson red
    expect(getValuationColor(-2)).toBe('hsl(350, 85%, 50%)');
    // Neutral (0) -> yellow
    expect(getValuationColor(0)).toBe('hsl(45, 85%, 50%)');
  });

  test('valuationToHex converts HSL to hex correctly', () => {
    expect(valuationToHex(0)).toBe('#ecb613'); // HSL(45, 85%, 50%) -> #ecb613
  });
});
