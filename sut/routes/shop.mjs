import { send } from '../lib.mjs';
import { randomUUID } from 'node:crypto';

export const VAT = { DE: 19, AT: 20, FR: 20, NL: 21, IT: 22, ES: 21, BE: 21, CH: 8.1, DK: 25, SE: 25 };
const USERS = {
  'standard@shop.test': { password: 'Passw0rd!', name: 'Alex Becker', locked: false },
  'locked@shop.test': { password: 'Passw0rd!', name: 'Locked User', locked: true },
  'admin@shop.test': { password: 'Adm1n!2026', name: 'Store Admin', locked: false, role: 'admin' },
};
const SEED = [
  ['SKU-1001', 'Trail Runner GTX', 'Footwear', 139.0, 24, 4.6],
  ['SKU-1002', 'Leather Clog Classic', 'Footwear', 119.0, 40, 4.8],
  ['SKU-1003', 'Cork Sandal Two-Strap', 'Footwear', 89.9, 3, 4.7],
  ['SKU-1004', 'Wool Hiking Socks', 'Accessories', 14.5, 120, 4.3],
  ['SKU-1005', 'Merino Base Layer', 'Apparel', 79.0, 18, 4.5],
  ['SKU-1006', 'Rain Shell Jacket', 'Apparel', 199.0, 0, 4.2],
  ['SKU-1007', 'Canvas Weekender Bag', 'Accessories', 95.0, 12, 4.4],
  ['SKU-1008', 'Suede Care Kit', 'Accessories', 19.9, 75, 4.1],
  ['SKU-1009', 'Organic Cotton Tee', 'Apparel', 29.0, 64, 4.0],
  ['SKU-1010', 'Approach Shoe Lite', 'Footwear', 159.0, 7, 4.6],
  ['SKU-1011', 'Insulated Bottle 750ml', 'Accessories', 34.0, 55, 4.7],
  ['SKU-1012', 'Fleece Midlayer', 'Apparel', 99.0, 21, 4.4],
];
const fresh = () =>
  SEED.map(([sku, name, category, price, stock, rating], i) => ({
    id: i + 1, sku, name, category, price, stock, rating,
    sizes: category === 'Footwear' ? ['38', '39', '40', '41', '42', '43', '44'] : category === 'Apparel' ? ['S', 'M', 'L', 'XL'] : ['One size'],
    description: `${name} - part of the ${category.toLowerCase()} range.`,
  }));

let products = fresh();
let nextId = 100;
const tokens = new Map();
const carts = new Map();
const orders = new Map();
export const PROMOS = { SAVE10: { type: 'percent', value: 10 }, WELCOME5: { type: 'fixed', value: 5 }, FREESHIP: { type: 'shipping' } };

export function priceOrder(items, country = 'DE', promo) {
  const lines = items.map((it) => {
    const p = products.find((x) => x.id === Number(it.productId));
    if (!p) throw Object.assign(new Error(`Unknown product ${it.productId}`), { status: 422 });
    return { productId: p.id, sku: p.sku, name: p.name, size: it.size || null, quantity: Number(it.quantity || 1), unitPrice: p.price, lineTotal: +(p.price * Number(it.quantity || 1)).toFixed(2) };
  });
  const subtotal = +lines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);
  const p = promo ? PROMOS[String(promo).toUpperCase()] : null;
  let discount = 0;
  if (p?.type === 'percent') discount = +(subtotal * p.value / 100).toFixed(2);
  if (p?.type === 'fixed') discount = Math.min(p.value, subtotal);
  const shipping = subtotal - discount >= 100 || p?.type === 'shipping' || subtotal === 0 ? 0 : 4.95;
  const vatRate = VAT[country] ?? 19;
  const net = subtotal - discount + shipping;
  const vat = +(net * vatRate / 100).toFixed(2);
  return { lines, subtotal, discount, shipping, vatRate, vat, total: +(net + vat).toFixed(2), currency: 'EUR', country };
}

function auth(ctx) {
  const h = ctx.req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  return t && tokens.get(t);
}

export function register(r) {
  r.post('/api/shop/__reset', ({ res }) => { products = fresh(); carts.clear(); orders.clear(); send(res, 200, { reset: true }); });

  r.post('/api/shop/auth/login', ({ res, body }) => {
    const u = USERS[String(body.email || '').toLowerCase()];
    if (!body.email || !body.password) return send(res, 400, { error: 'VALIDATION', message: 'email and password are required' });
    if (!u || u.password !== body.password) return send(res, 401, { error: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' });
    if (u.locked) return send(res, 423, { error: 'ACCOUNT_LOCKED', message: 'This account has been locked' });
    const token = randomUUID();
    tokens.set(token, { email: body.email.toLowerCase(), role: u.role || 'customer', name: u.name });
    send(res, 200, { token, user: { email: body.email.toLowerCase(), name: u.name, role: u.role || 'customer' }, expiresIn: 3600 });
  });

  r.get('/api/shop/products', ({ res, query }) => {
    let list = [...products];
    const q = (query.get('q') || '').toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    if (query.get('category')) list = list.filter((p) => p.category === query.get('category'));
    if (query.get('inStock') === 'true') list = list.filter((p) => p.stock > 0);
    const sort = query.get('sort');
    const sorters = { 'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price, 'name-asc': (a, b) => a.name.localeCompare(b.name), 'name-desc': (a, b) => b.name.localeCompare(a.name), rating: (a, b) => b.rating - a.rating };
    if (sort && sorters[sort]) list.sort(sorters[sort]);
    const page = Math.max(1, Number(query.get('page') || 1));
    const size = Math.min(50, Math.max(1, Number(query.get('size') || 50)));
    send(res, 200, { total: list.length, page, size, items: list.slice((page - 1) * size, page * size) });
  });

  r.get('/api/shop/products/:id', ({ res, params }) => {
    const p = products.find((x) => x.id === Number(params.id));
    p ? send(res, 200, p) : send(res, 404, { error: 'NOT_FOUND', message: `Product ${params.id} not found` });
  });

  r.post('/api/shop/products', (ctx) => {
    const u = auth(ctx);
    if (!u) return send(ctx.res, 401, { error: 'UNAUTHORIZED' });
    if (u.role !== 'admin') return send(ctx.res, 403, { error: 'FORBIDDEN', message: 'Admin role required' });
    const { name, category, price, stock = 0 } = ctx.body;
    const errors = [];
    if (!name) errors.push('name is required');
    if (!['Footwear', 'Apparel', 'Accessories'].includes(category)) errors.push('category must be Footwear, Apparel or Accessories');
    if (typeof price !== 'number' || price <= 0) errors.push('price must be a positive number');
    if (errors.length) return send(ctx.res, 422, { error: 'VALIDATION', details: errors });
    const p = { id: nextId++, sku: `SKU-${nextId + 900}`, name, category, price, stock, rating: 0, sizes: ['One size'], description: ctx.body.description || '' };
    products.push(p);
    send(ctx.res, 201, p, { location: `/api/shop/products/${p.id}` });
  });

  const update = (partial) => (ctx) => {
    const u = auth(ctx);
    if (!u) return send(ctx.res, 401, { error: 'UNAUTHORIZED' });
    if (u.role !== 'admin') return send(ctx.res, 403, { error: 'FORBIDDEN' });
    const p = products.find((x) => x.id === Number(ctx.params.id));
    if (!p) return send(ctx.res, 404, { error: 'NOT_FOUND' });
    if (!partial && (!ctx.body.name || typeof ctx.body.price !== 'number')) return send(ctx.res, 422, { error: 'VALIDATION', details: ['name and price are required for PUT'] });
    const { id, sku, ...rest } = ctx.body;
    Object.assign(p, rest);
    send(ctx.res, 200, p);
  };
  r.put('/api/shop/products/:id', update(false));
  r.patch('/api/shop/products/:id', update(true));

  r.delete('/api/shop/products/:id', (ctx) => {
    const u = auth(ctx);
    if (!u) return send(ctx.res, 401, { error: 'UNAUTHORIZED' });
    if (u.role !== 'admin') return send(ctx.res, 403, { error: 'FORBIDDEN' });
    const idx = products.findIndex((x) => x.id === Number(ctx.params.id));
    if (idx < 0) return send(ctx.res, 404, { error: 'NOT_FOUND' });
    products.splice(idx, 1);
    send(ctx.res, 204, '');
  });

  r.post('/api/shop/carts', ({ res }) => {
    const cart = { id: randomUUID(), items: [], createdAt: new Date().toISOString() };
    carts.set(cart.id, cart);
    send(res, 201, cart);
  });
  r.get('/api/shop/carts/:id', ({ res, params, query }) => {
    const c = carts.get(params.id);
    if (!c) return send(res, 404, { error: 'NOT_FOUND' });
    send(res, 200, { ...c, pricing: priceOrder(c.items, query.get('country') || 'DE', query.get('promo')) });
  });
  r.post('/api/shop/carts/:id/items', ({ res, params, body }) => {
    const c = carts.get(params.id);
    if (!c) return send(res, 404, { error: 'NOT_FOUND' });
    const p = products.find((x) => x.id === Number(body.productId));
    if (!p) return send(res, 422, { error: 'VALIDATION', details: ['productId is invalid'] });
    const qty = Number(body.quantity || 1);
    if (!Number.isInteger(qty) || qty < 1) return send(res, 422, { error: 'VALIDATION', details: ['quantity must be a positive integer'] });
    const existing = c.items.find((i) => i.productId === p.id && i.size === (body.size || null));
    const total = (existing?.quantity || 0) + qty;
    if (total > p.stock) return send(res, 409, { error: 'INSUFFICIENT_STOCK', available: p.stock });
    existing ? (existing.quantity = total) : c.items.push({ productId: p.id, size: body.size || null, quantity: qty });
    send(res, 200, c);
  });
  r.delete('/api/shop/carts/:id/items/:productId', ({ res, params }) => {
    const c = carts.get(params.id);
    if (!c) return send(res, 404, { error: 'NOT_FOUND' });
    c.items = c.items.filter((i) => i.productId !== Number(params.productId));
    send(res, 200, c);
  });

  r.post('/api/shop/pricing', ({ res, body }) => {
    try { send(res, 200, priceOrder(body.items || [], body.country, body.promo)); }
    catch (e) { send(res, e.status || 400, { error: 'VALIDATION', message: e.message }); }
  });

  r.post('/api/shop/orders', ({ res, body }) => {
    const errors = [];
    const c = body.customer || {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email || '')) errors.push('customer.email is invalid');
    if (!c.firstName) errors.push('customer.firstName is required');
    if (!c.lastName) errors.push('customer.lastName is required');
    if (!c.street) errors.push('customer.street is required');
    if (!/^\d{4,5}$/.test(c.postcode || '')) errors.push('customer.postcode must be 4-5 digits');
    if (!VAT[c.country]) errors.push('customer.country is not supported');
    if (!Array.isArray(body.items) || body.items.length === 0) errors.push('items must not be empty');
    if (!['card', 'paypal', 'invoice'].includes(body.paymentMethod)) errors.push('paymentMethod must be card, paypal or invoice');
    if (errors.length) return send(res, 422, { error: 'VALIDATION', details: errors });
    let pricing;
    try { pricing = priceOrder(body.items, c.country, body.promo); } catch (e) { return send(res, 422, { error: 'VALIDATION', details: [e.message] }); }
    for (const l of pricing.lines) {
      const p = products.find((x) => x.id === l.productId);
      if (p.stock < l.quantity) return send(res, 409, { error: 'INSUFFICIENT_STOCK', sku: p.sku, available: p.stock });
    }
    for (const l of pricing.lines) products.find((x) => x.id === l.productId).stock -= l.quantity;
    const order = { id: `ORD-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`, status: 'CONFIRMED', createdAt: new Date().toISOString(), customer: c, paymentMethod: body.paymentMethod, promo: body.promo || null, ...pricing };
    orders.set(order.id, order);
    send(res, 201, order, { location: `/api/shop/orders/${order.id}` });
  });
  r.get('/api/shop/orders/:id', ({ res, params }) => {
    const o = orders.get(params.id);
    o ? send(res, 200, o) : send(res, 404, { error: 'NOT_FOUND' });
  });
  r.post('/api/shop/orders/:id/cancel', ({ res, params }) => {
    const o = orders.get(params.id);
    if (!o) return send(res, 404, { error: 'NOT_FOUND' });
    if (o.status === 'CANCELLED') return send(res, 409, { error: 'ALREADY_CANCELLED' });
    o.status = 'CANCELLED';
    send(res, 200, o);
  });
}
