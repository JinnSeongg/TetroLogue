export type HorizontalDirection = "left" | "right";

export type InputState = {
  leftPressed: boolean;
  rightPressed: boolean;
  leftPressedAt?: number;
  rightPressedAt?: number;
  activeHorizontalDirection?: HorizontalDirection;
  lastAutoMoveAt?: number;
  softDropPressed: boolean;
  holdPressed: boolean;
  rotateCWPressed: boolean;
  rotateCCWPressed: boolean;
  rotate180Pressed: boolean;
  lastRotationPressed?: "CW" | "CCW";
};

export const createInputState = (): InputState => ({
  leftPressed: false,
  rightPressed: false,
  softDropPressed: false,
  holdPressed: false,
  rotateCWPressed: false,
  rotateCCWPressed: false,
  rotate180Pressed: false,
});

export const pressHorizontal = (state: InputState, direction: HorizontalDirection, nowMs: number): { state: InputState; isNewPress: boolean } => {
  const alreadyPressed = direction === "left" ? state.leftPressed : state.rightPressed;
  if (alreadyPressed) return { state, isNewPress: false };

  return {
    state:
      direction === "left"
        ? {
            ...state,
            leftPressed: true,
            leftPressedAt: nowMs,
            activeHorizontalDirection: "left",
            lastAutoMoveAt: undefined,
          }
        : {
            ...state,
            rightPressed: true,
            rightPressedAt: nowMs,
            activeHorizontalDirection: "right",
            lastAutoMoveAt: undefined,
          },
    isNewPress: true,
  };
};

export const releaseHorizontal = (state: InputState, direction: HorizontalDirection): InputState => {
  const next =
    direction === "left"
      ? { ...state, leftPressed: false, leftPressedAt: undefined }
      : { ...state, rightPressed: false, rightPressedAt: undefined };

  if (next.activeHorizontalDirection !== direction) return next;
  if (direction === "left" && next.rightPressed) {
    return { ...next, activeHorizontalDirection: "right", lastAutoMoveAt: undefined };
  }
  if (direction === "right" && next.leftPressed) {
    return { ...next, activeHorizontalDirection: "left", lastAutoMoveAt: undefined };
  }
  return { ...next, activeHorizontalDirection: undefined, lastAutoMoveAt: undefined };
};

export const setSoftDropPressed = (state: InputState, pressed: boolean): InputState => ({
  ...state,
  softDropPressed: pressed,
});

export const setHoldPressed = (state: InputState, pressed: boolean): InputState => ({
  ...state,
  holdPressed: pressed,
});

export const setRotatePressed = (state: InputState, rotation: "CW" | "CCW" | "R180", pressed: boolean): InputState => {
  if (rotation === "CW") return { ...state, rotateCWPressed: pressed, lastRotationPressed: pressed ? "CW" : state.lastRotationPressed };
  if (rotation === "CCW") return { ...state, rotateCCWPressed: pressed, lastRotationPressed: pressed ? "CCW" : state.lastRotationPressed };
  return { ...state, rotate180Pressed: pressed };
};

export const isHeld = (state: InputState, input: "Hold" | "RotateCW" | "RotateCCW" | "Rotate180"): boolean => {
  if (input === "Hold") return state.holdPressed;
  if (input === "RotateCW") return state.rotateCWPressed;
  if (input === "RotateCCW") return state.rotateCCWPressed;
  return state.rotate180Pressed;
};
