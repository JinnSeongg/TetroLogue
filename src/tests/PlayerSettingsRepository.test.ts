import { describe, expect, it } from "vitest";
import { LocalStoragePlayerSettingsRepository } from "../infrastructure/LocalStoragePlayerSettingsRepository";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("LocalStoragePlayerSettingsRepository", () => {
  it("saves and loads DAS/ARR settings", () => {
    const storage = new MemoryStorage();
    const repository = new LocalStoragePlayerSettingsRepository("settings", storage);

    repository.save({
      input: {
        dasMs: 180,
        arrMs: 30,
        softDropGravityMs: 18,
        keyBindings: {
          moveLeft: ["ArrowLeft"],
          moveRight: ["ArrowRight"],
          softDrop: ["ArrowDown"],
          hardDrop: [" "],
          rotateClockwise: ["x"],
          rotateCounterClockwise: ["z"],
          rotate180: ["a"],
          hold: ["c"],
        },
      },
      accessibility: {},
      video: { screenShakeEnabled: false, ghostPieceEnabled: false, gridVisible: false },
      audio: { masterVolume: 50, bgmVolume: 40, sfxVolume: 30, uiVolume: 20, musicVolume: 10 },
    });

    expect(repository.load().input.dasMs).toBe(180);
    expect(repository.load().input.arrMs).toBe(30);
    expect(repository.load().input.softDropGravityMs).toBe(18);
    expect(repository.load().video.ghostPieceEnabled).toBe(false);
    expect(repository.load().audio.masterVolume).toBe(50);
    expect(repository.load().audio.uiVolume).toBe(20);
    expect(repository.load().audio.musicVolume).toBe(10);
  });

  it("falls back and clamps invalid values", () => {
    const storage = new MemoryStorage();
    storage.setItem("settings", JSON.stringify({ version: 1, settings: { input: { dasMs: -1, arrMs: 999 } } }));

    const loaded = new LocalStoragePlayerSettingsRepository("settings", storage).load();

    expect(loaded.input.dasMs).toBe(60);
    expect(loaded.input.arrMs).toBe(120);
  });

  it("migrates legacy BGM volume into music volume", () => {
    const storage = new MemoryStorage();
    storage.setItem("settings", JSON.stringify({ version: 1, settings: { audio: { bgmVolume: 35 } } }));

    const loaded = new LocalStoragePlayerSettingsRepository("settings", storage).load();

    expect(loaded.audio.bgmVolume).toBe(35);
    expect(loaded.audio.musicVolume).toBe(35);
  });

  it("persists softDropGravityMs as a player setting", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "settings",
      JSON.stringify({ version: 1, settings: { input: { dasMs: 160, arrMs: 35, softDropGravityMs: 1 } } }),
    );

    const loaded = new LocalStoragePlayerSettingsRepository("settings", storage).load();

    expect(loaded.input.dasMs).toBe(160);
    expect(loaded.input.arrMs).toBe(35);
    expect(loaded.input.softDropGravityMs).toBe(1);
  });
});
