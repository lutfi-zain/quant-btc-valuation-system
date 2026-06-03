import React, { useState, useEffect } from 'react';
import type { MetricConfig } from '../types/metrics';
import { saveMetricConfig, renormalizeMetric, fetchMetricConfigDefaults } from '../api/client';

interface ThresholdEditorProps {
  metricName: string;
  currentConfig: MetricConfig | null;
  onRefresh: () => void;
}

export const ThresholdEditor: React.FC<ThresholdEditorProps> = ({
  metricName,
  currentConfig,
  onRefresh
}) => {
  // Input states (store as strings to allow easy typing/empty values)
  const [tPlus2, setTPlus2] = useState<string>('');
  const [tPlus1, setTPlus1] = useState<string>('');
  const [tZero, setTZero] = useState<string>('');
  const [tMinus1, setTMinus1] = useState<string>('');
  const [tMinus2, setTMinus2] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state with currentConfig when it changes
  useEffect(() => {
    if (currentConfig) {
      setTPlus2(currentConfig.t_plus_2 !== null ? String(currentConfig.t_plus_2) : '');
      setTPlus1(currentConfig.t_plus_1 !== null ? String(currentConfig.t_plus_1) : '');
      setTZero(currentConfig.t_zero !== null ? String(currentConfig.t_zero) : '');
      setTMinus1(currentConfig.t_minus_1 !== null ? String(currentConfig.t_minus_1) : '');
      setTMinus2(currentConfig.t_minus_2 !== null ? String(currentConfig.t_minus_2) : '');
      setSaveError(null);
      setSaveSuccess(false);
    }
  }, [currentConfig, metricName]);

  // Helper to parse input values
  const parseVal = (valStr: string): number | null => {
    const trimmed = valStr.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return isNaN(parsed) ? null : parsed;
  };

  const getParsedConfig = () => {
    return {
      metric_name: metricName,
      t_plus_2: parseVal(tPlus2),
      t_plus_1: parseVal(tPlus1),
      t_zero: parseVal(tZero),
      t_minus_1: parseVal(tMinus1),
      t_minus_2: parseVal(tMinus2)
    };
  };

  // Check if inputs are dirty compared to currentConfig
  const isDirty = () => {
    if (!currentConfig) return false;
    const parsed = getParsedConfig();
    return (
      parsed.t_plus_2 !== currentConfig.t_plus_2 ||
      parsed.t_plus_1 !== currentConfig.t_plus_1 ||
      parsed.t_zero !== currentConfig.t_zero ||
      parsed.t_minus_1 !== currentConfig.t_minus_1 ||
      parsed.t_minus_2 !== currentConfig.t_minus_2
    );
  };

  // Direction detection logic
  const getDirection = () => {
    const p2 = parseVal(tPlus2);
    const p1 = parseVal(tPlus1);
    const m1 = parseVal(tMinus1);
    const m2 = parseVal(tMinus2);

    if (p2 !== null && m2 !== null) {
      return p2 > m2 ? 'INVERTED' : 'NORMAL';
    } else if (p2 !== null && p1 !== null) {
      return p2 > p1 ? 'INVERTED' : 'NORMAL';
    } else if (m1 !== null && m2 !== null) {
      return m1 > m2 ? 'INVERTED' : 'NORMAL';
    }
    return 'NORMAL';
  };

  const direction = getDirection();
  const dirty = isDirty();

  // Save config & renormalize metric
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const parsedConfig = getParsedConfig();
      // 1. Save config to backend database
      await saveMetricConfig(parsedConfig);

      // 2. Renormalize the timeseries metrics
      await renormalizeMetric(metricName);

      // 3. Trigger refresh in parent DashboardLayout
      onRefresh();

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save metric configuration:', err);
      setSaveError(err?.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default seeds
  const handleReset = async () => {
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const defaults = await fetchMetricConfigDefaults();
      const match = defaults.find((d) => d.metric_name === metricName);
      if (match) {
        setTPlus2(match.t_plus_2 !== null ? String(match.t_plus_2) : '');
        setTPlus1(match.t_plus_1 !== null ? String(match.t_plus_1) : '');
        setTZero(match.t_zero !== null ? String(match.t_zero) : '');
        setTMinus1(match.t_minus_1 !== null ? String(match.t_minus_1) : '');
        setTMinus2(match.t_minus_2 !== null ? String(match.t_minus_2) : '');
      } else {
        setSaveError('No default configurations found for this metric');
      }
    } catch (err: any) {
      console.error('Failed to fetch default metric configs:', err);
      setSaveError(err?.message || 'Failed to reset to defaults');
    }
  };

  return (
    <div className="thresholds-panel" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-strong)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 className="panel-title" style={{ margin: 0 }}>VALUATION.THRESHOLD.MATRICES</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span 
            className="direction-indicator"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              padding: '0.15rem 0.4rem',
              borderRadius: '2px',
              backgroundColor: direction === 'INVERTED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              color: direction === 'INVERTED' ? 'var(--accent-rose)' : 'var(--accent-blue)',
              border: `1px solid ${direction === 'INVERTED' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
            }}
          >
            DIR: {direction}
          </span>
          {dirty && (
            <span 
              className="dirty-indicator"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--accent-amber)',
                fontWeight: 'bold',
                animation: 'pulse 1.5s infinite'
              }}
            >
              * UNSAVED CHANGES
            </span>
          )}
        </div>
      </div>

      <div 
        className="editor-form-grid"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.25rem',
          alignItems: 'flex-end',
          backgroundColor: 'var(--bg-surface)',
          padding: '1.25rem',
          border: '1px solid var(--border-subtle)',
          borderRadius: '4px'
        }}
      >
        <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent-emerald)', fontWeight: 'bold' }}>+2 (UNDERVALUED / BUY)</label>
          <input 
            type="number"
            step="any"
            value={tPlus2}
            onChange={(e) => setTPlus2(e.target.value)}
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              padding: '0.5rem',
              width: '110px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem'
            }}
          />
        </div>

        <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent-emerald)' }}>+1 (MILD BUY)</label>
          <input 
            type="number"
            step="any"
            value={tPlus1}
            onChange={(e) => setTPlus1(e.target.value)}
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              padding: '0.5rem',
              width: '110px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem'
            }}
          />
        </div>

        <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>0 (NEUTRAL)</label>
          <input 
            type="number"
            step="any"
            value={tZero}
            onChange={(e) => setTZero(e.target.value)}
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              padding: '0.5rem',
              width: '110px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem'
            }}
          />
        </div>

        <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent-rose)' }}>-1 (MILD SELL)</label>
          <input 
            type="number"
            step="any"
            value={tMinus1}
            onChange={(e) => setTMinus1(e.target.value)}
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              padding: '0.5rem',
              width: '110px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem'
            }}
          />
        </div>

        <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent-rose)', fontWeight: 'bold' }}>-2 (OVERVALUED / SELL)</label>
          <input 
            type="number"
            step="any"
            value={tMinus2}
            onChange={(e) => setTMinus2(e.target.value)}
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              padding: '0.5rem',
              width: '110px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <button 
            onClick={handleReset}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-secondary)',
              padding: '0.5rem 1rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            RESET_DEFAULTS
          </button>
          
          <button 
            onClick={handleSave} 
            disabled={isSaving || !dirty}
            style={{
              backgroundColor: dirty ? 'var(--accent-blue)' : 'var(--border-strong)',
              color: dirty ? 'white' : 'var(--text-tertiary)',
              border: 'none',
              padding: '0.5rem 1.25rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              cursor: dirty ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              boxShadow: dirty ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none'
            }}
          >
            {isSaving ? 'SAVING...' : 'SAVE_CHANGES'}
          </button>
        </div>
      </div>

      {saveError && (
        <div 
          style={{ 
            marginTop: '0.75rem', 
            color: 'var(--accent-rose)', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.75rem',
            border: '1px solid var(--accent-rose)',
            padding: '0.5rem',
            backgroundColor: 'rgba(244, 63, 94, 0.05)'
          }}
        >
          ERROR: {saveError}
        </div>
      )}

      {saveSuccess && (
        <div 
          style={{ 
            marginTop: '0.75rem', 
            color: 'var(--accent-emerald)', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.75rem',
            border: '1px solid var(--accent-emerald)',
            padding: '0.5rem',
            backgroundColor: 'rgba(16, 185, 129, 0.05)'
          }}
        >
          SUCCESS: Metric configuration saved and renormalized.
        </div>
      )}
    </div>
  );
};
