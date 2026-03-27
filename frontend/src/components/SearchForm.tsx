import { useState, useEffect, useCallback } from "react";
import { fetchVersions } from "../api";

interface Props {
  initialPkg?: string;
  initialV1?: string;
  initialV2?: string;
  onCompare: (pkg: string, v1: string, v2: string) => void;
}

export default function SearchForm({
  initialPkg = "",
  initialV1 = "",
  initialV2 = "",
  onCompare,
}: Props) {
  const [pkg, setPkg] = useState(initialPkg);
  const [v1, setV1] = useState(initialV1);
  const [v2, setV2] = useState(initialV2);
  const [versions, setVersions] = useState<string[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  const loadVersions = useCallback(async (name: string) => {
    if (!name.trim()) return;
    setLoadingVersions(true);
    setVersionError(null);
    try {
      const vs = await fetchVersions(name.trim());
      setVersions(vs.slice().reverse()); // newest first
      if (vs.length >= 2) {
        setV1((prev) => prev || vs[vs.length - 2]);
        setV2((prev) => prev || vs[vs.length - 1]);
      }
    } catch (e) {
      setVersionError((e as Error).message);
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }, []);

  // Debounced version fetch as user types package name
  useEffect(() => {
    if (!pkg.trim()) { setVersions([]); return; }
    const t = setTimeout(() => loadVersions(pkg), 600);
    return () => clearTimeout(t);
  }, [pkg, loadVersions]);

  // Load versions on mount if pre-filled
  useEffect(() => {
    if (initialPkg) loadVersions(initialPkg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canCompare = pkg.trim() && v1 && v2 && v1 !== v2 && !loadingVersions;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (canCompare) onCompare(pkg.trim(), v1, v2);
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Package name</label>
        <input
          className="form-input"
          placeholder="e.g. requests, numpy, flask"
          value={pkg}
          autoFocus
          spellCheck={false}
          onChange={(e) => {
            setPkg(e.target.value);
            setV1("");
            setV2("");
            setVersions([]);
            setVersionError(null);
          }}
        />
        {versionError && (
          <span style={{ color: "var(--red)", fontSize: "12px" }}>{versionError}</span>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">From version</label>
          <select
            className="form-select"
            value={v1}
            onChange={(e) => setV1(e.target.value)}
            disabled={!versions.length || loadingVersions}
          >
            <option value="">
              {loadingVersions ? "Fetching versions…" : versions.length ? "Select version" : "Enter package first"}
            </option>
            {versions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">To version</label>
          <select
            className="form-select"
            value={v2}
            onChange={(e) => setV2(e.target.value)}
            disabled={!versions.length || loadingVersions}
          >
            <option value="">
              {loadingVersions ? "Fetching versions…" : versions.length ? "Select version" : "Enter package first"}
            </option>
            {versions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {v1 && v2 && v1 === v2 && (
        <span style={{ color: "var(--orange)", fontSize: "12px" }}>
          Please select two different versions.
        </span>
      )}

      <button className="btn btn-primary" type="submit" disabled={!canCompare}>
        {loadingVersions ? "Loading versions…" : "Compare versions"}
      </button>
    </form>
  );
}
