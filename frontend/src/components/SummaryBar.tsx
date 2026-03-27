import { DiffResult } from "../types";

interface Props {
  result: DiffResult;
}

export default function SummaryBar({ result }: Props) {
  const { summary, artifact_v1, artifact_v2, v1, v2, package: pkg } = result;

  const sameArtifact = artifact_v1 === artifact_v2;
  const artifactLabel = sameArtifact
    ? artifact_v1
    : `${artifact_v1} → ${artifact_v2}`;

  return (
    <div className="summary-bar">
      <div className="summary-badge">
        <span className="dot dot-total" />
        <span className="summary-num">{summary.total}</span>
        <span className="summary-label">files changed</span>
      </div>

      {summary.added > 0 && (
        <div className="summary-badge">
          <span className="dot dot-added" />
          <span className="summary-num">{summary.added}</span>
          <span className="summary-label">added</span>
        </div>
      )}
      {summary.removed > 0 && (
        <div className="summary-badge">
          <span className="dot dot-removed" />
          <span className="summary-num">{summary.removed}</span>
          <span className="summary-label">removed</span>
        </div>
      )}
      {summary.modified > 0 && (
        <div className="summary-badge">
          <span className="dot dot-modified" />
          <span className="summary-num">{summary.modified}</span>
          <span className="summary-label">modified</span>
        </div>
      )}

      <div className="summary-artifact">
        <span style={{ color: "var(--text-faint)" }}>
          {pkg} {v1} → {v2}
        </span>
        <span className="artifact-badge">{artifactLabel}</span>
      </div>
    </div>
  );
}
