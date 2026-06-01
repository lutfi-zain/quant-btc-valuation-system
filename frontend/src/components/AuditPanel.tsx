import React, { useEffect, useRef, useState } from 'react';
import { fetchAuditSummary, fetchComposite } from '../api/client';
import type { AuditSummary, IndicatorStat, CompositeDataPoint } from '../types/metrics';

export const AuditPanel: React.FC = () => {
  const [auditData, setAuditData] = useState<AuditSummary | null>(null);
  const [compositeData, setCompositeData] = useState<CompositeDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const histogramCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; val: number; metricA: string; metricB: string } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [audit, composite] = await Promise.all([
          fetchAuditSummary(),
          fetchComposite()
        ]);
        setAuditData(audit);
        setCompositeData(composite);
      } catch (err: any) {
        console.error('Failed to fetch audit data:', err);
        setError(err?.message || 'Failed to load statistical audit.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Determine calibration status helper
  const getCalibrationStatus = (stat: IndicatorStat) => {
    const { pct_at_plus2, pct_at_minus2, count } = stat;
    if (count < 30) {
      return { status: 'well_calibrated', label: 'INSUFFICIENT_DATA', color: 'var(--text-secondary)' };
    }
    
    // We look at the maximum boundary saturation
    const maxSat = Math.max(pct_at_plus2, pct_at_minus2);
    
    if (pct_at_plus2 < 0.002 || pct_at_minus2 < 0.002) {
      return { 
        status: 'over_conservative', 
        label: 'OVER_CONSERVATIVE', 
        color: 'var(--accent-amber)',
        desc: 'Thresholds too wide (never reached)' 
      };
    } else if (maxSat > 0.10) {
      return { 
        status: 'under_conservative', 
        label: 'UNDER_CONSERVATIVE', 
        color: 'var(--accent-rose)',
        desc: 'Thresholds too narrow (excessive saturation)' 
      };
    } else {
      return { 
        status: 'well_calibrated', 
        label: 'WELL_CALIBRATED', 
        color: 'var(--accent-emerald)',
        desc: 'Thresholds aligned with historical extremes'
      };
    }
  };

  // Render Heatmap using canvas
  useEffect(() => {
    if (!auditData || !heatmapCanvasRef.current) return;
    
    const canvas = heatmapCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // List of unique metrics in the correlations
    const metricsSet = new Set<string>();
    auditData.indicator_stats.forEach(s => metricsSet.add(s.metric_name));
    const metricsList = Array.from(metricsSet).sort();
    const numMetrics = metricsList.length;
    
    if (numMetrics === 0) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const size = canvas.width;
    const labelArea = 120; // space left and top for labels
    const gridArea = size - labelArea;
    const cellSize = gridArea / numMetrics;
    
    // Draw cells
    for (let i = 0; i < numMetrics; i++) {
      for (let j = 0; j < numMetrics; j++) {
        const metricA = metricsList[i];
        const metricB = metricsList[j];
        
        let val = 0;
        if (i === j) {
          val = 1.0;
        } else {
          // Find correlation in matrix
          const corr = auditData.correlations.find(
            c => (c.metric_a === metricA && c.metric_b === metricB) ||
                 (c.metric_a === metricB && c.metric_b === metricA)
          );
          val = corr ? corr.pearson : 0;
        }
        
        const cellX = labelArea + j * cellSize;
        const cellY = labelArea + i * cellSize;
        
        // Color scale: -1 (Rose) to 0 (Grey) to +1 (Blue/Cyan)
        let fillColor = '#1a1a1a';
        if (val > 0) {
          fillColor = `rgba(0, 112, 243, ${val})`; // Blue
        } else if (val < 0) {
          fillColor = `rgba(244, 63, 94, ${Math.abs(val)})`; // Rose
        }
        
        ctx.fillStyle = fillColor;
        ctx.fillRect(cellX, cellY, cellSize - 1, cellSize - 1);
        
        // Highlights for highly correlated pairs
        if (i !== j && Math.abs(val) > 0.85) {
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cellX + 1, cellY + 1, cellSize - 3, cellSize - 3);
        }
      }
    }
    
    // Draw labels
    ctx.fillStyle = '#ededed';
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < numMetrics; i++) {
      // Y-axis label
      const name = metricsList[i].replace(/_/g, '.').toUpperCase();
      ctx.fillStyle = '#ededed';
      ctx.fillText(name, labelArea - 5, labelArea + i * cellSize + cellSize / 2);
      
      // X-axis label (rotated)
      ctx.save();
      ctx.translate(labelArea + i * cellSize + cellSize / 2, labelArea - 5);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = 'left';
      ctx.fillText(name, 0, 0);
      ctx.restore();
    }
    
  }, [auditData]);

  // Render Histogram using canvas
  useEffect(() => {
    if (!auditData || compositeData.length === 0 || !histogramCanvasRef.current) return;
    
    const canvas = histogramCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const w = canvas.width;
    const h = canvas.height;
    
    // Extract raw and rescaled composite series
    const raws: number[] = [];
    const rescaled: number[] = [];
    
    compositeData.forEach(d => {
      if (d.raw_composite_value !== undefined) {
        raws.push(d.raw_composite_value);
      }
      rescaled.push(d.composite_value);
    });
    
    if (raws.length === 0) {
      // If raw_composite_value isn't populated (e.g. initial run before migration), copy composite values
      raws.push(...rescaled);
    }
    
    // Create bins from -2.5 to +2.5
    const numBins = 40;
    const minRange = -2.5;
    const maxRange = 2.5;
    const binWidth = (maxRange - minRange) / numBins;
    
    const rawBins = new Array(numBins).fill(0);
    const rescaledBins = new Array(numBins).fill(0);
    
    raws.forEach(val => {
      const idx = Math.floor((val - minRange) / binWidth);
      if (idx >= 0 && idx < numBins) rawBins[idx]++;
    });
    
    rescaled.forEach(val => {
      const idx = Math.floor((val - minRange) / binWidth);
      if (idx >= 0 && idx < numBins) rescaledBins[idx]++;
    });
    
    const maxFreq = Math.max(...rawBins, ...rescaledBins, 1);
    
    const chartYOffset = 30;
    const chartXOffset = 40;
    const chartW = w - chartXOffset - 20;
    const chartH = h - chartYOffset - 30;
    
    // Draw grid lines
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const gridY = chartYOffset + chartH * (i / 5);
      ctx.beginPath();
      ctx.moveTo(chartXOffset, gridY);
      ctx.lineTo(chartXOffset + chartW, gridY);
      ctx.stroke();
    }
    
    // Draw vertical guidelines for oscillator bounds
    const valueToX = (val: number) => {
      const pct = (val - minRange) / (maxRange - minRange);
      return chartXOffset + pct * chartW;
    };
    
    [-2, 0, 2].forEach(v => {
      const lineX = valueToX(v);
      ctx.strokeStyle = v === 0 ? '#444444' : 'rgba(244, 63, 94, 0.4)';
      ctx.setLineDash(v === 0 ? [] : [4, 4]);
      ctx.beginPath();
      ctx.moveTo(lineX, chartYOffset);
      ctx.lineTo(lineX, chartYOffset + chartH);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // X-Label
      ctx.fillStyle = '#888888';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(v === 0 ? '0.0 (MID)' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`, lineX, chartYOffset + chartH + 15);
    });
    
    // Draw histograms as overlay polygons or bars
    const barW = chartW / numBins;
    
    // 1. Raw composite (Rose/Amber)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    for (let i = 0; i < numBins; i++) {
      const freq = rawBins[i];
      const barH = (freq / maxFreq) * chartH;
      const x = chartXOffset + i * barW;
      const y = chartYOffset + chartH - barH;
      
      ctx.fillRect(x, y, barW - 1, barH);
      ctx.strokeRect(x, y, barW - 1, barH);
    }
    
    // 2. Rescaled composite (Emerald/Cyan)
    ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < numBins; i++) {
      const freq = rescaledBins[i];
      const barH = (freq / maxFreq) * chartH;
      const x = chartXOffset + i * barW + barW / 2;
      const y = chartYOffset + chartH - barH;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    // Also close path to bottom for filling
    ctx.lineTo(chartXOffset + chartW - barW/2, chartYOffset + chartH);
    ctx.lineTo(chartXOffset + barW/2, chartYOffset + chartH);
    ctx.fill();
    
    // Draw rescaled stroke line
    ctx.beginPath();
    for (let i = 0; i < numBins; i++) {
      const freq = rescaledBins[i];
      const barH = (freq / maxFreq) * chartH;
      const x = chartXOffset + i * barW + barW / 2;
      const y = chartYOffset + chartH - barH;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Draw Y-Axis legend
    ctx.fillStyle = '#888888';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('MAX', chartXOffset - 5, chartYOffset);
    ctx.fillText('MIN', chartXOffset - 5, chartYOffset + chartH);
    
  }, [auditData, compositeData]);

  // Handle Heatmap Canvas Hover/Mouse Move
  const handleHeatmapMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!auditData || !heatmapCanvasRef.current) return;
    
    const canvas = heatmapCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const labelArea = 120;
    const gridArea = canvas.width - labelArea;
    
    // Check unique metrics
    const metricsSet = new Set<string>();
    auditData.indicator_stats.forEach(s => metricsSet.add(s.metric_name));
    const metricsList = Array.from(metricsSet).sort();
    const numMetrics = metricsList.length;
    
    if (numMetrics === 0) return;
    const cellSize = gridArea / numMetrics;
    
    if (x >= labelArea && y >= labelArea) {
      const cellCol = Math.floor((x - labelArea) / cellSize);
      const cellRow = Math.floor((y - labelArea) / cellSize);
      
      if (cellCol >= 0 && cellCol < numMetrics && cellRow >= 0 && cellRow < numMetrics) {
        const metricA = metricsList[cellRow];
        const metricB = metricsList[cellCol];
        
        let val = 0;
        if (cellRow === cellCol) {
          val = 1.0;
        } else {
          const corr = auditData.correlations.find(
            c => (c.metric_a === metricA && c.metric_b === metricB) ||
                 (c.metric_a === metricB && c.metric_b === metricA)
          );
          val = corr ? corr.pearson : 0;
        }
        
        setHoveredCell({
          x: cellCol,
          y: cellRow,
          val,
          metricA,
          metricB
        });
        setTooltipPos({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top + 15 });
        return;
      }
    }
    setHoveredCell(null);
  };

  const handleHeatmapMouseLeave = () => {
    setHoveredCell(null);
  };

  if (loading) {
    return (
      <div className="audit-loading-panel">
        <div className="spinner"></div>
        <p className="loading-txt">EXECUTING.STATISTICAL.AUDIT.PIPELINE...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="audit-error-panel">
        <span className="error-icon">⚠️</span>
        <h3>AUDIT.RUN_FAILURE</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!auditData) return null;

  return (
    <div className="audit-panel-container">
      <div className="audit-header">
        <h2 className="audit-title">SYSTEM_STATISTICAL_AUDIT</h2>
        <p className="audit-subtitle">
          VALUATION ENGINE CALIBRATION & HISTORICAL INTEGRITY AUDIT • RUN_DATE: {auditData.run_date}
        </p>
      </div>
      
      {/* Rescaling summary row */}
      <div className="audit-params-bento">
        <div className="audit-bento-card highlight">
          <span className="card-label">COMPOSITE.RESCALE.STATUS</span>
          <span className="card-value rescaled">RESCALED_MEAN</span>
          <span className="card-desc">Piecewise linear percentile mapping applied</span>
        </div>
        <div className="audit-bento-card">
          <span className="card-label">HISTORICAL.RAW.RANGE</span>
          <span className="card-value">
            [{auditData.composite_params.raw_min.toFixed(3)}, {auditData.composite_params.raw_max.toFixed(3)}]
          </span>
          <span className="card-desc">Compressed boundary limits prior to calibration</span>
        </div>
        <div className="audit-bento-card">
          <span className="card-label">ANCHOR.PERCENTILES (2.5% • 50% • 97.5%)</span>
          <span className="card-value text-mono">
            {auditData.composite_params.raw_p2_5.toFixed(3)} / {auditData.composite_params.raw_p50.toFixed(3)} / {auditData.composite_params.raw_p97_5.toFixed(3)}
          </span>
          <span className="card-desc">Fitted boundaries mapped directly to [-2.0, 0.0, +2.0]</span>
        </div>
      </div>
      
      <div className="audit-grid-layout">
        {/* Left Side: Distribution Table */}
        <div className="audit-section-card table-section">
          <h3>1. INDICATOR_DISTRIBUTION_AND_CALIBRATION</h3>
          <div className="audit-table-wrapper">
            <table className="audit-stats-table">
              <thead>
                <tr>
                  <th>INDICATOR</th>
                  <th>SAMPLES</th>
                  <th>MEAN</th>
                  <th>STD_DEV</th>
                  <th>SKEWNESS</th>
                  <th>KURTOSIS</th>
                  <th>% AT -2 (TOP)</th>
                  <th>% AT +2 (BOTTOM)</th>
                  <th>CALIBRATION</th>
                </tr>
              </thead>
              <tbody>
                {auditData.indicator_stats.map(stat => {
                  const calibration = getCalibrationStatus(stat);
                  return (
                    <tr key={stat.metric_name}>
                      <td className="metric-name-td">{stat.metric_name.toUpperCase()}</td>
                      <td>{stat.count}</td>
                      <td>{stat.mean.toFixed(2)}</td>
                      <td>{stat.std.toFixed(2)}</td>
                      <td>{stat.skewness.toFixed(2)}</td>
                      <td>{stat.kurtosis.toFixed(2)}</td>
                      <td>{(stat.pct_at_minus2 * 100).toFixed(1)}%</td>
                      <td>{(stat.pct_at_plus2 * 100).toFixed(1)}%</td>
                      <td style={{ color: calibration.color, fontWeight: 'bold' }}>
                        <span className="calibration-badge" style={{ borderColor: calibration.color }}>
                          {calibration.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Right Side: Correlation Matrix & Composite Histogram */}
        <div className="audit-right-column">
          <div className="audit-section-card canvas-section relative">
            <h3>2. INTER_INDICATOR_CORRELATION_MATRIX</h3>
            <p className="section-subtitle">Pearson Correlation Coefficients (Highlight borders: |r| &gt; 0.85)</p>
            <div className="canvas-container">
              <canvas 
                ref={heatmapCanvasRef} 
                width={500} 
                height={500} 
                className="heatmap-canvas"
                onMouseMove={handleHeatmapMouseMove}
                onMouseLeave={handleHeatmapMouseLeave}
              />
              {hoveredCell && (
                <div 
                  className="heatmap-tooltip"
                  style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                  <div className="tooltip-title">{hoveredCell.metricA.toUpperCase()} ⟷ {hoveredCell.metricB.toUpperCase()}</div>
                  <div className="tooltip-value">Correlation (r): {hoveredCell.val.toFixed(4)}</div>
                  {Math.abs(hoveredCell.val) > 0.85 && (
                    <div className="tooltip-badge">HIGHLY_CORRELATED</div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="audit-section-card canvas-section">
            <h3>3. COMPOSITE_RANGE_EXPANSION_HISTOGRAM</h3>
            <p className="section-subtitle">Overlaid frequency distribution: Raw average (Orange) vs Rescaled composite (Cyan)</p>
            <div className="canvas-container">
              <canvas 
                ref={histogramCanvasRef} 
                width={500} 
                height={200} 
                className="histogram-canvas"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
