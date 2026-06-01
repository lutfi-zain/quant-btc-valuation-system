import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode, LineSeries, CandlestickSeries, PriceScaleMode } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, IPriceLine } from 'lightweight-charts';
import './AvivRatioChart.css';

export interface AvivData {
  date: string;
  raw_value: number;
  normalized_value: number;
  btc_price: number;
}

export interface BtcOhlcData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ThresholdConfig {
  t_minus_2: number | string;
  t_minus_1: number | string;
  t_zero: number | string;
  t_plus_1: number | string;
  t_plus_2: number | string;
}

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  t_minus_2: -2.0,
  t_minus_1: -1.0,
  t_zero: 0.0,
  t_plus_1: 1.0,
  t_plus_2: 2.0
};

function mapToOscillator(raw: number, t: ThresholdConfig): number {
  const m2 = Number(t.t_minus_2) || 0;
  const m1 = Number(t.t_minus_1) || 0;
  const z = Number(t.t_zero) || 0;
  const p1 = Number(t.t_plus_1) || 0;
  const p2 = Number(t.t_plus_2) || 0;

  if (raw <= m2) {
    const diff = m1 - m2;
    return 2 + (diff ? (m2 - raw) / diff : 0);
  }
  if (raw <= m1) {
    const diff = m1 - m2;
    return 2 - (raw - m2) / diff;
  }
  if (raw <= z) {
    const diff = z - m1;
    return 1 - (raw - m1) / diff;
  }
  if (raw <= p1) {
    const diff = p1 - z;
    return 0 - (raw - z) / diff;
  }
  if (raw <= p2) {
    const diff = p2 - p1;
    return -1 - (raw - p1) / diff;
  }
  const diff = p2 - p1;
  return -2 - (raw - p2) / diff;
}

export const AvivRatioChart = () => {
  const btcContainerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const oscContainerRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [thresholds, setThresholds] = useState<ThresholdConfig>(DEFAULT_THRESHOLDS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogScale, setIsLogScale] = useState(true);

  // Chart instances
  const chartBtcRef = useRef<IChartApi | null>(null);
  const chart1Ref = useRef<IChartApi | null>(null);
  const chart2Ref = useRef<IChartApi | null>(null);
  const btcSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const rawSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const oscSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  
  // Price lines
  const linesRef = useRef<{ [key: string]: IPriceLine | null }>({});

  const avivDataRef = useRef<AvivData[]>([]);
  const btcOhlcDataRef = useRef<BtcOhlcData[]>([]);

  // Fetch data & config
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [avivRes, configRes, btcRes] = await Promise.all([
          fetch('/api/metrics/aviv_ratio'),
          fetch('/api/metrics/config/aviv_ratio'),
          fetch('/api/metrics/btc_ohlc')
        ]);
        
        if (!avivRes.ok) throw new Error('Failed to fetch metric data');
        if (!btcRes.ok) throw new Error('Failed to fetch btc data');
        
        const aviv: AvivData[] = await avivRes.json();
        const btc: BtcOhlcData[] = await btcRes.json();

        // Intersect dates so logical ranges match perfectly
        const btcDates = new Set(btc.map(d => d.date.substring(0, 10)));
        const commonAviv = aviv.filter(d => btcDates.has(d.date.substring(0, 10)));
        const avivDates = new Set(commonAviv.map(d => d.date.substring(0, 10)));
        const commonBtc = btc.filter(d => avivDates.has(d.date.substring(0, 10)));

        avivDataRef.current = commonAviv.sort((a, b) => a.date.localeCompare(b.date));
        btcOhlcDataRef.current = commonBtc.sort((a, b) => a.date.localeCompare(b.date));
        
        if (configRes.ok) {
          const config = await configRes.json();
          if (config) {
            setThresholds({
              t_minus_2: config.t_minus_2,
              t_minus_1: config.t_minus_1,
              t_zero: config.t_zero,
              t_plus_1: config.t_plus_1,
              t_plus_2: config.t_plus_2,
            });
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Initialize and update charts
  useEffect(() => {
    if (loading || error || avivDataRef.current.length === 0) return;
    if (!chartContainerRef.current || !oscContainerRef.current || !btcContainerRef.current) return;
    
    if (!chart1Ref.current) {
      // 0. BTC OHLC Chart
      const chartBtc = createChart(btcContainerRef.current, {
        layout: { background: { color: 'transparent' }, textColor: '#888888' },
        grid: { vertLines: { color: '#222222', style: 1 }, horzLines: { color: '#222222', style: 1 } },
        crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#555555' }, horzLine: { color: '#555555' } },
        rightPriceScale: { 
          borderColor: '#222222', 
          scaleMargins: { top: 0.1, bottom: 0.1 },
          mode: PriceScaleMode.Logarithmic
        },
        timeScale: { borderColor: '#222222', visible: false },
        width: btcContainerRef.current.clientWidth || 600,
        height: 300,
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

      // 1. Raw Metric Chart (Playground)
      const chart1 = createChart(chartContainerRef.current, {
        layout: { background: { color: 'transparent' }, textColor: '#888888' },
        grid: { vertLines: { color: '#222222', style: 1 }, horzLines: { color: '#222222', style: 1 } },
        crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#555555' }, horzLine: { color: '#555555' } },
        rightPriceScale: { borderColor: '#222222', scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: '#222222', visible: false },
        width: chartContainerRef.current.clientWidth || 600,
        height: 300,
      });

      const rawSeries = chart1.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
      });

      chart1Ref.current = chart1;
      rawSeriesRef.current = rawSeries;

      // 2. Valuation Oscillator Chart
      const chart2 = createChart(oscContainerRef.current, {
        layout: { background: { color: 'transparent' }, textColor: '#888888' },
        grid: { vertLines: { color: '#222222', style: 1 }, horzLines: { color: '#222222', style: 1 } },
        crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#555555' }, horzLine: { color: '#555555' } },
        rightPriceScale: { borderColor: '#222222', scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: '#222222', visible: true, timeVisible: false },
        width: oscContainerRef.current.clientWidth || 600,
        height: 250,
      });

      const oscSeries = chart2.addSeries(LineSeries, {
        color: '#00e5ff',
        lineWidth: 1,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
      });

      // Reference lines for oscillator (-2 and +2)
      oscSeries.createPriceLine({ price: 2.0, color: '#f43f5e', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Peak' });
      oscSeries.createPriceLine({ price: -2.0, color: '#10b981', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Bottom' });
      oscSeries.createPriceLine({ price: 0, color: '#555555', lineWidth: 1, lineStyle: 2 });

      chart2Ref.current = chart2;
      oscSeriesRef.current = oscSeries;

      // Sync crosshairs and scrolling
      const charts = [chartBtc, chart1, chart2];
      
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

      const getCrosshairData = (timeStr: string) => {
        const targetAviv = avivDataRef.current.find(d => d.date.startsWith(timeStr));
        const targetBtc = btcOhlcDataRef.current.find(d => d.date.startsWith(timeStr));
        return {
          avivVal: targetAviv ? targetAviv.normalized_value : 0,
          oscVal: targetAviv ? mapToOscillator(targetAviv.normalized_value, thresholds) : 0,
          btcClose: targetBtc ? targetBtc.close : 0
        };
      };

      chartBtc.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
          chart1.clearCrosshairPosition();
          chart2.clearCrosshairPosition();
          return;
        }
        const timeStr = param.time as string;
        const data = getCrosshairData(timeStr);
        chart1.setCrosshairPosition(data.avivVal, param.time, rawSeriesRef.current!);
        chart2.setCrosshairPosition(data.oscVal, param.time, oscSeriesRef.current!);
      });

      chart1.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
          chartBtc.clearCrosshairPosition();
          chart2.clearCrosshairPosition();
          return;
        }
        const timeStr = param.time as string;
        const data = getCrosshairData(timeStr);
        chartBtc.setCrosshairPosition(data.btcClose, param.time, btcSeriesRef.current!);
        chart2.setCrosshairPosition(data.oscVal, param.time, oscSeriesRef.current!);
      });
      
      chart2.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
          chartBtc.clearCrosshairPosition();
          chart1.clearCrosshairPosition();
          return;
        }
        const timeStr = param.time as string;
        const data = getCrosshairData(timeStr);
        chartBtc.setCrosshairPosition(data.btcClose, param.time, btcSeriesRef.current!);
        chart1.setCrosshairPosition(data.avivVal, param.time, rawSeriesRef.current!);
      });
    }

    // Set Initial Data
    const btcData = btcOhlcDataRef.current.map(d => ({
      time: d.date.substring(0, 10),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    btcSeriesRef.current?.setData(btcData as any);

    const rawData = avivDataRef.current.map(d => ({ time: d.date.substring(0, 10), value: d.normalized_value }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawSeriesRef.current?.setData(rawData as any);

    // ResizeObserver to handle initial width layout computation dynamically
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width === 0) continue;
        if (entry.target === btcContainerRef.current && chartBtcRef.current) {
          chartBtcRef.current.resize(width, 300);
        }
        if (entry.target === chartContainerRef.current && chart1Ref.current) {
          chart1Ref.current.resize(width, 300);
        }
        if (entry.target === oscContainerRef.current && chart2Ref.current) {
          chart2Ref.current.resize(width, 250);
        }
      }
    });

    if (btcContainerRef.current) resizeObserver.observe(btcContainerRef.current);
    if (chartContainerRef.current) resizeObserver.observe(chartContainerRef.current);
    if (oscContainerRef.current) resizeObserver.observe(oscContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartBtcRef.current) {
        chartBtcRef.current.remove();
        chartBtcRef.current = null;
        btcSeriesRef.current = null;
      }
      if (chart1Ref.current) {
        chart1Ref.current.remove();
        chart1Ref.current = null;
        rawSeriesRef.current = null;
        linesRef.current = {};
      }
      if (chart2Ref.current) {
        chart2Ref.current.remove();
        chart2Ref.current = null;
        oscSeriesRef.current = null;
      }
    };
  }, [loading, error]); // Only run on mount or load change, thresholds are handled below

  // Handle threshold line updates on Chart 1 and Oscillator Data recalculation
  useEffect(() => {
    if (!rawSeriesRef.current || !oscSeriesRef.current || avivDataRef.current.length === 0) return;

    const lineConfigs = [
      { key: 't_minus_2', price: Number(thresholds.t_minus_2) || 0, color: '#f43f5e', title: 'Peak (-2)' },
      { key: 't_minus_1', price: Number(thresholds.t_minus_1) || 0, color: '#fb7185', title: 'Distribution (-1)' },
      { key: 't_zero', price: Number(thresholds.t_zero) || 0, color: '#555555', title: 'Mid' },
      { key: 't_plus_1', price: Number(thresholds.t_plus_1) || 0, color: '#34d399', title: 'Accumulation (+1)' },
      { key: 't_plus_2', price: Number(thresholds.t_plus_2) || 0, color: '#10b981', title: 'Bottom (+2)' },
    ];

    lineConfigs.forEach(config => {
      if (linesRef.current[config.key]) {
        rawSeriesRef.current?.removePriceLine(linesRef.current[config.key]!);
      }
      linesRef.current[config.key] = rawSeriesRef.current!.createPriceLine({
        price: config.price,
        color: config.color,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: config.title,
      });
    });

    // Recalculate Oscillator Data
    const oscData = avivDataRef.current.map(d => ({
      time: d.date.substring(0, 10),
      value: mapToOscillator(d.normalized_value, thresholds)
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    oscSeriesRef.current.setData(oscData as any);

  }, [thresholds, loading]);

  useEffect(() => {
    if (chartBtcRef.current) {
      chartBtcRef.current.priceScale('right').applyOptions({
        mode: isLogScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
      });
    }
  }, [isLogScale]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/metrics/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric_name: 'aviv_ratio',
          ...thresholds
        })
      });
      if (!res.ok) throw new Error('Failed to save');
      alert('Configuration saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThresholdChange = (key: keyof ThresholdConfig, value: string) => {
    setThresholds(prev => ({
      ...prev,
      [key]: value === '-' || value === '' ? value : (parseFloat(value) || 0)
    }));
  };

  if (loading) return <div className="chart-loading-container"><div className="chart-loading-text">Loading Playground...</div></div>;
  if (error) return <div className="chart-error-container"><div className="chart-error-text">Error: {error}</div></div>;

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div className="chart-title-group">
          <h2 className="chart-title">AVIV.RAW_METRIC_PLAYGROUND</h2>
          <p className="chart-subtitle">// DYNAMIC_VALUATION_OSCILLATOR [-2.0, +2.0]</p>
        </div>
      </div>

      <div className="config-controls">
        <div className="threshold-inputs">
          {(Object.keys(thresholds) as Array<keyof ThresholdConfig>).map((key) => (
            <div key={key} className="input-group">
              <label>{key.replace(/_/g, ' ').toUpperCase()}</label>
              <input 
                type="number" 
                step="0.1" 
                value={thresholds[key]} 
                onChange={(e) => handleThresholdChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <button className="save-btn" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Config'}
        </button>
      </div>

      <div className="chart-wrapper sub-panels">
        <div className="panel btc-panel" style={{ position: 'relative' }}>
          <div className="tv-legend" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>BTC USD</span>
            <button 
              onClick={() => setIsLogScale(!isLogScale)}
              style={{
                background: 'transparent', border: '1px solid #444', color: '#888',
                padding: '0 4px', fontSize: '10px', cursor: 'pointer',
                fontFamily: 'monospace',
                pointerEvents: 'auto'
              }}
            >
              {isLogScale ? 'LOG' : 'LIN'}
            </button>
          </div>
          <div ref={btcContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
        
        <div className="panel raw-panel" style={{ position: 'relative' }}>
          <div className="tv-legend">AVIV Ratio-Z</div>
          <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
        
        <div className="panel oscillator-panel" style={{ position: 'relative' }}>
          <div className="tv-legend">Dynamic AVIV Valuation (-2 to +2)</div>
          <div ref={oscContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  );
};
