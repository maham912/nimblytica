/* Homepage before/after silent loop — poster first, CSS/SVG punch, no audio, invented orgs only. */
(function () {
  const root = document.querySelector("[data-ba-punch]");
  if (!root) return;

  const before = root.querySelector('[data-pane="before"]');
  const after = root.querySelector('[data-pane="after"]');
  const poster = root.querySelector("[data-ba-poster]");
  const startBtn = root.querySelector("[data-ba-start-loop]");
  const tabs = Array.from(root.querySelectorAll("[data-ba-set]"));
  const loopBtn = root.querySelector("[data-ba-toggle-loop]");
  const stage = root.querySelector(".ba-stage");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PHASE_MS = 3200;
  let phase = "poster";
  let looping = false;
  let timer = null;
  let started = false;

  function setControlsEnabled(on) {
    tabs.forEach((btn) => {
      btn.disabled = !on;
    });
  }

  function hidePoster() {
    if (poster) poster.hidden = true;
    root.classList.remove("is-poster");
    root.classList.add("is-playing");
  }

  function showPoster() {
    if (poster) poster.hidden = false;
    if (before) before.hidden = true;
    if (after) {
      after.hidden = true;
      after.classList.remove("ba-draw");
    }
    root.classList.add("is-poster");
    root.classList.remove("is-playing", "is-looping");
    root.dataset.phase = "poster";
    phase = "poster";
    setControlsEnabled(false);
    tabs.forEach((btn) => btn.setAttribute("aria-pressed", "false"));
    if (loopBtn) {
      loopBtn.setAttribute("aria-pressed", "false");
      loopBtn.textContent = "Loop off";
    }
    if (stage) {
      stage.setAttribute(
        "aria-label",
        "Static poster: mailed OT screenshot pack becomes a Northwind Health Ops live board"
      );
    }
  }

  function setPhase(next, fromUser) {
    phase = next === "after" ? "after" : "before";
    hidePoster();
    setControlsEnabled(true);
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
    if (!looping || !started) return;
    timer = setInterval(tick, PHASE_MS);
  }

  function setLoop(on) {
    looping = !!on;
    if (loopBtn) {
      loopBtn.setAttribute("aria-pressed", looping ? "true" : "false");
      loopBtn.textContent = looping ? "Loop on" : "Loop off";
    }
    root.classList.toggle("is-looping", looping);
    if (looping) {
      if (!started) startPlayback(true);
      else restart();
    } else {
      stop();
    }
  }

  function startPlayback(withLoop) {
    if (started && !withLoop) return;
    started = true;
    hidePoster();
    setControlsEnabled(true);
    setPhase(reduce ? "after" : "before", false);
    setLoop(withLoop !== false && !reduce);
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      setPhase(btn.getAttribute("data-ba-set"), true);
    });
  });
  if (loopBtn) {
    loopBtn.addEventListener("click", () => {
      if (!started) {
        startPlayback(true);
        return;
      }
      setLoop(!looping);
    });
  }
  if (startBtn) {
    startBtn.addEventListener("click", () => startPlayback(true));
  }

  // Pause loop when off-screen to keep the page calm on phones.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (!started || !looping) return;
        if (visible) restart();
        else stop();
      },
      { threshold: 0.25 }
    );
    io.observe(root);
  }

  // Poster-first: static frame until the visitor taps play / Loop.
  // Reduced motion keeps the static after board (no auto loop).
  showPoster();
  if (reduce) {
    started = true;
    hidePoster();
    setControlsEnabled(true);
    setPhase("after", false);
    setLoop(false);
  }
})();
