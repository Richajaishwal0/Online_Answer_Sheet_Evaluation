import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const ListIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }}
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'table'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterSemester, setFilterSemester] = useState('ALL');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterExamType, setFilterExamType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'UNPUBLISHED' | 'FINAL_SUBMITTED'

  // Accordion open/collapse state: Map of keys e.g. "dept_CSE" -> true
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Multi-select state: Set of exam IDs
  const [selectedExams, setSelectedExams] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('adminToken')}`
  });

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/exams', {
        headers: authHeader()
      });
      setExams(res.data.data || []);
      setSelectedExams(new Set());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load examinations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const toggleGroupCollapse = (key) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // ----------------------------------------------------
  // Single Exam Actions
  // ----------------------------------------------------
  const handleTogglePublish = async (examId) => {
    setMessage('');
    setError('');
    try {
      const res = await axios.post(`/api/admin/exams/${examId}/publish`, {}, {
        headers: authHeader()
      });
      setMessage(res.data.data?.isPublished
        ? 'Results published successfully. Students can now view their reports.'
        : 'Results unpublished. Student access restricted.');
      await fetchExams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle publication status.');
    }
  };

  const handleDeleteExam = async (examId, examContext) => {
    if (!window.confirm(`Are you sure you want to delete exam "${examContext}"? This will delete all student answer sheets, question allocations, and evaluations.`)) {
      return;
    }
    try {
      setMessage('');
      setError('');
      await axios.delete(`/api/admin/exams/${examId}`, {
        headers: authHeader()
      });
      setMessage(`Exam "${examContext}" and associated data were successfully deleted.`);
      await fetchExams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete examination.');
    }
  };

  const handleExportAUMS = async (examId, examName) => {
    try {
      const res = await axios.get(`/api/faculty/exams/${examId}/export-aums`, {
        headers: authHeader(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AUMS_Export_${examName.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export AUMS Excel spreadsheet.');
    }
  };

  // ----------------------------------------------------
  // Bulk Actions
  // ----------------------------------------------------
  const handleSelectExam = (examId) => {
    setSelectedExams(prev => {
      const next = new Set(prev);
      if (next.has(examId)) next.delete(examId);
      else next.add(examId);
      return next;
    });
  };

  const handleSelectAll = (filteredExamList) => {
    if (selectedExams.size === filteredExamList.length) {
      setSelectedExams(new Set());
    } else {
      setSelectedExams(new Set(filteredExamList.map(e => e._id)));
    }
  };

  const handleBulkPublish = async (isPublished) => {
    if (selectedExams.size === 0) return;
    setBulkActionLoading(true);
    setMessage('');
    setError('');
    try {
      const examIds = Array.from(selectedExams);
      const res = await axios.post('/api/admin/exams/bulk-publish', { examIds, isPublished }, {
        headers: authHeader()
      });
      setMessage(`Successfully ${isPublished ? 'published' : 'unpublished'} ${res.data.data?.count || examIds.length} examination(s).`);
      await fetchExams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to perform bulk publish/unpublish.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedExams.size === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedExams.size} selected examination(s) and all their associated data?`)) {
      return;
    }
    setBulkActionLoading(true);
    setMessage('');
    setError('');
    try {
      const examIds = Array.from(selectedExams);
      const res = await axios.post('/api/admin/exams/bulk-delete', { examIds }, {
        headers: authHeader()
      });
      setMessage(`Successfully deleted ${res.data.data?.count || examIds.length} examination(s).`);
      await fetchExams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to perform bulk deletion.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // Filtering & Search Logic
  // ----------------------------------------------------
  const uniqueCourses = useMemo(() => ['ALL', ...new Set(exams.map(e => e.course).filter(Boolean))], [exams]);
  const uniqueSubjects = useMemo(() => ['ALL', ...new Set(exams.map(e => e.subject).filter(Boolean))], [exams]);
  const uniqueSemesters = useMemo(() => ['ALL', ...new Set(exams.map(e => String(e.semester)).filter(Boolean))], [exams]);
  const uniqueSections = useMemo(() => ['ALL', ...new Set(exams.map(e => e.section).filter(Boolean))], [exams]);
  const uniqueExamTypes = useMemo(() => ['ALL', ...new Set(exams.map(e => e.examType).filter(Boolean))], [exams]);

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      // Global Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const facultyNames = (exam.facultyList || []).map(f => f.name.toLowerCase()).join(' ');
        const facultyEmails = (exam.facultyList || []).map(f => f.email.toLowerCase()).join(' ');
        const matches =
          (exam.subject || '').toLowerCase().includes(q) ||
          (exam.course || '').toLowerCase().includes(q) ||
          (exam.examType || '').toLowerCase().includes(q) ||
          facultyNames.includes(q) ||
          facultyEmails.includes(q);
        if (!matches) return false;
      }

      // Dropdown Filters
      if (filterCourse !== 'ALL' && exam.course !== filterCourse) return false;
      if (filterSubject !== 'ALL' && exam.subject !== filterSubject) return false;
      if (filterSemester !== 'ALL' && String(exam.semester) !== filterSemester) return false;
      if (filterSection !== 'ALL' && exam.section !== filterSection) return false;
      if (filterExamType !== 'ALL' && exam.examType !== filterExamType) return false;

      // Status Filter
      if (filterStatus === 'PUBLISHED' && !exam.isPublished) return false;
      if (filterStatus === 'UNPUBLISHED' && exam.isPublished) return false;
      if (filterStatus === 'FINAL_SUBMITTED' && !exam.finalSubmittedToAdmin) return false;

      return true;
    });
  }, [exams, searchQuery, filterCourse, filterSubject, filterSemester, filterSection, filterExamType, filterStatus]);

  // ----------------------------------------------------
  // Summary Metrics Calculation
  // ----------------------------------------------------
  const summaryMetrics = useMemo(() => {
    const totalExams = exams.length;
    const publishedCount = exams.filter(e => e.isPublished).length;
    const unpublishedCount = totalExams - publishedCount;
    const finalSubmittedCount = exams.filter(e => e.finalSubmittedToAdmin).length;
    const totalDepartments = new Set(exams.map(e => e.course).filter(Boolean)).size;
    const totalSubjects = new Set(exams.map(e => e.subject).filter(Boolean)).size;
    const totalStudents = exams.reduce((acc, e) => acc + (e.studentCount || 0), 0);
    const totalEvaluated = exams.reduce((acc, e) => acc + (e.evaluatedCount || 0), 0);

    return {
      totalExams,
      publishedCount,
      unpublishedCount,
      finalSubmittedCount,
      totalDepartments,
      totalSubjects,
      totalStudents,
      totalEvaluated
    };
  }, [exams]);

  // ----------------------------------------------------
  // Hierarchical Grouping: Course -> Subject -> Exams
  // ----------------------------------------------------
  const hierarchicalData = useMemo(() => {
    const map = new Map();

    for (const exam of filteredExams) {
      const courseKey = exam.course || 'Unassigned Department';
      const subjectKey = exam.subject || 'Unassigned Subject';

      if (!map.has(courseKey)) {
        map.set(courseKey, new Map());
      }
      const subjectMap = map.get(courseKey);

      if (!subjectMap.has(subjectKey)) {
        subjectMap.set(subjectKey, []);
      }
      subjectMap.get(subjectKey).push(exam);
    }

    // Convert map to array structure
    const hierarchy = [];
    for (const [course, subjects] of map) {
      const subjectList = [];
      let deptTotalExams = 0;
      let deptTotalStudents = 0;
      let deptPublishedExams = 0;

      for (const [subject, examList] of subjects) {
        deptTotalExams += examList.length;
        const subStudents = examList.reduce((acc, e) => acc + (e.studentCount || 0), 0);
        deptTotalStudents += subStudents;
        const subPublished = examList.filter(e => e.isPublished).length;
        deptPublishedExams += subPublished;

        subjectList.push({
          subject,
          exams: examList,
          totalStudents: subStudents,
          publishedCount: subPublished
        });
      }

      hierarchy.push({
        course,
        subjects: subjectList,
        totalExams: deptTotalExams,
        totalStudents: deptTotalStudents,
        publishedCount: deptPublishedExams
      });
    }

    return hierarchy;
  }, [filteredExams]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCourse('ALL');
    setFilterSubject('ALL');
    setFilterSemester('ALL');
    setFilterSection('ALL');
    setFilterExamType('ALL');
    setFilterStatus('ALL');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1>Examination Management &amp; Publishing Portal</h1>
        <p>Hierarchical oversight of examination cohorts, valuation progress, faculty assignments, and student result publishing.</p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* ────────────────────────────────────────────────────────
          1. TOP SUMMARY METRIC CARDS
         ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Total Exams */}
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid var(--amrita-maroon)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Configured Exams
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
            {summaryMetrics.totalExams}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            Across {summaryMetrics.totalDepartments} department(s)
          </div>
        </div>

        {/* Publishing Status */}
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Publication Status
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', margin: '4px 0' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#166534' }}>
              {summaryMetrics.publishedCount}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              / {summaryMetrics.totalExams} Published
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: 600 }}>
            {summaryMetrics.unpublishedCount} Unpublished / Draft
          </div>
        </div>

        {/* Academic Scope */}
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Departments &amp; Subjects
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a8a', margin: '4px 0' }}>
            {summaryMetrics.totalSubjects}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            Subjects in {summaryMetrics.totalDepartments} Department(s)
          </div>
        </div>

        {/* Students & Valuation Progress */}
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid var(--amrita-gold)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Student Scripts
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
            {summaryMetrics.totalStudents}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            {summaryMetrics.totalEvaluated} / {summaryMetrics.totalStudents} Completed ({summaryMetrics.totalStudents ? Math.round((summaryMetrics.totalEvaluated / summaryMetrics.totalStudents) * 100) : 0}%)
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          2. ADVANCED FILTER & GLOBAL SEARCH BAR
         ──────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Top Row: Search input + View Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '450px' }}>
              <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                <SearchIcon />
              </div>
              <input
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '0.84rem' }}
                placeholder="Search by subject name, course code, faculty name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* View Mode Toggle Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>View:</span>
              <div style={{ display: 'inline-flex', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-subtle)', padding: '2px' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: viewMode === 'card' ? 700 : 500,
                    color: viewMode === 'card' ? 'var(--amrita-maroon)' : 'var(--text-secondary)',
                    background: viewMode === 'card' ? 'white' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: viewMode === 'card' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <GridIcon /> Grouped Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: viewMode === 'table' ? 700 : 500,
                    color: viewMode === 'table' ? 'var(--amrita-maroon)' : 'var(--text-secondary)',
                    background: viewMode === 'table' ? 'white' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <ListIcon /> Compact Table
                </button>
              </div>
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr)) auto',
            gap: '10px',
            alignItems: 'center',
            borderTop: '1px solid var(--border)',
            paddingTop: '12px'
          }}>
            {/* Department */}
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>
                Department
              </label>
              <select
                className="form-input"
                style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                value={filterCourse}
                onChange={e => setFilterCourse(e.target.value)}
              >
                {uniqueCourses.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Depts' : c}</option>)}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>
                Subject
              </label>
              <select
                className="form-input"
                style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                value={filterSubject}
                onChange={e => setFilterSubject(e.target.value)}
              >
                {uniqueSubjects.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Subjects' : s}</option>)}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>
                Semester
              </label>
              <select
                className="form-input"
                style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                value={filterSemester}
                onChange={e => setFilterSemester(e.target.value)}
              >
                {uniqueSemesters.map(sem => <option key={sem} value={sem}>{sem === 'ALL' ? 'All Sems' : `Sem ${sem}`}</option>)}
              </select>
            </div>

            {/* Section */}
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>
                Section
              </label>
              <select
                className="form-input"
                style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                value={filterSection}
                onChange={e => setFilterSection(e.target.value)}
              >
                {uniqueSections.map(sec => <option key={sec} value={sec}>{sec === 'ALL' ? 'All Secs' : `Sec ${sec}`}</option>)}
              </select>
            </div>

            {/* Exam Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>
                Exam Type
              </label>
              <select
                className="form-input"
                style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                value={filterExamType}
                onChange={e => setFilterExamType(e.target.value)}
              >
                {uniqueExamTypes.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>
                Status
              </label>
              <select
                className="form-input"
                style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published Only</option>
                <option value="UNPUBLISHED">Unpublished / Draft</option>
                <option value="FINAL_SUBMITTED">Final Submitted</option>
              </select>
            </div>

            {/* Reset Button */}
            <div style={{ alignSelf: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={resetFilters}
                style={{ fontSize: '0.75rem', padding: '6px 10px', height: '32px' }}
                title="Reset all search filters"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          BULK ACTIONS FLOATING TOOLBAR (Visible when selected > 0)
         ──────────────────────────────────────────────────────── */}
      {selectedExams.size > 0 && (
        <div style={{
          position: 'sticky', top: '10px', zIndex: 90,
          background: '#1e3a5f', color: 'white', padding: '12px 18px',
          borderRadius: 'var(--radius)', boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: 'var(--amrita-gold)', color: '#0f172a', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
              {selectedExams.size} Selected
            </span>
            <span style={{ fontSize: '0.84rem' }}>Manage selected examinations simultaneously:</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={() => handleBulkPublish(true)}
              disabled={bulkActionLoading}
            >
              Publish to Students
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => handleBulkPublish(false)}
              disabled={bulkActionLoading}
            >
              Unpublish Results
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
            >
              <TrashIcon /> Delete Selected
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ color: 'rgba(255,255,255,0.85)' }}
              onClick={() => setSelectedExams(new Set())}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          3. MAIN CONTENT: CARD VIEW VS TABLE VIEW
         ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading examination database...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            No examinations match the selected search or filter criteria.
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters} style={{ marginTop: '8px' }}>
            Clear Search &amp; Filters
          </button>
        </div>
      ) : viewMode === 'card' ? (
        /* ────────────────────────────────────────────────────────
            VIEW A: HIERARCHICAL GROUPED CARD VIEW (DEFAULT)
           ──────────────────────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {hierarchicalData.map(dept => {
            const deptKey = `dept_${dept.course}`;
            const isDeptCollapsed = Boolean(collapsedGroups[deptKey]);

            return (
              <div key={dept.course} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Level 1: Department Header Accordion */}
                <div
                  style={{
                    padding: '14px 20px',
                    background: 'var(--bg-subtle)',
                    borderBottom: isDeptCollapsed ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => toggleGroupCollapse(deptKey)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--amrita-maroon)' }}>
                      Department: {dept.course}
                    </h2>
                    <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
                      {dept.totalExams} Exam{dept.totalExams > 1 ? 's' : ''}
                    </span>
                    <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                      {dept.totalStudents} Student Script{dept.totalStudents > 1 ? 's' : ''}
                    </span>
                    <span className={`badge ${dept.publishedCount === dept.totalExams ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.72rem' }}>
                      {dept.publishedCount} / {dept.totalExams} Published
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {isDeptCollapsed ? 'Expand Department' : 'Collapse Department'}
                    </span>
                    <ChevronIcon open={!isDeptCollapsed} />
                  </div>
                </div>

                {/* Level 2: Subjects within Department */}
                {!isDeptCollapsed && (
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {dept.subjects.map(sub => {
                      const subKey = `sub_${dept.course}_${sub.subject}`;
                      const isSubCollapsed = Boolean(collapsedGroups[subKey]);

                      return (
                        <div key={sub.subject} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                          {/* Subject Header Accordion */}
                          <div
                            style={{
                              padding: '10px 16px',
                              background: '#f8fafc',
                              borderBottom: isSubCollapsed ? 'none' : '1px solid var(--border)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onClick={() => toggleGroupCollapse(subKey)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>
                                {sub.subject}
                              </h3>
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                ({sub.exams.length} cohort section{sub.exams.length > 1 ? 's' : ''} &nbsp;·&nbsp; {sub.totalStudents} students)
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {isSubCollapsed ? 'Show Cohorts' : 'Hide Cohorts'}
                              </span>
                              <ChevronIcon open={!isSubCollapsed} />
                            </div>
                          </div>

                          {/* Level 3: Individual Exam Cards Grid */}
                          {!isSubCollapsed && (
                            <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px', background: 'white' }}>
                              {sub.exams.map(exam => {
                                const totalRaw = (exam.questionWeightage || []).reduce((a, b) => a + b, 0);
                                const isSelected = selectedExams.has(exam._id);
                                const evalPercent = exam.studentCount ? Math.round(((exam.evaluatedCount || 0) / exam.studentCount) * 100) : 0;

                                return (
                                  <div
                                    key={exam._id}
                                    style={{
                                      border: `1.5px solid ${isSelected ? 'var(--amrita-maroon)' : 'var(--border)'}`,
                                      borderRadius: 'var(--radius)',
                                      padding: '14px',
                                      background: isSelected ? 'var(--accent-light)' : 'var(--bg-subtle)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between',
                                      gap: '12px',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                    }}
                                  >
                                    {/* Card Top: Checkbox, Cohort Details & Status */}
                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleSelectExam(exam._id)}
                                            style={{ cursor: 'pointer' }}
                                          />
                                          <span className="badge badge-maroon" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                            Sem {exam.semester} &nbsp;·&nbsp; Sec {exam.section}
                                          </span>
                                          <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
                                            {exam.examType}
                                          </span>
                                        </div>

                                        <span className={`badge ${exam.isPublished ? 'badge-green' : exam.finalSubmittedToAdmin ? 'badge-blue' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                                          {exam.isPublished ? 'Published' : exam.finalSubmittedToAdmin ? 'Locked / Admin' : 'Unpublished'}
                                        </span>
                                      </div>

                                      {/* Marks & Scale Conversion */}
                                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                        <strong>Marks:</strong> {totalRaw} Raw &rarr; Scale {exam.convertedScale || 30} &nbsp;
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                                          [{(exam.questionWeightage || []).join(', ')}]
                                        </span>
                                      </div>

                                      {/* Faculty Assignment */}
                                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        <strong>Faculty:</strong>{' '}
                                        {exam.facultyList && exam.facultyList.length > 0 ? (
                                          exam.facultyList.map(f => f.name).join(', ')
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                                        )}
                                      </div>

                                      {/* Student Progress Bar */}
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                                          <span>Evaluation Progress:</span>
                                          <span><strong>{exam.evaluatedCount || 0}</strong> / {exam.studentCount || 0} students ({evalPercent}%)</span>
                                        </div>
                                        <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                          <div style={{ width: `${evalPercent}%`, height: '100%', background: evalPercent === 100 ? '#16a34a' : 'var(--amrita-maroon)', transition: 'width 0.3s' }} />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${exam.isPublished ? 'btn-danger' : 'btn-success'}`}
                                        style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                                        onClick={() => handleTogglePublish(exam._id)}
                                      >
                                        {exam.isPublished ? 'Unpublish' : 'Publish Results'}
                                      </button>

                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        {exam.finalSubmittedToAdmin && (
                                          <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            style={{ fontSize: '0.72rem', padding: '4px 6px' }}
                                            title="Export AUMS Excel Report"
                                            onClick={() => handleExportAUMS(exam._id, `${exam.course}_${exam.subject}_Sem${exam.semester}`)}
                                          >
                                            <DownloadIcon />
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          className="btn btn-danger btn-sm"
                                          style={{ fontSize: '0.72rem', padding: '4px 6px' }}
                                          title="Delete Exam"
                                          onClick={() => handleDeleteExam(exam._id, `${exam.course} ${exam.subject} Sem ${exam.semester} Sec ${exam.section}`)}
                                        >
                                          <TrashIcon />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ────────────────────────────────────────────────────────
            VIEW B: COMPACT TABLE VIEW (FOR POWER USERS)
           ──────────────────────────────────────────────────────── */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ margin: 0, minWidth: '1050px' }}>
              <thead>
                <tr>
                  <th style={{ width: '36px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filteredExams.length > 0 && selectedExams.size === filteredExams.length}
                      onChange={() => handleSelectAll(filteredExams)}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Department &amp; Subject</th>
                  <th>Cohort</th>
                  <th>Type</th>
                  <th>Marks (Raw &rarr; Scale)</th>
                  <th>Faculty Assigned</th>
                  <th>Valuation Progress</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map(exam => {
                  const isSelected = selectedExams.has(exam._id);
                  const totalRaw = (exam.questionWeightage || []).reduce((a, b) => a + b, 0);
                  const evalPercent = exam.studentCount ? Math.round(((exam.evaluatedCount || 0) / exam.studentCount) * 100) : 0;

                  return (
                    <tr key={exam._id} style={{ background: isSelected ? 'var(--accent-light)' : undefined }}>
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectExam(exam._id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Department & Subject */}
                      <td>
                        <strong>{exam.subject}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Dept: {exam.course}
                        </div>
                      </td>

                      {/* Semester & Section */}
                      <td>
                        <span className="badge badge-gray" style={{ fontSize: '0.75rem' }}>
                          Sem {exam.semester} &nbsp;·&nbsp; Sec {exam.section}
                        </span>
                      </td>

                      {/* Exam Type */}
                      <td>
                        <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
                          {exam.examType}
                        </span>
                      </td>

                      {/* Marks */}
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.8rem' }}>
                        <strong>{totalRaw}</strong> &rarr; {exam.convertedScale || 30}
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          [{(exam.questionWeightage || []).join(', ')}]
                        </div>
                      </td>

                      {/* Faculty */}
                      <td style={{ fontSize: '0.78rem' }}>
                        {exam.facultyList && exam.facultyList.length > 0 ? (
                          exam.facultyList.map(f => f.name).join(', ')
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                        )}
                      </td>

                      {/* Progress */}
                      <td style={{ minWidth: '130px' }}>
                        <div style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span>{exam.evaluatedCount || 0}/{exam.studentCount || 0}</span>
                          <span>{evalPercent}%</span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${evalPercent}%`, height: '100%', background: evalPercent === 100 ? '#16a34a' : 'var(--amrita-maroon)' }} />
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td>
                        <span className={`badge ${exam.isPublished ? 'badge-green' : exam.finalSubmittedToAdmin ? 'badge-blue' : 'badge-amber'}`}>
                          {exam.isPublished ? 'Published' : exam.finalSubmittedToAdmin ? 'Locked' : 'Draft'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${exam.isPublished ? 'btn-danger' : 'btn-success'}`}
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                            onClick={() => handleTogglePublish(exam._id)}
                          >
                            {exam.isPublished ? 'Unpublish' : 'Publish'}
                          </button>

                          {exam.finalSubmittedToAdmin && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.72rem', padding: '3px 6px' }}
                              title="Export AUMS Excel"
                              onClick={() => handleExportAUMS(exam._id, `${exam.course}_${exam.subject}_Sem${exam.semester}`)}
                            >
                              <DownloadIcon />
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            style={{ fontSize: '0.72rem', padding: '3px 6px' }}
                            title="Delete Exam"
                            onClick={() => handleDeleteExam(exam._id, `${exam.course} ${exam.subject} Sem ${exam.semester} Sec ${exam.section}`)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
