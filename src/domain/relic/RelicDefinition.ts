import type { Id } from "../shared/Id";
import type { Modifier } from "./Modifier";

export type RelicDefinition = {
  id: Id;
  name: string;
  description: string;
  modifiers: Modifier[];
};
