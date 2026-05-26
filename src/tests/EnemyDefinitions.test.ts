import { describe, expect, it } from "vitest";
import { enemyDefinitions } from "../data/enemyDefinitions";
import { enemyTraitEffects } from "../data/enemyTraitEffects";

describe("enemy definitions", () => {
  it("keeps legacy combat fields while exposing trait-based balance fields", () => {
    for (const enemy of Object.values(enemyDefinitions)) {
      expect(enemy.description.length).toBeGreaterThan(0);
      expect(enemy.role).toBeTruthy();
      expect(enemy.intentStyle).toBeTruthy();
      expect(enemy.basePattern.id).toBe(enemy.pattern.id);
      expect(enemy.maxHp).toBeGreaterThan(0);
      expect(Array.isArray(enemy.defenseRules)).toBe(true);
      expect(Array.isArray(enemy.attackRules)).toBe(true);
      expect(Array.isArray(enemy.phases)).toBe(true);
    }
  });

  it("uses only registered enemy traits", () => {
    const registeredTraits = new Set(Object.keys(enemyTraitEffects));

    for (const enemy of Object.values(enemyDefinitions)) {
      for (const trait of enemy.traits) {
        expect(registeredTraits.has(trait)).toBe(true);
      }
    }
  });
});
