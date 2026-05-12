import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/index.css';

const Home = () => {
    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const [bgUrl, setBgUrl] = useState(null);

    const heroRef = useRef();

    useEffect(() => {
        // try server-hosted hero first, fall back to Unsplash
        const tryUrl = `${API_BASE}/uploads/sports_pc_hero.png`;
        const img = new Image();
        img.onload = () => setBgUrl(tryUrl);
        img.onerror = () => setBgUrl('https://images.unsplash.com/photo-1517927033932-bc3d6a0458a6?auto=format&fit=crop&w=2000&q=80');
        img.src = tryUrl;
    }, [API_BASE]);

    useEffect(() => {
        if (!heroRef.current) return;
        const el = heroRef.current;
        let triggered = false;
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // if hero is scrolled past by >20% on small screens, trigger an animation
                if (window.innerWidth <= 640 && entry.boundingClientRect.top < - (entry.boundingClientRect.height * 0.2)) {
                    if (!triggered) {
                        triggered = true;
                        el.classList.add('hero-scroll-anim');
                        setTimeout(() => el.classList.remove('hero-scroll-anim'), 900);
                    }
                }
            });
        }, { threshold: [0, 0.2, 0.8] });

        io.observe(el);
        return () => { io.disconnect(); };
    }, []);

    return (
        <div className="home container" style={{ paddingTop: 48, '--home-bg': bgUrl ? `url(${bgUrl})` : undefined }}>
            <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 320px' }}>
                    <h1 style={{ color: '#fff', marginBottom: 8 }}>BestOddsGH — Trusted Sports Odds</h1>
                    <p className="muted">Register, verify and gain access to curated booking codes and odds. Upload proof of payment for manual admin verification.</p>
                    <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link to="/register" className="btn">Get Started</Link>
                        <Link to="/login" className="btn secondary">Sign in</Link>
                        <Link to="/admin" className="btn" style={{ background: 'linear-gradient(90deg,#ef4444,#f97316)' }}>Admin</Link>
                    </div>
                </div>
                <div style={{ flex: '0 0 320px' }}>
                    <Link to="/login" style={{ display: 'block', cursor: 'pointer' }}>
                        <div className="hero-media" ref={heroRef}>
                            <picture>
                                <source media="(min-width:600px)" srcSet={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/uploads/sports_pc_hero.png`} />
                                <img alt="sports" src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/uploads/sports_mobile_hero.png`} style={{ width: '100%', borderRadius: 12 }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://images.unsplash.com/photo-1517927033932-bc3d6a0458a6?auto=format&fit=crop&w=800&q=60'; }} />
                            </picture>
                        </div>
                    </Link>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginTop: 20 }}>
                <div className="card">
                    <h3>Secure Verification</h3>
                    <p className="muted">We verify payments manually to maintain trust and reduce fraud. Upload your proof and wait for admin approval.</p>
                </div>
                <div className="card">
                    <h3>Clear Instructions</h3>
                    <p className="muted">Step-by-step guidance for payments and fast turnaround on approvals.</p>
                </div>
                <div className="card">
                    <h3>Trusted Codes</h3>
                    <p className="muted">Approved users receive booking codes and curated odds to use on match day.</p>
                </div>
            </div>
        </div>
    );
};

export default Home;