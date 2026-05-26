import type { GameAppState, PlayerInput } from "./GameAppState";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import { standardRuleSet, type TetrisRuleSet } from "../domain/tetris/TetrisRuleSet";
import { HandlePlayerInputUseCase } from "./HandlePlayerInputUseCase";
import { consumeInput, createInputBuffer, pruneExpiredInputs, sortedBufferedInputs } from "./input/InputBuffer";
import type { InitialActionState } from "./input/InitialActionState";

export class ProcessBufferedInputUseCase {
  constructor(
    private readonly random: RandomProvider,
    private readonly ruleSet: TetrisRuleSet = standardRuleSet,
  ) {}

  execute(state: GameAppState, nowMs: number, initialAction?: InitialActionState): GameAppState {
    const prunedBuffer = pruneExpiredInputs(state.inputBuffer ?? createInputBuffer(), nowMs);
    if (prunedBuffer.entries.length === 0) return { ...state, inputBuffer: prunedBuffer };

    for (const entry of sortedBufferedInputs(prunedBuffer)) {
      const result = new HandlePlayerInputUseCase(this.random, this.ruleSet).executeWithResult(state, entry.command, nowMs, initialAction);
      if (result.executed) {
        return { ...result.state, inputBuffer: consumeInput(prunedBuffer, entry.id) };
      }
    }

    return { ...state, inputBuffer: prunedBuffer };
  }
}

export const canBufferInput = (state: GameAppState, input: PlayerInput, ruleSet: TetrisRuleSet = standardRuleSet): boolean => {
  const combat = state.combat;
  const player = combat?.player;
  if (state.scene !== "combat" || !combat || !player || combat.result !== "ongoing") return false;
  if (!player.activePiece) return false;
  if (input === "hold") return ruleSet.holdEnabled && !player.holdSlot.withMaxSlots(ruleSet.maxHoldSlots).usedThisTurn;
  return true;
};
