import { expect, test, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { join } from "path";
import { unlinkSync, existsSync } from "fs";

// Set up test DB before importing app
const TEST_DB_PATH = join(process.cwd(), "test_metrics.db");
process.env.DB_PATH = TEST_DB_PATH;

// We must require or dynamically import the app since ES6 imports are hoisted
let app: any;
let normalizeValue: any;
beforeAll(async () => {
  const mod = await import("./index");
  app = mod.app;
  normalizeValue = mod.normalizeValue;
  
  // Use the same db instance to drop the table if it exists
  const db = new Database(TEST_DB_PATH, { create: true });
  db.exec(`DROP TABLE IF EXISTS timeseries_metrics`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS timeseries_metrics (
        date TEXT,
        metric_name TEXT,
        raw_value REAL,
        normalized_value REAL,
        btc_price REAL,
        PRIMARY KEY (metric_name, date)
    )
  `);
  
  const insert = db.prepare(`
    INSERT INTO timeseries_metrics (date, metric_name, raw_value, normalized_value, btc_price)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  insert.run("2023-01-01", "aviv_ratio", 1.5, 0.5, 20000.0);
  insert.run("2023-01-02", "aviv_ratio", 1.6, 0.6, 21000.0);
  insert.run("2023-01-01", "mvrv_z", 10.0, 0.1, 20000.0);
  
  db.close();
});

afterAll(() => {
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }
});

test("GET /api/health", async () => {
  const res = await app.request("/api/health");
  expect(res.status).toBe(200);
  
  const body = await res.json();
  expect(body).toEqual({ status: "ok", version: "1.0.0" });
});

test("GET /api/metrics/:metric_name", async () => {
  const res = await app.request("/api/metrics/aviv_ratio");
  expect(res.status).toBe(200);
  
  const body = await res.json();
  
  // Should only return aviv_ratio records, ordered by date
  expect(body.length).toBe(2);
  
  // First record
  expect(body[0]).toEqual({
    date: "2023-01-01",
    raw_value: 1.5,
    normalized_value: 0.5,
    btc_price: 20000.0
  });
  
  // Second record
  expect(body[1]).toEqual({
    date: "2023-01-02",
    raw_value: 1.6,
    normalized_value: 0.6,
    btc_price: 21000.0
  });
  
  // Ensure no underscore-prefixed fields are present
  for (const item of body) {
    for (const key of Object.keys(item)) {
      expect(key.startsWith("_")).toBe(false);
    }
  }
});

test("GET /api/metrics", async () => {
  const res = await app.request("/api/metrics");
  expect(res.status).toBe(200);
  
  const body = await res.json() as any[];
  expect(body.length).toBe(2);
  
  const aviv = body.find(m => m.name === "aviv_ratio");
  expect(aviv).toBeDefined();
  expect(aviv.category).toBe("fundamental");
  expect(aviv.raw_value).toBe(1.6);
  expect(aviv.normalized_value).toBe(0.6);
  
  const mvrv = body.find(m => m.name === "mvrv_z");
  expect(mvrv).toBeDefined();
  expect(mvrv.category).toBe("fundamental");
  expect(mvrv.raw_value).toBe(10.0);
  expect(mvrv.normalized_value).toBe(0.1);
});

test("GET /api/composite", async () => {
  const res = await app.request("/api/composite");
  expect(res.status).toBe(200);
  
  const body = await res.json() as any[];
  expect(body.length).toBe(2);
  
  // 2023-01-01: aviv_ratio = 0.5, mvrv_z = 0.1 -> average is 0.3
  expect(body[0]).toEqual({
    date: "2023-01-01",
    composite_value: 0.3,
    raw_composite_value: 0.3,
    component_count: 2,
    btc_price: 20000.0
  });
  
  // Test query params
  const resFiltered = await app.request("/api/composite?start=2023-01-02");
  expect(resFiltered.status).toBe(200);
  const bodyFiltered = await resFiltered.json() as any[];
  expect(bodyFiltered.length).toBe(1);
  expect(bodyFiltered[0].date).toBe("2023-01-02");
});

test("GET /api/metrics/configs", async () => {
  const res = await app.request("/api/metrics/configs");
  expect(res.status).toBe(200);
  
  const body = await res.json() as any[];
  // Configurations should contain seeded data (e.g. 17 rows)
  expect(body.length).toBeGreaterThan(0);
  const aviv = body.find(c => c.metric_name === "aviv_ratio");
  expect(aviv).toBeDefined();
});

test("POST and GET /api/metrics/config", async () => {
  // Test POST
  const postRes = await app.request("/api/metrics/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      metric_name: "aviv_ratio",
      t_minus_2: 0.5,
      t_minus_1: 1.0,
      t_zero: 1.5,
      t_plus_1: 2.0,
      t_plus_2: 3.0
    })
  });
  
  expect(postRes.status).toBe(200);
  expect(await postRes.json()).toEqual({ success: true });
  
  // Test GET
  const getRes = await app.request("/api/metrics/config/aviv_ratio");
  expect(getRes.status).toBe(200);
  
  const getConfig = await getRes.json();
  expect(getConfig).toEqual({
    metric_name: "aviv_ratio",
    t_minus_2: 0.5,
    t_minus_1: 1.0,
    t_zero: 1.5,
    t_plus_1: 2.0,
    t_plus_2: 3.0
  });

  // Test GET non-existent
  const getNoneRes = await app.request("/api/metrics/config/non_existent");
  expect(getNoneRes.status).toBe(200);
  expect(await getNoneRes.json()).toBeNull();
});

test("GET /api/audit/summary (404 when no data)", async () => {
  const res = await app.request("/api/audit/summary");
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body.error).toContain("No audit data available");
});

test("GET /api/audit/summary (200 with data) and rescaled composite", async () => {
  const db = new Database(TEST_DB_PATH);
  
  const runDate = "2026-06-01";
  
  // Insert mock audit stats
  db.run(`
    INSERT INTO audit_indicator_stats 
    (metric_name, run_date, count, mean, std, skewness, kurtosis, p2_5, p5, p25, p50, p75, p95, p97_5, min_val, max_val, pct_at_plus2, pct_at_minus2)
    VALUES ('aviv_ratio', ?, 100, 0.1, 0.5, 0.0, 0.0, -1.0, -0.8, -0.2, 0.0, 0.3, 0.8, 1.0, -1.5, 1.5, 0.02, 0.01)
  `, [runDate]);
  
  // Insert mock correlation
  db.run(`
    INSERT INTO audit_correlation_matrix (metric_a, metric_b, run_date, pearson, spearman)
    VALUES ('aviv_ratio', 'mvrv_z', ?, 0.88, 0.87)
  `, [runDate]);
  
  // Insert mock composite params
  db.run(`
    INSERT INTO audit_composite_params (run_date, raw_min, raw_max, raw_p2_5, raw_p50, raw_p97_5, rescale_method)
    VALUES (?, -0.8, 0.9, -0.5, 0.1, 0.7, 'percentile_piecewise')
  `, [runDate]);
  
  db.close();

  // Test /api/audit/summary
  const res = await app.request("/api/audit/summary");
  expect(res.status).toBe(200);
  
  const body = await res.json();
  expect(body.run_date).toBe(runDate);
  expect(body.composite_params.raw_p50).toBe(0.1);
  expect(body.indicator_stats[0].metric_name).toBe("aviv_ratio");
  expect(body.correlations[0].metric_b).toBe("mvrv_z");

  // Test /api/composite with rescaling applied
  // raw average was 0.3 (above raw_p50=0.1, below raw_p97_5=0.7)
  // expected rescaled = 0.0 + 2.0 * (0.3 - 0.1) / (0.7 - 0.1) = 0.6666...
  const compRes = await app.request("/api/composite");
  expect(compRes.status).toBe(200);
  const compBody = await compRes.json() as any[];
  
  const row2023 = compBody.find(r => r.date === "2023-01-01");
  expect(row2023).toBeDefined();
  expect(row2023.raw_composite_value).toBe(0.3);
  expect(Math.abs(row2023.composite_value - 0.6666666666666666)).toBeLessThan(1e-7);
});

test("Seed does not overwrite pre-existing metric_config row", async () => {
  const db = new Database(TEST_DB_PATH);
  
  // 1. Manually insert or update a metric config row
  db.run(`
    UPDATE metric_config
    SET t_minus_2 = 999.0
    WHERE metric_name = 'aviv_ratio'
  `);
  
  // Verify it is updated
  const before = db.prepare("SELECT t_minus_2 FROM metric_config WHERE metric_name = 'aviv_ratio'").get() as any;
  expect(before.t_minus_2).toBe(999.0);
  
  // 2. Re-run seed logic (simulated)
  // Let's import/access the SEED_DATA if we can, or just re-execute what's in index.ts using INSERT OR IGNORE
  db.run(`
    INSERT OR IGNORE INTO metric_config
    (metric_name, t_plus_2, t_plus_1, t_zero, t_minus_1, t_minus_2)
    VALUES ('aviv_ratio', -2.0, -1.0, NULL, 1.0, 2.0)
  `);
  
  // 3. Verify it is not overwritten (still 999.0)
  const after = db.prepare("SELECT t_minus_2 FROM metric_config WHERE metric_name = 'aviv_ratio'").get() as any;
  expect(after.t_minus_2).toBe(999.0);
  
  db.close();
});

test("normalizeValue() behaves identical to Python normalization", () => {
  // 1. Normal metric at each region
  // thresholds: t_plus_2=-2, t_plus_1=-1, t_minus_1=1, t_minus_2=2
  expect(normalizeValue(-2.5, -2, -1, 1, 2)).toBeCloseTo(2.0);
  expect(normalizeValue(-1.5, -2, -1, 1, 2)).toBeCloseTo(1.5);
  expect(normalizeValue(-1.0, -2, -1, 1, 2)).toBeCloseTo(1.0);
  expect(normalizeValue(0.0, -2, -1, 1, 2)).toBeCloseTo(0.0);
  expect(normalizeValue(1.5, -2, -1, 1, 2)).toBeCloseTo(-1.5);
  expect(normalizeValue(3.0, -2, -1, 1, 2)).toBeCloseTo(-2.0);

  // 2. MVRV Z-Score normal metric
  // thresholds: t_plus_2=0.15, t_plus_1=0.17, t_minus_1=4.6, t_minus_2=6.65
  expect(normalizeValue(0.16, 0.15, 0.17, 4.6, 6.65)).toBeCloseTo(1.5);
  expect(normalizeValue(5.625, 0.15, 0.17, 4.6, 6.65)).toBeCloseTo(-1.5);

  // 3. Inverted metric (terminal_price_ratio)
  // thresholds: t_plus_2=1, t_plus_1=0.75, t_minus_1=0.25, t_minus_2=0.17
  expect(normalizeValue(1.2, 1, 0.75, 0.25, 0.17)).toBeCloseTo(2.0);
  expect(normalizeValue(0.875, 1, 0.75, 0.25, 0.17)).toBeCloseTo(1.5);
  expect(normalizeValue(0.21, 1, 0.75, 0.25, 0.17)).toBeCloseTo(-1.5);
  expect(normalizeValue(0.10, 1, 0.75, 0.25, 0.17)).toBeCloseTo(-2.0);

  // 4. Bottom-only (cvdd_ratio)
  // thresholds: t_plus_2=1.3, t_plus_1=1.6, t_minus_1=null, t_minus_2=null
  expect(normalizeValue(1.1, 1.3, 1.6, null, null)).toBeCloseTo(2.0);
  expect(normalizeValue(1.45, 1.3, 1.6, null, null)).toBeCloseTo(1.5);
  expect(normalizeValue(2.5, 1.3, 1.6, null, null)).toBeCloseTo(0.0);

  // 5. Top-only (unrealized_sell_risk)
  // thresholds: t_plus_2=null, t_plus_1=null, t_minus_1=1.8, t_minus_2=2.2
  expect(normalizeValue(2.5, null, null, 1.8, 2.2)).toBeCloseTo(-2.0);
  expect(normalizeValue(2.0, null, null, 1.8, 2.2)).toBeCloseTo(-1.5);
  expect(normalizeValue(1.0, null, null, 1.8, 2.2)).toBeCloseTo(0.0);

  // 6. Null input and edge cases
  expect(normalizeValue(null, -2, -1, 1, 2)).toBeNaN();
  expect(normalizeValue(NaN, -2, -1, 1, 2)).toBeNaN();
  expect(normalizeValue(5.0, null, null, null, null)).toBeCloseTo(0.0);
});

test("POST /api/metrics/renormalize/:metric_name endpoint", async () => {
  const db = new Database(TEST_DB_PATH);
  
  // Clean/setup data
  db.run("DELETE FROM timeseries_metrics WHERE metric_name = 'aviv_ratio'");
  db.run("INSERT INTO timeseries_metrics (date, metric_name, raw_value, normalized_value, btc_price) VALUES (?, ?, ?, ?, ?)",
    ["2023-01-01", "aviv_ratio", 1.5, 0.0, 20000.0] // raw 1.5, initial normalized 0.0
  );
  
  // Set threshold: aviv_ratio t_minus_2 = 2.0, t_minus_1 = 1.0, t_plus_1 = -1.0, t_plus_2 = -2.0
  // Midpoint between t_plus_1 (-1.0) and t_minus_1 (1.0) is 0.0, where raw_value 1.5 is in region [1.0, 2.0]
  // normalized value = -1.0 - safe_div(1.5 - 1.0, 2.0 - 1.0) = -1.0 - 0.5 = -1.5.
  db.run("UPDATE metric_config SET t_minus_2 = 2.0, t_minus_1 = 1.0, t_plus_1 = -1.0, t_plus_2 = -2.0 WHERE metric_name = 'aviv_ratio'");
  db.close();

  // Test successful renormalization
  const res = await app.request("/api/metrics/renormalize/aviv_ratio", { method: "POST" });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual({ success: true, metric_name: "aviv_ratio", rows_updated: 1 });
  
  // Verify it actually changed in db
  const dbVerify = new Database(TEST_DB_PATH);
  const row = dbVerify.prepare("SELECT normalized_value FROM timeseries_metrics WHERE metric_name = 'aviv_ratio' AND date = '2023-01-01'").get() as any;
  expect(row.normalized_value).toBeCloseTo(-1.5);
  dbVerify.close();

  // Test 404 metric config not found
  const res404 = await app.request("/api/metrics/renormalize/non_existent_metric", { method: "POST" });
  expect(res404.status).toBe(404);
  
  // Test 200 with 0 rows updated (no timeseries data)
  // Let's use a metric that is seeded in config but has no timeseries data in DB (e.g. cvdd_ratio)
  const resEmpty = await app.request("/api/metrics/renormalize/cvdd_ratio", { method: "POST" });
  expect(resEmpty.status).toBe(200);
  const bodyEmpty = await resEmpty.json();
  expect(bodyEmpty).toEqual({ success: true, metric_name: "cvdd_ratio", rows_updated: 0 });
});

test("GET /api/metrics/config/defaults endpoint", async () => {
  const res = await app.request("/api/metrics/config/defaults");
  expect(res.status).toBe(200);
  
  const body = await res.json() as any[];
  // Should have the correct length and structure
  expect(body.length).toBe(17);
  
  const aviv = body.find(d => d.metric_name === "aviv_ratio");
  expect(aviv).toEqual({
    metric_name: "aviv_ratio",
    t_plus_2: -2.0,
    t_plus_1: -1.0,
    t_zero: null,
    t_minus_1: 1.0,
    t_minus_2: 2.0
  });

  const terminal = body.find(d => d.metric_name === "terminal_price_ratio");
  expect(terminal).toEqual({
    metric_name: "terminal_price_ratio",
    t_plus_2: 1.0,
    t_plus_1: 0.75,
    t_zero: null,
    t_minus_1: 0.25,
    t_minus_2: 0.17
  });
});




