const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');

// Support either generic SMTP or Gmail via app password.
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';

let transporter;
if (SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT || 587,
    secure: SMTP_SECURE || false,
    auth: EMAIL_USER && EMAIL_PASS ? { user: EMAIL_USER, pass: EMAIL_PASS } : undefined,
  });
  logger.info('Email service configured using SMTP_HOST');
} else if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  logger.info('Email service configured using Gmail');
} else {
  logger.warn('No SMTP configuration found. Email sending will fail until SMTP env vars are set.');
  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
}

// Verify transporter early to surface auth errors on startup
transporter.verify().then(() => {
  logger.info('Email transporter verified OK');
}).catch((err) => {
  logger.error('Email transporter verification failed', err);
});

function buildVerifyUrl(token) {
  return `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/verify?token=${token}`;
}

async function sendVerificationEmail(to, token) {
  const verifyUrl = buildVerifyUrl(token);
  const html = `<p>Please verify your email by clicking <a href="${verifyUrl}">here</a></p><p>If the link doesn't work, copy and paste the URL below into your browser:<br/><code>${verifyUrl}</code></p>`;
  const text = `Please verify your email by opening the following link: ${verifyUrl}`;
  try {
    const info = await transporter.sendMail({
      from: EMAIL_USER || `no-reply@${process.env.APP_DOMAIN || 'localhost'}`,
      to,
      subject: 'Verify your email',
      text,
      html,
    });
    logger.info(`Verification email sent to ${to} (${info.messageId || 'no-message-id'})`);
    return info;
  } catch (err) {
    logger.error('Failed to send verification email', err);
    throw err;
  }
}

async function sendPaymentApprovedEmail(to) {
  const html = `<p>Your payment has been confirmed. You now have access.</p>`;
  const text = 'Your payment has been confirmed. You now have access.';
  return transporter.sendMail({
    from: EMAIL_USER || `no-reply@${process.env.APP_DOMAIN || 'localhost'}`,
    to,
    subject: 'Payment Approved',
    text,
    html,
  });
}

async function sendBookingCodeEmail(to, code) {
  const html = `<p>Your booking code: <strong>${code}</strong></p>`;
  const text = `Your booking code: ${code}`;
  return transporter.sendMail({
    from: EMAIL_USER || `no-reply@${process.env.APP_DOMAIN || 'localhost'}`,
    to,
    subject: 'Your Booking Code',
    text,
    html,
  });
}

module.exports = { sendVerificationEmail, sendPaymentApprovedEmail, sendBookingCodeEmail };
