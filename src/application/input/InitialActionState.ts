import type { PlayerInput } from "../GameAppState";
import type { InputState } from "./InputState";
import { isHeld } from "./InputState";

export type InitialRotationRequest = "None" | "CW" | "CCW" | "R180";

export type InitialActionState = {
  holdRequested: boolean;
  rotationRequested: InitialRotationRequest;
};

export const noInitialAction = (): InitialActionState => ({
  holdRequested: false,
  rotationRequested: "None",
});

export const initialActionFromInputState = (inputState: InputState): InitialActionState => ({
  holdRequested: isHeld(inputState, "Hold"),
  rotationRequested: resolveInitialRotation(inputState),
});

export const initialRotationToPlayerInput = (rotation: InitialRotationRequest): PlayerInput | undefined => {
  if (rotation === "CW") return "rotateClockwise";
  if (rotation === "CCW") return "rotateCounterClockwise";
  if (rotation === "R180") return "rotate180";
  return undefined;
};

function resolveInitialRotation(inputState: InputState): InitialRotationRequest {
  if (isHeld(inputState, "Rotate180")) return "R180";
  if (isHeld(inputState, "RotateCW") && isHeld(inputState, "RotateCCW")) return inputState.lastRotationPressed ?? "CW";
  if (isHeld(inputState, "RotateCW")) return "CW";
  if (isHeld(inputState, "RotateCCW")) return "CCW";
  return "None";
}
