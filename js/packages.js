(function () {
  var table = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.stripe) || {};

  function resolvePackageCta(sku) {
    var entry = Object.prototype.hasOwnProperty.call(table, sku) ? table[sku] : null;
    var link = entry && typeof entry.paymentLink === "string" ? entry.paymentLink.trim() : "";
    if (link) return { kind: "pay", sku: sku, href: link };
    return { kind: "book", sku: sku };
  }

  function applyPackageCta(node, cta) {
    node.classList.remove("is-soon");
    node.removeAttribute("aria-disabled");

    if (cta.kind === "pay") {
      node.setAttribute("href", cta.href);
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
