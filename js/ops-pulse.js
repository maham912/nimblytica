(function () {
  const DATA_URL = new URL("../data/ops-pulse.fake.json", document.currentScript.src);
  let DATA = null;
  let QUEUE = "all";

  const AGING_KEYS = NimblyticaCharts.AGING_KEYS;
  const PRIORITY_KEYS = NimblyticaCharts.PRIORITY_KEYS;
  const fmt = (n) => Number(n).toLocaleString("en-US");

  function queues() {
    if (QUEUE === "all") return DATA.queues;
    return DATA.queues.filter((q) => q.name === QUEUE);
  }

  function sum(list, key) {
    return list.reduce((n, r) => n + (Number(r[key]) || 0), 0);
  }

  function agingTotals(list) {
    const out = {};
    AGING_KEYS.forEach((k) => {
      out[k] = list.reduce((n, q) => n + (Number(q.aging[k]) || 0), 0);
    });
    return out;
  }

  function priorityTotals(list) {
    const out = {};
    PRIORITY_KEYS.forEach((k) => {
      out[k] = list.reduce((n, q) => n + (Number(q.priority[k]) || 0), 0);
    });
    return out;
  }

  function slaWeighted(list) {
    const open = sum(list, "open");
    if (!open) return 0;
    const weighted = list.reduce((n, q) => n + q.sla_pct * q.open, 0);
    return Math.round(weighted / open);
  }

  function renderSlicer() {
    const el = document.getElementById("slicer");
    const names = ["all", ...DATA.queues.map((q) => q.name)];
    el.innerHTML = "";
    names.forEach((name) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = name === "all" ? "All queues" : name;
      b.setAttribute("aria-pressed", name === QUEUE ? "true" : "false");
      b.addEventListener("click", () => {
        QUEUE = name;
        render();
      });
      el.appendChild(b);
    });
  }

  function renderKpis() {
    const r = queues();
    const open = sum(r, "open");
    const sla = slaWeighted(r);
    const breached = sum(r, "breached");
    const aging = agingTotals(r);
    const aged = aging["8-14"] + aging["15+"];
    const cut = QUEUE === "all" ? DATA.org : QUEUE;
    document.getElementById("kpis").innerHTML = `
      <article class="kpi"><div class="n">${fmt(open)}</div><div class="l">Open tickets</div><div class="d">${cut}</div></article>
      <article class="kpi"><div class="n">${sla}%</div><div class="l">SLA on time</div><div class="d">${QUEUE === "all" ? "Weighted across queues" : "This queue"}</div></article>
      <article class="kpi"><div class="n">${fmt(breached)}</div><div class="l">Breached, still open</div><div class="d">${open ? Math.round((breached / open) * 100) : 0}% of open</div></article>
      <article class="kpi"><div class="n">${fmt(aged)}</div><div class="l">Aging 8+ days</div><div class="d">${fmt(aging["15+"])} at 15 days or more</div></article>`;
  }

  function series(src) {
    const field = QUEUE === "all" ? "all" : QUEUE;
    return {
      x: src.map((d) => d.week),
      y: src.map((d) => d[field])
    };
  }

  function renderCharts() {
    NimblyticaCharts.flow("chart-flow", series(DATA.trend_opened), series(DATA.trend_resolved));
    NimblyticaCharts.aging("chart-aging", agingTotals(queues()));
    NimblyticaCharts.queue("chart-queue", queues());
    NimblyticaCharts.priority("chart-priority", priorityTotals(queues()));
  }

  function renderLists() {
    const r = queues()
      .slice()
      .sort((a, b) => b.open - a.open);
    document.getElementById("queue-body").innerHTML = r
      .map(
        (q) =>
          `<tr><td>${q.name}</td><td>${fmt(q.open)}</td><td>${q.sla_pct}%</td><td>${fmt(q.breached)}</td><td>${q.median_age_days}d</td><td>${fmt(q.aging["8-14"] + q.aging["15+"])}</td></tr>`
      )
      .join("");
  }

  function render() {
    renderSlicer();
    renderKpis();
    renderCharts();
    renderLists();
  }

  fetch(DATA_URL)
    .then((res) => {
      if (!res.ok) throw new Error("Could not load snapshot JSON");
      return res.json();
    })
    .then((json) => {
      DATA = json;
      document.getElementById("as-of").textContent = json.as_of;
      document.getElementById("org-name").textContent = json.org;
      render();
    })
    .catch((err) => {
      document.getElementById("banner").textContent =
        "Serve this folder with python3 -m http.server so the JSON can load. (" + err.message + ")";
    });
})();
