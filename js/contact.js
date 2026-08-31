/* Contact sheet → mailto:hello@nimblytica.com only. */
(function () {
  const form = document.getElementById("contact-sheet");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const want = (form.elements.namedItem("want").value || "").trim();
    const data = (form.elements.namedItem("data").value || "").trim();
    const refresh = (form.elements.namedItem("refresh").value || "").trim();
    const who = (form.elements.namedItem("who").value || "").trim();
    const name = (form.elements.namedItem("name").value || "").trim();
    if (!want || !name) return;
    const body = [
      "What I want to see:",
      want,
      "",
      "Where the data lives today (Excel, UKG, SQL, tickets, a folder of files):",
      data,
      "",
      "How often it should refresh:",
      refresh,
      "",
      "Who looks at it:",
      who,
      "",
      "Name / company:",
      name,
      ""
    ].join("\n");
    window.location.href =
      "mailto:hello@nimblytica.com?subject=" +
      encodeURIComponent("Live ops board") +
      "&body=" +
      encodeURIComponent(body);
  });
})();
