import { describe, expect, it } from "vitest";
import { BrowserInputAdapter } from "../infrastructure/BrowserInputAdapter";

describe("BrowserInputAdapter", () => {
  it.each([
    ["ArrowLeft", "moveLeft"],
    ["ArrowRight", "moveRight"],
    ["ArrowDown", "softDrop"],
    [" ", "hardDrop"],
    ["ArrowUp", "rotateClockwise"],
    ["x", "rotateClockwise"],
    ["X", "rotateClockwise"],
    ["z", "rotateCounterClockwise"],
    ["Z", "rotateCounterClockwise"],
    ["Control", "rotateCounterClockwise"],
    ["a", "rotate180"],
    ["A", "rotate180"],
    ["c", "hold"],
    ["C", "hold"],
    ["Shift", "hold"],
  ] as const)("maps %s to %s", (key, input) => {
    expect(new BrowserInputAdapter().mapKey(key)).toBe(input);
  });
});
