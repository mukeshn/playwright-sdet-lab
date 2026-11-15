// Summit Supply Co. storefront - shared client logic
export const api = async (path, opts = {}) => {
  const res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw Object.assign(new Error(data?.message || data?.error || res.statusText), { status: res.status, data });
  return data;
};
export const money = (v, locale = document.documentElement.lang || 'de-DE') => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(v);

const KEY = 'summit.cart';
export const cart = {
  read: () => JSON.parse(localStorage.getItem(KEY) || '[]'),
  write: (items) => { localStorage.setItem(KEY, JSON.stringify(items)); renderBadge(); },
  add(productId, size, quantity = 1) {
    const items = cart.read();
    const hit = items.find((i) => i.productId === productId && i.size === size);
    hit ? (hit.quantity += quantity) : items.push({ productId, size, quantity });
    cart.write(items);
  },
  setQty(productId, size, quantity) { cart.write(cart.read().map((i) => (i.productId === productId && i.size === size ? { ...i, quantity } : i)).filter((i) => i.quantity > 0)); },
  remove(productId, size) { cart.write(cart.read().filter((i) => !(i.productId === productId && i.size === size))); },
  clear() { cart.write([]); },
  count: () => cart.read().reduce((s, i) => s + i.quantity, 0),
};
export const session = {
  get: () => JSON.parse(localStorage.getItem('summit.session') || 'null'),
  set: (s) => localStorage.setItem('summit.session', JSON.stringify(s)),
  clear: () => localStorage.removeItem('summit.session'),
};

export function renderBadge() {
  const b = document.querySelector('[data-testid="cart-count"]');
  if (b) { const n = cart.count(); b.textContent = n; b.classList.toggle('hidden', n === 0); }
}

export function renderHeader() {
  const s = session.get();
  const h = document.createElement('header');
  h.className = 'top';
  h.innerHTML = `
    <a href="/shop/index.html" data-testid="logo"><strong>Summit Supply Co.</strong></a>
    <button class="btn secondary menu-toggle" aria-label="Open menu" data-testid="menu-toggle">Menu</button>
    <nav class="links" aria-label="Main"><a href="/shop/index.html?category=Footwear">Footwear</a> · <a href="/shop/index.html?category=Apparel">Apparel</a> · <a href="/shop/index.html?category=Accessories">Accessories</a></nav>
    <span class="spacer"></span>
    ${s ? `<span data-testid="user-name">Hi, ${s.user.name}</span> <a href="#" data-testid="logout">Sign out</a>` : `<a href="/shop/login.html" data-testid="login-link">Sign in</a>`}
    <a href="/shop/cart.html" data-testid="cart-link" aria-label="Cart">Cart <span class="badge hidden" data-testid="cart-count">0</span></a>`;
  document.body.prepend(h);
  const menu = h.querySelector('.menu-toggle');
  menu.addEventListener('click', () => { const nav = h.querySelector('nav.links'); nav.style.display = nav.style.display === 'block' ? '' : 'block'; });
  h.querySelector('[data-testid="logout"]')?.addEventListener('click', (e) => { e.preventDefault(); session.clear(); location.href = '/shop/login.html'; });
  renderBadge();
}
