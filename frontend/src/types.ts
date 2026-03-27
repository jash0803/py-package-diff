export interface FileChange {
  path: string;
  status: "added" | "removed" | "modified";
  is_binary: boolean;
  diff: string | null;
  stats: {
    added_lines: number;
    removed_lines: number;
  };
}

export interface DiffResult {
  package: string;
  v1: string;
  v2: string;
  artifact_v1: string;
  artifact_v2: string;
  summary: {
    added: number;
    removed: number;
    modified: number;
    total: number;
  };
  files: FileChange[];
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "add" | "remove" | "context" | "no-newline";
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}
