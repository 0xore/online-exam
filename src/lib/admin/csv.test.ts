import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/admin/csv";

describe("toCsv", () => {
  it("quotes commas and doubled quotes", () => {
    expect(
      toCsv([
        ["name", "note"],
        ['Ada, "Countess"', "pass"],
      ]),
    ).toBe('name,note\r\n"Ada, ""Countess""",pass');
  });
});
