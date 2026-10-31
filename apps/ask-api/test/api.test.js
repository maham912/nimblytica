import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { defineQueries, makeDataset, QUERIES, UnsafeQuery } from "../catalog.js";
import { handle } from "../handle.js";
import { AI_MODEL } from "../plan.js";
import worker from "../worker.js";
import { fromSqlite, query, QueryTimeout, seed, takeHit } from "../store.js";

const require = createRequire(import.meta.url);
const page = require("../../ask-demo/ask.js");

const SAFE_SQL = "SELECT site FROM monthly_site_operations WHERE month = ? LIMIT 10";
const HOUR_MS = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 30, 12);
const SENTINEL = "sk-test-sentinel-do-not-leak";
const LATE_MARCH = "Which site had the most late deliveries in March 2025?";
const STAFF = "How many staff are assigned to each site?";
const NORTH_YARD_MARCH_2025 = { label: "North Yard", value: 36, detail: "91.5% on time" };
const LOG_FIELDS = ["event", "status", "mode", "ms", "chars", "route", "fallback"];

async function openStore() {
  const database = new DatabaseSync(":memory:");
  const db = fromSqlite(database);
  await seed(db);
  return { database, db };
}

function post(question, { ip = "203.0.113.7", origin, body, url = "https://ask.example/ask" } = {}) {
  const headers = { "content-type": "application/json" };
  if (ip !== null) headers["cf-connecting-ip"] = ip;
  if (origin) headers.origin = origin;
  return new Request(url, { method: "POST", headers, body: body ?? JSON.stringify({ question }) });
}

async function ask(db, request, env = {}) {
  const response = await handle(request, env, db);
  const text = await response.text();
  return { response, text, body: JSON.parse(text) };
}

function captureLogs(t) {
  const log = t.mock.method(console, "log", () => {});
  return () => log.mock.calls.map((call) => call.arguments[0]);
}

function aiEnv(reply) {
  const calls = [];
  return {
    calls,
    AI: {
      async run(model, input) {
        calls.push({ model, input });
        return reply({ model, input });
      }
    }
  };
}

function modelReply(route) {
  return { response: JSON.stringify(route) };
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

test("a late-delivery question answers from the SQL rows for the month it names", async (t) => {
  captureLogs(t);
  const { response, body } = await ask((await openStore()).db, post(LATE_MARCH));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(body.mode, "mock");
  assert.equal(body.remaining, 9);
  assert.equal(body.answer.kind, "data");
  assert.equal(body.answer.intent, "deliveries");
  assert.equal(body.answer.rows.length, 4);
  assert.deepEqual(body.answer.rows[0], NORTH_YARD_MARCH_2025);
  assert.match(body.answer.summary, /2025-03/);
  assert.match(body.answer.summary, /North Yard/);
  assert.match(body.answer.summary, /\b36\b/);
  assert.match(body.answer.sql, /WHERE month = '2025-03'/);
  assert.ok(!body.answer.sql.includes(LATE_MARCH));
});

test("SQL inside a question or the body never runs", async (t) => {
  captureLogs(t);
  const { database, db } = await openStore();
  const hostile = await ask(db, post("overtime; DROP TABLE staff"));
  assert.equal(hostile.body.answer.kind, "data");
  assert.equal(hostile.body.answer.intent, "overtime");
  assert.equal(hostile.body.answer.sql, QUERIES.overtime.sql.replace("?", "'2026-10'"));
  assert.ok(!/DROP/i.test(hostile.body.answer.sql));
  const extra = await ask(db, post("", { body: JSON.stringify({ question: STAFF, sql: "DROP TABLE monthly_site_operations" }) }));
  assert.equal(extra.body.answer.intent, "headcount");
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM monthly_site_operations").get().n, 96);
});

test("a policy question answers from the sample notes without calling a model", async (t) => {
  captureLogs(t);
  const { body } = await ask((await openStore()).db, post("What is the detention fee policy?"));
  assert.equal(body.answer.kind, "docs");
  assert.equal(body.answer.citations[0].source, "detention-fee-sop.md");
  assert.match(body.answer.summary, /90-minute free window/);
  assert.equal(body.mode, "mock");
});

test("each network gets ten questions in a rolling hour", async (t) => {
  captureLogs(t);
  t.mock.timers.enable({ apis: ["Date"], now: T0 });
  const { db } = await openStore();
  for (let expected = 9; expected >= 0; expected -= 1) {
    const { response, body } = await ask(db, post(STAFF, { ip: "198.51.100.1" }));
    assert.equal(response.status, 200);
    assert.equal(body.remaining, expected);
  }
  const limited = await ask(db, post(STAFF, { ip: "198.51.100.1" }));
  assert.equal(limited.response.status, 429);
  assert.equal(limited.body.answer.kind, "error");
  assert.equal(limited.body.remaining, 0);
  assert.equal((await ask(db, post(STAFF, { ip: "198.51.100.2" }))).response.status, 200);
  t.mock.timers.setTime(T0 + HOUR_MS + 1);
  const again = await ask(db, post(STAFF, { ip: "198.51.100.1" }));
  assert.equal(again.response.status, 200);
  assert.equal(again.body.remaining, 9);
});

test("an IPv6 /64 is one network, and missing addresses share one window", async (t) => {
  captureLogs(t);
  const { db } = await openStore();
  for (let count = 0; count < 10; count += 1) await ask(db, post(STAFF, { ip: "2001:db8:1:2::a" }));
  assert.equal((await ask(db, post(STAFF, { ip: "2001:0db8:0001:0002:0000:0000:0000:000b" }))).response.status, 429);
  assert.equal((await ask(db, post(STAFF, { ip: "2001:db8:1:3::a" }))).response.status, 200);
  for (let count = 0; count < 10; count += 1) await ask(db, post(STAFF, { ip: null }));
  assert.equal((await ask(db, post(STAFF, { ip: "not an address" }))).response.status, 429);
});

test("bad input and preflight do not spend a question", async (t) => {
  captureLogs(t);
  const { db } = await openStore();
  const bodies = [
    JSON.stringify({ question: "" }),
    JSON.stringify({ question: "   " }),
    JSON.stringify({ question: "x".repeat(241) }),
    JSON.stringify({ question: STAFF, padding: "x".repeat(2048) }),
    "not json"
  ];
  for (const body of bodies) {
    const result = await ask(db, post("", { body }));
    assert.equal(result.response.status, 400, body.slice(0, 40));
    assert.equal(result.body.answer.kind, "error");
    assert.equal(result.body.remaining, null);
  }
  const preflight = await handle(new Request("https://ask.example/ask", { method: "OPTIONS", headers: { origin: "https://nimblytica.com", "cf-connecting-ip": "203.0.113.7" } }), {}, db);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "https://nimblytica.com");
  assert.equal((await ask(db, post(STAFF))).body.remaining, 9);
});

test("the model reply never reaches a response or a log line", async (t) => {
  const cases = [
    { name: "a valid route", reply: () => modelReply({ query: "fuel", month: "2025-03" }), mode: "llm", intent: "fuel" },
    { name: "a reply that names a sentinel", reply: () => ({ response: `route ${SENTINEL}` }) },
    { name: "an off-menu query name", reply: () => modelReply({ query: "payroll", month: null }) },
    { name: "SQL text as the query", reply: () => modelReply({ query: "SELECT * FROM ask_hits LIMIT 1", month: "2025-03" }) },
    { name: "malformed content", reply: () => ({ response: "not json" }) },
    { name: "a thrown binding error", reply: () => { const error = new Error("model not found"); error.name = "InferenceUpstreamError"; throw error; } }
  ];
  for (const { name, reply, mode = "mock", intent = "deliveries" } of cases) {
    await t.test(name, async (t) => {
      const logs = captureLogs(t);
      const env = aiEnv(reply);
      const { response, text, body } = await ask((await openStore()).db, post(LATE_MARCH), env);
      assert.equal(response.status, 200);
      assert.equal(body.mode, mode);
      assert.equal(body.answer.kind, "data");
      assert.equal(body.answer.intent, intent);
      assert.ok(!text.includes(SENTINEL));
      for (const [header, value] of response.headers) assert.ok(!value.includes(SENTINEL), header);

      const lines = logs();
      assert.equal(lines.length, 1);
      assert.ok(!lines[0].includes(SENTINEL));
      assert.ok(!lines[0].includes("late deliveries"));
      const entry = JSON.parse(lines[0]);
      assert.deepEqual(Object.keys(entry), LOG_FIELDS);
      assert.equal(entry.fallback === null, mode === "llm");

      assert.equal(env.calls.length, 1);
      assert.equal(env.calls[0].model, AI_MODEL);
      assert.equal(env.calls[0].input.messages.at(-1).content, LATE_MARCH);
      assert.ok(!JSON.stringify(env.calls[0].input).includes(SENTINEL));
    });
  }
});

test("an upstream model failure is logged without the question", async (t) => {
  const logs = captureLogs(t);
  const question = "Compare overtime between ops and finance last month";
  const env = aiEnv(() => {
    const error = new Error(`Ai catalog miss for ${question}`);
    error.name = "InferenceUpstreamError";
    throw error;
  });
  const { body } = await ask((await openStore()).db, post(question, { ip: "203.0.113.50" }), env);
  assert.equal(body.mode, "mock");
  assert.equal(body.answer.intent, "overtime");
  assert.match(body.answer.sql, /month = '2026-09'/);
  const entry = JSON.parse(logs()[0]);
  assert.match(entry.fallback, /^upstream: InferenceUpstreamError: Ai catalog miss for/);
  assert.ok(!entry.fallback.includes(question));
  assert.ok(!logs()[0].includes("overtime between"));
});

test("the server assigns the month and ignores a month the model invents", async (t) => {
  captureLogs(t);
  const cases = [
    ["Compare overtime between ops and finance last month", "2026-09"],
    ["Compare overtime between ops and finance this month", "2026-10"],
    ["Compare operating and finance overtime for March 2025", "2025-03"],
    ["Show overtime for 2025-03", "2025-03"],
    ["Compare operating and finance overtime", "2026-10"]
  ];
  for (const [question, month] of cases) {
    const env = aiEnv(() => modelReply({ query: "overtime", month: "2024-11" }));
    const { body } = await ask((await openStore()).db, post(question), env);
    assert.equal(body.mode, "llm", question);
    assert.match(body.answer.sql, new RegExp(`month = '${month}'`), question);
  }
  const keyword = await ask((await openStore()).db, post("Compare overtime between ops and finance last month"));
  assert.equal(keyword.body.mode, "mock");
  assert.match(keyword.body.answer.sql, /month = '2026-09'/);
});

test("without an AI binding the API stays on the keyword planner", async (t) => {
  captureLogs(t);
  for (const env of [{}, { AI: null }, { AI: {} }]) {
    const { body } = await ask((await openStore()).db, post(LATE_MARCH), env);
    assert.equal(body.mode, "mock");
    assert.equal(body.answer.intent, "deliveries");
  }
});

test("a site outside the allowlist gets 403 before the cap or the model runs", async (t) => {
  captureLogs(t);
  const env = aiEnv(() => modelReply({ query: "fuel", month: null }));
  const { db } = await openStore();
  const refused = await ask(db, post(LATE_MARCH, { origin: "https://evil.example" }), env);
  assert.equal(refused.response.status, 403);
  assert.equal(refused.response.headers.get("access-control-allow-origin"), null);
  assert.equal(refused.body.answer.kind, "error");
  assert.equal(refused.body.remaining, null);
  assert.equal(env.calls.length, 0);

  const allowed = await ask(db, post(LATE_MARCH, { origin: "https://nimblytica.com" }));
  assert.equal(allowed.response.status, 200);
  assert.equal(allowed.response.headers.get("access-control-allow-origin"), "https://nimblytica.com");
  assert.equal(allowed.body.remaining, 9);

  const configured = await ask(db, post(LATE_MARCH, { origin: "https://evil.example", ip: "203.0.113.8" }), { ALLOWED_ORIGINS: "https://evil.example" });
  assert.equal(configured.response.status, 200);

  const preview = "https://valley-freight-ask.example.workers.dev";
  const hosted = await ask(db, post(STAFF, { origin: preview, url: `${preview}/ask`, ip: "203.0.113.9" }));
  assert.equal(hosted.response.status, 200);
  assert.equal(hosted.response.headers.get("access-control-allow-origin"), preview);

  const local = await ask(db, post(STAFF, { origin: "http://127.0.0.1:8787", ip: "203.0.113.10" }), { ALLOWED_ORIGINS: preview });
  assert.equal(local.response.status, 200);
  assert.equal(local.response.headers.get("access-control-allow-origin"), "http://127.0.0.1:8787");
});

test("a stalled query answers 503 with the timeout message after five seconds", async (t) => {
  captureLogs(t);
  const { db } = await openStore();
  const templates = new Set(Object.values(QUERIES).map((entry) => entry.sql));
  let markStalled;
  const stalled = new Promise((resolve) => {
    markStalled = resolve;
  });
  const stalling = {
    ...db,
    all: (sql, params) => {
      if (!templates.has(sql)) return db.all(sql, params);
      markStalled();
      return new Promise(() => {});
    }
  };
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pending = ask(stalling, post(STAFF));
  await stalled;
  t.mock.timers.tick(5000);
  const { response, body } = await pending;
  assert.equal(response.status, 503);
  assert.equal(body.answer.kind, "error");
  assert.match(body.answer.summary, /five seconds/);
  assert.equal(body.remaining, 9);
});

test("a store failure answers 503 without detail", async (t) => {
  const logs = captureLogs(t);
  const broken = { all: async () => { throw new Error("D1_ERROR: no such table: ask_hits"); } };
  const { response, text, body } = await ask(broken, post(STAFF));
  assert.equal(response.status, 503);
  assert.equal(body.answer.kind, "error");
  assert.equal(body.remaining, null);
  assert.ok(!text.includes("D1_ERROR"));
  assert.ok(!logs()[0].includes("D1_ERROR"));
});

test("API copy has no em dash and no employer name", () => {
  for (const file of readdirSync(new URL("..", import.meta.url)).filter((name) => name.endsWith(".js"))) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(!text.includes("\u2014"), file);
    assert.ok(!/\bUKG\b/i.test(text), file);
    assert.ok(!text.includes("ASK_LLM_KEY"), file);
    assert.ok(!text.includes("api.openai.com"), file);
  }
});

test("a failed seed returns 503 and the next request tries again", async () => {
  let allowSeed = false;
  let queries = 0;
  const statement = {
    bind() { return statement; },
    async all() {
      queries += 1;
      return { results: [{ used: 1 }] };
    }
  };
  const env = {
    ASK_DB: {
      prepare() { return statement; },
      async batch() {
        if (!allowSeed) throw new Error("seed failed");
      }
    }
  };
  const request = () => worker.fetch(new Request("https://ask.example/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: STAFF })
  }), env);
  const first = await request();
  const firstBody = await first.json();
  assert.equal(first.status, 503);
  assert.equal(queries, 0);
  assert.equal(firstBody.answer.summary, "Something went wrong on the demo server. Try a suggested question.");
  assert.equal(firstBody.remaining, null);
  allowSeed = true;
  const second = await request();
  assert.equal(second.status, 200);
  assert.ok(queries > 0);
});
