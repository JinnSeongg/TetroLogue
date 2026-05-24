import type { PlayerSettingsRepository } from "../ports/PlayerSettingsRepository";
import { sanitizePlayerSettings, type PlayerSettings } from "./PlayerSettings";

export class SavePlayerSettingsUseCase {
  constructor(private readonly repository: PlayerSettingsRepository) {}

  execute(settings: PlayerSettings): PlayerSettings {
    const sanitized = sanitizePlayerSettings(settings);
    this.repository.save(sanitized);
    return sanitized;
  }
}
