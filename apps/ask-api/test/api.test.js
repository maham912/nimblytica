import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { defineQueries, makeDataset, QUERIES, UnsafeQuery } from "../catalog.js";
import { fromSqlite, query, QueryTimeout, seed, takeHit } from "../store.js";

const require = createRequire(import.meta.url);
const page = require("../../ask-demo/ask.js");

const SAFE_SQL = "SELECT site FROM monthly_site_operations WHERE month = ? LIMIT 10";
const HOUR_MS = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 30, 12);

async function openStore() {
  const database = new DatabaseSync(":memory:");
  const db = fromSqlite(database);
  await seed(db);
  return { database, db };
}

function probe(sql, bind = (month) => [month]) {
  return { probe: { title: "Probe", match: /probe/, about: "probe", sql, bind, rows: () => [], summarize: () => "" } };
}

test("defineQueries rejects a template that writes, chains, comments, leaves the table, or overfetches", () => {
  const unsafe = [
    probe("DELETE FROM monthly_site_operations WHERE month = ? LIMIT 10"),
    probe("SELECT site FROM monthly_site_operations WHERE month = ? UNION SELECT site FROM monthly_site_operations WHERE month = ? LIMIT 10", (month) => [month, month]),
    probe(`${SAFE_SQL}; SELECT site FROM monthly_site_operations WHERE month = ? LIMIT 10`, (month) => [month, month]),
    probe("SELECT site -- staff\nFROM monthly_site_operations WHERE month = ? LIMIT 10"),
    probe("SELECT salary FROM payroll WHERE month = ? LIMIT 10"),
    probe("SELECT site FROM monthly_site_operations, payroll WHERE month = ? LIMIT 10"),
    probe("SELECT site FROM monthly_site_operations JOIN staff_salaries WHERE month = ? LIMIT 10"),
    probe("SELECT site FROM monthly_site_operations WHERE month = ? LIMIT 1001"),
    probe("SELECT site FROM monthly_site_operations WHERE month = ? AND site = ? LIMIT 10")
  ];
  for (const entries of unsafe) {
    assert.throws(() => defineQueries(entries), UnsafeQuery, entries.probe.sql);
  }
  assert.doesNotThrow(() => defineQueries(probe(SAFE_SQL)));
});

test("the shipped registry loads five read-only queries", () => {
  assert.deepEqual(Object.keys(QUERIES), ["overtime", "deliveries", "fuel", "headcount", "detention"]);
  for (const [name, entry] of Object.entries(QUERIES)) {
    assert.doesNotThrow(() => defineQueries({ [name]: { ...entry } }), name);
  }
  assert.ok(Object.isFrozen(QUERIES));
});

test("the API dataset matches the page dataset", () => {
  assert.deepEqual(makeDataset(), page.makeDataset());
});

test("seeding twice leaves the 96 fictional rows", async () => {
  const { database, db } = await openStore();
  await seed(db);
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM monthly_site_operations").get().n, 96);
});

test("query runs a registry template with its month and refuses every other string", async () => {
  const { db } = await openStore();
  const [top] = await query(db, QUERIES.deliveries.sql, QUERIES.deliveries.bind("2025-03"));
  assert.equal(top.site, "North Yard");
  assert.equal(top.late_deliveries, 36);
  for (const sql of ["SELECT * FROM ask_hits LIMIT 10", `${QUERIES.overtime.sql} `, "DROP TABLE monthly_site_operations"]) {
    await assert.rejects(query(db, sql, []), /Only registry queries/, sql);
  }
});

test("a query on a stalled engine gives up after five seconds", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pending = query({ all: () => new Promise(() => {}) }, QUERIES.headcount.sql, ["2026-10"]);
  t.mock.timers.tick(5000);
  await assert.rejects(pending, QueryTimeout);
});

test("takeHit admits ten questions per key in any rolling hour", async () => {
  const { db } = await openStore();
  for (let expected = 9; expected >= 0; expected -= 1) {
    assert.deepEqual(await takeHit(db, "198.51.100.1", T0), { admitted: true, remaining: expected });
  }
  assert.deepEqual(await takeHit(db, "198.51.100.1", T0), { admitted: false, remaining: 0 });
  assert.equal((await takeHit(db, "198.51.100.2", T0)).admitted, true);
  assert.equal((await takeHit(db, "198.51.100.1", T0 + HOUR_MS - 1)).admitted, false);
  assert.deepEqual(await takeHit(db, "198.51.100.1", T0 + HOUR_MS + 1), { admitted: true, remaining: 9 });
});
