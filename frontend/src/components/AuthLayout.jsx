import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function AuthLayout({ roleTag, hint, links, children }) {
  const theme = useTheme();
  const dark = theme?.dark ?? false;
  const toggleTheme = theme?.toggle ?? (() => {});

  return (
    <div className="auth-root">

      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <Link to="/" className="auth-back-link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Portal Overview
          </Link>

          <div className="auth-left-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="auth-left-title">Amrita University</h1>
          <p className="auth-left-sub">Examination Cell · Answer Sheet Evaluation</p>

          <div className="auth-left-divider" />

          <ul className="auth-left-points">
            <li>
              <span className="auth-left-point-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              Secure role-based access
            </li>
            <li>
              <span className="auth-left-point-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              Automated answer sheet distribution
            </li>
            <li>
              <span className="auth-left-point-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              Real-time evaluation tracking
            </li>
          </ul>
        </div>

        <p className="auth-left-copy">© {new Date().getFullYear()} Amrita Vishwa Vidyapeetham</p>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-right-inner">
          <div className="auth-right-header">
            <span className="auth-role-tag">{roleTag}</span>
            <button
              type="button"
              className="topbar-icon-btn topbar-icon-btn-clickable auth-theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${dark ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme"
            >
              {dark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>

          <div className="auth-right-body">
            {children}
          </div>

          {hint && (
            <div className="auth-card-hint">
              <span className="auth-hint-label">Demo</span>
              <span className="auth-hint-value">{hint}</span>
            </div>
          )}

          <div className="auth-footer-links">
            <Link to="/" style={{ color: 'var(--accent)', fontWeight: 500 }}>← Portal Home</Link>
            {links?.length > 0 && <span className="auth-footer-sep">·</span>}
            {links?.map((l, i) => (
              <span key={l.href}>
                {i > 0 && <span className="auth-footer-sep">·</span>}
                <a href={l.href}>{l.label}</a>
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
