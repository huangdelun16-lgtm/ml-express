import {
  buildPackingRows,
  getPackingModalModel,
  parseDeclaredItemCostMmk,
  parseSelectedProductSegments,
  stripAutoTagsFromOrderDescription,
} from "./parseOrderPackingItems";

describe("parseOrderPackingItems", () => {
  it("parses 已选商品 segments", () => {
    const desc =
      "[已选商品: 苹果 x2, 香蕉 x1][余额支付: 5,000 MMK] 请尽快";
    expect(parseSelectedProductSegments(desc)).toEqual(["苹果 x2", "香蕉 x1"]);
  });

  it("parses Selected (English) label", () => {
    const desc = "[Selected: Foo x3][Balance Payment: 1200 MMK]";
    expect(parseSelectedProductSegments(desc)).toEqual(["Foo x3"]);
    expect(parseDeclaredItemCostMmk(desc)).toBe(1200);
  });

  it("parses legacy 商品清单 label", () => {
    const desc = "[商品清单: A x1, B x2]";
    expect(parseSelectedProductSegments(desc)).toEqual(["A x1", "B x2"]);
  });

  it("buildPackingRows uses nameToPrice and declared total", () => {
    const desc = "[已选商品: 苹果 x2, 香蕉 x1][余额支付: 9,000 MMK]";
    const { rows, declaredItemTotal, summaryTotal } = buildPackingRows(desc, {
      苹果: 3000,
      香蕉: 2000,
    });
    expect(rows).toEqual([
      { name: "苹果", qty: 2, unitPrice: 3000, lineTotal: 6000 },
      { name: "香蕉", qty: 1, unitPrice: 2000, lineTotal: 2000 },
    ]);
    expect(declaredItemTotal).toBe(9000);
    expect(summaryTotal).toBe(9000);
  });

  it("stripAutoTagsFromOrderDescription keeps free text", () => {
    const desc =
      "[已选商品: A x1][余额支付: 100 MMK] 门口放货架";
    expect(stripAutoTagsFromOrderDescription(desc)).toBe("门口放货架");
  });

  it("getPackingModalModel exposes lineCount and customerNote", () => {
    const m = getPackingModalModel(
      "[Selected: X x2][Balance Payment: 500 MMK] note",
      { X: 250 },
    );
    expect(m.lineCount).toBe(1);
    expect(m.customerNote).toBe("note");
    expect(m.summaryTotal).toBe(500);
  });
});
