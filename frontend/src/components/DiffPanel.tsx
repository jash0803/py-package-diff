import { FileChange, DiffHunk, DiffLine } from "../types";

function parseDiff(raw: string): DiffHunk[] {
  const lines = raw.split("\n");
  const hunks: DiffHunk[] = [];
  let current: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    // Skip file header lines
    if (line.startsWith("--- ") || line.startsWith("+++ ")) continue;

    if (line.startsWith("@@")) {
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        oldLine = parseInt(m[1]);
        newLine = parseInt(m[2]);
        current = { header: line, oldStart: oldLine, newStart: newLine, lines: [] };
        hunks.push(current);
      }
      continue;
    }

    if (!current) continue;

    if (line.startsWith("+")) {
      current.lines.push({ type: "add", content: line.slice(1), newLineNum: newLine++ });
    } else if (line.startsWith("-")) {
      current.lines.push({ type: "remove", content: line.slice(1), oldLineNum: oldLine++ });
    } else if (line.startsWith("\\")) {
      current.lines.push({ type: "no-newline", content: line });
    } else {
      const content = line.length > 0 ? line.slice(1) : "";
      current.lines.push({ type: "context", content, oldLineNum: oldLine++, newLineNum: newLine++ });
    }
  }

  return hunks;
}

function HunkRow({ line }: { line: DiffLine }) {
  const rowClass =
    line.type === "add" ? "diff-row-add" :
    line.type === "remove" ? "diff-row-remove" : "diff-row-ctx";

  const signClass =
    line.type === "add" ? "line-sign-add" :
    line.type === "remove" ? "line-sign-remove" : "line-sign-ctx";

  const contentClass =
    line.type === "add" ? "line-content line-content-add" :
    line.type === "remove" ? "line-content line-content-remove" : "line-content";

  const sign = line.type === "add" ? "+" : line.type === "remove" ? "−" : " ";

  if (line.type === "no-newline") {
    return (
      <tr>
        <td className="line-num" />
        <td className="line-num" />
        <td className="line-sign line-sign-ctx" />
        <td className="line-content" style={{ color: "var(--text-faint)", fontStyle: "italic" }}>
          {line.content}
        </td>
      </tr>
    );
  }

  return (
    <tr className={rowClass}>
      <td className="line-num">
        {line.type !== "add" ? line.oldLineNum : ""}
      </td>
      <td className="line-num">
        {line.type !== "remove" ? line.newLineNum : ""}
      </td>
      <td className={`line-sign ${signClass}`}>{sign}</td>
      <td className={contentClass}>{line.content || " "}</td>
    </tr>
  );
}

function HunkView({ hunk }: { hunk: DiffHunk }) {
  // Extract context hint from @@ header (the part after the second @@)
  const contextMatch = hunk.header.match(/@@ .* @@\s*(.*)/);
  const context = contextMatch?.[1] || "";

  return (
    <>
      <tr className="diff-hunk-header">
        <td className="line-num" colSpan={2} />
        <td className="line-sign" />
        <td className="line-content" style={{ color: "var(--hunk-text)" }}>
          <span style={{ opacity: 0.6 }}>{hunk.header.match(/@@ .* @@/)?.[0]}</span>
          {context && <span style={{ marginLeft: "12px", color: "var(--text-muted)" }}>{context}</span>}
        </td>
      </tr>
      {hunk.lines.map((line, i) => (
        <HunkRow key={i} line={line} />
      ))}
    </>
  );
}

interface Props {
  file: FileChange | null;
}

export default function DiffPanel({ file }: Props) {
  if (!file) {
    return (
      <div className="diff-panel">
        <div className="diff-panel-empty">
          <div className="diff-panel-empty-icon">↩</div>
          <div className="diff-panel-empty-text">Select a file to view its diff</div>
        </div>
      </div>
    );
  }

  const hunks = file.diff ? parseDiff(file.diff) : [];

  return (
    <div className="diff-panel">
      <div className="diff-file-header">
        <span className={`status-pill ${file.status}`}>{file.status}</span>
        <span className="diff-file-path">{file.path}</span>
        {!file.is_binary && (file.stats.added_lines > 0 || file.stats.removed_lines > 0) && (
          <span className="file-stats" style={{ fontSize: "12px" }}>
            {file.stats.added_lines > 0 && (
              <span className="stat-add">+{file.stats.added_lines}</span>
            )}
            {file.stats.removed_lines > 0 && (
              <span className="stat-del" style={{ marginLeft: "6px" }}>
                −{file.stats.removed_lines}
              </span>
            )}
          </span>
        )}
      </div>

      {file.is_binary ? (
        <div className="binary-notice">
          <span>⚡</span>
          <span>Binary file — contents differ but diff not shown</span>
        </div>
      ) : hunks.length === 0 ? (
        <div className="no-changes">
          <span>No textual changes detected</span>
        </div>
      ) : (
        <table className="diff-table">
          <colgroup>
            <col style={{ width: "52px" }} />
            <col style={{ width: "52px" }} />
            <col style={{ width: "18px" }} />
            <col />
          </colgroup>
          <tbody>
            {hunks.map((hunk, i) => (
              <HunkView key={i} hunk={hunk} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
