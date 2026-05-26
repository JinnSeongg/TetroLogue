export type ModifierContext = {
  linesCleared: number;
  backToBackActive: boolean;
  attack: number;
  isDanger?: boolean;
  fieldHeight?: number;
  holdUsedThisBattle?: boolean;
  pendingGarbageLines?: number;
  isFast?: boolean;
  fastChain?: number;
  holeCount?: number;
  deepHoleCount?: number;
  isTSpin?: boolean;
  isTSpinMini?: boolean;
  isTSpinFull?: boolean;
  combo?: number;
  comboBonus?: number;
  attackKind?: string;
};

type ModifierConditionValue = boolean | number | string;

export type ModifierCondition<T extends ModifierConditionValue = ModifierConditionValue> =
  | T
  | {
      equals?: T;
      notEquals?: T;
      gt?: number;
      gte?: number;
      lt?: number;
      lte?: number;
    };

export type ModifierConditionSet = Partial<{
  [Key in keyof ModifierContext]: ModifierContext[Key] extends ModifierConditionValue | undefined
    ? ModifierCondition<Extract<ModifierContext[Key], ModifierConditionValue>>
    : never;
}>;

export type AttackModifier = {
  trigger: "onAttackCalculated";
  addAttack?: number;
  attackMultiplier?: number;
  when: ModifierConditionSet;
};

export type PassiveModifier = {
  trigger: "passive";
  maxHoldSlots?: number;
  maxHoldSlotsAdd?: number;
  gravityMsMultiplier?: number;
  lockDelayMsAdd?: number;
  nextPreviewCountAdd?: number;
  holdEnabledOverride?: boolean;
};

export type Modifier = AttackModifier | PassiveModifier;

export const modifierApplies = (modifier: AttackModifier, context: ModifierContext): boolean => {
  return Object.entries(modifier.when).every(([key, condition]) => {
    if (condition === undefined) return true;
    const value = context[key as keyof ModifierContext];
    return conditionMatches(value, condition);
  });
};

function conditionMatches(value: unknown, condition: unknown): boolean {
  if (typeof condition === "boolean" || typeof condition === "number") {
    return value === condition;
  }

  if (!condition || typeof condition !== "object" || Array.isArray(condition)) return false;
  if (typeof value !== "boolean" && typeof value !== "number") return false;

  const operators = condition as {
    equals?: unknown;
    notEquals?: unknown;
    gt?: unknown;
    gte?: unknown;
    lt?: unknown;
    lte?: unknown;
  };

  if (operators.equals !== undefined && value !== operators.equals) return false;
  if (operators.notEquals !== undefined && value === operators.notEquals) return false;

  const numericComparisons: Array<[unknown, (left: number, right: number) => boolean]> = [
    [operators.gt, (left, right) => left > right],
    [operators.gte, (left, right) => left >= right],
    [operators.lt, (left, right) => left < right],
    [operators.lte, (left, right) => left <= right],
  ];

  for (const [expected, compare] of numericComparisons) {
    if (expected === undefined) continue;
    if (typeof value !== "number" || typeof expected !== "number" || !Number.isFinite(value) || !Number.isFinite(expected)) return false;
    if (!compare(value, expected)) return false;
  }

  return true;
}
