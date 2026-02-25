import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function uniqNums(arr) {
  return Array.from(new Set(arr.filter((x) => x !== null && x !== undefined).map(Number)))
    .sort((a, b) => a - b);
}

function formatMoney(x) {
  const n = Number(x || 0);
  return `$${n.toLocaleString()}`;
}

function buildHistogram(rows, binSize = 10000) {
  const salaries = rows.map((r) => Number(r.salary || 0)).filter((n) => Number.isFinite(n) && n > 0);
  if (salaries.length === 0) return [];

  const min = Math.min(...salaries);
  const max = Math.max(...salaries);

  const start = Math.floor(min / binSize) * binSize;
  const end = Math.ceil(max / binSize) * binSize;

  const bins = [];
  for (let b = start; b < end; b += binSize) {
    bins.push({ binStart: b, binEnd: b + binSize, label: `${Math.round(b / 1000)}k-${Math.round((b + binSize) / 1000)}k`, count: 0 });
  }

  for (const s of salaries) {
    const idx = Math.min(bins.length - 1, Math.floor((s - start) / binSize));
    bins[idx].count += 1;
  }

  return bins;
}

function avgSalaryByDept(rows) {
  const by = new Map();
  for (const r of rows) {
    const dept = r.department || "Unknown";
    const sal = Number(r.salary || 0);
    if (!Number.isFinite(sal) || sal <= 0) continue;
    if (!by.has(dept)) by.set(dept, { dept, sum: 0, n: 0 });
    const obj = by.get(dept);
    obj.sum += sal;
    obj.n += 1;
  }
  const out = Array.from(by.values()).map((d) => ({
    department: d.dept,
    avg_salary: d.n ? d.sum / d.n : 0,
    n: d.n,
  }));
  out.sort((a, b) => b.avg_salary - a.avg_salary);
  return out;
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [year, setYear] = useState("All");
  const [minSalary, setMinSalary] = useState(0);

  const [sortKey, setSortKey] = useState("salary");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoadError(null);
	const base = import.meta.env.BASE_URL || "/";
	const res = await fetch(`${base}data/faculty.json`);
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
  const years = useMemo(() => ["All", ...uniqNums(rows.map((r) => r.year)).map(String)], [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesDept = dept === "All" || (r.department || "") === dept;
      const matchesYear = year === "All" || String(r.year || "") === String(year);
      const matchesSalary = Number(r.salary || 0) >= Number(minSalary || 0);
      const hay = `${r.name || ""} ${r.department || ""} ${r.specialty || ""} ${r.title || ""}`.toLowerCase();
      const matchesQuery = !query || hay.includes(query);
      return matchesDept && matchesYear && matchesSalary && matchesQuery;
    });
  }, [rows, q, dept, year, minSalary]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = a?.[sortKey];
      const vb = b?.[sortKey];
      if (sortKey === "salary" || sortKey === "year") return dir * (Number(va || 0) - Number(vb || 0));
      return dir * String(va || "").localeCompare(String(vb || ""));
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sorted.length / pageSize)), [sorted.length, pageSize]);
  const pageSafe = useMemo(() => Math.min(Math.max(1, page), totalPages), [page, totalPages]);
  const paged = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, pageSafe, pageSize]);

  const hist = useMemo(() => buildHistogram(filtered, 10000), [filtered]);
  const deptAvg = useMemo(() => avgSalaryByDept(filtered).slice(0, 12), [filtered]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "salary" || key === "year" ? "desc" : "asc");
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 6 }}>WWU Salary + Specialty Explorer</h1>
      <div style={{ color: "#555", marginBottom: 18 }}>
        Data loaded from <code>public/data/faculty.json</code>.
      </div>

      {loadError && (
        <div style={{ padding: 12, border: "1px solid #f3c2c2", background: "#fff6f6", marginBottom: 16 }}>
          <b>Failed to load data:</b> {loadError}
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
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} style={{ padding: 10, width: 140 }}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>Department</label>
          <select value={dept} onChange={(e) => setDept(e.target.value)} style={{ padding: 10, width: 260 }}>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
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

<div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
  <label style={{ color: "#555" }}>Rows/page</label>
  <select
    value={pageSize}
    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
    style={{ padding: 8 }}
  >
    <option value={50}>50</option>
    <option value={100}>100</option>
    <option value={200}>200</option>
    <option value={500}>500</option>
  </select>

  <button onClick={() => setPage(1)} disabled={pageSafe === 1}>{"<<"}</button>
  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe === 
1}>{"<"}</button>
  <div style={{ color: "#555" }}>
    Page <b>{pageSafe}</b> / <b>{totalPages}</b>
  </div>
  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
disabled={pageSafe === totalPages}>{">"}</button>
  <button onClick={() => setPage(totalPages)} disabled={pageSafe === 
totalPages}>{">>"}</button>
</div>


      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Salary histogram</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(v) => [v, "Count"]} />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Average salary by department (top 12)</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptAvg} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <YAxis type="category" dataKey="department" width={160} />
                <Tooltip formatter={(v, k, p) => [formatMoney(v), "Avg salary"]} />
                <Bar dataKey="avg_salary" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("name")}>Name</th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("department")}>Department</th>
            <th>Specialty</th>
            <th>Title</th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("year")}>Year</th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("salary")}>Salary</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((r, i) => (
            <tr key={`${r.name}-${r.year}-${i}`} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td>
                {r.profile_url ? (
                  <a href={r.profile_url} target="_blank" rel="noreferrer">{r.name}</a>
                ) : (
                  r.name
                )}
              </td>
              <td>{r.department}</td>
              <td>{r.specialty}</td>
              <td>{r.title}</td>
              <td>{r.year}</td>
              <td>{formatMoney(r.salary)}</td>
            </tr>
          ))}
          {paged.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 16, color: "#777" }}>No results.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
