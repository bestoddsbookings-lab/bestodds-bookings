import React from 'react';

export default function OddsList({ offers = [], disabled }) {
  return (
    <div>
      <h3>Today's Picks</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {offers.map(o => (
          <div key={o.id} className="card odds-blur-overlay" style={{ filter: disabled ? 'blur(4px) grayscale(50%)' : 'none', opacity: disabled ? 0.75 : 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{o.matchName}</div>
            <div style={{ marginTop: 6, fontSize: 14 }}>Odds: <strong style={{ color: 'var(--primary)' }}>{o.odds || '—'}</strong></div>
            <div style={{ marginTop: 6, fontSize: 13 }}>Price: <strong>{o.price}</strong></div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>Expiry: {new Date(o.expiryDate).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
