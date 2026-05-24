import type { Id } from "../shared/Id";

export type EnemyIntent = {
  id: Id;
  description: string;
  dueActionCount: number;
  garbageLines: number;
};
