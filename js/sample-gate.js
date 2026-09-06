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
  var submitting = false;

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

  function fieldEl(name) {
    return form.elements.namedItem(name);
  }

  function setStatus(kind, message) {
    if (!status) return;
    status.textContent = message || "";
    status.className = "form-status" + (kind ? " is-" + kind : "");
    if (message) {
      status.setAttribute("role", kind === "error" ? "alert" : "status");
      status.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");
    } else {
      status.removeAttribute("role");
      status.setAttribute("aria-live", "polite");
    }
  }

  function setBusy(busy, label) {
    submitting = busy;
    form.classList.toggle("is-busy", busy);
    form.setAttribute("aria-busy", busy ? "true" : "false");
    if (!submitBtn) return;
    submitBtn.disabled = !!busy;
    submitBtn.setAttribute("aria-disabled", busy ? "true" : "false");
    if (busy) {
      submitBtn.classList.add("is-loading");
      submitBtn.textContent = label || "Sending…";
    } else {
      submitBtn.classList.remove("is-loading");
      submitBtn.textContent = label || submitLabel;
    }
  }

  function clearFieldError(name) {
    var el = fieldEl(name);
    if (!el) return;
    var wrap = el.closest(".field");
    if (wrap) wrap.classList.remove("is-invalid");
    el.removeAttribute("aria-invalid");
    var errId = el.getAttribute("aria-describedby");
    if (!errId) return;
    var err = document.getElementById(errId);
    if (!err || !err.classList.contains("field-error")) return;
    err.textContent = "";
    err.hidden = true;
  }

  function setFieldError(name, message) {
    var el = fieldEl(name);
    if (!el) return null;
    var wrap = el.closest(".field");
    if (wrap) wrap.classList.add("is-invalid");
    el.setAttribute("aria-invalid", "true");
    var errId = el.id ? el.id + "-error" : "";
    var err = errId ? document.getElementById(errId) : null;
    if (!err && wrap) {
      err = document.createElement("p");
      err.className = "field-error";
      if (errId) err.id = errId;
      wrap.appendChild(err);
      if (errId) el.setAttribute("aria-describedby", errId);
    }
    if (err) {
      err.textContent = message || "";
      err.hidden = !message;
    }
    return el;
  }

  function clearAllFieldErrors() {
    ["name", "email"].forEach(clearFieldError);
  }

  function emailOk(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function validate() {
    clearAllFieldErrors();
    var name = val("name");
    var email = val("email");
    var first = null;

    if (!name) {
      first = first || setFieldError("name", "Add your name.");
    }
    if (!email) {
      first = first || setFieldError("email", "Add an email so we can send the sample.");
    } else if (!emailOk(email)) {
      first = first || setFieldError("email", "That email doesn't look right.");
    }

    return { ok: !first, name: name, email: email, first: first };
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

  ["name", "email"].forEach(function (name) {
    var el = fieldEl(name);
    if (!el) return;
    el.addEventListener("input", function () {
      clearFieldError(name);
      if (status && status.classList.contains("is-error")) setStatus("", "");
    });
    el.addEventListener("blur", function () {
      var v = val(name);
      if (!v) return;
      if (name === "email" && !emailOk(v)) {
        setFieldError("email", "That email doesn't look right.");
      }
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitting) return;

    if (val("botcheck")) {
      setStatus("success", "Thanks — we'll be in touch.");
      return;
    }

    var check = validate();
    if (!check.ok) {
      setStatus("error", "Check the highlighted fields and try again.");
      if (check.first && typeof check.first.focus === "function") {
        try {
          check.first.focus({ preventScroll: false });
        } catch (err) {
          check.first.focus();
        }
      }
      return;
    }

    var name = check.name;
    var email = check.email;
    var key = cfg.web3formsAccessKey;

    if (!key) {
      var to = cfg.contactEmail || "hello@nimblytica.com";
      setBusy(true, "Opening email…");
      setStatus("pending", "Opening your email app…");
      window.location.href =
        "mailto:" +
        to +
        "?subject=" +
        encodeURIComponent("Sample board — new lead") +
        "&body=" +
        encodeURIComponent("Name: " + name + "\nEmail: " + email + "\n");
      persistUnlock();
      track("sample_gate_success", {
        page: document.documentElement.getAttribute("data-page") || "",
        mode: "mailto"
      });
      window.setTimeout(function () {
        setBusy(false);
        setStatus(
          "success",
          "Unlocked below. If email didn't open, write " + to + "."
        );
      }, 600);
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

    setBusy(true, "Sending…");
    setStatus("pending", "Unlocking the sample gallery…");

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
          clearAllFieldErrors();
          setStatus("success", "Unlocked. Sample gallery and one-pager are below.");
          persistUnlock();
          track("sample_gate_success", {
            page: document.documentElement.getAttribute("data-page") || "",
            mode: "backend"
          });
          submitting = false;
          form.classList.remove("is-busy");
          form.setAttribute("aria-busy", "false");
          if (submitBtn) {
            submitBtn.classList.remove("is-loading");
            submitBtn.disabled = false;
            submitBtn.removeAttribute("aria-disabled");
            submitBtn.textContent = submitLabel;
          }
        } else {
          throw new Error((out && out.message) || "Submission failed");
        }
      })
      .catch(function () {
        var fallback = cfg.contactEmail || "hello@nimblytica.com";
        setBusy(false);
        setStatus(
          "error",
          "Couldn't send just now. Email " + fallback + " and we'll jump on it."
        );
      });
  });
})();
