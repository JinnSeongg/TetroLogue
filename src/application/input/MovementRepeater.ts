import type { PlayerSettings } from "../settings/PlayerSettings";
import type { HorizontalDirection, InputState } from "./InputState";

const INSTANT_ARR_MOVE_BUDGET = 20;

export type MovementRepeatResult = {
  inputState: InputState;
  moves: HorizontalDirection[];
};

export class MovementRepeater {
  next(input: InputState, nowMs: number, settings: PlayerSettings): MovementRepeatResult {
    const direction = resolveDirection(input);
    if (!direction) return { inputState: { ...input, lastAutoMoveAt: undefined }, moves: [] };
    const pressedAt = direction === "left" ? input.leftPressedAt : input.rightPressedAt;
    if (pressedAt === undefined) return { inputState: { ...input, lastAutoMoveAt: undefined }, moves: [] };

    const firstRepeatAt = pressedAt + settings.input.dasMs;
    if (nowMs < firstRepeatAt) return { inputState: input, moves: [] };

    const previousMoveAt = input.lastAutoMoveAt ?? firstRepeatAt - settings.input.arrMs;
    const arrMs = settings.input.arrMs;
    if (arrMs === 0) {
      return {
        inputState: { ...input, lastAutoMoveAt: nowMs },
        moves: Array.from({ length: INSTANT_ARR_MOVE_BUDGET }, () => direction),
      };
    }

    let nextMoveAt = previousMoveAt + arrMs;
    const moves: HorizontalDirection[] = [];
    while (nextMoveAt <= nowMs) {
      moves.push(direction);
      nextMoveAt += arrMs;
    }

    return {
      inputState: moves.length > 0 ? { ...input, lastAutoMoveAt: nextMoveAt - arrMs } : input,
      moves,
    };
  }
}

function resolveDirection(input: InputState): HorizontalDirection | undefined {
  if (input.leftPressed && input.rightPressed) return input.activeHorizontalDirection;
  if (input.leftPressed) return "left";
  if (input.rightPressed) return "right";
  return undefined;
}
