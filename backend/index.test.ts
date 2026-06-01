import { expect, test, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { join } from "path";
import { unlinkSync, existsSync } from "fs";

// Set up test DB before importing app
const TEST_DB_PATH = join(process.cwd(), "test_metrics.db");
process.env.DB_PATH = TEST_DB_PATH;

// We must require or dynamically import the app since ES6 imports are hoisted
let app: any;
beforeAll(async () => {
  const mod = await import("./index");
  app = mod.app;
  
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
  insert.run("2023-01-01", "other_metric", 10.0, 0.1, 20000.0);
  
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

test("GET /api/metrics/aviv_ratio", async () => {
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

test("POST and GET /api/metrics/config", async () => {
  const db = new Database(process.env.DB_PATH!);
  db.exec(`
    CREATE TABLE IF NOT EXISTS metric_config (
        metric_name TEXT PRIMARY KEY,
        t_minus_2 REAL,
        t_minus_1 REAL,
        t_zero REAL,
        t_plus_1 REAL,
        t_plus_2 REAL
    )
  `);
  db.close();

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
