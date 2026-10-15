/* Reconcile sample. Step buttons and Next. The three steps stay in the page without this script. */
(function () {
  var root = document.getElementById("reconcile");
  if (!root) return;

  var panels = Array.prototype.slice.call(root.querySelectorAll("[data-rec-panel]"));
  if (!panels.length) return;

  function show(id) {
    if (id !== "1" && id !== "2" && id !== "3") return;
    panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-rec-panel") !== id;
    });
    root.querySelectorAll("[data-step]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-step") === id ? "true" : "false");
    });
  }

  root.addEventListener("click", function (e) {
    var el = e.target && e.target.closest ? e.target : null;
    if (!el || !el.closest) return;

    var stepBtn = el.closest("[data-step]");
    if (stepBtn && root.contains(stepBtn)) {
      show(stepBtn.getAttribute("data-step"));
      return;
    }

    var next = el.closest("[data-rec-next]");
    if (next && root.contains(next)) {
      e.preventDefault();
      var id = next.getAttribute("data-rec-next");
      show(id);
      var current = null;
      root.querySelectorAll("[data-step]").forEach(function (btn) {
        if (btn.getAttribute("data-step") === id) current = btn;
      });
      if (current) current.focus();
    }
  });

  var initial = "1";
  var match = /^#rec-([123])$/.exec(window.location.hash || "");
  if (match) initial = match[1];
  show(initial);
})();
