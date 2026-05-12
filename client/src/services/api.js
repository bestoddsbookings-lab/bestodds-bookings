import { getToken } from '../utils/auth';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// exportable helper for multipart requests from the client
function authHeadersRaw() {
  return authHeaders();
}

async function post(path, body) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function get(path) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function put(path, body) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try { data = await res.json(); } catch (e) { data = {}; }

  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export { post, get, put };
export { authHeadersRaw as authHeaders };
