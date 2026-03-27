import { useState } from "react";
import { DiffResult } from "../types";
import SummaryBar from "./SummaryBar";
import FileSidebar from "./FileSidebar";
import DiffPanel from "./DiffPanel";

interface Props {
  result: DiffResult;
}

export default function DiffView({ result }: Props) {
  const [selected, setSelected] = useState<string | null>(
    result.files.length > 0 ? result.files[0].path : null
  );

  const selectedFile = result.files.find((f) => f.path === selected) ?? null;

  if (result.files.length === 0) {
    return (
      <div className="empty-result">
        <div className="empty-result-icon">✓</div>
        <div className="empty-result-title">No differences found</div>
        <div className="empty-result-sub">
          {result.package} {result.v1} and {result.v2} are identical.
        </div>
      </div>
    );
  }

  return (
    <>
      <SummaryBar result={result} />
      <div className="diff-layout">
        <FileSidebar
          files={result.files}
          selected={selected}
          onSelect={setSelected}
        />
        <DiffPanel file={selectedFile} />
      </div>
    </>
  );
}
