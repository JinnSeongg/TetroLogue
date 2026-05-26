import type { DifficultyId, EnemyRole } from "../domain/balance/balanceTypes";
import type { EnemyDefinition } from "../domain/enemy/EnemyDefinition";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import { enemyDefinitions } from "./enemyDefinitions";

type EnemySelectorRng = Pick<RandomProvider, "next">;

const difficultyProgressOffset: Record<DifficultyId, number> = {
  explorer: -0.1,
  standard: 0,
  advanced: 0.08,
  master: 0.14,
  void: 0.2,
};

export function selectEnemyForFloor(
  floor: number,
  difficultyId: DifficultyId = "standard",
  rng?: EnemySelectorRng,
  recentEnemyIds: readonly string[] = [],
): EnemyDefinition {
  const roles = rolesForFloor(floor, difficultyId);
  const candidates = candidatesForRoles(roles.map((entry) => entry.role));
  const fallbackRoles: EnemyRole[] = floor >= 30 ? ["boss"] : floor % 5 === 0 ? ["boss", "miniboss"] : ["normal"];
  const fallbackCandidates = candidates.length > 0 ? candidates : candidatesForRoles(fallbackRoles);
  const pool = excludeRecentEnemies(fallbackCandidates, recentEnemyIds);
  const weightedPool = pool.map((enemy) => ({ enemy, weight: roles.find((entry) => entry.role === enemy.role)?.weight ?? 1 }));
  return pickWeighted(weightedPool, rng) ?? enemyDefinitions.enemy_stackling;
}

function rolesForFloor(floor: number, difficultyId: DifficultyId): { role: EnemyRole; weight: number }[] {
  if (floor >= 30) return [{ role: "finalBoss", weight: 1 }];

  const progress = normalizedProgress(floor, difficultyId);
  if (floor % 5 === 0) {
    return [
      { role: "miniboss", weight: 0.7 - progress * 0.45 },
      { role: "boss", weight: 0.3 + progress * 0.55 },
    ];
  }

  return [
    { role: "normal", weight: Math.max(0.15, 1 - progress * 1.2) },
    { role: "dangerous", weight: 0.25 + progress * 0.45 },
    { role: "elite", weight: Math.max(0.05, progress * 0.55) },
  ];
}

function normalizedProgress(floor: number, difficultyId: DifficultyId): number {
  const t = (Math.max(1, Math.min(30, floor)) - 1) / 29;
  return clamp(t + difficultyProgressOffset[difficultyId], 0, 1);
}

function candidatesForRoles(roles: EnemyRole[]): EnemyDefinition[] {
  const roleSet = new Set(roles);
  return Object.values(enemyDefinitions).filter((enemy) => enemy.id !== "enemy_dummy" && roleSet.has(enemy.role));
}

function excludeRecentEnemies(candidates: EnemyDefinition[], recentEnemyIds: readonly string[]): EnemyDefinition[] {
  const recent = new Set(recentEnemyIds.slice(-2));
  const filtered = candidates.filter((enemy) => !recent.has(enemy.id));
  return filtered.length > 0 ? filtered : candidates;
}

function pickWeighted(
  weightedPool: { enemy: EnemyDefinition; weight: number }[],
  rng?: EnemySelectorRng,
): EnemyDefinition | undefined {
  const totalWeight = weightedPool.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  if (totalWeight <= 0) return weightedPool[0]?.enemy;
  let roll = (rng?.next() ?? Math.random()) * totalWeight;
  for (const entry of weightedPool) {
    roll -= Math.max(0, entry.weight);
    if (roll <= 0) return entry.enemy;
  }
  return weightedPool.at(-1)?.enemy;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
