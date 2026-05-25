import { describe, expect, it } from "vitest";
import { BrowserInputAdapter } from "../infrastructure/BrowserInputAdapter";
import { defaultPlayerSettings, type PlayerSettings } from "../application/settings/PlayerSettings";

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

  it("uses configured key bindings", () => {
    const settings: PlayerSettings = {
      ...defaultPlayerSettings,
      input: {
        ...defaultPlayerSettings.input,
        keyBindings: {
          ...defaultPlayerSettings.input.keyBindings,
          moveLeft: ["h"],
          moveRight: ["l"],
        },
      },
    };

    expect(new BrowserInputAdapter().mapKey("h", settings)).toBe("moveLeft");
    expect(new BrowserInputAdapter().mapKey("l", settings)).toBe("moveRight");
    expect(new BrowserInputAdapter().mapKey("ArrowLeft", settings)).toBeUndefined();
  });
});
