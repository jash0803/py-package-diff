import { FileChange } from "../types";

interface Props {
  files: FileChange[];
  selected: string | null;
  onSelect: (path: string) => void;
}

const STATUS_ORDER = ["added", "removed", "modified"] as const;

function FileItem({
  file,
  selected,
  onSelect,
}: {
  file: FileChange;
  selected: boolean;
  onSelect: () => void;
}) {
  const { path, status, is_binary, stats } = file;
  const name = path.split("/").pop() ?? path;
  const dir = path.includes("/") ? path.split("/").slice(0, -1).join("/") + "/" : "";

  return (
    <div
      className={`sidebar-item ${selected ? "active" : ""}`}
      onClick={onSelect}
      title={path}
    >
      <span className={`status-dot ${status}`} />
      <span className="file-name">
        <span style={{ color: "var(--text-faint)", fontSize: "11px" }}>{dir}</span>
        {name}
      </span>
      {!is_binary && (stats.added_lines > 0 || stats.removed_lines > 0) && (
        <span className="file-stats">
          {stats.added_lines > 0 && (
            <span className="stat-add">+{stats.added_lines}</span>
          )}
          {stats.removed_lines > 0 && (
            <span className="stat-del">−{stats.removed_lines}</span>
          )}
        </span>
      )}
      {is_binary && (
        <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>bin</span>
      )}
    </div>
  );
}

export default function FileSidebar({ files, selected, onSelect }: Props) {
  const grouped = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = files.filter((f) => f.status === status);
      return acc;
    },
    {} as Record<string, FileChange[]>
  );

  const LABELS: Record<string, string> = {
    added: "Added",
    removed: "Removed",
    modified: "Modified",
  };

  return (
    <div className="file-sidebar">
      <div className="sidebar-header">
        {files.length} file{files.length !== 1 ? "s" : ""} changed
      </div>
      <div className="sidebar-list">
        {STATUS_ORDER.map((status) => {
          const group = grouped[status];
          if (!group.length) return null;
          return (
            <div key={status}>
              <div className="sidebar-section-label">{LABELS[status]}</div>
              {group.map((file) => (
                <FileItem
                  key={file.path}
                  file={file}
                  selected={selected === file.path}
                  onSelect={() => onSelect(file.path)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
