import type { EnemyDefinition } from "./EnemyDefinition";
import type { EnemyIntent } from "./EnemyIntent";

export class EnemyPatternSystem {
  nextIntent(enemy: EnemyDefinition, playerActionCount: number): EnemyIntent | undefined {
    const interval = enemy.pattern.intentEveryActions;
    if (!interval || interval <= 0) return undefined;
    if (playerActionCount % interval !== 0) return undefined;

    return {
      id: `${enemy.id}_intent_${playerActionCount}`,
      description: enemy.pattern.intentDescription ?? "Enemy prepares pressure.",
      dueActionCount: playerActionCount + (enemy.pattern.intentDelayActions ?? 2),
      garbageLines: enemy.pattern.garbageLines ?? 0,
    };
  }
}
