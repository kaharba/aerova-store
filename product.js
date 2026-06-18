let products = [];
let product = null;
let cart = JSON.parse(localStorage.getItem('aerova_cart') || '[]');

const money = n => `${Number(n || 0).toLocaleString('ar-EG')} جنيه`;
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
const cartDrawer = $('#cartDrawer');
const overlay = $('#overlay');

function getProductId(){
  const parts = location.pathname.split('/').filter(Boolean);
  return decodeURIComponent(parts[1] || new URLSearchParams(location.search).get('id') || '');
}

async function init(){
  products = await fetch('/api/products').then(res => res.json());
  const id = getProductId();
  product = products.find(item => item.id === id) || products[0];
  if(!product){
    $('#productPage').innerHTML = '<section class="success-card"><h1>المنتج غير موجود</h1><a class="btn primary" href="/">رجوع للمتجر</a></section>';
    return;
  }
  renderProduct();
  renderRelated();
  updateCart();
  revealOnScroll();
}

function renderProduct(){
  document.title = `${product.name} | Aerova Egypt`;
  $('#productImage').src = product.image || '/logo.png';
  $('#productImage').alt = product.name || 'Product image';
  $('#productCategory').textContent = product.category || 'AEROVA';
  $('#productName').textContent = product.name || '';
  $('#productDescription').textContent = product.description || '';
  $('#longDescription').textContent = product.description || 'منتج عملي مختار بعناية من Aerova.';
  $('#productPrice').textContent = money(product.price);
  const old = $('#productOldPrice');
  old.textContent = product.oldPrice ? money(product.oldPrice) : '';
  old.style.display = product.oldPrice ? 'inline' : 'none';
  $('#productFeatures').innerHTML = (product.features || []).map(feature => `<span>${escapeHtml(feature)}</span>`).join('');
}

function renderRelated(){
  const box = $('#relatedProducts');
  const related = products.filter(item => item.id !== product.id).slice(0,3);
  box.innerHTML = related.map(item => `
    <article class="product-card reveal">
      ${item.badge ? `<span class="badge">${escapeHtml(item.badge)}</span>` : ''}
      <a class="pic" href="/product/${encodeURIComponent(item.id)}"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy"></a>
      <div class="product-info">
        <span class="category-chip">${escapeHtml(item.category || 'منتجات متنوعة')}</span>
        <h3><a href="/product/${encodeURIComponent(item.id)}">${escapeHtml(item.name)}</a></h3>
        <p>${escapeHtml(item.description || '')}</p>
        <div class="price"><b>${money(item.price)}</b>${item.oldPrice ? `<del>${money(item.oldPrice)}</del>` : ''}</div>
        <div class="product-actions"><button class="btn primary" onclick="addProductToCart('${escapeHtml(item.id)}', 1)">أضف</button><a class="btn secondary" href="/product/${encodeURIComponent(item.id)}">التفاصيل</a></div>
      </div>
    </article>
  `).join('') || '';
}

function saveCart(){ localStorage.setItem('aerova_cart', JSON.stringify(cart)); }
function addProductToCart(id, qty){
  const item = products.find(row => row.id === id);
  if(!item) return;
  const found = cart.find(row => row.id === id);
  if(found) found.qty += qty;
  else cart.push({ id:item.id, name:item.name, price:item.price, image:item.image, qty });
  saveCart();
  updateCart();
  openCart();
}
function addCurrent(){ addProductToCart(product.id, Math.max(1, Number($('#productQty').value || 1))); }
function removeFromCart(id) { cart = cart.filter(item => item.id !== id); saveCart(); updateCart(); }
function changeQty(id, delta) {
  const item = cart.find(row => row.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  updateCart();
}
function updateCart(){
  const count = cart.reduce((sum,item)=>sum+item.qty,0);
  const subtotal = cart.reduce((sum,item)=>sum+item.price*item.qty,0);
  if($('#cartCount')) $('#cartCount').textContent = count;
  if($('#cartTotal')) $('#cartTotal').textContent = money(subtotal);
  if($('#cartItems')) $('#cartItems').innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${escapeHtml(item.image)}" alt="">
      <div><h4>${escapeHtml(item.name)}</h4><small>${money(item.price)} × ${item.qty}</small><div class="qty-controls"><button class="mini-btn status" onclick="changeQty('${escapeHtml(item.id)}', 1)">+</button><button class="mini-btn status" onclick="changeQty('${escapeHtml(item.id)}', -1)">-</button></div></div>
      <button onclick="removeFromCart('${escapeHtml(item.id)}')">حذف</button>
    </div>`).join('') || '<p class="order-summary">السلة فاضية.</p>';
}
function openCart(){ cartDrawer?.classList.add('open'); overlay?.classList.add('open'); }
function closeCart(){ cartDrawer?.classList.remove('open'); overlay?.classList.remove('open'); }
function revealOnScroll(){
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting) entry.target.classList.add('visible'); }), { threshold: .12 });
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
}

$('#openCart')?.addEventListener('click', openCart);
$('#closeCart')?.addEventListener('click', closeCart);
overlay?.addEventListener('click', closeCart);
$('#plusQty')?.addEventListener('click', () => $('#productQty').value = Math.max(1, Number($('#productQty').value || 1) + 1));
$('#minusQty')?.addEventListener('click', () => $('#productQty').value = Math.max(1, Number($('#productQty').value || 1) - 1));
$('#detailAdd')?.addEventListener('click', addCurrent);
$('#detailBuy')?.addEventListener('click', () => { addCurrent(); location.href = '/checkout'; });

init().catch(() => { $('#productPage').innerHTML = '<section class="success-card"><h1>حصل خطأ في تحميل المنتج</h1><a class="btn primary" href="/">رجوع للمتجر</a></section>'; });
