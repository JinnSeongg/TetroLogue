import type { CombatState } from "../domain/combat/CombatState";
import { FieldAnalyzer } from "../domain/combat/field-analysis/FieldAnalyzer";
import { EffectResolver } from "../domain/relic/EffectResolver";
import { standardRuleSet, type TetrisRuleSet } from "../domain/tetris/TetrisRuleSet";

export function resolveRuntimeRuleSet(combat: CombatState, runtimeOverride?: TetrisRuleSet): TetrisRuleSet {
  if (runtimeOverride) return runtimeOverride;
  const baseRuleSet = combat.baseRuleSet ?? combat.ruleSet ?? standardRuleSet;
  const fieldState = new FieldAnalyzer().analyze(combat.player.board);
  return new EffectResolver().resolveConditionalRuleSet(baseRuleSet, combat.player.relicInventory.getDefinitions(), {
    linesCleared: 0,
    backToBackActive: combat.player.backToBackActive,
    holeCount: fieldState.holeCount,
  });
}
