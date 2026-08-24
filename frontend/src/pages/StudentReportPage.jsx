import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

function resolvePdfUrl(url) {
  if (!url) return null;
  if (/^(https?:)?\/\//.test(url)) return url;
  return window.location.port === '5173' ? `http://localhost:3000${url}` : url;
}

const statusCfg = (s) => {
  if (s === 'LOCKED')   return { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', dot: '#16a34a' };
  if (s === 'DRAFT')    return { bg: '#fffbeb', color: '#92400e', border: '#fde68a', dot: '#d97706' };
  if (s === 'PENDING')  return { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb', dot: '#6b7280' };
  return                       { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dot: '#2563eb' };
};

export default function StudentReportPage() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [pdfTab, setPdfTab] = useState('sheet'); // 'sheet' | 'key'

  useEffect(() => {
    axios.get(`/api/student/reports/${sheetId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('studentToken')}` }
    }).then(r => setReport(r.data.data || null))
      .catch(e => setError(e.response?.data?.message || 'Unable to load report'));
  }, [sheetId]);

  const sheetUrl   = useMemo(() => resolvePdfUrl(report?.sheetPdfUrl), [report]);
  const keyUrl     = useMemo(() => resolvePdfUrl(report?.answerKeyUrl), [report]);
  const fullyEval  = report?.evaluations?.every(e => e.status === 'LOCKED');
  const pct        = report?.fullMarks > 0 ? Math.round((report.marksObtained / report.fullMarks) * 100) : 0;

  if (error) return <div className="alert alert-error" style={{ margin: '20px' }}>{error}</div>;
  if (!report) return <div className="dash-loading"><div className="dash-loading-spinner" /> Loading report...</div>;

  return (
    <div className="dash-root">

      {/* Back */}
      <div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/student/dashboard')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back to Dashboard
        </button>
      </div>

      {/* Score summary cards */}
      <div className="dash-stat-grid">
        <div className="dash-stat-card" style={{ '--accent-color': '#1E3A5F' }}>
          <div className="dash-stat-body">
            <div className="dash-stat-value">{report.marksObtained ?? '—'}<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}> / {report.fullMarks}</span></div>
            <div className="dash-stat-label">Raw Marks</div>
            <div className="dash-stat-sub">{report.examName}</div>
          </div>
        </div>
        <div className="dash-stat-card" style={{ '--accent-color': '#16a34a' }}>
          <div className="dash-stat-body">
            <div className="dash-stat-value">{report.convertedMarks ?? '—'}<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}> / {report.convertedScale || 30}</span></div>
            <div className="dash-stat-label">Converted Score</div>
            <div className="dash-stat-sub">Scale of {report.convertedScale || 30}</div>
          </div>
        </div>
        <div className="dash-stat-card" style={{ '--accent-color': '#d97706' }}>
          <div className="dash-stat-body">
            <div className="dash-stat-value">{pct}%</div>
            <div className="dash-stat-label">Percentage</div>
            <div className="dash-stat-sub">Raw score percentage</div>
          </div>
        </div>
        <div className="dash-stat-card" style={{ '--accent-color': fullyEval ? '#16a34a' : '#d97706' }}>
          <div className="dash-stat-body">
            <div className="dash-stat-value" style={{ fontSize: '1rem', paddingTop: '4px' }}>
              {fullyEval ? 'Complete' : 'In Progress'}
            </div>
            <div className="dash-stat-label">Evaluation Status</div>
            <div className="dash-stat-sub">{report.evaluations?.length} questions</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="dash-progress-banner">
        <div className="dash-progress-banner-left">
          <span className="dash-progress-banner-pct">{pct}%</span>
          <span className="dash-progress-banner-label">{report.examName} · {report.examContext}</span>
        </div>
        <div className="dash-progress-banner-bar">
          <div className="dash-progress-banner-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="dash-progress-banner-counts">
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{report.marksObtained} / {report.fullMarks} marks</span>
        </div>
      </div>

      {/* Two-column: PDF viewer + question breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

        {/* PDF viewer */}
        <div className="card">
          <div className="card-header" style={{ padding: '0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex' }}>
              {[['sheet', 'Answer Sheet'], ['key', 'Answer Key']].map(([tab, label]) => (
                <button key={tab} onClick={() => setPdfTab(tab)} style={{
                  flex: 1, padding: '10px 14px', fontSize: '0.78rem', fontWeight: 600,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: `2px solid ${pdfTab === tab ? 'var(--amrita-maroon)' : 'transparent'}`,
                  color: pdfTab === tab ? 'var(--amrita-maroon)' : 'var(--text-muted)',
                  transition: 'color 0.12s',
                }}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ height: '520px', background: '#3d3d3d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(pdfTab === 'sheet' ? sheetUrl : keyUrl) ? (
              <iframe
                title={pdfTab}
                src={pdfTab === 'sheet' ? sheetUrl : keyUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>No PDF available</p>
            )}
          </div>
        </div>

        {/* Question-wise breakdown */}
        <div className="card">
          <div className="card-header">
            <h2>Question-wise Breakdown</h2>
            <span className="badge badge-gray">{report.evaluations?.length} questions</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Q#</th>
                <th>Marks</th>
                <th>Status</th>
                <th>Evaluator</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {report.evaluations?.map(item => {
                const cfg = statusCfg(item.status);
                return (
                  <tr key={item.questionNumber}>
                    <td><strong>Q{item.questionNumber}</strong></td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {item.marksObtained ?? '—'}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}> / {item.maxMark ?? '—'}</span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 7px', borderRadius: '4px',
                        border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color,
                        fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.dot }} />
                        {item.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.facultyName || '—'}</td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: item.review ? 'normal' : 'italic' }}>
                      {item.review || 'No note'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
