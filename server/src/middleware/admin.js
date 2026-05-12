const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Support three modes:
  // 1) Bearer JWT with { admin: true }
  // 2) Environment-backed username/password via headers `x-admin-user` and `x-admin-pass`.
  // 3) Legacy single header `x-admin-key` for quick access (fallback to 'admin123').

  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload && payload.admin) return next();
    } catch (e) {
      console.error('admin middleware: jwt verify failed', e.message);
      return res.status(403).json({ message: 'forbidden' });
    }
  }

  const envUser = process.env.ADMIN_USER;
  const envPass = process.env.ADMIN_PASS;

  if (envUser && envPass) {
    const u = req.headers['x-admin-user'];
    const p = req.headers['x-admin-pass'];
    console.log('admin middleware: env auth attempt', { headerUser: !!u, headerPass: !!p });
    if (u === envUser && p === envPass) return next();
    console.error('admin middleware: env auth mismatch', { u, envUser });
    return res.status(403).json({ message: 'forbidden' });
  }

  // Fallback: single key header
  if (req.headers['x-admin-key'] !== 'admin123') return res.status(403).json({ message: 'forbidden' });
  next();
};
