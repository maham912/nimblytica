(function () {
  const DATA_URL = new URL("../data/workforce.fake.json", document.currentScript.src);
  let DATA = null;
  let DEPT = "all";

  const fmt = (n) => Number(n).toLocaleString("en-US");

  function rows() {
    if (DEPT === "all") return DATA.departments;
    return DATA.departments.filter((d) => d.name === DEPT);
  }

  function sum(list, key) {
    return list.reduce((n, r) => n + (Number(r[key]) || 0), 0);
  }

  function renderSlicer() {
    const el = document.getElementById("slicer");
    const names = ["all", ...DATA.departments.map((d) => d.name)];
    el.innerHTML = "";
    names.forEach((name) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = name === "all" ? "All units" : name;
      b.setAttribute("aria-pressed", name === DEPT ? "true" : "false");
      b.addEventListener("click", () => {
        DEPT = name;
        render();
      });
      el.appendChild(b);
    });
  }

  function renderKpis() {
    const r = rows();
    const hc = sum(r, "headcount");
    const open = sum(r, "open_roles");
    const attr = r.length === 1 ? r[0].attrition_pct : DATA.kpis.attrition_12mo_pct;
    const span = r.length === 1 ? r[0].span : DATA.kpis.span_of_control;
    const ot = sum(r, "overtime_hours_12mo");
    document.getElementById("kpis").innerHTML = `
      <article class="kpi"><div class="n">${fmt(hc)}</div><div class="l">Headcount</div><div class="d">${DEPT === "all" ? DATA.org : DEPT}</div></article>
      <article class="kpi"><div class="n">${fmt(open)}</div><div class="l">Open roles</div><div class="d">${fmt(DATA.kpis.hires_90d)} hires / 90 days (org)</div></article>
      <article class="kpi"><div class="n">${attr}%</div><div class="l">Attrition, 12 months</div><div class="d">${DEPT === "all" ? fmt(DATA.kpis.terms_12mo) + " terms (org)" : "Unit rate"}</div></article>
      <article class="kpi"><div class="n">${span}</div><div class="l">Span of control</div><div class="d">${fmt(ot)} OT hours / 12 mo</div></article>`;
  }

  function series(key) {
    const src = key === "hc" ? DATA.trend_headcount : DATA.trend_overtime_hours;
    const field = DEPT === "all" ? "all" : DEPT;
    return {
      x: src.map((d) => d.month),
      y: src.map((d) => d[field])
    };
  }

  function renderTrend() {
    const hc = series("hc");
    const ot = series("ot");
    const axis = {
      gridcolor: "#2d3228",
      linecolor: "#3d4336",
      tickfont: { color: "#8c887a", family: "IBM Plex Sans, sans-serif", size: 11 },
      zeroline: false
    };
    const layout = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: "#ece7d8", family: "IBM Plex Sans, sans-serif" },
      margin: { t: 16, r: 16, b: 40, l: 48 },
      legend: { orientation: "h", y: 1.12, font: { size: 12 } },
      xaxis: axis,
      yaxis: Object.assign({ title: "" }, axis),
      hovermode: "x unified"
    };
    Plotly.react(
      "chart-hc",
      [{ x: hc.x, y: hc.y, type: "scatter", mode: "lines+markers", name: "Headcount", line: { color: "#c9a227", width: 2 }, marker: { size: 6 } }],
      layout,
      { displayModeBar: false, responsive: true }
    );
    Plotly.react(
      "chart-ot",
      [{ x: ot.x, y: ot.y, type: "bar", name: "Overtime hours", marker: { color: "#8fa37a" } }],
      layout,
      { displayModeBar: false, responsive: true }
    );
  }

  function renderLists() {
    const r = rows();
    const top = r
      .slice()
      .sort((a, b) => b.overtime_hours_12mo - a.overtime_hours_12mo)
      .slice(0, 5);
    const topRows = top
      .map(
        (d, i) =>
          `<tr><td>${i + 1}</td><td>${d.name}</td><td>${fmt(d.overtime_hours_12mo)}</td><td>${fmt(d.open_roles)}</td><td>${d.attrition_pct}%</td><td>${d.owner}</td></tr>`
      )
      .join("");
    document.getElementById("top-body").innerHTML = topRows;

    const hires = (DATA.new_hires || []).filter((h) => DEPT === "all" || h.dept === DEPT);
    document.getElementById("new-body").innerHTML = hires
      .map((h) => `<tr><td>${h.start}</td><td>${h.name}</td><td>${h.role}</td><td>${h.dept}</td></tr>`)
      .join("") || `<tr><td colspan="4">No new names on this cut.</td></tr>`;
  }

  function render() {
    renderSlicer();
    renderKpis();
    renderTrend();
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
