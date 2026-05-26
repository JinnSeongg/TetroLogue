import type { RelicDefinition } from "./RelicDefinition";
import type { RelicInstance } from "./RelicInstance";

export class RelicInventory {
  constructor(
    public readonly relics: RelicInstance[] = [],
    private readonly definitions: Record<string, RelicDefinition> = {},
  ) {}

  add(definitionId: string): RelicInventory {
    if (!this.canAdd(definitionId)) return this;
    return new RelicInventory(
      [...this.relics, { instanceId: `${definitionId}_${this.relics.length + 1}`, definitionId }],
      this.definitions,
    );
  }

  canAdd(definitionId: string): boolean {
    const definition = this.definitions[definitionId];
    if (!definition) return true;
    if (!Number.isFinite(definition.maxStacks) || definition.maxStacks <= 0) return false;
    return this.getStack(definitionId) < definition.maxStacks;
  }

  getStack(definitionId: string): number {
    return this.relics.filter((relic) => relic.definitionId === definitionId).length;
  }

  getDefinitions(): RelicDefinition[] {
    return this.relics.map((relic) => this.definitions[relic.definitionId]).filter(Boolean);
  }
}
