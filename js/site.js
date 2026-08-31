/* Shared chrome, motion preference, same-origin view transitions. */
(function () {
  const root = document.documentElement.getAttribute("data-root") || "";
  const p = (rel) => (root ? root + "/" + rel : rel);
  const current = document.documentElement.getAttribute("data-page") || "";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("reduce-motion");
  }

  const header = document.querySelector("[data-chrome='header']");
  if (header) {
    const contactHref = current === "home" || current === "two-weeks" ? "#contact" : p("index.html") + "#contact";
    header.innerHTML = `
      <div class="wrap top-inner">
        <a class="wordmark" href="${p("index.html")}">Nimblytica</a>
        <nav class="links" aria-label="Primary">
          <a href="${p("two-weeks.html")}" ${current === "two-weeks" ? 'aria-current="page"' : ""}>Two weeks</a>
          <a href="${p("demo/shift-board.html")}" ${current === "shift-board" ? 'aria-current="page"' : ""}>Shift Board</a>
          <a href="${p("demo/scorecard.html")}" ${current === "scorecard" ? 'aria-current="page"' : ""}>Scorecard</a>
          <a href="${p("demo/ops-pulse.html")}" ${current === "ops-pulse" ? 'aria-current="page"' : ""}>Pulse</a>
          <a href="${p("demo/pipeline.html")}" ${current === "pipeline" ? 'aria-current="page"' : ""}>Pipeline</a>
          <a href="${contactHref}">Contact</a>
        </nav>
      </div>`;
  }

  const footer = document.querySelector("[data-chrome='footer']");
  if (footer) {
    footer.innerHTML = `
      <div class="wrap foot">
        <div>Nimblytica</div>
        <div><a href="mailto:hello@nimblytica.com">hello@nimblytica.com</a></div>
      </div>`;
  }
})();
