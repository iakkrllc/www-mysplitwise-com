import { getCategory } from "./categories";
import { convert, formatMoney } from "./currency";
import { round2 } from "./calculations";
import type { Expense } from "./types";

export interface ExportHelpers {
  currentUserId: string;
  nameOf: (id: string) => string;
  groupName: (id: string | null) => string;
  baseCurrency: string;
}

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCSV(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(csvEscape).join(","));
  return lines.join("\n");
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function payerNames(e: Expense, h: ExportHelpers): string {
  const payers = e.shares.filter((s) => s.paid > 0.001);
  if (payers.length === 0) return "—";
  if (payers.length === 1) return h.nameOf(payers[0].userId);
  return `${payers.length} people`;
}

function expenseTableRows(expenses: Expense[], h: ExportHelpers) {
  const sorted = [...expenses].sort(
    (a, b) => +new Date(b.date) - +new Date(a.date),
  );
  return sorted.map((e) => {
    const my = e.shares.find((s) => s.userId === h.currentUserId);
    const net = my ? round2(convert(my.paid - my.owed, e.currency, h.baseCurrency)) : 0;
    return {
      date: e.date,
      description: e.isSettlement ? "Payment" : e.description,
      category: getCategory(e.category).name,
      group: h.groupName(e.groupId),
      paidBy: payerNames(e, h),
      amount: round2(e.amount),
      currency: e.currency,
      yourShare: my ? round2(my.owed) : 0,
      yourNetBase: net,
      type: e.isSettlement ? "Payment" : "Expense",
    };
  });
}

export function exportExpensesCSV(expenses: Expense[], h: ExportHelpers) {
  const rows = expenseTableRows(expenses, h).map((r) => [
    r.date,
    r.description,
    r.category,
    r.group,
    r.paidBy,
    r.amount,
    r.currency,
    r.yourShare,
    r.yourNetBase,
    r.type,
  ]);
  const csv = rowsToCSV(
    [
      "Date",
      "Description",
      "Category",
      "Group",
      "Paid by",
      "Amount",
      "Currency",
      "Your share",
      `Your net (${h.baseCurrency})`,
      "Type",
    ],
    rows,
  );
  downloadFile("mysplitwise-expenses.csv", csv, "text/csv;charset=utf-8;");
}

export async function exportExpensesPDF(expenses: Expense[], h: ExportHelpers) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(18);
  doc.setTextColor(40, 48, 52);
  doc.text("mysplitwise — Expense report", 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120, 130, 135);
  doc.text(
    `Generated ${new Date().toLocaleString()} · ${expenses.length} expenses · base ${h.baseCurrency}`,
    14,
    22,
  );

  const data = expenseTableRows(expenses, h);
  autoTable(doc, {
    startY: 28,
    head: [
      ["Date", "Description", "Category", "Group", "Paid by", "Amount", `Your net (${h.baseCurrency})`],
    ],
    body: data.map((r) => [
      r.date,
      r.description,
      r.category,
      r.group,
      r.paidBy,
      formatMoney(r.amount, r.currency),
      formatMoney(r.yourNetBase, h.baseCurrency),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [91, 197, 167], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 250, 249] },
    columnStyles: { 5: { halign: "right" }, 6: { halign: "right" } },
  });

  doc.save("mysplitwise-expenses.pdf");
}

export interface BalanceRow {
  name: string;
  balance: number; // positive = owes you
}

export function exportBalancesCSV(rows: BalanceRow[], baseCurrency: string) {
  const body = rows.map((r) => [
    r.name,
    r.balance > 0 ? "owes you" : r.balance < 0 ? "you owe" : "settled",
    round2(Math.abs(r.balance)),
    baseCurrency,
  ]);
  const csv = rowsToCSV(["Person", "Direction", "Amount", "Currency"], body);
  downloadFile("mysplitwise-balances.csv", csv, "text/csv;charset=utf-8;");
}

export async function exportBalancesPDF(
  rows: BalanceRow[],
  baseCurrency: string,
) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setTextColor(40, 48, 52);
  doc.text("mysplitwise — Balances", 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120, 130, 135);
  doc.text(`Generated ${new Date().toLocaleString()} · base ${baseCurrency}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["Person", "Direction", "Amount"]],
    body: rows.map((r) => [
      r.name,
      r.balance > 0 ? "owes you" : r.balance < 0 ? "you owe" : "settled up",
      formatMoney(Math.abs(r.balance), baseCurrency),
    ]),
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [91, 197, 167], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 250, 249] },
    columnStyles: { 2: { halign: "right" } },
  });

  doc.save("mysplitwise-balances.pdf");
}
