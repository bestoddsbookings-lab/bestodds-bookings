const fs = require('fs');
const path = require('path');
const { prisma } = require('../../db');
const emailService = require('../email/emailService');
const logger = require('../../utils/logger');

const submissionsDir = path.resolve(__dirname, '../../../uploads/submissions');
fs.mkdirSync(submissionsDir, { recursive: true });

exports.listPendingPayments = async (req, res) => {
  try {
    if (!fs.existsSync(submissionsDir)) return res.json({ payments: [] });
    const files = fs.readdirSync(submissionsDir).filter(f => f.endsWith('.json'));
    const payments = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(submissionsDir, file), 'utf8');
        const s = JSON.parse(raw);
        if (s.status === 'PENDING') {
          try { s.user = await prisma.user.findUnique({ where: { id: s.userId }, select: { id: true, email: true, name: true } }); } catch(e) { s.user = null; }
          payments.push(s);
        }
      } catch (e) { /* ignore */ }
    }
    return res.json({ payments });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.approvePayment = async (req, res) => {
  try {
    const id = req.params.id;
    // try file-backed submission first
    const file = path.join(submissionsDir, `${id}.json`);
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const submission = JSON.parse(raw);
      submission.status = 'APPROVED';
      submission.approvedAt = new Date().toISOString();
      fs.writeFileSync(file, JSON.stringify(submission, null, 2), 'utf8');
      // activate user
      try { await prisma.user.update({ where: { id: submission.userId }, data: { accessStatus: 'ACTIVE' } }); } catch (e) { logger.error('failed to update user access', e); }
      // send approval email
      try { const user = await prisma.user.findUnique({ where: { id: submission.userId } }); if (user && user.email) await emailService.sendPaymentApprovedEmail(user.email); } catch (e) { logger.error('email send failed', e); }
      return res.json({ success: true });
    }

    // submission not found
    return res.status(404).json({ error: 'not_found' });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.createBookingCode = async (req, res) => {
  try {
    const { code, matchName, expiryDate, createdById, assignToAllActive } = req.body;
    if (!code || !matchName || !expiryDate) return res.status(400).json({ error: 'Missing fields' });

    const bc = await prisma.bookingCode.create({ data: { code, matchName, expiryDate: new Date(expiryDate), createdById: createdById ? parseInt(createdById, 10) : undefined } });

    if (assignToAllActive) {
      const users = await prisma.user.findMany({ where: { accessStatus: 'ACTIVE' } });
      const creates = users.map((u) => ({ userId: u.id, bookingCodeId: bc.id }));
      for (const c of creates) await prisma.userBookingCode.create({ data: c });
    }

    return res.status(201).json({ bookingCode: bc });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
