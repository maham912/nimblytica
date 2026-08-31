/**
 * Deterministic briefing over a metrics snapshot.
 * Same contract as the Insights try-it on demo/llm.html.
 * No API key. Same inputs always yield the same five bullets.
 */
(function (global) {
  function filterDepts(data, dept) {
    if (!dept || dept === "all") return data.departments;
    return data.departments.filter((d) => d.name === dept);
  }

  function sum(rows, key) {
    return rows.reduce((n, r) => n + (Number(r[key]) || 0), 0);
  }

  function trendDelta(series, dept) {
    if (!series || series.length < 2) return { start: 0, end: 0, delta: 0 };
    const key = !dept || dept === "all" ? "all" : dept;
    const start = series[0][key];
    const end = series[series.length - 1][key];
    return { start, end, delta: end - start };
  }

  function topOvertime(rows) {
    return rows.slice().sort((a, b) => b.overtime_hours_12mo - a.overtime_hours_12mo)[0];
  }

  function newInScope(data, dept) {
    const hires = data.new_hires || [];
    if (!dept || dept === "all") return hires;
    return hires.filter((h) => h.dept === dept);
  }

  /**
   * @param {object} data workforce.fake.json
   * @param {string} dept department name or "all"
   * @returns {string[]} exactly five bullets
   */
  function briefWorkforce(data, dept) {
    const rows = filterDepts(data, dept);
    const label = !dept || dept === "all" ? data.org : dept;
    const hc = sum(rows, "headcount");
    const open = sum(rows, "open_roles");
    const ot = sum(rows, "overtime_hours_12mo");
    const attr =
      rows.length === 1
        ? rows[0].attrition_pct
        : data.kpis.attrition_12mo_pct;
    const span =
      rows.length === 1 ? rows[0].span : data.kpis.span_of_control;
    const td = trendDelta(data.trend_headcount, dept);
    const dir = td.delta > 0 ? "up" : td.delta < 0 ? "down" : "flat";
    const top = topOvertime(rows);
    const hires = newInScope(data, dept);
    const owner = rows.length === 1 ? rows[0].owner : data.snapshot_owner;

    const b1 = `${label} snapshot as of ${data.as_of}: headcount ${hc}, ${open} open roles, span of control ${span}. Owner on the file: ${owner}.`;
    const b2 = `Attrition on this cut is ${attr} percent over 12 months. Open roles are ${open} against ${hc} people — a vacancy rate of ${Math.round((open / hc) * 100)} percent if every req is real.`;
    const b3 = `Headcount trend is ${dir}: ${td.start} in ${data.trend_headcount[0].month} to ${td.end} in ${data.trend_headcount[data.trend_headcount.length - 1].month} (${td.delta >= 0 ? "+" : ""}${td.delta}).`;
    const b4 = `Overtime hours on this cut total ${ot.toLocaleString("en-US")} over 12 months. Heaviest unit: ${top.name} at ${top.overtime_hours_12mo.toLocaleString("en-US")} hours.`;
    const next =
      hires.length > 0
        ? `Next check: ${hires.length} new name${hires.length === 1 ? "" : "s"} on the 90-day list (first: ${hires[0].name}, ${hires[0].role}). Confirm 30/60/90 stay before opening more roles in ${top.name}.`
        : `Next check: no new names on this cut. Confirm whether ${top.name} overtime is unfilled shifts or a scheduling rule before opening roles.`;
    const b5 = next;

    return [b1, b2, b3, b4, b5];
  }

  function filterQueues(data, queue) {
    if (!queue || queue === "all") return data.queues;
    return data.queues.filter((q) => q.name === queue);
  }

  function agingPastEight(rows) {
    return rows.reduce((n, q) => {
      const a = q.aging || {};
      return n + (Number(a["8-14"]) || 0) + (Number(a["15+"]) || 0);
    }, 0);
  }

  function slaWeighted(rows) {
    const open = sum(rows, "open");
    if (!open) return 0;
    return Math.round(rows.reduce((n, q) => n + q.sla_pct * q.open, 0) / open);
  }

  /**
   * @param {object} data ops-pulse.fake.json
   * @param {string} queue queue name or "all"
   * @returns {string[]} exactly five bullets
   */
  function briefOps(data, queue) {
    const rows = filterQueues(data, queue);
    const label = !queue || queue === "all" ? data.org : queue;
    const open = sum(rows, "open");
    const breached = sum(rows, "breached");
    const sla = slaWeighted(rows);
    const aged = agingPastEight(rows);
    const heavy = rows.slice().sort((a, b) => b.open - a.open)[0];
    const oldest = rows.slice().sort((a, b) => {
      const ae = (a.aging["8-14"] || 0) + (a.aging["15+"] || 0);
      const be = (b.aging["8-14"] || 0) + (b.aging["15+"] || 0);
      return be - ae;
    })[0];

    const b1 = `${label} pulse as of ${data.as_of}: ${open} open, ${sla} percent SLA on time, ${breached} breached still open.`;
    const b2 = `Breached work is ${open ? Math.round((breached / open) * 100) : 0} percent of this cut. Treat the SLA number as a cut, not a ticket list.`;
    const b3 = `${aged} tickets on this cut are eight days or older. Heaviest aging sits in ${oldest.name} (${(oldest.aging["8-14"] || 0) + (oldest.aging["15+"] || 0)} past eight days).`;
    const b4 = `Largest open pile: ${heavy.name} at ${heavy.open} open, ${heavy.sla_pct} percent SLA, median age ${heavy.median_age_days} days.`;
    const b5 =
      aged > 0
        ? `Next check: pull the ${aged} aged items in ${oldest.name} and mark blocked vs unowned before the next standup.`
        : `Next check: no eight-day aging on this cut. Confirm whether ${heavy.name} volume is a real load or a routing rule.`;

    return [b1, b2, b3, b4, b5];
  }

  global.NimblyticaBriefing = { briefWorkforce, briefOps };
})(window);
