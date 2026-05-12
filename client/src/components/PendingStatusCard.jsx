import React from 'react';

export default function PendingStatusCard({ screenshotUrl }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <h3>Payment submitted — awaiting admin approval</h3>
      {screenshotUrl && <div style={{ marginTop: 8 }}><img src={screenshotUrl} alt="proof" style={{ maxWidth: 280 }} /></div>}
      <p style={{ marginTop: 8 }}>You will be notified when your payment is approved.</p>
    </div>
  );
}
