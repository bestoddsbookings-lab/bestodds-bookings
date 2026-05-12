import React, { useEffect, useState } from 'react';
import { get } from '../services/api';

export default function Navbar({ email, onLogout }) {
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const a = await get('/assets/current');
        if (!mounted) return;
        if (a && a.assets && a.assets.logo && a.assets.logo.url) {
          const url = a.assets.logo.url + (a.assets.logo.fallback ? `?t=${Date.now()}` : '');
          setLogo(url);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false };
  }, []);

  return (
    <header style={{ padding: '12px 18px' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="logo">
          {logo ? (
            <img src={logo} alt="logo" style={{ height: 40, borderRadius: 8 }} />
          ) : (
            <img src="/uploads/BestOdds_favicon.png" alt="logo" style={{ height: 40, borderRadius: 8 }} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ opacity: 0.9, color: 'var(--muted)' }}>{email}</div>
          <button className="btn" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}
