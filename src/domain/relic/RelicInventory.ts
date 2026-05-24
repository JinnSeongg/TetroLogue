import type { RelicDefinition } from "./RelicDefinition";
import type { RelicInstance } from "./RelicInstance";

export class RelicInventory {
  constructor(
    public readonly relics: RelicInstance[] = [],
    private readonly definitions: Record<string, RelicDefinition> = {},
  ) {}

  add(definitionId: string): RelicInventory {
    return new RelicInventory(
      [...this.relics, { instanceId: `${definitionId}_${this.relics.length + 1}`, definitionId }],
      this.definitions,
    );
  }

  getDefinitions(): RelicDefinition[] {
    return this.relics.map((relic) => this.definitions[relic.definitionId]).filter(Boolean);
  }
}
