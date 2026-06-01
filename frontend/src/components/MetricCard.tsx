import React from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { MetricSummary } from '../types/metrics';
import { getValuationColor } from '../utils/colors';

interface MetricCardProps {
  metric: MetricSummary;
  sparklineData: { date: string; value: number }[] | null;
  isActive: boolean;
  onClick: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  sparklineData,
  isActive,
  onClick
}) => {
  const normColor = getValuationColor(metric.normalized_value);
  
  // Format raw value nicely
  const formatRawValue = (val: number) => {
    if (val === null || val === undefined) return 'N/A';
    if (Math.abs(val) >= 1000) {
      return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return val.toFixed(4);
  };

  const getInterpretationText = (score: number) => {
    if (score >= 1.0) return 'UNDERVALUED (BUY)';
    if (score <= -1.0) return 'OVERVALUED (SELL)';
    return 'NEUTRAL';
  };

  return (
    <div 
      id={`metric-card-${metric.name}`}
      className={`metric-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="card-top">
        <div className="metric-meta">
          <span className="metric-category-tag">{metric.category.toUpperCase()}</span>
          <h3 className="metric-card-name">{metric.name.toUpperCase()}</h3>
        </div>
        <div 
          className="metric-badge"
          style={{ backgroundColor: normColor, color: '#0f172a' }}
        >
          {metric.normalized_value.toFixed(2)}
        </div>
      </div>

      <div className="card-middle">
        <div className="value-item">
          <span className="value-label">RAW_VALUE</span>
          <span className="value-num">{formatRawValue(metric.raw_value)}</span>
        </div>
        <div className="value-item text-right">
          <span className="value-label">REGIME_STATE</span>
          <span className="value-state" style={{ color: normColor }}>
            {getInterpretationText(metric.normalized_value)}
          </span>
        </div>
      </div>

      <div className="card-sparkline">
        {sparklineData && sparklineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={sparklineData} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
              <defs>
                <linearGradient id={`sparklineGradient-${metric.name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={normColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={normColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area 
                type="monotone"
                dataKey="value" 
                stroke={normColor} 
                strokeWidth={1.5}
                fillOpacity={1}
                fill={`url(#sparklineGradient-${metric.name})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="sparkline-loader">LOADING_TREND_DATA...</div>
        )}
      </div>
      
      <div className="card-footer">
        <span className="latest-date">LST_UPDATE: {new Date(metric.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}</span>
        <span className="interact-hint">CLICK_TO_EXPAND // &gt;&gt;</span>
      </div>
    </div>
  );
};
