import { modifierApplies, type ModifierContext } from "./Modifier";
import type { RelicDefinition } from "./RelicDefinition";
import { normalizeMaxHoldSlots } from "../tetris/HoldSlot";
import { DEFAULT_SPEED_BONUS_CAP, DEFAULT_SPEED_BONUS_PER_STACK, type TetrisRuleSet } from "../tetris/TetrisRuleSet";
import type { AttackBreakdown, AttackResult } from "../combat/AttackTypes";
import { calculateAttackBreakdown } from "../combat/attack/AttackResultFactory";

export type AppliedAttackModifier = {
  relicId: string;
  beforeAttack: number;
  afterAttack: number;
  addAttack?: number;
  attackMultiplier?: number;
};

export type AttackModifierApplicationResult = {
  attack: number;
  preRelicAttack: number;
  relicAttackBonus: number;
  appliedRelicIds: string[];
  appliedModifiers: AppliedAttackModifier[];
  attackResult?: AttackResult;
};

export type RuleSetModifierApplicationResult = {
  ruleSet: TetrisRuleSet;
  baseRuleSet: TetrisRuleSet;
  appliedRuleRelicIds: string[];
};

export class EffectResolver {
  applyAttackModifiers(baseAttack: number, relics: RelicDefinition[], context: Omit<ModifierContext, "attack">): number;
  applyAttackModifiers(baseAttack: AttackResult, relics: RelicDefinition[], context: Omit<ModifierContext, "attack">): AttackResult;
  applyAttackModifiers(
    baseAttack: number,
    relics: RelicDefinition[],
    context: Omit<ModifierContext, "attack">,
    options: { includeDetails: true },
  ): AttackModifierApplicationResult;
  applyAttackModifiers(
    baseAttack: AttackResult,
    relics: RelicDefinition[],
    context: Omit<ModifierContext, "attack">,
    options: { includeDetails: true },
  ): AttackModifierApplicationResult;
  applyAttackModifiers(
    baseAttack: number | AttackResult,
    relics: RelicDefinition[],
    context: Omit<ModifierContext, "attack">,
    options?: { includeDetails: true },
  ): number | AttackResult | AttackModifierApplicationResult {
    if (typeof baseAttack !== "number") {
      return this.applyAttackResultModifiers(baseAttack, relics, context, options);
    }

    const preRelicAttack = sanitizeAttack(baseAttack);
    const appliedModifiers: AppliedAttackModifier[] = [];
    const attack = relics.reduce((currentAttack, relic) => {
      return relic.modifiers.reduce((current, modifier) => {
        if (modifier.trigger !== "onAttackCalculated") return current;
        if (!modifierApplies(modifier, { ...context, attack: current })) return current;
        const beforeAttack = current;
        const afterAttack = sanitizeAttack(current * sanitizeMultiplier(modifier.attackMultiplier) + sanitizeFlatBonus(modifier.addAttack));
        if (afterAttack === beforeAttack) return current;
        appliedModifiers.push({
          relicId: String(relic.id),
          beforeAttack,
          afterAttack,
          addAttack: modifier.addAttack,
          attackMultiplier: modifier.attackMultiplier,
        });
        return afterAttack;
      }, currentAttack);
    }, preRelicAttack);

    if (!options?.includeDetails) return attack;

    return {
      attack,
      preRelicAttack,
      relicAttackBonus: attack - preRelicAttack,
      appliedRelicIds: [...new Set(appliedModifiers.map((modifier) => modifier.relicId))],
      appliedModifiers,
    };
  }

  private applyAttackResultModifiers(
    attackResult: AttackResult,
    relics: RelicDefinition[],
    context: Omit<ModifierContext, "attack">,
    options?: { includeDetails: true },
  ): AttackResult | AttackModifierApplicationResult {
    const preRelicAttack = sanitizeAttack(attackResult.finalDamage);
    const appliedModifiers: AppliedAttackModifier[] = [];
    let breakdown: AttackBreakdown = { ...attackResult.breakdown };

    for (const relic of relics) {
      for (const modifier of relic.modifiers) {
        if (modifier.trigger !== "onAttackCalculated") continue;
        if (!modifierApplies(modifier, { ...context, attack: breakdown.finalDamage })) continue;
        const beforeAttack = breakdown.finalDamage;
        breakdown = calculateAttackBreakdown({
          ...breakdown,
          typeBonus:
            breakdown.typeBonus +
            sanitizeBonus(modifier.typeBonusAdd) +
            multiplierToBonus(modifier.attackMultiplier),
          stateBonus: breakdown.stateBonus + sanitizeBonus(modifier.stateBonusAdd),
          speedBonus: breakdown.speedBonus + sanitizeBonus(modifier.speedBonusAdd),
          comboDamage: breakdown.comboDamage + sanitizeFlatBonus(modifier.comboDamageAdd),
          comboDamageMultiplier: breakdown.comboDamageMultiplier + sanitizeBonus(modifier.comboDamageMultiplierAdd),
          b2bDamage: breakdown.b2bDamage + sanitizeFlatBonus(modifier.b2bDamageAdd),
          b2bDamageMultiplier: breakdown.b2bDamageMultiplier + sanitizeBonus(modifier.b2bDamageMultiplierAdd),
          perfectClearDamage: breakdown.perfectClearDamage + sanitizeFlatBonus(modifier.perfectClearDamageAdd),
          perfectClearDamageMultiplier:
            breakdown.perfectClearDamageMultiplier + sanitizeBonus(modifier.perfectClearDamageMultiplierAdd),
          flatBonus: breakdown.flatBonus + sanitizeFlatBonus(modifier.flatBonusAdd) + sanitizeFlatBonus(modifier.addAttack),
          counterBonus: breakdown.counterBonus + sanitizeFlatBonus(modifier.counterBonusAdd),
        });
        if (breakdown.finalDamage === beforeAttack) continue;
        appliedModifiers.push({
          relicId: String(relic.id),
          beforeAttack,
          afterAttack: breakdown.finalDamage,
          addAttack: modifier.addAttack ?? modifier.flatBonusAdd,
          attackMultiplier: modifier.attackMultiplier,
        });
      }
    }

    const nextAttackResult: AttackResult = {
      ...attackResult,
      baseDamage: breakdown.baseScaledDamage,
      comboBonus: breakdown.comboScaledDamage,
      b2bBonus: breakdown.b2bScaledDamage,
      perfectClearBonus: breakdown.perfectClearScaledDamage,
      totalDamage: breakdown.finalDamage,
      breakdown,
      ...breakdown,
      preRelicTotalDamage: preRelicAttack,
      relicAttackBonus: breakdown.finalDamage - preRelicAttack,
      appliedRelicIds: [...new Set(appliedModifiers.map((modifier) => modifier.relicId))],
    };

    if (!options?.includeDetails) return nextAttackResult;

    return {
      attack: nextAttackResult.finalDamage,
      preRelicAttack,
      relicAttackBonus: nextAttackResult.relicAttackBonus ?? 0,
      appliedRelicIds: nextAttackResult.appliedRelicIds ?? [],
      appliedModifiers,
      attackResult: nextAttackResult,
    };
  }

  resolveMaxHoldSlots(baseMaxHoldSlots: number, relics: RelicDefinition[]): number {
    return relics.reduce((maxHoldSlots, relic) => {
      return relic.modifiers.reduce((current, modifier) => {
        if (modifier.trigger !== "passive" || modifier.maxHoldSlots === undefined) return current;
        return normalizeMaxHoldSlots(Math.max(current, modifier.maxHoldSlots));
      }, maxHoldSlots);
    }, normalizeMaxHoldSlots(baseMaxHoldSlots));
  }

  resolveEffectiveRuleSet(baseRuleSet: TetrisRuleSet, relics: RelicDefinition[]): TetrisRuleSet;
  resolveEffectiveRuleSet(
    baseRuleSet: TetrisRuleSet,
    relics: RelicDefinition[],
    options: { includeDetails: true },
  ): RuleSetModifierApplicationResult;
  resolveEffectiveRuleSet(
    baseRuleSet: TetrisRuleSet,
    relics: RelicDefinition[],
    options?: { includeDetails: true },
  ): TetrisRuleSet | RuleSetModifierApplicationResult {
    const appliedRuleRelicIds: string[] = [];
    const ruleSet = relics.reduce<TetrisRuleSet>((currentRuleSet, relic) => {
      return relic.modifiers.reduce<TetrisRuleSet>((current, modifier) => {
        if (modifier.trigger !== "passive") return current;
        const next = sanitizeRuleSet({
          ...current,
          gravityMs:
            modifier.gravityMsMultiplier === undefined
              ? current.gravityMs
              : current.gravityMs * sanitizeRuleSetMultiplier(modifier.gravityMsMultiplier),
          lockDelayMs: current.lockDelayMs + sanitizeRuleSetAdd(modifier.lockDelayMsAdd),
          nextPreviewCount: current.nextPreviewCount + sanitizeRuleSetAdd(modifier.nextPreviewCountAdd),
          holdEnabled: modifier.holdEnabledOverride ?? current.holdEnabled,
          maxHoldSlots: resolveNextMaxHoldSlots(current.maxHoldSlots, modifier.maxHoldSlots, modifier.maxHoldSlotsAdd),
          speedBonusPerStack: current.speedBonusPerStack + sanitizeRuleSetAdd(modifier.speedBonusPerStackAdd),
          speedBonusCap: current.speedBonusCap + sanitizeRuleSetAdd(modifier.speedBonusCapAdd),
        });
        if (ruleSetChanged(current, next)) {
          appliedRuleRelicIds.push(String(relic.id));
        }
        return next;
      }, currentRuleSet);
    }, sanitizeRuleSet({ ...baseRuleSet }));

    if (!options?.includeDetails) return ruleSet;

    return {
      ruleSet,
      baseRuleSet: { ...baseRuleSet },
      appliedRuleRelicIds: [...new Set(appliedRuleRelicIds)],
    };
  }
}

function sanitizeAttack(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function sanitizeFlatBonus(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return value;
}

function sanitizeBonus(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return value;
}

function multiplierToBonus(value: number | undefined): number {
  if (value === undefined) return 0;
  if (!Number.isFinite(value) || value < 0) return 0;
  return value - 1;
}

function sanitizeMultiplier(value: number | undefined): number {
  if (value === undefined) return 1;
  if (!Number.isFinite(value) || value < 0) return 1;
  return value;
}

function sanitizeRuleSet(ruleSet: TetrisRuleSet): TetrisRuleSet {
  return {
    ...ruleSet,
    gravityMs: clampInteger(ruleSet.gravityMs, 50),
    lockDelayMs: clampInteger(ruleSet.lockDelayMs, 0),
    nextPreviewCount: clampInteger(ruleSet.nextPreviewCount, 1),
    maxHoldSlots: normalizeMaxHoldSlots(ruleSet.maxHoldSlots),
    speedBonusPerStack: clampNumber(ruleSet.speedBonusPerStack, DEFAULT_SPEED_BONUS_PER_STACK, 0),
    speedBonusCap: clampInteger(ruleSet.speedBonusCap, 0),
  };
}

function sanitizeRuleSetMultiplier(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 1;
  return value;
}

function sanitizeRuleSetAdd(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return value;
}

function resolveNextMaxHoldSlots(current: number, absoluteValue: number | undefined, addValue: number | undefined): number {
  const absolute = absoluteValue === undefined || !Number.isFinite(absoluteValue) ? current : Math.max(current, absoluteValue);
  return normalizeMaxHoldSlots(absolute + sanitizeRuleSetAdd(addValue));
}

function clampInteger(value: number, min: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.round(value));
}

function clampNumber(value: number, fallback: number, min: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, value);
}

function ruleSetChanged(before: TetrisRuleSet, after: TetrisRuleSet): boolean {
  return (
    before.gravityMs !== after.gravityMs ||
    before.lockDelayMs !== after.lockDelayMs ||
    before.nextPreviewCount !== after.nextPreviewCount ||
    before.holdEnabled !== after.holdEnabled ||
    before.maxHoldSlots !== after.maxHoldSlots ||
    before.speedBonusPerStack !== after.speedBonusPerStack ||
    before.speedBonusCap !== after.speedBonusCap
  );
}
