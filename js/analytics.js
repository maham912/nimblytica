/*
 * Provider-agnostic analytics + conversion event tracking.
 *
 * - Loads Plausible and/or GA4 only when configured in config.js.
 * - Exposes window.nimbTrack(name, props) for custom events.
 * - Auto-instruments high-intent interactions so lead funnels are measurable
 *   without hand-wiring every element: CTA/button clicks, mailto clicks,
 *   demo cut/slice interactions, outbound demo links, and booking clicks.
 *
 * With no provider configured, events are still dispatched as a DOM
 * CustomEvent ("nimb:track") and optionally logged to the console, so the
 * instrumentation can be verified locally before a provider is switched on.
 */
(function () {
  var cfg = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.analytics) || {};
  var debug = !!cfg.debug;

  function loadScript(attrs) {
    var s = document.createElement("script");
    Object.keys(attrs).forEach(function (k) {
      if (k === "defer" || k === "async") {
        if (attrs[k]) s.setAttribute(k, "");
      } else {
        s.setAttribute(k, attrs[k]);
      }
    });
    document.head.appendChild(s);
    return s;
  }

  // Plausible (privacy-friendly, cookieless).
  if (cfg.plausibleDomain) {
    loadScript({
      defer: true,
      "data-domain": cfg.plausibleDomain,
      src: cfg.plausibleSrc || "https://plausible.io/js/script.js"
    });
    window.plausible =
      window.plausible ||
      function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
      };
  }

  // GA4.
  if (cfg.ga4MeasurementId) {
    loadScript({
      async: true,
      src: "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.ga4MeasurementId)
    });
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", cfg.ga4MeasurementId);
  }

  function track(name, props) {
    if (!name) return;
    props = props || {};
    if (debug) {
      // eslint-disable-next-line no-console
      console.log("[track]", name, props);
    }
    try {
      if (typeof window.plausible === "function") {
        window.plausible(name, Object.keys(props).length ? { props: props } : undefined);
      }
    } catch (e) {}
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", name, props);
      }
    } catch (e) {}
    try {
      document.dispatchEvent(new CustomEvent("nimb:track", { detail: { name: name, props: props } }));
    } catch (e) {}
  }

  window.nimbTrack = track;

  function textOf(el) {
    return (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
  }

  function pageId() {
    return document.documentElement.getAttribute("data-page") || "";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var page = pageId();

    // Single delegated listener keeps instrumentation cheap and resilient to
    // dynamically injected chrome (header/footer are rendered by site.js).
    document.addEventListener(
      "click",
      function (e) {
        var el = e.target && e.target.closest ? e.target.closest("a, button") : null;
        if (!el) return;

        // Explicit opt-in events win over heuristics.
        var explicit = el.getAttribute("data-track");
        if (explicit) {
          track(explicit, { page: page, label: textOf(el) });
          return;
        }

        var href = el.getAttribute("href") || "";

        if (el.hasAttribute("data-book-call")) {
          // booking.js handles the action; record intent here.
          track("book_call_click", { page: page, label: textOf(el) });
          return;
        }

        if (href.indexOf("mailto:") === 0) {
          track("email_click", { page: page, label: textOf(el) });
          return;
        }

        // Demo interactions on the live board (cut + slice) signal intent.
        if (el.closest("#wb-mode")) {
          track("demo_cut_change", { page: page, label: textOf(el) });
          return;
        }
        if (el.closest("#wb-slicer")) {
          track("demo_slice", { page: page, label: textOf(el) });
          return;
        }

        // Links into the demos (from marketing pages) = top-of-funnel intent.
        if (href && /(^|\/)demo\//.test(href)) {
          track("demo_open", { page: page, to: href, label: textOf(el) });
          return;
        }

        // Remaining primary CTAs.
        if (el.classList && el.classList.contains("btn")) {
          track("cta_click", { page: page, label: textOf(el), href: href });
        }
      },
      true
    );

    track("page_view", { page: page });
  });
})();
