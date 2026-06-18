const EGP = new Intl.NumberFormat('ar-EG');
let PRODUCTS = [];
let currentCategory = 'all';
let searchTerm = '';
let cart = JSON.parse(localStorage.getItem('aerova_cart') || '[]');

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => `${EGP.format(Number(n || 0))} جنيه`;
const saveCart = () => { localStorage.setItem('aerova_cart', JSON.stringify(cart)); updateCart(); };
const byId = id => PRODUCTS.find(p => p.id === id);

async function loadProducts(){
  const res = await fetch('/api/products');
  PRODUCTS = await res.json();
  updateCart();
  if ($('#productsGrid')) renderHome();
  if ($('#productPage')) renderProductPage();
  if ($('#checkoutPage')) renderCheckout();
}

function toast(msg){
  let t = $('.toast'); if(!t){ t=document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800);
}

function cartQty(){ return cart.reduce((s,i)=>s+i.qty,0); }
function cartTotal(){ return cart.reduce((s,i)=>{ const p=byId(i.id); return s + (p ? p.price*i.qty : 0); },0); }
function addToCart(id, qty=1){
  const item = cart.find(i=>i.id===id);
  if(item) item.qty += qty; else cart.push({id, qty});
  saveCart(); toast('اتضاف للسلة');
}
function setQty(id, qty){
  if(qty<=0) cart = cart.filter(i=>i.id!==id); else { const item=cart.find(i=>i.id===id); if(item) item.qty=qty; }
  saveCart();
}
function updateCart(){
  $$('.cartCount').forEach(el=>el.textContent=cartQty());
  const box = $('#cartItems'); if(!box) return;
  if(!cart.length){ box.innerHTML = `<div class="empty">السلة فاضية</div>`; }
  else box.innerHTML = cart.map(i=>{
    const p=byId(i.id); if(!p) return '';
    return `<div class="cartItem">
      <img src="${p.image}" alt="${p.name}">
      <div><b>${p.name}</b><div class="small">${money(p.price)}</div><div class="qty"><button onclick="setQty('${i.id}',${i.qty-1})">−</button><span>${i.qty}</span><button onclick="setQty('${i.id}',${i.qty+1})">+</button></div></div>
      <b>${money(p.price*i.qty)}</b>
    </div>`;
  }).join('');
  const total = $('#cartTotal'); if(total) total.textContent = money(cartTotal());
}
function openCart(){ $('#drawer')?.classList.add('open'); }
function closeCart(){ $('#drawer')?.classList.remove('open'); }

function card(p){
  return `<article class="card">
    <a class="pic" href="/product/${p.id}"><img src="${p.image}" alt="${p.name}"><span class="badge">${p.badge || 'جديد'}</span></a>
    <div class="body">
      <div class="cat">${p.category}</div>
      <a href="/product/${p.id}" class="title">${p.name}</a>
      <div class="rating">★ ${p.rating || 4.5} <span class="muted">| متاح</span></div>
      <div class="priceRow"><span class="price">${money(p.price)}</span>${p.oldPrice ? `<span class="old">${money(p.oldPrice)}</span>`:''}</div>
      <div class="cardBtns"><button class="btn" onclick="addToCart('${p.id}')">أضف للسلة</button><a class="btn ghost" href="/product/${p.id}">عرض</a></div>
    </div>
  </article>`;
}
function renderHome(){
  const cats = ['all', ...new Set(PRODUCTS.map(p=>p.category))];
  $('#cats').innerHTML = cats.map(c=>`<button class="pill ${currentCategory===c?'active':''}" onclick="setCat('${c}')">${c==='all'?'الكل':c}</button>`).join('');
  let arr = PRODUCTS.filter(p => (currentCategory==='all' || p.category===currentCategory) && (p.name + p.category).toLowerCase().includes(searchTerm.toLowerCase()));
  const sort = $('#sort')?.value || 'default';
  if(sort==='low') arr.sort((a,b)=>a.price-b.price); if(sort==='high') arr.sort((a,b)=>b.price-a.price);
  $('#productsGrid').innerHTML = arr.length ? arr.map(card).join('') : `<div class="empty">مفيش منتجات مطابقة</div>`;
}
function setCat(c){ currentCategory = c; renderHome(); }
function searchNow(v){ searchTerm = v; renderHome(); }

function renderProductPage(){
  const id = location.pathname.split('/').pop();
  const p = byId(id) || PRODUCTS[0];
  if(!p) return;
  document.title = `${p.name} | Aerova`;
  $('#productPage').innerHTML = `<div class="prodImage box"><img src="${p.image}" alt="${p.name}"></div>
  <div class="box"><div class="cat">${p.category}</div><h1 class="prodTitle">${p.name}</h1><div class="rating">★ ${p.rating || 4.5} تقييم ممتاز</div><p>${p.description || ''}</p><ul class="features">${(p.features||[]).map(f=>`<li>${f}</li>`).join('')}</ul></div>
  <aside class="box buyBox"><div class="priceRow"><span class="price">${money(p.price)}</span>${p.oldPrice?`<span class="old">${money(p.oldPrice)}</span>`:''}</div><div class="notice">الدفع عند الاستلام • تأكيد الطلب قبل الشحن</div><div class="stepper"><button id="minus">−</button><b id="q">1</b><button id="plus">+</button></div><button class="btn dark" id="add">أضف للسلة</button><button class="btn gold" id="buy" style="width:100%;margin-top:8px">اشتري الآن</button></aside>`;
  let q=1; const set=()=>$('#q').textContent=q;
  $('#minus').onclick=()=>{q=Math.max(1,q-1);set()}; $('#plus').onclick=()=>{q++;set()};
  $('#add').onclick=()=>addToCart(p.id,q);
  $('#buy').onclick=()=>{addToCart(p.id,q);location.href='/checkout'};
}

function renderCheckout(){
  if(!cart.length){ $('#orderSummary').innerHTML = `<div class="empty">السلة فاضية</div>`; $('#submitOrder').disabled = true; return; }
  $('#orderSummary').innerHTML = cart.map(i=>{ const p=byId(i.id); return p?`<div class="summaryItem"><span>${p.name} × ${i.qty}</span><b>${money(p.price*i.qty)}</b></div>`:''; }).join('') + `<div class="summaryItem"><b>الإجمالي</b><b>${money(cartTotal())}</b></div>`;
  $('#orderForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    body.items = cart.map(i=>({ id:i.id, qty:i.qty, name:byId(i.id)?.name, price:byId(i.id)?.price }));
    body.total = cartTotal();
    $('#submitOrder').textContent='جارٍ إرسال الطلب...';
    const res = await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data = await res.json();
    if(res.ok){ localStorage.removeItem('aerova_cart'); location.href = `/success?order=${encodeURIComponent(data.orderId)}`; }
    else { toast(data.error || 'حصل خطأ'); $('#submitOrder').textContent='تأكيد الطلب'; }
  };
}

document.addEventListener('click', e => {
  if(e.target.matches('[data-cart]')) openCart();
  if(e.target.matches('[data-close-cart], .shade')) closeCart();
});

loadProducts();
