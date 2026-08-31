/* Metric kernel — click or hover a stage; copy and as-of tick in-page. */
(function () {
  const mount = document.getElementById("warehouse");
  if (!mount) return;

  const DATA_URL = new URL("../data/pipeline.fake.json", document.currentScript.src);

  let DATA = null;
  let PINNED = "export";
  let PREVIEW = null;

  function el(id) {
    return document.getElementById(id);
  }

  function stageById(id) {
    return DATA.stages.find((s) => s.id === id) || DATA.stages[0];
  }

  function activeId() {
    return PREVIEW || PINNED;
  }

  function asOf(stage) {
    return stage.clock ? stage.as_of + " · " + stage.clock : stage.as_of;
  }

  function paintCopy(stage, animate) {
    el("org-name").textContent = DATA.org;
    el("as-of").textContent = asOf(stage);
    el("wh-asof").textContent = asOf(stage);
    el("wh-step").textContent = stage.step;
    el("wh-title").textContent = stage.title;
    el("wh-body").textContent = stage.body;
    el("wh-n-label").textContent = stage.kpi.label;
    el("wh-clock").textContent = stage.clock || "—";
    if (animate) NimblyticaTick.tick(el("wh-n"), stage.kpi.n);
    else el("wh-n").textContent = NimblyticaTick.fmt(stage.kpi.n);

    mount.classList.toggle("is-grain", stage.id === "snowflake");

    mount.querySelectorAll("[data-stage]").forEach((btn) => {
      const on = btn.getAttribute("data-stage") === activeId();
      btn.setAttribute("aria-checked", on ? "true" : "false");
      btn.tabIndex = on ? 0 : -1;
    });
  }

  function pin(id, animate) {
    PINNED = id;
    PREVIEW = null;
    paintCopy(stageById(id), animate);
  }

  function preview(id) {
    if (id === activeId()) return;
    PREVIEW = id;
    paintCopy(stageById(id), true);
  }

  function clearPreview(related) {
    if (!PREVIEW) return;
    if (related && related.closest && related.closest("[data-stage]")) return;
    PREVIEW = null;
    paintCopy(stageById(PINNED), false);
  }

  function bindStage(btn) {
    const id = btn.getAttribute("data-stage");
    btn.addEventListener("click", () => pin(id, true));
    btn.addEventListener("keydown", (e) => {
      const ids = DATA.stages.map((s) => s.id);
      const i = ids.indexOf(activeId());
      let next = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(ids.length - 1, i + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(0, i - 1);
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = ids.length - 1;
      if (next === -1 || next === i) return;
      e.preventDefault();
      pin(ids[next], true);
      const target = mount.querySelector("[data-stage='" + ids[next] + "']");
      if (target) target.focus();
    });
    btn.addEventListener("pointerenter", () => preview(id));
    btn.addEventListener("mouseenter", () => preview(id));
    btn.addEventListener("pointerleave", (e) => clearPreview(e.relatedTarget));
    btn.addEventListener("mouseleave", (e) => clearPreview(e.relatedTarget));
  }

  function renderRail() {
    const rail = el("wh-rail");
    rail.innerHTML = "";
    DATA.stages.forEach((stage, i) => {
      if (i) {
        const arrow = document.createElement("span");
        arrow.className = "wh-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";
        rail.appendChild(arrow);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wh-stage";
      btn.setAttribute("role", "radio");
      btn.setAttribute("data-stage", stage.id);
      btn.setAttribute("aria-checked", stage.id === PINNED ? "true" : "false");
      const step = document.createElement("span");
      step.className = "step";
      step.textContent = stage.step;
      const name = document.createElement("span");
      name.className = "wh-name";
      name.textContent = stage.short;
      const hint = document.createElement("span");
      hint.className = "wh-hint";
      hint.textContent = stage.hint;
      btn.append(step, name, hint);
      bindStage(btn);
      rail.appendChild(btn);
    });
  }

  fetch(DATA_URL)
    .then((r) => {
      if (!r.ok) throw new Error("Could not load kernel");
      return r.json();
    })
    .then((json) => {
      DATA = json;
      PINNED = DATA.stages[0].id;
      renderRail();
      paintCopy(DATA.stages[0], false);
    })
    .catch((err) => {
      el("as-of").textContent = "Serve over HTTP so the kernel can load. " + err.message;
    });
})();
