export type ModifierContext = {
  linesCleared: number;
  backToBackActive: boolean;
  attack: number;
};

export type Modifier = {
  trigger: "onAttackCalculated";
  addAttack?: number;
  when: Partial<Pick<ModifierContext, "linesCleared" | "backToBackActive">>;
};

export const modifierApplies = (modifier: Modifier, context: ModifierContext): boolean => {
  if (modifier.when.linesCleared !== undefined && modifier.when.linesCleared !== context.linesCleared) return false;
  if (modifier.when.backToBackActive !== undefined && modifier.when.backToBackActive !== context.backToBackActive) return false;
  return true;
};
