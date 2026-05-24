import type { RandomProvider } from "../domain/shared/RandomProvider";

export class BrowserRandomProvider implements RandomProvider {
  next(): number {
    return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
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
