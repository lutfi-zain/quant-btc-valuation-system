import React from 'react';
import { MetricSummary } from '../types/metrics';
import { MetricCard } from './MetricCard';

interface MetricGridProps {
  metrics: MetricSummary[];
  sparklineData: Record<string, { date: string; value: number }[]>;
  activeMetric: string | null;
  onSelectMetric: (name: string) => void;
}

export const MetricGrid: React.FC<MetricGridProps> = ({
  metrics,
  sparklineData,
  activeMetric,
  onSelectMetric
}) => {
  const categories = [
    { id: 'fundamental', label: '1. ON-CHAIN FUNDAMENTALS // SEC.VAL' },
    { id: 'technical', label: '2. TECHNICAL INDICATORS // SEC.MOM' },
    { id: 'sentiment', label: '3. SENTIMENT BIAS FILTERS // SEC.PSY' }
  ];

  const getMetricsByCategory = (cat: string) => {
    return metrics.filter(m => m.category === cat);
  };

  return (
    <div className="metric-grids-container">
      {categories.map(category => {
        const catMetrics = getMetricsByCategory(category.id);
        if (catMetrics.length === 0) return null;

        return (
          <section 
            key={category.id} 
            id={`section-${category.id}`} 
            className="category-section"
          >
            <div className="section-header-banner">
              <h2>{category.label}</h2>
              <span className="component-count">{catMetrics.length} COMPONENTS</span>
            </div>
            
            <div className="metrics-grid">
              {catMetrics.map(metric => (
                <MetricCard
                  key={metric.name}
                  metric={metric}
                  sparklineData={sparklineData[metric.name] || null}
                  isActive={activeMetric === metric.name}
                  onClick={() => onSelectMetric(metric.name)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
