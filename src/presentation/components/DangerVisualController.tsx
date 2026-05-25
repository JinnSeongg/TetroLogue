import { useEffect, useRef, type ReactNode } from "react";
import type { DangerLevel } from "../../domain/combat/field-analysis/FieldAnalysisTypes";

export type DangerVisualLevel = "Normal" | "Warning" | "Danger" | "Critical";

export type DangerVisualState = {
  level: DangerVisualLevel;
  incomingGarbageAmount: number;
  isIncomingGarbageHigh: boolean;
  boardClassName: string;
};

type Props = {
  dangerLevel?: DangerLevel | DangerVisualLevel;
  incomingGarbageAmount?: number;
  incomingGarbageWarningThreshold?: number;
  onDangerEnter?: (level: DangerVisualLevel) => void;
  onDangerExit?: () => void;
  onDangerChange?: (level: DangerVisualLevel, previousLevel: DangerVisualLevel) => void;
  children: (state: DangerVisualState) => ReactNode;
};

export function DangerVisualController({
  dangerLevel = "Normal",
  incomingGarbageAmount = 0,
  incomingGarbageWarningThreshold = 6,
  onDangerEnter,
  onDangerExit,
  onDangerChange,
  children,
}: Props) {
  const level = normalizeDangerLevel(dangerLevel);
  const previousLevel = useRef<DangerVisualLevel>(level);
  const isIncomingGarbageHigh = incomingGarbageAmount >= incomingGarbageWarningThreshold;
  const state: DangerVisualState = {
    level,
    incomingGarbageAmount,
    isIncomingGarbageHigh,
    boardClassName: [
      level !== "Normal" ? `danger-board-${level.toLowerCase()}` : "",
      isIncomingGarbageHigh ? "danger-board-garbage-pressure" : "",
    ]
      .filter(Boolean)
      .join(" "),
  };

  useEffect(() => {
    const previous = previousLevel.current;
    if (previous === level) return;
    onDangerChange?.(level, previous);
    if (previous === "Normal" && level !== "Normal") onDangerEnter?.(level);
    if (previous !== "Normal" && level === "Normal") onDangerExit?.();
    previousLevel.current = level;
  }, [level, onDangerChange, onDangerEnter, onDangerExit]);

  return (
    <>
      {children(state)}
      {level === "Critical" ? <div className="danger-screen-edge" aria-hidden="true" /> : null}
    </>
  );
}

export function normalizeDangerLevel(level: DangerLevel | DangerVisualLevel): DangerVisualLevel {
  if (level === "Safe") return "Normal";
  return level;
}
