/* Number ticks and reduced-motion helpers. */
(function (global) {
  const reduce = () => document.documentElement.classList.contains("reduce-motion");

  function fmt(n, digits) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "—";
    if (digits != null) return num.toFixed(digits);
    return num.toLocaleString("en-US");
  }

  function tick(el, to, opts) {
    if (!el) return;
    const digits = opts && opts.digits;
    const suffix = (opts && opts.suffix) || "";
    const prefix = (opts && opts.prefix) || "";
    const ms = (opts && opts.ms) || 640;
    const target = Number(to);
    if (!Number.isFinite(target) || reduce()) {
      el.textContent = prefix + fmt(target, digits) + suffix;
      return;
    }
    const from = parseFloat(String(el.textContent).replace(/[^0-9.-]/g, ""));
    const start = Number.isFinite(from) ? from : 0;
    const t0 = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      const v = start + (target - start) * e;
      el.textContent = prefix + fmt(digits != null ? v : Math.round(v), digits) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  global.NimblyticaTick = { reduce, fmt, tick };
})(window);
