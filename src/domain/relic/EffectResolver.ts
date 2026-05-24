import { modifierApplies, type ModifierContext } from "./Modifier";
import type { RelicDefinition } from "./RelicDefinition";

export class EffectResolver {
  applyAttackModifiers(baseAttack: number, relics: RelicDefinition[], context: Omit<ModifierContext, "attack">): number {
    return relics.reduce((attack, relic) => {
      return relic.modifiers.reduce((current, modifier) => {
        if (!modifierApplies(modifier, { ...context, attack: current })) return current;
        return current + (modifier.addAttack ?? 0);
      }, attack);
    }, baseAttack);
  }
}
