import React, { useEffect, useState } from 'react';
import { adminGet, adminPost, adminUpload } from '../services/adminApi';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [payments, setPayments] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState({ momoNumber: '', accountName: '', paymentNote: '' });
  const [supportInfo, setSupportInfo] = useState({ contactEmail: '', contactPhone: '', contactMessage: '', supportUrl: '' });
  const [editValues, setEditValues] = useState({});
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_API_URL || 'https://bestodds-bookings.onrender.com';
  const [previewImage, setPreviewImage] = useState(null);

  const adminUser = localStorage.getItem('admin_user');
  const adminPass = localStorage.getItem('admin_pass');
  useEffect(() => {
    if (!adminUser || !adminPass) return navigate('/admin');
    fetchPayments();
    fetchAssets();
    fetchPaymentInfo();
    fetchSupportInfo();
    fetchPurchases();
    fetchUsers({ page, limit, q: query });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser, adminPass]);

  async function fetchSupportInfo() {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'https://bestodds-bookings.onrender.com'}/api/admin/settings/support`, { headers: buildHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.support) setSupportInfo(data.support);
    } catch (e) { }
  }

  async function fetchPaymentInfo() {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'https://bestodds-bookings.onrender.com'}/api/admin/settings/payment`, { headers: buildHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.payment) setPaymentInfo(data.payment);
    } catch (e) { }
  }

  // Poll for new payments so admins see uploads as they arrive
  // WebSocket code disabled for now; fallback to polling only
  useEffect(() => {
    const iv = setInterval(() => { fetchPayments(); }, 7000);
    return () => clearInterval(iv);
  }, []);

  async function fetchAssets() {
    try {
      const data = await adminGet('/assets/current');
      setAssets(data.assets || null);
    } catch (err) {
      // try public fetch fallback
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'https://bestodds-bookings.onrender.com'}/api/assets/current`);
        const json = await res.json().catch(() => ({}));
        setAssets(json.assets || null);
      } catch (e) { }
    }
  }

  async function fetchPayments() {
    try {
      // fetch all submissions so admin can view approved screenshots and set booking codes
      const data = await adminGet('/admin/payments?status=ALL');
      setPayments(data || []);
      // initialize editValues
      const ev = {};
      (data || []).forEach((s) => { ev[s.id] = { name: s.name || '', amountPaid: s.amountPaid || '', refundNumber: s.refundNumber || '', referenceId: s.referenceId || '', bookingCode: s.bookingCode || '', codeDurationHours: s.codeDurationHours || '' }; });
      setEditValues(ev);
    } catch (err) {
      setError(err.message || 'Failed to load');
    }
  }

  async function fetchPurchases() {
    try {
      const data = await adminGet('/purchases');
      setPurchases(data.purchases || []);
    } catch (err) {
      // ignore
    }
  }

  async function fetchUsers() {
    try {
      const qs = `?page=${page}&limit=${limit}&q=${encodeURIComponent(query || '')}`;
      const data = await adminGet(`/admin/users${qs}`);
      setUsers(data.users || []);
      setTotalUsers(data.total || 0);
      setPage(data.page || page);
      setLimit(data.limit || limit);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    }
  }

  function buildHeaders() {
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');
    const pass = localStorage.getItem('admin_pass');
    const h = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    else if (user && pass) { h['x-admin-user'] = user; h['x-admin-pass'] = pass; }
    else {
      const key = localStorage.getItem('admin_key');
      if (key) h['x-admin-key'] = key;
    }
    return h;
  }

  function logout() {
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_pass');
    localStorage.removeItem('admin_token');
    navigate('/admin');
  }

  async function banUser(id) {
    try {
      await adminPost(`/admin/user/${id}/ban`);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Ban failed');
    }
  }

  async function unbanUser(id) {
    try {
      await adminPost(`/admin/user/${id}/unban`);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Unban failed');
    }
  }

  async function deleteUserPrompt(id) {
    if (!window.confirm('Delete this user?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/user/${id}`, { method: 'DELETE', headers: buildHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Delete failed');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Delete failed');
    }
  }


  async function createUserPrompt() {
    const email = prompt('Email');
    if (!email) return;
    const password = prompt('Password');
    if (!password) return;
    const name = prompt('Name (optional)');
    try {
      await adminPost('/admin/user', { email, password, name });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Create failed');
    }
  }

  async function resendUser(id) {
    try {
      await adminPost(`/admin/user/${id}/resend`);
      alert('Verification resent');
    } catch (err) {
      setError(err.message);
    }
  }

  async function editUserPrompt(u) {
    const name = prompt('Name', u.name || '');
    if (name === null) return; // cancelled
    const email = prompt('Email', u.email || '');
    if (email === null) return;
    try {
      await (await import('../services/adminApi')).adminPut(`/admin/user/${u.id}`, { name, email });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Edit failed');
    }
  }

  async function createNewCodeForUser(id) {
    const level = prompt('Enter level (VIP, SUPER, GOLD)');
    if (!level) return;
    const price = prompt('Price (numeric, e.g. 15.00)');
    if (price === null) return;
    const firstGameBegin = prompt('First game begins (ISO or YYYY-MM-DD HH:MM)');
    if (!firstGameBegin) return;
    const lastGameEnd = prompt('Last game ends (ISO or YYYY-MM-DD HH:MM)');
    if (!lastGameEnd) return;
    try {
      await adminPost(`/admin/user/${id}/new-code`, { level, price, firstGameBegin, lastGameEnd });
      alert('New code arrival sent to user');
      fetchUsers();
    } catch (err) { setError(err.message || 'Failed to send'); }
  }

  async function exportCsv() {
    try {
      const token = localStorage.getItem('admin_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      else {
        const user = localStorage.getItem('admin_user');
        const pass = localStorage.getItem('admin_pass');
        const key = localStorage.getItem('admin_key');
        if (user && pass) { headers['x-admin-user'] = user; headers['x-admin-pass'] = pass; }
        else if (key) headers['x-admin-key'] = key;
      }
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'https://bestodds-bookings.onrender.com'}/api/admin/users/export`, { headers });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message || 'Export failed');
    }
  }

  return (
    <div className="container admin-container">
      <div style={{ marginBottom: 12 }} className="card">
        <h3>Site Assets</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="btn" style={{ marginRight: 8 }}>
            Upload Logo
            <input type="file" style={{ display: 'none' }} onChange={async (e) => {
              const f = e.target.files[0]; if (!f) return;
              const fd = new FormData(); fd.append('file', f); fd.append('type', 'logo');
              try {
                await adminUpload('/admin/assets/upload', fd);
                alert('Logo uploaded');
                await fetchAssets();
              } catch (err) { alert('Upload failed'); }
            }} />
          </label>

          <label className="btn" style={{ marginRight: 8 }}>
            Upload Background
            <input type="file" style={{ display: 'none' }} onChange={async (e) => {
              const f = e.target.files[0]; if (!f) return;
              const fd = new FormData(); fd.append('file', f); fd.append('type', 'background');
              try {
                await adminUpload('/admin/assets/upload', fd);
                alert('Background uploaded');
                await fetchAssets();
              } catch (err) { alert('Upload failed'); }
            }} />
          </label>

          <label className="btn">
            Upload Flyer
            <input type="file" style={{ display: 'none' }} onChange={async (e) => {
              const f = e.target.files[0]; if (!f) return;
              const fd = new FormData(); fd.append('file', f); fd.append('type', 'flyer');
              try {
                await adminUpload('/admin/assets/upload', fd);
                alert('Flyer uploaded');
                await fetchAssets();
              } catch (err) { alert('Upload failed'); }
            }} />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <h4>Payment Settings</h4>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <input className="input" placeholder="MoMo Number" value={paymentInfo.momoNumber || ''} onChange={(e) => setPaymentInfo({ ...paymentInfo, momoNumber: e.target.value })} />
            <input className="input" placeholder="Account Name" value={paymentInfo.accountName || ''} onChange={(e) => setPaymentInfo({ ...paymentInfo, accountName: e.target.value })} />
          </div>
          <div style={{ marginTop: 8 }}>
            <input className="input" placeholder="Payment note (optional)" value={paymentInfo.paymentNote || ''} onChange={(e) => setPaymentInfo({ ...paymentInfo, paymentNote: e.target.value })} />
          </div>
          <div style={{ marginTop: 8 }}>
            <input className="input" placeholder="Default amount" value={paymentInfo.amount || ''} onChange={(e) => setPaymentInfo({ ...paymentInfo, amount: e.target.value })} />
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={async () => { try { await adminPost('/admin/settings/payment', paymentInfo); alert('Saved'); fetchPaymentInfo(); } catch (err) { setError(err.message || 'Save failed'); } }}>Save payment settings</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <h4>Support Settings</h4>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <input className="input" placeholder="Support Email" value={supportInfo.contactEmail || ''} onChange={(e) => setSupportInfo({ ...supportInfo, contactEmail: e.target.value })} />
              <input className="input" placeholder="Support Phone" value={supportInfo.contactPhone || ''} onChange={(e) => setSupportInfo({ ...supportInfo, contactPhone: e.target.value })} />
            </div>
            <div style={{ marginTop: 8 }}>
              <input className="input" placeholder="Support page URL (optional)" value={supportInfo.supportUrl || ''} onChange={(e) => setSupportInfo({ ...supportInfo, supportUrl: e.target.value })} />
            </div>
            <div style={{ marginTop: 8 }}>
              <input className="input" placeholder="Support short message" value={supportInfo.contactMessage || ''} onChange={(e) => setSupportInfo({ ...supportInfo, contactMessage: e.target.value })} />
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={async () => { try { await adminPost('/admin/settings/support', supportInfo); alert('Saved'); fetchSupportInfo(); } catch (err) { setError(err.message || 'Save failed'); } }}>Save support settings</button>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={fetchAssets} style={{ marginRight: 8 }}>Refresh Preview</button>
        </div>
        {assets && (
          <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Logo</div>
              {assets.logo && assets.logo.url ? <img src={assets.logo.url + `?t=${Date.now()}`} alt="logo" style={{ height: 60 }} /> : <div className="card">No logo</div>}
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Background</div>
              {assets.background && assets.background.url ? <div style={{ width: 200, height: 80, backgroundImage: `url(${assets.background.url + `?t=${Date.now()}`})`, backgroundSize: 'cover', borderRadius: 8 }} /> : <div className="card">No background</div>}
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Flyer</div>
              {assets.flyer && assets.flyer.url ? <img src={assets.flyer.url + `?t=${Date.now()}`} alt="flyer" style={{ height: 80 }} /> : <div className="card">No flyer</div>}
            </div>
          </div>
        )}
      </div>
      <div className="admin-header">
        <h2>Admin Dashboard</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="input" placeholder="Search users" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn" onClick={() => { setPage(1); fetchUsers({ page: 1, limit, q: query }); }}>Search</button>
          <button className="btn" onClick={createUserPrompt}>Create user</button>
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </div>

      {error && <div className="card">Error: {error}</div>}

      {payments.length === 0 && <div className="card">No pending payments</div>}

      <h3 style={{ marginTop: 16 }}>Registered Users ({totalUsers})</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <div>Page {page}</div>
        <button className="btn" onClick={() => { if (page > 1) { setPage(page-1); fetchUsers({ page: page-1, limit, q: query }); } }}>Prev</button>
        <button className="btn" onClick={() => { if (page*limit < totalUsers) { setPage(page+1); fetchUsers({ page: page+1, limit, q: query }); } }}>Next</button>
        <div style={{ marginLeft: 'auto' }}>
          <label>Per page: </label>
          <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value,10)); setPage(1); fetchUsers({ page:1, limit: parseInt(e.target.value,10), q: query }); }}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {users.length === 0 && <div className="card">No users found</div>}
      <div style={{ marginTop: 8, marginBottom: 12 }}>
        <button className="btn" onClick={exportCsv}>Export CSV</button>
      </div>

      {users.map(u => (
        <div key={u.id} className="card" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{u.email}</strong> {u.name ? `— ${u.name}` : ''}
              <div>Status: {u.accessStatus} — Verified: {u.isVerified ? 'yes' : 'no'}</div>
              <div>Joined: {new Date(u.createdAt).toLocaleString()}</div>
            </div>
              <div style={{ textAlign: 'right' }}>
                <button className="btn" onClick={() => banUser(u.id)} style={{ marginRight: 8 }}>Ban</button>
                <button className="btn" onClick={() => unbanUser(u.id)} style={{ marginRight: 8 }}>Unban</button>
                <button className="btn" onClick={() => createNewCodeForUser(u.id)} style={{ marginRight: 8 }}>New BOOKING CODE AVAILABLE</button>
                <button className="btn outline" onClick={() => deleteUserPrompt(u.id)} style={{ marginRight: 8 }}>Delete</button>
                {!u.isVerified && <button className="btn outline" onClick={() => resendUser(u.id)}>Resend</button>}
              </div>
          </div>
        </div>
      ))}

      {payments.map(p => {
        const assetUrl = (u) => {
          if (!u) return null;
          if (u.startsWith('http') || u.startsWith('data:')) return u;
          if (u.startsWith('/')) return `${API_BASE}${u}`;
          return u;
        };

        const imgUrl = assetUrl(p.screenshotUrl);

        return (
          <div key={p.id} className="card payment-card" style={{ marginBottom: 12 }}>
            <div className="payment-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 16, alignItems: 'start' }}>
              <div className="payment-details">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <strong style={{ fontSize: 15 }}>{p.user?.email || p.userId}</strong>
                    <div className="muted" style={{ fontSize: 13 }}>{p.user?.name || ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }} className="muted">{p.status}</div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="muted">Name</label>
                    <input className="input" value={editValues[p.id]?.name || p.name || ''} onChange={(e) => setEditValues({ ...editValues, [p.id]: { ...editValues[p.id], name: e.target.value } })} />
                  </div>
                  <div style={{ width: 140 }}>
                    <label className="muted">Amount</label>
                    <input className="input" value={editValues[p.id]?.amountPaid || p.amountPaid || ''} onChange={(e) => setEditValues({ ...editValues, [p.id]: { ...editValues[p.id], amountPaid: e.target.value } })} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label className="muted">Refund number</label>
                    <input className="input" value={editValues[p.id]?.refundNumber || p.refundNumber || ''} onChange={(e) => setEditValues({ ...editValues, [p.id]: { ...editValues[p.id], refundNumber: e.target.value } })} />
                  </div>
                  <div style={{ width: 240 }}>
                    <label className="muted">Reference ID</label>
                    <input className="input" value={editValues[p.id]?.referenceId || p.referenceId || ''} onChange={(e) => setEditValues({ ...editValues, [p.id]: { ...editValues[p.id], referenceId: e.target.value } })} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                  <button className="btn" onClick={async () => { try { await adminPost(`/admin/approve/${p.id}`); fetchPayments(); fetchPurchases(); } catch (err) { setError(err.message); } }}>Approve</button>
                  <button className="btn outline" onClick={async () => { try { await adminPost(`/admin/reject/${p.id}`); fetchPayments(); fetchPurchases(); } catch (err) { setError(err.message); } }}>Reject</button>
                  <button className="btn secondary" onClick={async () => { try { const body = { ...editValues[p.id] }; await adminPost(`/admin/submission/${p.id}`, body); fetchPayments(); } catch (err) { setError(err.message || 'Save failed'); } }}>Save</button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                  <input className="input" placeholder="Booking code" value={p.bookingCode || (editValues[p.id] && editValues[p.id].bookingCode) || ''} onChange={(e) => setEditValues({ ...editValues, [p.id]: { ...editValues[p.id], bookingCode: e.target.value } })} />
                  <input className="input" placeholder="TTL hours" style={{ width: 120 }} value={p.codeDurationHours || (editValues[p.id] && editValues[p.id].codeDurationHours) || ''} onChange={(e) => setEditValues({ ...editValues, [p.id]: { ...editValues[p.id], codeDurationHours: e.target.value } })} />
                  <button className="btn" onClick={async () => { try { const body = { bookingCode: (editValues[p.id] && editValues[p.id].bookingCode) || p.bookingCode, codeDurationHours: (editValues[p.id] && editValues[p.id].codeDurationHours) || p.codeDurationHours }; if (!body.bookingCode) return alert('Enter booking code'); await adminPost(`/admin/submission/${p.id}/code`, body); alert('Booking code set'); fetchPayments(); } catch (err) { setError(err.message || 'Set code failed'); } }}>Set code</button>
                </div>
              </div>

              <div className="payment-preview" style={{ textAlign: 'center' }}>
                {imgUrl ? (
                  <>
                    <img src={imgUrl} alt="screenshot" className="screenshot-thumb" onClick={() => setPreviewImage(imgUrl)} />
                    <div style={{ marginTop: 8 }}>
                      <a href={imgUrl} target="_blank" rel="noreferrer" className="muted">Open full image</a>
                    </div>
                  </>
                ) : (
                  <div className="card">No screenshot</div>
                )}
                <div style={{ marginTop: 10 }} className="muted">Submitted: {new Date(p.createdAt).toLocaleString()}</div>
                <div style={{ marginTop: 12 }}>
                  <button className="btn outline" onClick={async () => {
                    if (!window.confirm('Delete this submission?')) return;
                    try {
                      await (await import('../services/adminApi')).adminDelete(`/admin/submission/${p.id}`);
                      fetchPayments();
                    } catch (err) { setError(err.message || 'Delete failed'); }
                  }}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {previewImage && (
        <div className="image-modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="image-modal" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="preview" />
            <div style={{ textAlign: 'center' }}>
              <button className="close-btn" onClick={() => setPreviewImage(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      

        <h3 style={{ marginTop: 16 }}>Purchases</h3>
        {purchases.length === 0 && <div className="card">No purchases</div>}
        {purchases.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{p.user?.email}</strong> — {p.status}
                <div>BookingId: {p.bookingCodeId}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginTop: 8 }}>
                  <button className="btn" onClick={async () => { await adminPost(`/purchases/approve/${p.id}`); fetchPurchases(); }} style={{ marginRight: 8 }}>Approve</button>
                  <button className="btn outline" onClick={async () => { await adminPost(`/purchases/reject/${p.id}`); fetchPurchases(); }}>Reject</button>
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
