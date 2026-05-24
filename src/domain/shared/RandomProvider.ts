export interface RandomProvider {
  next(): number;
  nextInt(maxExclusive: number): number;
  shuffle<T>(items: T[]): T[];
}
