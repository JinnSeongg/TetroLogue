import type { GameAppState } from "../GameAppState";

export interface SaveRunRepository {
  save(state: GameAppState): void;
  load(): GameAppState | undefined;
}
