import React from 'react';

export default function AuthIllustration({ size = 96 }) {
  return (
    <div className="auth-illustration" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img">
        <defs>
          <linearGradient id="ai-grad" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.25"/>
          </filter>
        </defs>

        <g filter="url(#soft)">
          <circle cx="60" cy="60" r="56" fill="url(#ai-grad)" />
        </g>

        {/* person */}
        <g>
          <circle cx="60" cy="40" r="12" fill="#fff" fillOpacity="0.95" />
          <path d="M40 86c0-10 10-18 20-18s20 8 20 18" fill="#fff" fillOpacity="0.92" />
        </g>

        {/* lock */}
        <g>
          <rect x="72" y="62" width="28" height="22" rx="4" fill="#fff" />
          <path d="M84 62v-6a8 8 0 0 0-16 0v6" stroke="#04201a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="84" cy="73" r="2.5" fill="#04201a" />
        </g>
      </svg>
    </div>
  );
}
