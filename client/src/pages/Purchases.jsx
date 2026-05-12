import React, { useEffect, useState } from 'react';
import { get } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { fetchMy(); }, []);

  async function fetchMy() {
    try {
      const data = await get('/purchases/my');
      setPurchases(data.purchases || []);
    } catch (e) {
      navigate('/login');
    }
  }

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <h2>My Purchases</h2>
      {purchases.length === 0 && <div className="card">No purchases found</div>}
      {purchases.map(p => (
        <div key={p.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div><strong>Booking Code ID:</strong> {p.bookingCodeId}</div>
              <div><strong>Amount:</strong> {p.amount}</div>
              <div><strong>Status:</strong> {p.status}</div>
              <div><strong>Created:</strong> {new Date(p.createdAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
