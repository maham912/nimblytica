/* Executive scorecard — System → Division → Region. Static JSON. */
(function () {
  const DATA_URL = new URL("../data/scorecard.fake.json", document.currentScript.src);
  let DATA = null;
  let path = [];

  function find(id, node) {
    if (node.id === id) return node;
    const kids = node.children || [];
    for (let i = 0; i < kids.length; i++) {
      const hit = find(id, kids[i]);
      if (hit) return hit;
    }
    return null;
  }

  function current() {
    if (!path.length) return DATA.tree;
    return find(path[path.length - 1], DATA.tree) || DATA.tree;
  }

  function status(metric, value) {
    const v = Number(value);
    if (metric.direction === "lower") {
      if (v <= metric.outstanding) return "Outstanding";
      if (v <= metric.target) return "Target";
      if (v <= metric.threshold) return "Threshold";
      return "Watch";
    }
    if (v >= metric.outstanding) return "Outstanding";
    if (v >= metric.target) return "Target";
    if (v >= metric.threshold) return "Threshold";
    return "Watch";
  }

  function fmt(metric, value) {
    if (metric.unit === "%") return Number(value) + "%";
    if (metric.id === "engagement") return Number(value).toFixed(1);
    return String(value);
  }

  function crumb() {
    const el = document.getElementById("sc-drill");
    const trail = [{ id: DATA.tree.id, name: DATA.tree.name, level: DATA.tree.level }];
    path.forEach((id) => {
      const n = find(id, DATA.tree);
      if (n && n.id !== DATA.tree.id) trail.push({ id: n.id, name: n.name, level: n.level });
    });
    el.innerHTML = trail
      .map((n, i) => {
        if (i === trail.length - 1) return `<span class="here">${n.level} · ${n.name}</span>`;
        return `<button type="button" data-to="${n.id}">${n.level} · ${n.name}</button><span aria-hidden="true"> / </span>`;
      })
      .join("");
    el.querySelectorAll("button[data-to]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-to");
        if (id === DATA.tree.id) path = [];
        else {
          const idx = path.indexOf(id);
          path = idx === -1 ? [id] : path.slice(0, idx + 1);
        }
        render();
      });
    });
  }

  function scores(node) {
    const box = document.getElementById("sc-scores");
    box.innerHTML = DATA.metrics
      .map((m) => {
        const v = node.values[m.id];
        const st = status(m, v);
        return `<article class="score">
          <h2>${m.label}</h2>
          <div class="n">${fmt(m, v)}</div>
          <div class="status">${st}</div>
          <div class="bands">
            <div>Outstanding ${fmt(m, m.outstanding)}</div>
            <div>Target ${fmt(m, m.target)}</div>
            <div>Threshold ${fmt(m, m.threshold)}</div>
            <div>${m.direction === "lower" ? "Lower is better" : "Higher is better"}</div>
          </div>
        </article>`;
      })
      .join("");
  }

  function children(node) {
    const box = document.getElementById("sc-children");
    const kids = node.children || [];
    if (!kids.length) {
      box.innerHTML = "";
      return;
    }
    const next = kids[0].level;
    const head = DATA.metrics.map((m) => `<span class="cell">${m.label}</span>`).join("");
    const rows = kids
      .map((k) => {
        const cells = DATA.metrics
          .map((m) => `<span class="cell">${fmt(m, k.values[m.id])} · ${status(m, k.values[m.id])}</span>`)
          .join("");
        return `<button type="button" class="row" data-id="${k.id}"><span class="nm">${k.name}</span>${cells}</button>`;
      })
      .join("");
    box.innerHTML = `<p class="meta">${next}</p><div class="children">${rows}</div>`;
    box.querySelectorAll("button.row").forEach((b) => {
      b.addEventListener("click", () => {
        path.push(b.getAttribute("data-id"));
        render();
      });
    });
  }

  function render() {
    const node = current();
    document.getElementById("org-name").textContent = DATA.org;
    document.getElementById("as-of").textContent = DATA.as_of;
    crumb();
    scores(node);
    children(node);
  }

  fetch(DATA_URL)
    .then((r) => {
      if (!r.ok) throw new Error("Could not load scorecard");
      return r.json();
    })
    .then((json) => {
      DATA = json;
      render();
    })
    .catch((err) => {
      document.getElementById("banner").textContent =
        "Serve this folder over HTTP so the JSON can load. (" + err.message + ")";
    });
})();
