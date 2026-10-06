/* Shared Plotly traces, same language as demo/workforce and demo/ops-pulse. */
(function (global) {
  const AGING_KEYS = ["0-1", "2-3", "4-7", "8-14", "15+"];
  const PRIORITY_KEYS = ["Critical", "High", "Medium", "Low"];

  const FONT = "Geist, ui-sans-serif, system-ui, sans-serif";

  function axis() {
    return {
      gridcolor: "#1c1c1c",
      linecolor: "#2a2a2a",
      tickfont: { color: "#a3a3a3", family: FONT, size: 11 },
      showspikes: false,
      zeroline: false
    };
  }

  function dateAxis() {
    return Object.assign(axis(), {
      type: "date",
      tickformat: "%b %d",
      hoverformat: "%b %d, %Y",
      ticklabelmode: "instant",
      nticks: 6
    });
  }

  function layout(extra) {
    const a = axis();
    return Object.assign(
      {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#f2f2f2", family: FONT, size: 12 },
        margin: { t: 16, r: 16, b: 40, l: 48 },
        legend: { orientation: "h", y: 1.12, font: { size: 12, family: FONT, color: "#d0d0d0" } },
        xaxis: a,
        yaxis: Object.assign({ title: "" }, a),
        hovermode: "closest",
        hoverlabel: {
          bgcolor: "#141414",
          bordercolor: "#3a3a3a",
          font: { family: FONT, size: 12, color: "#f2f2f2" }
        }
      },
      extra || {}
    );
  }

  function compactLayout(extra) {
    return layout(
      Object.assign(
        {
          margin: { t: 10, r: 8, b: 28, l: 36 },
          legend: { orientation: "h", y: 1.18, font: { size: 11, family: FONT, color: "#d0d0d0" } }
        },
        extra || {}
      )
    );
  }

  function opts() {
    return { displayModeBar: false, responsive: true };
  }

  function narrow(id) {
    const el = document.getElementById(id);
    if (!el) return false;
    const w = el.clientWidth;
    return w > 0 && w < 400;
  }

  function draw(id, data, box) {
    const done = Plotly.react(id, data, box, opts());
    const clear = function () {
      if (Plotly.Fx && Plotly.Fx.unhover) Plotly.Fx.unhover(id);
    };
    if (done && done.then) done.then(clear);
    else clear();
  }

  function ready() {
    return typeof Plotly !== "undefined" && Plotly.react;
  }

  function headcount(id, series, compact) {
    if (!ready()) return;
    const box = compact ? compactLayout() : layout();
    box.xaxis = dateAxis();
    draw(id, [
      {
        x: series.x,
        y: series.y,
        type: "scatter",
        mode: "lines+markers",
        name: "Headcount",
        line: { color: "#f2f2f2", width: 1.5 },
        marker: { size: 5 },
        hovertemplate: "%{x|%b %d, %Y}<br>Headcount %{y}<extra></extra>"
      }
    ], box);
  }

  function overtime(id, series, compact) {
    if (!ready()) return;
    const box = compact ? compactLayout() : layout();
    box.xaxis = dateAxis();
    draw(
      id,
      [{
        x: series.x,
        y: series.y,
        type: "bar",
        name: "Overtime hours",
        marker: { color: "#a3a3a3" },
        hovertemplate: "%{x|%b %d, %Y}<br>Overtime hours %{y}<extra></extra>"
      }],
      box
    );
  }

  function flow(id, opened, resolved, compact) {
    if (!ready()) return;
    const box = compact ? compactLayout() : layout();
    box.xaxis = dateAxis();
    draw(
      id,
      [
        {
          x: opened.x,
          y: opened.y,
          type: "scatter",
          mode: "lines+markers",
          name: "Opened",
          line: { color: "#f2f2f2", width: 1.5 },
          marker: { size: 5 },
          hovertemplate: "%{x|%b %d, %Y}<br>Opened %{y}<extra></extra>"
        },
        {
          x: resolved.x,
          y: resolved.y,
          type: "scatter",
          mode: "lines+markers",
          name: "Resolved",
          line: { color: "#a3a3a3", width: 1.5 },
          marker: { size: 5 },
          hovertemplate: "%{x|%b %d, %Y}<br>Resolved %{y}<extra></extra>"
        }
      ],
      box
    );
  }

  function categoryBars(id, box, labels, values, marker) {
    const sideways = narrow(id);
    const trace = {
      type: "bar",
      name: "Open",
      marker: marker,
      orientation: sideways ? "h" : "v",
      hovertemplate: sideways ? "%{y}<br>Open %{x}<extra></extra>" : "%{x}<br>Open %{y}<extra></extra>"
    };
    if (sideways) {
      trace.y = labels;
      trace.x = values;
      box.margin = Object.assign({}, box.margin, { l: 96, r: 16, b: 28 });
      box.yaxis.automargin = true;
    } else {
      trace.x = labels;
      trace.y = values;
    }
    draw(id, [trace], box);
  }

  function aging(id, totals, compact) {
    if (!ready()) return;
    const colors = AGING_KEYS.map((k) => (k === "8-14" || k === "15+" ? "#f2f2f2" : "#3a3a3a"));
    const box = compact ? compactLayout({ hovermode: "closest" }) : layout({ hovermode: "closest" });
    categoryBars(
      id,
      box,
      AGING_KEYS.map((k) => k + " days"),
      AGING_KEYS.map((k) => totals[k]),
      { color: colors }
    );
  }

  function queue(id, rows, compact) {
    if (!ready()) return;
    const box = compact ? compactLayout({ hovermode: "closest" }) : layout({ hovermode: "closest" });
    categoryBars(
      id,
      box,
      rows.map((q) => q.name),
      rows.map((q) => q.open),
      { color: "#a3a3a3" }
    );
  }

  function priority(id, totals, compact) {
    if (!ready()) return;
    const box = compact ? compactLayout({ hovermode: "closest" }) : layout({ hovermode: "closest" });
    categoryBars(
      id,
      box,
      PRIORITY_KEYS.slice(),
      PRIORITY_KEYS.map((k) => totals[k]),
      { color: ["#f2f2f2", "#c4c4c4", "#8a8a8a", "#3a3a3a"] }
    );
  }

  global.NimblyticaCharts = {
    AGING_KEYS,
    PRIORITY_KEYS,
    ready,
    layout,
    compactLayout,
    headcount,
    overtime,
    flow,
    aging,
    queue,
    priority
  };
})(window);
