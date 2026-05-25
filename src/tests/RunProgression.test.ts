import { describe, expect, it } from "vitest";
import { generateRunNodes, getNodeStatus, getVisibleNodes, createRunProgressState } from "../domain/run/RunProgression";

const fixedBattleRandom = { next: () => 0.9 };
const fixedEventRandom = { next: () => 0.1 };

describe("Run progression", () => {
  it("generates a 30-floor linear run with fixed shop, boss, and final boss floors", () => {
    const nodes = generateRunNodes({ random: fixedBattleRandom });

    expect(nodes).toHaveLength(30);
    expect(nodes.find((node) => node.floor === 4)?.type).toBe("shop");
    expect(nodes.find((node) => node.floor === 5)?.type).toBe("boss");
    expect(nodes.find((node) => node.floor === 9)?.type).toBe("shop");
    expect(nodes.find((node) => node.floor === 10)?.type).toBe("boss");
    expect(nodes.find((node) => node.floor === 29)?.type).toBe("shop");
    expect(nodes.find((node) => node.floor === 30)?.type).toBe("finalBoss");
  });

  it("only generates events on ordinary floors", () => {
    const nodes = generateRunNodes({ random: fixedEventRandom });
    const fixedFloors = new Set([4, 5, 9, 10, 14, 15, 19, 20, 24, 25, 29, 30]);

    expect(nodes.filter((node) => node.type === "event").every((node) => !fixedFloors.has(node.floor))).toBe(true);
    expect(nodes.find((node) => node.floor === 1)?.type).toBe("event");
  });

  it("returns the visible chain around the current floor", () => {
    const progress = createRunProgressState(generateRunNodes({ random: fixedBattleRandom }));

    expect(getVisibleNodes({ ...progress, currentFloor: 1 }).map((node) => node.floor)).toEqual([1, 2, 3, 4]);
    expect(getVisibleNodes({ ...progress, currentFloor: 2 }).map((node) => node.floor)).toEqual([1, 2, 3, 4, 5]);
    expect(getVisibleNodes({ ...progress, currentFloor: 12 }).map((node) => node.floor)).toEqual([11, 12, 13, 14, 15]);
    expect(getVisibleNodes({ ...progress, currentFloor: 29 }).map((node) => node.floor)).toEqual([28, 29, 30]);
    expect(getVisibleNodes({ ...progress, currentFloor: 30 }).map((node) => node.floor)).toEqual([29, 30]);
  });

  it("calculates node status from the current floor", () => {
    expect(getNodeStatus({ floor: 2, type: "battle" }, 3)).toBe("completed");
    expect(getNodeStatus({ floor: 3, type: "battle" }, 3)).toBe("current");
    expect(getNodeStatus({ floor: 4, type: "battle" }, 3)).toBe("future");
  });
});
