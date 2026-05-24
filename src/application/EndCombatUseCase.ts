import type { GameAppState } from "./GameAppState";

export class EndCombatUseCase {
  execute(state: GameAppState): GameAppState {
    if (!state.combat || !state.run) return state;
    return {
      ...state,
      run: { ...state.run, status: state.combat.result === "victory" ? "reward" : "map" },
    };
  }
}
