/**
 * Lays out the workbook content from src/engine/report.ts as an .xlsx file.
 * Only imported on click (see report-downloads.tsx), so ExcelJS stays out of
 * the page bundle.
 */
import ExcelJS from "exceljs";
import type { CellValue, SheetColumn, SheetContent } from "@/engine/report";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Sheets read across a row, so the first column stays in view too. */
const FREEZE_FIRST_COLUMN = new Set(["Scores by week", "Changes", "Who AI recommends"]);

/** Free-text sheets read top to bottom and don't need filters. */
const NO_FILTER = new Set(["Summary", "Method"]);

const textLength = (v: CellValue) => (v === null ? 0 : String(v).length);

function widthOf(col: SheetColumn, values: CellValue[]): number {
  const longest = Math.max(0, ...values.map(textLength));
  if (col.kind === "long") return Math.min(Math.max(longest, 30), 70);
  if (col.kind === "score" || col.kind === "count")
    return Math.min(Math.max(col.header.length, 10), 16);
  return Math.min(Math.max(longest, col.header.length, 10), 40);
}

const NUMBER_FORMAT: Partial<Record<NonNullable<SheetColumn["kind"]>, string>> = {
  score: "0.0",
  count: "0",
};

export async function workbookBlob(sheets: SheetContent[], title: string): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "indexed.";
  wb.title = title;
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name, {
      views: [{ state: "frozen", ySplit: 1, xSplit: FREEZE_FIRST_COLUMN.has(sheet.name) ? 1 : 0 }],
    });
    ws.columns = sheet.columns.map((c, i) => ({
      header: c.header,
      key: `c${i}`,
      width: widthOf(
        c,
        sheet.rows.map((r) => r[i] ?? null),
      ),
    }));
    for (const r of sheet.rows) ws.addRow(r);

    sheet.columns.forEach((c, i) => {
      const col = ws.getColumn(i + 1);
      const fmt = c.kind ? NUMBER_FORMAT[c.kind] : undefined;
      if (fmt) col.numFmt = fmt;
      col.alignment = { vertical: "top", wrapText: c.kind === "long" };
    });

    const header = ws.getRow(1);
    header.font = { bold: true };
    header.alignment = { vertical: "bottom", wrapText: true };
    header.eachCell((cell) => {
      cell.border = { bottom: { style: "thin" } };
    });
    if (sheet.rows.length > 1 && !NO_FILTER.has(sheet.name))
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: XLSX_TYPE });
}
