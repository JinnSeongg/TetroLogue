import type { GameAppState } from "./GameAppState";
import type { SaveRunRepository } from "./ports/SaveRunRepository";

export class LoadRunUseCase {
  constructor(private readonly repository: SaveRunRepository) {}

  execute(): GameAppState | undefined {
    return this.repository.load();
  }
}
