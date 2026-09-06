/*
 * Contact sheet submission.
 *
 * When a Web3Forms access key is configured (config.js), the form is submitted
 * over fetch() to a real backend that emails the lead and keeps a record —
 * with inline submitting/success/error states, validation, and a honeypot.
 *
 * When no key is configured, it degrades to the original behaviour: opening the
 * visitor's email client via a prefilled mailto: link.
 */
(function () {
  var form = document.getElementById("contact-sheet");
  if (!form) return;

  var cfg = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.form) || {};
  var track = window.nimbTrack || function () {};
  var page = document.documentElement.getAttribute("data-page") || "";

  var status = document.getElementById("contact-status");
  var submitBtn = form.querySelector('button[type="submit"]');
  var submitLabel = submitBtn ? submitBtn.textContent : "Send";
  var startedTracked = false;
  var submitting = false;

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
    ["name", "email", "want", "data", "refresh", "who"].forEach(clearFieldError);
  }

  function emailOk(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function fields() {
    return {
      want: val("want"),
      data: val("data"),
      refresh: val("refresh"),
      who: val("who"),
      name: val("name"),
      email: val("email")
    };
  }

  function validate() {
    clearAllFieldErrors();
    var f = fields();
    var first = null;

    if (!f.name) {
      first = first || setFieldError("name", "Add your name or company.");
    }
    if (!f.email) {
      first = first || setFieldError("email", "Add a work email so we can reply.");
    } else if (!emailOk(f.email)) {
      first = first || setFieldError("email", "That email doesn't look right.");
    }
    if (!f.want) {
      first = first || setFieldError("want", "Tell us what you want to see on the board.");
    }

    return { ok: !first, fields: f, first: first };
  }

  function mailtoBody(f) {
    return [
      "What I want to see:",
      f.want,
      "",
      "Where the data lives today (Excel, UKG, SQL, tickets, a folder of files):",
      f.data,
      "",
      "How often it should refresh:",
      f.refresh,
      "",
      "Who looks at it:",
      f.who,
      "",
      "Name / company:",
      f.name,
      "",
      "Email:",
      f.email,
      ""
    ].join("\n");
  }

  form.addEventListener(
    "focusin",
    function () {
      if (startedTracked) return;
      startedTracked = true;
      track("form_start", { page: page });
    },
    { once: false }
  );

  ["name", "email", "want"].forEach(function (name) {
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
      track("form_invalid", { page: page });
      if (check.first && typeof check.first.focus === "function") {
        try {
          check.first.focus({ preventScroll: false });
        } catch (err) {
          check.first.focus();
        }
      }
      return;
    }

    var f = check.fields;
    var key = cfg.web3formsAccessKey;

    if (!key) {
      var to = cfg.contactEmail || "hello@nimblytica.com";
      track("form_submit", { page: page, mode: "mailto" });
      track("contact_submit", { page: page, mode: "mailto" });
      setBusy(true, "Opening email…");
      setStatus("pending", "Opening your email app…");
      window.location.href =
        "mailto:" +
        to +
        "?subject=" +
        encodeURIComponent(cfg.subject || "Live ops board") +
        "&body=" +
        encodeURIComponent(mailtoBody(f));
      window.setTimeout(function () {
        setBusy(false);
        setStatus(
          "success",
          "If your email app didn't open, write " + to + " — same subject and notes."
        );
      }, 600);
      return;
    }

    var payload = {
      access_key: key,
      subject: cfg.subject || "Live ops board — new inquiry",
      from_name: f.name,
      "What I want to see": f.want,
      "Where the data lives today": f.data,
      "How often it should refresh": f.refresh,
      "Who looks at it": f.who,
      "Name / company": f.name,
      email: f.email,
      botcheck: ""
    };

    setBusy(true, "Sending…");
    setStatus("pending", "Sending your board brief…");
    track("form_submit", { page: page, mode: "backend" });

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
          setBusy(true, "Sent");
          setStatus(
            "success",
            "Thanks — your board brief is in. We'll reply within one business day."
          );
          track("form_submit_success", { page: page });
          track("contact_submit", { page: page, mode: "backend" });
          submitting = false;
          form.classList.remove("is-busy");
          form.setAttribute("aria-busy", "false");
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.remove("is-loading");
            submitBtn.textContent = "Sent";
            submitBtn.setAttribute("aria-disabled", "true");
          }
          window.setTimeout(function () {
            if (submitBtn && submitBtn.textContent === "Sent") {
              submitBtn.disabled = false;
              submitBtn.removeAttribute("aria-disabled");
              submitBtn.textContent = submitLabel;
            }
          }, 4000);
        } else {
          throw new Error((out && out.message) || "Submission failed");
        }
      })
      .catch(function () {
        var to = cfg.contactEmail || "hello@nimblytica.com";
        setBusy(false);
        setStatus(
          "error",
          "Couldn't send just now. Email " + to + " and we'll jump on it."
        );
        track("form_submit_error", { page: page });
      });
  });
})();
