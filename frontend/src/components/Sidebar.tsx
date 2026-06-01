import React, { useState } from 'react';
import type { MetricSummary } from '../types/metrics';

interface SidebarProps {
  metrics: MetricSummary[];
  activeMetric: string | null;
  onSelectMetric: (name: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ metrics, activeMetric, onSelectMetric }) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    fundamental: true,
    technical: true,
    sentiment: true,
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    setTimeout(() => {
      const el = document.getElementById(`section-${cat}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const categories = [
    { id: 'fundamental', label: 'FUNDAMENTAL.METRICS' },
    { id: 'technical', label: 'TECHNICAL.INDICATORS' },
    { id: 'sentiment', label: 'SENTIMENT.REGIMES' }
  ];

  const getMetricsByCategory = (cat: string) => {
    return metrics.filter(m => m.category === cat);
  };

  const handleMetricClick = (name: string) => {
    onSelectMetric(name);
    // Scroll to detail or card
    setTimeout(() => {
      const el = document.getElementById(`metric-detail-section`) || document.getElementById(`metric-card-${name}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">BTC_VAL</div>
        <div className="brand-sub">OSCILLATOR v2.0</div>
      </div>
      
      <nav className="sidebar-nav">
        {categories.map(category => {
          const categoryMetrics = getMetricsByCategory(category.id);
          const isExpanded = expandedCategories[category.id];
          
          return (
            <div key={category.id} className="nav-category-group">
              <button 
                className="category-header-btn" 
                onClick={() => toggleCategory(category.id)}
              >
                <span>{category.label}</span>
                <span className={`arrow-icon ${isExpanded ? 'open' : ''}`}>▼</span>
              </button>
              
              {isExpanded && (
                <ul className="category-metric-list">
                  {categoryMetrics.map(metric => {
                    const isActive = activeMetric === metric.name;
                    return (
                      <li key={metric.name}>
                        <button
                          onClick={() => handleMetricClick(metric.name)}
                          className={`metric-nav-item ${isActive ? 'active' : ''}`}
                        >
                          <span className="metric-nav-name">{metric.name.toUpperCase()}</span>
                          <span className={`metric-nav-badge ${
                            metric.normalized_value >= 1.0 ? 'badge-undervalued' : 
                            metric.normalized_value <= -1.0 ? 'badge-overvalued' : 'badge-neutral'
                          }`}>
                            {metric.normalized_value.toFixed(2)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {categoryMetrics.length === 0 && (
                    <li className="no-metrics-li">LOADING_METRICS...</li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
