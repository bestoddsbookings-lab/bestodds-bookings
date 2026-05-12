import React from 'react';

export default function StatusBanner({ status }) {
  // status: UNVERIFIED | NOT_PAID | PENDING | ACTIVE
  let bg = '#333';
  let text = '';
  if (!status || status === 'UNVERIFIED') { bg = '#8b0000'; text = '🔴 Email not verified — Please verify your email'; }
  else if (status === 'NOT_PAID') { bg = '#b8860b'; text = '🟡 Verified — Please make payment to continue'; }
  else if (status === 'PENDING') { bg = '#daa520'; text = '🟡 Payment pending approval — Waiting for admin'; }
  else if (status === 'ACTIVE' || status === 'APPROVED') { bg = '#006400'; text = '🟢 Access granted'; }

  return (
    <div className="status-banner" style={{ background: bg }}>
      {text}
    </div>
  );
}
