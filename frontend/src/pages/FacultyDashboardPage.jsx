import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const STATUS_CONFIG = {
  COMPLETED:        { dot: '#16a34a', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  LOCKED:           { dot: '#16a34a', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  IN_PROGRESS:      { dot: '#d97706', bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  DRAFT:            { dot: '#d97706', bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  PENDING:          { dot: '#6b7280', bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' },
  UNLOCK_REQUESTED: { dot: '#2563eb', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 9px', borderRadius: '4px', border: `1px solid ${cfg.border}`,
      background: cfg.bg, color: cfg.color,
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
};

const StatCard = ({ label, value, sub, color }) => (
  <div className="dash-stat-card" style={{ '--accent-color': color }}>
    <div className="dash-stat-body">
      <div className="dash-stat-value">{value}</div>
      <div className="dash-stat-label">{label}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  </div>
);

const FilterSelect = ({ label, value, options, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
      {label}
    </span>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '4px 24px 4px 8px',
        fontSize: '0.75rem',
        fontWeight: 500,
        border: `1px solid ${value !== 'ALL' ? 'var(--amrita-maroon)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)',
        background: value !== 'ALL' ? 'var(--accent-light)' : 'var(--bg-white)',
        color: value !== 'ALL' ? 'var(--amrita-maroon)' : 'var(--text-secondary)',
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 6px center',
      }}
    >
      <option value="ALL">All</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default function FacultyDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [filters, setFilters] = useState({ dept: 'ALL', subject: 'ALL', section: 'ALL', status: 'ALL' });

  useEffect(() => {
    axios.get('/api/faculty/dashboard', {
      headers: { Authorization: `Bearer ${localStorage.getItem('facultyToken')}` }
    }).then(r => setDashboard(r.data.data)).catch(console.error);
  }, []);

  // Derive unique filter options dynamically from data
  const options = useMemo(() => {
    const all = dashboard?.assignments || [];
    const depts    = [...new Set(all.map(a => a.examName?.split(' / ')[0]?.trim()).filter(Boolean))];
    const subjects = [...new Set(all.map(a => a.examName?.split(' / ')[1]?.trim()).filter(Boolean))];
    // examContext = "3 A Mid_Term" → parts[1] = section
    const sections = [...new Set(all.map(a => a.examContext?.split(' ')[1]?.trim()).filter(Boolean))];
    const statuses = [...new Set(all.map(a => a.status).filter(Boolean))];
    return { depts, subjects, sections, statuses };
  }, [dashboard]);

  const filtered = useMemo(() => {
    const all = dashboard?.assignments || [];
    return all.filter(a => {
      const dept    = a.examName?.split(' / ')[0]?.trim();
      const subject = a.examName?.split(' / ')[1]?.trim();
      const section = a.examContext?.split(' ')[1]?.trim();
      if (filters.dept    !== 'ALL' && dept    !== filters.dept)    return false;
      if (filters.subject !== 'ALL' && subject !== filters.subject) return false;
      if (filters.section !== 'ALL' && section !== filters.section) return false;
      if (filters.status  !== 'ALL' && a.status !== filters.status) return false;
      return true;
    });
  }, [dashboard, filters]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const hasActiveFilter = Object.values(filters).some(v => v !== 'ALL');

  if (!dashboard) return (
    <div className="dash-loading">
      <div className="dash-loading-spinner" />
      Loading dashboard...
    </div>
  );

  const pct = dashboard.totalAssigned > 0
    ? Math.round((dashboard.completed / dashboard.totalAssigned) * 100)
    : 0;

  return (
    <div className="dash-root">

      {/* Stat cards */}
      <div className="dash-stat-grid">
        <StatCard label="Total Assigned" value={dashboard.totalAssigned} sub="Answer sheets" color="#1E3A5F" />
        <StatCard label="Completed" value={dashboard.completed} sub="Locked & submitted" color="#16a34a" />
        <StatCard label="Pending" value={dashboard.pending} sub="Awaiting evaluation" color="#d97706" />
        <StatCard label="Completion" value={`${pct}%`} sub="Overall progress" color="#7c3aed" />
      </div>

      {/* Progress banner */}
      <div className="dash-progress-banner">
        <div className="dash-progress-banner-left">
          <span className="dash-progress-banner-pct">{pct}%</span>
          <span className="dash-progress-banner-label">Evaluation Progress</span>
        </div>
        <div className="dash-progress-banner-bar">
          <div className="dash-progress-banner-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="dash-progress-banner-counts">
          <span style={{ color: '#166534' }}>{dashboard.completed} completed</span>
          <span style={{ color: 'var(--text-muted)' }}>· {dashboard.pending} left</span>
        </div>
      </div>

      {/* Assignments table */}
      <div className="card">
        <div className="card-header">
          <h2>Evaluation Overview</h2>
          <span className="badge badge-gray">{filtered.length} of {dashboard.assignments?.length ?? 0} records</span>
        </div>

        {/* Filter bar */}
        {dashboard.assignments?.length > 0 && (
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
          }}>
            <FilterSelect
              label="Dept"
              value={filters.dept}
              options={options.depts}
              onChange={v => setFilter('dept', v)}
            />
            <FilterSelect
              label="Subject"
              value={filters.subject}
              options={options.subjects}
              onChange={v => setFilter('subject', v)}
            />
            <FilterSelect
              label="Section"
              value={filters.section}
              options={options.sections}
              onChange={v => setFilter('section', v)}
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              options={options.statuses}
              onChange={v => setFilter('status', v)}
            />
            {hasActiveFilter && (
              <button
                onClick={() => setFilters({ dept: 'ALL', subject: 'ALL', section: 'ALL', status: 'ALL' })}
                style={{
                  padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600,
                  border: '1px solid var(--error-border)', borderRadius: 'var(--radius-sm)',
                  background: 'var(--error-bg)', color: 'var(--error)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Clear
              </button>
            )}
          </div>
        )}

        {!filtered.length ? (
          <div className="empty-state">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>{hasActiveFilter ? 'No records match the selected filters.' : 'No assignments found.'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Examination</th>
                <th>Questions</th>
                <th>Status</th>
                <th>Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={`${item.sheetId}-${item.questionRange}`}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="fac-avatar">{item.studentName?.charAt(0)}</div>
                      <div>
                        <strong>{item.studentName}</strong>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '1px' }}>
                          {item.registrationNumber}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{item.examName}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{item.examContext}</div>
                  </td>
                  <td><span className="badge badge-maroon">{item.questionRange}</span></td>
                  <td><StatusBadge status={item.status} /></td>
                  <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {Object.entries(item.evaluationSummary || {}).map(([s, c]) => `${s}: ${c}`).join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
