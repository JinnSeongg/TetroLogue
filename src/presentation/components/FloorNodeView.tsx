import type { FloorNode, NodeStatus } from "../../domain/run/RunProgressState";

type Props = {
  node: FloorNode;
  status: NodeStatus;
  onEnter: (floor: number) => void;
};

const nodeIcons: Record<FloorNode["type"], string> = {
  battle: "B",
  event: "?",
  shop: "$",
  boss: "!",
  finalBoss: "!!",
};

export function FloorNodeView({ node, status, onEnter }: Props) {
  const clickable = status === "current";
  return (
    <button
      className={`floor-node floor-node-${node.type} ${status}`}
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onEnter(node.floor)}
      aria-label={`Floor ${node.floor} ${node.type}`}
    >
      <span className="floor-node-icon">{nodeIcons[node.type]}</span>
      <span>{node.floor}</span>
    </button>
  );
}
