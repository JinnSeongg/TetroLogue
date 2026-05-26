import type { PlayerSettings } from "../settings/PlayerSettings";
import type { HorizontalDirection, InputState } from "./InputState";

const INSTANT_ARR_MOVE_BUDGET = 20;

export type MovementRepeatResult = {
  inputState: InputState;
  moves: HorizontalDirection[];
  softDropSteps: number;
};

export class MovementRepeater {
  next(input: InputState, nowMs: number, settings: PlayerSettings): MovementRepeatResult {
    const direction = resolveDirection(input);
    const softDrop = repeatSoftDrop(input, nowMs, settings);
    if (!direction) return { inputState: { ...softDrop.inputState, lastAutoMoveAt: undefined }, moves: [], softDropSteps: softDrop.steps };
    const pressedAt = direction === "left" ? input.leftPressedAt : input.rightPressedAt;
    if (pressedAt === undefined) return { inputState: { ...softDrop.inputState, lastAutoMoveAt: undefined }, moves: [], softDropSteps: softDrop.steps };

    const firstRepeatAt = pressedAt + settings.input.dasMs;
    if (nowMs < firstRepeatAt) return { inputState: softDrop.inputState, moves: [], softDropSteps: softDrop.steps };

    const previousMoveAt = input.lastAutoMoveAt ?? firstRepeatAt - settings.input.arrMs;
    const arrMs = settings.input.arrMs;
    if (arrMs === 0) {
      return {
        inputState: { ...softDrop.inputState, lastAutoMoveAt: nowMs },
        moves: Array.from({ length: INSTANT_ARR_MOVE_BUDGET }, () => direction),
        softDropSteps: softDrop.steps,
      };
    }

    let nextMoveAt = previousMoveAt + arrMs;
    const moves: HorizontalDirection[] = [];
    while (nextMoveAt <= nowMs) {
      moves.push(direction);
      nextMoveAt += arrMs;
    }

    return {
      inputState: moves.length > 0 ? { ...softDrop.inputState, lastAutoMoveAt: nextMoveAt - arrMs } : softDrop.inputState,
      moves,
      softDropSteps: softDrop.steps,
    };
  }
}

function repeatSoftDrop(input: InputState, nowMs: number, settings: PlayerSettings): { inputState: InputState; steps: number } {
  if (!input.softDropPressed || input.softDropPressedAt === undefined) return { inputState: { ...input, lastSoftDropAt: undefined }, steps: 0 };
  const intervalMs = Math.max(1, settings.input.softDropGravityMs);
  let nextDropAt = (input.lastSoftDropAt ?? input.softDropPressedAt) + intervalMs;
  let steps = 0;
  while (nextDropAt <= nowMs && steps < INSTANT_ARR_MOVE_BUDGET) {
    steps += 1;
    nextDropAt += intervalMs;
  }
  return {
    inputState: steps > 0 ? { ...input, lastSoftDropAt: nextDropAt - intervalMs } : input,
    steps,
  };
}

function resolveDirection(input: InputState): HorizontalDirection | undefined {
  if (input.leftPressed && input.rightPressed) return input.activeHorizontalDirection;
  if (input.leftPressed) return "left";
  if (input.rightPressed) return "right";
  return undefined;
}
