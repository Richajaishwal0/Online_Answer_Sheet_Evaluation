import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../components/AuthLayout';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await axios.post('/api/admin/login', form);
      localStorage.setItem('adminToken', res.data.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout
      roleTag="Administration Portal"
      hint="admin1@gmail.com  ·  admin123"
      links={[
        { href: '/faculty/login', label: 'Faculty Login' },
        { href: '/student/login', label: 'Student Login' },
      ]}
    >
      <h2 className="auth-form-title">Sign In</h2>
      <p className="auth-form-sub">Enter your credentials to access the admin console.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            className="form-input"
            type="email"
            placeholder="admin@amrita.edu"
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
