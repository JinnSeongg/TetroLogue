import type { RelicDefinition } from "../domain/relic/RelicDefinition";

export const relicDefinitions: Record<string, RelicDefinition> = {
  relic_tetris_power: {
    id: "relic_tetris_power",
    name: "Tetris Power",
    description: "Tetris attacks gain +2 damage.",
    modifiers: [{ trigger: "onAttackCalculated", addAttack: 2, when: { linesCleared: 4 } }],
  },
  relic_single_line_chip: {
    id: "relic_single_line_chip",
    name: "Single Line Chip",
    description: "Single-line clears gain +1 damage.",
    modifiers: [{ trigger: "onAttackCalculated", addAttack: 1, when: { linesCleared: 1 } }],
  },
  relic_b2b_focus: {
    id: "relic_b2b_focus",
    name: "Back-to-Back Focus",
    description: "Attacks gain +1 damage while back-to-back is active.",
    modifiers: [{ trigger: "onAttackCalculated", addAttack: 1, when: { backToBackActive: true } }],
  },
  relic_double_blade: {
    id: "relic_double_blade",
    name: "Double Blade",
    description: "Double clears gain +1 damage.",
    modifiers: [{ trigger: "onAttackCalculated", addAttack: 1, when: { linesCleared: 2 } }],
  },
  relic_triple_lance: {
    id: "relic_triple_lance",
    name: "Triple Lance",
    description: "Triple clears gain +2 damage.",
    modifiers: [{ trigger: "onAttackCalculated", addAttack: 2, when: { linesCleared: 3 } }],
  },
  relic_clean_four: {
    id: "relic_clean_four",
    name: "Clean Four",
    description: "Tetris attacks gain another +1 damage.",
    modifiers: [{ trigger: "onAttackCalculated", addAttack: 1, when: { linesCleared: 4 } }],
  },
  relic_chip_engine: {
    id: "relic_chip_engine",
    name: "Chip Engine",
    description: "Single-line clears gain another +1 damage.",
    modifiers: [{ trigger: "onAttackCalculated", addAttack: 1, when: { linesCleared: 1 } }],
  },
  relic_guard_breaker: {
    id: "relic_guard_breaker",
    name: "Guard Breaker",
    description: "Double clears gain +2 damage.",
    modifiers: [{ trigger: "onAttackCalculated", addAttack: 2, when: { linesCleared: 2 } }],
  },
  relic_b2b_reactor: {
    id: "relic_b2b_reactor",
    name: "B2B Reactor",
    description: "Back-to-back attacks gain +2 damage.",
    modifiers: [{ trigger: "onAttackCalculated", addAttack: 2, when: { backToBackActive: true } }],
  },
  relic_column_prism: {
    id: "relic_column_prism",
    name: "Column Prism",
    description: "Triple clears gain +1 damage.",
    modifiers: [{ trigger: "onAttackCalculated", addAttack: 1, when: { linesCleared: 3 } }],
  },
  relic_quadra_core: {
    id: "relic_quadra_core",
    name: "Quadra Core",
    description: "Tetris attacks gain +3 damage.",
    modifiers: [{ trigger: "onAttackCalculated", addAttack: 3, when: { linesCleared: 4 } }],
  },
  relic_line_spark: {
    id: "relic_line_spark",
    name: "Line Spark",
    description: "Any single-line clear becomes a little more useful.",
    modifiers: [{ trigger: "onAttackCalculated", addAttack: 1, when: { linesCleared: 1 } }],
  },
};
