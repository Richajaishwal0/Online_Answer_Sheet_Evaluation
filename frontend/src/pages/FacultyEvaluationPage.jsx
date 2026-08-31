import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const STATUS_BADGE = {
  LOCKED: 'badge-green',
  UNLOCK_REQUESTED: 'badge-amber',
  DRAFT: 'badge-blue',
  PENDING: 'badge-gray',
};

const ctrlBtn = {
  width: '24px', height: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--text-secondary)',
};

const PdfControls = ({ label, zoom, onZoomIn, onZoomOut, onRotate }) => (
  <div style={{ padding: '8px 14px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <button onClick={onZoomOut} style={ctrlBtn}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '36px', textAlign: 'center' }}>{zoom}%</span>
      <button onClick={onZoomIn} style={ctrlBtn}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
      <button onClick={onRotate} style={{ ...ctrlBtn, marginLeft: '4px' }} title="Rotate 90°">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      </button>
    </div>
  </div>
);

export default function FacultyEvaluationPage() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [sheetPdfUrl, setSheetPdfUrl] = useState(null);
  const [answerKeyUrl, setAnswerKeyUrl] = useState(null);
  const [targetScale, setTargetScale] = useState(30);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [remarkOpen, setRemarkOpen] = useState({});

  const [panelWidths, setPanelWidths] = useState({ left: 35, center: 35, right: 30 });
  const [isDragging, setIsDragging] = useState(null);
  const [sheetZoom, setSheetZoom] = useState(100);
  const [sheetRotate, setSheetRotate] = useState(0);
  const [keyZoom, setKeyZoom] = useState(100);
  const [keyRotate, setKeyRotate] = useState(0);

  const [finalSubmittedToAdmin, setFinalSubmittedToAdmin] = useState(false);

  const load = async () => {
    try {
      setLoading(true); setErrorMessage('');
      const res = await axios.get(`/api/faculty/evaluations?sheetId=${sheetId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('facultyToken')}` }
      });
      const d = res.data.data || {};
      setRows(d.evaluations || []);
      setSheetPdfUrl(d.sheetPdfUrl || null);
      setAnswerKeyUrl(d.answerKeyUrl || null);
      setFinalSubmittedToAdmin(Boolean(d.finalSubmittedToAdmin));
      if (d.convertedScale) setTargetScale(d.convertedScale);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Unable to load evaluation sheet.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [sheetId]);

  const statusSummary = useMemo(() => {
    if (!rows.length) return 'PENDING';
    if (rows.some(r => r.status === 'LOCKED')) return 'LOCKED';
    if (rows.some(r => r.status === 'UNLOCK_REQUESTED')) return 'UNLOCK_REQUESTED';
    if (rows.some(r => r.status === 'DRAFT')) return 'DRAFT';
    return 'PENDING';
  }, [rows]);

  const isLockedOrRequested = statusSummary === 'LOCKED' || statusSummary === 'UNLOCK_REQUESTED';

  const resolvePdfUrl = (url) => {
    if (!url) return null;
    if (/^(https?:)?\/\//.test(url)) return url;
    return window.location.port === '5173' ? `http://localhost:3000/${url}` : url;
  };

  
  
  const sheetPreviewUrl = useMemo(() => resolvePdfUrl(sheetPdfUrl), [sheetPdfUrl]);
  const answerKeyPreviewUrl = useMemo(() => resolvePdfUrl(answerKeyUrl), [answerKeyUrl]);
  
  // console.log(sheetPreviewUrl);

  const updateRow = (id, field, value) =>
    setRows(cur => cur.map(r => r.evaluationId === id ? { ...r, [field]: value } : r));

  const updateMax = (id, value) =>
    setRows(cur => cur.map(r => r.evaluationId === id ? { ...r, maxMark: Math.max(1, Math.round(Number(value))) } : r));

  const toggleRemark = (id) => setRemarkOpen(p => ({ ...p, [id]: !p[id] }));

  const validationErrors = useMemo(() => {
    const errors = {};
    rows.forEach(row => {
      if (row.marksObtained !== null && row.marksObtained !== undefined && row.marksObtained !== '') {
        const val = Number(row.marksObtained);
        if (Number.isNaN(val)) errors[row.evaluationId] = 'Must be a valid number';
        else if (val < 0) errors[row.evaluationId] = 'Cannot be negative';
        else if (row.maxMark != null && val > row.maxMark) errors[row.evaluationId] = `Cannot exceed ${row.maxMark}`;
      }
    });
    return errors;
  }, [rows]);

  const hasErrors = Object.keys(validationErrors).length > 0;
  const allEvaluated = useMemo(() =>
    rows.length > 0 && rows.every(r => r.marksObtained !== null && r.marksObtained !== undefined && r.marksObtained !== ''),
  [rows]);

  const totals = useMemo(() => {
    let rawObtained = 0, rawMax = 0;
    rows.forEach(r => {
      if (r.maxMark != null) rawMax += Number(r.maxMark);
      if (r.marksObtained != null && r.marksObtained !== '') rawObtained += Number(r.marksObtained);
    });
    const scale = Number(targetScale) || 30;
    return { rawObtained, rawMax, scale, convertedScore: Math.round(rawMax > 0 ? (rawObtained / rawMax) * scale : 0) };
  }, [rows, targetScale]);

  const handleDraft = async () => {
    if (hasErrors) { setErrorMessage('Fix validation errors before saving.'); return; }
    try {
      setMessage(''); setErrorMessage('');
      await axios.put(`/api/faculty/evaluations/sheet/${sheetId}/draft`,
        { updates: rows.map(r => ({ evaluationId: r.evaluationId, marksObtained: r.marksObtained, review: r.review })) },
        { headers: { Authorization: `Bearer ${localStorage.getItem('facultyToken')}` } }
      );
      setMessage('Saved successfully.');
      await load();
    } catch (err) { setErrorMessage(err.response?.data?.message || 'Unable to save.'); }
  };

  const handleSubmit = async () => {
    if (!allEvaluated) { setErrorMessage('All questions must be marked before submitting.'); return; }
    if (hasErrors) { setErrorMessage('Fix validation errors before submitting.'); return; }
    try {
      setMessage(''); setErrorMessage('');
      await axios.put(`/api/faculty/evaluations/sheet/${sheetId}/submit`,
        { updates: rows.map(r => ({ evaluationId: r.evaluationId, marksObtained: r.marksObtained, review: r.review })) },
        { headers: { Authorization: `Bearer ${localStorage.getItem('facultyToken')}` } }
      );
      setMessage('Evaluation submitted and locked successfully.');
      await load();
    } catch (err) { setErrorMessage(err.response?.data?.message || 'Unable to submit evaluation.'); }
  };

  const handleUnlock = async () => {
    try {
      setMessage(''); setErrorMessage('');
      await axios.post(`/api/faculty/evaluations/sheet/${sheetId}/request-unlock`, {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('facultyToken')}` } }
      );
      setMessage('Unlock request submitted to the Examination Cell.');
      await load();
    } catch (err) { setErrorMessage(err.response?.data?.message || 'Unable to request unlock.'); }
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const xPct = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 10), 90);
      if (isDragging === 'left') {
        const newLeft = Math.min(Math.max(xPct, 20), 50);
        const remaining = 100 - newLeft - panelWidths.right;
        if (remaining > 15) setPanelWidths(p => ({ ...p, left: newLeft, center: remaining }));
      } else {
        const newRight = Math.min(Math.max(100 - xPct, 20), 50);
        const remaining = 100 - panelWidths.left - newRight;
        if (remaining > 15) setPanelWidths(p => ({ ...p, center: remaining, right: newRight }));
      }
    };
    const onUp = () => setIsDragging(null);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isDragging, panelWidths]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', background: 'var(--bg-page)' }}>

      {/* Workspace header */}
      <div style={{ padding: '0 20px', height: '48px', background: 'white', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/faculty/assignments')} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back
          </button>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
          <div>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Evaluation Workspace</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '8px', fontFamily: 'monospace' }}>{sheetId}</span>
          </div>
        </div>
        <span className={`badge ${STATUS_BADGE[statusSummary] || 'badge-gray'}`}>{statusSummary}</span>
      </div>

      {/* Notifications */}
      {message && (
        <div style={{ padding: '8px 20px', background: 'var(--success-bg)', color: 'var(--success)', borderBottom: '1px solid var(--success-border)', fontSize: '0.8rem', fontWeight: 500, flexShrink: 0 }}>
          {message}
        </div>
      )}
      {errorMessage && (
        <div style={{ padding: '8px 20px', background: 'var(--error-bg)', color: 'var(--error)', borderBottom: '1px solid var(--error-border)', fontSize: '0.8rem', fontWeight: 500, flexShrink: 0 }}>
          {errorMessage}
        </div>
      )}

      {/* 3-panel resizable layout */}
      <div ref={containerRef} style={{ display: 'grid', gridTemplateColumns: `${panelWidths.left}% 5px ${panelWidths.center}% 5px ${panelWidths.right}%`, flex: 1, overflow: 'hidden' }}>

        {/* Panel 1 — Answer Sheet */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>
          <PdfControls label="Student Answer Sheet" zoom={sheetZoom}
            onZoomIn={() => setSheetZoom(z => Math.min(z + 15, 200))}
            onZoomOut={() => setSheetZoom(z => Math.max(z - 15, 50))}
            onRotate={() => setSheetRotate(r => (r + 90) % 360)}
          />
          <div style={{ flex: 1, overflow: 'auto', background: '#3d3d3d', display: 'flex', justifyContent: 'center', padding: '8px' }}>
            {sheetPreviewUrl ? (
              <iframe title="Student Answer Sheet" src={sheetPreviewUrl}
                style={{ width: `${sheetZoom}%`, minHeight: '600px', border: 'none', transform: `rotate(${sheetRotate}deg)`, transition: 'transform 0.2s' }}
              />
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', padding: '40px', textAlign: 'center', alignSelf: 'center' }}>
                No answer sheet PDF available
              </div>
            )}
          </div>
        </div>

        {/* Resizer 1 */}
        <div onMouseDown={() => setIsDragging('left')}
          style={{ cursor: 'col-resize', background: isDragging === 'left' ? 'var(--amrita-maroon)' : 'var(--border)', transition: 'background 0.15s' }}
        />

        {/* Panel 2 — Answer Key */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>
          <PdfControls label="Official Answer Key" zoom={keyZoom}
            onZoomIn={() => setKeyZoom(z => Math.min(z + 15, 200))}
            onZoomOut={() => setKeyZoom(z => Math.max(z - 15, 50))}
            onRotate={() => setKeyRotate(r => (r + 90) % 360)}
          />
          <div style={{ flex: 1, overflow: 'auto', background: '#3d3d3d', display: 'flex', justifyContent: 'center', padding: '8px' }}>
            {answerKeyPreviewUrl ? (
              <iframe title="Official Answer Key" src={answerKeyPreviewUrl}
                style={{ width: `${keyZoom}%`, minHeight: '600px', border: 'none', transform: `rotate(${keyRotate}deg)`, transition: 'transform 0.2s' }}
              />
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', padding: '40px', textAlign: 'center', alignSelf: 'center' }}>
                No answer key PDF available
              </div>
            )}
          </div>
        </div>

        {/* Resizer 2 */}
        <div onMouseDown={() => setIsDragging('right')}
          style={{ cursor: 'col-resize', background: isDragging === 'right' ? 'var(--amrita-maroon)' : 'var(--border)', transition: 'background 0.15s' }}
        />

        {/* Panel 3 — Evaluation form */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Question Evaluation
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {loading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading questions...</p>
            ) : rows.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No assigned questions found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rows.map(row => {
                  const err = validationErrors[row.evaluationId];
                  const showRemark = !!remarkOpen[row.evaluationId];
                  return (
                    <div key={row.evaluationId} style={{
                      border: `1px solid ${err ? 'var(--error-border)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-white)',
                      borderLeft: `3px solid ${err ? 'var(--error)' : 'var(--amrita-maroon)'}`,
                      overflow: 'hidden',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: err ? 'var(--error-bg)' : 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Q{row.questionNumber}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>MAX</span>
                          <input type="number" value={row.maxMark ?? ''} onChange={e => updateMax(row.evaluationId, e.target.value)}
                            disabled={isLockedOrRequested} min={1} step="1"
                            style={{ width: '46px', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', outline: 'none', background: isLockedOrRequested ? 'var(--bg-subtle)' : 'white', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input className="form-input" type="number" value={row.marksObtained ?? ''}
                            placeholder={`0 – ${row.maxMark ?? 'max'}`}
                            onChange={e => updateRow(row.evaluationId, 'marksObtained', e.target.value === '' ? null : Math.round(Number(e.target.value)))}
                            disabled={isLockedOrRequested} min={0} max={row.maxMark ?? undefined} step="1"
                            style={{ flex: 1, borderColor: err ? 'var(--error)' : undefined, background: isLockedOrRequested ? 'var(--bg-subtle)' : 'white', fontSize: '0.875rem', padding: '6px 10px' }}
                          />
                          {!isLockedOrRequested && (
                            <button type="button" onClick={() => toggleRemark(row.evaluationId)}
                              style={{ flexShrink: 0, padding: '6px 10px', fontSize: '0.7rem', fontWeight: 600, border: `1px solid ${showRemark ? 'var(--amrita-maroon)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: showRemark ? 'var(--accent-light)' : 'var(--bg-subtle)', color: showRemark ? 'var(--amrita-maroon)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {showRemark ? '− Note' : '+ Note'}
                            </button>
                          )}
                        </div>
                        {err && <span style={{ fontSize: '0.68rem', color: 'var(--error)' }}>{err}</span>}
                        {showRemark && (
                          <textarea className="form-input" value={row.review || ''} onChange={e => updateRow(row.evaluationId, 'review', e.target.value)}
                            placeholder="Add a note..." rows={2} autoFocus
                            style={{ resize: 'none', fontSize: '0.78rem', padding: '6px 10px' }}
                          />
                        )}
                        {isLockedOrRequested && row.review && (
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>{row.review}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {rows.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '12px', flexShrink: 0, background: 'white' }}>
              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Raw Score</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{totals.rawObtained} / {totals.rawMax}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid var(--border)', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Convert to</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="number" value={targetScale} min={1}
                      onChange={e => setTargetScale(Math.max(1, Math.round(Number(e.target.value))))}
                      style={{ width: '60px', padding: '5px 8px', fontSize: '0.82rem', fontWeight: 700, border: '1px solid var(--amrita-maroon)', borderRadius: 'var(--radius-sm)', textAlign: 'center', outline: 'none', color: 'var(--amrita-maroon)', background: 'var(--accent-light)' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>marks</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--amrita-maroon)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Converted Score</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--amrita-maroon)', fontVariantNumeric: 'tabular-nums' }}>{totals.convertedScore} / {totals.scale}</span>
                </div>
              </div>

              {!finalSubmittedToAdmin ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={hasErrors || !allEvaluated} style={{ opacity: hasErrors || !allEvaluated ? 0.5 : 1 }}>
                    Submit Marks for Student Review
                  </button>
                  {!allEvaluated && <p style={{ fontSize: '0.72rem', color: 'var(--warning)', textAlign: 'center', margin: 0 }}>All questions must be marked before submission.</p>}
                  <button className="btn btn-ghost btn-full" onClick={handleDraft} disabled={hasErrors}>Save Draft</button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>
                  Marks Permanently Locked (Final Submitted to Admin)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
