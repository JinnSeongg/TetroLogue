import { describe, expect, it } from "vitest";
import { DamageResolver } from "../domain/combat/DamageResolver";
import { enemyDefinitions } from "../data/enemyDefinitions";

describe("EnemyDefenseRule", () => {
  it("reduces single-line attack damage for Line Guard", () => {
    const damage = new DamageResolver().resolve(enemyDefinitions.enemy_line_guard, 2, 1);

    expect(damage).toBe(1);
  });
});
