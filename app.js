let products = [];
let cart = JSON.parse(localStorage.getItem('aerova_cart') || '[]');
let currentCat = 'الكل';
let searchQuery = '';
let sortMode = 'default';

const $ = s => document.querySelector(s);
const money = n => `${Number(n || 0).toLocaleString('ar-EG')} جنيه`;
const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

const grid = $('#productsGrid');
const cartDrawer = $('#cartDrawer');
const overlay = $('#overlay');

async function loadProducts(){
  try{
    products = await fetch('/api/products').then(r => r.json());
    renderCategories();
    renderProducts();
    updateCart();
  } catch(e){
    grid.innerHTML = '<div class="empty-state">حصل خطأ في تحميل المنتجات.</div>';
  }
}

function renderCategories(){
  const row = $('#categoryRow');
  const cats = ['الكل', ...new Set(products.map(p => p.category || 'منتجات').filter(Boolean))];
  row.innerHTML = cats.map(cat => `<button class="cat-btn ${cat===currentCat?'active':''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join('');
  row.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    currentCat = btn.dataset.cat;
    renderCategories();
    renderProducts();
  }));
}

function productMatches(p){
  const catOk = currentCat === 'الكل' || p.category === currentCat;
  const q = searchQuery.trim().toLowerCase();
  const text = [p.name, p.category, p.description, ...(p.features || [])].join(' ').toLowerCase();
  return catOk && (!q || text.includes(q));
}

function renderProducts(){
  let list = products.filter(productMatches);
  if(sortMode === 'low') list.sort((a,b)=>Number(a.price||0)-Number(b.price||0));
  if(sortMode === 'high') list.sort((a,b)=>Number(b.price||0)-Number(a.price||0));
  $('#resultCount').textContent = `${list.length} منتج`;

  grid.innerHTML = list.map(p => {
    const id = encodeURIComponent(p.id);
    const discount = p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    return `
      <article class="product-card">
        <a class="product-img" href="/product/${id}">
          ${p.badge ? `<span class="badge">${escapeHtml(p.badge)}</span>` : ''}
          <img src="${escapeHtml(p.image || '/logo.png')}" alt="${escapeHtml(p.name)}" loading="lazy">
        </a>
        <div class="product-body">
          <a class="product-name" href="/product/${id}">${escapeHtml(p.name)}</a>
          <div class="rating">★★★★★ <span>(${Number(p.rating || 24)})</span></div>
          <div class="price-line"><strong>${money(p.price)}</strong>${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ''}</div>
          ${discount ? `<small class="discount">وفر ${discount}%</small>` : '<small class="delivery">دفع عند الاستلام</small>'}
          <button class="add-btn" onclick="addToCart('${escapeHtml(p.id)}')">أضف للسلة</button>
        </div>
      </article>`;
  }).join('') || '<div class="empty-state">مفيش منتجات مطابقة.</div>';
}

function saveCart(){ localStorage.setItem('aerova_cart', JSON.stringify(cart)); }
function addToCart(id){
  const product = products.find(p => p.id === id);
  if(!product) return;
  const found = cart.find(i => i.id === id);
  if(found) found.qty += 1;
  else cart.push({ id: product.id, name: product.name, price: Number(product.price || 0), image: product.image, qty: 1 });
  saveCart();
  updateCart();
  openCart();
}
function removeFromCart(id){ cart = cart.filter(i => i.id !== id); saveCart(); updateCart(); }
function changeQty(id, delta){
  const item = cart.find(i => i.id === id);
  if(!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  updateCart();
}
function updateCart(){
  const count = cart.reduce((s,i)=>s+i.qty,0);
  const total = cart.reduce((s,i)=>s+i.price*i.qty,0);
  $('#cartCount').textContent = count;
  $('#cartTotal').textContent = money(total);
  $('#cartItems').innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${escapeHtml(item.image)}" alt="">
      <div class="cart-info">
        <b>${escapeHtml(item.name)}</b>
        <span>${money(item.price)} × ${item.qty}</span>
        <div class="qty-row">
          <button onclick="changeQty('${escapeHtml(item.id)}',1)">+</button>
          <button onclick="changeQty('${escapeHtml(item.id)}',-1)">-</button>
          <button class="link-danger" onclick="removeFromCart('${escapeHtml(item.id)}')">حذف</button>
        </div>
      </div>
    </div>`).join('') || '<div class="empty-state">السلة فاضية.</div>';
}
function openCart(){ cartDrawer.classList.add('open'); overlay.classList.add('open'); }
function closeCart(){ cartDrawer.classList.remove('open'); overlay.classList.remove('open'); }

$('#openCart').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);
$('#productSearch').addEventListener('input', e => { searchQuery = e.target.value; renderProducts(); });
$('#sortProducts').addEventListener('change', e => { sortMode = e.target.value; renderProducts(); });

loadProducts();
