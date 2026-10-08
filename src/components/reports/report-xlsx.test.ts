import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { fullWeek, results } from "../../../tests/fixtures/build";
import { workbookContent } from "@/engine/report";
import { score } from "@/engine/score";
import { workbookBlob } from "./report-xlsx";

describe("Excel workbook", () => {
  it("writes every sheet with a bold, frozen header row and readable widths", async () => {
    const res = results([
      ...fullWeek(1, ["chatgpt"], "Corvane is a strong pick."),
      ...fullWeek(2, ["chatgpt"], "Trakvia is a strong pick. You may also come across Corvane."),
    ]);
    const content = workbookContent(res, score(res), 2);
    const blob = await workbookBlob(content, "test");

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    expect(wb.worksheets.map((w) => w.name)).toEqual(content.map((s) => s.name));

    const scores = wb.getWorksheet("Scores by week")!;
    expect(scores.views[0]).toMatchObject({ state: "frozen", ySplit: 1, xSplit: 1 });
    expect(scores.getRow(1).getCell(1).font?.bold).toBe(true);
    expect(scores.getRow(1).values).toEqual([undefined, "Company", "Week 1", "Week 2"]);
    expect(scores.getRow(2).getCell(2).value).toBe(100);
    expect(scores.getColumn(2).numFmt).toBe("0.0");

    const summary = wb.getWorksheet("Summary")!;
    expect(summary.getColumn(2).width).toBeGreaterThanOrEqual(30);
    expect(summary.getColumn(2).alignment?.wrapText).toBe(true);
  });
});
