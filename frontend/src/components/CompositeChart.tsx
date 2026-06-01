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
  ReferenceArea,
  ReferenceLine
} from 'recharts';
import { CompositeDataPoint } from '../types/metrics';

interface CompositeChartProps {
  data: CompositeDataPoint[];
  loading?: boolean;
}

export const CompositeChart: React.FC<CompositeChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="chart-placeholder loading">
        <div className="skeleton-loader text">LOADING.COMPOSITE.VALUATION.CHART...</div>
        <div className="skeleton-loader chart"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder error">
        NO_COMPOSITE_DATA_AVAILABLE
      </div>
    );
  }

  // Format date for tick labels
  const formatDateTick = (tickStr: string) => {
    try {
      const date = new Date(tickStr);
      return date.toLocaleDateString(undefined, { year: '2-digit', month: 'short' });
    } catch {
      return tickStr;
    }
  };

  // Tooltip formatter
  const formatTooltip = (value: any, name: string) => {
    if (name === "btc_price") {
      if (value === null || value === undefined) return ["N/A", "BTC Price"];
      return [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, "BTC Price"];
    }
    if (name === "composite_value") {
      return [Number(value).toFixed(3), "Composite Oscillator"];
    }
    return [value, name];
  };

  const formatTooltipTitle = (label: string) => {
    try {
      return new Date(label).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return label;
    }
  };

  return (
    <div className="composite-chart-card">
      <div className="card-header">
        <div className="card-title-group">
          <h2>MASTER.COMPOSITE.OSCILLATOR</h2>
          <span className="card-subtitle">Aggregate Bitcoin valuation score across 17 distinct metrics</span>
        </div>
        <div className="composite-badge-info">
          Latest Score: <span className="score-val">{data[data.length - 1]?.composite_value.toFixed(2)}</span>
        </div>
      </div>

      <div className="chart-container" style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="colorComposite" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
            
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDateTick} 
              stroke="#64748b" 
              tickLine={false}
              axisLine={false}
              minTickGap={40}
              style={{ fontSize: '11px', fontFamily: 'monospace' }}
            />
            
            {/* Left Y Axis for BTC Price (Log Scale) */}
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
            
            {/* Right Y Axis for Composite Oscillator (-2 to +2) */}
            <YAxis 
              yAxisId="osc" 
              domain={[-2.0, 2.0]} 
              orientation="right" 
              stroke="#64748b" 
              tickLine={false}
              axisLine={false}
              ticks={[-2.0, -1.0, 0, 1.0, 2.0]}
              style={{ fontSize: '11px', fontFamily: 'monospace' }}
            />

            {/* Reference Areas (Valuation Bands) */}
            <ReferenceArea y1={1.0} y2={2.0} fill="#10b981" fillOpacity={0.06} yAxisId="osc" />
            <ReferenceArea y1={-1.0} y2={1.0} fill="#64748b" fillOpacity={0.02} yAxisId="osc" />
            <ReferenceArea y1={-2.0} y2={-1.0} fill="#ef4444" fillOpacity={0.06} yAxisId="osc" />
            
            {/* Reference lines */}
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" yAxisId="osc" />
            <ReferenceLine y={1.0} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.25} yAxisId="osc" />
            <ReferenceLine y={-1.0} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.25} yAxisId="osc" />

            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '4px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' }}
              itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
              labelFormatter={formatTooltipTitle}
              formatter={formatTooltip}
            />
            
            {/* Composite Score Area */}
            <Area 
              yAxisId="osc"
              type="monotone" 
              dataKey="composite_value" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorComposite)" 
              name="composite_value"
            />
            
            {/* BTC Price Line */}
            <Line 
              yAxisId="btc"
              type="monotone" 
              dataKey="btc_price" 
              stroke="#e2e8f0" 
              strokeWidth={1.5}
              dot={false} 
              name="btc_price"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        <div className="legend-item"><span className="legend-dot btc"></span> BTC Price (Log)</div>
        <div className="legend-item"><span className="legend-dot osc"></span> Composite Score</div>
        <div className="legend-item"><span className="legend-band overvalued"></span> Overvalued (&lt; -1.0)</div>
        <div className="legend-item"><span className="legend-band neutral"></span> Neutral (-1.0 to 1.0)</div>
        <div className="legend-item"><span className="legend-band undervalued"></span> Undervalued (&gt; 1.0)</div>
      </div>
    </div>
  );
};
