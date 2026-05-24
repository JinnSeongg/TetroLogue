import type { PlayerSettingsRepository } from "../ports/PlayerSettingsRepository";

export class LoadPlayerSettingsUseCase {
  constructor(private readonly repository: PlayerSettingsRepository) {}

  execute() {
    return this.repository.load();
  }
}
