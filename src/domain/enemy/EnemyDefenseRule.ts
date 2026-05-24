export type DamageContext = {
  linesCleared: number;
  attack: number;
};

export type EnemyDefenseRule =
  | {
      type: "reduceDamage";
      amount: number;
      when: Partial<Pick<DamageContext, "linesCleared">>;
    }
  | {
      type: "immune";
      when: Partial<Pick<DamageContext, "linesCleared">>;
    };

export const applyEnemyDefenseRules = (attack: number, rules: EnemyDefenseRule[], context: DamageContext): number => {
  return rules.reduce((damage, rule) => {
    if (rule.when.linesCleared !== undefined && rule.when.linesCleared !== context.linesCleared) return damage;
    if (rule.type === "immune") return 0;
    return Math.max(0, damage - rule.amount);
  }, attack);
};
