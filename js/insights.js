/**
 * Try-it Insights demo. Deterministic. No API key.
 * Classifies a short ops note against sample snapshots, then briefs.
 */
(function () {
  const SAMPLES_URL = new URL("../data/insights.fake.json", document.currentScript.src);
  const OPS_URL = new URL("../data/ops-pulse.fake.json", document.currentScript.src);
  const WF_URL = new URL("../data/workforce.fake.json", document.currentScript.src);

  const OPS_QUEUES = ["Finance Ops", "Applications", "Facilities", "Workplace", "Identity", "Network"];
  const WF_DEPTS = [
    "Clinical Support",
    "Revenue Cycle",
    "Administration",
    "Operations",
    "Nursing",
    "Quality",
    "Finance",
    "IT"
  ];

  let SAMPLES = [];
  let OPS = null;
  let WF = null;
  let ACTIVE = null;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function classify(text) {
    const t = (text || "").toLowerCase();
    for (let i = 0; i < OPS_QUEUES.length; i++) {
      const name = OPS_QUEUES[i];
      if (t.indexOf(name.toLowerCase()) !== -1) return { kind: "ops", cut: name };
    }
    for (let i = 0; i < WF_DEPTS.length; i++) {
      const name = WF_DEPTS[i];
      if (t.indexOf(name.toLowerCase()) !== -1) return { kind: "workforce", cut: name };
    }
    if (/\b(sla|queues?|tickets?|breach(?:ed|es)?|aging|backlog)\b/.test(t)) {
      return { kind: "ops", cut: "all" };
    }
    if (/\b(overtime|headcount|attrition|vacanc(?:y|ies)|hires?|span of control)\b/.test(t)) {
      return { kind: "workforce", cut: "all" };
    }
    return { kind: "unstructured", cut: null };
  }

  function sum(rows, key) {
    return rows.reduce((n, r) => n + (Number(r[key]) || 0), 0);
  }

  function opsRows(cut) {
    if (!OPS) return [];
    if (!cut || cut === "all") return OPS.queues;
    return OPS.queues.filter((q) => q.name === cut);
  }

  function wfRows(cut) {
    if (!WF) return [];
    if (!cut || cut === "all") return WF.departments;
    return WF.departments.filter((d) => d.name === cut);
  }

  function opsKpis(cut) {
    const rows = opsRows(cut);
    const open = sum(rows, "open");
    const breached = sum(rows, "breached");
    const aged = rows.reduce((n, q) => n + (Number(q.aging["8-14"]) || 0) + (Number(q.aging["15+"]) || 0), 0);
    const sla = open
      ? Math.round(rows.reduce((n, q) => n + q.sla_pct * q.open, 0) / open)
      : 0;
    return [
      { n: String(open), l: "Open", d: cut === "all" ? OPS.org : cut },
      { n: sla + "%", l: "SLA on time", d: breached + " breached" },
      { n: String(aged), l: "Aging 8+ days", d: "This cut" }
    ];
  }

  function wfKpis(cut) {
    const rows = wfRows(cut);
    const hc = sum(rows, "headcount");
    const open = sum(rows, "open_roles");
    const ot = sum(rows, "overtime_hours_12mo");
    return [
      { n: hc.toLocaleString("en-US"), l: "Headcount", d: cut === "all" ? WF.org : cut },
      { n: String(open), l: "Open roles", d: hc ? Math.round((open / hc) * 100) + "% vacancy" : "" },
      { n: ot.toLocaleString("en-US"), l: "OT hours / 12 mo", d: "Heaviest load first" }
    ];
  }

  function buildBriefing(note) {
    const text = (note || "").trim();
    if (!text) return null;
    const hit = classify(text);

    if (hit.kind === "ops" && OPS) {
      const bullets = NimblyticaBriefing.briefOps(OPS, hit.cut);
      const label = hit.cut === "all" ? OPS.org : hit.cut;
      return {
        headline: "Pulse briefing on " + label,
        cut: OPS.org + " · " + label + " · as of " + OPS.as_of,
        kpis: opsKpis(hit.cut),
        findings: bullets.slice(0, 4),
        nextCheck: bullets[4],
        lastMile:
          "The pulse is the product. These lines are optional. You confirm whether aged work is blocked, unowned, or a bad rule.",
        source: "demo/synthetic · ops-pulse.fake.json · deterministic, no API"
      };
    }

    if (hit.kind === "workforce" && WF) {
      const bullets = NimblyticaBriefing.briefWorkforce(WF, hit.cut);
      const label = hit.cut === "all" ? WF.org : hit.cut;
      return {
        headline: "Workforce briefing on " + label,
        cut: WF.org + " · " + label + " · as of " + WF.as_of,
        kpis: wfKpis(hit.cut),
        findings: bullets.slice(0, 4),
        nextCheck: bullets[4],
        lastMile:
          "The board is the product. Confirm the as-of, then decide whether overtime is unfilled shifts or a scheduling rule.",
        source: "demo/synthetic · workforce.fake.json · deterministic, no API"
      };
    }

    return {
      headline: "No matching cut in the sample snapshots",
      cut: "Unstructured note · demo only",
      kpis: [
        { n: "—", l: "Trusted as-of", d: "Not on file" },
        { n: "—", l: "Queue / unit", d: "Not matched" },
        { n: "—", l: "Next step", d: "Board first" }
      ],
      findings: [
        "The note does not name a sample queue or unit, so this page will not invent a number.",
        "That is the live board job: one as-of, then a briefing function on that slice.",
        "Without a live board, a briefing is guessing from screenshots."
      ],
      nextCheck: "Name the queue or unit, or ask for a live board so the next paste has a snapshot behind it.",
      lastMile: "This page will not fake a confident answer. Name the queue or unit, or tell us what you need.",
      source: "demo/synthetic · unmatched note · no API"
    };
  }

  function renderSamples() {
    const el = document.getElementById("samples");
    el.innerHTML = "";
    SAMPLES.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = s.label;
      b.setAttribute("aria-pressed", ACTIVE === s.id ? "true" : "false");
      b.addEventListener("click", () => {
        ACTIVE = s.id;
        document.getElementById("note").value = s.note;
        renderSamples();
        run();
      });
      el.appendChild(b);
    });
  }

  function renderBriefing(brief) {
    const out = document.getElementById("out");
    if (!brief) {
      out.innerHTML =
        '<p class="briefing-empty">Pick a sample ticket or paste a short ops note. This page writes a briefing from invented snapshots. Same input, same output. No API.</p>';
      return;
    }
    const kpis = brief.kpis
      .map(
        (k) =>
          `<article class="kpi"><div class="n">${escapeHtml(k.n)}</div><div class="l">${escapeHtml(k.l)}</div><div class="d">${escapeHtml(k.d || "")}</div></article>`
      )
      .join("");
    const findings = brief.findings.map((f) => "<li>" + escapeHtml(f) + "</li>").join("");
    out.innerHTML =
      `<p class="headline">${escapeHtml(brief.headline)}</p>` +
      `<p class="cut">${escapeHtml(brief.cut)}</p>` +
      `<div class="signals">${kpis}</div>` +
      `<ol class="findings">${findings}</ol>` +
      `<div class="next"><strong>Next check</strong><p>${escapeHtml(brief.nextCheck)}</p></div>` +
      `<div class="last-mile"><strong>Last mile</strong><p>${escapeHtml(brief.lastMile)}</p></div>` +
      `<p class="source">${escapeHtml(brief.source)}</p>`;
  }

  function run() {
    const note = document.getElementById("note").value;
    const typed = SAMPLES.some((s) => s.note === note.trim());
    if (!typed) ACTIVE = null;
    else {
      const match = SAMPLES.find((s) => s.note === note.trim());
      ACTIVE = match ? match.id : null;
    }
    renderSamples();
    renderBriefing(buildBriefing(note));
  }

  function wire() {
    document.getElementById("brief-btn").addEventListener("click", run);
    document.getElementById("clear-btn").addEventListener("click", () => {
      ACTIVE = null;
      document.getElementById("note").value = "";
      renderSamples();
      renderBriefing(null);
    });
    document.getElementById("note").addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
    });
  }

  Promise.all([
    fetch(SAMPLES_URL).then((r) => r.json()),
    fetch(OPS_URL).then((r) => r.json()),
    fetch(WF_URL).then((r) => r.json())
  ])
    .then(([samples, ops, wf]) => {
      SAMPLES = samples.samples || [];
      OPS = ops;
      WF = wf;
      wire();
      renderSamples();
      renderBriefing(null);
    })
    .catch((err) => {
      document.getElementById("banner").textContent =
        "Serve this folder with python3 -m http.server so the JSON can load. (" + err.message + ")";
    });
})();
