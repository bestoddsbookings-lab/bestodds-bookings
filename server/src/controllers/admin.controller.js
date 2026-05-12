const prisma = require("../prisma");

const fs = require('fs');
const path = require('path');

const submissionsDir = path.resolve(__dirname, '../../uploads/submissions');

exports.getPayments = async (req, res) => {
  try {
    const statusFilter = (req.query.status || 'PENDING').toUpperCase();
    if (!fs.existsSync(submissionsDir)) return res.json([]);
    const files = fs.readdirSync(submissionsDir).filter(f => f.endsWith('.json'));
    const submissions = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(submissionsDir, file), 'utf8');
        const s = JSON.parse(raw);
        if (statusFilter === 'ALL' || String(s.status || '').toUpperCase() === statusFilter) {
          // attach user summary when possible
          try {
            const user = await prisma.user.findUnique({ where: { id: s.userId }, select: { id: true, email: true, name: true, accessStatus: true, isVerified: true } });
            // do not surface submissions from unverified users
            if (!user || !user.isVerified) continue;
            s.user = user || null;
          } catch (e) { s.user = null; }
          submissions.push(s);
        }
      } catch (e) { /* ignore invalid files */ }
    }
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

// fetch a single submission by id (admin)
exports.getSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const file = path.join(submissionsDir, `${id}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ message: 'not_found' });
    const raw = fs.readFileSync(file, 'utf8');
    const submission = JSON.parse(raw);
    try {
      const user = await prisma.user.findUnique({ where: { id: submission.userId }, select: { id: true, email: true, name: true, accessStatus: true, isVerified: true } });
      // hide submissions from unverified users
      if (!user || !user.isVerified) return res.status(404).json({ message: 'not_found' });
      submission.user = user || null;
    } catch (e) { submission.user = null; }
    res.json({ submission });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

// Admin can set a booking code and code duration (hours) for a submission
exports.setBookingCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { bookingCode, codeDurationHours } = req.body;
    if (!bookingCode) return res.status(400).json({ message: 'missing_booking_code' });
    const file = path.join(submissionsDir, `${id}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ message: 'not_found' });
    const raw = fs.readFileSync(file, 'utf8');
    const submission = JSON.parse(raw);

    submission.bookingCode = String(bookingCode).trim();
    submission.codeDurationHours = Number.isFinite(Number(codeDurationHours)) ? Number(codeDurationHours) : (submission.codeDurationHours || Number(process.env.DEFAULT_CODE_DURATION_HOURS || 24));
    submission.codeIssuedAt = new Date().toISOString();
    // do not activate/open the code until the user views it
    submission.codeOpenedAt = submission.codeOpenedAt || null;

    fs.writeFileSync(file, JSON.stringify(submission, null, 2), 'utf8');

    try {
      const ws = require('../ws');
      ws.broadcast({ type: 'booking_code_set', submissionId: submission.id, userId: submission.userId });
    } catch (e) { /* ignore */ }

    // remove any pending New Code Arrival notification for this user to avoid duplicate purchases
    try {
      const newCodesDir = path.resolve(__dirname, '../../uploads/new_codes');
      const newFile = path.join(newCodesDir, `${submission.userId}.json`);
      if (fs.existsSync(newFile)) {
        try { fs.unlinkSync(newFile); } catch (e) { console.error('failed to remove new code file', e); }
        try { const ws = require('../ws'); ws.broadcast({ type: 'new_code_removed', userId: submission.userId }); } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }

    // notify user via email if possible
    try {
      const emailService = require('../modules/email/emailService');
      const user = await prisma.user.findUnique({ where: { id: submission.userId } });
      if (user && user.email) {
        await emailService.sendBookingCodeEmail(user.email, submission.bookingCode).catch(() => {});
      }
    } catch (e) { /* ignore */ }

    res.json({ submission });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const q = req.query.q || '';
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const skip = (Math.max(page, 1) - 1) * limit;

    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: { id: true, email: true, name: true, isVerified: true, accessStatus: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({ users, total, page, limit });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

exports.banUser = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.update({ where: { id }, data: { accessStatus: 'BANNED' } });
    res.json({ status: 'banned' });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

exports.unbanUser = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.update({ where: { id }, data: { accessStatus: 'NOT_PAID' } });
    res.json({ status: 'unbanned' });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // ensure user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'not_found' });

    // Remove any file-backed submissions and local screenshots for this user
    try {
      if (fs.existsSync(submissionsDir)) {
        const files = fs.readdirSync(submissionsDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(submissionsDir, file), 'utf8');
            const s = JSON.parse(raw);
            if (s.userId === String(id)) {
              // attempt to remove local screenshot file if present
              try {
                const url = s.screenshotUrl || '';
                if (typeof url === 'string' && url.startsWith('/uploads/')) {
                  const rel = url.replace(/^\//, '');
                  const localPath = path.resolve(__dirname, '../../', rel);
                  if (fs.existsSync(localPath)) {
                    try { fs.unlinkSync(localPath); } catch (e) { /* ignore */ }
                  }
                }
              } catch (e) { /* ignore */ }

              try { fs.unlinkSync(path.join(submissionsDir, file)); } catch (e) { /* ignore */ }
            }
          } catch (e) { /* ignore per-file parse errors */ }
        }
      }
    } catch (e) { /* ignore filesystem cleanup errors */ }

    // Delete related DB records first to avoid FK constraint errors, then delete user
    try {
      await prisma.$transaction([
        prisma.purchase.deleteMany({ where: { userId: id } }),
        prisma.userBookingCode.deleteMany({ where: { userId: id } }),
        prisma.session.deleteMany({ where: { userId: id } }),
        prisma.payment.deleteMany({ where: { userId: id } }),
        prisma.user.delete({ where: { id } }),
      ]);
    } catch (e) {
      console.error('Error deleting related DB records for user', id, e);
      return res.status(500).json({ message: 'delete_failed', error: e.message });
    }

    res.json({ status: 'deleted' });
  } catch (err) {
    console.error('deleteUser failed', err);
    res.status(500).json({ message: 'server_error', error: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'missing_fields' });
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hash, name } });
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

exports.editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    const updated = await prisma.user.update({ where: { id }, data });
    res.json({ user: { id: updated.id, email: updated.email, name: updated.name } });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'not_found' });
    if (user.isVerified) return res.status(400).json({ message: 'already_verified' });
    const uuidv4 = require('uuidv4');
    const token = uuidv4();
    // store token in-memory (reuse auth controller pattern)
    const authController = require('./auth.controller');
    if (!authController.verifyTokens) authController.verifyTokens = {};
    authController.verifyTokens[token] = user.id;
    await require('../modules/email/emailService').sendVerificationEmail(user.email, token);
    res.json({ message: 'sent' });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

exports.exportUsersCsv = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, isVerified: true, accessStatus: true, createdAt: true }
    });
    // simple CSV serialization without adding a new dependency
    const fields = ['id','email','name','isVerified','accessStatus','createdAt'];
    const lines = [fields.join(',')];
    for (const u of users) {
      const row = fields.map(f => {
        let v = u[f];
        if (v === null || v === undefined) return '';
        if (v instanceof Date) v = v.toISOString();
        return '"' + String(v).replace(/"/g, '""') + '"';
      });
      lines.push(row.join(','));
    }
    const csv = lines.join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment('users.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { user, pass } = req.body;
    if (!user || !pass) return res.status(400).json({ message: 'missing_credentials' });
    if (user !== process.env.ADMIN_USER || pass !== process.env.ADMIN_PASS) return res.status(403).json({ message: 'forbidden' });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ admin: true, user }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

exports.approve = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const file = path.join(submissionsDir, `${paymentId}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ message: 'not_found' });
    const raw = fs.readFileSync(file, 'utf8');
    const submission = JSON.parse(raw);

    submission.status = 'APPROVED';
    submission.approvedAt = new Date().toISOString();
    fs.writeFileSync(file, JSON.stringify(submission, null, 2), 'utf8');

    // update user access
    try {
      await prisma.user.update({ where: { id: submission.userId }, data: { accessStatus: 'ACTIVE' } });
    } catch (e) { console.error('failed to update user access', e); }

    // send email notification to user (if configured)
    try {
      const emailService = require('../modules/email/emailService');
      const user = await prisma.user.findUnique({ where: { id: submission.userId } });
      if (user && user.email) {
        await emailService.sendPaymentApprovedEmail(user.email).catch((e) => console.error('email send failed', e));
      }
    } catch (e) { console.error('notify email failed', e); }

    // broadcast submission update via websocket
    try {
      const ws = require('../ws');
      ws.broadcast({ type: 'submission_updated', paymentId, status: 'APPROVED' });
    } catch (e) { /* ignore */ }

    res.json({ status: 'approved' });
  } catch (err) {
    res.status(500).json({ message: "server_error" });
  }
};

exports.reject = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const file = path.join(submissionsDir, `${paymentId}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ message: 'not_found' });
    const raw = fs.readFileSync(file, 'utf8');
    const submission = JSON.parse(raw);

    submission.status = 'REJECTED';
    submission.rejectedAt = new Date().toISOString();
    fs.writeFileSync(file, JSON.stringify(submission, null, 2), 'utf8');

    try {
      const ws = require('../ws');
      ws.broadcast({ type: 'submission_updated', paymentId, status: 'REJECTED' });
    } catch (e) { /* ignore */ }

    res.json({ status: 'rejected' });
  } catch (err) {
    res.status(500).json({ message: "server_error" });
  }
};

exports.updateSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const file = path.join(submissionsDir, `${id}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ message: 'not_found' });
    const raw = fs.readFileSync(file, 'utf8');
    const submission = JSON.parse(raw);

    const allowed = ['name', 'amountPaid', 'refundNumber', 'referenceId', 'screenshotUrl', 'status'];
    let changed = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        submission[k] = req.body[k];
        changed[k] = req.body[k];
      }
    }

    fs.writeFileSync(file, JSON.stringify(submission, null, 2), 'utf8');

    try {
      const ws = require('../ws');
      ws.broadcast({ type: 'submission_updated', id, changed, submission });
    } catch (e) { /* ignore */ }

    res.json({ submission });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

// delete a submission and optional local screenshot file
exports.deleteSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const file = path.join(submissionsDir, `${id}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ message: 'not_found' });
    const raw = fs.readFileSync(file, 'utf8');
    const submission = JSON.parse(raw);

    // attempt to remove local screenshot file if it points to /uploads/payments/
    try {
      const url = submission.screenshotUrl || '';
      if (typeof url === 'string' && url.startsWith('/uploads/')) {
        const rel = url.replace(/^\//, ''); // uploads/...
        const localPath = path.resolve(__dirname, '../../', rel);
        if (fs.existsSync(localPath)) {
          try { fs.unlinkSync(localPath); } catch (e) { console.error('failed to unlink screenshot', e); }
        }
      }
    } catch (e) { /* ignore */ }

    // remove submission file
    try { fs.unlinkSync(file); } catch (e) { console.error('failed to unlink submission', e); }

    try {
      const ws = require('../ws');
      ws.broadcast({ type: 'submission_deleted', id, userId: submission.userId });
    } catch (e) { /* ignore */ }

    res.json({ status: 'deleted' });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

// create a "New Code Arrival" notification for a user (stored as a file under uploads/new_codes/<userId>.json)
exports.createUserNewCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { level, price, firstGameBegin, lastGameEnd } = req.body;
    if (!level || price === undefined || !firstGameBegin || !lastGameEnd) return res.status(400).json({ message: 'missing_fields' });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'user_not_found' });

    const newCodesDir = path.resolve(__dirname, '../../uploads/new_codes');
    if (!fs.existsSync(newCodesDir)) fs.mkdirSync(newCodesDir, { recursive: true });

    const payload = {
      userId: id,
      level: String(level).toUpperCase(),
      price: Number(price),
      firstGameBegin: new Date(firstGameBegin).toISOString(),
      lastGameEnd: new Date(lastGameEnd).toISOString(),
      issuedAt: new Date().toISOString(),
    };

    const file = path.join(newCodesDir, `${id}.json`);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');

    // broadcast to connected clients (clients will filter by userId)
    try {
      const ws = require('../ws');
      ws.broadcast({ type: 'new_code_arrival', userId: id, data: payload });
    } catch (e) { /* ignore */ }

    // attempt email notification
    try {
      const emailService = require('../modules/email/emailService');
      if (user && user.email && emailService && emailService.sendNewCodeArrivalEmail) {
        emailService.sendNewCodeArrivalEmail(user.email, payload).catch(() => {});
      }
    } catch (e) { /* ignore */ }

    res.json({ payload });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

// remove a previously created New Code Arrival notification
exports.deleteUserNewCode = async (req, res) => {
  try {
    const { id } = req.params;
    const newCodesDir = path.resolve(__dirname, '../../uploads/new_codes');
    const file = path.join(newCodesDir, `${id}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ message: 'not_found' });
    try { fs.unlinkSync(file); } catch (e) { console.error('failed to unlink new code file', e); }
    try {
      const ws = require('../ws');
      ws.broadcast({ type: 'new_code_removed', userId: id });
    } catch (e) { /* ignore */ }
    res.json({ status: 'deleted' });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};
