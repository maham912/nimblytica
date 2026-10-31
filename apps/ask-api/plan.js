import { citationsFor, DATASET, DOCUMENTS, QUERIES } from "./catalog.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4.1-mini";
const MODEL_TIMEOUT_MS = 4000;
const QUERY_NAMES = Object.keys(QUERIES);
const NOTES_WORDS = /\b(policy|sop|handbook|guide|accrual|procedure)\b/i;
const ISO_MONTH = /\b(\d{4})-(\d{2})\b/;
const NAMED_MONTH = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})\b/i;
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const SYSTEM_PROMPT = [
  "Route one question about a fictional freight company to one preapproved query.",
  "Queries:",
  ...QUERY_NAMES.map((name) => `- ${name}: ${QUERIES[name].about}`),
  `Sample notes: ${DOCUMENTS.map((document) => document.title).join(", ")}.`,
  "Set query to null for policy or procedure questions, for questions about the sample notes, and for anything no query covers.",
  `The data covers ${DATASET.months[0]} through ${DATASET.asOf}. Set month to YYYY-MM when the question names a month, otherwise null.`
].join("\n");

const ROUTE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "route",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["query", "month"],
      properties: {
        query: { type: ["string", "null"], enum: [...QUERY_NAMES, null] },
        month: { type: ["string", "null"] }
      }
    }
  }
};

export async function planQuestion(question, env) {
  const key = String(env.ASK_LLM_KEY || "").trim();
  if (!key) return { plan: mockPlanner(question), mode: "mock", fallback: null };
  return llmPlanner(question, key);
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

async function llmPlanner(question, key) {
  let fallback;
  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        max_tokens: 40,
        response_format: ROUTE_FORMAT,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question }
        ]
      }),
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS)
    });
    const plan = response.ok ? parsePlan(await response.text()) : null;
    if (plan) return { plan, mode: "llm", fallback: null };
    fallback = response.ok ? "invalid" : "upstream";
  } catch (error) {
    fallback = error?.name === "TimeoutError" ? "timeout" : "upstream";
  }
  return { plan: mockPlanner(question), mode: "mock", fallback };
}

function parsePlan(text) {
  let reply;
  try {
    reply = JSON.parse(JSON.parse(text).choices[0].message.content);
  } catch {
    return null;
  }
  const { query, month = null } = reply ?? {};
  if (query === null) return { kind: "notes" };
  if (!QUERY_NAMES.includes(query)) return null;
  if (month !== null && !/^\d{4}-\d{2}$/.test(month)) return null;
  return { kind: "query", name: query, month: DATASET.months.includes(month) ? month : DATASET.asOf };
}
