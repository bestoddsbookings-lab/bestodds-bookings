const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../db');
const emailService = require('../email/emailService');
const logger = require('../../utils/logger');

const JWT_EXPIRES = process.env.JWT_EXPIRES || '6h';

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed } });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    await emailService.sendVerificationEmail(user.email, token);

    return res.status(201).json({ message: 'Registered. Check email to verify.' });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Invalid token');

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    await prisma.user.update({ where: { id: payload.userId }, data: { isVerified: true } });
    return res.send('Email verified. You can now login.');
  } catch (err) {
    logger.error(err);
    return res.status(400).send('Invalid or expired token');
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    // Strict single-session: deactivate existing sessions
    await prisma.session.updateMany({ where: { userId: user.id, isActive: true }, data: { isActive: false } });

    const ip = req.ip || req.connection?.remoteAddress || '';
    await prisma.session.create({ data: { userId: user.id, deviceId: deviceId || 'unknown', ipAddress: ip, isActive: true } });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return res.json({ token });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
