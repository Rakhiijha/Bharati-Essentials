
  

/* ---------- Helpers for cart storage ---------- */
const CART_KEY = 'bharati_cart_v1';

function readCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch (e) { return []; }
}
function writeCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

/* ---------- Utilities ---------- */
function q(el, sel) { return el.querySelector(sel); }
function textOf(el, sel) { const e = q(el, sel); return e ? e.innerText.trim() : null; }

/* ---------- Extract product info from DOM (robust) ---------- */
function extractProductInfoFromButton(btn) {
  // 1) Prefer explicit data-* attributes on the button if present
  const id = btn.dataset.id || null;
  const nameAttr = btn.dataset.name || null;
  const priceAttr = btn.dataset.price || null;
  const imgAttr = btn.dataset.img || null;

  if (nameAttr || priceAttr || imgAttr) {
    return {
      id: id || (nameAttr ? nameAttr.replace(/\s+/g,'_').toLowerCase() : ('p_'+Date.now())),
      name: nameAttr || 'Product',
      price: priceAttr ? Number(priceAttr) : 0,
      img: imgAttr || ''
    };
  }

  // 2) Otherwise traverse up to nearest product container: common class names or data attributes
  let card = btn.closest('.product-card, .product, .card, [data-product-id]') || btn.parentElement;
  // Expand search up to 3 levels if needed
  for (let i=0;i<3 && card && card.tagName!=='BODY' && !card.classList.contains('product-card'); i++) {
    if (card.querySelector('.product-name, .title, h3, h2, .name')) break;
    card = card.parentElement;
  }
  if (!card) card = btn.parentElement;

  // 3) Try common selectors inside the card
  let name = textOf(card, '.product-name') || textOf(card, '.title') || textOf(card, 'h3') || textOf(card, 'h2') || textOf(card, '.name') || btn.getAttribute('aria-label');
  if (!name) name = 'Product';

  // Price: look for element containing ₹ or digits
  let priceText = null;
  // common price selectors
  const priceSelectors = ['.price','.product-price','.amount','.cost'];
  for (const s of priceSelectors) {
    const p = textOf(card, s);
    if (p && /[0-9]/.test(p)) { priceText = p; break; }
  }
  if (!priceText) {
    // fallback: find any element in card with a rupee symbol or digits
    const all = Array.from(card.querySelectorAll('*')).map(n => n.innerText.trim()).filter(t => t);
    for (const t of all) {
      if (t.includes('₹') || /\b\d+\b/.test(t)) { priceText = t; break; }
    }
  }
  // extract number from priceText
  let price = 0;
  if (priceText) {
    const m = priceText.replace(/\s/g,'').match(/(\d+(\.\d+)?)/);
    if (m) price = Number(m[1]);
  }

  // image
  let img = '';
  const imgEl = card.querySelector('img') || btn.querySelector('img');
  if (imgEl && imgEl.src) img = imgEl.src;

  // id
  const pid = card.dataset.productId || card.id || name.replace(/\s+/g,'_').toLowerCase();

  return { id: pid, name, price, img };
}

/* ---------- Add to cart behavior ---------- */
function addToCart(product) {
  const cart = readCart();
  const existing = cart.find(it => it.id === product.id);
  if (existing) existing.qty += 1;
  else cart.push({ ...product, qty: 1 });

  writeCart(cart);
  showToast(`${product.name} added to cart`);
}

/* ---------- UI: badge + simple cart popup ---------- */
function updateCartBadge() {
  const cart = readCart();
  const qty = cart.reduce((s,i)=>s+i.qty,0);
  const badge = document.getElementById('cart-badge');
  if (badge) {
    badge.textContent = qty > 0 ? qty : '';
  }
}

function ensureCartButton() {
  if (document.getElementById('cart-button')) return;
  const btn = document.createElement('button');
  btn.id = 'cart-button';
  btn.type = 'button';
  btn.style = 'position:fixed;right:18px;bottom:18px;padding:10px 14px;border-radius:10px;border:1px solid #ddd;background:#fff;z-index:9999;';
  btn.innerHTML = 'Cart <span id="cart-badge" style="background:#e63946;color:#fff;padding:3px 7px;border-radius:10px;margin-left:6px;font-weight:600;"></span>';
  btn.addEventListener('click', openCartModal);
  document.body.appendChild(btn);
}

/* ---------- Simple toast ---------- */
function showToast(msg) {
  const t = document.createElement('div');
  t.innerText = msg;
  t.style = 'position:fixed;left:18px;bottom:18px;background:#08306a;color:#fff;padding:8px 12px;border-radius:8px;z-index:99999;opacity:0;transition:opacity .18s';
  document.body.appendChild(t);
  // fade in
  requestAnimationFrame(()=> t.style.opacity = 1);
  setTimeout(()=> { t.style.opacity = 0; setTimeout(()=> t.remove(),180); }, 1800);
}

/* ---------- Cart modal (very small) ---------- */
function openCartModal() {
  const cart = readCart();
  // remove old if present
  const old = document.getElementById('simple-cart-modal');
  if (old) old.remove();

  const m = document.createElement('div');
  m.id = 'simple-cart-modal';
  m.style = 'position:fixed;right:18px;bottom:70px;width:360px;background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.12);z-index:99999;padding:12px;font-family:inherit;';
  m.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <strong>Cart (${cart.reduce((s,i)=>s+i.qty,0)})</strong>
      <button id="close-cart-simple" style="background:transparent;border:0;cursor:pointer;font-size:18px;">✕</button>
    </div>
    <div id="simple-cart-items" style="max-height:260px;overflow:auto;"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
      <strong>Total: ₹${cart.reduce((s,i)=>s + (i.price * i.qty), 0).toFixed(0)}</strong>
      <div>
        <button id="clear-cart" style="margin-right:8px;padding:6px 10px;border-radius:8px;">Clear</button>
        <button id="checkout-sim" style="padding:6px 10px;border-radius:8px;background:#0b57a4;color:#fff;border:0;">Checkout</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const itemsEl = m.querySelector('#simple-cart-items');
  if (!cart.length) {
    itemsEl.innerHTML = '<div style="padding:12px 0;color:#555;">Your cart is empty</div>';
  } else {
    itemsEl.innerHTML = cart.map(it => `
      <div style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #f1f1f1;">
        <img src="${it.img||''}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;">
        <div style="flex:1;">
          <div style="font-weight:600">${it.name}</div>
          <div style="font-size:13px;color:#666;">₹${it.price} × ${it.qty}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <button data-id="${it.id}" class="inc-btn" style="width:28px;height:28px;">+</button>
          <button data-id="${it.id}" class="dec-btn" style="width:28px;height:28px;">-</button>
        </div>
      </div>
    `).join('');
    // wire inc/dec
    m.querySelectorAll('.inc-btn').forEach(b => b.addEventListener('click', () => { changeQty(b.dataset.id, 1); openCartModal(); }));
    m.querySelectorAll('.dec-btn').forEach(b => b.addEventListener('click', () => { changeQty(b.dataset.id, -1); openCartModal(); }));
  }

  m.querySelector('#close-cart-simple').addEventListener('click', () => m.remove());
  m.querySelector('#clear-cart').addEventListener('click', () => { writeCart([]); m.remove(); });
  m.querySelector('#checkout-sim').addEventListener('click', () => {
    alert('Checkout not implemented yet. Next we will connect real payment or a server. For now cart is stored locally.');
  });
}

/* ---------- change qty ---------- */
function changeQty(id, delta) {
  const cart = readCart();
  const idx = cart.findIndex(it=>it.id === id);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx,1);
  writeCart(cart);
}

/* ---------- Auto-bind Add buttons on page load ---------- */
function bindAddButtons() {
  // possible class names on your Add buttons: .add, .add-to-cart, .btn-add, or text 'Add'
  const candidates = Array.from(document.querySelectorAll('button, a'));
  // keep ones that likely are "Add" buttons
  const addButtons = candidates.filter(el => {
    // if element has classnames that include 'add' or 'cart'
    const cls = (el.className || '').toString().toLowerCase();
    if (/\b(add-to-cart|add|btn-add|cart-add|add-cart|addbtn)\b/.test(cls)) return true;
    const txt = (el.innerText || '').toString().trim().toLowerCase();
    if (txt === 'add' || txt === 'add to cart' || txt === 'add item' ) return true;
    return false;
  });

  // attach events
  addButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const p = extractProductInfoFromButton(btn);
      addToCart(p);
    });
  });

  // if nothing matched, also try to attach to any small button using label 'Add' inside product card areas:
  if (addButtons.length === 0) {
    document.querySelectorAll('.product-card button, .card button, .product button').forEach(btn => {
      const txt = (btn.innerText||'').trim().toLowerCase();
      if (txt.includes('add')) btn.addEventListener('click', (e)=>{ e.preventDefault(); addToCart(extractProductInfoFromButton(btn)); });
    });
  }
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  bindAddButtons();
  ensureCartButton();
  updateCartBadge();
});

