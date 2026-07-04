import { CATEGORIES } from "./categories";
import { round2 } from "./calculations";

export const CSV_TEMPLATE_HEADERS = [
  "Date",
  "Description",
  "Amount",
  "Currency",
  "Category",
  "PaidBy",
  "SplitWith",
  "PerPersonAmounts",
  "Group",
  "Notes",
] as const;

const EXAMPLE_ROWS: string[][] = [
  [
    "2026-03-14",
    "Dinner at Luigi's",
    "84.50",
    "USD",
    "Dining out",
    "Alex",
    "Alex;Jamie;Sam",
    "",
    "Cabo Trip",
    "split the tip evenly",
  ],
  [
    "2026-03-15",
    "Groceries",
    "60",
    "USD",
    "Groceries",
    "Jamie",
    "Alex:20;Jamie:20;Sam:20",
    "",
    "Cabo Trip",
    "",
  ],
];

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** The blank template users download, fill in by hand, and re-upload. */
export function csvTemplate(): string {
  const lines = [
    CSV_TEMPLATE_HEADERS.join(","),
    ...EXAMPLE_ROWS.map((row) => row.map(csvEscape).join(",")),
  ];
  return lines.join("\n");
}

/** Dependency-free CSV parser — handles quoted fields with embedded commas/newlines. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\n") {
      pushRow();
    } else if (c === "\r") {
      // skip, \n handles the line break
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows.filter((r) => r.some((f) => f.trim().length > 0));
}

export interface ParsedRow {
  rowNumber: number; // 1-indexed, matches what a spreadsheet app would show (header = row 1)
  date: string;
  description: string;
  amount: number;
  currency?: string;
  category?: string;
  paidBy: string;
  splitWith: string[];
  perPersonAmounts?: Map<string, number>;
  group?: string;
  notes?: string;
}

export interface RowError {
  rowNumber: number;
  message: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: RowError[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parsePerPersonAmounts(raw: string): Map<string, number> | { error: string } {
  const map = new Map<string, number>();
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.lastIndexOf(":");
    if (idx === -1) return { error: `Couldn't read "${trimmed}" — expected Name:Amount` };
    const name = trimmed.slice(0, idx).trim();
    const amountStr = trimmed.slice(idx + 1).trim();
    const amount = Number(amountStr);
    if (!name || !Number.isFinite(amount)) {
      return { error: `Couldn't read "${trimmed}" — expected Name:Amount` };
    }
    map.set(name, amount);
  }
  return map;
}

/** Fuzzy-matches a typed category name to one of the app's known categories, falling back to "general". */
export function resolveCategoryId(raw: string | undefined): string {
  if (!raw || !raw.trim()) return "general";
  const needle = raw.trim().toLowerCase();
  const exact = CATEGORIES.find((c) => c.name.toLowerCase() === needle);
  if (exact) return exact.id;
  const partial = CATEGORIES.find(
    (c) => c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase()),
  );
  return partial ? partial.id : "general";
}

export function parseImportCSV(text: string): ParseResult {
  const grid = parseCSV(text);
  if (grid.length === 0) {
    return { rows: [], errors: [{ rowNumber: 1, message: "The file is empty" }] };
  }
  const header = grid[0].map((h) => h.trim());
  const required = ["Date", "Description", "Amount", "PaidBy", "SplitWith"];
  const missing = required.filter((col) => !header.includes(col));
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message: `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
        },
      ],
    };
  }
  const idx = (col: string) => header.indexOf(col);

  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];

  for (let i = 1; i < grid.length; i++) {
    const rowNumber = i + 1; // header is row 1
    const cells = grid[i];
    const get = (col: string) => {
      const c = idx(col);
      return c === -1 ? "" : (cells[c] ?? "").trim();
    };

    const date = get("Date");
    const description = get("Description");
    const amountStr = get("Amount");
    const paidBy = get("PaidBy");
    const splitWithRaw = get("SplitWith");

    if (!DATE_RE.test(date)) {
      errors.push({ rowNumber, message: `Invalid date "${date}" — use YYYY-MM-DD` });
      continue;
    }
    if (!description) {
      errors.push({ rowNumber, message: "Missing description" });
      continue;
    }
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ rowNumber, message: `Invalid amount "${amountStr}"` });
      continue;
    }
    if (!paidBy) {
      errors.push({ rowNumber, message: "Missing PaidBy" });
      continue;
    }
    const splitWith = splitWithRaw
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    if (splitWith.length === 0) {
      errors.push({ rowNumber, message: "Missing SplitWith" });
      continue;
    }

    let perPersonAmounts: Map<string, number> | undefined;
    const perPersonRaw = get("PerPersonAmounts");
    if (perPersonRaw) {
      const parsed = parsePerPersonAmounts(perPersonRaw);
      if ("error" in parsed) {
        errors.push({ rowNumber, message: parsed.error });
        continue;
      }
      const sum = round2([...parsed.values()].reduce((a, b) => a + b, 0));
      if (Math.abs(sum - round2(amount)) > 0.01) {
        errors.push({
          rowNumber,
          message: `PerPersonAmounts (${sum}) doesn't add up to Amount (${round2(amount)})`,
        });
        continue;
      }
      perPersonAmounts = parsed;
    }

    rows.push({
      rowNumber,
      date,
      description,
      amount: round2(amount),
      currency: get("Currency") || undefined,
      category: get("Category") || undefined,
      paidBy,
      splitWith,
      perPersonAmounts,
      group: get("Group") || undefined,
      notes: get("Notes") || undefined,
    });
  }

  return { rows, errors };
}

/** Every unique name mentioned across PaidBy/SplitWith — what Stage 2 (name mapping) needs to resolve. */
export function collectNames(rows: ParsedRow[]): string[] {
  const names = new Set<string>();
  for (const r of rows) {
    names.add(r.paidBy);
    for (const n of r.splitWith) names.add(n);
  }
  return [...names];
}
