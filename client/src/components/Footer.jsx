import React, { useState } from 'react';

export default function Footer() {
  const API_BASE = process.env.REACT_APP_API_URL || 'https://bestodds-bookings.onrender.com';
  const logoUrl = `${API_BASE}/uploads/MP_LORD_LOGO.jpeg`;
  const [logoOk, setLogoOk] = useState(true);

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          {logoOk ? (
            <img className="brand-mark-img" src={logoUrl + `?t=${Date.now()}`} alt="MP_LORDTECH logo" onError={() => setLogoOk(false)} />
          ) : (
            <div className="brand-mark">MP</div>
          )}

          <div style={{ marginLeft: 12 }}>
            <div className="brand-title">BestOddsGH</div>
            <div className="brand-sub">Designed by MP_LORDTECH</div>
          </div>
        </div>

        <div className="footer-links">
          <a href="/">Home</a>
          <a href="/offers">Offers</a>
          <a href="/support">Support</a>
        </div>

        <div className="footer-right">© {new Date().getFullYear()} BestOddsGH</div>
      </div>
    </footer>
  );
}
