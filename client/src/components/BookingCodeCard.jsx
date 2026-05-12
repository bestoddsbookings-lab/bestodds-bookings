import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BookingCodeCard({ booking }) {
  const [remaining, setRemaining] = useState(null);
  const navigate = useNavigate();

  const copy = async () => {
    try { await navigator.clipboard.writeText(booking.code || booking.bookingCode?.code || booking.bookingCode || ''); alert('Copied'); }
    catch { alert('Copy failed'); }
  };

  useEffect(() => {
    if (!booking) {
      setRemaining(null);
      return;
    }

    let expiresAt = null;
    if (booking.expiresAt) expiresAt = new Date(booking.expiresAt);
    else if (booking.bookingCode && booking.bookingCode.expiryDate) expiresAt = new Date(booking.bookingCode.expiryDate);
    else if (booking.codeOpenedAt && booking.codeDurationHours) {
      expiresAt = new Date(new Date(booking.codeOpenedAt).getTime() + Number(booking.codeDurationHours) * 3600 * 1000);
    }

    function update() {
      if (!expiresAt) { setRemaining(null); return; }
      const ms = expiresAt.getTime() - Date.now();
      setRemaining(ms > 0 ? ms : 0);
    }

    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [booking]);

  // when countdown reaches zero, refresh dashboard so the booking vanishes
  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      // short delay so UI can show expired state then refresh
      setTimeout(() => {
        try { window.location.reload(); } catch (e) { navigate('/dashboard'); }
      }, 400);
    }
  }, [remaining, navigate]);

  function fmt(ms) {
    if (ms === null) return 'N/A';
    if (ms <= 0) return 'Expired';
    const s = Math.floor(ms / 1000);
    const hh = Math.floor(s / 3600).toString().padStart(2, '0');
    const mm = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  if (!booking) return null;

  const codeDisplay = booking.code || (booking.bookingCode && booking.bookingCode.code) || booking.bookingCode || '—';

  return (
    <div className="card" style={{ padding: 12, textAlign: 'center' }}>
      <h3>Your Booking Code</h3>
      <div style={{ fontSize: 28, letterSpacing: 2, margin: '12px 0', fontWeight: 700 }}>{codeDisplay}</div>
      <div>Time left: {fmt(remaining)}</div>
      <div style={{ marginTop: 12 }}>
        <button className="btn" onClick={copy}>Copy</button>
      </div>
    </div>
  );
}
