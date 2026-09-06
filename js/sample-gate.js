(function () {
  var KEY = "nimblytica.sampleBoard";
  var LOCKED = "locked";
  var UNLOCKED = "unlocked";

  var form = document.getElementById("sample-gate");
  var panel = document.getElementById("sample-unlock");
  if (!form || !panel) return;

  var cfg = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.form) || {};
  var track = window.nimbTrack || function () {};
  var status = document.getElementById("sample-status");
  var submitBtn = form.querySelector('button[type="submit"]');
  var submitLabel = submitBtn ? submitBtn.textContent : "Get the sample board";

  function stored() {
    try {
      return sessionStorage.getItem(KEY) === "1" ? UNLOCKED : LOCKED;
    } catch (e) {
      return LOCKED;
    }
  }

  function val(name) {
    var el = form.elements.namedItem(name);
    return el ? (el.value || "").trim() : "";
  }

  function setStatus(kind, message) {
    if (!status) return;
    status.textContent = message || "";
    status.className = "form-status" + (kind ? " is-" + kind : "");
    if (message) status.setAttribute("role", kind === "error" ? "alert" : "status");
  }

  function revealPdfFallback() {
    var pdf = panel.querySelector("[data-sample-pdf]");
    var html = panel.querySelector("[data-sample-html]");
    if (!pdf) {
      if (html) html.hidden = false;
      return;
    }
    fetch(pdf.getAttribute("href"), { method: "HEAD" })
      .then(function (res) {
        pdf.hidden = !res.ok;
        if (html) html.hidden = res.ok;
      })
      .catch(function () {
        pdf.hidden = true;
        if (html) html.hidden = false;
      });
  }

  function render(next) {
    if (next === UNLOCKED) {
      form.hidden = true;
      panel.hidden = false;
      revealPdfFallback();
      return;
    }
    form.hidden = false;
    panel.hidden = true;
  }

  function persistUnlock() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch (e) {}
    render(UNLOCKED);
    if (panel && !panel.hidden) {
      requestAnimationFrame(function () {
        try {
          panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch (err) {}
        var first = panel.querySelector("a.sample-card, a.btn:not([hidden])");
        if (first && typeof first.focus === "function") {
          try {
            first.focus({ preventScroll: true });
          } catch (err2) {
            first.focus();
          }
        }
      });
    }
  }

  render(stored());

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (val("botcheck")) {
      setStatus("success", "Thanks — we'll be in touch.");
      return;
    }

    var name = val("name");
    var email = val("email");
    if (!name || !email) {
      setStatus("error", "Please enter your name and email.");
      return;
    }

    var key = cfg.web3formsAccessKey;
    if (!key) {
      var to = cfg.contactEmail || "hello@nimblytica.com";
      window.location.href =
        "mailto:" +
        to +
        "?subject=" +
        encodeURIComponent("Sample board — new lead") +
        "&body=" +
        encodeURIComponent("Name: " + name + "\nEmail: " + email + "\n");
      setStatus("success", "Opening your email app… if nothing happens, email " + to + ".");
      persistUnlock();
      track("sample_gate_success", {
        page: document.documentElement.getAttribute("data-page") || "",
        mode: "mailto"
      });
      return;
    }

    var payload = {
      access_key: key,
      subject: "Sample board — new lead",
      from_name: name,
      name: name,
      email: email,
      botcheck: ""
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }
    setStatus("pending", "Sending…");

    fetch(cfg.endpoint || "https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () {
          return { success: res.ok };
        });
      })
      .then(function (out) {
        if (out && out.success) {
          form.reset();
          setStatus("success", "Unlocked. Sample gallery and one-pager are below.");
          persistUnlock();
          track("sample_gate_success", {
            page: document.documentElement.getAttribute("data-page") || "",
            mode: "backend"
          });
        } else {
          throw new Error((out && out.message) || "Submission failed");
        }
      })
      .catch(function () {
        var fallback = cfg.contactEmail || "hello@nimblytica.com";
        setStatus(
          "error",
          "Something went wrong sending that. Please email " + fallback + " and we'll jump on it."
        );
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitLabel;
        }
      });
  });
})();
