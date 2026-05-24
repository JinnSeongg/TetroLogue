import type { RotationDirection } from "./RotationDirection";
import type { RotationState } from "./RotationState";

export type RotationTransition = `${RotationState}>${RotationState}`;

export const rotationTransitions: Record<RotationDirection, Record<RotationState, RotationState>> = {
  CW: {
    "0": "R",
    R: "2",
    "2": "L",
    L: "0",
  },
  CCW: {
    "0": "L",
    L: "2",
    "2": "R",
    R: "0",
  },
  ONE_EIGHTY: {
    "0": "2",
    R: "L",
    "2": "0",
    L: "R",
  },
};

export const getRotationTarget = (from: RotationState, direction: RotationDirection): RotationState => {
  return rotationTransitions[direction][from];
};

export const toRotationTransition = (from: RotationState, to: RotationState): RotationTransition => `${from}>${to}`;
