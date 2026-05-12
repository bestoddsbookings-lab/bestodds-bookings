import React, { useEffect, useState } from 'react';
import { post } from '../services/api';

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => { fetchOffers(); }, []);

  async function fetchOffers() {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/offers`);
      const data = await res.json();
      setOffers(data || []);
    } catch (err) {
      setError('Failed to load offers');
    }
  }

  async function buy(id) {
    try {
      await post('/purchases/create', { bookingCodeId: id });
      alert('Purchase submitted. Admin will confirm.');
    } catch (err) {
      setError(err.message || 'Buy failed');
    }
  }

  return (
    <div className="container" style={{ maxWidth: 900, margin: '24px auto' }}>
      <h2>Available Bookings</h2>
      {error && <div className="card">{error}</div>}
      {offers.map(o => (
        <div key={o.id} className="card" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{o.matchName}</strong>
              <div>Price: {o.price}</div>
              <div>Expires: {new Date(o.expiryDate).toLocaleString()}</div>
            </div>
            <div>
              <button className="btn" onClick={() => buy(o.id)}>Buy</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
