import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { defineQueries, makeDataset, QUERIES, UnsafeQuery } from "../catalog.js";

const require = createRequire(import.meta.url);
const page = require("../../ask-demo/ask.js");

const SAFE_SQL = "SELECT site FROM monthly_site_operations WHERE month = ? LIMIT 10";

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
