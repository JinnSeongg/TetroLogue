import { floorNodeId } from "../../domain/run/RunGenerator";
import { getNodeStatus, getVisibleNodes } from "../../domain/run/RunProgression";
import type { RunProgressState } from "../../domain/run/RunProgressState";
import { FloorNodeView } from "./FloorNodeView";

type Props = {
  progress: RunProgressState;
  onEnterNode: (nodeId: string) => void;
};

export function LinearNodeChain({ progress, onEnterNode }: Props) {
  const visibleNodes = getVisibleNodes(progress);
  return (
    <div className="linear-chain-wrap">
      <div className="linear-chain" aria-label="Run floor chain">
        {visibleNodes.map((node, index) => (
          <div className="linear-chain-item" key={node.floor}>
            <FloorNodeView node={node} status={getNodeStatus(node, progress.currentFloor)} onEnter={() => onEnterNode(floorNodeId(node.floor))} />
            {index < visibleNodes.length - 1 ? <span className="chain-link" aria-hidden="true" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
