import { describe, expect, it } from "vitest";
import { normalizeDangerLevel } from "../presentation/components/DangerVisualController";

describe("DangerVisualController", () => {
  it("maps field analysis Safe level to visual Normal level", () => {
    expect(normalizeDangerLevel("Safe")).toBe("Normal");
  });

  it("keeps warning, danger, and critical visual levels", () => {
    expect(normalizeDangerLevel("Warning")).toBe("Warning");
    expect(normalizeDangerLevel("Danger")).toBe("Danger");
    expect(normalizeDangerLevel("Critical")).toBe("Critical");
  });
});
