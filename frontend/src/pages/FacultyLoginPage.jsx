import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../components/AuthLayout';

export default function FacultyLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await axios.post('/api/faculty/login', form);
      localStorage.setItem('facultyToken', res.data.data.token);
      navigate('/faculty/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout
      roleTag="Faculty Portal"
      hint="dr.a01@gmail.com  ·  faculty123"
      links={[
        { href: '/login', label: 'Admin Login' },
        { href: '/student/login', label: 'Student Login' },
      ]}
    >
      <h2 className="auth-form-title">Sign In</h2>
      <p className="auth-form-sub">Enter your credentials to access the faculty portal.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            className="form-input"
            type="email"
            placeholder="faculty@amrita.edu"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="input-wrapper">
            <input
              className="form-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
              style={{ paddingRight: '56px' }}
            />
            <button type="button" className="input-toggle" onClick={() => setShowPassword(p => !p)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '6px' }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </AuthLayout>
  );
}
