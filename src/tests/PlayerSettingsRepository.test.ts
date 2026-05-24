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
      video: {},
      audio: {},
    });

    expect(repository.load().input.dasMs).toBe(180);
    expect(repository.load().input.arrMs).toBe(30);
  });

  it("falls back and clamps invalid values", () => {
    const storage = new MemoryStorage();
    storage.setItem("settings", JSON.stringify({ version: 1, settings: { input: { dasMs: -1, arrMs: 999 } } }));

    const loaded = new LocalStoragePlayerSettingsRepository("settings", storage).load();

    expect(loaded.input.dasMs).toBe(60);
    expect(loaded.input.arrMs).toBe(120);
  });

  it("does not persist gameplay rule values such as softDropGravityMs as player settings", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "settings",
      JSON.stringify({ version: 1, settings: { input: { dasMs: 160, arrMs: 35, softDropGravityMs: 1 } } }),
    );

    const loaded = new LocalStoragePlayerSettingsRepository("settings", storage).load();

    expect(loaded.input.dasMs).toBe(160);
    expect(loaded.input.arrMs).toBe(35);
    expect("softDropGravityMs" in loaded.input).toBe(false);
  });
});
