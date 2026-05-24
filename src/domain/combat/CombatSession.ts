import type { CombatState } from "./CombatState";

export class CombatSession {
  constructor(public readonly state: CombatState) {}

  withState(state: CombatState): CombatSession {
    return new CombatSession(state);
  }
}
