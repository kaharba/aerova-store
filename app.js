let products = [];
let state = { q: '', category: 'all', sort: 'popular' };
const cartKey = 'aerova_cart_v2';
const $ = (s) => document.querySelector(s);
const money = (n) => `${Number(n || 0).toLocaleString('ar-EG')} جنيه`;
const getCart = () => JSON.parse(localStorage.getItem(cartKey) || '[]');
const saveCart = (cart) => { localStorage.setItem(cartKey, JSON.stringify(cart)); renderCart(); };

function addToCart(id, qty = 1) {
  const cart = getCart();
  const item = cart.find(x => x.id === id);
  if (item) item.qty += qty; else cart.push({ id, qty });
  saveCart(cart);
  openCart();
}
function setQty(id, qty) {
  let cart = getCart();
  if (qty <= 0) cart = cart.filter(x => x.id !== id); else cart = cart.map(x => x.id === id ? { ...x, qty } : x);
  saveCart(cart);
}
function cartDetails() {
  const cart = getCart();
  return cart.map(i => ({ ...products.find(p => p.id === i.id), qty: i.qty })).filter(x => x.id);
}
function renderCart() {
  const items = cartDetails();
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  ['cartCount','mobileCartCount'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = items.reduce((s,i)=>s+i.qty,0); });
  if ($('#cartTotal')) $('#cartTotal').textContent = money(total);
  if (!$('#cartItems')) return;
  $('#cartItems').innerHTML = items.length ? items.map(i => `
    <div class="cart-item">
      <img src="${i.image}" alt="${i.name}">
      <div><h4>${i.name}</h4><div class="qty-row"><button onclick="setQty('${i.id}',${i.qty-1})">-</button><span>${i.qty}</span><button onclick="setQty('${i.id}',${i.qty+1})">+</button></div></div>
      <div><b>${money(i.price*i.qty)}</b><button class="remove" onclick="setQty('${i.id}',0)">حذف</button></div>
    </div>`).join('') : '<p class="muted">السلة فاضية.</p>';
}
function openCart(){ $('#cartDrawer')?.classList.add('show'); }
function closeCart(){ $('#cartDrawer')?.classList.remove('show'); }

function categories(){ return ['all', ...new Set(products.map(p => p.category).filter(Boolean))]; }
function renderCategories(){
  const chips = $('#categoryChips'); const filter = $('#categoryFilter');
  const cats = categories();
  chips.innerHTML = cats.map(c => `<button class="chip ${state.category===c?'active':''}" onclick="chooseCategory('${c}')">${c==='all'?'الكل':c}</button>`).join('');
  filter.innerHTML = cats.map(c => `<option value="${c}" ${state.category===c?'selected':''}>${c==='all'?'كل الأقسام':c}</option>`).join('');
}
function chooseCategory(c){ state.category = c; renderAll(); }
function filteredProducts(){
  let list = products.filter(p => (state.category === 'all' || p.category === state.category) && (!state.q || (p.name + ' ' + p.category + ' ' + p.short).toLowerCase().includes(state.q.toLowerCase())));
  if (state.sort === 'low') list.sort((a,b)=>a.price-b.price);
  if (state.sort === 'high') list.sort((a,b)=>b.price-a.price);
  if (state.sort === 'popular') list.sort((a,b)=>(b.reviews||0)-(a.reviews||0));
  return list;
}
function productCard(p){
  return `<article class="product-card">
    ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
    <a class="product-img" href="/product/${p.id}"><img loading="lazy" src="${p.image}" alt="${p.name}"></a>
    <div class="product-info">
      <a class="product-title" href="/product/${p.id}">${p.name}</a>
      <div class="rating">★ ${p.rating || 4.5} <span class="muted">(${p.reviews || 0})</span></div>
      <p class="short">${p.short || ''}</p>
      <div class="price"><b>${money(p.price)}</b>${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ''}</div>
      <div class="delivery">${p.delivery || 'توصيل سريع'}</div>
      <div class="actions"><button class="add-btn" onclick="addToCart('${p.id}')">أضف للسلة</button><a class="view-btn" href="/product/${p.id}">عرض</a></div>
    </div>
  </article>`;
}
function renderDeals(){
  const top = [...products].sort((a,b)=>(b.reviews||0)-(a.reviews||0)).slice(0,6);
  $('#dealStrip').innerHTML = top.map(p => `<a class="deal-card" href="/product/${p.id}"><img src="${p.image}" alt="${p.name}"><div><h3>${p.name}</h3><div class="price"><b>${money(p.price)}</b>${p.oldPrice ? `<del>${money(p.oldPrice)}</del>`:''}</div></div></a>`).join('');
}
function renderProducts(){
  const list = filteredProducts();
  $('#resultCount').textContent = `${list.length} منتج`;
  $('#productGrid').innerHTML = list.length ? list.map(productCard).join('') : '<p class="muted">مفيش منتجات مطابقة.</p>';
}
function renderAll(){ renderCategories(); renderDeals(); renderProducts(); renderCart(); }

window.addToCart = addToCart; window.setQty = setQty; window.chooseCategory = chooseCategory;
$('#openCart')?.addEventListener('click', openCart); $('#mobileCart')?.addEventListener('click', openCart); $('#closeCart')?.addEventListener('click', closeCart);
$('#cartDrawer')?.addEventListener('click', e => { if (e.target.id === 'cartDrawer') closeCart(); });
$('#categoryFilter')?.addEventListener('change', e => { state.category = e.target.value; renderAll(); });
$('#sortSelect')?.addEventListener('change', e => { state.sort = e.target.value; renderProducts(); });
$('#searchForm')?.addEventListener('submit', e => { e.preventDefault(); state.q = $('#searchInput').value.trim(); renderProducts(); document.getElementById('products').scrollIntoView({behavior:'smooth'}); });
fetch('/api/products').then(r => r.json()).then(data => { products = data; renderAll(); }).catch(() => { $('#productGrid').innerHTML = '<p>حصل خطأ في تحميل المنتجات.</p>'; });
