import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { MetricSummary, MetricDataPoint, MetricConfig } from '../types/metrics';
import { getValuationColor } from '../utils/colors';

interface MetricDetailProps {
  metric: MetricSummary;
  data: MetricDataPoint[];
  config: MetricConfig | null;
  loading: boolean;
  onClose: () => void;
}

export const MetricDetail: React.FC<MetricDetailProps> = ({
  metric,
  data,
  config,
  loading,
  onClose
}) => {
  if (loading) {
    return (
      <div id="metric-detail-section" className="metric-detail-card loading">
        <div className="skeleton-loader text">LOADING.DETAILED.METRIC.ANALYSIS...</div>
        <div className="skeleton-loader chart-detail"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div id="metric-detail-section" className="metric-detail-card error">
        <div className="error-title">FAILED_TO_LOAD_METRIC_HISTORY</div>
        <button onClick={onClose} className="btn-close-error">CLOSE</button>
      </div>
    );
  }

  const latestPoint = data[data.length - 1];
  const color = getValuationColor(metric.normalized_value);
  
  // Detect if metric is inverted
  const isInverted = config 
    ? (config.t_plus_2 !== null && config.t_minus_2 !== null && config.t_plus_2 > config.t_minus_2)
    : false;

  const formatDateTick = (tickStr: string) => {
    try {
      return new Date(tickStr).toLocaleDateString(undefined, { year: '2-digit', month: 'short' });
    } catch {
      return tickStr;
    }
  };

  const formatTooltip = (value: any, name: string) => {
    if (name === "btc_price") {
      if (value === null || value === undefined) return ["N/A", "BTC Price"];
      return [`$${Number(value).toLocaleString()}`, "BTC Price"];
    }
    if (name === "raw_value") {
      return [Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 }), "Raw Metric"];
    }
    if (name === "normalized_value") {
      return [Number(value).toFixed(2), "Valuation Score"];
    }
    return [value, name];
  };

  return (
    <div id="metric-detail-section" className="metric-detail-card">
      <div className="detail-header">
        <div className="metric-title-group">
          <span className="category-label">{metric.category.toUpperCase()} // ANALYTICS</span>
          <h2>{metric.name.toUpperCase()} — DETAILED VIEW</h2>
          <p className="metric-desc">{metric.name.toUpperCase()} provides quantitative cycle analysis for Bitcoin.</p>
        </div>
        <div className="header-actions">
          <div className="detail-latest-badge" style={{ borderColor: color }}>
            <span className="badge-lbl">SCORE</span>
            <span className="badge-val" style={{ color: color }}>{metric.normalized_value.toFixed(2)}</span>
          </div>
          <button onClick={onClose} className="btn-close-detail">× CLOSE</button>
        </div>
      </div>

      <div className="detail-chart-wrapper" style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 15, right: 10, left: 10, bottom: 15 }}>
            <defs>
              <linearGradient id="colorDetailNorm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDateTick} 
              stroke="#64748b" 
              tickLine={false}
              axisLine={false}
              minTickGap={45}
              style={{ fontSize: '11px', fontFamily: 'monospace' }}
            />
            {/* Left Axis: BTC Price (Log) */}
            <YAxis 
              yAxisId="btc" 
              scale="log" 
              domain={['auto', 'auto']}
              orientation="left" 
              stroke="#94a3b8" 
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `$${Number(val).toLocaleString(undefined, { notation: 'compact' })}`}
              style={{ fontSize: '11px', fontFamily: 'monospace' }}
            />
            {/* Right Axis: Raw Metric Value */}
            <YAxis 
              yAxisId="raw" 
              orientation="right" 
              stroke="#3b82f6" 
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => Number(val).toLocaleString(undefined, { maximumSignificantDigits: 3 })}
              style={{ fontSize: '11px', fontFamily: 'monospace' }}
            />
            {/* Hidden Axis: Normalized Value (-2 to 2) */}
            <YAxis 
              yAxisId="norm" 
              domain={[-2, 2]} 
              orientation="right" 
              show={false}
            />

            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '4px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}
              itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
              formatter={formatTooltip}
            />

            {/* Reference Line for Neutral 0 */}
            <ReferenceLine yAxisId="norm" y={0} stroke="#475569" strokeDasharray="3 3" />
            <ReferenceLine yAxisId="norm" y={1.0} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.2} />
            <ReferenceLine yAxisId="norm" y={-1.0} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.2} />

            {/* Normalized Overlay Area */}
            <Area 
              yAxisId="norm"
              type="monotone" 
              dataKey="normalized_value" 
              stroke={color}
              strokeWidth={1.5}
              fill="url(#colorDetailNorm)" 
              name="normalized_value"
            />
            {/* Raw Metric Line */}
            <Line 
              yAxisId="raw"
              type="monotone" 
              dataKey="raw_value" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              dot={false}
              name="raw_value"
            />
            {/* BTC Price Line */}
            <Line 
              yAxisId="btc"
              type="monotone" 
              dataKey="btc_price" 
              stroke="#e2e8f0" 
              strokeWidth={1} 
              strokeOpacity={0.5}
              dot={false}
              name="btc_price"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {config && (
        <div className="thresholds-panel">
          <h4 className="panel-title">VALUATION.THRESHOLD.MATRICES</h4>
          <div className="thresholds-grid">
            <div className="threshold-col overvalued">
              <span className="col-label">🔴 OVERVALUED</span>
              <div className="threshold-values">
                <div className="val-row">
                  <span>-2SD (Extreme Peak):</span>
                  <strong>{config.t_minus_2 !== null ? config.t_minus_2 : 'N/A'}</strong>
                </div>
                <div className="val-row">
                  <span>-1SD (Market Top):</span>
                  <strong>{config.t_minus_1 !== null ? config.t_minus_1 : 'N/A'}</strong>
                </div>
              </div>
            </div>
            
            <div className="threshold-col neutral">
              <span className="col-label">🟡 NEUTRAL</span>
              <div className="threshold-values">
                <div className="val-row">
                  <span>Midpoint:</span>
                  <strong>{config.t_zero !== null ? config.t_zero : '0.00'}</strong>
                </div>
                <div className="val-row">
                  <span>Direction:</span>
                  <strong>{isInverted ? 'INVERTED (Lower = Overvalued)' : 'NORMAL (Higher = Overvalued)'}</strong>
                </div>
              </div>
            </div>

            <div className="threshold-col undervalued">
              <span className="col-label">🟢 UNDERVALUED</span>
              <div className="threshold-values">
                <div className="val-row">
                  <span>+1SD (Accumulation):</span>
                  <strong>{config.t_plus_1 !== null ? config.t_plus_1 : 'N/A'}</strong>
                </div>
                <div className="val-row">
                  <span>+2SD (Extreme Cycle Bottom):</span>
                  <strong>{config.t_plus_2 !== null ? config.t_plus_2 : 'N/A'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
