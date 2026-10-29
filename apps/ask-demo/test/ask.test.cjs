const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ask = require("../ask.js");

const docs = JSON.parse(fs.readFileSync(path.join(__dirname, "../docs/library.json"), "utf8")).documents;
const page = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

test("masks prompt text and does not load external analytics", () => {
  assert.match(page, /id="question"[^>]*data-clarity-mask/);
  assert.match(page, /id="conversation"[^>]*data-clarity-mask/);
  assert.doesNotMatch(page, /analytics\.js/);
});

test("builds a fictional four-site, 24-month dataset with the planned finance mismatch", () => {
  const data = ask.makeDataset();
  assert.equal(data.rows.length, 96);
  assert.equal(data.months.length, 24);
  assert.equal(new Set(data.rows.map((row) => row.site)).size, 4);
  assert.equal(data.rows.filter((row) => row.month === data.asOf).reduce((sum, row) => sum + row.headcount, 0), 122);
  const octoberNorthYard = data.rows.find((row) => row.month === data.asOf && row.site === "North Yard");
  assert.ok(octoberNorthYard.operating_overtime_hours > octoberNorthYard.finance_overtime_hours);
});

test("only fixed single SELECT templates with a result cap pass the query allowlist", () => {
  for (const sql of Object.values(ask.queryTemplates)) {
    assert.equal(ask.validateQuery(sql), true);
    assert.match(sql, /\bLIMIT 1000$/);
  }
  assert.equal(ask.validateQuery("DROP TABLE monthly_site_operations LIMIT 1000"), false);
  assert.equal(ask.validateQuery(`${ask.queryTemplates.overtime}; DROP TABLE records`), false);
  assert.equal(ask.validateQuery("SELECT * FROM records LIMIT 1001"), false);
});

test("returns mock metrics and citations without interpolating user SQL", () => {
  const result = ask.answerQuestion("Compare operating and finance overtime by site.", ask.makeDataset(), docs);
  assert.equal(result.kind, "data");
  assert.equal(result.rows.length, 4);
  assert.ok(result.citations.some((citation) => citation.source === "month-end-accrual-guide.md"));
  const hostile = ask.answerQuestion("overtime; DROP TABLE staff", ask.makeDataset(), docs);
  assert.equal(hostile.sql, ask.queryTemplates.overtime);
  assert.equal(hostile.sql.includes("DROP TABLE"), false);
});

test("retrieves a relevant fictional document for a policy question", () => {
  const result = ask.answerQuestion("What is the detention fee policy?", ask.makeDataset(), docs);
  assert.equal(result.kind, "docs");
  assert.equal(result.citations[0].source, "detention-fee-sop.md");
  assert.match(result.summary, /90-minute free window/);
});

test("applies a rolling ten-question browser-local hourly cap", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  };
  const now = 1_800_000_000_000;
  for (let count = 0; count < 10; count += 1) {
    assert.equal(ask.consumeQuestion(storage, now + count).allowed, true);
  }
  assert.equal(ask.consumeQuestion(storage, now + 10).allowed, false);
  assert.equal(ask.consumeQuestion(storage, now + 60 * 60 * 1000 + 1).allowed, true);
});

test("times out a slow mock query", async () => {
  await assert.rejects(ask.withTimeout(() => new Promise(() => {}), 10), /took too long/);
});
