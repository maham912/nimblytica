/*
 * "Book a call" wiring.
 *
 * When a Calendly URL is configured (config.js), buttons marked
 * [data-book-call] open the Calendly popup (the widget assets load lazily,
 * only on pages that have such a button). When no URL is configured, those
 * buttons fall back to the email contact flow so they are never dead ends.
 */
(function () {
  var buttons = document.querySelectorAll("[data-book-call]");
  if (!buttons.length) return;

  var cfg = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.booking) || {};
  var formCfg = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.form) || {};
  var url = cfg.calendlyUrl;

  function emailFallback() {
    var to = formCfg.contactEmail || "hello@nimblytica.com";
    window.location.href =
      "mailto:" + to + "?subject=" + encodeURIComponent("Book a call — live ops board");
  }

  if (!url) {
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        emailFallback();
      });
    });
    return;
  }

  var loaded = false;
  function ensureWidget(cb) {
    if (loaded && window.Calendly) return cb();
    if (!document.querySelector('link[data-calendly]')) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://assets.calendly.com/assets/external/widget.css";
      link.setAttribute("data-calendly", "");
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[data-calendly]')) {
      var s = document.createElement("script");
      s.src = "https://assets.calendly.com/assets/external/widget.js";
      s.async = true;
      s.setAttribute("data-calendly", "");
      s.onload = function () {
        loaded = true;
        cb();
      };
      s.onerror = function () {
        emailFallback();
      };
      document.head.appendChild(s);
    } else {
      var check = setInterval(function () {
        if (window.Calendly) {
          clearInterval(check);
          loaded = true;
          cb();
        }
      }, 50);
    }
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      ensureWidget(function () {
        if (window.Calendly && window.Calendly.initPopupWidget) {
          window.Calendly.initPopupWidget({ url: url });
        } else {
          emailFallback();
        }
      });
    });
  });
})();
