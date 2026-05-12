import React, { useState } from 'react';
import { post } from '../services/api';

export default function Resend() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLink('');
    try {
      const res = await post('/auth/resend', { email });
      if (res.link) setLink(res.link);
      setMessage('If the account exists, a verification email was sent (or link provided).');
    } catch (err) {
      setMessage(err?.data?.message || err?.message || 'Failed to resend');
    }
  };

  return (
    <div className="container">
      <h2>Resend Verification</h2>
      <form onSubmit={submit}>
        <div>
          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} required type="email" />
        </div>
        <button type="submit">Resend</button>
      </form>
      {message && <p>{message}</p>}
      {link && (
        <p>Fallback verification link (use in dev): <a href={link}>{link}</a></p>
      )}
    </div>
  );
}
