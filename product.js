let products = [], product = null;
const cartKey = 'aerova_cart_v2';
const $ = s => document.querySelector(s);
const money = n => `${Number(n || 0).toLocaleString('ar-EG')} جنيه`;
const getCart = () => JSON.parse(localStorage.getItem(cartKey) || '[]');
const saveCart = c => { localStorage.setItem(cartKey, JSON.stringify(c)); renderCart(); };
function addToCart(id, qty=1){ const c=getCart(); const i=c.find(x=>x.id===id); if(i)i.qty+=qty; else c.push({id,qty}); saveCart(c); openCart(); }
function setQty(id, qty){ let c=getCart(); c=qty<=0?c.filter(x=>x.id!==id):c.map(x=>x.id===id?{...x,qty}:x); saveCart(c); }
function cartDetails(){return getCart().map(i=>({...products.find(p=>p.id===i.id),qty:i.qty})).filter(x=>x.id)}
function renderCart(){ const items=cartDetails(); const total=items.reduce((s,i)=>s+i.price*i.qty,0); if($('#cartCount')) $('#cartCount').textContent=items.reduce((s,i)=>s+i.qty,0); if($('#cartTotal')) $('#cartTotal').textContent=money(total); if($('#cartItems')) $('#cartItems').innerHTML=items.length?items.map(i=>`<div class="cart-item"><img src="${i.image}" alt="${i.name}"><div><h4>${i.name}</h4><div class="qty-row"><button onclick="setQty('${i.id}',${i.qty-1})">-</button><span>${i.qty}</span><button onclick="setQty('${i.id}',${i.qty+1})">+</button></div></div><div><b>${money(i.price*i.qty)}</b><button class="remove" onclick="setQty('${i.id}',0)">حذف</button></div></div>`).join(''):'<p class="muted">السلة فاضية.</p>'; }
function openCart(){ $('#cartDrawer')?.classList.add('show'); } function closeCart(){ $('#cartDrawer')?.classList.remove('show'); }
function renderProduct(){
  if(!product){ $('#productRoot').innerHTML='<div class="status-card"><h1>المنتج غير موجود</h1><a href="/">رجوع للمتجر</a></div>'; return; }
  $('#productRoot').innerHTML=`
    <section class="pd-image"><img src="${product.image}" alt="${product.name}"></section>
    <section class="pd-info"><span class="chip active">${product.category}</span><h1>${product.name}</h1><div class="rating">★ ${product.rating||4.5} <span class="muted">(${product.reviews||0} تقييم)</span></div><p class="desc">${product.description||product.short||''}</p><ul class="feature-list">${(product.features||[]).map(f=>`<li>${f}</li>`).join('')}</ul></section>
    <aside class="buy-box"><div class="big-price">${money(product.price)}</div>${product.oldPrice?`<div class="old">${money(product.oldPrice)}</div>`:''}<p class="delivery">${product.delivery||'توصيل سريع'}</p><button class="buy-now" onclick="addToCart('${product.id}'); location.href='/checkout'">اشتر الآن</button><button class="add-full" onclick="addToCart('${product.id}')">أضف للسلة</button></aside>`;
}
window.addToCart=addToCart; window.setQty=setQty;
$('#openCart')?.addEventListener('click',openCart); $('#closeCart')?.addEventListener('click',closeCart); $('#cartDrawer')?.addEventListener('click',e=>{if(e.target.id==='cartDrawer') closeCart()});
const id = location.pathname.split('/').filter(Boolean).pop();
fetch('/api/products').then(r=>r.json()).then(data=>{ products=data; product=products.find(p=>p.id===id); renderProduct(); renderCart(); });
