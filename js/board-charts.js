/* Shared Plotly traces — same language as demo/workforce and demo/ops-pulse. */
(function (global) {
  const AGING_KEYS = ["0-1", "2-3", "4-7", "8-14", "15+"];
  const PRIORITY_KEYS = ["Critical", "High", "Medium", "Low"];

  function axis() {
    return {
      gridcolor: "#1c1c1c",
      linecolor: "#2a2a2a",
      tickfont: { color: "#6e6e6e", family: "Geist, ui-sans-serif, sans-serif", size: 11 },
      zeroline: false
    };
  }

  function layout(extra) {
    const a = axis();
    return Object.assign(
      {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#f2f2f2", family: "Geist, ui-sans-serif, sans-serif" },
        margin: { t: 16, r: 16, b: 40, l: 48 },
        legend: { orientation: "h", y: 1.12, font: { size: 12 } },
        xaxis: a,
        yaxis: Object.assign({ title: "" }, a),
        hovermode: "x unified"
      },
      extra || {}
    );
  }

  function compactLayout(extra) {
    return layout(
      Object.assign(
        {
          margin: { t: 10, r: 8, b: 28, l: 36 },
          legend: { orientation: "h", y: 1.18, font: { size: 11 } }
        },
        extra || {}
      )
    );
  }

  function opts() {
    return { displayModeBar: false, responsive: true };
  }

  function ready() {
    return typeof Plotly !== "undefined" && Plotly.react;
  }

  function headcount(id, series, compact) {
    if (!ready()) return;
    const box = compact ? compactLayout() : layout();
    Plotly.react(
      id,
      [
        {
          x: series.x,
          y: series.y,
          type: "scatter",
          mode: "lines+markers",
          name: "Headcount",
          line: { color: "#f2f2f2", width: 1.5 },
          marker: { size: 5 }
        }
      ],
      box,
      opts()
    );
  }

  function overtime(id, series, compact) {
    if (!ready()) return;
    const box = compact ? compactLayout() : layout();
    Plotly.react(
      id,
      [{ x: series.x, y: series.y, type: "bar", name: "Overtime hours", marker: { color: "#a3a3a3" } }],
      box,
      opts()
    );
  }

  function flow(id, opened, resolved, compact) {
    if (!ready()) return;
    const box = compact ? compactLayout() : layout();
    Plotly.react(
      id,
      [
        {
          x: opened.x,
          y: opened.y,
          type: "scatter",
          mode: "lines+markers",
          name: "Opened",
          line: { color: "#f2f2f2", width: 1.5 },
          marker: { size: 5 }
        },
        {
          x: resolved.x,
          y: resolved.y,
          type: "scatter",
          mode: "lines+markers",
          name: "Resolved",
          line: { color: "#6e6e6e", width: 1.5 },
          marker: { size: 5 }
        }
      ],
      box,
      opts()
    );
  }

  function aging(id, totals, compact) {
    if (!ready()) return;
    const colors = AGING_KEYS.map((k) => (k === "8-14" || k === "15+" ? "#f2f2f2" : "#3a3a3a"));
    const box = compact ? compactLayout({ hovermode: "closest" }) : layout({ hovermode: "closest" });
    Plotly.react(
      id,
      [
        {
          x: AGING_KEYS.map((k) => k + " days"),
          y: AGING_KEYS.map((k) => totals[k]),
          type: "bar",
          name: "Open",
          marker: { color: colors }
        }
      ],
      box,
      opts()
    );
  }

  function queue(id, rows, compact) {
    if (!ready()) return;
    const box = compact ? compactLayout({ hovermode: "closest" }) : layout({ hovermode: "closest" });
    Plotly.react(
      id,
      [{ x: rows.map((q) => q.name), y: rows.map((q) => q.open), type: "bar", name: "Open", marker: { color: "#a3a3a3" } }],
      box,
      opts()
    );
  }

  function priority(id, totals, compact) {
    if (!ready()) return;
    const box = compact ? compactLayout({ hovermode: "closest" }) : layout({ hovermode: "closest" });
    Plotly.react(
      id,
      [
        {
          x: PRIORITY_KEYS,
          y: PRIORITY_KEYS.map((k) => totals[k]),
          type: "bar",
          name: "Open",
          marker: { color: ["#f2f2f2", "#c4c4c4", "#8a8a8a", "#3a3a3a"] }
        }
      ],
      box,
      opts()
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
