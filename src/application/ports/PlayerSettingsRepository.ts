import type { PlayerSettings } from "../settings/PlayerSettings";

export interface PlayerSettingsRepository {
  load(): PlayerSettings;
  save(settings: PlayerSettings): void;
}
