import { balanceConfig, type BalanceConfig } from "../../data/balanceConfig";

export function normalizeFloorProgress(floor: number, config: BalanceConfig = balanceConfig): number {
  const clampedFloor = clampFloor(floor, config);
  return (clampedFloor - 1) / Math.max(1, config.floorScaling.maxFloor - 1);
}

export function calculateBaseDemand(floor: number, config: BalanceConfig = balanceConfig): number {
  const t = normalizeFloorProgress(floor, config);
  return config.floorScaling.baseDemandStart + config.floorScaling.baseDemandGrowth * t ** config.floorScaling.baseDemandExponent;
}

export function calculateRelicPowerAvg(floor: number, config: BalanceConfig = balanceConfig): number {
  const t = normalizeFloorProgress(floor, config);
  return config.floorScaling.relicAvgStart + config.floorScaling.relicAvgGrowth * t ** config.floorScaling.relicAvgExponent;
}

export function calculateFloorGravityMultiplier(floor: number, config: BalanceConfig = balanceConfig): number {
  const t = normalizeFloorProgress(floor, config);
  return config.floorScaling.gravityStart + config.floorScaling.gravityGrowth * t ** config.floorScaling.gravityExponent;
}

export function calculateEnemyGpm(floor: number, config: BalanceConfig = balanceConfig): number {
  const t = normalizeFloorProgress(floor, config);
  return config.floorScaling.gpmStart + config.floorScaling.gpmGrowth * t ** config.floorScaling.gpmExponent;
}

export function calculateTargetTimeSeconds(floor: number, config: BalanceConfig = balanceConfig): number {
  const t = normalizeFloorProgress(floor, config);
  return config.floorScaling.targetTimeStart + config.floorScaling.targetTimeGrowth * t;
}

function clampFloor(floor: number, config: BalanceConfig): number {
  if (!Number.isFinite(floor)) return 1;
  return Math.min(config.floorScaling.maxFloor, Math.max(1, Math.round(floor)));
}
