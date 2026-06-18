const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const PRODUCTS_FILE = path.join(ROOT, 'products.json');
const ORDERS_FILE = path.join(ROOT, 'orders.json');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function send(res, code, data, type='application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof data === 'string' ? data : JSON.stringify(data));
}
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2_000_000) req.destroy();
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
    });
  });
}
function safeId(s) { return String(s || '').replace(/[^a-zA-Z0-9-_]/g, ''); }
function authed(req) {
  return ADMIN_PASSWORD && req.headers['x-admin-password'] === ADMIN_PASSWORD;
}
function serveFile(res, file) {
  const ext = path.extname(file).toLowerCase();
  if (['.json'].includes(ext)) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  fs.readFile(file, (err, content) => {
    if (err) return send(res, 404, fs.readFileSync(path.join(ROOT, '404.html'), 'utf8'), 'text/html; charset=utf-8');
    const cache = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.css', '.js'].includes(ext) ? 'public, max-age=3600' : 'no-store';
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Cache-Control': cache });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname === '/api/health') return send(res, 200, { ok: true, name: 'Aerova Market' });

    if (pathname === '/api/products' && req.method === 'GET') {
      return send(res, 200, readJson(PRODUCTS_FILE, []));
    }
    if (pathname.startsWith('/api/products/') && req.method === 'GET') {
      const id = safeId(pathname.split('/').pop());
      const product = readJson(PRODUCTS_FILE, []).find(p => p.id === id);
      return product ? send(res, 200, product) : send(res, 404, { error: 'Product not found' });
    }
    if (pathname === '/api/orders' && req.method === 'POST') {
      const body = await readBody(req);
      const order = {
        id: 'ORD-' + Date.now().toString(36).toUpperCase(),
        createdAt: new Date().toISOString(),
        status: 'new',
        customer: {
          name: String(body.name || '').trim(),
          phone: String(body.phone || '').trim(),
          city: String(body.city || '').trim(),
          address: String(body.address || '').trim(),
          notes: String(body.notes || '').trim()
        },
        items: Array.isArray(body.items) ? body.items : [],
        total: Number(body.total || 0),
        payment: 'cod'
      };
      if (!order.customer.name || !order.customer.phone || !order.customer.address || !order.items.length) {
        return send(res, 400, { error: 'بيانات الطلب ناقصة' });
      }
      const orders = readJson(ORDERS_FILE, []);
      orders.unshift(order);
      writeJson(ORDERS_FILE, orders);
      return send(res, 200, { ok: true, orderId: order.id });
    }

    if (pathname === '/api/admin/login' && req.method === 'POST') {
      if (!ADMIN_PASSWORD) return send(res, 503, { error: 'Admin password not configured' });
      const body = await readBody(req);
      if (body.password === ADMIN_PASSWORD) return send(res, 200, { ok: true, token: crypto.randomBytes(16).toString('hex') });
      return send(res, 401, { error: 'Wrong password' });
    }
    if (pathname.startsWith('/api/admin/')) {
      if (!authed(req)) return send(res, 401, { error: 'Unauthorized' });
      if (pathname === '/api/admin/products' && req.method === 'GET') return send(res, 200, readJson(PRODUCTS_FILE, []));
      if (pathname === '/api/admin/orders' && req.method === 'GET') return send(res, 200, readJson(ORDERS_FILE, []));
      if (pathname === '/api/admin/products' && req.method === 'POST') {
        const product = await readBody(req);
        const products = readJson(PRODUCTS_FILE, []);
        product.id = product.id ? safeId(product.id) : 'p-' + Date.now().toString(36);
        product.price = Number(product.price || 0);
        product.oldPrice = Number(product.oldPrice || 0);
        product.stock = Number(product.stock || 0);
        product.rating = Number(product.rating || 4.5);
        product.features = Array.isArray(product.features) ? product.features : String(product.features || '').split('\n').filter(Boolean);
        const ix = products.findIndex(p => p.id === product.id);
        if (ix >= 0) products[ix] = product; else products.unshift(product);
        writeJson(PRODUCTS_FILE, products);
        return send(res, 200, { ok: true, product });
      }
      if (pathname.startsWith('/api/admin/products/') && req.method === 'DELETE') {
        const id = safeId(pathname.split('/').pop());
        writeJson(PRODUCTS_FILE, readJson(PRODUCTS_FILE, []).filter(p => p.id !== id));
        return send(res, 200, { ok: true });
      }
      if (pathname.startsWith('/api/admin/orders/') && req.method === 'PATCH') {
        const id = safeId(pathname.split('/').pop());
        const body = await readBody(req);
        const orders = readJson(ORDERS_FILE, []);
        const order = orders.find(o => o.id === id);
        if (!order) return send(res, 404, { error: 'Order not found' });
        order.status = body.status || order.status;
        writeJson(ORDERS_FILE, orders);
        return send(res, 200, { ok: true });
      }
    }

    if (pathname === '/') return serveFile(res, path.join(ROOT, 'index.html'));
    if (pathname === '/checkout') return serveFile(res, path.join(ROOT, 'checkout.html'));
    if (pathname.startsWith('/product/')) return serveFile(res, path.join(ROOT, 'product.html'));
    if (pathname === '/admin') return serveFile(res, path.join(ROOT, 'admin.html'));
    if (pathname === '/success') return serveFile(res, path.join(ROOT, 'success.html'));
    if (pathname === '/404') return serveFile(res, path.join(ROOT, '404.html'));

    const file = path.join(ROOT, pathname.replace(/^\//, ''));
    if (file.startsWith(ROOT) && fs.existsSync(file) && fs.statSync(file).isFile()) return serveFile(res, file);
    return serveFile(res, path.join(ROOT, '404.html'));
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'Server error' });
  }
});

server.listen(PORT, () => console.log(`Aerova market running on http://localhost:${PORT}`));
