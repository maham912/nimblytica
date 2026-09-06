/* Shared chrome, motion preference, same-origin view transitions. */
(function () {
  const root = document.documentElement.getAttribute("data-root") || "";
  const p = (rel) => (root ? root + "/" + rel : rel);
  const current = document.documentElement.getAttribute("data-page") || "";
  const mobileNav = window.matchMedia("(max-width: 879px)");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("reduce-motion");
  }

  const header = document.querySelector("[data-chrome='header']");
  if (header) {
    const contactHref = document.getElementById("contact") ? "#contact" : p("index.html") + "#contact";
    header.innerHTML = `
      <div class="wrap top-inner">
        <a class="wordmark" href="${p("index.html")}">Nimblytica</a>
        <details class="nav-fold">
          <summary class="nav-toggle">Menu</summary>
          <nav class="links" aria-label="Primary">
            <a href="${p("two-weeks.html")}" ${current === "two-weeks" ? 'aria-current="page"' : ""}>Two weeks</a>
            <a href="${p("packages.html")}" ${current === "packages" ? 'aria-current="page"' : ""}>Packages</a>
            <a href="${p("demo/samples.html")}" ${current === "samples" || current === "program-complete" ? 'aria-current="page"' : ""}>Samples</a>
            <a href="${p("demo/shift-board.html")}" ${current === "shift-board" ? 'aria-current="page"' : ""}>Shift Board</a>
            <a href="${p("demo/scorecard.html")}" ${current === "scorecard" ? 'aria-current="page"' : ""}>Scorecard</a>
            <a href="${p("demo/ops-pulse.html")}" ${current === "ops-pulse" ? 'aria-current="page"' : ""}>Pulse</a>
            <a href="${p("demo/pipeline.html")}" ${current === "pipeline" ? 'aria-current="page"' : ""}>Pipeline</a>
            <a href="${contactHref}">Contact</a>
          </nav>
        </details>
      </div>`;

    const fold = header.querySelector(".nav-fold");
    const summary = fold && fold.querySelector("summary");
    const nav = fold && fold.querySelector("nav.links");

    function lockBody(on) {
      if (!mobileNav.matches) {
        document.body.classList.remove("nav-open");
        document.body.style.overflow = "";
        return;
      }
      document.body.classList.toggle("nav-open", on);
      document.body.style.overflow = on ? "hidden" : "";
    }

    function closeMenu(restoreFocus) {
      if (!fold) return;
      fold.removeAttribute("open");
      lockBody(false);
      if (restoreFocus && summary) summary.focus();
    }

    function menuFocusables() {
      const links = nav ? Array.from(nav.querySelectorAll("a")) : [];
      return [summary].concat(links).filter(Boolean);
    }

    if (fold) {
      fold.addEventListener("toggle", () => {
        lockBody(!!fold.open);
      });

      header.querySelectorAll(".links a").forEach((a) => {
        a.addEventListener("click", () => closeMenu(false));
      });

      document.addEventListener("click", (e) => {
        if (fold.open && !fold.contains(e.target)) closeMenu(true);
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && fold.open && mobileNav.matches) {
          e.preventDefault();
          closeMenu(true);
        }
      });

      fold.addEventListener("keydown", (e) => {
        if (!fold.open || !mobileNav.matches || e.key !== "Tab") return;
        const items = menuFocusables();
        if (items.length < 2) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      });

      mobileNav.addEventListener("change", () => {
        if (!mobileNav.matches) lockBody(false);
        else if (fold.open) lockBody(true);
      });
    }
  }

  const footer = document.querySelector("[data-chrome='footer']");
  if (footer) {
    footer.innerHTML = `
      <div class="wrap foot">
        <div>Nimblytica</div>
        <nav class="foot-links" aria-label="Footer">
          <a href="${p("two-weeks.html")}">Two weeks</a>
          <a href="${p("packages.html")}">Packages</a>
          <a href="${p("trust.html")}">Trust</a>
          <a href="mailto:hello@nimblytica.com">hello@nimblytica.com</a>
        </nav>
      </div>`;
  }

  /* Sticky mobile CTA: hide when a form submit is on-screen so it never covers send. */
  const ctaBar = document.querySelector(".mobile-cta-bar");
  if (ctaBar) {
    document.body.classList.add("has-mobile-cta");
    const submits = document.querySelectorAll(
      '#contact-sheet button[type="submit"], #sample-gate button[type="submit"]'
    );
    if (submits.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          const cover = entries.some((en) => en.isIntersecting);
          ctaBar.classList.toggle("is-hidden", cover);
          ctaBar.setAttribute("aria-hidden", cover ? "true" : "false");
        },
        { root: null, threshold: 0.15, rootMargin: "0px 0px -12% 0px" }
      );
      submits.forEach((el) => io.observe(el));
    }
  }


  /* FAQ: one open at a time (details name fallback) */
  document.querySelectorAll(".faq-list").forEach((list) => {
    list.addEventListener("toggle", (e) => {
      const t = e.target;
      if (!t || t.tagName !== "DETAILS" || !t.open) return;
      list.querySelectorAll("details.faq-item").forEach((d) => {
        if (d !== t) d.open = false;
      });
    }, true);
  });

})();
