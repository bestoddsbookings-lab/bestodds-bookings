const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function buildAdminHeaders() {
  const token = localStorage.getItem('admin_token');
  const user = localStorage.getItem('admin_user');
  const pass = localStorage.getItem('admin_pass');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }
  if (user && pass) {
    headers['x-admin-user'] = user;
    headers['x-admin-pass'] = pass;
  } else {
    const key = localStorage.getItem('admin_key');
    if (key) headers['x-admin-key'] = key;
  }
  return headers;
}

async function adminLogin(user, pass) {
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, pass }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function adminGet(path) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'GET',
    headers: buildAdminHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function adminPost(path, body) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: buildAdminHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function adminUpload(path, formData) {
  const headers = buildAdminHeaders();
  // remove content-type to let browser set multipart boundary
  delete headers['Content-Type'];
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function adminPut(path, body) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'PUT',
    headers: buildAdminHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function adminDelete(path) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'DELETE',
    headers: buildAdminHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export { adminGet, adminPost, adminPut, adminLogin, adminUpload, adminDelete };
