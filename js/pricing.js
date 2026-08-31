/*
 * Optional pricing + risk-reversal lines on the Two weeks page.
 *
 * Rendered only when values are set in config.js, so no invented price or
 * guarantee is ever shown. The surrounding "No cost to look" copy is always
 * true regardless of configuration.
 */
(function () {
  var cfg = (window.NIMBLYTICA_CONFIG && window.NIMBLYTICA_CONFIG.pricing) || {};
  var price = document.getElementById("pricing-price");
  var risk = document.getElementById("pricing-risk");
  if (price && cfg.price) {
    price.textContent = cfg.price;
    price.hidden = false;
  }
  if (risk && cfg.riskReversal) {
    risk.textContent = cfg.riskReversal;
    risk.hidden = false;
  }
})();
