const prisma = require("../prisma");
const fs = require('fs');
const path = require('path');

const submissionsDir = path.resolve(__dirname, '../../uploads/submissions');

exports.create = async (req, res) => {
  try {
    const { code, matchName, expiryDate } = req.body;

    const booking = await prisma.bookingCode.create({ data: { code, matchName, expiryDate: new Date(expiryDate) } });

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "server_error" });
  }
};

exports.assign = async (req, res) => {
  try {
    const { bookingCodeId } = req.body;

    const users = await prisma.user.findMany({ where: { accessStatus: "ACTIVE" } });

    const data = users.map((u) => ({ userId: u.id, bookingCodeId }));

    if (data.length > 0) await prisma.userBookingCode.createMany({ data });

    res.json({ assigned: users.length });
  } catch (err) {
    res.status(500).json({ message: "server_error" });
  }
};

exports.myCode = async (req, res) => {
  try {
    const userId = req.userId;

    // check user first and ensure not banned
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ message: 'unauthorized' });
    if (user.accessStatus === 'BANNED') return res.status(403).json({ message: 'banned' });

    // Look for file-backed submissions with booking codes first
    if (fs.existsSync(submissionsDir)) {
      const files = fs.readdirSync(submissionsDir).filter(f => f.endsWith('.json'));
      // find latest approved submission for this user with a bookingCode
      let found = null;
      for (const f of files) {
        try {
          const raw = fs.readFileSync(path.join(submissionsDir, f), 'utf8');
          const s = JSON.parse(raw);
          if (s.userId === String(userId) && String(s.status).toUpperCase() === 'APPROVED' && s.bookingCode) {
            if (!found) found = s;
            else {
              const a = new Date(found.createdAt || 0);
              const b = new Date(s.createdAt || 0);
              if (b > a) found = s;
            }
          }
        } catch (e) { /* ignore */ }
      }

      if (found) {
        // If not already opened, mark openedAt now (TTL starts when user opens)
        const now = new Date();
        if (!found.codeOpenedAt) {
          found.codeOpenedAt = now.toISOString();
          try { fs.writeFileSync(path.join(submissionsDir, `${found.id}.json`), JSON.stringify(found, null, 2), 'utf8'); } catch (e) { /* ignore */ }
        }

        const opened = new Date(found.codeOpenedAt);
        const duration = Number.isFinite(Number(found.codeDurationHours)) ? Number(found.codeDurationHours) : Number(process.env.DEFAULT_CODE_DURATION_HOURS || 24);
        const expiresAt = new Date(opened.getTime() + duration * 3600 * 1000);
        if (new Date() > expiresAt) return res.status(403).json({ message: 'expired' });

        return res.json({ code: found.bookingCode, codeOpenedAt: found.codeOpenedAt, codeDurationHours: duration, expiresAt: expiresAt.toISOString() });
      }
    }

    // fallback to DB-backed booking codes
    const record = await prisma.userBookingCode.findFirst({ where: { userId }, include: { bookingCode: true } });

    if (!record) return res.status(404).json({ message: "no_code" });

    if (new Date() > record.bookingCode.expiryDate) return res.status(403).json({ message: "expired" });

    res.json(record.bookingCode);
  } catch (err) {
    res.status(500).json({ message: "server_error" });
  }
};

// return any "New Code Arrival" created for the authenticated user
exports.getNewArrival = async (req, res) => {
  try {
    const userId = req.userId;
    const newCodesDir = path.resolve(__dirname, '../../uploads/new_codes');
    const file = path.join(newCodesDir, `${userId}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ message: 'none' });
    const raw = fs.readFileSync(file, 'utf8');
    const payload = JSON.parse(raw);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

// allow authenticated user to delete their own New Code Arrival (e.g., after purchase)
exports.deleteNewArrival = async (req, res) => {
  try {
    const userId = req.userId;
    const newCodesDir = path.resolve(__dirname, '../../uploads/new_codes');
    const file = path.join(newCodesDir, `${userId}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ message: 'not_found' });
    try { fs.unlinkSync(file); } catch (e) { console.error('failed to unlink new arrival', e); }
    try {
      const ws = require('../ws');
      ws.broadcast({ type: 'new_code_removed', userId });
    } catch (e) { /* ignore */ }
    res.json({ status: 'deleted' });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};
