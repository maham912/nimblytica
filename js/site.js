/* Shared chrome. data-root is "" on home, ".." on nested pages. */
(function () {
  const root = document.documentElement.getAttribute("data-root") || "";
  const p = (rel) => (root ? root + "/" + rel : rel);

  const current = document.documentElement.getAttribute("data-page") || "";

  const header = document.querySelector("[data-chrome='header']");
  if (header) {
    header.innerHTML = `
      <div class="wrap top-inner">
        <a class="wordmark" href="${p("index.html")}">Nimblytica</a>
        <nav class="links" aria-label="Primary">
          <a href="${p("demo/workforce.html")}" ${current === "workforce" ? 'aria-current="page"' : ""}>Workforce</a>
          <a href="${p("demo/ops-pulse.html")}" ${current === "ops-pulse" ? 'aria-current="page"' : ""}>Ops pulse</a>
          <a href="${p("demo/llm.html")}" ${current === "llm" ? 'aria-current="page"' : ""}>Briefing</a>
          <a href="${p("work/pipeline.html")}" ${current === "pipeline" ? 'aria-current="page"' : ""}>Pipeline</a>
          <a href="${p("work/self-serve.html")}" ${current === "self-serve" ? 'aria-current="page"' : ""}>Self-serve</a>
          <a href="${p("work/llm-insights.html")}" ${current === "llm-insights" ? 'aria-current="page"' : ""}>Insights layer</a>
          <a href="${p("work/ops-pulse.html")}" ${current === "ops-pulse-note" ? 'aria-current="page"' : ""}>Ops pulse note</a>
        </nav>
      </div>`;
  }

  const footer = document.querySelector("[data-chrome='footer']");
  if (footer) {
    footer.innerHTML = `
      <div class="wrap foot">
        <div>Nimblytica Inc. · Maham Marashizadeh, president</div>
        <div><a href="mailto:nimblytica@agentmail.to">nimblytica@agentmail.to</a></div>
      </div>`;
  }
})();
