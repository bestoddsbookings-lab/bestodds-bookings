import React, { useEffect, useState, useRef } from 'react';
import { getUserFromToken, clearToken } from '../utils/auth';
import { useNavigate } from 'react-router-dom';
import { get, post, authHeaders } from '../services/api';
import Navbar from '../components/Navbar';
import StatusBanner from '../components/StatusBanner';
import PaymentCard from '../components/PaymentCard';
import UploadProofForm from '../components/UploadProofForm';
import PendingStatusCard from '../components/PendingStatusCard';
import BookingCodeCard from '../components/BookingCodeCard';
import OddsList from '../components/OddsList';

export default function Dashboard() {
  const tokenUser = getUserFromToken();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [offers, setOffers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [bookingCode, setBookingCode] = useState(null);
  const [newArrival, setNewArrival] = useState(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);
  const [bookingState, setBookingState] = useState('UNKNOWN'); // UNKNOWN | HAS_CODE | NO_CODE | NOT_AUTHORIZED | ERROR
  const [assets, setAssets] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => { fetchAll(); }, []);
  
  // listen for server-sent websocket events (new code arrivals, expirations)
  useEffect(() => {
    if (!profile) return;
    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    try {
      const wsProto = API_BASE.startsWith('https') ? 'wss' : 'ws';
      const host = API_BASE.replace(/^https?:\/\//, '');
      const ws = new WebSocket(`${wsProto}://${host}/ws`);
      ws.addEventListener('message', (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (!d) return;
          if (d.userId && d.userId === profile.id) {
            if (d.type === 'new_code_arrival') {
              setNewArrival(d.data || d.payload || null);
            } else if (d.type === 'new_code_removed' || d.type === 'booking_code_expired') {
              setNewArrival(null);
              // refresh booking state when a code expires
              if (d.type === 'booking_code_expired') fetchAll();
            }
          }
        } catch (e) { /* ignore parse */ }
      });
      return () => { try { ws.close(); } catch (e) {} };
    } catch (e) { /* ignore websocket failures */ }
  }, [profile]);
  const [flyer, setFlyer] = useState(null);

  async function fetchAll() {
    try {
      const me = await get('/auth/me');
      setProfile(me.user);
    } catch (e) {
      // unauthenticated – redirect to login
      clearToken();
      navigate('/login');
      return;
    }

    try {
      const off = await get('/offers');
      setOffers(off || []);
    } catch (e) {}

    try {
      const a = await get('/assets/current');
      if (a && a.assets) {
        setAssets(a.assets);
        if (a.assets.flyer) setFlyer(a.assets.flyer.url + (a.assets.flyer.fallback ? `?t=${Date.now()}` : ''));
      }
    } catch (e) {}

    try {
      const paymentInfo = await get('/payment-info');
      if (paymentInfo && paymentInfo.payment) {
        setPaymentInfo(paymentInfo.payment);
      }
    } catch (e) { }

    try {
      const p = await get('/purchases/my');
      setPurchases(p.purchases || []);
    } catch (e) {}

    try {
      const na = await get('/booking/new-arrival');
      setNewArrival(na || null);
    } catch (e) {
      // ignore missing
      setNewArrival(null);
    }

    try {
      const c = await get('/booking/my-code');
      if (c) {
        if (Array.isArray(c)) setBookingCode(c[0] || null);
        else setBookingCode(c);
        setBookingState('HAS_CODE');
      } else {
        setBookingCode(null);
        setBookingState('NO_CODE');
      }
    } catch (e) {
      // `get` throws with .status and .data when non-2xx
      const status = e?.status;
      const msg = e?.data?.message || '';
      if (status === 403 && msg === 'not_authorized') {
        setBookingState('NOT_AUTHORIZED');
      } else if (status === 404 && msg === 'no_code') {
        setBookingState('NO_CODE');
      } else {
        setBookingState('ERROR');
      }
      setBookingCode(null);
    }
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  }

  function startPolling() {
    if (pollRef.current) return;
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const c = await get('/booking/my-code');
        if (c) {
          const code = Array.isArray(c) ? c[0] : c;
          setBookingCode(code);
          setBookingState('HAS_CODE');
          stopPolling();
        }
      } catch (e) {
        // ignore and continue polling
      }
    }, 8000);
  }

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  function logout() {
    clearToken();
    navigate('/login');
  }

  // Determine UI state
  const state = (() => {
    if (!profile) return 'UNVERIFIED';
    if (!profile.isVerified) return 'UNVERIFIED';
    // profile.isVerified === true
    if (profile.accessStatus === 'NOT_PAID') return 'VERIFIED_NOT_PAID';
    if (profile.accessStatus === 'PENDING') return 'PAYMENT_SUBMITTED';
    if (profile.accessStatus === 'ACTIVE' || profile.accessStatus === 'APPROVED') return 'APPROVED';
    return 'VERIFIED_NOT_PAID';
  })();

  return (
    <div className="dashboard-root" style={{ '--dashboard-bg': assets && assets.background && assets.background.url ? `url(${assets.background.url + (assets.background.fallback ? `?t=${Date.now()}` : '')})` : undefined }}>
      <Navbar email={profile?.email || (tokenUser && tokenUser.id) || '—'} onLogout={logout} />
      <StatusBanner status={profile && profile.isVerified ? (profile.accessStatus === 'PENDING' ? 'PENDING' : profile.accessStatus) : 'UNVERIFIED'} />

      <div className="container user-container">
        {/* Progress steps */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
          <div className="card" style={{ padding: 8, flex: 1, textAlign: 'center' }}>
            <div>1</div>
            <div style={{ fontSize: 12 }}>Verify Email</div>
            <div style={{ fontSize: 12 }}>{profile?.isVerified ? '✔' : '—'}</div>
          </div>
          <div className="card" style={{ padding: 8, flex: 1, textAlign: 'center' }}>
            <div>2</div>
            <div style={{ fontSize: 12 }}>Make Payment</div>
            <div style={{ fontSize: 12 }}>{profile?.accessStatus === 'NOT_PAID' ? 'Pending' : (profile?.accessStatus === 'PENDING' ? 'Submitted' : (profile?.accessStatus === 'ACTIVE' ? 'Done' : '—'))}</div>
          </div>
          <div className="card" style={{ padding: 8, flex: 1, textAlign: 'center' }}>
            <div>3</div>
            <div style={{ fontSize: 12 }}>Await Approval</div>
            <div style={{ fontSize: 12 }}>{profile?.accessStatus === 'PENDING' ? '⏳' : (profile?.accessStatus === 'ACTIVE' ? '✔' : '—')}</div>
          </div>
          <div className="card" style={{ padding: 8, flex: 1, textAlign: 'center' }}>
            <div>4</div>
            <div style={{ fontSize: 12 }}>Access</div>
            <div style={{ fontSize: 12 }}>{profile?.accessStatus === 'ACTIVE' ? '🔓' : '—'}</div>
          </div>
        </div>
        {/* State-specific content */}
        {state === 'UNVERIFIED' && (
          <div>
            <h2>Please verify your email to continue</h2>
            <p>Check your email for a verification link. If you didn't receive it, resend below.</p>
            <button className="btn" onClick={async () => { try { await post('/auth/resend', { email: profile.email }); alert('Resent (check email)'); } catch (e) { alert('Resend failed'); } }}>Resend verification email</button>
          </div>
        )}

        {state === 'VERIFIED_NOT_PAID' && (
          <div>
            {newArrival ? (
              <div>
                <h3>Booking Available: {newArrival.level}</h3>
                <PaymentCard amount={newArrival.price || paymentInfo?.amount || '10.00'} momoNumber={paymentInfo?.momoNumber || '0240000000'} onUpload={() => <UploadProofForm onSubmitted={() => { fetchAll(); }} />} />
              </div>
            ) : (
              <div>
                <div className="card">
                  <h3>No booking codes currently for sale</h3>
                  <p>We will notify you when booking codes become available. Meanwhile you can explore other features below.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginTop: 12 }}>
                  <div className="card"><h4>Profile</h4><p>Manage your account details.</p><button className="btn" onClick={() => navigate('/profile')}>Open</button></div>
                  <div className="card"><h4>My Purchases</h4><p>View past purchases and receipts.</p><button className="btn" onClick={() => navigate('/purchases')}>Open</button></div>
                  <div className="card"><h4>Support</h4><p>Contact support for help.</p><button className="btn" onClick={() => navigate('/support')}>Contact</button></div>
                </div>
              </div>
            )}
          </div>
        )}

        {state === 'PAYMENT_SUBMITTED' && (
          <div>
            <PendingStatusCard />
            <div style={{ marginTop: 12 }}>
              <p>Your payment is awaiting admin approval. This can take up to 24 hours. If you'd like to re-upload proof after rejection, you'll be able to do so here.</p>
            </div>
          </div>
        )}

        {state === 'APPROVED' && (
          <div>
            {newArrival && (
              <div className="card new-arrival-card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>New Booking Code Available</h3>
                    <div style={{ marginTop: 6 }}><strong>{newArrival.level}</strong> — {new Date(newArrival.firstGameBegin).toLocaleString()} to {new Date(newArrival.lastGameEnd).toLocaleString()}</div>
                    <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>{Number(newArrival.price).toFixed(2)} GHS</div>
                  </div>
                  <div>
                    <button className="btn" onClick={() => setShowBuyModal(true)}>Buy</button>
                  </div>
                </div>
                <div style={{ marginTop: 10 }} className="muted">This is a limited offer. Click Buy to submit payment proof for admin approval.</div>
              </div>
            )}
            {bookingState === 'HAS_CODE' && <BookingCodeCard booking={bookingCode} />}
            {bookingState === 'NO_CODE' && (
              <div className="card"> 
                <h3>Awaiting Booking Assignment</h3>
                <p>Your payment has been approved but a booking code is not yet assigned. You can check manually or enable auto-check.</p>
                <div style={{ marginTop: 12 }}>
                  <button className="btn" onClick={() => fetchAll()}>View My booking</button>
                  <button className="btn outline" style={{ marginLeft: 8 }} onClick={() => { polling ? stopPolling() : startPolling(); }}>{polling ? 'Stop Checking' : 'Start Auto-Check'}</button>
                </div>
              </div>
            )}
            {bookingState === 'NOT_AUTHORIZED' && <div className="card"> <h3>Access Pending</h3><p>Your account is not authorized to view a booking code yet. If you believe this is a mistake contact support.</p></div>}
            {bookingState === 'ERROR' && <div className="card"> <h3>Booking Status</h3><p>Unable to fetch booking code at this time.</p></div>}
            <div style={{ marginTop: 18 }}>
              <OddsList offers={offers} disabled={false} />
            </div>
          </div>
        )}
      </div>
      {/* Flyer popup */}
      {flyer && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setFlyer(null)} />
          <div className="card" style={{ maxWidth: 760, zIndex: 50 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn" onClick={() => setFlyer(null)}>Close</button></div>
            <div style={{ textAlign: 'center' }}>
              <img src={flyer} alt="flyer" style={{ maxWidth: '100%' }} />
            </div>
          </div>
        </div>
      )}

      {showBuyModal && newArrival && (
        <div className="image-modal-backdrop" onClick={() => setShowBuyModal(false)}>
          <div className="image-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Buy Booking: {newArrival.level}</h3>
                <div style={{ fontSize: 14, color: 'var(--muted)' }}>{new Date(newArrival.firstGameBegin).toLocaleString()} — {new Date(newArrival.lastGameEnd).toLocaleString()}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{Number(newArrival.price).toFixed(2)} GHS</div>
            </div>
            <div style={{ marginTop: 12 }}>
              <p>Complete the payment using the provided instructions below and upload proof for admin review. Admin will confirm payment and send booking codes.</p>
            </div>
            <div style={{ marginTop: 12 }}>
              <UploadProofForm defaults={{ amountPaid: newArrival.price }} onSubmitted={async () => {
                // after successful submission, remove the new-arrival so user cannot buy again
                try {
                  await fetch((process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/booking/new-arrival', { method: 'DELETE', headers: { ...authHeaders() } });
                } catch (e) { /* ignore */ }
                setShowBuyModal(false);
                await fetchAll();
                alert('Payment submitted — admin will review and send bookings upon confirmation.');
              }} />
            </div>
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <button className="close-btn" onClick={() => setShowBuyModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
