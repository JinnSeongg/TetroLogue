import type { GameAppState } from "./GameAppState";
import type { SaveRunRepository } from "./ports/SaveRunRepository";

export class SaveRunUseCase {
  constructor(private readonly repository: SaveRunRepository) {}

  execute(state: GameAppState): void {
    this.repository.save(state);
  }
}
