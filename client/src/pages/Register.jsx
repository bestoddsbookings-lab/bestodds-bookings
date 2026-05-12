import React, { useState } from 'react';
import AuthIllustration from '../components/AuthIllustration';
import { post } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      await post('/auth/register', { email, password, name });
      // Try to auto-login after register. If verification required, this may fail.
        try {
        const loginRes = await post('/auth/login', { email, password });
        if (loginRes && loginRes.token) {
          const { setToken } = await import('../utils/auth');
          setToken(loginRes.token);
          navigate('/dashboard');
          return;
        }
      } catch (loginErr) {
        // ignore - fallback to verification message
      }
      setMessage('Registration complete. Verification email sent — check your inbox.');
    } catch (err) {
      setMessage(err?.data?.message || err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 520, maxWidth: '96%', padding: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <AuthIllustration size={88} />
          <h2>Create an account</h2>
          <p className="muted">Register to access booking codes and curated odds. You'll be asked to verify your email.</p>
        </div>

        <form onSubmit={submit} style={{ marginTop: 12 }}>
          <div className="form-group">
            <label>Email</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} required type="email" />
          </div>

          <div className="form-group">
            <label>Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input className="input" value={password} onChange={e => setPassword(e.target.value)} required type="password" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div>
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
            </div>
            <div style={{ fontSize: 14 }} className="muted">Already have an account? <Link to="/login">Sign in</Link></div>
          </div>
        </form>

        {message && <div style={{ marginTop: 12 }} className="card" style={{ padding: 10, background: 'rgba(255,255,255,0.02)' }}>{message}</div>}
      </div>
    </div>
  );
}
