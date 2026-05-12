import React, { useEffect, useState } from 'react';
import { get } from '../services/api';

export default function Support() {
  const [support, setSupport] = useState(null);

  useEffect(() => { fetchSupport(); }, []);

  async function fetchSupport() {
    try {
      const s = await get('/support-info');
      setSupport(s.support || null);
    } catch (e) {
      setSupport(null);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <h2>Support</h2>
      {!support && <div className="card">No support contact configured. Please check back later.</div>}
      {support && (
        <div className="card">
          <h3>Contact Support</h3>
          {support.contactMessage && <p>{support.contactMessage}</p>}
          {support.contactEmail && <div><strong>Email:</strong> <a href={`mailto:${support.contactEmail}`}>{support.contactEmail}</a></div>}
          {support.contactPhone && <div><strong>Phone:</strong> <a href={`tel:${support.contactPhone}`}>{support.contactPhone}</a></div>}
          {support.supportUrl && <div style={{ marginTop: 8 }}><a href={support.supportUrl} target="_blank" rel="noreferrer">Support Page / Ticket</a></div>}
        </div>
      )}
    </div>
  );
}
