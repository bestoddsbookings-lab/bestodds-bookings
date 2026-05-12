import React, { useEffect, useState } from 'react';
import { get, put } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    try {
      const me = await get('/auth/me');
      setProfile(me.user);
      setName(me.user.name || '');
      setEmail(me.user.email || '');
    } catch (e) {
      // not authenticated
      navigate('/login');
    }
  }

  async function save(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await put('/auth/me', { name, email });
      alert('Profile updated (email change requires re-verification)');
      await fetchProfile();
    } catch (err) { alert(err.message || 'Update failed'); }
    finally { setLoading(false); }
  }

  if (!profile) return null;

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <h2>Profile</h2>
      <div className="card">
        <form onSubmit={save}>
          <div>
            <label>Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div style={{ marginTop: 8 }}>
            <label>Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
