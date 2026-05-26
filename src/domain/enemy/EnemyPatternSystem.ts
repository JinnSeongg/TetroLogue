import type { EnemyDefinition } from "./EnemyDefinition";
import type { EnemyIntent } from "./EnemyIntent";
import type { EnemyCalculatedStats } from "../balance/balanceTypes";

export class EnemyPatternSystem {
  nextIntent(enemy: EnemyDefinition, playerActionCount: number, calculatedStats?: EnemyCalculatedStats): EnemyIntent | undefined {
    const interval = calculatedStats?.intentEveryActions ?? enemy.pattern.intentEveryActions;
    if (!interval || interval <= 0) return undefined;
    if (playerActionCount % interval !== 0) return undefined;

    return {
      id: `${enemy.id}_intent_${playerActionCount}`,
      description: enemy.pattern.intentDescription ?? "Enemy prepares pressure.",
      dueActionCount: playerActionCount + (calculatedStats?.garbageDelayActions ?? enemy.pattern.intentDelayActions ?? 2),
      garbageLines: calculatedStats?.garbageLines ?? enemy.pattern.garbageLines ?? 0,
    };
  }
}
