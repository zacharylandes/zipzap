export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      if (field.endsWith("\r")) field = field.slice(0, -1);
      row.push(field);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  return rows;
}

export function latestNumeric(cells: string[]): number | null {
  for (let i = cells.length - 1; i >= 0; i--) {
    const n = Number(cells[i]?.replace(/,/g, "").trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export type WideRecord = {
  zip: string;
  state: string;
  city: string;
  county: string;
  value: number;
};

function col(header: string[], names: string[]): number {
  const lower = header.map((h) => h.trim().toLowerCase());
  for (const name of names) {
    const idx = lower.indexOf(name.toLowerCase());
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseWideIndex(csv: string): Map<string, WideRecord> {
  const rows = parseCsv(csv);
  const header = rows[0];
  if (!header) return new Map();
  const zipIdx = col(header, ["regionname", "zip", "zipcode", "zcta"]);
  const stateIdx = col(header, ["state", "statename"]);
  const cityIdx = col(header, ["city"]);
  const countyIdx = col(header, ["countyname", "county"]);
  const dateIdxs = header
    .map((name, idx) => (/^\d{4}-\d{2}/.test(name.trim()) ? idx : -1))
    .filter((idx) => idx >= 0);
  const out = new Map<string, WideRecord>();
  for (const row of rows.slice(1)) {
    const zip = (row[zipIdx] ?? "").trim().padStart(5, "0").slice(-5);
    if (!/^\d{5}$/.test(zip)) continue;
    const value =
      dateIdxs.length > 0
        ? latestNumeric(dateIdxs.map((idx) => row[idx] ?? ""))
        : latestNumeric(row);
    if (value == null) continue;
    out.set(zip, {
      zip,
      state: (row[stateIdx] ?? "").trim(),
      city: (row[cityIdx] ?? "").trim(),
      county: (row[countyIdx] ?? "").trim(),
      value,
    });
  }
  return out;
}
