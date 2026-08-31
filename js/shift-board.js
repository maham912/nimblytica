/* Shift Board — who gets flexed off this shift when volume is low. */
(function () {
  const DATA_URL = new URL("../data/shift-board.fake.json", document.currentScript.src);
  let DATA = null;

  const state = {
    date: "2026-08-28",
    shift: "Night",
    site: "all",
    role: "all",
    q: ""
  };

  function el(id) {
    return document.getElementById(id);
  }

  function rows() {
    const q = state.q.trim().toLowerCase();
    return DATA.rows
      .filter((r) => r.report_date === state.date)
      .filter((r) => r.shift === state.shift)
      .filter((r) => state.site === "all" || r.site === state.site)
      .filter((r) => state.role === "all" || r.role_group === state.role)
      .filter((r) => {
        if (!q) return true;
        return r.name.toLowerCase().indexOf(q) !== -1 || r.staff_id.toLowerCase().indexOf(q) !== -1;
      })
      .slice()
      .sort((a, b) => b.call_off_factor - a.call_off_factor);
  }

  function fillSelect(id, values, allLabel) {
    const s = el(id);
    const cur = s.value;
    s.innerHTML = "";
    if (allLabel) {
      const o = document.createElement("option");
      o.value = "all";
      o.textContent = allLabel;
      s.appendChild(o);
    }
    values.forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      s.appendChild(o);
    });
    if ([...s.options].some((o) => o.value === cur)) s.value = cur;
  }

  function render() {
    const list = rows();
    const ids = new Set(list.map((r) => r.staff_id));
    NimblyticaTick.tick(el("sb-count"), ids.size);
    el("sb-count-label").textContent = ids.size === 1 ? "staff on this cut" : "staff on this cut";

    el("sb-body").innerHTML = list
      .map(
        (r) =>
          `<tr>
            <td>${r.name}<div class="d">${r.staff_id}</div></td>
            <td>${r.site} / ${r.unit}</td>
            <td>${r.job}</td>
            <td>${r.shift_start}</td>
            <td>${r.duration_hours}</td>
            <td class="factor">${r.call_off_factor.toFixed(1)}</td>
            <td>${r.period_hours}</td>
            <td>${NimblyticaTick.fmt(r.ytd_hours)}</td>
            <td>${r.fte.toFixed(1)}</td>
          </tr>`
      )
      .join("") || `<tr><td colspan="9">No staff on this cut.</td></tr>`;

    const refreshed = DATA.last_refreshed.replace("T", " · ").replace(/:00$/, "");
    el("sb-refreshed").textContent = "Last refreshed " + refreshed;
    el("sb-source").textContent = DATA.refresh_note + " · Source: " + DATA.source;
  }

  function bind() {
    el("sb-date").addEventListener("change", (e) => {
      state.date = e.target.value;
      render();
    });
    el("sb-shift").addEventListener("change", (e) => {
      state.shift = e.target.value;
      render();
    });
    el("sb-site").addEventListener("change", (e) => {
      state.site = e.target.value;
      render();
    });
    el("sb-role").addEventListener("change", (e) => {
      state.role = e.target.value;
      render();
    });
    el("sb-q").addEventListener("input", (e) => {
      state.q = e.target.value;
      render();
    });
    el("sb-clear").addEventListener("click", () => {
      state.date = DATA.report_dates[0];
      state.shift = "Night";
      state.site = "all";
      state.role = "all";
      state.q = "";
      el("sb-date").value = state.date;
      el("sb-shift").value = state.shift;
      el("sb-site").value = state.site;
      el("sb-role").value = state.role;
      el("sb-q").value = "";
      render();
    });
  }

  fetch(DATA_URL)
    .then((r) => {
      if (!r.ok) throw new Error("Could not load Shift Board");
      return r.json();
    })
    .then((json) => {
      DATA = json;
      fillSelect("sb-date", DATA.report_dates);
      fillSelect("sb-shift", DATA.shifts);
      fillSelect("sb-site", DATA.sites, "All sites");
      fillSelect("sb-role", DATA.role_groups, "All role groups");
      el("sb-date").value = state.date;
      el("sb-shift").value = state.shift;
      el("org-name").textContent = DATA.org;
      bind();
      render();
    })
    .catch((err) => {
      el("banner").textContent = "Serve this folder over HTTP so the JSON can load. (" + err.message + ")";
    });
})();
