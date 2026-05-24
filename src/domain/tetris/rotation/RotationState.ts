export type RotationState = "0" | "R" | "2" | "L";

export const rotationStateToQuarterTurns = (state: RotationState): number => {
  const turns: Record<RotationState, number> = {
    "0": 0,
    R: 1,
    "2": 2,
    L: 3,
  };
  return turns[state];
};

export const normalizeRotationState = (value: unknown): RotationState => {
  if (value === "0" || value === "R" || value === "2" || value === "L") return value;
  if (typeof value === "number") {
    const states: RotationState[] = ["0", "R", "2", "L"];
    return states[((value % 4) + 4) % 4];
  }
  return "0";
};
