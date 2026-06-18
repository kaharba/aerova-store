const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const fsp = require('fs/promises');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-password';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.randomBytes(32).toString('hex');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

function send(res, status, data, type = 'application/json; charset=utf-8') {
  const headers = {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  };
  res.writeHead(status, headers);
  res.end(type.includes('json') ? JSON.stringify(data) : data);
}
function sendJson(res, status, data) { send(res, status, data); }
function uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
async function readJson(file, fallback) {
  try { return JSON.parse(await fsp.readFile(file, 'utf8')); }
  catch { return fallback; }
}
async function writeJson(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}
function isAdmin(req) { return (req.headers.authorization || '') === `Bearer ${ADMIN_TOKEN}`; }
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 15 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}
function safeCustomer(customer = {}) {
  return {
    name: String(customer.name || '').trim(),
    phone: String(customer.phone || '').trim(),
    altPhone: String(customer.altPhone || '').trim(),
    governorate: String(customer.governorate || '').trim(),
    city: String(customer.city || '').trim(),
    address: String(customer.address || '').trim()
  };
}
function serveStatic(req, res, pathname) {
  const routeMap = {
    '/': 'index.html',
    '/checkout': 'checkout.html',
    '/checkout/': 'checkout.html',
    '/success': 'success.html',
    '/success/': 'success.html',
    '/product': 'product.html',
    '/product/': 'product.html',
    '/admin': 'admin.html',
    '/admin/': 'admin.html'
  };
  const requested = pathname.startsWith('/product/') ? 'product.html' : (routeMap[pathname] || decodeURIComponent(pathname.replace(/^\//, '')));
  let filePath = path.join(PUBLIC_DIR, requested);
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      const fallback = path.join(PUBLIC_DIR, '404.html');
      return fs.readFile(fallback, (e, data) => {
        if (e) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
        send(res, 404, data, 'text/html; charset=utf-8');
      });
    }
    const ext = path.extname(filePath);
    fs.readFile(filePath, (e, data) => {
      if (e) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
      send(res, 200, data, mime[ext] || 'application/octet-stream');
    });
  });
}

async function handleApi(req, res, pathname) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  try {
    if (pathname === '/api/health' && req.method === 'GET') return sendJson(res, 200, { ok: true, name: 'Aerova Egypt' });

    if (pathname === '/api/login' && req.method === 'POST') {
      const body = await parseBody(req);
      if ((body.password || '') === ADMIN_PASSWORD) return sendJson(res, 200, { token: ADMIN_TOKEN, message: 'ok' });
      return sendJson(res, 401, { error: 'كلمة السر غير صحيحة' });
    }

    if (pathname === '/api/products' && req.method === 'GET') {
      return sendJson(res, 200, await readJson(PRODUCTS_FILE, []));
    }

    if (pathname === '/api/products' && req.method === 'POST') {
      if (!isAdmin(req)) return sendJson(res, 401, { error: 'Unauthorized' });
      const body = await parseBody(req);
      const products = await readJson(PRODUCTS_FILE, []);
      const product = {
        id: uid('p'),
        name: String(body.name || 'منتج جديد').trim(),
        category: String(body.category || 'منتجات متنوعة').trim(),
        price: Number(body.price || 0),
        oldPrice: Number(body.oldPrice || 0),
        stock: Number(body.stock || 0),
        image: body.image || '/assets/logo.png',
        badge: String(body.badge || '').trim(),
        description: String(body.description || '').trim(),
        features: Array.isArray(body.features) ? body.features : String(body.features || '').split('\n').filter(Boolean)
      };
      products.unshift(product);
      await writeJson(PRODUCTS_FILE, products);
      return sendJson(res, 201, product);
    }

    const productMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
    if (productMatch && req.method === 'GET') {
      const products = await readJson(PRODUCTS_FILE, []);
      const product = products.find(item => item.id === productMatch[1]);
      if (!product) return sendJson(res, 404, { error: 'Product not found' });
      return sendJson(res, 200, product);
    }

    if (productMatch && ['PUT', 'DELETE'].includes(req.method)) {
      if (!isAdmin(req)) return sendJson(res, 401, { error: 'Unauthorized' });
      let products = await readJson(PRODUCTS_FILE, []);
      const id = productMatch[1];
      if (req.method === 'DELETE') {
        await writeJson(PRODUCTS_FILE, products.filter(product => product.id !== id));
        return sendJson(res, 200, { ok: true });
      }
      const idx = products.findIndex(product => product.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'Product not found' });
      const body = await parseBody(req);
      products[idx] = {
        ...products[idx],
        name: body.name ?? products[idx].name,
        category: body.category ?? products[idx].category,
        price: Number(body.price ?? products[idx].price),
        oldPrice: Number(body.oldPrice ?? products[idx].oldPrice),
        stock: Number(body.stock ?? products[idx].stock),
        image: body.image ?? products[idx].image,
        badge: body.badge ?? products[idx].badge,
        description: body.description ?? products[idx].description,
        features: Array.isArray(body.features) ? body.features : String(body.features ?? (products[idx].features || []).join('\n')).split('\n').filter(Boolean)
      };
      await writeJson(PRODUCTS_FILE, products);
      return sendJson(res, 200, products[idx]);
    }

    if (pathname === '/api/orders' && req.method === 'POST') {
      const body = await parseBody(req);
      const orders = await readJson(ORDERS_FILE, []);
      const products = await readJson(PRODUCTS_FILE, []);
      const items = Array.isArray(body.items) ? body.items : [];
      const customer = safeCustomer(body.customer);

      if (!customer.name || !customer.phone || !customer.governorate || !customer.city || !customer.address || !items.length) {
        return sendJson(res, 400, { error: 'بيانات الطلب ناقصة' });
      }

      const cleanItems = items.map(item => {
        const product = products.find(p => p.id === item.id) || {};
        const qty = Math.max(1, Math.min(99, Number(item.qty || 1)));
        return {
          id: item.id,
          name: product.name || item.name || 'منتج',
          price: Number(product.price || item.price || 0),
          qty,
          image: product.image || item.image || ''
        };
      }).filter(item => item.price >= 0 && item.qty > 0);

      if (!cleanItems.length) return sendJson(res, 400, { error: 'السلة فاضية' });

      const subtotal = cleanItems.reduce((sum, item) => sum + item.price * item.qty, 0);
      const shipping = subtotal >= 300 ? 0 : 50;
      const order = {
        id: uid('order'),
        createdAt: new Date().toISOString(),
        status: 'new',
        payment: 'الدفع عند الاستلام',
        customer,
        items: cleanItems,
        subtotal,
        shipping,
        total: subtotal + shipping,
        notes: String(body.notes || '').trim(),
        source: 'website-checkout'
      };
      orders.unshift(order);
      await writeJson(ORDERS_FILE, orders);
      return sendJson(res, 201, order);
    }

    if (pathname === '/api/orders' && req.method === 'GET') {
      if (!isAdmin(req)) return sendJson(res, 401, { error: 'Unauthorized' });
      return sendJson(res, 200, await readJson(ORDERS_FILE, []));
    }

    const orderMatch = pathname.match(/^\/api\/orders\/([^/]+)$/);
    if (orderMatch && ['PATCH', 'DELETE'].includes(req.method)) {
      if (!isAdmin(req)) return sendJson(res, 401, { error: 'Unauthorized' });
      let orders = await readJson(ORDERS_FILE, []);
      const id = orderMatch[1];
      if (req.method === 'DELETE') {
        await writeJson(ORDERS_FILE, orders.filter(order => order.id !== id));
        return sendJson(res, 200, { ok: true });
      }
      const idx = orders.findIndex(order => order.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'Order not found' });
      const body = await parseBody(req);
      orders[idx].status = body.status || orders[idx].status;
      await writeJson(ORDERS_FILE, orders);
      return sendJson(res, 200, orders[idx]);
    }

    return sendJson(res, 404, { error: 'API not found' });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Server error' });
  }
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url.pathname);
  return serveStatic(req, res, url.pathname);
}).listen(PORT, () => {
  console.log(`Aerova store running on http://localhost:${PORT}`);
});
