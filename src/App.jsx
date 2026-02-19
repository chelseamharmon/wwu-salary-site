import { useEffect, useMemo, useState } from "react";

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [minSalary, setMinSalary] = useState(0);
  const [sortKey, setSortKey] = useState("salary");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoadError(null);
        const res = await fetch("/data/faculty.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setLoadError(String(e));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const departments = useMemo(() => ["All", ...uniq(rows.map((r) => r.department))], [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesDept = dept === "All" || (r.department || "") === dept;
      const matchesSalary = Number(r.salary || 0) >= Number(minSalary || 0);
      const hay = `${r.name || ""} ${r.department || ""} ${r.specialty || ""} ${r.title || ""}`.toLowerCase();
      const matchesQuery = !query || hay.includes(query);
      return matchesDept && matchesSalary && matchesQuery;
    });
  }, [rows, q, dept, minSalary]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = a?.[sortKey];
      const vb = b?.[sortKey];
      if (sortKey === "salary") return dir * (Number(va || 0) - Number(vb || 0));
      return dir * String(va || "").localeCompare(String(vb || ""));
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "salary" ? "desc" : "asc");
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 6 }}>WWU Salary + Specialty Explorer</h1>
      <div style={{ color: "#555", marginBottom: 18 }}>
        Data loaded from <code>public/data/faculty.json</code>.
      </div>

      {loadError && (
        <div style={{ padding: 12, border: "1px solid #f3c2c2", background: "#fff6f6", marginBottom: 16 }}>
          <b>Failed to load data:</b> {loadError}
          <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
            Check that <code>public/data/faculty.json</code> exists and is valid JSON.
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", marginBottom: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>Search</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name / dept / specialty / title"
            style={{ padding: 10, width: 340 }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>Department</label>
          <select value={dept} onChange={(e) => setDept(e.target.value)} style={{ padding: 10, width: 260 }}>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>Min salary</label>
          <input
            type="number"
            value={minSalary}
            onChange={(e) => setMinSalary(e.target.value)}
            style={{ padding: 10, width: 160 }}
          />
        </div>

        <div style={{ marginLeft: "auto", color: "#555" }}>
          Showing <b>{sorted.length}</b> of <b>{rows.length}</b>
        </div>
      </div>

      <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("name")}>
              Name
            </th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("department")}>
              Department
            </th>
            <th>Specialty</th>
            <th>Title</th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("salary")}>
              Salary
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={`${r.name}-${i}`} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td>
                {r.profile_url ? (
                  <a href={r.profile_url} target="_blank" rel="noreferrer">
                    {r.name}
                  </a>
                ) : (
                  r.name
                )}
              </td>
              <td>{r.department}</td>
              <td>{r.specialty}</td>
              <td>{r.title}</td>
              <td>${Number(r.salary || 0).toLocaleString()}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 16, color: "#777" }}>
                No results.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
