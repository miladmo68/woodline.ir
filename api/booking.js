'use strict';

const nodemailer = require('nodemailer');
const validator = require('validator');

const MAIL_TO = process.env.MAIL_TO || process.env.TO_EMAIL || 'info@tarahanchoob.com';
const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@tarahanchoob.com';

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE
    ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
    : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  return transporter;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeText(str, maxLen) {
  if (str === undefined || str === null) return '';
  let s = String(str).replace(/[\r\n\t]+/g, ' ').trim();
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (maxLen && s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

function sanitizeMultiline(str, maxLen) {
  if (str === undefined || str === null) return '';
  let s = String(str).replace(/\r\n/g, '\n').trim();
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (maxLen && s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

const HITS = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;
function rateLimited(ip) {
  const now = Date.now();
  const rec = HITS.get(ip);
  if (!rec || now - rec.start > WINDOW_MS) {
    HITS.set(ip, { start: now, count: 1 });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_HITS;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    if (rateLimited(ip)) {
      return res.status(429).json({
        success: false,
        message: 'درخواست‌های زیادی ارسال شده. لطفاً چند دقیقه دیگر تلاش کنید.',
      });
    }

    const honeypot = sanitizeText(body.website || body.url_field || '', 200);
    if (honeypot) {
      return res.status(200).json({ success: true, message: 'Thank you.' });
    }

    const contact = sanitizeText(body.contact, 120);
    const phone   = sanitizeText(body.phone,   40);
    const email   = sanitizeText(body.email,   160).toLowerCase();
    const message = sanitizeMultiline(body.message, 4000);
    const service = sanitizeText(body.service, 120) || 'استعلام تماس';
    const kitchenStyle = sanitizeText(body.kitchen_style, 60);
    const material     = sanitizeText(body.material, 60);
    const budget       = sanitizeText(body.budget, 80);

    const errors = {};

    if (!contact) errors.contact = 'لطفاً نام خود را وارد کنید.';

    if (!email && !phone) {
      errors.email = 'لطفاً ایمیل یا شماره تماس وارد کنید.';
      errors.phone = 'لطفاً ایمیل یا شماره تماس وارد کنید.';
    }

    if (email && !validator.isEmail(email)) {
      errors.email = 'لطفاً یک ایمیل معتبر وارد کنید.';
    }

    if (phone) {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        errors.phone = 'لطفاً شماره تماس معتبر وارد کنید.';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,
        message: 'برخی فیلدها نیاز به اصلاح دارند.',
        errors,
      });
    }

    const tx = getTransporter();
    if (!tx) {
      console.error('[booking] SMTP not configured (missing SMTP_HOST/USER/PASS).');
      return res.status(500).json({
        success: false,
        message: 'سیستم تماس موقتاً در دسترس نیست. لطفاً مستقیماً با ما تماس بگیرید.',
      });
    }

    const lines = [
      ['نام', contact],
      ['تلفن', phone],
      ['ایمیل', email],
      ['موضوع', service],
      ['سبک آشپزخانه', kitchenStyle],
      ['متریال', material],
      ['بودجه', budget],
      ['پیام', message],
    ];

    const textBody =
      'درخواست تماس جدید از tarahanchoob.com\n' +
      '----------------------------------------\n' +
      lines.map(([k, v]) => k + ': ' + (v || '-')).join('\n') +
      '\n';

    const htmlRows = lines
      .map(
        ([k, v]) =>
          '<tr>' +
            '<td style="padding:6px 12px;background:#f4f6f8;font-weight:600;vertical-align:top;white-space:nowrap;">' +
              escapeHtml(k) +
            '</td>' +
            '<td style="padding:6px 12px;vertical-align:top;">' +
              (v ? escapeHtml(v).replace(/\n/g, '<br>') : '<span style="color:#999">&mdash;</span>') +
            '</td>' +
          '</tr>'
      )
      .join('');

    const htmlBody =
      '<div style="font-family:Tahoma,Arial,sans-serif;color:#222;max-width:640px;direction:rtl;">' +
        '<h2 style="color:#8B6914;margin:0 0 12px;">درخواست تماس جدید</h2>' +
        '<p style="margin:0 0 16px;color:#555;">ارسال‌شده از tarahanchoob.com</p>' +
        '<table style="border-collapse:collapse;width:100%;font-size:14px;border:1px solid #e6e9ec;">' +
          htmlRows +
        '</table>' +
      '</div>';

    try {
      await tx.sendMail({
        from: MAIL_FROM,
        to: MAIL_TO,
        subject: 'درخواست تماس — ' + (contact || 'وب‌سایت') + ' (' + service + ')',
        text: textBody,
        html: htmlBody,
        replyTo: email || undefined,
      });
    } catch (err) {
      console.error('[booking] sendMail failed:', err && err.message);
      return res.status(502).json({
        success: false,
        message: 'ارسال پیام با خطا مواجه شد. لطفاً دوباره تلاش کنید یا مستقیماً تماس بگیرید.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'پیام شما دریافت شد. تا ۲۴ ساعت آینده با شما تماس خواهیم گرفت.',
    });
  } catch (err) {
    console.error('[booking] unexpected error:', err && err.message);
    return res.status(500).json({
      success: false,
      message: 'خطایی رخ داد. لطفاً دوباره تلاش کنید.',
    });
  }
};
