import type { RandomProvider } from "../domain/shared/RandomProvider";

export class SeededRandomProvider implements RandomProvider {
  constructor(private seed = 123456789) {}

  next(): number {
    this.seed = (1664525 * this.seed + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  nextInt(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = this.nextInt(i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
}
