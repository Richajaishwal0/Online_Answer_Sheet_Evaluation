import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function FacultyAssignmentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/faculty/assignments', {
        headers: { Authorization: `Bearer ${localStorage.getItem('facultyToken')}` }
      });
      setItems(response.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Group items by examId for course handling controls (each subject is a separate exam)
  const examGroups = useMemo(() => {
    return items.reduce((acc, item) => {
      const key = item.examId ? item.examId.toString() : `unknown-${item.examName}`;
      if (!acc[key]) {
        acc[key] = {
          examId: item.examId,
          examName: item.examName,
          finalSubmittedToAdmin: item.finalSubmittedToAdmin ?? false,
          isPublished: item.isPublished ?? false,
          sheets: []
        };
      }
      acc[key].sheets.push(item);
      return acc;
    }, {});
  }, [items]);

  const handleFinalSubmit = async (examId) => {
    try {
      setActionMessage('');
      setErrorMessage('');
      const res = await axios.post(
        `/api/faculty/exams/${examId}/final-submit`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('facultyToken')}` } }
      );
      setActionMessage(res.data.data?.message || 'Final submission completed. Marks locked.');
      await load();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Final submission failed.');
    }
  };

  const handleTogglePublish = async (examId) => {
    try {
      setActionMessage('');
      setErrorMessage('');
      const res = await axios.post(
        `/api/faculty/exams/${examId}/publish`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('facultyToken')}` } }
      );
      const pub = res.data.data?.isPublished;
      setActionMessage(pub ? 'Results published to students!' : 'Results unpublished.');
      await load();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Publish toggle failed.');
    }
  };

  const handleExportAUMS = async (examId, examName) => {
    try {
      const res = await axios.get(`/api/faculty/exams/${examId}/export-aums`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('facultyToken')}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AUMS_Export_${examName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setErrorMessage('Failed to download AUMS Excel report.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Assigned Valuation Tasks &amp; Course In-Charge Controls</h1>
        <p>Evaluate student answer sheets, perform Final Submit to Admin, publish results to students, and export AUMS Excel spreadsheets.</p>
      </div>

      {actionMessage && <div className="alert alert-success">{actionMessage}</div>}
      {errorMessage && <div className="alert alert-error">{errorMessage}</div>}

      {loading ? (
        <div className="card"><p>Loading assignments...</p></div>
      ) : items.length === 0 ? (
        <div className="card"><p>No evaluation tasks currently assigned to you.</p></div>
      ) : (
        Object.values(examGroups).map((group) => (
          <div className="card" key={group.examId} style={{ marginBottom: '24px' }}>
            {/* Course In-Charge Controls Header Bar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '12px', paddingBottom: '14px', marginBottom: '14px',
              borderBottom: '1px solid var(--border)'
            }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{group.examName}</h3>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
                  <span className={`badge ${group.finalSubmittedToAdmin ? 'badge-amber' : 'badge-blue'}`}>
                    {group.finalSubmittedToAdmin ? 'Final Submitted to Admin (Locked)' : 'Valuation In-Progress'}
                  </span>
                  <span className={`badge ${group.isPublished ? 'badge-green' : 'badge-gray'}`}>
                    {group.isPublished ? 'Results Published to Students' : 'Results Unpublished'}
                  </span>
                </div>
              </div>

              {/* Action Buttons for Course Handling Faculty */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {/* Step 1 & 2: Publish for Student Review / Unpublish */}
                <button
                  type="button"
                  className={`btn btn-sm ${group.isPublished ? 'btn-danger' : 'btn-success'}`}
                  disabled={group.finalSubmittedToAdmin}
                  onClick={() => handleTogglePublish(group.examId)}
                  style={{ opacity: group.finalSubmittedToAdmin ? 0.5 : 1, cursor: group.finalSubmittedToAdmin ? 'not-allowed' : 'pointer' }}
                >
                  {group.isPublished ? 'Unpublish Student Review' : 'Publish for Student Review'}
                </button>

                {/* Step 3: Submit to Admin (DISABLED until Publish for Student Review is completed) */}
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => handleFinalSubmit(group.examId)}
                  disabled={group.finalSubmittedToAdmin || !group.isPublished}
                  style={{ opacity: (group.finalSubmittedToAdmin || !group.isPublished) ? 0.5 : 1, cursor: (group.finalSubmittedToAdmin || !group.isPublished) ? 'not-allowed' : 'pointer' }}
                  title={!group.isPublished ? 'You must Publish for Student Review first before submitting to Admin' : ''}
                >
                  {group.finalSubmittedToAdmin ? 'Submitted to Admin' : 'Submit to Admin'}
                </button>

                {/* Step 4: Export AUMS Excel (DISABLED until Submit to Admin is completed) */}
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleExportAUMS(group.examId, group.examName)}
                  disabled={!group.finalSubmittedToAdmin}
                  style={{ opacity: !group.finalSubmittedToAdmin ? 0.5 : 1, cursor: !group.finalSubmittedToAdmin ? 'not-allowed' : 'pointer' }}
                  title={!group.finalSubmittedToAdmin ? 'You must Submit marks to Admin first before downloading Excel report' : ''}
                >
                  Export AUMS Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* Answer Sheets Table */}
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assigned Qs</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {group.sheets.map((item) => (
                  <tr key={item.sheetId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/faculty/evaluate/${item.sheetId}`)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="fac-avatar">{item.studentName?.charAt(0)}</div>
                        <div>
                          <strong>{item.studentName}</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {item.registrationNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-maroon">{item.questionRange}</span></td>
                    <td><StatusBadge status={item.status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/faculty/evaluate/${item.sheetId}`)}
                      >
                        Open Sheet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
