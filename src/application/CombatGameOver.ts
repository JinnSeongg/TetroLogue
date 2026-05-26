import type { GameAppState } from "./GameAppState";
import type { ActivePiece } from "../domain/tetris/ActivePiece";
import type { GameEvent } from "../domain/shared/GameEvent";

export type CombatGameOverReason = "spawnCollision" | "lockOut" | "missingActivePiece";

const reasonMessage: Record<CombatGameOverReason, string> = {
  spawnCollision: "Board overflow: the next piece cannot spawn.",
  lockOut: "Board overflow: the piece locked in the hidden row.",
  missingActivePiece: "Combat stopped because the active piece was missing.",
};

export function triggerCombatGameOver(
  state: GameAppState,
  reason: CombatGameOverReason,
  diagnostics: string[],
  activePiece?: ActivePiece,
): GameAppState {
  if (!state.combat) return state;
  const diagnosticEvents: GameEvent[] = diagnostics.map((message) => ({ type: "CombatDiagnostic", message }));
  const combatEnded: GameEvent = { type: "CombatEnded", result: "defeat" };
  for (const message of diagnostics) {
    console.warn(`[tetris] ${message}`);
  }

  return {
    ...state,
    scene: "runResult",
    runResult: { result: "defeat", title: "Run Failed", message: reasonMessage[reason] },
    combat: {
      ...state.combat,
      result: "defeat",
      player: {
        ...state.combat.player,
        activePiece: activePiece ?? state.combat.player.activePiece,
      },
      log: [...state.combat.log, ...diagnosticEvents, combatEnded],
    },
    events: [...state.events, ...diagnosticEvents, combatEnded],
  };
}
