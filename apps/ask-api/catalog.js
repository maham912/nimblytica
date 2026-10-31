export const TABLE = "monthly_site_operations";
export const MAX_ROWS = 1000;

const sites = [
  { id: "north-yard", name: "North Yard", headcount: 34, loads: 410, onTime: 0.91, overtime: 290, financeOvertime: 222, detention: 5200, fuel: 61200 },
  { id: "cedar-crossing", name: "Cedar Crossing", headcount: 31, loads: 365, onTime: 0.95, overtime: 184, financeOvertime: 179, detention: 3100, fuel: 54800 },
  { id: "mesa-point", name: "Mesa Point", headcount: 29, loads: 338, onTime: 0.92, overtime: 236, financeOvertime: 230, detention: 4200, fuel: 49700 },
  { id: "harbor-run", name: "Harbor Run", headcount: 28, loads: 392, onTime: 0.97, overtime: 152, financeOvertime: 148, detention: 2600, fuel: 58600 }
];

export function makeDataset() {
  const months = [];
  for (let offset = 0; offset < 24; offset += 1) {
    const date = new Date(Date.UTC(2024, 10 + offset, 1));
    months.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const rows = [];
  sites.forEach((site, siteIndex) => {
    months.forEach((month, monthIndex) => {
      const seasonal = 1 + Math.sin((monthIndex / 12) * Math.PI * 2 + siteIndex) * 0.045;
      const growth = 1 + monthIndex * 0.0025;
      const loads = Math.round(site.loads * seasonal * growth);
      const lateRate = Math.max(0.01, 1 - site.onTime + Math.cos(monthIndex + siteIndex) * 0.008);
      const financeFactor = 1 + Math.sin(monthIndex * 0.7 + siteIndex) * 0.035;
      rows.push({
        month,
        site: site.name,
        headcount: site.headcount,
        loads,
        late_deliveries: Math.round(loads * lateRate),
        on_time_pct: Math.round((1 - lateRate) * 1000) / 10,
        operating_overtime_hours: Math.round(site.overtime * seasonal * growth),
        finance_overtime_hours: Math.round(site.financeOvertime * financeFactor * growth),
        detention_fees: Math.round(site.detention * seasonal * growth),
        fuel_spend: Math.round(site.fuel * seasonal * growth)
      });
    });
  });
  return { asOf: months[months.length - 1], months, rows };
}

export const DATASET = makeDataset();

export class UnsafeQuery extends Error {}

const WRITE_OR_COMPOUND = /\b(INSERT|UPDATE|DELETE|REPLACE|UPSERT|DROP|ALTER|CREATE|ATTACH|DETACH|PRAGMA|VACUUM|REINDEX|ANALYZE|UNION|INTERSECT|EXCEPT|WITH)\b/i;
const ALLOWED_SOURCE = new RegExp(`\\b(?:FROM|JOIN)\\s+${TABLE}(?=\\s+(?:WHERE|GROUP|ORDER|LIMIT)\\b)`, "gi");

function unsafeReason(sql, bindCount) {
  if (/;|--|\/\*|\*\//.test(sql)) return "has a second statement or a comment";
  if (!/^SELECT\s/i.test(sql)) return "does not start with SELECT";
  if (WRITE_OR_COMPOUND.test(sql)) return "uses a write, schema, or compound keyword";
  if (!/\bFROM\b/i.test(sql) || /\b(?:FROM|JOIN)\b/i.test(sql.replace(ALLOWED_SOURCE, ""))) return `reads a table other than ${TABLE}`;
  const limit = sql.match(/\bLIMIT\s+(\d+)$/i);
  if (!limit || Number(limit[1]) < 1 || Number(limit[1]) > MAX_ROWS) return `does not end with LIMIT 1 to ${MAX_ROWS}`;
  if ((sql.match(/\?/g) || []).length !== bindCount) return "has a placeholder count that differs from bind";
  return "";
}

export function defineQueries(entries) {
  for (const [name, entry] of Object.entries(entries)) {
    const reason = unsafeReason(entry.sql, entry.bind(DATASET.asOf).length);
    if (reason) throw new UnsafeQuery(`Query "${name}" ${reason}.`);
    Object.freeze(entry);
  }
  return Object.freeze(entries);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function total(records, column) {
  return records.reduce((sum, record) => sum + record[column], 0);
}

export const QUERIES = defineQueries({
  overtime: {
    title: "Operations and finance overtime",
    match: /\b(overtime|ot hours|labor hours)\b/i,
    about: "operating and finance overtime hours by site for one month",
    sql: "SELECT site, operating_overtime_hours, finance_overtime_hours FROM monthly_site_operations WHERE month = ? ORDER BY operating_overtime_hours DESC LIMIT 1000",
    bind: (month) => [month],
    rows: (records) => records.map((record) => ({
      label: record.site,
      value: record.operating_overtime_hours,
      detail: `${record.finance_overtime_hours.toLocaleString("en-US")} finance hours`
    })),
    summarize: (records, month) => {
      const gaps = records.map((record) => ({ site: record.site, gap: Math.abs(record.operating_overtime_hours - record.finance_overtime_hours) }));
      const widest = gaps.reduce((best, item) => (item.gap > best.gap ? item : best));
      return `For ${month}, operating and finance overtime differ by ${total(gaps, "gap").toLocaleString("en-US")} hours across ${records.length} sites. ${widest.site} has the largest visible gap.`;
    }
  },
  deliveries: {
    title: "Late deliveries by site",
    match: /\b(late deliveries|delivery|on.time|on time)\b/i,
    about: "loads, late deliveries, and on-time percent by site for one month",
    sql: "SELECT site, loads, late_deliveries, on_time_pct FROM monthly_site_operations WHERE month = ? ORDER BY late_deliveries DESC LIMIT 1000",
    bind: (month) => [month],
    rows: (records) => records.map((record) => ({ label: record.site, value: record.late_deliveries, detail: `${record.on_time_pct}% on time` })),
    summarize: (records, month) => `For ${month}, ${records[0].site} recorded the most late deliveries (${records[0].late_deliveries}) across ${records.length} sites.`
  },
  fuel: {
    title: "Fuel spend trend",
    match: /\b(fuel|diesel)\b/i,
    about: "total fuel spend across all sites for each of the six months ending at one month",
    sql: "SELECT month, SUM(fuel_spend) AS fuel_spend FROM monthly_site_operations WHERE month BETWEEN ? AND ? GROUP BY month ORDER BY month LIMIT 1000",
    bind: (month) => [DATASET.months[Math.max(0, DATASET.months.indexOf(month) - 5)], month],
    rows: (records) => records.map((record) => ({ label: record.month, value: record.fuel_spend, detail: "all sites" })),
    summarize: (records, month) => `Fuel spend across all sites from ${records[0].month} through ${month} totals ${formatCurrency(total(records, "fuel_spend"))}.`
  },
  headcount: {
    title: "Staff by site",
    match: /\b(headcount|staff|employees|people)\b/i,
    about: "planned headcount by site for one month",
    sql: "SELECT site, headcount FROM monthly_site_operations WHERE month = ? ORDER BY headcount DESC LIMIT 1000",
    bind: (month) => [month],
    rows: (records) => records.map((record) => ({ label: record.site, value: record.headcount, detail: "fictional staff" })),
    summarize: (records, month) => `${total(records, "headcount")} fictional staff are assigned across ${records.length} sites, based on the ${month} snapshot.`
  },
  detention: {
    title: "Detention fees by site",
    match: /\b(detention|fees)\b/i,
    about: "detention fees by site for one month",
    sql: "SELECT site, detention_fees FROM monthly_site_operations WHERE month = ? ORDER BY detention_fees DESC LIMIT 1000",
    bind: (month) => [month],
    rows: (records) => records.map((record) => ({ label: record.site, value: record.detention_fees, detail: "detention fees" })),
    summarize: (records, month) => `Recorded detention fees total ${formatCurrency(total(records, "detention_fees"))} across ${records.length} sites for ${month}.`
  }
});
