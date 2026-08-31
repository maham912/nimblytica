/*
 * Social-proof renderer.
 *
 * Reads data/testimonials.json and populates the "Proof" section only when it
 * contains real, approved content. Ships empty by default, so the section stays
 * hidden until the owner adds genuine quotes/logos — no placeholder or
 * fabricated endorsements are ever shown to visitors.
 */
(function () {
  var section = document.getElementById("proof");
  if (!section) return;

  var quotesEl = document.getElementById("testimonials");
  var logosEl = document.getElementById("client-logos");
  var script = document.currentScript;
  var DATA_URL = new URL("../data/testimonials.json", script.src);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  fetch(DATA_URL)
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      var quotes = (d && d.quotes) || [];
      var logos = (d && d.logos) || [];
      if (!quotes.length && !logos.length) return; // nothing real to show → stay hidden

      if (quotes.length && quotesEl) {
        quotesEl.innerHTML = quotes
          .map(function (q) {
            var who = [q.name, q.role, q.org].filter(Boolean).map(esc).join(" · ");
            return (
              '<figure class="quote"><blockquote>' +
              esc(q.quote) +
              "</blockquote>" +
              (who ? '<figcaption>' + who + "</figcaption>" : "") +
              "</figure>"
            );
          })
          .join("");
      }

      if (logos.length && logosEl) {
        logosEl.hidden = false;
        logosEl.innerHTML = logos
          .map(function (l) {
            return '<img src="' + encodeURI(l.src || "") + '" alt="' + esc(l.alt || "") + '" loading="lazy">';
          })
          .join("");
      }

      section.hidden = false;
    })
    .catch(function () {
      /* leave the section hidden on any error */
    });
})();
