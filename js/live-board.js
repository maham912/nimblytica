/* Homepage / two-weeks live board — workforce charts, department / hierarchy, optional cut loop. */
(function () {
  const mount = document.getElementById("live-board");
  if (!mount) return;

  const DATA_URL = new URL("../data/workforce.fake.json", document.currentScript.src);
  const CYCLE_MS = 3000;
  const GROUPS = [
    { name: "Clinical", depts: ["Nursing", "Clinical Support", "Quality"] },
    { name: "Revenue", depts: ["Revenue Cycle", "Finance"] },
    { name: "Corporate", depts: ["Operations", "IT", "Administration"] }
  ];

  const fmt = (n) => Number(n).toLocaleString("en-US");
  const cycling = mount.getAttribute("data-cycle") !== "off";

  let DATA = null;
  let MODE = "department";
  let CUT = "all";
  let timer = null;
  let paused = false;

  function deptsFor(name) {
    if (MODE === "department") {
      return name === "all" ? DATA.departments : DATA.departments.filter((d) => d.name === name);
    }
    if (name === "all") return DATA.departments;
    const g = GROUPS.find((x) => x.name === name);
    return DATA.departments.filter((d) => g && g.depts.indexOf(d.name) !== -1);
  }

  function sum(list, key) {
    return list.reduce((n, r) => n + (Number(r[key]) || 0), 0);
  }

  function cuts() {
    return MODE === "department" ? DATA.departments.map((d) => d.name) : GROUPS.map((g) => g.name);
  }

  function series(src) {
    const names = CUT === "all" ? ["all"] : deptsFor(CUT).map((d) => d.name);
    return {
      x: src.map((d) => d.month),
      y: src.map((d) => names.reduce((n, key) => n + (Number(d[key]) || 0), 0))
    };
  }

  function renderSlicer() {
    const el = document.getElementById("wb-slicer");
    const names = ["all", ...cuts()];
    el.innerHTML = "";
    names.forEach((name) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = name === "all" ? "All" : name;
      b.setAttribute("aria-pressed", name === CUT ? "true" : "false");
      b.addEventListener("click", () => {
        CUT = name;
        render(true);
        restartCycle();
      });
      el.appendChild(b);
    });
  }

  function renderMode() {
    document.querySelectorAll("#wb-mode [data-mode]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-mode") === MODE ? "true" : "false");
    });
  }

  function renderKpis(animate) {
    const rows = deptsFor(CUT);
    const hc = sum(rows, "headcount");
    const open = sum(rows, "open_roles");
    const ot = sum(rows, "overtime_hours_12mo");
    const attr = rows.length === 1 ? rows[0].attrition_pct : DATA.kpis.attrition_12mo_pct;
    const span = rows.length === 1 ? rows[0].span : DATA.kpis.span_of_control;
    const set = (id, val, opts) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (animate && window.NimblyticaTick) NimblyticaTick.tick(el, val, opts);
      else {
        const digits = opts && opts.digits;
        const suffix = (opts && opts.suffix) || "";
        el.textContent = (window.NimblyticaTick ? NimblyticaTick.fmt(val, digits) : fmt(val)) + suffix;
      }
    };
    set("wb-hc", hc);
    set("wb-open", open);
    set("wb-attr", attr, { suffix: "%" });
    const otEl = document.getElementById("wb-ot");
    const spanEl = document.getElementById("wb-span");
    if (otEl) set("wb-ot", ot);
    if (spanEl) set("wb-span", span);
    const hcD = document.getElementById("wb-hc-d");
    if (hcD) hcD.textContent = CUT === "all" ? DATA.org : CUT;
    const otD = document.getElementById("wb-ot-d");
    if (otD) otD.textContent = fmt(ot) + " OT hours / 12 mo";
    const openD = document.getElementById("wb-open-d");
    if (openD) openD.textContent = fmt(DATA.kpis.hires_90d) + " hires / 90 days (org)";
    const attrD = document.getElementById("wb-attr-d");
    if (attrD) attrD.textContent = CUT === "all" ? fmt(DATA.kpis.terms_12mo) + " terms (org)" : "Unit rate";
    document.getElementById("wb-cut").textContent = CUT === "all" ? DATA.org : CUT;
    document.getElementById("wb-asof").textContent = DATA.as_of;
  }

  function renderTrend() {
    if (!window.NimblyticaCharts) return;
    NimblyticaCharts.headcount("wb-chart-hc", series(DATA.trend_headcount), true);
    NimblyticaCharts.overtime("wb-chart-ot", series(DATA.trend_overtime_hours), true);
  }

  function renderLists() {
    const rows = deptsFor(CUT)
      .slice()
      .sort((a, b) => b.overtime_hours_12mo - a.overtime_hours_12mo)
      .slice(0, 5);
    const top = document.getElementById("wb-top-body");
    if (top) {
      top.innerHTML = rows
        .map(
          (d, i) =>
            `<tr><td>${i + 1}</td><td>${d.name}</td><td>${fmt(d.overtime_hours_12mo)}</td><td>${fmt(d.open_roles)}</td><td>${d.attrition_pct}%</td><td>${d.owner}</td></tr>`
        )
        .join("");
    }
    const neu = document.getElementById("wb-new-body");
    if (neu) {
      const deptNames = deptsFor(CUT).map((d) => d.name);
      const hires = (DATA.new_hires || []).filter((h) => CUT === "all" || deptNames.indexOf(h.dept) !== -1);
      neu.innerHTML =
        hires.map((h) => `<tr><td>${h.start}</td><td>${h.name}</td><td>${h.role}</td><td>${h.dept}</td></tr>`).join("") ||
        `<tr><td colspan="4">No new names on this cut.</td></tr>`;
    }
    const list = document.getElementById("wb-list");
    if (list) {
      list.innerHTML = rows
        .map(
          (d) =>
            `<li><span class="u">${d.name}</span><span class="v">${fmt(d.open_roles)} open</span><span class="v">${fmt(d.overtime_hours_12mo)} OT</span></li>`
        )
        .join("");
    }
  }

  function render(animate) {
    renderMode();
    renderSlicer();
    renderKpis(animate);
    renderTrend();
    renderLists();
  }

  function stopCycle() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function restartCycle() {
    stopCycle();
    if (!cycling) return;
    if (window.NimblyticaTick && NimblyticaTick.reduce()) return;
    timer = setInterval(() => {
      if (paused || document.hidden) return;
      const names = ["all", ...cuts()];
      const i = names.indexOf(CUT);
      CUT = names[(i + 1) % names.length];
      render(true);
    }, CYCLE_MS);
  }

  function bindPause() {
    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };
    mount.addEventListener("mouseenter", pause);
    mount.addEventListener("mouseleave", resume);
    mount.addEventListener("focusin", pause);
    mount.addEventListener("focusout", (e) => {
      if (!mount.contains(e.relatedTarget)) resume();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pause();
      else resume();
    });
  }

  document.getElementById("wb-mode").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;
    MODE = btn.getAttribute("data-mode");
    CUT = "all";
    render(true);
    restartCycle();
  });

  bindPause();

  fetch(DATA_URL)
    .then((r) => {
      if (!r.ok) throw new Error("Could not load snapshot");
      return r.json();
    })
    .then((json) => {
      DATA = json;
      render(false);
      restartCycle();
    })
    .catch((err) => {
      document.getElementById("wb-asof").textContent = "Serve over HTTP so the snapshot can load. " + err.message;
    });
})();
