import React, { useState } from 'react';
import AuthIllustration from '../components/AuthIllustration';
import { post } from '../services/api';
import { setToken } from '../utils/auth';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const res = await post('/auth/login', { email, password });
      setToken(res.token);
      setMessage('Logged in');
      navigate('/dashboard');
    } catch (err) {
      setMessage(err?.data?.message || err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 480, maxWidth: '94%', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <AuthIllustration size={88} />
          <div className="logo" style={{ justifyContent: 'center' }}>
            <div>BestOddsGH</div>
          </div>
        </div>

        <h2 style={{ marginTop: 6, textAlign: 'center' }}>Sign in to your account</h2>
        <p className="muted">Enter your credentials to access booking codes and live odds.</p>

        <form onSubmit={submit} style={{ marginTop: 12 }}>
          <div className="form-group">
            <label>Email</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} required type="email" />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input className="input" value={password} onChange={e => setPassword(e.target.value)} required type="password" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <div>
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
            </div>
            <div style={{ fontSize: 14 }}>
              <Link to="/resend" className="muted">Forgot password?</Link>
            </div>
          </div>
        </form>

        {message && <div style={{ marginTop: 12 }} className="card" style={{ padding: 10, background: 'rgba(255,255,255,0.02)' }}>{message}</div>}

        <div style={{ marginTop: 12, fontSize: 14 }} className="muted">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
