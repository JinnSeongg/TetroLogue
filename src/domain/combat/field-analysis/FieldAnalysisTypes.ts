export type FieldAnalysisTag =
  | "LowStack"
  | "MidStack"
  | "HighStack"
  | "CriticalStack"
  | "FewHoles"
  | "ManyHoles"
  | "CriticalHoles"
  | "HasWell"
  | "DeepWell"
  | "VeryDeepWell"
  | "CleanField"
  | "StableField"
  | "HasGarbage"
  | "GarbagePressure"
  | "HeavyGarbagePressure"
  | "CriticalGarbagePressure"
  | "Warning"
  | "Danger"
  | "Critical"
  | "HighRiskField";

export type DangerLevel = "Safe" | "Warning" | "Danger" | "Critical";

export type StackLevel = "Low" | "Mid" | "High" | "Critical";

export type GarbagePressureLevel = "None" | "Low" | "Medium" | "High" | "Critical";

export type FieldAnalysisResult = {
  boardWidth: number;
  boardHeight: number;
  columnHeights: number[];
  maxHeight: number;
  minHeight: number;
  averageHeight: number;
  bumpiness: number;
  holeCount: number;
  columnHoleCounts: number[];
  hasManyHoles: boolean;
  garbageCellCount: number;
  garbageRowCount: number;
  highestGarbageHeight: number;
  garbagePressure: number;
  garbagePressureLevel: GarbagePressureLevel;
  wellDepths: number[];
  deepestWellDepth: number;
  wellColumn: number | null;
  hasDeepWell: boolean;
  isCleanField: boolean;
  cleanFieldScore: number;
  stackLevel: StackLevel;
  dangerLevel: DangerLevel;
  dangerScore: number;
  dangerReasons: string[];
  tags: FieldAnalysisTag[];
};
