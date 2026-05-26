import type { RandomProvider } from "../shared/RandomProvider";
import type { DifficultyId } from "../balance/balanceTypes";
import type { FloorNode, NodeStatus, RunProgressState } from "./RunProgressState";

const battleEnemyPool = ["enemy_stackling", "enemy_line_guard", "enemy_combo_wisp", "enemy_tower_shell", "enemy_b2b_shade"];
type SelectEnemyIdForFloor = (
  floor: number,
  difficultyId: DifficultyId,
  random?: Pick<RandomProvider, "next">,
  recentEnemyIds?: readonly string[],
) => string;

export type GenerateRunNodesOptions = {
  maxFloor?: number;
  eventChance?: number;
  random?: Pick<RandomProvider, "next">;
  difficultyId?: DifficultyId;
  selectEnemyIdForFloor?: SelectEnemyIdForFloor;
};

export function generateRunNodes({
  maxFloor = 30,
  eventChance = 0.2,
  random,
  difficultyId = "standard",
  selectEnemyIdForFloor = selectLegacyEnemyIdForFloor,
}: GenerateRunNodesOptions = {}): FloorNode[] {
  const recentEnemyIds: string[] = [];
  return Array.from({ length: maxFloor }, (_, index) => {
    const floor = index + 1;
    if (floor === maxFloor) {
      const bossId = selectEnemyIdForFloor(floor, difficultyId, random, recentEnemyIds);
      recentEnemyIds.push(bossId);
      return { floor, type: "finalBoss", bossId, rewardTableId: "boss" };
    }
    if (floor % 5 === 0) {
      const bossId = selectEnemyIdForFloor(floor, difficultyId, random, recentEnemyIds);
      recentEnemyIds.push(bossId);
      return { floor, type: "boss", bossId, rewardTableId: "boss" };
    }
    if (floor % 5 === 4) return { floor, type: "shop", shopPoolId: "default_shop" };
    const roll = random?.next() ?? Math.random();
    if (roll < eventChance) return { floor, type: "event", rewardTableId: "default_relic" };
    const enemyPoolId = selectEnemyIdForFloor(floor, difficultyId, random, recentEnemyIds);
    recentEnemyIds.push(enemyPoolId);
    return {
      floor,
      type: "battle",
      enemyPoolId,
      rewardTableId: "default_relic",
    };
  });
}

export function createRunProgressState(nodes = generateRunNodes()): RunProgressState {
  return {
    currentFloor: 1,
    maxFloor: nodes.length,
    nodes,
  };
}

export function getCurrentNode(progress: RunProgressState): FloorNode | undefined {
  return progress.nodes.find((node) => node.floor === progress.currentFloor);
}

export function getVisibleNodes(progress: RunProgressState): FloorNode[] {
  const startFloor = Math.max(1, progress.currentFloor - 1);
  const endFloor = Math.min(progress.maxFloor, progress.currentFloor + 3);
  return progress.nodes.filter((node) => node.floor >= startFloor && node.floor <= endFloor);
}

export function getNodeStatus(node: FloorNode, currentFloor: number): NodeStatus {
  if (node.floor < currentFloor) return "completed";
  if (node.floor === currentFloor) return "current";
  return "future";
}

function selectLegacyEnemyIdForFloor(floor: number): string {
  if (floor >= 30 || floor % 5 === 0) return "enemy_boss_monolith";
  return battleEnemyPool[(floor - 1) % battleEnemyPool.length];
}
