/* Program-complete sample — switch manager recap / participant note. */
(function () {
  const slicer = document.getElementById("mail-slicer");
  if (!slicer) return;

  const views = {
    manager: document.getElementById("mail-manager"),
    participant: document.getElementById("mail-participant")
  };

  function show(id) {
    Object.keys(views).forEach(function (key) {
      const el = views[key];
      if (!el) return;
      el.hidden = key !== id;
    });
    slicer.querySelectorAll("[data-mail]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-mail") === id ? "true" : "false");
    });
  }

  slicer.addEventListener("click", function (e) {
    const btn = e.target && e.target.closest ? e.target.closest("[data-mail]") : null;
    if (!btn) return;
    show(btn.getAttribute("data-mail"));
  });
})();
