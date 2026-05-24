import type { NodeMap } from "./NodeMap";

export class RunGenerator {
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
