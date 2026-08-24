import { useState, useMemo } from 'react';
import axios from 'axios';

const SCHEMA = [
  { group: 'Student', cols: ['registrationNumber', 'studentName', 'studentEmail'] },
  { group: 'Exam', cols: ['course', 'subject', 'semester', 'section', 'examType', 'questionMarks'] },
  { group: 'Files', cols: ['answerSheetPdfLink', 'questionPaperPdfLink', 'answerKeyPdfLink'] },
  { group: 'Faculty', cols: ['facultyName', 'facultyEmail'] },
];

const UploadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const FilePdfIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState('excel'); // 'excel' | 'manual'

  // Excel bulk import state
  const [stagedData, setStagedData] = useState(null); // { fileName, fileSize, rows: [] }
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showSampleRows, setShowSampleRows] = useState(false);

  // Manual entry state
  const [manualForm, setManualForm] = useState({
    registrationNumber: '',
    studentName: '',
    studentEmail: '',
    course: 'CSE',
    subject: '',
    semester: '3',
    section: 'A',
    examType: 'Mid_Term',
    questionMarks: '10,10,10,10,10',
    facultyName: '',
    facultyEmail: '',
    answerSheetPdfLink: '',
    questionPaperPdfLink: '',
    answerKeyPdfLink: ''
  });

  const [uploadingPdf, setUploadingPdf] = useState({
    sheet: false,
    paper: false,
    key: false
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('adminToken')}`
  });

  // ----------------------------------------------------
  // Excel File Upload & Staging Handlers
  // ----------------------------------------------------
  const handleExcelFile = async (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError('Only .xlsx or .xls Excel files are accepted.');
      return;
    }

    setLoadingPreview(true);
    setMessage('');
    setError('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await axios.post('/api/admin/excel/preview', formData, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }
      });
      const data = res.data.data;
      setStagedData({
        fileName: data.fileName || selectedFile.name,
        fileSize: data.fileSize || selectedFile.size,
        rows: data.rows || []
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to parse Excel file. Please check column headers and format.');
      setStagedData(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDiscardStagedFile = () => {
    if (stagedData && !window.confirm('Are you sure you want to discard this staged file?')) {
      return;
    }
    setStagedData(null);
    setShowSampleRows(false);
    setError('');
    const input = document.getElementById('excelFileInput');
    if (input) input.value = '';
  };

  const handleConfirmExcelSubmit = async () => {
    if (!stagedData || stagedData.rows.length === 0) {
      setError('No staged records to submit.');
      return;
    }

    setLoadingSubmit(true);
    setMessage('');
    setError('');

    try {
      const res = await axios.post('/api/admin/excel/confirm', { rows: stagedData.rows }, {
        headers: authHeader()
      });
      setMessage(res.data.data?.message || `Successfully imported ${stagedData.rows.length} records into the system.`);
      setStagedData(null);
      setShowSampleRows(false);
      const input = document.getElementById('excelFileInput');
      if (input) input.value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit imported data.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  // ----------------------------------------------------
  // Manual Entry & PDF Upload Handlers
  // ----------------------------------------------------
  const handlePdfUpload = async (file, type) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files (.pdf) are allowed.');
      return;
    }

    setUploadingPdf(prev => ({ ...prev, [type]: true }));
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/admin/upload-pdf', formData, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }
      });

      const fileUrl = res.data.data?.fileUrl;
      if (type === 'sheet') setManualForm(prev => ({ ...prev, answerSheetPdfLink: fileUrl }));
      if (type === 'paper') setManualForm(prev => ({ ...prev, questionPaperPdfLink: fileUrl }));
      if (type === 'key') setManualForm(prev => ({ ...prev, answerKeyPdfLink: fileUrl }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload PDF file.');
    } finally {
      setUploadingPdf(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!manualForm.registrationNumber.trim() || !manualForm.studentName.trim() || !manualForm.subject.trim()) {
      setError('Student Registration Number, Student Name, and Subject are required.');
      return;
    }

    if (!manualForm.answerSheetPdfLink.trim()) {
      setError('Please upload the Student Answer Sheet PDF before submitting.');
      return;
    }

    setLoadingSubmit(true);

    try {
      const res = await axios.post('/api/admin/manual-entry', manualForm, {
        headers: authHeader()
      });
      setMessage(res.data.data?.message || `Successfully created and mapped evaluation sheet for ${manualForm.studentName} (${manualForm.subject}).`);

      // Reset form (keep course/sem/sec defaults for quick consecutive entry)
      setManualForm(prev => ({
        ...prev,
        registrationNumber: '',
        studentName: '',
        studentEmail: '',
        answerSheetPdfLink: ''
      }));

      const sheetInput = document.getElementById('sheetPdfInput');
      if (sheetInput) sheetInput.value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create manual entry.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Staged summary statistics
  const stagedSummary = useMemo(() => {
    if (!stagedData?.rows) return null;
    const subjects = [...new Set(stagedData.rows.map(r => r.subject).filter(Boolean))];
    const faculty = [...new Set(stagedData.rows.map(r => r.facultyName).filter(Boolean))];
    const courses = [...new Set(stagedData.rows.map(r => r.course).filter(Boolean))];
    const sheetsWithPdf = stagedData.rows.filter(r => Boolean(r.answerSheetPdfLink)).length;
    return { subjects, faculty, courses, sheetsWithPdf };
  }, [stagedData]);

  return (
    <div>
      <div className="page-header">
        <h1>Evaluation Roster &amp; Answer Sheet Management</h1>
        <p>Import students, examinations, answer sheet PDFs, and faculty valuation assignments bulk-wise or through direct entry.</p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Tabs navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => { setActiveTab('excel'); setMessage(''); setError(''); }}
          style={{
            padding: '10px 18px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'excel' ? 700 : 500,
            color: activeTab === 'excel' ? 'var(--amrita-maroon)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: `2px solid ${activeTab === 'excel' ? 'var(--amrita-maroon)' : 'transparent'}`,
            background: 'none',
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          Upload Excel/CSV
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('manual'); setMessage(''); setError(''); }}
          style={{
            padding: '10px 18px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'manual' ? 700 : 500,
            color: activeTab === 'manual' ? 'var(--amrita-maroon)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: `2px solid ${activeTab === 'manual' ? 'var(--amrita-maroon)' : 'transparent'}`,
            background: 'none',
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          Manual Entry &amp;
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────
          TAB 1: EXCEL BULK IMPORT (COMPACT STAGED VIEW)
         ──────────────────────────────────────────────────────── */}
      {activeTab === 'excel' && (
        <div>
          {!stagedData ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
              {/* Upload Dropzone */}
              <div className="card">
                <div className="card-header"><h2>Upload Excel File</h2></div>
                <div className="card-body">
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => { e.preventDefault(); setDragging(false); handleExcelFile(e.dataTransfer.files[0]); }}
                    onClick={() => document.getElementById('excelFileInput').click()}
                    style={{
                      border: `1.5px dashed ${dragging ? 'var(--amrita-maroon)' : 'var(--border-strong)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '40px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: dragging ? 'var(--accent-light)' : 'var(--bg-subtle)',
                      transition: 'all 0.15s',
                      marginBottom: '16px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <UploadIcon />
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {loadingPreview ? 'Reading workbook records...' : 'Drop Excel workbook here or click to browse'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Supports .xlsx and .xls (Files will be staged for review before committing to database)
                    </p>
                    <input
                      id="excelFileInput"
                      type="file"
                      accept=".xlsx,.xls"
                      style={{ display: 'none' }}
                      onChange={e => handleExcelFile(e.target.files[0])}
                    />
                  </div>

                  {loadingPreview && (
                    <div style={{ textAlign: 'center', padding: '12px', color: 'var(--amrita-maroon)', fontSize: '0.85rem' }}>
                      Parsing workbook records and staging preview...
                    </div>
                  )}
                </div>
              </div>

              {/* Schema guide */}
              <div className="card">
                <div className="card-header"><h2>Workbook Column Reference</h2></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {SCHEMA.map(({ group, cols }) => (
                    <div key={group}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                        {group} Columns
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {cols.map(col => (
                          <code key={col} style={{
                            fontSize: '0.72rem', background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)', padding: '3px 8px', color: 'var(--amrita-maroon)',
                            fontFamily: "'Courier New', monospace",
                          }}>{col}</code>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '2px' }}>
                    Row 1 must contain headers. Columns can appear in any order.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Compact Staged File Summary Card (No Horizontal Scrolling) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '850px' }}>
              <div className="card" style={{ borderLeft: '4px solid var(--amrita-gold)' }}>
                <div className="card-header">
                  <h2>Uploaded Workbook Staged for Submission</h2>
                  <span className="badge badge-amber">Staged</span>
                </div>

                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* File Metadata Overview */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '12px', padding: '14px 16px', background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius)', border: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: 'var(--radius)',
                        background: 'var(--accent-light)', color: 'var(--amrita-maroon)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <UploadIcon />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>{stagedData.fileName}</h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {(stagedData.fileSize / 1024).toFixed(1)} KB &nbsp;·&nbsp; Total {stagedData.rows.length} rows detected
                        </p>
                      </div>
                    </div>

                    {/* Action buttons on file */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => document.getElementById('excelFileInput').click()}
                      >
                        Replace File
                      </button>
                      <input
                        id="excelFileInput"
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={e => handleExcelFile(e.target.files[0])}
                      />

                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={handleDiscardStagedFile}
                      >
                        <TrashIcon /> Delete File
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  {stagedSummary && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '12px 14px', borderRadius: 'var(--radius)', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>Students to Import</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e3a5f' }}>{stagedData.rows.length}</div>
                      </div>

                      <div style={{ padding: '12px 14px', borderRadius: 'var(--radius)', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Subjects / Exams</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#166534', marginTop: '4px' }}>
                          {stagedSummary.subjects.join(', ') || 'N/A'}
                        </div>
                      </div>

                      <div style={{ padding: '12px 14px', borderRadius: 'var(--radius)', background: '#fffbeb', border: '1px solid #fde68a' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Faculty Evaluators</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#92400e', marginTop: '4px' }}>
                          {stagedSummary.faculty.join(', ') || 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sample rows drawer toggle */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowSampleRows(!showSampleRows)}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {showSampleRows ? 'Hide Sample Records' : 'Preview Sample Records (First 5 Rows)'}
                    </button>

                    {showSampleRows && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {stagedData.rows.slice(0, 5).map((row, idx) => (
                          <div key={idx} style={{
                            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem'
                          }}>
                            <div>
                              <strong>{row.studentName}</strong> <span style={{ color: 'var(--text-muted)' }}>({row.registrationNumber})</span>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                {row.course} · {row.subject} (Sem {row.semester} {row.section}) · Faculty: {row.facultyName || 'Unassigned'}
                              </div>
                            </div>
                            {row.answerSheetPdfLink && (
                              <span style={{ fontSize: '0.7rem', color: '#166534', background: '#f0fdf4', padding: '2px 6px', borderRadius: '3px', border: '1px solid #bbf7d0' }}>
                                PDF Attached
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submission Toolbar */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Ready to import <strong>{stagedData.rows.length}</strong> record(s). Clicking submit will map teachers and create student valuation tasks.
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleDiscardStagedFile}
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleConfirmExcelSubmit}
                        disabled={loadingSubmit}
                      >
                        {loadingSubmit ? 'Submitting...' : `Confirm & Submit Import (${stagedData.rows.length})`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 2: DIRECT MANUAL ENTRY & PDF UPLOAD
         ──────────────────────────────────────────────────────── */}
      {activeTab === 'manual' && (
        <div style={{ maxWidth: '820px' }}>
          <div className="card">
            <div className="card-header">
              <h2>Direct Student &amp; Answer Sheet Entry</h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Section 1: Student Information */}
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--amrita-maroon)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '14px' }}>
                    1. Student Information
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label">Registration Number *</label>
                      <input
                        className="form-input"
                        required
                        placeholder="e.g. CH.SC.U4CSE23010"
                        value={manualForm.registrationNumber}
                        onChange={e => setManualForm({ ...manualForm, registrationNumber: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Student Name *</label>
                      <input
                        className="form-input"
                        required
                        placeholder="e.g. Ananya Roy"
                        value={manualForm.studentName}
                        onChange={e => setManualForm({ ...manualForm, studentName: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Student Email <span className="form-label-optional">(Optional)</span></label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="e.g. ananya@gmail.com"
                        value={manualForm.studentEmail}
                        onChange={e => setManualForm({ ...manualForm, studentEmail: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Examination & Subject Details */}
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--amrita-maroon)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '14px' }}>
                    2. Examination &amp; Subject
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 0.8fr 0.8fr 1fr', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label">Course *</label>
                      <input
                        className="form-input"
                        required
                        placeholder="e.g. CSE"
                        value={manualForm.course}
                        onChange={e => setManualForm({ ...manualForm, course: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Subject Name *</label>
                      <input
                        className="form-input"
                        required
                        placeholder="e.g. DBMS"
                        value={manualForm.subject}
                        onChange={e => setManualForm({ ...manualForm, subject: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Semester *</label>
                      <input
                        className="form-input"
                        required
                        placeholder="3"
                        value={manualForm.semester}
                        onChange={e => setManualForm({ ...manualForm, semester: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Section *</label>
                      <input
                        className="form-input"
                        required
                        placeholder="A"
                        value={manualForm.section}
                        onChange={e => setManualForm({ ...manualForm, section: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Exam Type *</label>
                      <input
                        className="form-input"
                        required
                        placeholder="Mid_Term"
                        value={manualForm.examType}
                        onChange={e => setManualForm({ ...manualForm, examType: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '10px' }}>
                    <label className="form-label">Question Weightages (Comma Separated) *</label>
                    <input
                      className="form-input"
                      required
                      placeholder="10,10,10,5,5,5,5"
                      value={manualForm.questionMarks}
                      onChange={e => setManualForm({ ...manualForm, questionMarks: e.target.value })}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Defines total questions and max marks per question.
                    </span>
                  </div>
                </div>

                {/* Section 3: Faculty Evaluator Assignment */}
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--amrita-maroon)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '14px' }}>
                    3. Faculty Evaluator Assignment
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label">Faculty Name <span className="form-label-optional">(Optional)</span></label>
                      <input
                        className="form-input"
                        placeholder="e.g. Dr. Anand S"
                        value={manualForm.facultyName}
                        onChange={e => setManualForm({ ...manualForm, facultyName: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Faculty Email <span className="form-label-optional">(Optional)</span></label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="e.g. dr.a01@gmail.com"
                        value={manualForm.facultyEmail}
                        onChange={e => setManualForm({ ...manualForm, facultyEmail: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: PDF Uploads */}
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--amrita-maroon)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '14px' }}>
                    4. Answer Sheet &amp; Examination PDFs
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                    {/* Answer Sheet PDF (Required) */}
                    <div style={{
                      padding: '14px', borderRadius: 'var(--radius)', border: `1px solid ${manualForm.answerSheetPdfLink ? '#bbf7d0' : 'var(--border)'}`,
                      background: manualForm.answerSheetPdfLink ? '#f0fdf4' : 'var(--bg-subtle)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <FilePdfIcon />
                        <strong style={{ fontSize: '0.8rem', color: '#166534' }}>Student Answer Sheet *</strong>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Required student script</p>

                      <input
                        id="sheetPdfInput"
                        type="file"
                        accept=".pdf"
                        onChange={e => handlePdfUpload(e.target.files[0], 'sheet')}
                        style={{ fontSize: '0.75rem', width: '100%' }}
                      />
                      {uploadingPdf.sheet && <p style={{ fontSize: '0.7rem', color: 'var(--amrita-maroon)', marginTop: '4px' }}>Uploading PDF...</p>}
                      {manualForm.answerSheetPdfLink && (
                        <p style={{ fontSize: '0.7rem', color: '#166534', marginTop: '4px', fontWeight: 600 }}>PDF Attached</p>
                      )}
                    </div>

                    {/* Question Paper PDF */}
                    <div style={{
                      padding: '14px', borderRadius: 'var(--radius)', border: `1px solid ${manualForm.questionPaperPdfLink ? '#bbf7d0' : 'var(--border)'}`,
                      background: manualForm.questionPaperPdfLink ? '#f0fdf4' : 'var(--bg-subtle)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <FilePdfIcon />
                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Question Paper</strong>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Optional for exam reference</p>

                      <input
                        type="file"
                        accept=".pdf"
                        onChange={e => handlePdfUpload(e.target.files[0], 'paper')}
                        style={{ fontSize: '0.75rem', width: '100%' }}
                      />
                      {uploadingPdf.paper && <p style={{ fontSize: '0.7rem', color: 'var(--amrita-maroon)', marginTop: '4px' }}>Uploading PDF...</p>}
                      {manualForm.questionPaperPdfLink && (
                        <p style={{ fontSize: '0.7rem', color: '#166534', marginTop: '4px', fontWeight: 600 }}>PDF Attached</p>
                      )}
                    </div>

                    {/* Answer Key PDF */}
                    <div style={{
                      padding: '14px', borderRadius: 'var(--radius)', border: `1px solid ${manualForm.answerKeyPdfLink ? '#bbf7d0' : 'var(--border)'}`,
                      background: manualForm.answerKeyPdfLink ? '#f0fdf4' : 'var(--bg-subtle)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <FilePdfIcon />
                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Answer Key</strong>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Optional for evaluator reference</p>

                      <input
                        type="file"
                        accept=".pdf"
                        onChange={e => handlePdfUpload(e.target.files[0], 'key')}
                        style={{ fontSize: '0.75rem', width: '100%' }}
                      />
                      {uploadingPdf.key && <p style={{ fontSize: '0.7rem', color: 'var(--amrita-maroon)', marginTop: '4px' }}>Uploading PDF...</p>}
                      {manualForm.answerKeyPdfLink && (
                        <p style={{ fontSize: '0.7rem', color: '#166534', marginTop: '4px', fontWeight: 600 }}>PDF Attached</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loadingSubmit}
                    style={{ minWidth: '220px' }}
                  >
                    {loadingSubmit ? 'Saving & Mapping...' : 'Create & Map Evaluation Sheet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
