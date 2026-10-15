(function () {
  var form = document.getElementById("checklist-request");
  if (!form) return;

  var cfg = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.form) || {};
  var statusEl = document.getElementById("checklist-status");
  var emailEl = form.elements.namedItem("email");
  var emailErr = document.getElementById("checklist-email-error");
  var submitBtn = form.querySelector('button[type="submit"]');
  var submitLabel = submitBtn ? submitBtn.textContent : "Send";
  var pendingText = form.getAttribute("data-pending") || "Sending your checklist request…";
  var successText = form.getAttribute("data-success") || "Thanks. We'll email the one-page checklist.";
  var busy = false;

  function val(name) {
    var el = form.elements.namedItem(name);
    return el ? String(el.value || "").trim() : "";
  }

  function setStatus(kind, message) {
    if (!statusEl) return;
    statusEl.className = "form-status" + (kind ? " is-" + kind : "");
    statusEl.textContent = typeof message === "string" ? message : "";
    if (message && typeof message !== "string") statusEl.appendChild(message);
    if (message) statusEl.setAttribute("role", kind === "error" ? "alert" : "status");
  }

  function setBusy(on) {
    busy = on;
    form.classList.toggle("is-busy", on);
    form.setAttribute("aria-busy", on ? "true" : "false");
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.setAttribute("aria-disabled", on ? "true" : "false");
    submitBtn.classList.toggle("is-loading", on);
    submitBtn.textContent = on ? "Sending…" : submitLabel;
  }

  function trackSubmit() {
    var api = window.NimblyticaAnalytics;
    var fn = (api && typeof api.track === "function" && api.track.bind(api)) ||
      (typeof api === "function" && api) || window.nimbTrack || window.track;
    if (typeof fn !== "function") return;
    try { fn("lead_magnet_submit"); } catch (e) {}
  }

  function markEmail(message) {
    if (emailEl) {
      if (message) emailEl.setAttribute("aria-invalid", "true");
      else emailEl.removeAttribute("aria-invalid");
      var wrap = emailEl.closest(".field");
      if (wrap) wrap.classList.toggle("is-invalid", !!message);
      if (message) emailEl.focus();
    }
    if (!emailErr) return;
    emailErr.hidden = !message;
    emailErr.textContent = message || "";
  }

  function failMessage() {
    var frag = document.createDocumentFragment();
    var link = document.createElement("a");
    link.setAttribute("href", "mailto:hello@nimblytica.com?subject=Free%20checklist%20request");
    link.textContent = "hello@nimblytica.com";
    frag.appendChild(document.createTextNode("Couldn't send just now. Email "));
    frag.appendChild(link);
    frag.appendChild(document.createTextNode(" and we'll send the checklist."));
    return frag;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    if (val("botcheck")) return setStatus("success", successText);

    var email = val("email");
    var company = val("company");
    var emailMsg = !email
      ? "Add an email so we can send the checklist."
      : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "That email doesn't look right.");
    markEmail(emailMsg);
    if (emailMsg) return setStatus("error", emailMsg);

    var subject = val("subject") || "Free checklist request";
    if (!cfg.web3formsAccessKey) {
      window.location.href = "mailto:hello@nimblytica.com?subject=" +
        encodeURIComponent(subject) + "&body=" +
        encodeURIComponent("Email: " + email + "\nCompany: " + company + "\n");
      setStatus("success", successText);
      return trackSubmit();
    }

    setBusy(true);
    setStatus("pending", pendingText);
    fetch(cfg.endpoint || "https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: cfg.web3formsAccessKey,
        subject: subject,
        from_name: company || email,
        email: email,
        company: company,
        lead_source: val("lead_source") || "free-checklist",
        botcheck: ""
      })
    }).then(function (res) {
      return res.json().catch(function () { return { success: res.ok }; });
    }).then(function (out) {
      if (!out || !out.success) throw new Error("Submission failed");
      form.reset();
      markEmail("");
      setBusy(false);
      setStatus("success", successText);
      trackSubmit();
    }).catch(function () {
      setBusy(false);
      setStatus("error", failMessage());
    });
  });
})();
