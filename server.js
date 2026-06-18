const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const ROOT = __dirname;
const PRODUCTS_FILE = path.join(ROOT, 'products.json');
const ORDERS_FILE = path.join(ROOT, 'orders.json');
const UPLOADS_DIR = path.join(ROOT, 'uploads');
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PRODUCTS_FILE)) fs.writeFileSync(PRODUCTS_FILE, '[]');
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function safeReadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}
function json(res, status, data) { send(res, status, JSON.stringify(data), 'application/json; charset=utf-8'); }
function file(res, filePath) {
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return send(res, 404, 'Not found');
  const ext = path.extname(filePath).toLowerCase();
  const cache = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.css', '.js'].includes(ext) ? 'public, max-age=86400' : 'no-store';
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Cache-Control': cache });
  fs.createReadStream(filePath).pipe(res);
}
function body(req, max = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > max) { reject(new Error('Body too large')); req.destroy(); }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}
function isAdmin(req, data = {}) {
  const header = req.headers['x-admin-password'];
  const pass = header || data.adminPassword || '';
  return Boolean(ADMIN_PASSWORD && pass === ADMIN_PASSWORD);
}
function orderTotal(items, products) {
  let total = 0;
  const cleanItems = [];
  for (const item of items || []) {
    const p = products.find(x => x.id === item.id);
    const qty = Math.max(1, Math.min(99, Number(item.qty || 1)));
    if (p) {
      total += Number(p.price || 0) * qty;
      cleanItems.push({ id: p.id, name: p.name, price: p.price, qty, image: p.image });
    }
  }
  return { total, cleanItems };
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(u.pathname);

    if (pathname === '/api/health') return json(res, 200, { ok: true, name: 'Aerova Egypt' });

    if (req.method === 'GET' && pathname === '/api/products') {
      return json(res, 200, safeReadJSON(PRODUCTS_FILE, []));
    }
    if (req.method === 'GET' && pathname.startsWith('/api/products/')) {
      const id = pathname.split('/').pop();
      const product = safeReadJSON(PRODUCTS_FILE, []).find(p => p.id === id);
      return product ? json(res, 200, product) : json(res, 404, { error: 'Product not found' });
    }
    if (req.method === 'POST' && pathname === '/api/orders') {
      const data = await body(req);
      const products = safeReadJSON(PRODUCTS_FILE, []);
      const { total, cleanItems } = orderTotal(data.items, products);
      if (!cleanItems.length) return json(res, 400, { error: 'Cart is empty' });
      if (!data.customer || !data.customer.name || !data.customer.phone || !data.customer.address) {
        return json(res, 400, { error: 'Missing customer data' });
      }
      const orders = safeReadJSON(ORDERS_FILE, []);
      const order = {
        id: 'AE-' + Date.now().toString().slice(-7) + '-' + crypto.randomBytes(2).toString('hex').toUpperCase(),
        status: 'جديد',
        customer: data.customer,
        items: cleanItems,
        total,
        createdAt: new Date().toISOString()
      };
      orders.unshift(order);
      writeJSON(ORDERS_FILE, orders);
      return json(res, 201, { ok: true, orderId: order.id });
    }

    if (pathname.startsWith('/api/admin')) {
      const data = req.method === 'GET' ? {} : await body(req);
      if (!isAdmin(req, data)) return json(res, 401, { error: 'Unauthorized' });

      if (req.method === 'GET' && pathname === '/api/admin/products') return json(res, 200, safeReadJSON(PRODUCTS_FILE, []));
      if (req.method === 'POST' && pathname === '/api/admin/products') {
        const products = safeReadJSON(PRODUCTS_FILE, []);
        const p = data.product || data;
        const product = {
          id: p.id || 'p-' + Date.now(),
          name: p.name || 'منتج جديد',
          category: p.category || 'عام',
          price: Number(p.price || 0),
          oldPrice: Number(p.oldPrice || 0),
          stock: Number(p.stock || 0),
          image: p.image || '/desk-stand.svg',
          badge: p.badge || '',
          rating: Number(p.rating || 4.5),
          reviews: Number(p.reviews || 0),
          short: p.short || '',
          description: p.description || '',
          features: Array.isArray(p.features) ? p.features : String(p.features || '').split('\n').filter(Boolean),
          delivery: p.delivery || 'توصيل 2-4 أيام'
        };
        products.unshift(product); writeJSON(PRODUCTS_FILE, products); return json(res, 201, product);
      }
      if (req.method === 'PUT' && pathname.startsWith('/api/admin/products/')) {
        const id = pathname.split('/').pop();
        const products = safeReadJSON(PRODUCTS_FILE, []);
        const i = products.findIndex(p => p.id === id);
        if (i < 0) return json(res, 404, { error: 'Product not found' });
        const p = data.product || data;
        products[i] = { ...products[i], ...p, price: Number(p.price ?? products[i].price), oldPrice: Number(p.oldPrice ?? products[i].oldPrice), stock: Number(p.stock ?? products[i].stock), rating: Number(p.rating ?? products[i].rating), reviews: Number(p.reviews ?? products[i].reviews), features: Array.isArray(p.features) ? p.features : String(p.features || products[i].features.join('\n')).split('\n').filter(Boolean) };
        writeJSON(PRODUCTS_FILE, products); return json(res, 200, products[i]);
      }
      if (req.method === 'DELETE' && pathname.startsWith('/api/admin/products/')) {
        const id = pathname.split('/').pop();
        writeJSON(PRODUCTS_FILE, safeReadJSON(PRODUCTS_FILE, []).filter(p => p.id !== id));
        return json(res, 200, { ok: true });
      }
      if (req.method === 'GET' && pathname === '/api/admin/orders') return json(res, 200, safeReadJSON(ORDERS_FILE, []));
      if (req.method === 'PATCH' && pathname.startsWith('/api/admin/orders/')) {
        const id = pathname.split('/').pop();
        const orders = safeReadJSON(ORDERS_FILE, []);
        const o = orders.find(x => x.id === id);
        if (!o) return json(res, 404, { error: 'Order not found' });
        o.status = data.status || o.status;
        writeJSON(ORDERS_FILE, orders);
        return json(res, 200, o);
      }
      if (req.method === 'POST' && pathname === '/api/admin/upload') {
        const img = data.image || '';
        const match = img.match(/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,(.+)$/);
        if (!match) return json(res, 400, { error: 'Invalid image' });
        const ext = match[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
        const name = 'uploads/' + Date.now() + '-' + crypto.randomBytes(3).toString('hex') + '.' + ext;
        fs.writeFileSync(path.join(ROOT, name), Buffer.from(match[2], 'base64'));
        return json(res, 201, { url: '/' + name });
      }
      return json(res, 404, { error: 'Not found' });
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      if (pathname === '/' || pathname === '/home') return file(res, path.join(ROOT, 'index.html'));
      if (pathname === '/checkout') return file(res, path.join(ROOT, 'checkout.html'));
      if (pathname === '/admin') return file(res, path.join(ROOT, 'admin.html'));
      if (pathname === '/success') return file(res, path.join(ROOT, 'success.html'));
      if (pathname.startsWith('/product/')) return file(res, path.join(ROOT, 'product.html'));

      const requested = path.normalize(path.join(ROOT, pathname.replace(/^\//, '')));
      if (requested.startsWith(ROOT) && fs.existsSync(requested)) return file(res, requested);
      return file(res, path.join(ROOT, '404.html'));
    }

    return send(res, 405, 'Method not allowed');
  } catch (err) {
    json(res, 500, { error: err.message || 'Server error' });
  }
});

server.listen(PORT, () => console.log(`Aerova store running on http://localhost:${PORT}`));
