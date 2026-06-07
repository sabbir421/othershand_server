const nodemailer = require('nodemailer');

const PLACEHOLDER_PATTERNS = [
  /^your_/i,
  /^changeme$/i,
  /^placeholder$/i,
  /^xxx+$/i,
  /^replace_me/i,
];

const isPlaceholder = (value) => {
  if (!value || typeof value !== 'string') return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
};

const getSmtpConfig = () => ({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM_EMAIL || 'support@fbapilot.com',
});

const isSmtpConfigured = () => {
  const { host, user, pass } = getSmtpConfig();
  return Boolean(host && user && pass && !isPlaceholder(pass));
};

let transporter;

const getTransporter = () => {
  if (!isSmtpConfigured()) {
    return null;
  }

  if (!transporter) {
    const { host, port, secure, user, pass } = getSmtpConfig();
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  return transporter;
};

/**
 * Send an email using Nodemailer (SMTP / Resend)
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 */
const sendEmail = async (to, subject, html) => {
  const { from } = getSmtpConfig();
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isSmtpConfigured()) {
    const message = 'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.';
    if (isProduction) {
      throw new Error(message);
    }
    console.warn(`${message} Simulating email send.`);
    console.log(`[SIMULATED EMAIL to ${to}] Subject: ${subject}\n\n${html}`);
    return;
  }

  const mailTransporter = getTransporter();

  const mailOptions = {
    from,
    to,
    subject,
    html,
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending email via Nodemailer:', error);
    throw error;
  }
};

module.exports = sendEmail;
