/* Apple-style pin scenes: board, pulse, briefing. Pulse uses the ops-pulse charts. */
(function () {
  const scenes = document.querySelectorAll("[data-scene]");
  if (!scenes.length) return;

  const PULSE_URL = new URL("../data/ops-pulse.fake.json", document.currentScript.src);
  const AGING_KEYS = ["0-1", "2-3", "4-7", "8-14", "15+"];

  const brief = [
    "Nursing snapshot as of 2026-08-01: headcount 480, 20 open roles.",
    "Overtime on this cut is 24,000 hours over 12 months.",
    "Next check: night coverage before opening more roles."
  ];

  let PULSE = null;

  function progress(el) {
    const r = el.getBoundingClientRect();
    const span = el.offsetHeight - window.innerHeight;
    if (span <= 0) return 1;
    return Math.min(1, Math.max(0, -r.top / span));
  }

  function paintBoard(p) {
    const cuts = ["All", "Nursing", "Clinical Support", "Revenue Cycle"];
    const nums = [
      [1200, 48, 12],
      [480, 20, 16],
      [220, 8, 10],
      [180, 8, 14]
    ];
    const i = Math.min(cuts.length - 1, Math.floor(p * cuts.length));
    const label = document.getElementById("sc-board-cut");
    const a = document.getElementById("sc-board-a");
    const b = document.getElementById("sc-board-b");
    const c = document.getElementById("sc-board-c");
    if (!label) return;
    label.textContent = cuts[i];
    if (NimblyticaTick.reduce()) {
      a.textContent = NimblyticaTick.fmt(nums[i][0]);
      b.textContent = NimblyticaTick.fmt(nums[i][1]);
      c.textContent = nums[i][2] + "%";
    } else {
      NimblyticaTick.tick(a, nums[i][0], { ms: 420 });
      NimblyticaTick.tick(b, nums[i][1], { ms: 420 });
      c.textContent = nums[i][2] + "%";
    }
  }

  function agingTotals(list) {
    const out = {};
    AGING_KEYS.forEach((k) => {
      out[k] = list.reduce((n, q) => n + (Number(q.aging[k]) || 0), 0);
    });
    return out;
  }

  function pulseCut(p) {
    if (!PULSE) return { name: "all", rows: [] };
    const names = ["all", ...PULSE.queues.map((q) => q.name)];
    const i = Math.min(names.length - 1, Math.floor(p * names.length));
    const name = names[i];
    const rows = name === "all" ? PULSE.queues : PULSE.queues.filter((q) => q.name === name);
    return { name, rows };
  }

  function series(src, field) {
    return {
      x: src.map((d) => d.week),
      y: src.map((d) => d[field])
    };
  }

  function paintPulse(p) {
    if (!PULSE || !window.NimblyticaCharts) return;
    const cut = pulseCut(p);
    const field = cut.name === "all" ? "all" : cut.name;
    const open = cut.rows.reduce((n, q) => n + q.open, 0);
    const breached = cut.rows.reduce((n, q) => n + q.breached, 0);
    const aging = agingTotals(cut.rows);
    const aged = aging["8-14"] + aging["15+"];
    const label = document.getElementById("sc-pulse-cut");
    const a = document.getElementById("sc-pulse-open");
    const b = document.getElementById("sc-pulse-late");
    const c = document.getElementById("sc-pulse-aged");
    if (label) label.textContent = cut.name === "all" ? PULSE.org : cut.name;
    if (a) a.textContent = NimblyticaTick.fmt(open);
    if (b) b.textContent = NimblyticaTick.fmt(breached);
    if (c) c.textContent = NimblyticaTick.fmt(aged);
    NimblyticaCharts.flow("sc-chart-flow", series(PULSE.trend_opened, field), series(PULSE.trend_resolved, field), true);
    NimblyticaCharts.queue("sc-chart-queue", cut.rows, true);
  }

  function paintBrief(p) {
    brief.forEach((_, i) => {
      const el = document.getElementById("sc-brief-" + i);
      if (!el) return;
      el.style.opacity = p > 0.18 + i * 0.22 ? "1" : "0.18";
    });
  }

  let last = { board: -1, pulse: -1, brief: -1 };

  function frame() {
    scenes.forEach((el) => {
      const name = el.getAttribute("data-scene");
      const p = progress(el);
      const bucket = Math.round(p * 20);
      if (name === "board" && bucket !== last.board) {
        last.board = bucket;
        paintBoard(p);
      }
      if (name === "pulse" && bucket !== last.pulse) {
        last.pulse = bucket;
        paintPulse(p);
      }
      if (name === "briefing" && bucket !== last.brief) {
        last.brief = bucket;
        paintBrief(p);
      }
    });
    requestAnimationFrame(frame);
  }

  function start() {
    if (NimblyticaTick.reduce()) {
      paintBoard(1);
      paintPulse(1);
      paintBrief(1);
      return;
    }
    requestAnimationFrame(frame);
  }

  fetch(PULSE_URL)
    .then((r) => {
      if (!r.ok) throw new Error("Could not load pulse");
      return r.json();
    })
    .then((json) => {
      PULSE = json;
      start();
    })
    .catch(() => {
      start();
    });
})();
