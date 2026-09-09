(function () {
  var stripeTable = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.stripe) || {};
  var gumroadTable = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.gumroad) || {};
  var formCfg = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.form) || {};
  var contactEmail = formCfg.contactEmail || "hello@nimblytica.com";

  var kitMailto = {
    kitChecklist: {
      subject: "Health Check Kit — $149 Checklist PDF",
      label: "Email hello@ for instant delivery"
    },
    kitExcel: {
      subject: "Health Check Kit — $299 Excel kit",
      label: "Email hello@ for instant delivery"
    }
  };

  function resolvePackageCta(sku) {
    var gum = Object.prototype.hasOwnProperty.call(gumroadTable, sku) ? gumroadTable[sku] : null;
    var gumLink = gum && typeof gum.productUrl === "string" ? gum.productUrl.trim() : "";
    if (gumLink) return { kind: "pay", sku: sku, href: gumLink };

    var entry = Object.prototype.hasOwnProperty.call(stripeTable, sku) ? stripeTable[sku] : null;
    var link = entry && typeof entry.paymentLink === "string" ? entry.paymentLink.trim() : "";
    if (link) return { kind: "pay", sku: sku, href: link };

    if (Object.prototype.hasOwnProperty.call(kitMailto, sku)) {
      var meta = kitMailto[sku];
      return {
        kind: "mailto",
        sku: sku,
        href:
          "mailto:" +
          contactEmail +
          "?subject=" +
          encodeURIComponent(meta.subject),
        label: meta.label
      };
    }

    return { kind: "book", sku: sku };
  }

  function applyPackageCta(node, cta) {
    node.classList.remove("is-soon");
    node.removeAttribute("aria-disabled");

    if (cta.kind === "pay" || cta.kind === "mailto") {
      node.setAttribute("href", cta.href);
      if (cta.kind === "mailto" && cta.label) {
        node.textContent = cta.label;
      }
      if (cta.kind === "mailto") {
        node.setAttribute("data-kit-softfail", "mailto");
      }
      return;
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = node.className;
    btn.setAttribute("data-pay-sku", cta.sku);
    btn.setAttribute("data-book-call", "");
    btn.textContent = "Book a 20-min board diagnostic";
    node.replaceWith(btn);

    var row = btn.closest(".cta-row");
    if (!row) return;
    Array.prototype.forEach.call(row.querySelectorAll("[data-book-call]"), function (sib) {
      if (sib !== btn) sib.hidden = true;
    });
  }

  document.querySelectorAll("[data-pay-sku]").forEach(function (node) {
    applyPackageCta(node, resolvePackageCta(node.getAttribute("data-pay-sku")));
  });
})();
