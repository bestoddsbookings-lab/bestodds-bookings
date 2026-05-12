import React from 'react';

export default function PaymentCard({
  amount = '76.00',
  momoNumber = '0595655042',
  booking = {},
  logo = null,
  onUpload,
}) {
  const title = booking.title || 'Buy Booking: VIP';
  const period = booking.period || '20/05/2026, 12:09:00 — 30/05/2026, 12:09:00';
  const note = booking.note || 'Complete the payment using the provided instructions below and upload proof for admin review. Admin will confirm payment and send booking codes.';

  return (
    <div className="card payment-card glass-form">
      <div className="payment-content">
        <h3 style={{ marginTop: 0 }}>Payment Instructions</h3>
        <div style={{ marginTop: 6 }}>
          <div className="muted">{title}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{period}</div>
        </div>
        <h4 style={{ marginTop: 10 }}>{amount} GHS</h4>
        <p style={{ marginTop: 8 }}>{note}</p>
        <p style={{ marginTop: 8 }}>Send payment to MoMo number: <strong>{momoNumber}</strong></p>
        <div style={{ marginTop: 12 }}>
          {onUpload && <div>{onUpload()}</div>}
        </div>
      </div>

      <div className="payment-side">
        <div className="side-inner">
          {logo ? (
            <img src={logo} alt="brand" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', boxShadow: '0 8px 20px rgba(0,0,0,0.5)' }} />
          ) : (
            <div className="brand-mark" style={{ width: 80, height: 80, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#04201a', fontWeight: 800 }}>BO</div>
          )}
        </div>
      </div>
    </div>
  );
}
