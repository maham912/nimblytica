/* Cost estimate from the figures typed on cost.html. No request, no storage. */
(function () {
  var form = document.getElementById("cost-calc");
  var out = document.getElementById("cost-result");
  if (!form || !out) return;

  var fields = ["cost-people", "cost-minutes", "cost-meetings", "cost-rebuild", "cost-rate"].map(function (id) {
    return document.getElementById(id);
  });
  if (fields.some(function (el) { return !el; })) return;

  var needNumbers = "Enter zero or a positive number in every field. Blank or negative entries are not used.";
  var tooBig = "Those figures are too large to turn into a total. Try smaller numbers.";
  var formula = "Hours per month are the people in the meeting, times the minutes per meeting spent reconciling or arguing, times the meetings per month, divided by 60, plus the hours per month spent rebuilding or reconciling reports by hand. Cost per month is those hours times the loaded hourly cost. Cost per year is that monthly cost times 12. Hours are shown to one decimal place, and dollars to the nearest dollar.";

  function parseField(el) {
    if (el.value === "") {
      el.removeAttribute("aria-invalid");
      return { state: "missing" };
    }
    var n = el.valueAsNumber;
    if (typeof n !== "number" || !Number.isFinite(n)) {
      el.setAttribute("aria-invalid", "true");
      return { state: "bad" };
    }
    if (n < 0) {
      el.setAttribute("aria-invalid", "true");
      return { state: "negative" };
    }
    el.removeAttribute("aria-invalid");
    return { state: "ok", value: n };
  }

  function formatHours(n) {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }

  function formatDollars(n) {
    return Math.round(n).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    });
  }

  function showMessage(text) {
    out.replaceChildren();
    var p = document.createElement("p");
    p.className = "cost-msg";
    p.textContent = text;
    out.appendChild(p);
  }

  function addFigure(grid, value, label) {
    var item = document.createElement("div");
    item.className = "kpi";
    var n = document.createElement("div");
    n.className = "n";
    n.textContent = value;
    var l = document.createElement("div");
    l.className = "l";
    l.textContent = label;
    item.appendChild(n);
    item.appendChild(l);
    grid.appendChild(item);
  }

  function render() {
    var parsed = fields.map(parseField);
    if (parsed.some(function (item) { return item.state !== "ok"; })) {
      showMessage(needNumbers);
      return;
    }
    var people = parsed[0].value;
    var minutes = parsed[1].value;
    var meetings = parsed[2].value;
    var rebuildHours = parsed[3].value;
    var hourly = parsed[4].value;
    var hours = (people * minutes * meetings) / 60 + rebuildHours;
    var month = hours * hourly;
    var year = month * 12;
    if (!Number.isFinite(hours) || !Number.isFinite(month) || !Number.isFinite(year)) {
      showMessage(tooBig);
      return;
    }
    out.replaceChildren();
    var grid = document.createElement("div");
    grid.className = "kpis";
    addFigure(grid, formatHours(hours), "Hours per month");
    addFigure(grid, formatDollars(month), "Cost per month");
    addFigure(grid, formatDollars(year), "Cost per year");
    var words = document.createElement("p");
    words.className = "caption";
    words.textContent = formula;
    out.appendChild(grid);
    out.appendChild(words);
  }

  form.addEventListener("input", render);
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    render();
  });
  render();
})();
