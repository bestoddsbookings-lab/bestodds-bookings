const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../prisma');

const submissionsDir = path.resolve(__dirname, '../../uploads/submissions');
fs.mkdirSync(submissionsDir, { recursive: true });

exports.submitPayment = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'unauthorized' });

    // Log incoming request
    console.log('submitPayment incoming (controllers)', {
      userId_from_middleware: req.userId,
      body: req.body,
      file: req.file ? { originalname: req.file.originalname, filename: req.file.filename } : null,
    });

    // Validate screenshot
    if (!req.file && !req.body.screenshotUrl) return res.status(400).json({ message: 'missing_screenshot' });

    // Ensure there is not an existing pending submission for this user
    const files = fs.existsSync(submissionsDir) ? fs.readdirSync(submissionsDir).filter(f => f.endsWith('.json')) : [];
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(submissionsDir, f), 'utf8');
        const s = JSON.parse(raw);
        if (s.userId === String(userId) && s.status === 'PENDING') return res.status(400).json({ message: 'pending_exists' });
      } catch (e) { /* ignore invalid files */ }
    }

    // Compose submission
    const screenshotUrl = req.file ? `/uploads/payments/${req.file.filename}` : (req.body.screenshotUrl || null);
    const referenceId = req.body.referenceId || req.body.transactionId || `REF-${userId}-${Date.now()}`;
    const amountPaid = (req.body.amount || req.body.amountPaid) ? Number(req.body.amount || req.body.amountPaid) : parseFloat(process.env.PAYMENT_AMOUNT || '50');

    const submission = {
      id: uuidv4(),
      userId: String(userId),
      name: req.body.name || null,
      amountPaid: Number.isFinite(Number(amountPaid)) ? Number(amountPaid) : parseFloat(process.env.PAYMENT_AMOUNT || '50'),
      refundNumber: req.body.refundNumber || null,
      referenceId: String(referenceId),
      screenshotUrl,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const dest = path.join(submissionsDir, `${submission.id}.json`);
    fs.writeFileSync(dest, JSON.stringify(submission, null, 2), 'utf8');

    // broadcast to admins
    try {
      const ws = require('../ws');
      ws.broadcast({ type: 'new_submission', submission });
    } catch (e) { console.error('ws broadcast failed', e); }

    return res.status(201).json({ submission });
  } catch (err) {
    console.error('submitPayment error (controllers):', err);
    return res.status(500).json({ message: 'server_error', error: err.message });
  }
};
