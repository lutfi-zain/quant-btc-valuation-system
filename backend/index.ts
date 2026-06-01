import { Hono } from 'hono';
import { Database } from 'bun:sqlite';
import { join } from 'path';

const app = new Hono();

// Connect to SQLite DB
const dbPath = process.env.DB_PATH || join(process.cwd(), '..', 'database', 'metrics.db');
const db = new Database(dbPath, { create: true });
db.exec("PRAGMA journal_mode=WAL;");

// Initialize database schema
db.run(`
  CREATE TABLE IF NOT EXISTS timeseries_metrics (
    date TEXT,
    metric_name TEXT,
    raw_value REAL,
    normalized_value REAL,
    btc_price REAL,
    PRIMARY KEY (metric_name, date)
  )
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_metric_date 
  ON timeseries_metrics (metric_name, date)
`);

db.run(`
  CREATE TABLE IF NOT EXISTS metric_config (
    metric_name TEXT PRIMARY KEY,
    t_minus_2 REAL,
    t_minus_1 REAL,
    t_zero REAL,
    t_plus_1 REAL,
    t_plus_2 REAL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS audit_indicator_stats (
    metric_name TEXT NOT NULL,
    run_date TEXT NOT NULL,
    count INTEGER,
    mean REAL,
    std REAL,
    skewness REAL,
    kurtosis REAL,
    p2_5 REAL,
    p5 REAL,
    p25 REAL,
    p50 REAL,
    p75 REAL,
    p95 REAL,
    p97_5 REAL,
    min_val REAL,
    max_val REAL,
    pct_at_plus2 REAL,
    pct_at_minus2 REAL,
    PRIMARY KEY (metric_name, run_date)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS audit_correlation_matrix (
    metric_a TEXT NOT NULL,
    metric_b TEXT NOT NULL,
    run_date TEXT NOT NULL,
    pearson REAL,
    spearman REAL,
    PRIMARY KEY (metric_a, metric_b, run_date)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS audit_composite_params (
    run_date TEXT NOT NULL PRIMARY KEY,
    raw_min REAL,
    raw_max REAL,
    raw_p2_5 REAL,
    raw_p50 REAL,
    raw_p97_5 REAL,
    rescale_method TEXT DEFAULT 'percentile_piecewise'
  )
`);

// Metric categories mapping
const METRIC_CATEGORIES: Record<string, string> = {
  aviv_ratio: 'fundamental',
  aviv_nupl: 'fundamental',
  cvdd_ratio: 'fundamental',
  mvrv_z: 'fundamental',
  lth_sth_sopr_ratio: 'fundamental',
  terminal_price_ratio: 'fundamental',
  unrealized_sell_risk: 'fundamental',
  sharpe_ratio_52w: 'technical',
  pi_cycle_top: 'technical',
  vpli: 'technical',
  risk_metrics: 'technical',
  dvrsi: 'technical',
  williams_r: 'technical',
  two_year_ma: 'technical',
  ahr999: 'technical',
  fear_greed_og: 'sentiment',
  fear_greed_cmc: 'sentiment',
};

// Seed metric config data
const SEED_DATA = [
  ['aviv_ratio', -2.0, -1.0, null, 1.0, 2.0],
  ['aviv_nupl', -0.6, -0.3, null, 0.3, 0.5],
  ['cvdd_ratio', 1.3, 1.6, null, null, null],
  ['mvrv_z', 0.15, 0.17, null, 4.6, 6.65],
  ['lth_sth_sopr_ratio', 0.73, 0.99, null, 3.2, 6.9],
  ['terminal_price_ratio', 1.0, 0.75, null, 0.25, 0.17],
  ['unrealized_sell_risk', null, null, null, 1.8, 2.2],
  ['sharpe_ratio_52w', -20.0, -10.0, null, 42.0, 53.0],
  ['pi_cycle_top', 0.35, 0.45, null, 0.7, 0.95],
  ['vpli', 45.0, 50.0, null, 70.0, 80.0],
  ['risk_metrics', 0.13, 0.33, null, 0.75, 0.85],
  ['dvrsi', 42.0, 50.0, null, 65.0, 73.0],
  ['williams_r', -80.0, -70.0, null, null, null],
  ['two_year_ma', 0.7, 1.0, null, 3.0, 4.2],
  ['ahr999', 0.45, 0.7, null, 2.9, 5.47],
  ['fear_greed_og', 30.0, 50.0, null, 60.0, 70.0],
  ['fear_greed_cmc', 20.0, 40.0, null, 60.0, 80.0]
];

try {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO metric_config
    (metric_name, t_plus_2, t_plus_1, t_zero, t_minus_1, t_minus_2)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  db.transaction(() => {
    for (const row of SEED_DATA) {
      stmt.run(row[0], row[1], row[2], row[3], row[4], row[5]);
    }
  })();
} catch (err) {
  console.error("Failed to seed metrics configuration:", err);
}

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', version: '1.0.0' });
});

// GET /api/metrics — List all available metrics with latest info
app.get('/api/metrics', (c) => {
  try {
    const stmt = db.query(`
      SELECT t.metric_name, t.date, t.raw_value, t.normalized_value
      FROM timeseries_metrics t
      INNER JOIN (
        SELECT metric_name, MAX(date) as max_date
        FROM timeseries_metrics
        GROUP BY metric_name
      ) latest ON t.metric_name = latest.metric_name AND t.date = latest.max_date
    `);
    const rows = stmt.all() as any[];
    
    // Map rows and add category
    const result = rows.map(row => ({
      name: row.metric_name,
      date: row.date,
      raw_value: row.raw_value,
      normalized_value: row.normalized_value,
      category: METRIC_CATEGORIES[row.metric_name] || 'unknown'
    }));
    
    return c.json(result);
  } catch (err) {
    console.error('Error fetching metrics list:', err);
    return c.json({ error: 'Failed to retrieve metrics' }, 500);
  }
});

// GET /api/metrics/configs — Get all metric configs in bulk
app.get('/api/metrics/configs', (c) => {
  try {
    const stmt = db.query(`
      SELECT metric_name, t_minus_2, t_minus_1, t_zero, t_plus_1, t_plus_2
      FROM metric_config
    `);
    const results = stmt.all();
    return c.json(results);
  } catch (err) {
    console.error('Error fetching metric configs:', err);
    return c.json({ error: 'Failed to fetch metric configs' }, 500);
  }
});

function rescale(rawVal: number, params: { raw_p2_5: number, raw_p50: number, raw_p97_5: number }): number {
  const { raw_p2_5, raw_p50, raw_p97_5 } = params;
  if (rawVal <= raw_p2_5) return -2.0;
  if (rawVal >= raw_p97_5) return 2.0;
  if (rawVal < raw_p50) {
    const denom = raw_p50 - raw_p2_5;
    return Math.abs(denom) < 1e-9 ? -2.0 : -2.0 + 2.0 * (rawVal - raw_p2_5) / denom;
  } else {
    const denom = raw_p97_5 - raw_p50;
    return Math.abs(denom) < 1e-9 ? 2.0 : 0.0 + 2.0 * (rawVal - raw_p50) / denom;
  }
}

// GET /api/composite — Get composite oscillator values
app.get('/api/composite', (c) => {
  try {
    const start = c.req.query('start');
    const end = c.req.query('end');
    
    let queryStr = `
      SELECT 
        date, 
        AVG(normalized_value) as composite_value, 
        COUNT(normalized_value) as component_count, 
        MAX(btc_price) as btc_price
      FROM timeseries_metrics
      WHERE normalized_value IS NOT NULL
    `;
    
    const params: any[] = [];
    if (start) {
      queryStr += ` AND date >= ?`;
      params.push(start);
    }
    if (end) {
      queryStr += ` AND date <= ?`;
      params.push(end);
    }
    
    queryStr += `
      GROUP BY date
      ORDER BY date ASC
    `;
    
    const stmt = db.query(queryStr);
    const results = stmt.all(...params) as any[];

    // Fetch latest composite params for rescaling
    let compParams: { raw_p2_5: number, raw_p50: number, raw_p97_5: number } | null = null;
    try {
      const paramsStmt = db.query(`
        SELECT raw_p2_5, raw_p50, raw_p97_5 
        FROM audit_composite_params 
        ORDER BY run_date DESC 
        LIMIT 1
      `);
      const row = paramsStmt.get() as any;
      if (row) {
        compParams = {
          raw_p2_5: row.raw_p2_5,
          raw_p50: row.raw_p50,
          raw_p97_5: row.raw_p97_5
        };
      }
    } catch (err) {
      console.warn("Could not fetch composite rescaling parameters:", err);
    }

    const mappedResults = results.map(row => {
      const rawVal = row.composite_value;
      const rescaledVal = compParams ? rescale(rawVal, compParams) : rawVal;
      return {
        date: row.date,
        composite_value: rescaledVal,
        raw_composite_value: rawVal,
        component_count: row.component_count,
        btc_price: row.btc_price
      };
    });
    
    return c.json(mappedResults);
  } catch (err) {
    console.error('Error fetching composite metrics:', err);
    return c.json({ error: 'Failed to retrieve composite metrics' }, 500);
  }
});

// GET /api/audit/summary — Get latest statistical audit summary
app.get('/api/audit/summary', (c) => {
  try {
    // 1. Get latest run date
    let latestDateRow: { max_date: string | null } | undefined;
    try {
      latestDateRow = db.query(`
        SELECT MAX(run_date) as max_date 
        FROM audit_composite_params
      `).get() as any;
    } catch (err) {
      console.warn("Could not query latest audit run date:", err);
    }
    
    const runDate = latestDateRow?.max_date;
    
    if (!runDate) {
      return c.json({ error: "No audit data available. Run the audit pipeline first." }, 404);
    }
    
    // 2. Fetch composite params
    const compositeParams = db.query(`
      SELECT raw_min, raw_max, raw_p2_5, raw_p50, raw_p97_5, rescale_method
      FROM audit_composite_params
      WHERE run_date = ?
    `).get(runDate);
    
    // 3. Fetch indicator stats
    const indicatorStats = db.query(`
      SELECT metric_name, count, mean, std, skewness, kurtosis,
             p2_5, p5, p25, p50, p75, p95, p97_5, min_val, max_val,
             pct_at_plus2, pct_at_minus2
      FROM audit_indicator_stats
      WHERE run_date = ?
    `).all(runDate);
    
    // 4. Fetch correlations
    const correlations = db.query(`
      SELECT metric_a, metric_b, pearson, spearman
      FROM audit_correlation_matrix
      WHERE run_date = ?
    `).all(runDate);
    
    return c.json({
      run_date: runDate,
      composite_params: compositeParams,
      indicator_stats: indicatorStats,
      correlations: correlations
    });
  } catch (err) {
    console.error('Error fetching audit summary:', err);
    return c.json({ error: 'Failed to retrieve audit summary' }, 500);
  }
});

// GET /api/metrics/:metric_name — Get time-series data for a metric
app.get('/api/metrics/:metric_name', (c) => {
  try {
    const metric_name = c.req.param('metric_name');
    
    // Check if it's a known metric or btc_ohlc
    if (metric_name === 'btc_ohlc') {
      const rows = db.prepare(`
        SELECT date, open, high, low, close 
        FROM btc_ohlc 
        ORDER BY date ASC
      `).all() as any[];
      return c.json(rows);
    }
    
    if (!METRIC_CATEGORIES[metric_name]) {
      return c.json({ error: `Invalid metric name: ${metric_name}` }, 400);
    }
    
    const query = db.query(`
      SELECT date, raw_value, normalized_value, btc_price 
      FROM timeseries_metrics 
      WHERE metric_name = ?
      ORDER BY date ASC
    `);
    const results = query.all(metric_name);
    return c.json(results);
  } catch (err) {
    console.error('Database query error:', err);
    return c.json({ error: 'Failed to retrieve metrics data' }, 500);
  }
});

// Endpoint for BTC OHLC data (preserved for direct mapping if frontend calls /api/metrics/btc_ohlc specifically)
app.get('/api/metrics/btc_ohlc', (c) => {
  try {
    const rows = db.prepare(`
      SELECT date, open, high, low, close 
      FROM btc_ohlc 
      ORDER BY date ASC
    `).all() as any[];
    return c.json(rows);
  } catch (error) {
    console.error('Error fetching BTC OHLC:', error);
    return c.json({ error: 'Failed to fetch BTC OHLC data' }, 500);
  }
});

// Endpoint to save metric config
app.post('/api/metrics/config', async (c) => {
  try {
    const body = await c.req.json();
    const { metric_name, t_minus_2, t_minus_1, t_zero, t_plus_1, t_plus_2 } = body;
    
    if (!metric_name) {
      return c.json({ error: 'metric_name is required' }, 400);
    }
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO metric_config 
      (metric_name, t_minus_2, t_minus_1, t_zero, t_plus_1, t_plus_2)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(metric_name, t_minus_2, t_minus_1, t_zero, t_plus_1, t_plus_2);
    
    return c.json({ success: true });
  } catch (err) {
    console.error('Error saving metric config:', err);
    return c.json({ error: 'Failed to save metric config' }, 500);
  }
});

// Endpoint to get metric config
app.get('/api/metrics/config/:metric_name', (c) => {
  try {
    const metric_name = c.req.param('metric_name');
    
    const stmt = db.prepare(`
      SELECT metric_name, t_minus_2, t_minus_1, t_zero, t_plus_1, t_plus_2
      FROM metric_config
      WHERE metric_name = ?
    `);
    
    const result = stmt.get(metric_name);
    
    if (!result) {
      return c.json(null);
    }
    
    return c.json(result);
  } catch (err) {
    console.error('Error fetching metric config:', err);
    return c.json({ error: 'Failed to fetch metric config' }, 500);
  }
});

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};

export { app };