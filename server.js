// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// init razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.get('/', (req, res) => res.send('Payment backend running'));

// Create order endpoint (called by client)
app.post('/create-order', async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required (in paise)' });

    const options = {
      amount: amount, // amount in smallest currency unit. e.g., INR ₹100 => 10000 paise
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${Date.now()}`,
      payment_capture: 1, // 1 - auto capture, 0 - manual capture
    };

    const order = await razorpay.orders.create(options);
    // Save order.id, amount to your DB with status: created
    return res.json(order);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'order creation failed' });
  }
});

// Verify payment - called by client after checkout completes
app.post('/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      // mark order as paid in DB using razorpay_order_id
      return res.json({ success: true, msg: 'Payment verified' });
    } else {
      return res.status(400).json({ success: false, msg: 'Invalid signature' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'verification failed' });
  }
});

// Webhook endpoint (secure with webhook secret) — recommended for asynchronous events
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const webhookSecret = process.env.WEBHOOK_SECRET; // set this in dashboard and .env
  const signature = req.headers['x-razorpay-signature'];
  const body = req.body; // raw buffer

  const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
  if (signature === expectedSignature) {
    const event = JSON.parse(body.toString());
    // handle events: payment.authorized, payment.captured, payment.failed, refund.processed, etc.
    // update DB accordingly
    res.json({ ok: true });
  } else {
    res.status(400).send('Invalid signature');
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
