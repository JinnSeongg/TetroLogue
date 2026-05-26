import { useMemo, useState } from "react";
import { difficultyDefinitions } from "../../data/difficultyDefinitions";
import type { DifficultyId } from "../../domain/balance/balanceTypes";
import {
  balanceRowsToJson,
  balanceRowsToTsv,
  getBalancePreviewRows,
  logBalancePreview,
  type BalancePreviewRow,
} from "../../debug/balanceDebug";

const sampleFloors = new Set([1, 5, 10, 15, 20, 25, 30]);

export function BalancePreviewPanel() {
  const [difficultyId, setDifficultyId] = useState<DifficultyId>("standard");
  const [copyStatus, setCopyStatus] = useState("");
  const rows = useMemo(() => getBalancePreviewRows(difficultyId), [difficultyId]);
  const sampleRows = rows.filter((row) => sampleFloors.has(row.floor));

  const copy = async (format: "json" | "tsv") => {
    const text = format === "json" ? balanceRowsToJson(rows) : balanceRowsToTsv(rows);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`Copied ${format.toUpperCase()}`);
    } catch {
      console.warn("Balance preview copy failed. Data follows:", text);
      setCopyStatus("Copy failed; logged to console");
    }
  };

  return (
    <section className="balance-preview">
      <div className="balance-preview-header">
        <h3>Balance Preview</h3>
        <select value={difficultyId} onChange={(event) => setDifficultyId(event.target.value as DifficultyId)} aria-label="Balance difficulty">
          {Object.values(difficultyDefinitions).map((difficulty) => (
            <option key={difficulty.id} value={difficulty.id}>
              {difficulty.name}
            </option>
          ))}
        </select>
      </div>
      <div className="debug-buttons">
        <button onClick={() => logBalancePreview(difficultyId)}>Log Balance Table</button>
        <button onClick={() => copy("json")}>Copy JSON</button>
        <button onClick={() => copy("tsv")}>Copy TSV</button>
      </div>
      {copyStatus ? <p className="muted">{copyStatus}</p> : null}
      <BalanceSampleTable rows={sampleRows} />
    </section>
  );
}

function BalanceSampleTable({ rows }: { rows: BalancePreviewRow[] }) {
  return (
    <div className="balance-sample-wrap">
      <table className="balance-sample-table">
        <thead>
          <tr>
            <th>Floor</th>
            <th>Enemy</th>
            <th>Base</th>
            <th>Diff</th>
            <th>Role</th>
            <th>Raw</th>
            <th>Clamp</th>
            <th>Demand</th>
            <th>Gravity</th>
            <th>Garbage</th>
            <th>Pattern</th>
            <th>Restrict</th>
            <th>Traits</th>
            <th>HP</th>
            <th>HP Ratio</th>
            <th>Target</th>
            <th>Time B/A/S/SS</th>
            <th>GPM</th>
            <th>Relic</th>
            <th>S Avg Relic</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.floor}>
              <td>{row.floor}</td>
              <td>{row.selectedEnemyName}</td>
              <td>{row.baseDemand}</td>
              <td>{row.difficultyMultiplier}</td>
              <td>{row.roleMultiplier}</td>
              <td>{row.rawEnemyDemand}</td>
              <td>{row.enemyDemandClampMax}</td>
              <td>{row.enemyDemand}</td>
              <td>{row.gravityPressure}</td>
              <td>{row.garbagePressure}</td>
              <td>{row.patternPressure}</td>
              <td>{row.restrictionPressure}</td>
              <td>{row.traitDemandBreakdown}</td>
              <td>{row.maxHp}</td>
              <td>{row.hpToBaseHpRatio}</td>
              <td>{row.targetTime}</td>
              <td>
                {row.estimatedTimeB}/{row.estimatedTimeA}/{row.estimatedTimeS}/{row.estimatedTimeSS}
              </td>
              <td>{row.enemyGpm}</td>
              <td>x{row.relicAvgPower}</td>
              <td>{row.ratioSAvgRelic}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
