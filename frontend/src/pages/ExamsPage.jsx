import { useEffect, useState } from 'react';
import axios from 'axios';

export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/exams', {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setExams(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load examinations.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchExams(); }, []);

  const handleToggle = async (examId, isPublished) => {
    setMessage(''); setError('');
    try {
      const res = await axios.post(`/api/admin/exams/${examId}/publish`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setMessage(res.data.data?.isPublished
        ? 'Results published successfully. Students can now view their marks.'
        : 'Results unpublished. Student access has been restricted.');
      await fetchExams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update publishing status.');
    }
  };

  const handleDeleteExam = async (examId, examContext) => {
    if (!window.confirm(`Are you sure you want to delete exam "${examContext}"? This will delete all associated student answer sheets, question allocations, and evaluations.`)) {
      return;
    }
    try {
      setMessage('');
      setErrorMessage('');
      await axios.delete(`/api/admin/exams/${examId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setMessage('Exam and associated data deleted successfully.');
      await fetchExams();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete exam');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Exams &amp; Result Publishing</h1>
        <p>Manage examination configurations and control when students can access evaluated results.</p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h2>Configured Examinations</h2>
          <span className="badge badge-gray">{exams.length} records</span>
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading examinations...</p></div>
        ) : exams.length === 0 ? (
          <div className="empty-state">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>No examination records found. Import an Excel sheet to populate.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Examination</th>
                <th>Semester &amp; Section</th>
                <th>Type</th>
                <th>Questions</th>
                <th>Marks (Raw → Scale)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(exam => {
                const total = (exam.questionWeightage || []).reduce((a, b) => a + b, 0);
                return (
                  <tr key={exam._id}>
                    <td>
                      <strong>{exam.course} — {exam.subject}</strong>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>Sem {exam.semester} &nbsp;·&nbsp; Sec {exam.section}</td>
                    <td><span className="badge badge-gray">{exam.examType}</span></td>
                    <td>
                      {(exam.questionWeightage || []).length}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>
                        [{(exam.questionWeightage || []).join(', ')}]
                      </div>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {total} &rarr; {exam.convertedScale || 30}
                    </td>
                    <td>
                      <span className={`badge ${exam.isPublished ? 'badge-green' : 'badge-amber'}`}>
                        {exam.isPublished ? 'Published' : 'Unpublished'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteExam(exam._id, `${exam.course} ${exam.subject} Sem ${exam.semester} Sec ${exam.section}`)}
                      >
                        Delete Exam
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
