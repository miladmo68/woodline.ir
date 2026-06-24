'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bookingHandler = require('./api/booking');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));

const bookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'درخواست‌های زیادی ارسال شده. لطفاً چند دقیقه دیگر تلاش کنید.',
  },
});

app.post('/api/booking', bookingLimiter, (req, res) => bookingHandler(req, res));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: NODE_ENV });
});

app.use(
  express.static(path.join(__dirname), {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
      if (/\.(woff2?|jpg|jpeg|png|gif|svg|ico)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=2592000');
      }
    },
  })
);

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Not found.' });
  }
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('Tarahan Choob server running on http://localhost:' + PORT + ' (' + NODE_ENV + ')');
});
