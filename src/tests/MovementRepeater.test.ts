import { describe, expect, it } from "vitest";
import { MovementRepeater } from "../application/input/MovementRepeater";
import { createInputState, pressHorizontal, pressSoftDrop, releaseHorizontal, releaseSoftDrop } from "../application/input/InputState";
import { defaultPlayerSettings } from "../application/settings/PlayerSettings";

const settings = { ...defaultPlayerSettings, input: { ...defaultPlayerSettings.input, dasMs: 100, arrMs: 40 } };

const holdRightAt = (nowMs: number) => pressHorizontal(createInputState(), "right", nowMs).state;

describe("MovementRepeater", () => {
  it("does not repeat before DAS", () => {
    const input = holdRightAt(0);

    const result = new MovementRepeater().next(input, 99, settings);

    expect(result.moves).toEqual([]);
  });

  it("repeats at ARR speed after DAS", () => {
    const input = holdRightAt(0);
    const repeater = new MovementRepeater();

    const first = repeater.next(input, 100, settings);
    const second = repeater.next(first.inputState, 185, settings);

    expect(first.moves).toEqual(["right"]);
    expect(second.moves).toEqual(["right", "right"]);
  });

  it("uses slower repeat movement with a larger ARR", () => {
    const input = holdRightAt(0);
    const slowSettings = { ...defaultPlayerSettings, input: { ...defaultPlayerSettings.input, dasMs: 100, arrMs: 100 } };
    const fastSettings = { ...defaultPlayerSettings, input: { ...defaultPlayerSettings.input, dasMs: 100, arrMs: 20 } };

    const slow = new MovementRepeater().next(input, 220, slowSettings);
    const fast = new MovementRepeater().next(input, 220, fastSettings);

    expect(slow.moves.length).toBeLessThan(fast.moves.length);
  });

  it("treats ARR 0 as instant repeated movement with a tick budget", () => {
    const input = holdRightAt(0);
    const instantSettings = { ...defaultPlayerSettings, input: { ...defaultPlayerSettings.input, dasMs: 100, arrMs: 0 } };

    const result = new MovementRepeater().next(input, 100, instantSettings);

    expect(result.moves.length).toBeGreaterThan(5);
    expect(result.moves.every((move) => move === "right")).toBe(true);
  });

  it("stops repeating when the key is released", () => {
    const held = holdRightAt(0);
    const released = releaseHorizontal(held, "right");

    const result = new MovementRepeater().next(released, 200, settings);

    expect(result.moves).toEqual([]);
    expect(result.inputState.activeHorizontalDirection).toBeUndefined();
  });

  it("resets DAS when keyup is followed by a new press", () => {
    const held = holdRightAt(0);
    const released = releaseHorizontal(held, "right");
    const pressedAgain = pressHorizontal(released, "right", 300).state;

    const beforeDas = new MovementRepeater().next(pressedAgain, 399, settings);
    const afterDas = new MovementRepeater().next(pressedAgain, 400, settings);

    expect(beforeDas.moves).toEqual([]);
    expect(afterDas.moves).toEqual(["right"]);
  });

  it("uses the last pressed direction when both horizontal keys are held", () => {
    const left = pressHorizontal(createInputState(), "left", 0).state;
    const both = pressHorizontal(left, "right", 20).state;

    const result = new MovementRepeater().next(both, 120, settings);

    expect(result.moves).toEqual(["right"]);
  });

  it("falls back to the still held opposite direction when active key is released", () => {
    const left = pressHorizontal(createInputState(), "left", 0).state;
    const both = pressHorizontal(left, "right", 20).state;
    const fallback = releaseHorizontal(both, "right");

    const result = new MovementRepeater().next(fallback, 100, settings);

    expect(result.moves).toEqual(["left"]);
  });

  it("repeats soft drop at the configured interval", () => {
    const input = pressSoftDrop(createInputState(), 0);
    const repeater = new MovementRepeater();

    const beforeInterval = repeater.next(input, 19, settings);
    const first = repeater.next(input, 20, settings);
    const second = repeater.next(first.inputState, 65, settings);

    expect(beforeInterval.softDropSteps).toBe(0);
    expect(first.softDropSteps).toBe(1);
    expect(second.softDropSteps).toBe(2);
  });

  it("can repeat horizontal movement and soft drop in the same frame", () => {
    const horizontal = holdRightAt(0);
    const input = pressSoftDrop(horizontal, 0);

    const result = new MovementRepeater().next(input, 100, settings);

    expect(result.moves).toEqual(["right"]);
    expect(result.softDropSteps).toBe(5);
  });

  it("resets soft drop repeat state when the key is released", () => {
    const held = pressSoftDrop(createInputState(), 0);
    const repeated = new MovementRepeater().next(held, 60, settings);
    const released = releaseSoftDrop(repeated.inputState);

    const result = new MovementRepeater().next(released, 100, settings);

    expect(result.softDropSteps).toBe(0);
    expect(result.inputState.softDropPressedAt).toBeUndefined();
    expect(result.inputState.lastSoftDropAt).toBeUndefined();
  });
});
