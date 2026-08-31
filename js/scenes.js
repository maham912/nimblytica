/* Apple-style pin scenes: board, pulse, briefing. */
(function () {
  const scenes = document.querySelectorAll("[data-scene]");
  if (!scenes.length) return;

  const pulse = [
    { name: "Workplace", n: 72 },
    { name: "Applications", n: 52 },
    { name: "Identity", n: 48 },
    { name: "Network", n: 36 }
  ];
  const brief = [
    "Nursing snapshot as of 2026-08-01: headcount 480, 20 open roles.",
    "Overtime on this cut is 24,000 hours over 12 months.",
    "Next check: night coverage before opening more roles."
  ];

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

  function paintPulse(p) {
    pulse.forEach((row, i) => {
      const fill = document.getElementById("sc-bar-" + i);
      if (!fill) return;
      const local = Math.min(1, Math.max(0, (p - i * 0.12) / 0.55));
      fill.style.width = Math.round((row.n / 72) * local * 100) + "%";
    });
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
      if (name === "pulse") paintPulse(p);
      if (name === "briefing" && bucket !== last.brief) {
        last.brief = bucket;
        paintBrief(p);
      }
    });
    requestAnimationFrame(frame);
  }

  if (NimblyticaTick.reduce()) {
    paintBoard(1);
    paintPulse(1);
    paintBrief(1);
    return;
  }
  requestAnimationFrame(frame);
})();
