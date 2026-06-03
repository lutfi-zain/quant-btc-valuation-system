import React, { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode, AreaSeries, PriceScaleMode } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { CompositeDataPoint } from '../types/metrics';

interface CompositeChartProps {
  data: CompositeDataPoint[];
  loading?: boolean;
}

export const CompositeChart: React.FC<CompositeChartProps> = ({ data, loading }) => {
  const btcContainerRef = useRef<HTMLDivElement>(null);
  const oscContainerRef = useRef<HTMLDivElement>(null);
  
  const [isLogScale, setIsLogScale] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (isMaximized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMaximized]);

  const exportToPng = () => {
    if (!btcContainerRef.current || !oscContainerRef.current) return;

    const btcContainer = btcContainerRef.current;
    const oscContainer = oscContainerRef.current;

    const btcRect = btcContainer.getBoundingClientRect();
    const oscRect = oscContainer.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(btcRect.width, oscRect.width);
    const panelGap = 16;
    const footerHeight = 40;
    const height = btcRect.height + oscRect.height + panelGap + footerHeight;

    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = width * dpr;
    mergedCanvas.height = height * dpr;

    const ctx = mergedCanvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // Draw background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const drawCanvases = (container: HTMLDivElement, offsetY: number) => {
      const canvases = container.querySelectorAll('canvas');
      const containerRect = container.getBoundingClientRect();
      canvases.forEach(canvas => {
        const rect = canvas.getBoundingClientRect();
        const x = rect.left - containerRect.left;
        const y = rect.top - containerRect.top + offsetY;
        ctx.drawImage(canvas, x, y, rect.width, rect.height);
      });
    };

    drawCanvases(btcContainer, 10);
    const oscOffsetY = btcRect.height + panelGap + 10;
    drawCanvases(oscContainer, oscOffsetY);

    // Bottom watermark
    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('QUANT BTC VALUATION SYSTEM // MASTER.COMPOSITE.OSCILLATOR', 16, height - 16);

    const dateStr = new Date().toISOString().substring(0, 10);
    ctx.textAlign = 'right';
    ctx.fillText(`DATE: ${dateStr}`, width - 16, height - 16);

    const dataUrl = mergedCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `btc-composite-oscillator-${dateStr}.png`;
    link.href = dataUrl;
    link.click();
  };

  const chartBtcRef = useRef<IChartApi | null>(null);
  const chartOscRef = useRef<IChartApi | null>(null);
  const btcSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const oscSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const filteredData = data.filter(d => d.date >= '2016-01-01').sort((a, b) => a.date.localeCompare(b.date));
  const latestScore = filteredData[filteredData.length - 1]?.composite_value;

  useEffect(() => {
    if (loading || filteredData.length === 0) return;
    if (!btcContainerRef.current || !oscContainerRef.current) return;

    // 1. BTC Price Chart (Top Panel)
    const chartBtc = createChart(btcContainerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#888888' },
      grid: { vertLines: { color: '#1e293b', style: 1 }, horzLines: { color: '#1e293b', style: 1 } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#555555' }, horzLine: { color: '#555555' } },
      rightPriceScale: { 
        borderColor: '#1e293b', 
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: isLogScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
        minimumWidth: 90,
      },
      timeScale: { borderColor: '#1e293b', visible: false }, // Hide top panel timescale completely
      width: btcContainerRef.current.clientWidth || 600,
      height: 240,
    });

    const btcSeries = chartBtc.addSeries(AreaSeries, {
      lineColor: '#ededed',
      topColor: 'rgba(237, 237, 237, 0.2)',
      bottomColor: 'rgba(237, 237, 237, 0.0)',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
    });

    chartBtcRef.current = chartBtc;
    btcSeriesRef.current = btcSeries;

    // 2. Composite Oscillator Chart (Bottom Panel)
    const chartOsc = createChart(oscContainerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#888888' },
      grid: { vertLines: { color: '#1e293b', style: 1 }, horzLines: { color: '#1e293b', style: 1 } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#555555' }, horzLine: { color: '#555555' } },
      rightPriceScale: { 
        borderColor: '#1e293b', 
        scaleMargins: { top: 0.1, bottom: 0.1 },
        minimumWidth: 90,
      },
      timeScale: { borderColor: '#1e293b', visible: true, timeVisible: false }, // Show bottom panel timescale
      width: oscContainerRef.current.clientWidth || 600,
      height: 180,
    });

    const oscSeries = chartOsc.addSeries(AreaSeries, {
      lineColor: '#3b82f6',
      topColor: 'rgba(59, 130, 246, 0.2)',
      bottomColor: 'rgba(59, 130, 246, 0.0)',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
    });

    // Reference lines on oscillator panel
    oscSeries.createPriceLine({ price: 2.0, color: '#10b981', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Undervalued (+2)' });
    oscSeries.createPriceLine({ price: 1.0, color: '#34d399', lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
    oscSeries.createPriceLine({ price: 0, color: '#475569', lineWidth: 1, lineStyle: 2 });
    oscSeries.createPriceLine({ price: -1.0, color: '#fb7185', lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
    oscSeries.createPriceLine({ price: -2.0, color: '#f43f5e', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Bubble (-2)' });

    chartOscRef.current = chartOsc;
    oscSeriesRef.current = oscSeries;

    // Sync logical ranges
    const charts = [chartBtc, chartOsc];
    let isSyncing = false;
    charts.forEach(c => {
      c.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range && !isSyncing) {
          isSyncing = true;
          charts.forEach(otherChart => {
            if (otherChart !== c) {
              otherChart.timeScale().setVisibleLogicalRange(range);
            }
          });
          isSyncing = false;
        }
      });
    });

    // Filter data to only include dates where BOTH BTC price and Composite Value are valid
    // to prevent alignment drift (misaligned bars) in lightweight-charts
    const alignedData = filteredData.filter(d => 
      d.btc_price !== null && 
      d.btc_price > 0 && 
      d.composite_value !== null && 
      d.composite_value !== undefined &&
      !isNaN(d.composite_value)
    );

    // Populate series data
    const btcPoints = alignedData.map(d => ({
      time: d.date.substring(0, 10),
      value: d.btc_price!
    }));
    btcSeries.setData(btcPoints);

    const oscPoints = alignedData.map(d => ({
      time: d.date.substring(0, 10),
      value: d.composite_value
    }));
    oscSeries.setData(oscPoints);

    // Sync crosshairs
    chartBtc.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        chartOsc.clearCrosshairPosition();
        return;
      }
      const item = alignedData.find(d => d.date.substring(0, 10) === param.time);
      if (item) {
        chartOsc.setCrosshairPosition(item.composite_value, param.time, oscSeries);
      }
    });

    chartOsc.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        chartBtc.clearCrosshairPosition();
        return;
      }
      const item = alignedData.find(d => d.date.substring(0, 10) === param.time);
      if (item && item.btc_price) {
        chartBtc.setCrosshairPosition(item.btc_price, param.time, btcSeries);
      }
    });

    // ResizeObserver to handle initial width layout computation dynamically
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.target.clientWidth;
        const height = entry.target.clientHeight;
        if (width === 0) continue;
        if (entry.target === btcContainerRef.current && chartBtcRef.current) {
          chartBtcRef.current.resize(width, height || 240);
        }
        if (entry.target === oscContainerRef.current && chartOscRef.current) {
          chartOscRef.current.resize(width, height || 180);
        }
      }
    });

    if (btcContainerRef.current) resizeObserver.observe(btcContainerRef.current);
    if (oscContainerRef.current) resizeObserver.observe(oscContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chartBtc.remove();
      chartOsc.remove();
      chartBtcRef.current = null;
      chartOscRef.current = null;
    };
  }, [loading, filteredData.length, isLogScale]);

  if (loading) {
    return (
      <div className="chart-placeholder loading">
        <div className="skeleton-loader text">LOADING.COMPOSITE.VALUATION.CHART...</div>
        <div className="skeleton-loader chart"></div>
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="chart-placeholder error">
        NO_COMPOSITE_DATA_AVAILABLE
      </div>
    );
  }

  return (
    <div className={`composite-chart-card ${isMaximized ? 'maximized' : ''}`}>
      <div className="card-header">
        <div className="card-title-group">
          <h2>MASTER.COMPOSITE.OSCILLATOR</h2>
          <span className="card-subtitle">Aggregate Bitcoin cycle oscillator score across all 17 indicators (since 2016)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => setIsLogScale(!isLogScale)}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-secondary)',
              padding: '0.4rem 0.8rem',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              borderRadius: '2px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
          >
            SCALE: {isLogScale ? 'LOG' : 'LINEAR'}
          </button>
          
          <button 
            onClick={exportToPng}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-secondary)',
              padding: '0.4rem 0.8rem',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              borderRadius: '2px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
          >
            📸 SAVE PNG
          </button>

          <button 
            onClick={() => setIsMaximized(!isMaximized)}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-secondary)',
              padding: '0.4rem 0.8rem',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              borderRadius: '2px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
          >
            {isMaximized ? '🗗 MINIMIZE' : '🗖 MAXIMIZE'}
          </button>

          <div className="composite-badge-info">
            Latest Score: <span className="score-val" style={{ color: latestScore !== undefined && latestScore > 1 ? 'var(--accent-emerald)' : latestScore !== undefined && latestScore < -1 ? 'var(--accent-rose)' : 'var(--accent-amber)' }}>{latestScore !== undefined ? latestScore.toFixed(2) : 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="chart-wrapper sub-panels" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="panel btc-panel" style={{ position: 'relative', height: '240px', backgroundColor: 'var(--bg-base)' }}>
          <div className="tv-legend" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', pointerEvents: 'none' }}>BTC PRICE (USD)</div>
          <div ref={btcContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
        
        <div className="panel oscillator-panel" style={{ position: 'relative', height: '180px', backgroundColor: 'var(--bg-base)' }}>
          <div className="tv-legend" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', pointerEvents: 'none' }}>COMPOSITE OSCILLATOR</div>
          <div ref={oscContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  );
};
