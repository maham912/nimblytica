import { answerFromPlan, QUERIES } from "./catalog.js";
import { planQuestion } from "./plan.js";
import { query, QueryTimeout, takeHit } from "./store.js";

const MAX_BODY_BYTES = 2048;
const MAX_QUESTION_CHARS = 240;
const DEFAULT_ORIGINS = [
  "https://nimblytica.com",
  "https://www.nimblytica.com",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:8787",
  "http://127.0.0.1:8787"
];
const PREFLIGHT = {
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400"
};
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

function refusal(title, summary) {
  return { kind: "error", title, summary, rows: [], citations: [], sql: "" };
}

const REFUSALS = {
  input: refusal("Check your question", "Enter a question of 1 to 240 characters."),
  limited: refusal("Hourly demo limit reached", "This network has asked 10 demo questions in the last hour. Try again later."),
  timeout: refusal("Could not answer", "The sample query took longer than five seconds. Try a suggested question."),
  failed: refusal("Could not answer", "Something went wrong on the demo server. Try a suggested question."),
  origin: refusal("This demo is not open to that site", "Open the Ask demo on nimblytica.com and try again.")
};

export async function handle(request, env, db) {
  const started = Date.now();
  const origin = request.headers.get("origin");
  const allowed = origin !== null && allowedOrigins(env).has(origin);
  const headers = { "cache-control": "no-store", vary: "origin" };
  if (allowed) headers["access-control-allow-origin"] = origin;
  if (new URL(request.url).pathname !== "/ask") return new Response(null, { status: 404, headers });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, ...PREFLIGHT } });
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, allow: "POST, OPTIONS" } });

  let result;
  try {
    result = origin !== null && !allowed ? { status: 403, answer: REFUSALS.origin } : await ask(request, env, db);
  } catch {
    result = { status: 500, answer: REFUSALS.failed };
  }
  const { status, remaining = null, mode = "mock", chars = 0, route = null, fallback = null } = result;
  console.log(JSON.stringify({ event: "ask", status, mode, ms: Date.now() - started, chars, route, fallback }));
  return Response.json({ answer: result.answer, remaining, mode }, { status, headers });
}

async function ask(request, env, db) {
  const question = await readQuestion(request);
  if (!question) return { status: 400, answer: REFUSALS.input };
  const facts = { chars: question.length };
  let hit;
  try {
    hit = await takeHit(db, limitKey(request.headers.get("cf-connecting-ip")), Date.now());
  } catch {
    return { ...facts, status: 503, answer: REFUSALS.failed };
  }
  if (!hit.admitted) return { ...facts, status: 429, answer: REFUSALS.limited, remaining: 0 };

  const { plan, mode, fallback } = await planQuestion(question, env);
  Object.assign(facts, { remaining: hit.remaining, mode, fallback, route: plan.kind === "query" ? plan.name : "notes" });
  let records = [];
  if (plan.kind === "query") {
    const entry = QUERIES[plan.name];
    try {
      records = await query(db, entry.sql, entry.bind(plan.month));
    } catch (error) {
      return { ...facts, status: 503, answer: error instanceof QueryTimeout ? REFUSALS.timeout : REFUSALS.failed };
    }
  }
  return { ...facts, status: 200, answer: answerFromPlan(plan, question, records) };
}

function allowedOrigins(env) {
  const listed = String(env.ALLOWED_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean);
  return new Set(listed.length ? listed : DEFAULT_ORIGINS);
}

async function readQuestion(request) {
  const text = await readText(request.body, MAX_BODY_BYTES);
  if (text === null) return null;
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  return question && question.length <= MAX_QUESTION_CHARS ? question : null;
}

async function readText(stream, limit) {
  if (!stream) return "";
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    size += chunk.value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  return text + decoder.decode();
}

function limitKey(ip) {
  const text = String(ip || "").trim();
  if (IPV4.test(text)) return text;
  if (!text.includes(":")) return "unknown";
  let host;
  try {
    host = new URL(`http://[${text}]`).hostname.slice(1, -1);
  } catch {
    return "unknown";
  }
  const [head, tail] = host.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = tail === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
  return `${groups.slice(0, 4).join(":")}::/64`;
}
