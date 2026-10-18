import { createId } from "./numbers.js";

const normal = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function parseArea(value) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/\s*(ha|hectares?)\s*$/i, "")
    .replace(/,/g, "");

  if (!cleaned) {
    return "";
  }

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : "";
}

// Allow 1, Herd 1 or Mob 1 to refer to the herd's position in the setup list.
function matchHerd(value, herds) {
  const key = normal(value);

  if (!key) {
    return null;
  }

  const numberMatch = key.match(/^(?:herd|mob)?(\d+)$/);

  if (numberMatch) {
    return herds[Number(numberMatch[1]) - 1] ?? null;
  }

  return herds.find((herd) => normal(herd.name) === key) ?? null;
}

function isHeader(cells) {
  const name = normal(cells[0]);
  const area = normal(cells[1]);

  return ["name", "paddock", "paddockname"].includes(name) && ["hectares", "ha", "area", "areaha"].includes(area);
}

// Expected format: one tab-separated paddock per row — name, hectares, optional herd.
export function parsePaddockText(text, herds = []) {
  const lines = text
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    // Keep leading tabs because they represent empty spreadsheet cells.
    .filter((line) => line.trim());

  if (text.length > 200000 || lines.length > 1000) {
    return {
      rows: [],
      error: "Import up to 1,000 paddocks at a time.",
    };
  }

  const rows = [];

  for (const raw of lines) {
    if (/^(grand\s+total|total|subtotal|summary)\b/i.test(raw.trim())) {
      continue;
    }

    const cells = raw.split("\t").map((cell) => cell.trim());

    if (isHeader(cells)) {
      continue;
    }

    const [name = "", areaText = "", herdText = ""] = cells;

    const herd = matchHerd(herdText, herds);

    rows.push({
      id: createId("import"),
      name,
      hectares: parseArea(areaText),
      herdId: herd?.id ?? "",
    });
  }

  return {
    rows,
    error: rows.length ? "" : "No paddocks recognised. Check the text or add paddocks manually.",
  };
}
