(function () {
  var cfg = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.booking) || {};
  var formCfg = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.form) || {};
  var url = cfg.calendlyUrl;

  function emailFallback() {
    var to = formCfg.contactEmail || "hello@nimblytica.com";
    window.location.href =
      "mailto:" + to + "?subject=" + encodeURIComponent("Book a 20-min board diagnostic — live ops board");
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

  function openBooking() {
    if (!url) {
      emailFallback();
      return;
    }
    ensureWidget(function () {
      if (window.Calendly && window.Calendly.initPopupWidget) {
        window.Calendly.initPopupWidget({ url: url });
      } else {
        emailFallback();
      }
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest("[data-book-call]") : null;
    if (!btn) return;
    e.preventDefault();
    openBooking();
  });
})();
