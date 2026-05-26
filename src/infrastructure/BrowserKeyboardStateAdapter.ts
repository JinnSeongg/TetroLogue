import type { PlayerInput } from "../application/GameAppState";
import type { InputState } from "../application/input/InputState";
import { pressHorizontal, pressSoftDrop, releaseHorizontal, releaseSoftDrop, setHoldPressed, setRotatePressed } from "../application/input/InputState";
import { defaultPlayerSettings, type PlayerSettings } from "../application/settings/PlayerSettings";
import { BrowserInputAdapter, type BrowserControlInput } from "./BrowserInputAdapter";

export type BrowserKeyboardStateEvent = {
  type: "keydown" | "keyup";
  key: string;
  repeat?: boolean;
};

export type BrowserKeyboardStateResult = {
  inputState: InputState;
  immediateInput?: PlayerInput;
};

export class BrowserKeyboardStateAdapter {
  constructor(
    private readonly inputAdapter = new BrowserInputAdapter(),
    private readonly settings: PlayerSettings = defaultPlayerSettings,
  ) {}

  apply(inputState: InputState, event: BrowserKeyboardStateEvent, nowMs: number): BrowserKeyboardStateResult {
    const input = this.inputAdapter.mapKey(event.key, this.settings);
    if (!input) return { inputState };
    if (event.type === "keydown" && event.repeat) return { inputState };

    if (event.type === "keyup") {
      return { inputState: this.release(inputState, input) };
    }

    if (input === "moveLeft") {
      const pressed = pressHorizontal(inputState, "left", nowMs);
      return { inputState: pressed.state, immediateInput: pressed.isNewPress ? "moveLeft" : undefined };
    }

    if (input === "moveRight") {
      const pressed = pressHorizontal(inputState, "right", nowMs);
      return { inputState: pressed.state, immediateInput: pressed.isNewPress ? "moveRight" : undefined };
    }

    if (input === "softDrop") {
      return { inputState: pressSoftDrop(inputState, nowMs) };
    }

    return { inputState: this.press(inputState, input), immediateInput: input };
  }

  private press(inputState: InputState, input: PlayerInput): InputState {
    if (input === "hold") return setHoldPressed(inputState, true);
    if (input === "rotateClockwise") return setRotatePressed(inputState, "CW", true);
    if (input === "rotateCounterClockwise") return setRotatePressed(inputState, "CCW", true);
    if (input === "rotate180") return setRotatePressed(inputState, "R180", true);
    return inputState;
  }

  private release(inputState: InputState, input: BrowserControlInput): InputState {
    if (input === "moveLeft") return releaseHorizontal(inputState, "left");
    if (input === "moveRight") return releaseHorizontal(inputState, "right");
    if (input === "softDrop") return releaseSoftDrop(inputState);
    if (input === "hold") return setHoldPressed(inputState, false);
    if (input === "rotateClockwise") return setRotatePressed(inputState, "CW", false);
    if (input === "rotateCounterClockwise") return setRotatePressed(inputState, "CCW", false);
    if (input === "rotate180") return setRotatePressed(inputState, "R180", false);
    return inputState;
  }
}
