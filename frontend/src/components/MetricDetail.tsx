import React, { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode, LineSeries, CandlestickSeries, AreaSeries, PriceScaleMode } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { MetricSummary, MetricDataPoint, MetricConfig, BtcOhlcData } from '../types/metrics';
import { valuationToHex } from '../utils/colors';
import { ThresholdEditor } from './ThresholdEditor';

interface MetricDetailProps {
  metric: MetricSummary;
  data: MetricDataPoint[];
  config: MetricConfig | null;
  btcOhlcData: BtcOhlcData[];
  loading: boolean;
  onClose: () => void;
  onRefetchMetric: (name: string) => Promise<void>;
  onRefreshDashboardData: () => Promise<void>;
  refetching: boolean;
}

export const MetricDetail: React.FC<MetricDetailProps> = ({
  metric,
  data,
  config,
  btcOhlcData,
  loading,
  onClose,
  onRefetchMetric,
  onRefreshDashboardData,
  refetching
}) => {
  const btcContainerRef = useRef<HTMLDivElement>(null);
  const rawContainerRef = useRef<HTMLDivElement>(null);
  const oscContainerRef = useRef<HTMLDivElement>(null);
  
  const [isLogScale, setIsLogScale] = useState(true);

  const chartBtcRef = useRef<IChartApi | null>(null);
  const chartRawRef = useRef<IChartApi | null>(null);
  const chartOscRef = useRef<IChartApi | null>(null);

  const btcSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const rawSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const oscSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  // Filter & match data sets from 2016-01-01
  const filteredMetricData = data.filter(d => d.date >= '2016-01-01').sort((a, b) => a.date.localeCompare(b.date));
  const filteredBtcData = btcOhlcData.filter(d => d.date >= '2016-01-01').sort((a, b) => a.date.localeCompare(b.date));

  const btcDates = new Set(filteredBtcData.map(d => d.date.substring(0, 10)));
  const commonMetric = filteredMetricData.filter(d => btcDates.has(d.date.substring(0, 10)));
  const metricDates = new Set(commonMetric.map(d => d.date.substring(0, 10)));
  const commonBtc = filteredBtcData.filter(d => metricDates.has(d.date.substring(0, 10)));

  const color = valuationToHex(metric.normalized_value);



  useEffect(() => {
    if (loading || commonMetric.length === 0 || commonBtc.length === 0) return;
    if (!btcContainerRef.current || !rawContainerRef.current || !oscContainerRef.current) return;

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
      timeScale: { borderColor: '#1e293b', visible: false },
      width: btcContainerRef.current.clientWidth || 600,
      height: 220,
    });

    const btcSeries = chartBtc.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    chartBtcRef.current = chartBtc;
    btcSeriesRef.current = btcSeries;

    // 2. Raw Metric Chart (Middle Panel)
    const chartRaw = createChart(rawContainerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#888888' },
      grid: { vertLines: { color: '#1e293b', style: 1 }, horzLines: { color: '#1e293b', style: 1 } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#555555' }, horzLine: { color: '#555555' } },
      rightPriceScale: { 
        borderColor: '#1e293b', 
        scaleMargins: { top: 0.1, bottom: 0.1 },
        minimumWidth: 90,
      },
      timeScale: { borderColor: '#1e293b', visible: false },
      width: rawContainerRef.current.clientWidth || 600,
      height: 180,
    });

    const rawSeries = chartRaw.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
    });

    // Create threshold lines on the raw chart
    if (config) {
      if (config.t_minus_2 !== null) {
        rawSeries.createPriceLine({ price: config.t_minus_2, color: '#f43f5e', lineWidth: 1, lineStyle: 2, title: 'Peak (-2)' });
      }
      if (config.t_minus_1 !== null) {
        rawSeries.createPriceLine({ price: config.t_minus_1, color: '#fb7185', lineWidth: 1, lineStyle: 2, title: 'Distribution (-1)' });
      }
      if (config.t_zero !== null) {
        rawSeries.createPriceLine({ price: config.t_zero, color: '#555555', lineWidth: 1, lineStyle: 2, title: 'Mid' });
      }
      if (config.t_plus_1 !== null) {
        rawSeries.createPriceLine({ price: config.t_plus_1, color: '#34d399', lineWidth: 1, lineStyle: 2, title: 'Accumulation (+1)' });
      }
      if (config.t_plus_2 !== null) {
        rawSeries.createPriceLine({ price: config.t_plus_2, color: '#10b981', lineWidth: 1, lineStyle: 2, title: 'Bottom (+2)' });
      }
    }

    chartRawRef.current = chartRaw;
    rawSeriesRef.current = rawSeries;

    // 3. Valuation Oscillator Chart (Bottom Panel)
    const chartOsc = createChart(oscContainerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#888888' },
      grid: { vertLines: { color: '#1e293b', style: 1 }, horzLines: { color: '#1e293b', style: 1 } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#555555' }, horzLine: { color: '#555555' } },
      rightPriceScale: { 
        borderColor: '#1e293b', 
        scaleMargins: { top: 0.1, bottom: 0.1 },
        minimumWidth: 90,
      },
      timeScale: { borderColor: '#1e293b', visible: true, timeVisible: false },
      width: oscContainerRef.current.clientWidth || 600,
      height: 150,
    });

    const oscSeries = chartOsc.addSeries(AreaSeries, {
      lineColor: color,
      topColor: `${color}33`, // Hex opacity
      bottomColor: `${color}00`,
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
    });

    // Reference lines for oscillator
    oscSeries.createPriceLine({ price: 2.0, color: '#10b981', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Undervalued (+2)' });
    oscSeries.createPriceLine({ price: 1.0, color: '#34d399', lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
    oscSeries.createPriceLine({ price: 0, color: '#475569', lineWidth: 1, lineStyle: 2 });
    oscSeries.createPriceLine({ price: -1.0, color: '#fb7185', lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
    oscSeries.createPriceLine({ price: -2.0, color: '#f43f5e', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Bubble (-2)' });

    chartOscRef.current = chartOsc;
    oscSeriesRef.current = oscSeries;

    // Synchronize zoom & pan
    const charts = [chartBtc, chartRaw, chartOsc];
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

    // Set Initial Data
    const btcPoints = commonBtc.map(d => ({
      time: d.date.substring(0, 10),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close
    }));
    btcSeries.setData(btcPoints);

    const rawPoints = commonMetric.map(d => ({
      time: d.date.substring(0, 10),
      value: d.raw_value
    }));
    rawSeries.setData(rawPoints);

    const oscPoints = commonMetric.map(d => ({
      time: d.date.substring(0, 10),
      value: d.normalized_value
    }));
    oscSeries.setData(oscPoints);

    // Sync Crosshairs
    const getCrosshairData = (timeStr: string) => {
      const targetMetric = commonMetric.find(d => d.date.substring(0, 10) === timeStr);
      const targetBtc = commonBtc.find(d => d.date.substring(0, 10) === timeStr);
      return {
        rawVal: targetMetric ? targetMetric.raw_value : 0,
        oscVal: targetMetric ? targetMetric.normalized_value : 0,
        btcClose: targetBtc ? targetBtc.close : 0
      };
    };

    chartBtc.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        chartRaw.clearCrosshairPosition();
        chartOsc.clearCrosshairPosition();
        return;
      }
      const data = getCrosshairData(param.time as string);
      chartRaw.setCrosshairPosition(data.rawVal, param.time, rawSeries);
      chartOsc.setCrosshairPosition(data.oscVal, param.time, oscSeries);
    });

    chartRaw.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        chartBtc.clearCrosshairPosition();
        chartOsc.clearCrosshairPosition();
        return;
      }
      const data = getCrosshairData(param.time as string);
      chartBtc.setCrosshairPosition(data.btcClose, param.time, btcSeries);
      chartOsc.setCrosshairPosition(data.oscVal, param.time, oscSeries);
    });

    chartOsc.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        chartBtc.clearCrosshairPosition();
        chartRaw.clearCrosshairPosition();
        return;
      }
      const data = getCrosshairData(param.time as string);
      chartBtc.setCrosshairPosition(data.btcClose, param.time, btcSeries);
      chartRaw.setCrosshairPosition(data.rawVal, param.time, rawSeries);
    });

    // ResizeObserver to handle initial width layout computation dynamically
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width === 0) continue;
        if (entry.target === btcContainerRef.current && chartBtcRef.current) {
          chartBtcRef.current.resize(width, 220);
        }
        if (entry.target === rawContainerRef.current && chartRawRef.current) {
          chartRawRef.current.resize(width, 180);
        }
        if (entry.target === oscContainerRef.current && chartOscRef.current) {
          chartOscRef.current.resize(width, 150);
        }
      }
    });

    if (btcContainerRef.current) resizeObserver.observe(btcContainerRef.current);
    if (rawContainerRef.current) resizeObserver.observe(rawContainerRef.current);
    if (oscContainerRef.current) resizeObserver.observe(oscContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chartBtc.remove();
      chartRaw.remove();
      chartOsc.remove();
      chartBtcRef.current = null;
      chartRawRef.current = null;
      chartOscRef.current = null;
    };
  }, [loading, commonMetric.length, commonBtc.length, isLogScale]);

  if (loading) {
    return (
      <div id="metric-detail-section" className="metric-detail-card loading">
        <div className="skeleton-loader text">LOADING.DETAILED.METRIC.ANALYSIS...</div>
        <div className="skeleton-loader chart-detail"></div>
      </div>
    );
  }

  if (commonMetric.length === 0 || commonBtc.length === 0) {
    return (
      <div id="metric-detail-section" className="metric-detail-card error">
        <div className="error-title">FAILED_TO_LOAD_METRIC_HISTORY</div>
        <button onClick={onClose} className="btn-close-error">CLOSE</button>
      </div>
    );
  }

  return (
    <div id="metric-detail-section" className="metric-detail-card">
      <div className="detail-header">
        <div className="metric-title-group">
          <span className="category-label">{metric.category.toUpperCase()} // ANALYTICS (SINCE 2016)</span>
          <h2>{metric.name.toUpperCase()} — DETAILED VIEW</h2>
          <p className="metric-desc">{metric.name.toUpperCase()} provides quantitative cycle analysis for Bitcoin.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => setIsLogScale(!isLogScale)}
            style={{
              background: 'var(--bg-surface)',
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
            onClick={() => onRefetchMetric(metric.name)}
            disabled={refetching || loading}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-secondary)',
              padding: '0.4rem 0.8rem',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              borderRadius: '2px',
              transition: 'all 0.2s',
              opacity: (refetching || loading) ? 0.5 : 1
            }}
            onMouseOver={(e) => { if (!refetching && !loading) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-secondary)'; } }}
            onMouseOut={(e) => { if (!refetching && !loading) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; } }}
          >
            {refetching ? '🔄 REFETCHING...' : '🔄 REFETCH DATA'}
          </button>
          <div className="detail-latest-badge" style={{ borderColor: color, display: 'flex', alignItems: 'center', gap: '0.5rem', borderWidth: '1px', borderStyle: 'solid', padding: '0.25rem 0.75rem', borderRadius: '2px', fontFamily: 'monospace' }}>
            <span className="badge-lbl" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>SCORE</span>
            <span className="badge-val" style={{ color: color, fontWeight: 'bold', fontSize: '0.9rem' }}>{metric.normalized_value !== null && metric.normalized_value !== undefined ? metric.normalized_value.toFixed(2) : 'N/A'}</span>
          </div>
          <button onClick={onClose} className="btn-close-detail">× CLOSE</button>
        </div>
      </div>

      <div className="chart-wrapper sub-panels" style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--border-subtle)', width: '100%', position: 'relative' }}>
        <div className="panel btc-panel" style={{ position: 'relative', height: '220px', backgroundColor: 'var(--bg-base)' }}>
          <div className="tv-legend" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', pointerEvents: 'none' }}>BTC PRICE (USD)</div>
          <div ref={btcContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
        
        <div className="panel raw-panel" style={{ position: 'relative', height: '180px', backgroundColor: 'var(--bg-base)' }}>
          <div className="tv-legend" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', pointerEvents: 'none' }}>RAW METRIC VALUE</div>
          <div ref={rawContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        <div className="panel oscillator-panel" style={{ position: 'relative', height: '150px', backgroundColor: 'var(--bg-base)' }}>
          <div className="tv-legend" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', pointerEvents: 'none' }}>DYNAMIC VALUATION SCORE</div>
          <div ref={oscContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>

      <ThresholdEditor 
        metricName={metric.name} 
        currentConfig={config} 
        onRefresh={onRefreshDashboardData} 
      />
    </div>
  );
};
