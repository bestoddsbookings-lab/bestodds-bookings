const prisma = require("../prisma");
const bcrypt = require("bcrypt");
const uuidv4 = require('uuidv4');
const { signToken } = require("../utils/jwt");
const emailService = require("../modules/email/emailService");

let verifyTokens = {}; // MVP in-memory store

// expose verifyTokens for admin resend helper (in-memory, non-persistent)
exports.verifyTokens = verifyTokens;

exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    console.log('Register: received payload', { email, hasPassword: !!password, hasName: !!name });

    const exists = await prisma.user.findUnique({ where: { email } });
    console.log('Register: exists check', !!exists);
    if (exists) return res.status(400).json({ message: "duplicate_email" });

    const hash = await bcrypt.hash(password, 10);
    console.log('Register: password hashed');

    const user = await prisma.user.create({
      data: { email, password: hash, name },
    });
    console.log('Register: user created', { id: user.id });

    const token = uuidv4();
    verifyTokens[token] = user.id;
    console.log('Register: verification token generated');

    try {
      // send verification email (uses .env EMAIL_USER/EMAIL_PASS)
      await emailService.sendVerificationEmail(user.email, token);
    } catch (err) {
      // fallback: still expose link in server log for dev
      console.error('Failed to send verification email, falling back to console link', err);
      console.log(`VERIFY: https://bestodds-bookings.onrender.com/api/auth/verify?token=${token}`);
    }

    res.status(201).json({ message: "verification_sent" });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: "server_error" });
  }
};

exports.verify = async (req, res) => {
  try {
    const { token } = req.query;

    const userId = verifyTokens[token];
    if (!userId) return res.status(400).json({ message: "invalid_token" });

    await prisma.user.update({ where: { id: userId }, data: { isVerified: true } });

    delete verifyTokens[token];

    res.json({ message: "verified" });
  } catch (err) {
    res.status(500).json({ message: "server_error" });
  }
};

exports.resend = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'missing_email' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'not_found' });
    if (user.isVerified) return res.status(400).json({ message: 'already_verified' });

    const token = uuidv4();
    verifyTokens[token] = user.id;

    try {
      await emailService.sendVerificationEmail(user.email, token);
      return res.json({ message: 'verification_sent' });
    } catch (err) {
      console.error('Failed to send verification email on resend', err);
      const link = `https://bestodds-bookings.onrender.com/api/auth/verify?token=${token}`;
      return res.json({ message: 'verification_sent_fallback', link });
    }
  } catch (err) {
    return res.status(500).json({ message: 'server_error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: "invalid_credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "invalid_credentials" });

    if (!user.isVerified) return res.status(403).json({ message: "not_verified" });
    if (user.accessStatus === 'BANNED') return res.status(403).json({ message: 'banned' });

    // Invalidate previous sessions
    await prisma.session.deleteMany({ where: { userId: user.id } });

    // Create new session (provide a fallback for deviceId to avoid null errors)
    const sessionDeviceId = deviceId || 'web';
    await prisma.session.create({ data: { userId: user.id, deviceId: sessionDeviceId, ipAddress: req.ip || 'unknown' } });

    const token = signToken(user.id);

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "server_error" });
  }
};

exports.me = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'unauthenticated' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, isVerified: true, accessStatus: true, name: true } });
    if (!user) return res.status(404).json({ message: 'not_found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

// allow user to update their own profile (name and email)
exports.updateMe = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'unauthenticated' });
    const { name, email } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) {
      // ensure email not in use by another user
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists && exists.id !== userId) return res.status(400).json({ message: 'email_in_use' });
      data.email = email;
      // if email changed, mark unverified (require verify flow)
      data.isVerified = false;
    }
    const updated = await prisma.user.update({ where: { id: userId }, data });
    res.json({ user: { id: updated.id, email: updated.email, name: updated.name, isVerified: updated.isVerified } });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};
