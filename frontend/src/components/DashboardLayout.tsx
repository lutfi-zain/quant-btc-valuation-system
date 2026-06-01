import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { CompositeChart } from './CompositeChart';
import { MetricGrid } from './MetricGrid';
import { MetricDetail } from './MetricDetail';
import { fetchMetrics, fetchComposite, fetchMetricData, fetchMetricConfigs } from '../api/client';
import type { MetricSummary, CompositeDataPoint, MetricDataPoint, MetricConfig } from '../types/metrics';

export const DashboardLayout: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricSummary[]>([]);
  const [compositeData, setCompositeData] = useState<CompositeDataPoint[]>([]);
  const [configs, setConfigs] = useState<MetricConfig[]>([]);
  const [sparklineData, setSparklineData] = useState<Record<string, { date: string; value: number }[]>>({});
  
  // Selection and detail view state
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<MetricDataPoint[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Global loading/error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Parallel fetch summaries, composite timeseries, and configurations
      const [summaries, composite, metricConfigs] = await Promise.all([
        fetchMetrics(),
        fetchComposite(),
        fetchMetricConfigs()
      ]);

      setMetrics(summaries);
      setCompositeData(composite);
      setConfigs(metricConfigs);

      // Concurrent fetch for sparklines (last 90 data points)
      const sparklinePromises = summaries.map(async (m) => {
        try {
          const data = await fetchMetricData(m.name);
          const sparkData = data.slice(-90).map(pt => ({
            date: pt.date,
            value: pt.normalized_value
          }));
          return { name: m.name, data: sparkData };
        } catch (err) {
          console.error(`Failed to fetch sparkline for ${m.name}:`, err);
          return { name: m.name, data: [] };
        }
      });

      const sparklineResults = await Promise.all(sparklinePromises);
      const sparkMap = sparklineResults.reduce((acc, curr) => {
        acc[curr.name] = curr.data;
        return acc;
      }, {} as Record<string, { date: string; value: number }[]>);

      setSparklineData(sparkMap);
    } catch (err: any) {
      console.error('Failed to initialize dashboard:', err);
      setError(err?.message || 'Failed to initialize system dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSelectMetric = async (name: string) => {
    setActiveMetric(name);
    setDetailLoading(true);
    try {
      const data = await fetchMetricData(name);
      setDetailData(data);
    } catch (err) {
      console.error(`Error loading detail for ${name}:`, err);
      setDetailData([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setActiveMetric(null);
    setDetailData([]);
  };

  const getActiveMetricSummary = (): MetricSummary | undefined => {
    return metrics.find(m => m.name === activeMetric);
  };

  const getActiveMetricConfig = (): MetricConfig | null => {
    if (!activeMetric) return null;
    return configs.find(c => c.metric_name === activeMetric) || null;
  };

  if (loading) {
    return (
      <div className="dashboard-layout loading">
        <div className="loading-spinner-container">
          <div className="spinner"></div>
          <span className="loading-txt">INITIALIZING.BTC.VALUATION.ENGINE...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-layout error">
        <div className="error-panel-container">
          <div className="error-icon">⚠️</div>
          <h2>SYSTEM.INIT_FAILURE</h2>
          <p>{error}</p>
          <button onClick={loadDashboardData} className="btn-retry">RETRY_INITIALIZATION</button>
        </div>
      </div>
    );
  }

  const activeSummary = getActiveMetricSummary();
  const activeConfig = getActiveMetricConfig();

  return (
    <div className="dashboard-layout">
      <Sidebar 
        metrics={metrics}
        activeMetric={activeMetric}
        onSelectMetric={handleSelectMetric}
      />
      
      <main className="dashboard-main-content">
        <header className="dashboard-top-navbar">
          <div className="navbar-left">
            <span className="status-indicator online"></span>
            <span className="navbar-status-text">BTC.VALUATION.ENGINE.ONLINE</span>
          </div>
          <div className="navbar-right">
            <span className="navbar-datetime">SYSTEM_TIME: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </header>

        <div className="dashboard-body">
          {/* 1. Composite Master Chart */}
          <CompositeChart data={compositeData} />

          {/* 2. Expanded Detail Panel */}
          {activeMetric && activeSummary && (
            <MetricDetail
              metric={activeSummary}
              data={detailData}
              config={activeConfig}
              loading={detailLoading}
              onClose={handleCloseDetail}
            />
          )}

          {/* 3. Grid of component cards */}
          <MetricGrid
            metrics={metrics}
            sparklineData={sparklineData}
            activeMetric={activeMetric}
            onSelectMetric={handleSelectMetric}
          />
        </div>
      </main>
    </div>
  );
};
