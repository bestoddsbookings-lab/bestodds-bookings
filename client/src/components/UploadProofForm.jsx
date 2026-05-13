import React, { useState, useEffect } from 'react';
import { authHeaders } from '../services/api';

export default function UploadProofForm({ onSubmitted, defaults = {} }) {
  const [fileData, setFileData] = useState(null);
  const [tx, setTx] = useState(defaults.reference || '');
  const [name, setName] = useState(defaults.name || '');
  const [amountPaid, setAmountPaid] = useState(defaults.amountPaid || '');
  const [refundNumber, setRefundNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    // update defaults if they change while mounted
    if (defaults) {
      if (defaults.reference !== undefined) setTx(defaults.reference);
      if (defaults.name !== undefined) setName(defaults.name);
      if (defaults.amountPaid !== undefined) setAmountPaid(defaults.amountPaid);
    }
  }, [defaults]);

  // cleanup preview URL on unmount / change
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFileData(f);
    // create preview URL and remember to revoke later
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }

  async function submit(e) {
    e.preventDefault();
    if (!fileData) return alert('Please select a screenshot or paste a link');
    setLoading(true);
    try {
      const fd = new FormData();
      // send image and submission fields
      fd.append('file', fileData);
      if (name) fd.append('name', name);
      if (amountPaid) fd.append('amount', amountPaid);
      if (refundNumber) fd.append('refundNumber', refundNumber);
      if (tx) fd.append('referenceId', tx);
      const API_URL = process.env.REACT_APP_API_URL || '';

const res = await fetch(`${API_URL}/api/payments/submit`, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: fd,
      });
      let data = {};
      try { data = await res.json(); } catch (e) { data = {}; }
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Upload failed');
      }
      setFileData(null);
      setTx('');
      setName('');
      setAmountPaid('');
      setRefundNumber('');
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
      if (onSubmitted) onSubmitted();
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="card glass-form upload-proof-card">
      <div className="form-scroll-area">
        <div className="form-group">
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" />
        </div>
        <div className="form-group">
          <label>Amount paid</label>
          <input className="input" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Amount (GHS)" />
        </div>
        <div className="form-group">
          <label>Refund number (optional)</label>
          <input className="input" value={refundNumber} onChange={(e) => setRefundNumber(e.target.value)} placeholder="Refund number" />
        </div>
        <div className="form-group">
          <label>Transaction reference (optional)</label>
          <input className="input" value={tx} onChange={(e) => setTx(e.target.value)} placeholder="Txn id or reference" />
        </div>
        <div className="form-group">
          <label>Upload screenshot</label>
          <input type="file" accept="image/*" onChange={handleFile} />
        </div>
        {previewUrl && (
          <div className="form-group">
            <img src={previewUrl} alt="preview" />
          </div>
        )}
        {loading && <div className="form-group">Submitting…</div>}
      </div>
      <div className="form-actions">
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit proof'}</button>
      </div>
    </form>
  );
}
