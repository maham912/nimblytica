/* Contact sheet → mailto:hello@nimblytica.com only. */
(function () {
  const form = document.getElementById("contact-sheet");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = (form.elements.namedItem("name").value || "").trim();
    const company = (form.elements.namedItem("company").value || "").trim();
    const want = (form.elements.namedItem("want").value || "").trim();
    if (!name || !want) return;
    const body = "Name: " + name + "\nCompany: " + (company || "—") + "\n\n" + want;
    const subject = "Week Board — " + name;
    window.location.href =
      "mailto:hello@nimblytica.com?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body);
  });
})();
