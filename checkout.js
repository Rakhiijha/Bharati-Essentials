// checkout.js - runs in browser
const payBtn = document.getElementById('payBtn');

payBtn.addEventListener('click', async () => {
  // 1) create order on server
  const amountInPaise = 99 * 100; // ₹99
  const res = await fetch('http://localhost:4000/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountInPaise }),
  });
  const order = await res.json();

  // 2) open Razorpay checkout
  const options = {
    key: 'rzp_test_xxx', // RAZORPAY_KEY_ID (test) — safe to put public key here
    amount: order.amount,
    currency: order.currency,
    name: 'My Shop',
    description: 'Order #' + order.id,
    order_id: order.id,
    handler: async function (response) {
      // 3) verify payment on server
      const verify = await fetch('http://localhost:4000/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
      });
      const result = await verify.json();
      if (result.success) {
        alert('Payment success!'); // replace with nice UI and redirect
      } else {
        alert('Payment verification failed');
      }
    },
    prefill: { name: '', email: '', contact: '' },
    notes: { address: 'Customer address' },
    theme: { color: '#F37254' }
  };

  const rzp = new Razorpay(options);
  rzp.open();
});
