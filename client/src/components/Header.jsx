import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getToken, clearToken } from '../utils/auth';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const token = getToken();
  const firstLinkRef = useRef(null);

  useEffect(() => {
    // close mobile menu when route changes
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    // prevent background scroll when mobile menu open
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => firstLinkRef.current && firstLinkRef.current.focus(), 120);
    } else {
      document.body.style.overflow = '';
    }
  }, [open]);

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand"><Link to="/">BestOddsGH</Link></div>

        <button
          className={`hamburger ${open ? 'is-open' : ''}`}
          aria-label="Toggle navigation"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(o => !o)}
        >
          <span className="hamburger-box">
            <span className="hamburger-inner" />
          </span>
        </button>

        <nav id="main-nav" className={`nav ${open ? 'open' : ''}`}>
          <ul>
            <li><Link to="/" ref={firstLinkRef}>Home</Link></li>
            {token ? (
              <>
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><Link to="/profile">Profile</Link></li>
              <li><Link to="/purchases">My Purchases</Link></li>
              <li><Link to="/support">Support</Link></li>
              <li><button onClick={handleLogout} className="nav-logout">Logout</button></li>
              </>
            ) : (
              <>
              <li><Link to="/register">Register</Link></li>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/resend">Resend</Link></li>
              <li><Link to="/support">Support</Link></li>
              </>
            )}
          </ul>
        </nav>
      </div>

      {open && <div className="mobile-overlay" onClick={() => setOpen(false)} aria-hidden="true" />}
    </header>
  );
};

export default Header;