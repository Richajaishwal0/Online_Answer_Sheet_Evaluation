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

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
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

const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export default function FacultyAssignmentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'table'
  const [actionMessage, setActionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterSemester, setFilterSemester] = useState('ALL');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'PENDING' | 'DRAFT' | 'COMPLETED' | 'LOCKED' | 'UNLOCK_REQUESTED'

  // Accordion state: Map of keys e.g. "dept_CSE" -> boolean
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/faculty/assignments', {
        headers: { Authorization: `Bearer ${localStorage.getItem('facultyToken')}` }
      });
      setItems(response.data.data || []);
    } catch (error) {
      console.error(error);
      setErrorMessage(error.response?.data?.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleGroupCollapse = (key) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // ----------------------------------------------------
  // Valuation & In-Charge Actions
  // ----------------------------------------------------
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
      setActionMessage(pub ? 'Results published to students for review!' : 'Student review unpublished.');
      await load();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Publish toggle failed.');
    }
  };

  const handleHandover = async (examId) => {
    try {
      setActionMessage('');
      setErrorMessage('');
      const res = await axios.post(
        `/api/faculty/exams/${examId}/handover`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('facultyToken')}` } }
      );
      setActionMessage(res.data.data?.message || 'Paper evaluations handed over to Course Handling Faculty successfully.');
      await load();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Handover failed.');
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

  // ----------------------------------------------------
  // Filtering & Search Logic
  // ----------------------------------------------------
  const uniqueCourses = useMemo(() => ['ALL', ...new Set(items.map(i => i.course).filter(Boolean))], [items]);
  const uniqueSubjects = useMemo(() => ['ALL', ...new Set(items.map(i => i.subject).filter(Boolean))], [items]);
  const uniqueSemesters = useMemo(() => ['ALL', ...new Set(items.map(i => String(i.semester)).filter(Boolean))], [items]);
  const uniqueSections = useMemo(() => ['ALL', ...new Set(items.map(i => i.section).filter(Boolean))], [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Global search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (item.studentName || '').toLowerCase().includes(q) ||
          (item.registrationNumber || '').toLowerCase().includes(q) ||
          (item.subject || '').toLowerCase().includes(q) ||
          (item.course || '').toLowerCase().includes(q) ||
          (item.section || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Dropdown filters
      if (filterCourse !== 'ALL' && item.course !== filterCourse) return false;
      if (filterSubject !== 'ALL' && item.subject !== filterSubject) return false;
      if (filterSemester !== 'ALL' && String(item.semester) !== filterSemester) return false;
      if (filterSection !== 'ALL' && item.section !== filterSection) return false;
      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;

      return true;
    });
  }, [items, searchQuery, filterCourse, filterSubject, filterSemester, filterSection, filterStatus]);

  // ----------------------------------------------------
  // Summary Metrics Calculation
  // ----------------------------------------------------
  const summaryMetrics = useMemo(() => {
    const totalAssigned = items.length;
    const completedCount = items.filter(i => i.status === 'COMPLETED' || i.status === 'LOCKED').length;
    const pendingCount = items.filter(i => i.status === 'PENDING').length;
    const draftCount = items.filter(i => i.status === 'DRAFT' || i.status === 'IN_PROGRESS' || i.status === 'UNLOCK_REQUESTED').length;

    const uniqueDepts = new Set(items.map(i => i.course).filter(Boolean)).size;
    const uniqueSubs = new Set(items.map(i => i.subject).filter(Boolean)).size;
    const uniqueExams = new Set(items.map(i => i.examId?.toString()).filter(Boolean)).size;

    return {
      totalAssigned,
      completedCount,
      pendingCount,
      draftCount,
      uniqueDepts,
      uniqueSubs,
      uniqueExams
    };
  }, [items]);

  // ----------------------------------------------------
  // Hierarchical Grouping: Department -> Subject -> Exam Cohorts
  // ----------------------------------------------------
  const hierarchicalData = useMemo(() => {
    // Map: Dept -> Map: Subject -> Map: ExamId -> Exam Cohort Data
    const deptMap = new Map();

    for (const item of filteredItems) {
      const deptKey = item.course || 'General Department';
      const subKey = item.subject || 'General Subject';
      const examKey = item.examId ? item.examId.toString() : `unknown-${item.examName}`;

      if (!deptMap.has(deptKey)) {
        deptMap.set(deptKey, new Map());
      }
      const subMap = deptMap.get(deptKey);

      if (!subMap.has(subKey)) {
        subMap.set(subKey, new Map());
      }
      const examCohortMap = subMap.get(subKey);

      if (!examCohortMap.has(examKey)) {
        examCohortMap.set(examKey, {
          examId: item.examId,
          examName: item.examName,
          examContext: item.examContext,
          course: item.course,
          subject: item.subject,
          semester: item.semester,
          section: item.section,
          examType: item.examType,
          finalSubmittedToAdmin: item.finalSubmittedToAdmin,
          isPublished: item.isPublished,
          isCourseInCharge: item.isCourseInCharge,
          courseInChargeName: item.courseInChargeName,
          handedOverFacultyIds: item.handedOverFacultyIds || [],
          isHandedOver: item.isHandedOver,
          allCoEvaluatorsHandedOver: item.allCoEvaluatorsHandedOver,
          sheets: []
        });
      }

      examCohortMap.get(examKey).sheets.push(item);
    }

    // Transform into clean iterable array
    const hierarchy = [];
    for (const [course, subjects] of deptMap) {
      const subjectList = [];
      let deptSheets = 0;
      let deptCompleted = 0;

      for (const [subject, cohorts] of subjects) {
        const cohortList = [];
        let subSheets = 0;
        let subCompleted = 0;

        for (const [, cohort] of cohorts) {
          const completedInCohort = cohort.sheets.filter(s => s.status === 'COMPLETED' || s.status === 'LOCKED').length;
          subSheets += cohort.sheets.length;
          subCompleted += completedInCohort;

          cohortList.push({
            ...cohort,
            totalCount: cohort.sheets.length,
            completedCount: completedInCohort,
            percent: cohort.sheets.length ? Math.round((completedInCohort / cohort.sheets.length) * 100) : 0
          });
        }

        deptSheets += subSheets;
        deptCompleted += subCompleted;

        subjectList.push({
          subject,
          cohorts: cohortList,
          totalCount: subSheets,
          completedCount: subCompleted,
          percent: subSheets ? Math.round((subCompleted / subSheets) * 100) : 0
        });
      }

      hierarchy.push({
        course,
        subjects: subjectList,
        totalCount: deptSheets,
        completedCount: deptCompleted,
        percent: deptSheets ? Math.round((deptCompleted / deptSheets) * 100) : 0
      });
    }

    return hierarchy;
  }, [filteredItems]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCourse('ALL');
    setFilterSubject('ALL');
    setFilterSemester('ALL');
    setFilterSection('ALL');
    setFilterStatus('ALL');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1>Assigned Valuation Tasks &amp; Course In-Charge Portal</h1>
        <p>Hierarchical oversight of assigned student answer sheets, grading progress, publishing for student review, and submitting final marks to Admin.</p>
      </div>

      {actionMessage && <div className="alert alert-success">{actionMessage}</div>}
      {errorMessage && <div className="alert alert-error">{errorMessage}</div>}

      {/* ────────────────────────────────────────────────────────
          1. TOP SUMMARY METRIC CARDS
         ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Total Assigned */}
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid var(--amrita-maroon)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Assigned Scripts
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
            {summaryMetrics.totalAssigned}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            Across {summaryMetrics.uniqueExams} cohort section(s)
          </div>
        </div>

        {/* Evaluation Progress */}
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Valuation Completed
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', margin: '4px 0' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#166534' }}>
              {summaryMetrics.completedCount}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              / {summaryMetrics.totalAssigned} Scripts
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 600 }}>
            {summaryMetrics.totalAssigned ? Math.round((summaryMetrics.completedCount / summaryMetrics.totalAssigned) * 100) : 0}% Valuation Finished
          </div>
        </div>

        {/* In Progress / Pending */}
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #d97706' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pending &amp; In-Progress
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', margin: '4px 0' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706' }}>
              {summaryMetrics.pendingCount + summaryMetrics.draftCount}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Remaining
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            {summaryMetrics.draftCount} in Draft &nbsp;·&nbsp; {summaryMetrics.pendingCount} Pending
          </div>
        </div>

        {/* Academic Scope */}
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Curricula
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a8a', margin: '4px 0' }}>
            {summaryMetrics.uniqueSubs}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            Subject(s) across {summaryMetrics.uniqueDepts} Department(s)
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          2. ADVANCED FILTER & SEARCH BAR
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
                placeholder="Search by student name, roll number, subject, section..."
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
                  <GridIcon /> Grouped Cohorts
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
                  <ListIcon /> Flat Student List
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

            {/* Valuation Status */}
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
                <option value="PENDING">Pending</option>
                <option value="DRAFT">Draft / In Progress</option>
                <option value="COMPLETED">Completed / Submitted</option>
                <option value="LOCKED">Locked</option>
                <option value="UNLOCK_REQUESTED">Unlock Requested</option>
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
          3. MAIN CONTENT: GROUPED CARDS VS FLAT TABLE
         ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading assigned valuation tasks...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            No assigned answer sheets match the selected filter criteria.
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters} style={{ marginTop: '8px' }}>
            Clear Search &amp; Filters
          </button>
        </div>
      ) : viewMode === 'card' ? (
        /* ────────────────────────────────────────────────────────
            VIEW A: HIERARCHICAL GROUPED CARDS (DEFAULT)
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
                      {dept.subjects.length} Subject{dept.subjects.length > 1 ? 's' : ''}
                    </span>
                    <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                      {dept.totalCount} Script{dept.totalCount > 1 ? 's' : ''}
                    </span>
                    <span className={`badge ${dept.completedCount === dept.totalCount ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.72rem' }}>
                      {dept.completedCount} / {dept.totalCount} Evaluated ({dept.percent}%)
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
                                ({sub.cohorts.length} cohort section{sub.cohorts.length > 1 ? 's' : ''} &nbsp;·&nbsp; {sub.completedCount}/{sub.totalCount} evaluated)
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {isSubCollapsed ? 'Show Cohorts' : 'Hide Cohorts'}
                              </span>
                              <ChevronIcon open={!isSubCollapsed} />
                            </div>
                          </div>

                          {/* Level 3: Individual Exam Cohort Section Cards */}
                          {!isSubCollapsed && (
                            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white' }}>
                              {sub.cohorts.map(cohort => (
                                <div
                                  key={cohort.examId}
                                  style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)',
                                    padding: '14px',
                                    background: 'var(--bg-subtle)'
                                  }}
                                >
                                  {/* Cohort Header & Controls */}
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '12px',
                                    paddingBottom: '12px',
                                    marginBottom: '12px',
                                    borderBottom: '1px solid var(--border)'
                                  }}>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                        <span className="badge badge-maroon" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                          Sem {cohort.semester} &nbsp;·&nbsp; Sec {cohort.section}
                                        </span>
                                        <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
                                          {cohort.examType}
                                        </span>
                                        <span className={`badge ${cohort.isCourseInCharge ? 'badge-maroon' : 'badge-blue'}`} style={{ fontSize: '0.72rem' }}>
                                          {cohort.isCourseInCharge ? 'Course Handling Faculty (In-Charge)' : `Co-Evaluator (In-Charge: ${cohort.courseInChargeName || 'Faculty'})`}
                                        </span>
                                        <span className={`badge ${cohort.finalSubmittedToAdmin ? 'badge-amber' : 'badge-blue'}`} style={{ fontSize: '0.72rem' }}>
                                          {cohort.finalSubmittedToAdmin ? 'Final Submitted to Admin (Locked)' : 'Valuation In-Progress'}
                                        </span>
                                        <span className={`badge ${cohort.isPublished ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.72rem' }}>
                                          {cohort.isPublished ? 'Results Published for Student Review' : 'Student Review Unpublished'}
                                        </span>
                                      </div>

                                      {/* Valuation Progress Bar */}
                                      <div style={{ marginTop: '8px', maxWidth: '300px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                                          <span>Valuation Progress:</span>
                                          <span><strong>{cohort.completedCount}</strong> / {cohort.totalCount} scripts ({cohort.percent}%)</span>
                                        </div>
                                        <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                          <div style={{ width: `${cohort.percent}%`, height: '100%', background: cohort.percent === 100 ? '#16a34a' : 'var(--amrita-maroon)', transition: 'width 0.3s' }} />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Actions: Restricted to Course Handling Faculty */}
                                    {cohort.isCourseInCharge ? (
                                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {/* Publish for Student Review */}
                                        <button
                                          type="button"
                                          className={`btn btn-sm ${cohort.isPublished ? 'btn-danger' : 'btn-success'}`}
                                          disabled={cohort.finalSubmittedToAdmin || (!cohort.isPublished && (cohort.completedCount < cohort.totalCount || !cohort.allCoEvaluatorsHandedOver))}
                                          onClick={() => handleTogglePublish(cohort.examId)}
                                          style={{
                                            fontSize: '0.74rem', padding: '5px 10px',
                                            opacity: cohort.finalSubmittedToAdmin || (!cohort.isPublished && (cohort.completedCount < cohort.totalCount || !cohort.allCoEvaluatorsHandedOver)) ? 0.5 : 1,
                                            cursor: cohort.finalSubmittedToAdmin || (!cohort.isPublished && (cohort.completedCount < cohort.totalCount || !cohort.allCoEvaluatorsHandedOver)) ? 'not-allowed' : 'pointer'
                                          }}
                                          title={!cohort.isPublished && (cohort.completedCount < cohort.totalCount || !cohort.allCoEvaluatorsHandedOver) ? (!cohort.allCoEvaluatorsHandedOver ? 'Cannot publish: Co-faculty has not handed over paper evaluations for this section yet.' : 'Cannot publish: You must complete 100% of your assigned questions first.') : ''}
                                        >
                                          {cohort.isPublished ? 'Unpublish Student Review' : 'Publish for Student Review'}
                                        </button>

                                        {/* Submit to Admin */}
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-primary"
                                          onClick={() => handleFinalSubmit(cohort.examId)}
                                          disabled={cohort.finalSubmittedToAdmin || !cohort.isPublished}
                                          style={{
                                            fontSize: '0.74rem', padding: '5px 10px',
                                            opacity: (cohort.finalSubmittedToAdmin || !cohort.isPublished) ? 0.5 : 1,
                                            cursor: (cohort.finalSubmittedToAdmin || !cohort.isPublished) ? 'not-allowed' : 'pointer'
                                          }}
                                          title={!cohort.isPublished ? 'You must Publish for Student Review first before submitting to Admin' : ''}
                                        >
                                          {cohort.finalSubmittedToAdmin ? 'Submitted to Admin' : 'Submit to Admin'}
                                        </button>

                                        {/* Export AUMS Excel */}
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-secondary"
                                          onClick={() => handleExportAUMS(cohort.examId, cohort.examName)}
                                          disabled={!cohort.finalSubmittedToAdmin}
                                          style={{
                                            fontSize: '0.74rem', padding: '5px 10px',
                                            opacity: !cohort.finalSubmittedToAdmin ? 0.5 : 1,
                                            cursor: !cohort.finalSubmittedToAdmin ? 'not-allowed' : 'pointer'
                                          }}
                                          title={!cohort.finalSubmittedToAdmin ? 'You must Submit marks to Admin first before downloading Excel report' : ''}
                                        >
                                          <DownloadIcon /> Export AUMS Excel
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {cohort.isHandedOver ? (
                                          <span className="badge badge-green" style={{ padding: '6px 12px', fontSize: '0.74rem' }}>
                                            Handed Over to Course In-Charge ({cohort.courseInChargeName || 'Course Handling Faculty'}) ✅
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-primary"
                                            onClick={() => handleHandover(cohort.examId)}
                                            disabled={cohort.completedCount < cohort.totalCount}
                                            style={{
                                              fontSize: '0.74rem', padding: '6px 12px',
                                              opacity: cohort.completedCount < cohort.totalCount ? 0.5 : 1,
                                              cursor: cohort.completedCount < cohort.totalCount ? 'not-allowed' : 'pointer'
                                            }}
                                            title={cohort.completedCount < cohort.totalCount ? 'All assigned section papers must be 100% evaluated before handing over' : ''}
                                          >
                                            Handover Evaluation to Course In-Charge ({cohort.courseInChargeName || 'Course Handling Faculty'}) 🤝
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Answer Sheets Table */}
                                  <table className="data-table" style={{ background: 'white' }}>
                                    <thead>
                                      <tr>
                                        <th>Student</th>
                                        <th>Assigned Questions</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {cohort.sheets.map(item => (
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
                                          <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                            <button
                                              type="button"
                                              className="btn btn-primary btn-sm"
                                              style={{ fontSize: '0.74rem', padding: '3px 9px' }}
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
                              ))}
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
            VIEW B: FLAT STUDENT LIST TABLE
           ──────────────────────────────────────────────────────── */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ margin: 0, minWidth: '950px' }}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Department &amp; Subject</th>
                  <th>Cohort</th>
                  <th>Assigned Qs</th>
                  <th>Valuation Status</th>
                  <th>Admin Lock</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.sheetId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/faculty/evaluate/${item.sheetId}`)}>
                    {/* Student */}
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

                    {/* Subject & Department */}
                    <td>
                      <strong>{item.subject}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Dept: {item.course}
                      </div>
                    </td>

                    {/* Cohort */}
                    <td>
                      <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
                        Sem {item.semester} &nbsp;·&nbsp; Sec {item.section}
                      </span>
                    </td>

                    {/* Assigned Questions */}
                    <td>
                      <span className="badge badge-maroon">{item.questionRange}</span>
                    </td>

                    {/* Valuation Status */}
                    <td>
                      <StatusBadge status={item.status} />
                    </td>

                    {/* Admin Lock Status */}
                    <td>
                      <span className={`badge ${item.finalSubmittedToAdmin ? 'badge-amber' : 'badge-blue'}`} style={{ fontSize: '0.7rem' }}>
                        {item.finalSubmittedToAdmin ? 'Locked' : 'Open'}
                      </span>
                    </td>

                    {/* Action Button */}
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.72rem', padding: '3px 8px' }}
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
        </div>
      )}

    </div>
  );
}
