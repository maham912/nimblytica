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

const SENTINEL = "sk-test-sentinel-do-not-leak";
const ENVELOPE = {
  answer: {
    kind: "data",
    intent: "headcount",
    title: "Staff by site",
    summary: "122 fictional staff are assigned across 4 sites, based on the 2026-10 snapshot.",
    rows: [{ label: "North Yard", value: 34, detail: "fictional staff" }],
    citations: [],
    sql: "SELECT site, headcount FROM monthly_site_operations WHERE month = '2026-10' ORDER BY headcount DESC LIMIT 1000"
  },
  remaining: 9,
  mode: "mock"
};

function pageFiles() {
  const root = path.join(__dirname, "..");
  const docs = fs.readdirSync(path.join(root, "docs"))
    .filter((name) => name.endsWith(".md") || name.endsWith(".json"))
    .map((name) => path.join(root, "docs", name));
  return ["index.html", "ask.js", "ask.css"].map((name) => path.join(root, name))
    .concat(docs)
    .concat(path.join(__dirname, "../../../js/config.js"));
}

test("askApi=same points a local page at its own origin", () => {
  assert.equal(ask.resolveApiBase("", new URL("http://127.0.0.1:8787/apps/ask-demo/?askApi=same")), "http://127.0.0.1:8787");
  assert.equal(ask.resolveApiBase("", new URL("http://localhost:8000/apps/ask-demo/?askApi=http://127.0.0.1:8787")), "http://127.0.0.1:8787");
});

test("an empty config keeps the static mock and a Worker URL turns on the API", () => {
  const live = new URL("https://nimblytica.com/apps/ask-demo/");
  const preview = new URL("https://valley-freight-ask.example.workers.dev/apps/ask-demo/?askApi=https://evil.example");
  assert.equal(ask.resolveApiBase("", live), "");
  assert.equal(ask.resolveApiBase(undefined, live), "");
  assert.equal(ask.resolveApiBase("https://valley-freight-ask.example.workers.dev", live), "https://valley-freight-ask.example.workers.dev");
  assert.equal(ask.resolveApiBase("", preview), preview.origin);
  assert.equal(ask.resolveApiBase("", new URL("http://127.0.0.1:8787/apps/ask-demo/")), "");
});

test("the public site ignores an askApi override", () => {
  assert.equal(ask.resolveApiBase("", new URL("https://nimblytica.com/apps/ask-demo/?askApi=https://evil.example")), "");
});

test("requestAnswer sends only the question and returns the server envelope", async () => {
  const calls = [];
  const reply = await ask.requestAnswer("How many staff?", "https://ask.example/", async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(ENVELOPE));
  });
  assert.deepEqual(reply, ENVELOPE);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://ask.example/ask");
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), { question: "How many staff?" });
  assert.deepEqual(Object.keys(calls[0].init.headers).map((name) => name.toLowerCase()), ["content-type"]);
});

test("requestAnswer turns a network failure or a malformed reply into an error answer", async () => {
  const replies = [
    async () => { throw new TypeError("Failed to fetch"); },
    async () => new Response("<html>Bad gateway</html>", { status: 502 }),
    async () => new Response(JSON.stringify({ answer: { kind: "constructor", title: "x", summary: "y", rows: [], citations: [] } }))
  ];
  for (const fetchImpl of replies) {
    const reply = await ask.requestAnswer("How many staff?", "https://ask.example", fetchImpl);
    assert.equal(reply.answer.kind, "error");
    assert.equal(reply.remaining, null);
  }
});

test("no file the page can load carries the model key", () => {
  for (const file of pageFiles()) {
    const text = fs.readFileSync(file, "utf8");
    assert.ok(!text.includes(SENTINEL), file);
    assert.ok(!text.includes("ASK_LLM_KEY"), file);
    assert.ok(!/\bsk-[A-Za-z0-9_-]{20,}/.test(text), file);
  }
});

test("page copy has no em dash and no employer name", () => {
  const files = pageFiles().concat(path.join(__dirname, "../DEPLOY.md"));
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    assert.ok(!text.includes("\u2014"), file);
    assert.ok(!/\bUKG\b/i.test(text), file);
    assert.ok(!text.includes("ASK_LLM_KEY"), file);
    assert.ok(!text.includes("api.openai.com"), file);
  }
});
