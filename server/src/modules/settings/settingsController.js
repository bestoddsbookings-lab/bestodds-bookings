const fs = require('fs');
const path = require('path');

const storagePath = path.resolve(__dirname, '../../../uploads/payment_info.json');

function readConfig() {
  try {
    if (!fs.existsSync(storagePath)) return {};
    const raw = fs.readFileSync(storagePath, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    console.error('readConfig error', e);
    return {};
  }
}

function writeConfig(obj) {
  try {
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    fs.writeFileSync(storagePath, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('writeConfig error', e);
    return false;
  }
}

exports.getPaymentInfo = async (req, res) => {
  try {
    const config = readConfig();
    res.json({ payment: config.payment || null });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

exports.setPaymentInfo = async (req, res) => {
  try {
    const { momoNumber, accountName, paymentNote, amount } = req.body;
    const cfg = readConfig();
    cfg.payment = { momoNumber, accountName, paymentNote, amount };
    const ok = writeConfig(cfg);
    if (!ok) return res.status(500).json({ message: 'write_failed' });
    res.json({ payment: cfg.payment });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

// Public endpoint
exports.getPaymentInfoPublic = async (req, res) => {
  try {
    const config = readConfig();
    res.json({ payment: config.payment || null });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

// Support info (admin editable)
exports.getSupportInfo = async (req, res) => {
  try {
    const config = readConfig();
    res.json({ support: config.support || null });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

exports.setSupportInfo = async (req, res) => {
  try {
    const { contactEmail, contactPhone, contactMessage, supportUrl } = req.body;
    const cfg = readConfig();
    cfg.support = { contactEmail: contactEmail || null, contactPhone: contactPhone || null, contactMessage: contactMessage || null, supportUrl: supportUrl || null };
    const ok = writeConfig(cfg);
    if (!ok) return res.status(500).json({ message: 'write_failed' });
    res.json({ support: cfg.support });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

// Public support info
exports.getSupportInfoPublic = async (req, res) => {
  try {
    const config = readConfig();
    res.json({ support: config.support || null });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};
