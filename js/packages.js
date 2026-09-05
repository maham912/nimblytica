(function () {
  var table = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.stripe) || {};

  document.querySelectorAll("[data-pay-sku]").forEach(function (btn) {
    var sku = btn.getAttribute("data-pay-sku");
    var entry = Object.prototype.hasOwnProperty.call(table, sku) ? table[sku] : null;
    var link = entry && typeof entry.paymentLink === "string" ? entry.paymentLink.trim() : "";

    if (link) {
      btn.setAttribute("href", link);
      btn.classList.remove("is-soon");
      btn.removeAttribute("aria-disabled");
      return;
    }

    btn.removeAttribute("href");
    btn.classList.add("is-soon");
    btn.setAttribute("aria-disabled", "true");
    btn.textContent = "Coming soon";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
    });
  });
})();
