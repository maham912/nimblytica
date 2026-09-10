/* Shared chrome, motion preference, same-origin view transitions. */
(function () {
  const root = document.documentElement.getAttribute("data-root") || "";
  const p = (rel) => (root ? root + "/" + rel : rel);
  const current = document.documentElement.getAttribute("data-page") || "";
  const mobileNav = window.matchMedia("(max-width: 879px)");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("reduce-motion");
  }

  /* Landmark target + skip link (keyboard / Lighthouse). */
  const main = document.querySelector("main");
  if (main && !main.id) main.id = "main";
  if (!document.querySelector(".skip-link") && main) {
    const skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#" + main.id;
    skip.textContent = "Skip to content";
    document.body.insertBefore(skip, document.body.firstChild);
  }

  const header = document.querySelector("[data-chrome='header']");
  if (header) {
    const contactHref = document.getElementById("contact") ? "#contact" : p("index.html") + "#contact";
    header.innerHTML = `
      <div class="wrap top-inner">
        <a class="wordmark" href="${p("index.html")}">
          <img class="wordmark-mark" src="${p("assets/mark.svg")}" width="28" height="28" alt="" />
          <span>Nimblytica</span>
        </a>
        <details class="nav-fold">
          <summary class="nav-toggle" aria-label="Site menu" aria-controls="site-nav" aria-expanded="false">Menu</summary>
          <nav class="links" id="site-nav" aria-label="Primary">
            <a href="${p("two-weeks.html")}" ${current === "two-weeks" ? 'aria-current="page"' : ""}>Jumpstart</a>
            <a href="${p("packages.html")}" ${current === "packages" ? 'aria-current="page"' : ""}>Offers</a>
            <a href="${p("health-check-kit.html")}" ${current === "health-check-kit" ? 'aria-current="page"' : ""}>Kit $149</a>
            <a href="${p("live-install.html")}" ${current === "live-install" ? 'aria-current="page"' : ""}>Live install</a>
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

    function syncNavExpanded() {
      if (!summary || !fold) return;
      const open = !!fold.open;
      summary.setAttribute("aria-expanded", open ? "true" : "false");
      summary.setAttribute("aria-label", open ? "Close site menu" : "Site menu");
    }

    /* Desktop ≥880px: keep details open so nav.links stays visible (closed
       <details> hides children even when CSS sets display). Mobile unchanged. */
    function syncDesktopNav() {
      if (!fold) return;
      if (!mobileNav.matches) {
        fold.setAttribute("open", "");
        lockBody(false);
      }
      syncNavExpanded();
    }

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
      if (!mobileNav.matches) {
        /* Never collapse primary links on desktop. */
        fold.setAttribute("open", "");
        lockBody(false);
        syncNavExpanded();
        return;
      }
      fold.removeAttribute("open");
      lockBody(false);
      syncNavExpanded();
      if (restoreFocus && summary) summary.focus();
    }

    function menuFocusables() {
      const links = nav ? Array.from(nav.querySelectorAll("a")) : [];
      return [summary].concat(links).filter(Boolean);
    }

    if (fold) {
      syncDesktopNav();
      fold.addEventListener("toggle", () => {
        if (!mobileNav.matches) {
          /* User-agent or script may flip open; force desktop open. */
          if (!fold.open) fold.setAttribute("open", "");
          lockBody(false);
        } else {
          lockBody(!!fold.open);
        }
        syncNavExpanded();
      });

      header.querySelectorAll(".links a").forEach((a) => {
        a.addEventListener("click", () => closeMenu(false));
      });

      document.addEventListener("click", (e) => {
        if (mobileNav.matches && fold.open && !fold.contains(e.target)) closeMenu(true);
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
        if (!mobileNav.matches) {
          fold.setAttribute("open", "");
          lockBody(false);
        } else {
          fold.removeAttribute("open");
          lockBody(false);
        }
        syncNavExpanded();
      });
    }
  }

  const footer = document.querySelector("[data-chrome='footer']");
  if (footer) {
    footer.innerHTML = `
      <div class="wrap foot">
        <div>Nimblytica</div>
        <nav class="foot-links" aria-label="Footer">
          <a href="${p("two-weeks.html")}">Jumpstart</a>
          <a href="${p("packages.html")}">Offers</a>
          <a href="${p("health-check-kit.html")}">Kit $149</a>
          <a href="${p("live-install.html")}">Live install</a>
          <a href="${p("trust.html")}">Trust</a>
          <a href="mailto:hello@nimblytica.com">hello@nimblytica.com</a>
        </nav>
      </div>`;
  }

  /* Sticky mobile CTA: hide when a form submit is on-screen so it never covers send. */
  const ctaBar = document.querySelector(".mobile-cta-bar");
  if (ctaBar) {
    document.body.classList.add("has-mobile-cta");

    function setCtaBarHidden(cover) {
      ctaBar.classList.toggle("is-hidden", cover);
      ctaBar.setAttribute("aria-hidden", cover ? "true" : "false");
      if ("inert" in ctaBar) {
        ctaBar.inert = cover;
      } else {
        ctaBar.querySelectorAll("a, button").forEach((el) => {
          if (cover) {
            if (!el.hasAttribute("data-prev-tabindex")) {
              el.setAttribute("data-prev-tabindex", el.getAttribute("tabindex") || "");
            }
            el.setAttribute("tabindex", "-1");
          } else {
            const prev = el.getAttribute("data-prev-tabindex");
            if (prev === null) return;
            if (prev === "") el.removeAttribute("tabindex");
            else el.setAttribute("tabindex", prev);
            el.removeAttribute("data-prev-tabindex");
          }
        });
      }
    }

    const submits = document.querySelectorAll(
      '#contact-sheet button[type="submit"], #sample-gate button[type="submit"]'
    );
    if (submits.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          const cover = entries.some((en) => en.isIntersecting);
          setCtaBarHidden(cover);
        },
        { root: null, threshold: 0.15, rootMargin: "0px 0px -12% 0px" }
      );
      submits.forEach((el) => io.observe(el));
    }
  }
})();
