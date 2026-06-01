/**
 * Returns a CSS HSL color string corresponding to a normalized valuation oscillator score
 * ranging from -2 (Extreme Overvalued / Red) to +2 (Extreme Undervalued / Green).
 */
export function getValuationColor(value: number): string {
  // Clamp value between -2 and 2
  const clamped = Math.max(-2, Math.min(2, value));
  
  let h = 45; // Default neutral yellow
  const s = 85;
  const l = 50;

  if (clamped <= 0) {
    // Interpolate between Red (-2) and Yellow (0)
    // Red maps to H = -10 (or 350) and Yellow maps to H = 45
    const t = (clamped + 2) / 2; // 0 to 1
    h = -10 + t * 55;
    if (h < 0) {
      h += 360;
    }
  } else {
    // Interpolate between Yellow (0) and Green (+2)
    // Yellow maps to H = 45 and Green maps to H = 145
    const t = clamped / 2; // 0 to 1
    h = 45 + t * 100;
  }

  return `hsl(${Math.round(h)}, ${s}%, ${l}%)`;
}

/**
 * Returns a hexadecimal representation of the HSL color for SVG/Canvas usage
 */
export function valuationToHex(value: number): string {
  const clamped = Math.max(-2, Math.min(2, value));
  let h = 45;
  if (clamped <= 0) {
    const t = (clamped + 2) / 2;
    h = -10 + t * 55;
    if (h < 0) h += 360;
  } else {
    const t = clamped / 2;
    h = 45 + t * 100;
  }
  
  // Convert HSL to Hex
  const s = 85 / 100;
  const l = 50 / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  const toHex = (val: number) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
