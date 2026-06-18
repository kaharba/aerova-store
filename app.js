let products = [];
let cart = JSON.parse(localStorage.getItem('aerova_cart') || '[]');
let currentCat = 'all';
let searchQuery = '';
let sortMode = 'default';

const money = n => `${Number(n || 0).toLocaleString('ar-EG')} جنيه`;
const $ = selector => document.querySelector(selector);
const grid = $('#productsGrid');
const cartDrawer = $('#cartDrawer');
const overlay = $('#overlay');
const escapeHtml = value => String(value ?? '').replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));

async function loadProducts() {
  try {
    products = await fetch('/api/products').then(res => res.json());
    renderProducts();
    updateCart();
    revealOnScroll();
  } catch (error) {
    if (grid) grid.innerHTML = '<p class="empty-state">حصل خطأ في تحميل المنتجات. جرّب تحدث الصفحة.</p>';
  }
}

function saveCart() { localStorage.setItem('aerova_cart', JSON.stringify(cart)); }

function renderProducts() {
  if (!grid) return;
  let list = currentCat === 'all' ? [...products] : products.filter(product => product.category === currentCat);
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter(product => [product.name, product.category, product.description, ...(product.features || [])]
      .join(' ').toLowerCase().includes(q));
  }
  if (sortMode === 'low') list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  if (sortMode === 'high') list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));

  grid.innerHTML = list.map(product => {
    const id = encodeURIComponent(product.id);
    return `
    <article class="product-card reveal">
      ${product.badge ? `<span class="badge">${escapeHtml(product.badge)}</span>` : ''}
      <a class="pic" href="/product/${id}" aria-label="تفاصيل ${escapeHtml(product.name)}"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy"></a>
      <div class="product-info">
        <span class="category-chip">${escapeHtml(product.category || 'منتجات متنوعة')}</span>
        <h3><a href="/product/${id}">${escapeHtml(product.name)}</a></h3>
        <p>${escapeHtml(product.description || '')}</p>
        <div class="price"><b>${money(product.price)}</b>${product.oldPrice ? `<del>${money(product.oldPrice)}</del>` : ''}</div>
        <div class="product-actions">
          <button class="btn primary" onclick="addToCart('${escapeHtml(product.id)}')">أضف</button>
          <a class="btn secondary" href="/product/${id}">التفاصيل</a>
        </div>
      </div>
    </article>`;
  }).join('') || '<p class="empty-state">مفيش منتجات مطابقة. جرّب كلمة تانية.</p>';
  revealOnScroll();
}

function addToCart(id) {
  const product = products.find(item => item.id === id);
  if (!product) return;
  const found = cart.find(item => item.id === id);
  if (found) found.qty += 1;
  else cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 });
  saveCart();
  updateCart();
  openCart();
}

function buyNow(id) { addToCart(id); window.location.href = '/checkout'; }
function removeFromCart(id) { cart = cart.filter(item => item.id !== id); saveCart(); updateCart(); }
function changeQty(id, delta) {
  const item = cart.find(row => row.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  updateCart();
}

function updateCart() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  if ($('#cartCount')) $('#cartCount').textContent = count;
  if ($('#cartTotal')) $('#cartTotal').textContent = money(subtotal);
  if ($('#cartItems')) {
    $('#cartItems').innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${escapeHtml(item.image)}" alt="">
        <div>
          <h4>${escapeHtml(item.name)}</h4>
          <small>${money(item.price)} × ${item.qty}</small>
          <div class="qty-controls">
            <button class="mini-btn" onclick="changeQty('${escapeHtml(item.id)}', 1)">+</button>
            <button class="mini-btn" onclick="changeQty('${escapeHtml(item.id)}', -1)">-</button>
            <button class="mini-btn danger" onclick="removeFromCart('${escapeHtml(item.id)}')">حذف</button>
          </div>
        </div>
      </div>
    `).join('') || '<p class="empty-state">السلة فاضية.</p>';
  }
}

function openCart() { cartDrawer?.classList.add('open'); overlay?.classList.add('open'); }
function closeCart() { cartDrawer?.classList.remove('open'); overlay?.classList.remove('open'); }
function revealOnScroll(){
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting) entry.target.classList.add('visible'); }), { threshold: .08 });
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
}

$('#openCart')?.addEventListener('click', openCart);
$('#closeCart')?.addEventListener('click', closeCart);
overlay?.addEventListener('click', closeCart);
$('#heroCartBtn')?.addEventListener('click', openCart);

document.querySelectorAll('.filter').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    currentCat = button.dataset.cat;
    renderProducts();
  });
});

$('#productSearch')?.addEventListener('input', event => { searchQuery = event.target.value || ''; renderProducts(); });
$('#sortProducts')?.addEventListener('change', event => { sortMode = event.target.value || 'default'; renderProducts(); });

loadProducts();
