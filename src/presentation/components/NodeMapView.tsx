import type { RunState } from "../../domain/run/RunState";

type Props = {
  run?: RunState;
  onMoveToNode: (nodeId: string) => void;
};

export function NodeMapView({ run, onMoveToNode }: Props) {
  if (!run) return null;
  const current = run.nodeMap.nodes.find((node) => node.id === run.currentNodeId);
  const available = new Set(current?.nextNodeIds ?? []);
  return (
    <section className="panel node-map-panel">
      <h2>Map</h2>
      <div className="stat-row">
        <span>Current</span>
        <strong>{current?.label}</strong>
      </div>
      <div className="node-map">
        {run.nodeMap.nodes.map((node) => (
          <button
            className={`map-node ${node.type} ${node.id === run.currentNodeId ? "current" : ""} ${available.has(node.id) ? "available" : ""}`}
            key={node.id}
            onClick={() => onMoveToNode(node.id)}
            disabled={!available.has(node.id)}
          >
            <span>{node.type}</span>
            <strong>{node.label}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
