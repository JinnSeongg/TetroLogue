import { describe, expect, it } from "vitest";
import { selectEnemyForFloor } from "../data/enemySelector";
import { generateRunNodes } from "../domain/run/RunProgression";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

describe("enemy selector", () => {
  it("selects final boss candidates on floor 30", () => {
    const enemy = selectEnemyForFloor(30, "standard", { next: () => 0 });

    expect(enemy.role).toBe("finalBoss");
  });

  it("selects boss or miniboss candidates on boss floors", () => {
    const enemy = selectEnemyForFloor(15, "standard", { next: () => 0.6 });

    expect(["boss", "miniboss"]).toContain(enemy.role);
  });

  it("lets later ordinary floors reach elite candidates", () => {
    const enemy = selectEnemyForFloor(27, "standard", { next: () => 0.99 });

    expect(enemy.role).toBe("elite");
  });

  it("avoids very recent enemies when alternatives exist", () => {
    const first = selectEnemyForFloor(1, "standard", { next: () => 0 });
    const second = selectEnemyForFloor(2, "standard", { next: () => 0 }, [first.id]);

    expect(second.id).not.toBe(first.id);
  });

  it("wires selected enemy ids into generated floor nodes", () => {
    const random = new SeededRandomProvider(77);
    const nodes = generateRunNodes({
      random,
      eventChance: 0,
      difficultyId: "standard",
      selectEnemyIdForFloor: (floor, difficultyId, rng, recentEnemyIds) =>
        selectEnemyForFloor(floor, difficultyId, rng, recentEnemyIds).id,
    });

    expect(nodes.find((node) => node.floor === 1)?.enemyPoolId).toBeTruthy();
    expect(nodes.find((node) => node.floor === 5)?.bossId).toBeTruthy();
    expect(nodes.find((node) => node.floor === 30)?.bossId).toBe("enemy_final_void_monolith");
  });
});
