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

  function fields() {
    return {
      want: val("want"),
      data: val("data"),
      refresh: val("refresh"),
      who: val("who"),
      name: val("name")
    };
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
      ""
    ].join("\n");
  }

  // Mark the funnel step the first time someone engages with the form.
  form.addEventListener(
    "focusin",
    function () {
      if (startedTracked) return;
      startedTracked = true;
      track("form_start", { page: page });
    },
    { once: false }
  );

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Honeypot: real users never fill this hidden field.
    if (val("botcheck")) {
      setStatus("success", "Thanks — we'll be in touch.");
      return;
    }

    var f = fields();
    if (!f.want || !f.name) {
      setStatus("error", "Please tell us what you want to see and your name / company.");
      track("form_invalid", { page: page });
      return;
    }

    var key = cfg.web3formsAccessKey;

    // No backend configured → preserve the original mailto behaviour.
    if (!key) {
      var to = cfg.contactEmail || "hello@nimblytica.com";
      track("form_submit", { page: page, mode: "mailto" });
      window.location.href =
        "mailto:" +
        to +
        "?subject=" +
        encodeURIComponent(cfg.subject || "Live ops board") +
        "&body=" +
        encodeURIComponent(mailtoBody(f));
      setStatus("success", "Opening your email app… if nothing happens, email " + to + ".");
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
      botcheck: ""
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }
    setStatus("pending", "Sending…");
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
          setStatus("success", "Thanks — your board brief is in. We'll reply within one business day.");
          track("form_submit_success", { page: page });
        } else {
          throw new Error((out && out.message) || "Submission failed");
        }
      })
      .catch(function () {
        var to = cfg.contactEmail || "hello@nimblytica.com";
        setStatus(
          "error",
          "Something went wrong sending that. Please email " + to + " and we'll jump on it."
        );
        track("form_submit_error", { page: page });
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitLabel;
        }
      });
  });
})();
