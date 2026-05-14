const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const submissionsDir = path.resolve(__dirname, '../../../uploads/submissions');
fs.mkdirSync(submissionsDir, { recursive: true });

exports.submitPayment = async (req, res) => {
  try {
    // Log incoming request for debugging multipart/form-data issues
    console.log('submitPayment incoming', {
      headers: {
        authorization: req.headers.authorization,
      },
      userId_from_middleware: req.userId,
      body: req.body,
      file: req.file ? { originalname: req.file.originalname, filename: req.file.filename, path: req.file.path } : null,
    });

    let { userId, amount, transactionId, senderNumber } = req.body;
    // prefer authenticated userId set by auth middleware
    if (!userId && req.userId) userId = req.userId;

    if (!userId) return res.status(400).json({ error: 'Missing user' });

    // Enforce single active pending submission per user (file-backed)
    try {
      const files = fs.existsSync(submissionsDir) ? fs.readdirSync(submissionsDir).filter(f => f.endsWith('.json')) : [];
      for (const f of files) {
        try {
          const raw = fs.readFileSync(path.join(submissionsDir, f), 'utf8');
          const s = JSON.parse(raw);
          if (s.userId === String(userId) && s.status === 'PENDING') return res.status(400).json({ error: 'A pending payment already exists for this user' });
        } catch (e) { /* ignore invalid files */ }
      }
    } catch (e) { /* ignore */ }

    // Validate that a file was uploaded (required)
    if (!req.file && !req.body.screenshotUrl) return res.status(400).json({ error: 'Missing screenshot file' });

    // Use configured fixed amount if not provided
    const PAYMENT_AMOUNT = parseFloat(process.env.PAYMENT_AMOUNT || '50');
    const finalAmount = (amount === undefined || amount === null || amount === '') ? PAYMENT_AMOUNT : parseFloat(amount);

    const referenceCode = `REF-${userId}-${Date.now()}`;
    const screenshotUrl = req.file ? `/uploads/payments/${req.file.filename}` : req.body.screenshotUrl || null;

    // Ensure transactionId is set (DB previously required transactionId). Use referenceCode as fallback.
    const txId = transactionId && String(transactionId).trim() !== '' ? transactionId : referenceCode;

    console.log('submitPayment creating payment record', { userId, finalAmount, txId, referenceCode, screenshotUrl });

    // Create a file-backed submission record instead of DB payment
    const submissionId = crypto.randomUUID();
    const submission = {
      id: submissionId,
      userId: String(userId),
      name: req.body.name || null,
      amountPaid: Number.isFinite(Number(finalAmount)) ? Number(finalAmount) : PAYMENT_AMOUNT,
      refundNumber: req.body.refundNumber || null,
      referenceId: txId || referenceCode,
      screenshotUrl: screenshotUrl,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const dest = path.join(submissionsDir, `${submissionId}.json`);
    fs.writeFileSync(dest, JSON.stringify(submission, null, 2), 'utf8');

    // notify connected clients (admins) about new pending submission
    try {
      const ws = require('../../ws');
      ws.broadcast({ type: 'new_submission', submission });
    } catch (e) {
      console.error('ws broadcast failed', e);
    }

    return res.status(201).json({ submission });
  } catch (err) {
    // Log full error including non-enumerable properties
    try {
      const eobj = {};
      Object.getOwnPropertyNames(err).forEach((k) => { eobj[k] = err[k]; });
      logger.error('submitPayment error', eobj);
      console.error('submitPayment error (full):', eobj);
    } catch (e) {
      logger.error(err);
      console.error('submitPayment error stack:', err.stack || err);
    }
    // Handle common Prisma errors with clearer responses
    try {
      if (err.code === 'P2002') {
        // Unique constraint failed
        return res.status(400).json({ error: 'Duplicate value error', detail: err.meta });
      }
      if (err.code === 'P2025') {
        // Record not found
        return res.status(404).json({ error: 'Related record not found' });
      }
    } catch (e) {
      console.error('Error while handling prisma error', e);
    }

    // Return detailed error to client for debugging (dev only)
    return res.status(500).json({ error: err.message || 'Server error', name: err.name, code: err.code, meta: err.meta });
  }
};
