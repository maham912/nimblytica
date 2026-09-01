/* Samples menu — overlay from the ghost CTA; href still works without JS. */
(function () {
  const triggers = document.querySelectorAll("[data-samples-menu]");
  if (!triggers.length) return;
  if (typeof HTMLDialogElement === "undefined") return;

  const root = document.documentElement.getAttribute("data-root") || "";
  const p = (rel) => (root ? root + "/" + rel : rel);

  const CATALOG = [
    {
      id: "people",
      step: "01",
      title: "People / workforce",
      lede: "Executive KPIs, a scorecard, who gets flexed off, the huddle pulse.",
      samples: [
        {
          href: "demo/workforce.html",
          title: "Workforce snapshot",
          caption: "Headcount, attrition, open roles, OT hours."
        },
        {
          href: "demo/scorecard.html",
          title: "Scorecard",
          caption: "Attrition, open roles, OT hours — System to Region."
        },
        {
          href: "demo/shift-board.html",
          title: "Shift Board",
          caption: "Who gets flexed off this shift when volume is low."
        },
        {
          href: "demo/ops-pulse.html",
          title: "Pulse",
          caption: "Open, late, aging — the huddle, not a ticket dump."
        }
      ]
    },
    {
      id: "data",
      step: "02",
      title: "Data / pipeline",
      lede: "People-analytics export into a warehouse kernel the board can read.",
      samples: [
        {
          href: "demo/pipeline.html",
          title: "Metric kernel",
          caption: "People-analytics export → Data Factory → blob → Snowflake."
        }
      ]
    },
    {
      id: "email",
      step: "03",
      title: "Email / program automations",
      lede: "When a cohort finishes, the people who need to know get one email.",
      samples: [
        {
          href: "demo/program-complete.html",
          title: "Program complete",
          caption: "Manager recap and participant note. Invented cohort."
        }
      ]
    }
  ];

  const sheet = document.createElement("dialog");
  sheet.className = "samples-sheet";
  sheet.setAttribute("aria-labelledby", "samples-sheet-title");
  sheet.innerHTML =
    '<div class="samples-sheet-head">' +
    '<p class="scene-label">Samples</p>' +
    '<button type="button" class="btn ghost" data-samples-close>Close</button>' +
    "</div>" +
    '<h2 id="samples-sheet-title">What we can show</h2>' +
    '<div data-samples-view="categories"></div>' +
    '<div data-samples-view="list" hidden></div>' +
    '<p class="caption"><a href="' +
    p("demo/samples.html") +
    '">Open the full list</a></p>';

  const catsView = sheet.querySelector('[data-samples-view="categories"]');
  const listView = sheet.querySelector('[data-samples-view="list"]');

  catsView.innerHTML = CATALOG.map(function (cat) {
    return (
      '<button type="button" class="cat" data-samples-cat="' +
      cat.id +
      '">' +
      '<span class="step">' +
      cat.step +
      "</span>" +
      "<h3>" +
      cat.title +
      "</h3>" +
      "<p>" +
      cat.lede +
      "</p>" +
      "</button>"
    );
  }).join("");

  function showCategories() {
    catsView.hidden = false;
    listView.hidden = true;
    listView.innerHTML = "";
    sheet.querySelector("#samples-sheet-title").textContent = "What we can show";
  }

  function showCategory(id) {
    const cat = CATALOG.filter(function (c) {
      return c.id === id;
    })[0];
    if (!cat) return;
    catsView.hidden = true;
    listView.hidden = false;
    sheet.querySelector("#samples-sheet-title").textContent = cat.title;
    listView.innerHTML =
      '<button type="button" class="samples-back" data-samples-back>All categories</button>' +
      '<p class="lede">' +
      cat.lede +
      "</p>" +
      '<div class="sample-links">' +
      cat.samples
        .map(function (s) {
          return (
            '<a class="sample-row" href="' +
            p(s.href) +
            '"><span class="nm">' +
            s.title +
            '</span><span class="d">' +
            s.caption +
            "</span></a>"
          );
        })
        .join("") +
      "</div>";
    const back = listView.querySelector("[data-samples-back]");
    if (back) back.focus();
  }

  function openSheet(trigger) {
    showCategories();
    if (!sheet.isConnected) document.body.appendChild(sheet);
    if (!sheet.open) sheet.showModal();
    triggers.forEach(function (t) {
      t.setAttribute("aria-expanded", t === trigger ? "true" : "false");
    });
    const closeBtn = sheet.querySelector("[data-samples-close]");
    if (closeBtn) closeBtn.focus();
  }

  function closeSheet() {
    if (sheet.open) sheet.close();
  }

  sheet.addEventListener("click", function (e) {
    const t = e.target && e.target.closest ? e.target.closest("[data-samples-close], [data-samples-cat], [data-samples-back]") : null;
    if (!t) {
      if (e.target === sheet) closeSheet();
      return;
    }
    if (t.hasAttribute("data-samples-close")) {
      closeSheet();
      return;
    }
    if (t.hasAttribute("data-samples-back")) {
      showCategories();
      const first = catsView.querySelector("[data-samples-cat]");
      if (first) first.focus();
      return;
    }
    const id = t.getAttribute("data-samples-cat");
    if (id) showCategory(id);
  });

  sheet.addEventListener("close", function () {
    triggers.forEach(function (t) {
      t.setAttribute("aria-expanded", "false");
    });
    const opener = document.querySelector("[data-samples-menu][data-samples-last='1']");
    if (opener) {
      opener.removeAttribute("data-samples-last");
      opener.focus();
    }
  });

  triggers.forEach(function (btn) {
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function (e) {
      if (e.defaultPrevented) return;
      if (e.button != null && e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      triggers.forEach(function (t) {
        t.removeAttribute("data-samples-last");
      });
      btn.setAttribute("data-samples-last", "1");
      openSheet(btn);
    });
  });
})();
