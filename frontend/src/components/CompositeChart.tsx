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
        mode: isLogScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal
      },
      timeScale: { borderColor: '#1e293b', timeVisible: false },
      width: btcContainerRef.current.clientWidth,
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
        scaleMargins: { top: 0.1, bottom: 0.1 } 
      },
      timeScale: { borderColor: '#1e293b', timeVisible: false },
      width: oscContainerRef.current.clientWidth,
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
    oscSeries.createPriceLine({ price: 2.0, color: '#f43f5e', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Bubble (+2)' });
    oscSeries.createPriceLine({ price: 1.0, color: '#fb7185', lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
    oscSeries.createPriceLine({ price: 0, color: '#475569', lineWidth: 1, lineStyle: 2 });
    oscSeries.createPriceLine({ price: -1.0, color: '#34d399', lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
    oscSeries.createPriceLine({ price: -2.0, color: '#10b981', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Undervalued (-2)' });

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

    // Populate series data
    const btcPoints = filteredData
      .filter(d => d.btc_price !== null && d.btc_price > 0)
      .map(d => ({
        time: d.date.substring(0, 10),
        value: d.btc_price!
      }));
    btcSeries.setData(btcPoints);

    const oscPoints = filteredData.map(d => ({
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
      const item = filteredData.find(d => d.date.substring(0, 10) === param.time);
      if (item) {
        chartOsc.setCrosshairPosition(item.composite_value, param.time, oscSeries);
      }
    });

    chartOsc.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        chartBtc.clearCrosshairPosition();
        return;
      }
      const item = filteredData.find(d => d.date.substring(0, 10) === param.time);
      if (item && item.btc_price) {
        chartBtc.setCrosshairPosition(item.btc_price, param.time, btcSeries);
      }
    });

    const handleResize = () => {
      if (btcContainerRef.current && chartBtcRef.current) {
        chartBtcRef.current.applyOptions({ width: btcContainerRef.current.clientWidth });
      }
      if (oscContainerRef.current && chartOscRef.current) {
        chartOscRef.current.applyOptions({ width: oscContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
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
    <div className="composite-chart-card">
      <div className="card-header">
        <div className="card-title-group">
          <h2>MASTER.COMPOSITE.OSCILLATOR</h2>
          <span className="card-subtitle">Aggregate Bitcoin cycle oscillator score across all 17 indicators (since 2016)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
