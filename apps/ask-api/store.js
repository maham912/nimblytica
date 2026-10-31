import { DATASET, QUERIES, TABLE } from "./catalog.js";

export const RATE_LIMIT = 10;
export const RATE_WINDOW_MS = 60 * 60 * 1000;
export const QUERY_TIMEOUT_MS = 5000;
const D1_MAX_BOUND_PARAMS = 100;

const COLUMNS = {
  month: "TEXT NOT NULL",
  site: "TEXT NOT NULL",
  headcount: "INTEGER NOT NULL",
  loads: "INTEGER NOT NULL",
  late_deliveries: "INTEGER NOT NULL",
  on_time_pct: "REAL NOT NULL",
  operating_overtime_hours: "INTEGER NOT NULL",
  finance_overtime_hours: "INTEGER NOT NULL",
  detention_fees: "INTEGER NOT NULL",
  fuel_spend: "INTEGER NOT NULL"
};
const NAMES = Object.keys(COLUMNS);

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS ${TABLE} (${NAMES.map((name) => `${name} ${COLUMNS[name]}`).join(", ")}, PRIMARY KEY (month, site))`,
  "CREATE TABLE IF NOT EXISTS ask_hits (ip TEXT NOT NULL, at_ms INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS ask_hits_ip_at ON ask_hits (ip, at_ms)"
];

const HIT_SQL = `INSERT INTO ask_hits (ip, at_ms)
SELECT ?, ?
WHERE (
  SELECT COUNT(*) FROM ask_hits
  WHERE ip = ? AND at_ms > ? AND at_ms <= ?
) < ${RATE_LIMIT}
RETURNING (
  SELECT COUNT(*) FROM ask_hits
  WHERE ip = ? AND at_ms > ? AND at_ms <= ?
) AS used`;

const TEMPLATES = new Set(Object.values(QUERIES).map((entry) => entry.sql));

export class QueryTimeout extends Error {}

export function fromSqlite(database) {
  return {
    all: async (sql, params) => database.prepare(sql).all(...params),
    batch: async (statements) => {
      database.exec("BEGIN");
      try {
        for (const [sql, params] of statements) database.prepare(sql).run(...params);
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    }
  };
}

export function fromD1(binding) {
  return {
    all: async (sql, params) => (await binding.prepare(sql).bind(...params).all()).results,
    batch: async (statements) => {
      await binding.batch(statements.map(([sql, params]) => binding.prepare(sql).bind(...params)));
    }
  };
}

export function seed(db) {
  const rowsPerInsert = Math.floor(D1_MAX_BOUND_PARAMS / NAMES.length);
  const placeholders = `(${NAMES.map(() => "?").join(", ")})`;
  const inserts = [];
  for (let start = 0; start < DATASET.rows.length; start += rowsPerInsert) {
    const chunk = DATASET.rows.slice(start, start + rowsPerInsert);
    inserts.push([
      `INSERT OR REPLACE INTO ${TABLE} (${NAMES.join(", ")}) VALUES ${chunk.map(() => placeholders).join(", ")}`,
      chunk.flatMap((row) => NAMES.map((name) => row[name]))
    ]);
  }
  return db.batch([...SCHEMA.map((sql) => [sql, []]), ...inserts]);
}

export async function takeHit(db, key, now) {
  const start = now - RATE_WINDOW_MS;
  const [row] = await db.all(HIT_SQL, [key, now, key, start, now, key, start, now]);
  return row ? { admitted: true, remaining: RATE_LIMIT - row.used } : { admitted: false, remaining: 0 };
}

export async function query(db, sql, params) {
  if (!TEMPLATES.has(sql)) throw new Error("Only registry queries may run.");
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new QueryTimeout("The query took longer than five seconds.")), QUERY_TIMEOUT_MS);
  });
  try {
    return await Promise.race([db.all(sql, params), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
