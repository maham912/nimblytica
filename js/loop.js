/* Silent 8–12s product loop. Canvas only. No video. */
(function () {
  const canvas = document.getElementById("product-loop");
  if (!canvas || NimblyticaTick.reduce()) return;

  const ctx = canvas.getContext("2d");
  const names = ["Rowan Hale", "Mina Okonkwo", "Ellis Cho", "Sable Ortega", "Kit Brennan", "Noor Alvi", "Jules Keene", "Imani Brooks"];
  const factors = [4.2, 3.8, 3.4, 3.2, 3.0, 2.8, 2.6, 2.4];
  const CYCLE = 10000;

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(r.width * dpr));
    canvas.height = Math.max(1, Math.floor(r.height * dpr));
    canvas.style.width = r.width + "px";
    canvas.style.height = r.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    const t = (now % CYCLE) / CYCLE;
    const highlight = Math.floor(t * names.length) % names.length;
    const pad = 24;
    const rowH = Math.min(36, (h - pad * 2) / names.length);
    ctx.fillStyle = "rgba(242,242,242,0.06)";
    ctx.fillRect(0, 0, w, h);
    names.forEach((name, i) => {
      const y = pad + i * rowH;
      const lift = i === highlight ? Math.sin(t * Math.PI * 2) * 2 : 0;
      ctx.globalAlpha = i === highlight ? 0.9 : 0.28;
      ctx.fillStyle = "#f2f2f2";
      ctx.font = "500 13px Geist, ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(name, pad, y + 18 + lift);
      ctx.fillText(factors[i].toFixed(1), w - pad - 36, y + 18 + lift);
      ctx.globalAlpha = 0.18;
      ctx.fillRect(pad, y + rowH - 8, Math.max(8, (w - pad * 2) * (factors[i] / 4.5)), 1);
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
})();
