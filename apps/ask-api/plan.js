import { citationsFor, DATASET, DOCUMENTS, QUERIES } from "./catalog.js";

export const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

const MODEL_TIMEOUT_MS = 4000;
const QUERY_NAMES = Object.keys(QUERIES);
const NOTES_WORDS = /\b(policy|sop|handbook|guide|accrual|procedure)\b/i;
const ISO_MONTH = /\b(\d{4})-(\d{2})\b/;
const NAMED_MONTH = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})\b/i;
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const SYSTEM_PROMPT = [
  "Route one question about a fictional freight company to one preapproved query.",
  "Reply with JSON only, shaped as {\"query\": string or null, \"month\": \"YYYY-MM\" or null}.",
  "query must be one of the names below, or null. Never write SQL.",
  "Queries:",
  ...QUERY_NAMES.map((name) => `- ${name}: ${QUERIES[name].about}`),
  `Sample notes: ${DOCUMENTS.map((document) => document.title).join(", ")}.`,
  "Set query to null for policy or procedure questions, for questions about the sample notes, and for anything no query covers.",
  `The data covers ${DATASET.months[0]} through ${DATASET.asOf}. Set month to YYYY-MM when the question names a month, otherwise null.`
].join("\n");

export async function planQuestion(question, env) {
  if (typeof env?.AI?.run !== "function") return { plan: mockPlanner(question), mode: "mock", fallback: null };
  return aiPlanner(question, env.AI);
}

function mockPlanner(question) {
  if (NOTES_WORDS.test(question) && citationsFor(question).length) return { kind: "notes" };
  const name = QUERY_NAMES.find((candidate) => QUERIES[candidate].match.test(question));
  return name ? { kind: "query", name, month: monthIn(question) } : { kind: "notes" };
}

function monthIn(question) {
  const iso = question.match(ISO_MONTH);
  const named = question.match(NAMED_MONTH);
  let month = "";
  if (iso) month = `${iso[1]}-${iso[2]}`;
  else if (named) month = `${named[2]}-${String(MONTH_NAMES.indexOf(named[1].toLowerCase()) + 1).padStart(2, "0")}`;
  return DATASET.months.includes(month) ? month : DATASET.asOf;
}

async function aiPlanner(question, ai) {
  let fallback;
  try {
    const result = await withTimeout(ai.run(AI_MODEL, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question }
      ],
      max_tokens: 80,
      temperature: 0
    }), MODEL_TIMEOUT_MS);
    const plan = parsePlan(result);
    if (plan) return { plan, mode: "llm", fallback: null };
    fallback = "invalid";
  } catch (error) {
    fallback = error?.name === "TimeoutError" ? "timeout" : "upstream";
  }
  return { plan: mockPlanner(question), mode: "mock", fallback };
}

function withTimeout(work, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("The model took too long.");
      error.name = "TimeoutError";
      reject(error);
    }, ms);
  });
  return Promise.race([Promise.resolve(work), timeout]).finally(() => clearTimeout(timer));
}

function parsePlan(result) {
  const reply = asRoute(result);
  if (!reply) return null;
  const { query, month = null } = reply;
  if (query === null) return { kind: "notes" };
  if (!QUERY_NAMES.includes(query)) return null;
  if (month !== null && !/^\d{4}-\d{2}$/.test(month)) return null;
  return { kind: "query", name: query, month: DATASET.months.includes(month) ? month : DATASET.asOf };
}

function asRoute(result) {
  if (result && typeof result === "object" && !("response" in result) && ("query" in result || result.query === null)) return result;
  const text = typeof result === "string" ? result : result?.response ?? "";
  try {
    const match = String(text).match(/\{[\s\S]*?\}/);
    return JSON.parse(match ? match[0] : text);
  } catch {
    return null;
  }
}
