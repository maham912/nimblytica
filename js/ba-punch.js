/* Homepage before/after silent loop — CSS/SVG punch, no audio, invented orgs only. */
(function () {
  const root = document.querySelector("[data-ba-punch]");
  if (!root) return;

  const before = root.querySelector('[data-pane="before"]');
  const after = root.querySelector('[data-pane="after"]');
  const tabs = Array.from(root.querySelectorAll("[data-ba-set]"));
  const loopBtn = root.querySelector("[data-ba-toggle-loop]");
  const stage = root.querySelector(".ba-stage");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PHASE_MS = 3200;
  let phase = "before";
  let looping = !reduce;
  let timer = null;

  function setPhase(next, fromUser) {
    phase = next === "after" ? "after" : "before";
    if (before) before.hidden = phase !== "before";
    if (after) {
      after.hidden = phase !== "after";
      after.classList.remove("ba-draw");
      if (phase === "after" && !reduce) {
        void after.offsetWidth;
        after.classList.add("ba-draw");
      }
    }
    root.dataset.phase = phase;
    tabs.forEach((btn) => {
      const on = btn.getAttribute("data-ba-set") === phase;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (stage) {
      stage.setAttribute(
        "aria-label",
        phase === "before"
          ? "Before: mailed OT screenshot pack for Northwind Health Ops standup"
          : "After: Northwind Health Ops live board with headcount, open roles, and OT trend"
      );
    }
    if (fromUser && looping) restart();
  }

  function tick() {
    setPhase(phase === "before" ? "after" : "before", false);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function restart() {
    stop();
    if (!looping) return;
    timer = setInterval(tick, PHASE_MS);
  }

  function setLoop(on) {
    looping = !!on;
    if (loopBtn) {
      loopBtn.setAttribute("aria-pressed", looping ? "true" : "false");
      loopBtn.textContent = looping ? "Loop on" : "Loop off";
    }
    root.classList.toggle("is-looping", looping);
    if (looping) restart();
    else stop();
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => setPhase(btn.getAttribute("data-ba-set"), true));
  });
  if (loopBtn) {
    loopBtn.addEventListener("click", () => setLoop(!looping));
  }

  // Pause loop when off-screen to keep the page calm on phones.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (!looping) return;
        if (visible) restart();
        else stop();
      },
      { threshold: 0.25 }
    );
    io.observe(root);
  }

  setPhase(reduce ? "after" : "before", false);
  setLoop(looping);
})();
