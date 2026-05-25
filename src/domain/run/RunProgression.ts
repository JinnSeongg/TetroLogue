import type { RandomProvider } from "../shared/RandomProvider";
import type { FloorNode, NodeStatus, RunProgressState } from "./RunProgressState";

const battleEnemyPool = ["enemy_stackling", "enemy_line_guard", "enemy_combo_wisp", "enemy_tower_shell", "enemy_b2b_shade"];

export type GenerateRunNodesOptions = {
  maxFloor?: number;
  eventChance?: number;
  random?: Pick<RandomProvider, "next">;
};

export function generateRunNodes({ maxFloor = 30, eventChance = 0.2, random }: GenerateRunNodesOptions = {}): FloorNode[] {
  return Array.from({ length: maxFloor }, (_, index) => {
    const floor = index + 1;
    if (floor === maxFloor) return { floor, type: "finalBoss", bossId: "enemy_boss_monolith", rewardTableId: "boss" };
    if (floor % 5 === 0) return { floor, type: "boss", bossId: "enemy_boss_monolith", rewardTableId: "boss" };
    if (floor % 5 === 4) return { floor, type: "shop", shopPoolId: "default_shop" };
    const roll = random?.next() ?? Math.random();
    return {
      floor,
      type: roll < eventChance ? "event" : "battle",
      enemyPoolId: battleEnemyPool[index % battleEnemyPool.length],
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
