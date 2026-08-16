export const NUMBEO_OUTSIDE_RENT_LABEL = "1 Bedroom Apartment Outside of City Centre";
export const NUMBEO_CENTRE_RENT_LABEL = "1 Bedroom Apartment in City Centre";

function parsePriceCell(text: string): number | null {
  const cleaned = text.replace(/[^\d.,]/g, "").replace(/,/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseRentRow(html: string, label: string): number | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rowMatch = html.match(
    new RegExp(`<tr[^>]*>[\\s\\S]*?${escaped}[\\s\\S]*?</tr>`, "i"),
  );
  if (!rowMatch) return null;

  const cells = [...rowMatch[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) =>
    match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  );
  const labelIndex = cells.findIndex((cell) => cell.includes(label));
  const priceCell = labelIndex >= 0 ? cells[labelIndex + 1] : cells[1];
  if (!priceCell) return null;
  return parsePriceCell(priceCell);
}

export function parseNumbeoMonthlyRent(html: string): number | null {
  for (const label of [NUMBEO_OUTSIDE_RENT_LABEL, NUMBEO_CENTRE_RENT_LABEL]) {
    const rent = parseRentRow(html, label);
    if (rent != null) return rent;
  }
  return null;
}
