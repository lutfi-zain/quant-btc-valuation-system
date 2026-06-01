import { Hono } from 'hono';
import { Database } from 'bun:sqlite';
import { join } from 'path';

const app = new Hono();

// Connect to SQLite DB
const dbPath = process.env.DB_PATH || join(process.cwd(), '..', 'database', 'metrics.db');
const db = new Database(dbPath, { create: true });
db.exec("PRAGMA journal_mode=WAL;");

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', version: '1.0.0' });
});

app.get('/api/metrics/aviv_ratio', (c) => {
  try {
    const query = db.query(`
      SELECT date, raw_value, normalized_value, btc_price 
      FROM timeseries_metrics 
      WHERE metric_name = 'aviv_ratio'
      ORDER BY date ASC
    `);
    const results = query.all();
    
    // The columns selected explicitly map to output fields without underscore prefixes
    // Results is an array of objects like { date: '...', raw_value: 123, ... }
    return c.json(results);
  } catch (err) {
    console.error('Database query error:', err);
    return c.json({ error: 'Failed to retrieve metrics data' }, 500);
  }
});

// Endpoint for BTC OHLC data
app.get('/api/metrics/btc_ohlc', (c) => {
  try {
    const rows = db.prepare(`
      SELECT date, open, high, low, close 
      FROM btc_ohlc 
      ORDER BY date ASC
    `).all() as any[];

    // Ensure SerializerV2 compatibility (no underscore fields)
    const formattedData = rows.map(row => ({
      date: row.date,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close
    }));

    return c.json(formattedData);
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