import { describe, expect, it } from "vitest";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { SelectRewardUseCase } from "../application/SelectRewardUseCase";
import { ResolveLineClearUseCase } from "../application/ResolveLineClearUseCase";
import { LocalStorageSaveRepository } from "../infrastructure/LocalStorageSaveRepository";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("LocalStorageSaveRepository", () => {
  it("rehydrates run state and owned relics", () => {
    const random = new SeededRandomProvider(16);
    const started = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    const victory = defeatEnemyWithTetrises(started, random);
    const rewardId = victory.reward?.choices[0].id;
    if (!rewardId) throw new Error("Expected reward");
    const selected = new SelectRewardUseCase().execute(victory, rewardId);
    const repository = new LocalStorageSaveRepository("test", new MemoryStorage());

    repository.save(selected);
    const loaded = repository.load();

    expect(loaded?.run?.status).toBe("map");
    expect(loaded?.run?.relicInventory.relics).toHaveLength(1);
  });

  it("filters unknown relic ids while loading", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "test",
      JSON.stringify({
        version: 1,
        scene: "nodeMap",
        run: {
          id: "run",
          nodeMap: { nodes: [] },
          currentNodeId: "node_start",
          relics: [{ instanceId: "bad", definitionId: "unknown_relic" }],
          status: "map",
        },
        events: [],
      }),
    );

    const loaded = new LocalStorageSaveRepository("test", storage).load();

    expect(loaded?.run?.relicInventory.relics).toHaveLength(0);
  });

  it("fails safely for unknown combat enemy ids", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "test",
      JSON.stringify({
        version: 1,
        scene: "combat",
        run: {
          id: "run",
          nodeMap: { nodes: [] },
          currentNodeId: "node_start",
          relics: [],
          status: "combat",
        },
        combat: {
          player: {
            hp: 1,
            board: Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => ({ filled: false }))),
            nextPieces: [],
            holdUsedThisTurn: false,
            combo: -1,
            backToBackActive: false,
            actionCount: 0,
          },
          enemy: { definitionId: "unknown_enemy", hp: 1 },
          result: "ongoing",
          log: [],
        },
        events: [],
      }),
    );

    expect(new LocalStorageSaveRepository("test", storage).load()).toBeUndefined();
  });
});

function defeatEnemyWithTetrises(state: ReturnType<StartCombatUseCase["execute"]>, random: SeededRandomProvider) {
  let next = state;
  for (let index = 0; index < 200 && next.scene === "combat"; index += 1) {
    next = new ResolveLineClearUseCase(random).execute(next, 4);
  }
  return next;
}
