(function () {
  var ORDER = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"];
  var JUMPSTART_YES = ["q1", "q2", "q3", "q5", "q6"];
  var HEALTH_YES = ["q1", "q2", "q3", "q4", "q5", "q6"];

  var form = document.getElementById("self-score-form");
  var result = document.getElementById("score-result");
  if (!form || !result) return;

  var error = document.getElementById("self-score-error");
  var title = document.getElementById("score-result-title");
  var priceEl = document.getElementById("score-price");
  var countEl = document.getElementById("score-count");
  var email = document.getElementById("score-email");

  function readAnswers() {
    var answers = {};
    var complete = true;
    ORDER.forEach(function (id) {
      var checked = form.querySelector('input[name="' + id + '"]:checked');
      var value = checked ? checked.value : "";
      answers[id] = value;
      if (value !== "yes" && value !== "no") complete = false;
    });
    return { answers: answers, complete: complete };
  }

  function recommend(answers) {
    if (answers.q7 === "yes" && answers.q8 === "yes") {
      return { name: "Fractional BI", price: "$3.5k–$6k/mo", kit: false };
    }
    var cluster = JUMPSTART_YES.filter(function (id) { return answers[id] === "yes"; }).length;
    if (cluster >= 3 && answers.q7 === "no") {
      return { name: "BI Jumpstart", price: "$10k–$18k", kit: false };
    }
    var anyEarly = HEALTH_YES.some(function (id) { return answers[id] === "yes"; });
    if (anyEarly) {
      return { name: "Reporting Health Check", price: "$2.5k–$4k", kit: false };
    }
    return { name: "You may not need us yet", price: "$149 kit", kit: true };
  }

  function yesCount(answers) {
    return ORDER.filter(function (id) { return answers[id] === "yes"; }).length;
  }

  function answerWord(value) {
    return value === "yes" ? "Yes" : "No";
  }

  function answerLines(answers) {
    return ORDER.map(function (id) {
      var fs = form.querySelector('fieldset[data-q="' + id + '"]');
      var legend = fs ? fs.querySelector("legend") : null;
      var question = legend ? legend.textContent.replace(/\s+/g, " ").trim() : id;
      return question + " " + answerWord(answers[id]);
    });
  }

  function summaryText(offer, count, lines) {
    return [
      "Based only on your answers.",
      "Recommendation: " + offer.name + " (" + offer.price + ")",
      "You answered yes to " + count + " of 8.",
      ""
    ].concat(lines).join("\n");
  }

  function mailto(offerName, body) {
    return "mailto:hello@nimblytica.com?subject=" +
      encodeURIComponent("Self-score: " + offerName) +
      "&body=" +
      encodeURIComponent(body);
  }

  function setPrice(offer) {
    priceEl.replaceChildren();
    if (offer.kit) {
      var link = document.createElement("a");
      link.href = "health-check-kit.html";
      link.textContent = offer.price;
      priceEl.appendChild(link);
    } else {
      priceEl.textContent = offer.price;
    }
  }

  function markMissing() {
    var missing = [];
    ORDER.forEach(function (id) {
      var fs = form.querySelector('fieldset[data-q="' + id + '"]');
      if (!fs) return;
      var checked = form.querySelector('input[name="' + id + '"]:checked');
      if (!checked) {
        fs.classList.add("is-invalid");
        fs.setAttribute("aria-invalid", "true");
        missing.push(fs);
      } else {
        fs.classList.remove("is-invalid");
        fs.removeAttribute("aria-invalid");
      }
    });
    return missing;
  }

  function clearInvalid() {
    form.querySelectorAll(".self-score-q").forEach(function (fs) {
      fs.classList.remove("is-invalid");
      fs.removeAttribute("aria-invalid");
    });
    if (error) error.hidden = true;
  }

  function showResult(moveFocus) {
    var state = readAnswers();
    if (!state.complete) return;
    var offer = recommend(state.answers);
    var count = yesCount(state.answers);
    var lines = answerLines(state.answers);
    var text = summaryText(offer, count, lines);

    title.textContent = offer.name;
    setPrice(offer);
    countEl.textContent = "You answered yes to " + count + " of 8.";
    if (email) email.href = mailto(offer.name, text);

    result.hidden = false;

    if (moveFocus && typeof window.nimbTrack === "function") {
      window.nimbTrack("self_score", {
        page: "diagnostic",
        offer: offer.name,
        yes: String(count)
      });
    }

    if (moveFocus) {
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      result.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      title.focus();
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var missing = markMissing();
    if (missing.length) {
      if (error) {
        error.hidden = false;
        error.textContent = "Answer every question to see a recommendation.";
      }
      var first = missing[0].querySelector("input");
      if (first) first.focus();
      return;
    }
    clearInvalid();
    showResult(true);
  });

  form.addEventListener("change", function (e) {
    var fs = e.target && e.target.closest ? e.target.closest("fieldset") : null;
    if (fs && fs.querySelector("input:checked")) {
      fs.classList.remove("is-invalid");
      fs.removeAttribute("aria-invalid");
    }
    if (readAnswers().complete) {
      if (error) error.hidden = true;
      if (!result.hidden) showResult(false);
    }
  });

})();
