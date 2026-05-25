import type { NodeMap } from "./NodeMap";
import type { FloorNode } from "./RunProgressState";
import { generateRunNodes } from "./RunProgression";

export class RunGenerator {
  generate(): NodeMap {
    return createNodeMapFromFloorNodes(generateRunNodes());
  }
}

export function createNodeMapFromFloorNodes(nodes: FloorNode[]): NodeMap {
  return {
    nodes: nodes.map((node, index) => {
      const next = nodes[index + 1];
      const id = floorNodeId(node.floor);
      return {
        id,
        floor: node.floor,
        type: toStageNodeType(node.type),
        label: floorNodeLabel(node),
        enemyId: node.enemyPoolId ?? node.bossId,
        bossId: node.bossId,
        nextNodeIds: next ? [floorNodeId(next.floor)] : [],
        completed: false,
      };
    }),
  };
}

export function floorNodeId(floor: number): string {
  return `floor_${floor}`;
}

function toStageNodeType(type: FloorNode["type"]) {
  if (type === "battle") return "combat";
  if (type === "finalBoss") return "boss";
  return type;
}

function floorNodeLabel(node: FloorNode): string {
  if (node.type === "finalBoss") return "Final Boss";
  return `${node.type[0].toUpperCase()}${node.type.slice(1)} ${node.floor}`;
}

export class LegacyRunGenerator {
  generate(): NodeMap {
    return {
      nodes: [
        { id: "node_start", type: "start", label: "Start", nextNodeIds: ["node_1a", "node_1b"], completed: true },
        { id: "node_1a", type: "combat", label: "Stackling", enemyId: "enemy_stackling", nextNodeIds: ["node_2a", "node_2b"], completed: false },
        { id: "node_1b", type: "combat", label: "Dummy", enemyId: "enemy_dummy", nextNodeIds: ["node_2b"], completed: false },
        { id: "node_2a", type: "combat", label: "Line Guard", enemyId: "enemy_line_guard", nextNodeIds: ["node_3a"], completed: false },
        { id: "node_2b", type: "combat", label: "Combo Wisp", enemyId: "enemy_combo_wisp", nextNodeIds: ["node_3a", "node_elite"], completed: false },
        { id: "node_3a", type: "combat", label: "Tower Shell", enemyId: "enemy_tower_shell", nextNodeIds: ["node_boss"], completed: false },
        { id: "node_elite", type: "elite", label: "Locksmith", enemyId: "enemy_locksmith", nextNodeIds: ["node_boss"], completed: false },
        { id: "node_boss", type: "boss", label: "Monolith Core", enemyId: "enemy_boss_monolith", nextNodeIds: [], completed: false },
      ],
    };
  }
}
