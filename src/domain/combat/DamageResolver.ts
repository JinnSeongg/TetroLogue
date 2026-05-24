import { applyEnemyDefenseRules } from "../enemy/EnemyDefenseRule";
import type { EnemyDefinition } from "../enemy/EnemyDefinition";

export class DamageResolver {
  resolve(enemy: EnemyDefinition, attack: number, linesCleared: number): number {
    return applyEnemyDefenseRules(attack, enemy.defenseRules, { attack, linesCleared });
  }
}
