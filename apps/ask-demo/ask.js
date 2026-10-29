(function (root) {
  "use strict";

  const MAX_ROWS = 1000;
  const QUERY_TIMEOUT_MS = 5000;
  const RATE_LIMIT = 10;
  const RATE_WINDOW_MS = 60 * 60 * 1000;
  const RATE_KEY = "nimblytica-valley-ask-questions";
  const sites = [
    { id: "north-yard", name: "North Yard", headcount: 34, loads: 410, onTime: 0.91, overtime: 290, financeOvertime: 222, detention: 5200, fuel: 61200 },
    { id: "cedar-crossing", name: "Cedar Crossing", headcount: 31, loads: 365, onTime: 0.95, overtime: 184, financeOvertime: 179, detention: 3100, fuel: 54800 },
    { id: "mesa-point", name: "Mesa Point", headcount: 29, loads: 338, onTime: 0.92, overtime: 236, financeOvertime: 230, detention: 4200, fuel: 49700 },
    { id: "harbor-run", name: "Harbor Run", headcount: 28, loads: 392, onTime: 0.97, overtime: 152, financeOvertime: 148, detention: 2600, fuel: 58600 }
  ];
  const queryTemplates = Object.freeze({
    overtime: "SELECT site, operating_overtime_hours, finance_overtime_hours FROM monthly_site_operations WHERE month = '2026-10' ORDER BY operating_overtime_hours DESC LIMIT 1000",
    deliveries: "SELECT site, loads, late_deliveries, on_time_pct FROM monthly_site_operations WHERE month = '2026-10' ORDER BY late_deliveries DESC LIMIT 1000",
    fuel: "SELECT month, SUM(fuel_spend) AS fuel_spend FROM monthly_site_operations WHERE month >= '2026-05' GROUP BY month ORDER BY month LIMIT 1000",
    headcount: "SELECT site, headcount FROM monthly_site_operations WHERE month = '2026-10' ORDER BY headcount DESC LIMIT 1000",
    detention: "SELECT site, detention_fees FROM monthly_site_operations WHERE month = '2026-10' ORDER BY detention_fees DESC LIMIT 1000"
  });
  let memoryTimestamps = [];

  function makeDataset() {
    const months = [];
    for (let offset = 0; offset < 24; offset += 1) {
      const date = new Date(Date.UTC(2024, 10 + offset, 1));
      months.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    const rows = [];
    sites.forEach((site, siteIndex) => {
      months.forEach((month, monthIndex) => {
        const seasonal = 1 + Math.sin((monthIndex / 12) * Math.PI * 2 + siteIndex) * 0.045;
        const growth = 1 + monthIndex * 0.0025;
        const loads = Math.round(site.loads * seasonal * growth);
        const lateRate = Math.max(0.01, 1 - site.onTime + Math.cos(monthIndex + siteIndex) * 0.008);
        const financeFactor = 1 + Math.sin(monthIndex * 0.7 + siteIndex) * 0.035;
        rows.push({
          month,
          site: site.name,
          headcount: site.headcount,
          loads,
          late_deliveries: Math.round(loads * lateRate),
          on_time_pct: Math.round((1 - lateRate) * 1000) / 10,
          operating_overtime_hours: Math.round(site.overtime * seasonal * growth),
          finance_overtime_hours: Math.round(site.financeOvertime * financeFactor * growth),
          detention_fees: Math.round(site.detention * seasonal * growth),
          fuel_spend: Math.round(site.fuel * seasonal * growth)
        });
      });
    });
    return { asOf: months[months.length - 1], months, rows };
  }

  function validateQuery(sql) {
    if (typeof sql !== "string" || sql.length > 1000) return false;
    if (/[;]|--|\/\*|\*\//.test(sql)) return false;
    if (!/^SELECT\b/i.test(sql.trim())) return false;
    if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|PRAGMA|COPY|EXPORT|IMPORT|CALL|EXEC|UNION)\b/i.test(sql)) return false;
    if (!/\bLIMIT\s+(?:[1-9]\d{0,2}|1000)\s*$/i.test(sql.trim())) return false;
    return Object.values(queryTemplates).includes(sql);
  }

  function tokens(text) {
    return String(text || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  }

  function retrieveDocuments(question, documents, limit) {
    const ignored = new Set(["about", "after", "does", "from", "have", "how", "into", "that", "the", "their", "there", "this", "what", "when", "where", "which", "with", "would", "your"]);
    const terms = new Set(tokens(question).filter((term) => term.length > 2 && !ignored.has(term)));
    if (!terms.size) return [];
    return (documents || []).map((document) => {
      const text = `${document.title} ${document.keywords || ""} ${document.text || ""}`.toLowerCase();
      const score = Array.from(terms).reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
      return { document, score };
    }).filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.document.title.localeCompare(b.document.title))
      .slice(0, limit || 2)
      .map((item) => item.document);
  }

  function rowsForIntent(intent, dataset) {
    const rows = dataset.rows.filter((row) => row.month === dataset.asOf);
    if (intent === "overtime") {
      return rows.slice().sort((a, b) => b.operating_overtime_hours - a.operating_overtime_hours).map((row) => ({
        label: row.site,
        value: row.operating_overtime_hours,
        detail: `${row.finance_overtime_hours.toLocaleString("en-US")} finance hours`
      }));
    }
    if (intent === "deliveries") {
      return rows.slice().sort((a, b) => b.late_deliveries - a.late_deliveries).map((row) => ({
        label: row.site,
        value: row.late_deliveries,
        detail: `${row.on_time_pct}% on time`
      }));
    }
    if (intent === "fuel") {
      return dataset.months.slice(-6).map((month) => ({
        label: month,
        value: dataset.rows.filter((row) => row.month === month).reduce((sum, row) => sum + row.fuel_spend, 0),
        detail: "all sites"
      }));
    }
    if (intent === "headcount") {
      return rows.slice().sort((a, b) => b.headcount - a.headcount).map((row) => ({
        label: row.site,
        value: row.headcount,
        detail: "fictional staff"
      }));
    }
    return rows.slice().sort((a, b) => b.detention_fees - a.detention_fees).map((row) => ({
      label: row.site,
      value: row.detention_fees,
      detail: "detention fees"
    }));
  }

  function chooseIntent(question) {
    const text = String(question || "").toLowerCase();
    if (/\b(overtime|ot hours|labor hours)\b/.test(text)) return "overtime";
    if (/\b(late deliveries|delivery|on.time|on time)\b/.test(text)) return "deliveries";
    if (/\b(fuel|diesel)\b/.test(text)) return "fuel";
    if (/\b(headcount|staff|employees|people)\b/.test(text)) return "headcount";
    if (/\b(detention|fees)\b/.test(text)) return "detention";
    return "";
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  }

  function answerQuestion(question, dataset, documents) {
    const text = String(question || "").trim();
    if (!text || text.length > 240) return { kind: "error", title: "Check your question", summary: "Enter a question of 1 to 240 characters.", rows: [], citations: [], sql: "" };
    const intent = chooseIntent(text);
    const citations = retrieveDocuments(text, documents, 2).map((document) => ({
      title: document.title,
      source: document.source,
      excerpt: document.excerpt
    }));

    if (/\b(policy|sop|handbook|guide|accrual|procedure)\b/i.test(text) && citations.length) {
      return {
        kind: "docs",
        title: "From the Valley Freight sample notes",
        summary: citations.map((citation) => citation.excerpt).join(" "),
        rows: [],
        citations,
        sql: ""
      };
    }

    if (intent) {
      const sql = queryTemplates[intent];
      if (!validateQuery(sql)) throw new Error("The query template did not pass the read-only allowlist.");
      const rows = rowsForIntent(intent, dataset).slice(0, MAX_ROWS);
      let summary;
      if (intent === "overtime") {
        const gap = rows.reduce((total, row) => {
          const record = dataset.rows.find((item) => item.month === dataset.asOf && item.site === row.label);
          return total + Math.abs(record.operating_overtime_hours - record.finance_overtime_hours);
        }, 0);
        summary = `For ${dataset.asOf}, operating and finance overtime differ by ${gap.toLocaleString("en-US")} hours across the four sites. North Yard has the largest visible gap.`;
      } else if (intent === "deliveries") {
        summary = `For ${dataset.asOf}, ${rows[0].label} recorded the most late deliveries (${rows[0].value}) across ${rows.length} sites.`;
      } else if (intent === "fuel") {
        summary = `Fuel spend across all sites for the latest six months totals ${formatCurrency(rows.reduce((sum, row) => sum + row.value, 0))}.`;
      } else if (intent === "headcount") {
        summary = `${rows.reduce((sum, row) => sum + row.value, 0)} fictional staff are assigned across four sites, based on the ${dataset.asOf} snapshot.`;
      } else {
        summary = `Recorded detention fees total ${formatCurrency(rows.reduce((sum, row) => sum + row.value, 0))} across four sites for ${dataset.asOf}.`;
      }
      return { kind: "data", intent, title: intent === "overtime" ? "Operations and finance overtime" : intent === "deliveries" ? "Late deliveries by site" : intent === "fuel" ? "Fuel spend trend" : intent === "headcount" ? "Staff by site" : "Detention fees by site", summary, rows, citations, sql };
    }

    if (citations.length) {
      return {
        kind: "docs",
        title: "From the Valley Freight sample notes",
        summary: citations.map((citation) => citation.excerpt).join(" "),
        rows: [],
        citations,
        sql: ""
      };
    }
    return {
      kind: "unmatched",
      title: "No matched sample",
      summary: "I could not match that question to this small demo. Try one of the suggested questions about overtime, deliveries, fuel, staff, detention fees, or accruals.",
      rows: [],
      citations: [],
      sql: ""
    };
  }

  function consumeQuestion(storage, now) {
    const timestamp = Number(now) || Date.now();
    let stamps;
    try {
      stamps = JSON.parse(storage.getItem(RATE_KEY) || "[]");
      if (!Array.isArray(stamps)) stamps = [];
      stamps = stamps.filter((stamp) => Number.isFinite(stamp) && stamp > timestamp - RATE_WINDOW_MS && stamp <= timestamp);
      if (stamps.length >= RATE_LIMIT) {
        storage.setItem(RATE_KEY, JSON.stringify(stamps));
        return { allowed: false, remaining: 0 };
      }
      stamps.push(timestamp);
      storage.setItem(RATE_KEY, JSON.stringify(stamps));
    } catch (error) {
      memoryTimestamps = memoryTimestamps.filter((stamp) => stamp > timestamp - RATE_WINDOW_MS && stamp <= timestamp);
      if (memoryTimestamps.length >= RATE_LIMIT) return { allowed: false, remaining: 0, storageUnavailable: true };
      memoryTimestamps.push(timestamp);
      stamps = memoryTimestamps.slice();
    }
    return { allowed: true, remaining: Math.max(0, RATE_LIMIT - stamps.length), storageUnavailable: false };
  }

  function withTimeout(task, timeoutMs) {
    let timer;
    return Promise.race([
      Promise.resolve().then(task),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("This mock query took too long. Try a suggested question.")), timeoutMs || QUERY_TIMEOUT_MS);
      })
    ]).finally(() => clearTimeout(timer));
  }

  const api = {
    MAX_ROWS,
    QUERY_TIMEOUT_MS,
    RATE_LIMIT,
    makeDataset,
    queryTemplates,
    validateQuery,
    retrieveDocuments,
    answerQuestion,
    consumeQuestion,
    withTimeout,
    formatCurrency
  };
  root.NimblyticaAskDemo = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (!root.document) return;
  const document = root.document;
  const data = makeDataset();
  const form = document.getElementById("ask-form");
  const input = document.getElementById("question");
  const askButton = form.querySelector("button[type='submit']");
  const conversation = document.getElementById("conversation");
  const answer = document.getElementById("answer");
  const answerTitle = document.getElementById("answer-title");
  const answerSummary = document.getElementById("answer-summary");
  const resultKind = document.getElementById("result-kind");
  const resultVisual = document.getElementById("result-visual");
  const citations = document.getElementById("citations");
  const citationList = document.getElementById("citation-list");
  const query = document.getElementById("sql-query");
  const remainingLabel = document.getElementById("rate-remaining");
  let documents = [];
  let remaining = RATE_LIMIT;

  function appendMessage(className, label, content) {
    const item = document.createElement("div");
    item.className = className;
    const heading = document.createElement("p");
    heading.className = "message-label";
    heading.textContent = label;
    const body = document.createElement("p");
    body.textContent = content;
    item.append(heading, body);
    conversation.append(item);
  }

  function renderRows(rows, intent) {
    resultVisual.replaceChildren();
    if (!rows.length) return;
    const maximum = Math.max(...rows.map((row) => row.value), 1);
    rows.forEach((row) => {
      const line = document.createElement("div");
      line.className = "result-row";
      const name = document.createElement("span");
      name.className = "result-name";
      name.textContent = row.label;
      const track = document.createElement("span");
      track.className = "result-track";
      track.setAttribute("aria-label", `${row.label}: ${row.value.toLocaleString("en-US")}`);
      const bar = document.createElement("span");
      bar.className = "result-bar";
      bar.style.width = `${Math.max(3, (row.value / maximum) * 100)}%`;
      track.append(bar);
      const value = document.createElement("span");
      value.className = "result-value";
      const displayedValue = intent === "fuel" || intent === "detention"
        ? formatCurrency(row.value)
        : intent === "overtime"
          ? `${row.value.toLocaleString("en-US")} hrs`
          : intent === "headcount"
            ? `${row.value} staff`
            : `${row.value} late`;
      value.textContent = `${displayedValue}${row.detail ? ` · ${row.detail}` : ""}`;
      line.append(name, track, value);
      resultVisual.append(line);
    });
  }

  function renderCitations(items) {
    citationList.replaceChildren();
    items.forEach((citation) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `docs/${encodeURIComponent(citation.source)}`;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = citation.title;
      item.append(link, document.createTextNode(` · ${citation.excerpt}`));
      citationList.append(item);
    });
    citations.hidden = items.length === 0;
  }

  async function submitQuestion(question) {
    const text = String(question || "").trim();
    if (!text || text.length > 240) {
      answer.hidden = false;
      answerTitle.textContent = "Check your question";
      answerSummary.textContent = "Enter a question of 1 to 240 characters.";
      resultKind.textContent = "Input";
      resultVisual.replaceChildren();
      renderCitations([]);
      query.textContent = "";
      return;
    }
    let storage;
    try {
      storage = root.localStorage;
    } catch (error) {
      storage = { getItem: () => { throw error; }, setItem: () => { throw error; } };
    }
    const quota = consumeQuestion(storage);
    if (!quota.allowed) {
      answer.hidden = false;
      answerTitle.textContent = "Hourly preview limit reached";
      answerSummary.textContent = "This browser has used 10 demo questions in the last hour. Try again after the window resets.";
      resultKind.textContent = "Rate limited";
      resultVisual.replaceChildren();
      renderCitations([]);
      query.textContent = "";
      return;
    }
    remaining = quota.remaining;
    remainingLabel.textContent = String(remaining);
    appendMessage("user-message", "You", text);
    input.value = "";
    askButton.disabled = true;
    askButton.textContent = "Thinking";
    try {
      const result = await withTimeout(() => answerQuestion(text, data, documents), QUERY_TIMEOUT_MS);
      answer.hidden = false;
      answerTitle.textContent = result.title;
      answerSummary.textContent = result.summary;
      resultKind.textContent = result.kind === "data" ? "Sample metrics" : result.kind === "docs" ? "Document search" : "No match";
      renderRows(result.rows, result.intent);
      renderCitations(result.citations);
      query.textContent = result.sql || "No metric query used. Retrieved only matching fictional sample notes.";
      appendMessage("assistant-message", "Valley Freight Ask", result.summary);
      answer.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      answer.hidden = false;
      answerTitle.textContent = "Could not answer";
      answerSummary.textContent = error.message;
      resultKind.textContent = "Mock mode";
      resultVisual.replaceChildren();
      renderCitations([]);
      query.textContent = "";
    } finally {
      askButton.disabled = false;
      askButton.textContent = "Ask";
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitQuestion(input.value);
  });
  document.querySelectorAll("[data-question]").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.question;
      submitQuestion(input.value);
    });
  });

  fetch("docs/library.json")
    .then((response) => {
      if (!response.ok) throw new Error("Sample notes could not be loaded.");
      return response.json();
    })
    .then((library) => { documents = library.documents || []; })
    .catch(() => { documents = []; });
})(typeof window !== "undefined" ? window : globalThis);
