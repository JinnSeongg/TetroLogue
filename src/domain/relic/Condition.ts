export type Condition = {
  field: "linesCleared" | "backToBackActive";
  equals: number | boolean;
};
