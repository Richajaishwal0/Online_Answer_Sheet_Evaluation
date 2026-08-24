import { useState, useMemo } from 'react';
import axios from 'axios';

const SCHEMA = [
  { group: 'Student',  cols: ['registrationNumber', 'studentName', 'studentEmail'] },
  { group: 'Exam',     cols: ['course', 'subject', 'semester', 'section', 'examType', 'questionMarks'] },
  { group: 'Files',    cols: ['answerSheetPdfLink', 'questionPaperPdfLink', 'answerKeyPdfLink'] },
  { group: 'Faculty',  cols: ['facultyName', 'facultyEmail'] },
];

const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const FilePdfIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState('excel'); // 'excel' | 'manual'

  // ----------------------------------------------------
  // Excel bulk import state
  // ----------------------------------------------------
  const [stagedData, setStagedData] = useState(null); // { fileName, fileSize, rows: [] }
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showSampleRows, setShowSampleRows] = useState(false);

  // ----------------------------------------------------
  // Manual Entry State (No pre-loaded defaults)
  // ----------------------------------------------------
  const [rows, setRows] = useState([]);
  const [rowCountInput, setRowCountInput] = useState('5');
  const [showAddRowsModal, setShowAddRowsModal] = useState(false);
  const [moreRowsCount, setMoreRowsCount] = useState('1');

  // Master Exam Documents
  const [papers, setPapers] = useState({
    questionPaperPdfLink: '',
    answerKeyPdfLink: ''
  });

  const [uploadingPapers, setUploadingPapers] = useState({
    paper: false,
    key: false
  });

  const [validationAttempted, setValidationAttempted] = useState(false);
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
  // Manual Entry Handlers (User asks for N rows)
  // ----------------------------------------------------
  const handleGenerateInitialRows = (count) => {
    const num = parseInt(count, 10);
    if (isNaN(num) || num < 1) {
      setError('Please enter a valid number of rows (at least 1).');
      return;
    }
    if (num > 200) {
      setError('Maximum 200 rows can be generated at once.');
      return;
    }

    const newRows = [];
    for (let i = 0; i < num; i++) {
      newRows.push({
        id: Date.now() + i,
        registrationNumber: '',
        studentName: '',
        studentEmail: '',
        course: '',
        subject: '',
        semester: '',
        section: '',
        examType: 'Mid_Term',
        questionMarks: '10,10,10,10,10',
        facultyName: '',
        facultyEmail: '',
        answerSheetPdfLink: '',
        isUploading: false
      });
    }
    setRows(newRows);
    setMessage(`Generated ${num} row(s). You can now enter student and examination details.`);
    setError('');
  };

  const handleAddMoreRows = (count) => {
    const num = parseInt(count, 10);
    if (isNaN(num) || num < 1) {
      setError('Please enter a valid number of rows to add.');
      return;
    }

    const lastRow = rows[rows.length - 1];
    const newRows = [];
    for (let i = 0; i < num; i++) {
      newRows.push({
        id: Date.now() + i,
        registrationNumber: '',
        studentName: '',
        studentEmail: '',
        course: lastRow ? lastRow.course : '',
        subject: lastRow ? lastRow.subject : '',
        semester: lastRow ? lastRow.semester : '',
        section: lastRow ? lastRow.section : '',
        examType: lastRow ? lastRow.examType : 'Mid_Term',
        questionMarks: lastRow ? lastRow.questionMarks : '10,10,10,10,10',
        facultyName: lastRow ? lastRow.facultyName : '',
        facultyEmail: lastRow ? lastRow.facultyEmail : '',
        answerSheetPdfLink: '',
        isUploading: false
      });
    }
    setRows(prev => [...prev, ...newRows]);
    setShowAddRowsModal(false);
    setMessage(`Added ${num} new row(s) to the table.`);
  };

  const handleRemoveRow = (id) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleRowChange = (id, field, value) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleRowPdfUpload = async (id, file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files (.pdf) are allowed.');
      return;
    }

    setRows(prev => prev.map(r => (r.id === id ? { ...r, isUploading: true } : r)));
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/admin/upload-pdf', formData, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }
      });
      const fileUrl = res.data.data?.fileUrl;
      setRows(prev => prev.map(r => (r.id === id ? { ...r, answerSheetPdfLink: fileUrl, isUploading: false } : r)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload answer sheet PDF.');
      setRows(prev => prev.map(r => (r.id === id ? { ...r, isUploading: false } : r)));
    }
  };

  const handlePaperPdfUpload = async (type, file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files (.pdf) are allowed.');
      return;
    }

    setUploadingPapers(prev => ({ ...prev, [type]: true }));
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/admin/upload-pdf', formData, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }
      });
      const fileUrl = res.data.data?.fileUrl;
      if (type === 'paper') setPapers(prev => ({ ...prev, questionPaperPdfLink: fileUrl }));
      if (type === 'key')   setPapers(prev => ({ ...prev, answerKeyPdfLink: fileUrl }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload document PDF.');
    } finally {
      setUploadingPapers(prev => ({ ...prev, [type]: false }));
    }
  };

  // Inline Validation Helper
  const getRowErrors = (row) => {
    const errs = {};
    if (!row.registrationNumber.trim()) errs.registrationNumber = 'Required';
    if (!row.studentName.trim()) errs.studentName = 'Required';
    if (!row.course.trim()) errs.course = 'Required';
    if (!row.subject.trim()) errs.subject = 'Required';
    if (!row.semester.trim()) errs.semester = 'Required';
    if (!row.section.trim()) errs.section = 'Required';
    if (!row.questionMarks.trim()) errs.questionMarks = 'Required';
    if (!row.answerSheetPdfLink.trim()) errs.answerSheetPdfLink = 'PDF Required';
    return errs;
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setValidationAttempted(true);
    setMessage('');
    setError('');

    if (rows.length === 0) {
      setError('Please add at least one row before submitting.');
      return;
    }

    // Check errors on each row
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const errs = getRowErrors(r);
      if (Object.keys(errs).length > 0) {
        setError(`Row #${i + 1} (${r.studentName || r.registrationNumber || 'Student'}): Please fill in all required fields and attach the answer sheet PDF.`);
        return;
      }
    }

    setLoadingSubmit(true);

    const payloadRows = rows.map(r => ({
      registrationNumber: r.registrationNumber.trim(),
      studentName: r.studentName.trim(),
      studentEmail: r.studentEmail.trim(),
      course: r.course.trim(),
      subject: r.subject.trim(),
      semester: r.semester.trim(),
      section: r.section.trim(),
      examType: (r.examType || 'Mid_Term').trim(),
      questionMarks: (r.questionMarks || '10,10,10,10,10').trim(),
      facultyName: (r.facultyName || '').trim(),
      facultyEmail: (r.facultyEmail || '').trim(),
      answerSheetPdfLink: r.answerSheetPdfLink.trim(),
      questionPaperPdfLink: (papers.questionPaperPdfLink || '').trim(),
      answerKeyPdfLink: (papers.answerKeyPdfLink || '').trim()
    }));

    try {
      const res = await axios.post('/api/admin/manual-entry', { rows: payloadRows }, {
        headers: authHeader()
      });
      setMessage(res.data.data?.message || `Successfully created and mapped ${payloadRows.length} record(s) into the evaluation system!`);

      // Reset
      setRows([]);
      setPapers({ questionPaperPdfLink: '', answerKeyPdfLink: '' });
      setValidationAttempted(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit records.');
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

  const attachedPdfCount = useMemo(() => {
    return rows.filter(r => Boolean(r.answerSheetPdfLink)).length;
  }, [rows]);

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
          Manual Entry
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
          TAB 2: DIRECT USER-REQUESTED ROWS MANUAL ENTRY
         ──────────────────────────────────────────────────────── */}
      {activeTab === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* INITIAL STATE: ASK FOR NUMBER OF ROWS */}
          {rows.length === 0 ? (
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '30px 20px' }}>
              <h2 style={{ fontSize: '1.15rem', marginBottom: '8px' }}>Create Manual Evaluation Roster</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Enter the number of student rows you would like to create to open the data entry table.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Number of Student Rows:</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  className="form-input"
                  style={{ width: '90px', textAlign: 'center', padding: '8px 10px', fontSize: '0.9rem', fontWeight: 700 }}
                  value={rowCountInput}
                  onChange={e => setRowCountInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleGenerateInitialRows(rowCountInput); }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleGenerateInitialRows(rowCountInput)}
                  style={{ padding: '8px 18px' }}
                >
                  <PlusIcon /> Add Rows
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1, 5, 10, 25, 50].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    onClick={() => { setRowCountInput(String(cnt)); handleGenerateInitialRows(cnt); }}
                  >
                    {cnt} Rows
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* DATA ENTRY TABLE & SUBMISSION FORM */
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

              {/* Data Table Card */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2>Evaluation Data Entry</h2>
                    <span className="badge badge-blue">{rows.length} Record{rows.length > 1 ? 's' : ''}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowAddRowsModal(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <PlusIcon /> Add More Rows
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to clear all rows?')) {
                          setRows([]);
                        }
                      }}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Clear Table
                    </button>
                  </div>
                </div>

                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="data-table" style={{ minWidth: '1200px', margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '36px', textAlign: 'center' }}>#</th>
                          <th style={{ minWidth: '150px' }}>Reg No *</th>
                          <th style={{ minWidth: '150px' }}>Student Name *</th>
                          <th style={{ minWidth: '140px' }}>Email</th>
                          <th style={{ width: '80px' }}>Course *</th>
                          <th style={{ minWidth: '120px' }}>Subject *</th>
                          <th style={{ width: '60px' }}>Sem *</th>
                          <th style={{ width: '60px' }}>Sec *</th>
                          <th style={{ width: '110px' }}>Exam Type *</th>
                          <th style={{ minWidth: '130px' }}>Question Marks *</th>
                          <th style={{ minWidth: '120px' }}>Faculty Name</th>
                          <th style={{ minWidth: '130px' }}>Faculty Email</th>
                          <th style={{ minWidth: '160px' }}>Answer Sheet PDF *</th>
                          <th style={{ width: '40px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => {
                          const errs = validationAttempted ? getRowErrors(row) : {};
                          return (
                            <tr key={row.id}>
                              {/* Row Index */}
                              <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                {index + 1}
                              </td>

                              {/* Reg No */}
                              <td>
                                <input
                                  className="form-input"
                                  required
                                  style={{
                                    padding: '5px 8px', fontSize: '0.78rem',
                                    borderColor: errs.registrationNumber ? 'var(--danger)' : undefined
                                  }}
                                  placeholder="e.g. CH.SC.U4CSE..."
                                  value={row.registrationNumber}
                                  onChange={e => handleRowChange(row.id, 'registrationNumber', e.target.value)}
                                />
                              </td>

                              {/* Student Name */}
                              <td>
                                <input
                                  className="form-input"
                                  required
                                  style={{
                                    padding: '5px 8px', fontSize: '0.78rem',
                                    borderColor: errs.studentName ? 'var(--danger)' : undefined
                                  }}
                                  placeholder="Student Name"
                                  value={row.studentName}
                                  onChange={e => handleRowChange(row.id, 'studentName', e.target.value)}
                                />
                              </td>

                              {/* Student Email */}
                              <td>
                                <input
                                  type="email"
                                  className="form-input"
                                  style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                                  placeholder="Optional"
                                  value={row.studentEmail}
                                  onChange={e => handleRowChange(row.id, 'studentEmail', e.target.value)}
                                />
                              </td>

                              {/* Course */}
                              <td>
                                <input
                                  className="form-input"
                                  required
                                  style={{
                                    padding: '5px 6px', fontSize: '0.78rem', textAlign: 'center',
                                    borderColor: errs.course ? 'var(--danger)' : undefined
                                  }}
                                  placeholder="CSE"
                                  value={row.course}
                                  onChange={e => handleRowChange(row.id, 'course', e.target.value)}
                                />
                              </td>

                              {/* Subject */}
                              <td>
                                <input
                                  className="form-input"
                                  required
                                  style={{
                                    padding: '5px 8px', fontSize: '0.78rem',
                                    borderColor: errs.subject ? 'var(--danger)' : undefined
                                  }}
                                  placeholder="e.g. DBMS"
                                  value={row.subject}
                                  onChange={e => handleRowChange(row.id, 'subject', e.target.value)}
                                />
                              </td>

                              {/* Semester */}
                              <td>
                                <input
                                  className="form-input"
                                  required
                                  style={{
                                    padding: '5px 6px', fontSize: '0.78rem', textAlign: 'center',
                                    borderColor: errs.semester ? 'var(--danger)' : undefined
                                  }}
                                  placeholder="3"
                                  value={row.semester}
                                  onChange={e => handleRowChange(row.id, 'semester', e.target.value)}
                                />
                              </td>

                              {/* Section */}
                              <td>
                                <input
                                  className="form-input"
                                  required
                                  style={{
                                    padding: '5px 6px', fontSize: '0.78rem', textAlign: 'center',
                                    borderColor: errs.section ? 'var(--danger)' : undefined
                                  }}
                                  placeholder="A"
                                  value={row.section}
                                  onChange={e => handleRowChange(row.id, 'section', e.target.value)}
                                />
                              </td>

                              {/* Exam Type */}
                              <td>
                                <input
                                  className="form-input"
                                  required
                                  style={{ padding: '5px 6px', fontSize: '0.78rem' }}
                                  placeholder="Mid_Term"
                                  value={row.examType}
                                  onChange={e => handleRowChange(row.id, 'examType', e.target.value)}
                                />
                              </td>

                              {/* Question Marks */}
                              <td>
                                <input
                                  className="form-input"
                                  required
                                  style={{
                                    padding: '5px 6px', fontSize: '0.78rem',
                                    borderColor: errs.questionMarks ? 'var(--danger)' : undefined
                                  }}
                                  placeholder="10,10,10,5,5"
                                  value={row.questionMarks}
                                  onChange={e => handleRowChange(row.id, 'questionMarks', e.target.value)}
                                />
                              </td>

                              {/* Faculty Name */}
                              <td>
                                <input
                                  className="form-input"
                                  style={{ padding: '5px 6px', fontSize: '0.78rem' }}
                                  placeholder="Optional"
                                  value={row.facultyName}
                                  onChange={e => handleRowChange(row.id, 'facultyName', e.target.value)}
                                />
                              </td>

                              {/* Faculty Email */}
                              <td>
                                <input
                                  type="email"
                                  className="form-input"
                                  style={{ padding: '5px 6px', fontSize: '0.78rem' }}
                                  placeholder="Optional"
                                  value={row.facultyEmail}
                                  onChange={e => handleRowChange(row.id, 'facultyEmail', e.target.value)}
                                />
                              </td>

                              {/* Answer Sheet PDF Upload */}
                              <td>
                                <label
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 8px',
                                    background: row.answerSheetPdfLink ? '#f0fdf4' : 'white',
                                    border: `1px solid ${row.answerSheetPdfLink ? '#bbf7d0' : errs.answerSheetPdfLink ? 'var(--danger)' : 'var(--border-strong)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontSize: '0.74rem',
                                    color: row.answerSheetPdfLink ? '#166534' : 'var(--text-secondary)',
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <FilePdfIcon />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>
                                    {row.isUploading
                                      ? 'Uploading...'
                                      : row.answerSheetPdfLink
                                        ? 'PDF Attached'
                                        : 'Attach Script *'}
                                  </span>
                                  <input
                                    type="file"
                                    accept=".pdf"
                                    required={!row.answerSheetPdfLink}
                                    style={{ display: 'none' }}
                                    onChange={e => handleRowPdfUpload(row.id, e.target.files[0])}
                                  />
                                </label>
                              </td>

                              {/* Delete Action */}
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: '4px 6px', width: '26px', height: '26px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Remove row"
                                  onClick={() => handleRemoveRow(row.id)}
                                >
                                  <TrashIcon />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer */}
                  <div style={{
                    padding: '12px 16px', background: 'var(--bg-subtle)', borderTop: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowAddRowsModal(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <PlusIcon /> Add More Rows
                    </button>

                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Total: <strong>{rows.length}</strong> record(s) &nbsp;·&nbsp; Attached PDFs: <strong>{attachedPdfCount} / {rows.length}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Master Question Paper & Answer Key */}
              <div className="card">
                <div className="card-header">
                  <h2>Examination Question Paper &amp; Official Answer Key (Optional)</h2>
                </div>
                <div className="card-body">
                  <p style={{ margin: '0 0 14px 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Attach master examination documents for reference.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Question Paper */}
                    <div style={{
                      padding: '14px', borderRadius: 'var(--radius)',
                      border: `1px solid ${papers.questionPaperPdfLink ? '#bbf7d0' : 'var(--border)'}`,
                      background: papers.questionPaperPdfLink ? '#f0fdf4' : 'var(--bg-subtle)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <FilePdfIcon />
                        <strong style={{ fontSize: '0.82rem' }}>Question Paper PDF</strong>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={e => handlePaperPdfUpload('paper', e.target.files[0])}
                        style={{ fontSize: '0.75rem', width: '100%' }}
                      />
                      {uploadingPapers.paper && <p style={{ fontSize: '0.7rem', color: 'var(--amrita-maroon)', marginTop: '4px' }}>Uploading PDF...</p>}
                      {papers.questionPaperPdfLink && <p style={{ fontSize: '0.72rem', color: '#166534', marginTop: '4px', fontWeight: 600 }}>PDF Attached</p>}
                    </div>

                    {/* Answer Key */}
                    <div style={{
                      padding: '14px', borderRadius: 'var(--radius)',
                      border: `1px solid ${papers.answerKeyPdfLink ? '#bbf7d0' : 'var(--border)'}`,
                      background: papers.answerKeyPdfLink ? '#f0fdf4' : 'var(--bg-subtle)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <FilePdfIcon />
                        <strong style={{ fontSize: '0.82rem' }}>Official Answer Key PDF</strong>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={e => handlePaperPdfUpload('key', e.target.files[0])}
                        style={{ fontSize: '0.75rem', width: '100%' }}
                      />
                      {uploadingPapers.key && <p style={{ fontSize: '0.7rem', color: 'var(--amrita-maroon)', marginTop: '4px' }}>Uploading PDF...</p>}
                      {papers.answerKeyPdfLink && <p style={{ fontSize: '0.72rem', color: '#166534', marginTop: '4px', fontWeight: 600 }}>PDF Attached</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Submit Toolbar */}
              <div className="card" style={{ background: 'var(--bg-subtle)' }}>
                <div className="card-body" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexWrap: 'wrap', gap: '14px', padding: '16px 20px'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>Ready to Submit Records</h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Total <strong>{rows.length}</strong> record(s) ready to create student answer sheets and evaluation tasks.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loadingSubmit}
                    style={{ minWidth: '240px', padding: '10px 22px', fontSize: '0.88rem' }}
                  >
                    {loadingSubmit ? 'Submitting Records...' : `Confirm & Submit (${rows.length} Records)`}
                  </button>
                </div>
              </div>

            </form>
          )}

          {/* Quick Add More Rows Dialog */}
          {showAddRowsModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <div className="card" style={{ width: '380px', padding: '20px', background: 'white', borderRadius: 'var(--radius)' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Add Rows to Table</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  How many rows would you like to add?
                </p>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="form-input"
                    value={moreRowsCount}
                    onChange={e => setMoreRowsCount(e.target.value)}
                    style={{ width: '80px', textAlign: 'center', fontWeight: 700 }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[1, 5, 10].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setMoreRowsCount(String(cnt))}
                      >
                        +{cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddRowsModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleAddMoreRows(moreRowsCount)}
                  >
                    Add Rows
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
