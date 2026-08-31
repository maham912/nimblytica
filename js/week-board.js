/* Homepage Week Board — department / hierarchy toggle, in-page ticks. */
(function () {
  const mount = document.getElementById("week-board");
  if (!mount) return;

  const DATA_URL = new URL("../data/workforce.fake.json", document.currentScript.src);
  const GROUPS = [
    { name: "Clinical", depts: ["Nursing", "Clinical Support", "Quality"] },
    { name: "Revenue", depts: ["Revenue Cycle", "Finance"] },
    { name: "Corporate", depts: ["Operations", "IT", "Administration"] }
  ];

  let DATA = null;
  let MODE = "department";
  let CUT = "all";

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
      });
      el.appendChild(b);
    });
  }

  function renderMode() {
    document.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-mode") === MODE ? "true" : "false");
    });
  }

  function renderKpis(animate) {
    const rows = deptsFor(CUT);
    const hc = sum(rows, "headcount");
    const open = sum(rows, "open_roles");
    const ot = sum(rows, "overtime_hours_12mo");
    const attr = rows.length === 1 ? rows[0].attrition_pct : DATA.kpis.attrition_12mo_pct;
    const set = (id, val, opts) => {
      const el = document.getElementById(id);
      if (animate) NimblyticaTick.tick(el, val, opts);
      else el.textContent = (opts && opts.suffix ? "" : "") + NimblyticaTick.fmt(val, opts && opts.digits) + ((opts && opts.suffix) || "");
    };
    set("wb-hc", hc);
    set("wb-open", open);
    set("wb-attr", attr, { suffix: "%" });
    set("wb-ot", ot);
    document.getElementById("wb-cut").textContent = CUT === "all" ? DATA.org : CUT;
    document.getElementById("wb-asof").textContent = DATA.as_of;
  }

  function renderList() {
    const rows = deptsFor(CUT)
      .slice()
      .sort((a, b) => b.overtime_hours_12mo - a.overtime_hours_12mo)
      .slice(0, 5);
    document.getElementById("wb-list").innerHTML = rows
      .map(
        (d) =>
          `<li><span class="u">${d.name}</span><span class="v">${NimblyticaTick.fmt(d.open_roles)} open</span><span class="v">${NimblyticaTick.fmt(d.overtime_hours_12mo)} OT</span></li>`
      )
      .join("");
  }

  function render(animate) {
    renderMode();
    renderSlicer();
    renderKpis(animate);
    renderList();
  }

  document.getElementById("wb-mode").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;
    MODE = btn.getAttribute("data-mode");
    CUT = "all";
    render(true);
  });

  fetch(DATA_URL)
    .then((r) => {
      if (!r.ok) throw new Error("Could not load snapshot");
      return r.json();
    })
    .then((json) => {
      DATA = json;
      render(false);
    })
    .catch((err) => {
      document.getElementById("wb-asof").textContent = "Serve over HTTP so the snapshot can load. " + err.message;
    });
})();
