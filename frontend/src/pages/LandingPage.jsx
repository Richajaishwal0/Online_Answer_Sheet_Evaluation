import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const dark = theme?.dark ?? false;
  const toggleTheme = theme?.toggle ?? (() => {});

  // Active session check
  const [activeAdmin, setActiveAdmin] = useState(false);
  const [activeFaculty, setActiveFaculty] = useState(false);
  const [activeStudent, setActiveStudent] = useState(false);

  useEffect(() => {
    try {
      setActiveAdmin(Boolean(localStorage.getItem('adminToken')));
      setActiveFaculty(Boolean(localStorage.getItem('facultyToken')));
      setActiveStudent(Boolean(localStorage.getItem('studentToken')));
    } catch {
      // storage unavailable
    }
  }, []);

  return (
    <div className="landing-root home-minimal-root">
      {/* ─────────────────────────────────────────
          HEADER
      ───────────────────────────────────────── */}
      <header className="gov-header">
        <div className="gov-container gov-header-inner">
          <div className="gov-brand" onClick={() => navigate('/')}>
            <div className="gov-logo-mark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="gov-brand-text">
              <span className="gov-brand-name">Amrita Vishwa Vidyapeetham</span>
              <span className="gov-brand-sub">Examination Valuation System</span>
            </div>
          </div>

          <div className="gov-header-actions">
            <button
              className="gov-theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${dark ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme"
            >
              {dark ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              <span className="gov-theme-text">{dark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────
          ACTIVE SESSION NOTIFIER (IF LOGGED IN)
      ───────────────────────────────────────── */}
      {(activeAdmin || activeFaculty || activeStudent) && (
        <div className="gov-active-bar">
          <div className="gov-container gov-active-inner">
            <span className="gov-active-msg">
              <strong>Active Session:</strong> You are currently logged into an account.
            </span>
            <div className="gov-active-links">
              {activeAdmin && <Link to="/dashboard" className="gov-active-link">Admin Dashboard →</Link>}
              {activeFaculty && <Link to="/faculty/dashboard" className="gov-active-link">Faculty Workplace →</Link>}
              {activeStudent && <Link to="/student/dashboard" className="gov-active-link">Student Portal →</Link>}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          MAIN HERO & ROLE PORTALS
      ───────────────────────────────────────── */}
      <main className="gov-hero home-minimal-hero">
        <div className="gov-container">
          <div className="gov-hero-header">
            <div className="gov-kicker">CENTRALIZED EVALUATION PLATFORM</div>
            <h1 className="gov-hero-title">Online Answer Sheet Valuation System</h1>
            <p className="gov-hero-desc">
              Select your designated institutional role below to access the examination evaluation and result services.
            </p>
          </div>

          {/* 3 Role Portals Grid */}
          <div className="gov-portals-grid" id="portals">
            {/* Faculty Portal Card */}
            <div className="gov-portal-box faculty" onClick={() => navigate('/faculty/login')}>
              <div className="gov-portal-box-top">
                <div className="gov-portal-icon-wrap faculty">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <span className="gov-portal-role-tag faculty">FACULTY</span>
              </div>
              <h3 className="gov-portal-heading">Faculty Evaluator Portal</h3>
              <p className="gov-portal-summary">
                Grade assigned questions in the synchronized 3-panel workspace with side-by-side answer script and answer key viewers.
              </p>
              <div className="gov-portal-action">
                <span>Sign In to Faculty Workplace</span>
                <span className="gov-arrow">→</span>
              </div>
            </div>

            {/* Student Portal Card */}
            <div className="gov-portal-box student" onClick={() => navigate('/student/login')}>
              <div className="gov-portal-box-top">
                <div className="gov-portal-icon-wrap student">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </div>
                <span className="gov-portal-role-tag student">STUDENT</span>
              </div>
              <h3 className="gov-portal-heading">Student Results Portal</h3>
              <p className="gov-portal-summary">
                View published examination scorecards, question-wise mark breakdowns, evaluator remarks, and normalized final scores.
              </p>
              <div className="gov-portal-action">
                <span>Sign In to Student Results</span>
                <span className="gov-arrow">→</span>
              </div>
            </div>

            {/* Admin Portal Card */}
            <div className="gov-portal-box admin" onClick={() => navigate('/login')}>
              <div className="gov-portal-box-top">
                <div className="gov-portal-icon-wrap admin">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <span className="gov-portal-role-tag admin">ADMINISTRATION</span>
              </div>
              <h3 className="gov-portal-heading">Examination Cell Console</h3>
              <p className="gov-portal-summary">
                Excel data import, faculty mapping, evaluation unlock moderation, result publishing, and system audit logs.
              </p>
              <div className="gov-portal-action">
                <span>Sign In as Administrator</span>
                <span className="gov-arrow">→</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────
          FOOTER
      ───────────────────────────────────────── */}
      <footer className="gov-footer home-minimal-footer">
        <div className="gov-container gov-footer-bottom-inner">
          <span>© {new Date().getFullYear()} Amrita Vishwa Vidyapeetham · Office of the Controller of Examinations</span>
          <span className="gov-footer-badge">Centralized Examination & Valuation System</span>
        </div>
      </footer>
    </div>
  );
}
