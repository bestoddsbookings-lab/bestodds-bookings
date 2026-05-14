import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const navigate = useNavigate();

  function submit(e) {
    e.preventDefault();
    if (!user || !pass) return;
    // Call server to exchange creds for token
    (async () => {
      try {
        const { token } = await (await import('../services/adminApi')).adminLogin(user, pass);
        if (token) {
          localStorage.setItem('admin_token', token);
          localStorage.setItem('admin_user', user);
          localStorage.setItem('admin_pass', pass);
          navigate('/admin/dashboard');
        }
      } catch (err) {
        alert('Admin login failed');
      }
    })();
  }

  return (
    <div className="auth-root">
      <div className="auth-card card glass-form">
        <h2 style={{ marginBottom: 12 }}>Admin Login</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Admin Username</label>
            <input className="input" value={user} onChange={(e) => setUser(e.target.value)} placeholder="Username" />
          </div>
          <div className="form-group">
            <label>Admin Password</label>
            <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" />
          </div>
          <div className="form-actions">
            <button className="btn" type="submit">Enter Admin</button>
          </div>
        </form>
      </div>
    </div>
  );
}
