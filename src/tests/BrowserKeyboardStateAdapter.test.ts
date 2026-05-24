import { describe, expect, it } from "vitest";
import { createInputState } from "../application/input/InputState";
import { BrowserKeyboardStateAdapter } from "../infrastructure/BrowserKeyboardStateAdapter";

describe("BrowserKeyboardStateAdapter", () => {
  it("returns one immediate move for the initial keydown and ignores repeat keydown", () => {
    const adapter = new BrowserKeyboardStateAdapter();

    const first = adapter.apply(createInputState(), { type: "keydown", key: "ArrowRight" }, 0);
    const repeated = adapter.apply(first.inputState, { type: "keydown", key: "ArrowRight", repeat: true }, 10);
    const repeatedAgain = adapter.apply(repeated.inputState, { type: "keydown", key: "ArrowRight", repeat: true }, 20);

    expect(first.immediateInput).toBe("moveRight");
    expect(repeated.immediateInput).toBeUndefined();
    expect(repeatedAgain.immediateInput).toBeUndefined();
    expect(repeatedAgain.inputState.rightPressed).toBe(true);
    expect(repeatedAgain.inputState.rightPressedAt).toBe(0);
  });

  it("does not create another immediate move while the key is already pressed", () => {
    const adapter = new BrowserKeyboardStateAdapter();

    const first = adapter.apply(createInputState(), { type: "keydown", key: "ArrowLeft" }, 0);
    const duplicate = adapter.apply(first.inputState, { type: "keydown", key: "ArrowLeft" }, 10);

    expect(first.immediateInput).toBe("moveLeft");
    expect(duplicate.immediateInput).toBeUndefined();
  });

  it("resets horizontal state on keyup so the next press gets a fresh DAS start", () => {
    const adapter = new BrowserKeyboardStateAdapter();

    const first = adapter.apply(createInputState(), { type: "keydown", key: "ArrowRight" }, 0);
    const released = adapter.apply(first.inputState, { type: "keyup", key: "ArrowRight" }, 80);
    const second = adapter.apply(released.inputState, { type: "keydown", key: "ArrowRight" }, 200);

    expect(released.inputState.rightPressed).toBe(false);
    expect(second.immediateInput).toBe("moveRight");
    expect(second.inputState.rightPressedAt).toBe(200);
  });

  it("uses the last pressed horizontal direction and falls back when it is released", () => {
    const adapter = new BrowserKeyboardStateAdapter();

    const left = adapter.apply(createInputState(), { type: "keydown", key: "ArrowLeft" }, 0);
    const right = adapter.apply(left.inputState, { type: "keydown", key: "ArrowRight" }, 10);
    const releasedRight = adapter.apply(right.inputState, { type: "keyup", key: "ArrowRight" }, 20);

    expect(right.inputState.activeHorizontalDirection).toBe("right");
    expect(releasedRight.inputState.activeHorizontalDirection).toBe("left");
  });

  it("keeps soft drop separate from horizontal repeat state", () => {
    const adapter = new BrowserKeyboardStateAdapter();

    const down = adapter.apply(createInputState(), { type: "keydown", key: "ArrowDown" }, 0);
    const up = adapter.apply(down.inputState, { type: "keyup", key: "ArrowDown" }, 20);

    expect(down.immediateInput).toBeUndefined();
    expect(down.inputState.softDropPressed).toBe(true);
    expect(up.inputState.softDropPressed).toBe(false);
  });

  it("tracks held hold and rotation keys for initial actions", () => {
    const adapter = new BrowserKeyboardStateAdapter();

    const hold = adapter.apply(createInputState(), { type: "keydown", key: "Shift" }, 0);
    const rotate = adapter.apply(hold.inputState, { type: "keydown", key: "x" }, 10);
    const releasedRotate = adapter.apply(rotate.inputState, { type: "keyup", key: "x" }, 20);

    expect(hold.inputState.holdPressed).toBe(true);
    expect(rotate.inputState.rotateCWPressed).toBe(true);
    expect(rotate.inputState.lastRotationPressed).toBe("CW");
    expect(releasedRotate.inputState.rotateCWPressed).toBe(false);
    expect(releasedRotate.inputState.holdPressed).toBe(true);
  });
});
