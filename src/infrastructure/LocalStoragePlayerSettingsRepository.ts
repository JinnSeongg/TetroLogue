import type { PlayerSettingsRepository } from "../application/ports/PlayerSettingsRepository";
import { defaultPlayerSettings, sanitizePlayerSettings, type PlayerSettings } from "../application/settings/PlayerSettings";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type SavedPlayerSettingsV1 = {
  version: 1;
  settings: PlayerSettings;
};

export class LocalStoragePlayerSettingsRepository implements PlayerSettingsRepository {
  constructor(
    private readonly key = "tetrologue.playerSettings",
    private readonly storage: StorageLike = localStorage,
  ) {}

  load(): PlayerSettings {
    const raw = this.storage.getItem(this.key);
    if (!raw) return defaultPlayerSettings;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isSavedPlayerSettingsV1(parsed)) return defaultPlayerSettings;
      return sanitizePlayerSettings(parsed.settings);
    } catch {
      return defaultPlayerSettings;
    }
  }

  save(settings: PlayerSettings): void {
    const payload: SavedPlayerSettingsV1 = { version: 1, settings: sanitizePlayerSettings(settings) };
    this.storage.setItem(this.key, JSON.stringify(payload));
  }
}

function isSavedPlayerSettingsV1(value: unknown): value is SavedPlayerSettingsV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedPlayerSettingsV1>;
  return candidate.version === 1 && typeof candidate.settings === "object";
}
