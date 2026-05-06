/**
 * Exports rows to a UTF-8 CSV file that Excel opens correctly.
 * Pure browser implementation — no external dependencies, no SSR issues.
 */
export function exportToExcel(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const escape = (val: unknown): string => {
    const str = val == null ? "" : String(val);
    // Wrap in double-quotes if the value contains comma, quote, or newline
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];

  // UTF-8 BOM so Excel auto-detects encoding
  const bom = "﻿";
  const blob = new Blob([bom + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
