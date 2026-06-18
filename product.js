let products = [];
let product = null;
let cart = JSON.parse(localStorage.getItem('aerova_cart') || '[]');
const $ = s => document.querySelector(s);
const money = n => `${Number(n || 0).toLocaleString('ar-EG')} جنيه`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function getProductId(){ return decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] || ''); }
async function init(){
  products = await fetch('/api/products').then(r=>r.json());
  product = products.find(p => p.id === getProductId()) || products[0];
  if(!product){ $('#productPage').innerHTML = '<div class="empty-state">المنتج غير موجود</div>'; return; }
  renderProduct(); renderRelated(); updateCart();
}
function renderProduct(){
  document.title = `${product.name} | Aerova Egypt`;
  $('#productImage').src = product.image || '/logo.png';
  $('#productImage').alt = product.name || '';
  $('#productCategory').textContent = product.category || 'منتجات';
  $('#productName').textContent = product.name || '';
  $('#productDescription').textContent = product.description || '';
  $('#productRating').textContent = `(${Number(product.rating || 24)})`;
  $('#productPrice').textContent = money(product.price);
  $('#productOldPrice').textContent = product.oldPrice ? money(product.oldPrice) : '';
  $('#productOldPrice').style.display = product.oldPrice ? 'inline' : 'none';
  $('#productFeatures').innerHTML = (product.features || []).slice(0,5).map(f => `<span>✓ ${esc(f)}</span>`).join('');
}
function renderRelated(){
  $('#relatedProducts').innerHTML = products.filter(p=>p.id!==product.id).slice(0,4).map(p => `
    <article class="product-card">
      <a class="product-img" href="/product/${encodeURIComponent(p.id)}"><img src="${esc(p.image)}" alt="${esc(p.name)}"></a>
      <div class="product-body">
        <a class="product-name" href="/product/${encodeURIComponent(p.id)}">${esc(p.name)}</a>
        <div class="rating">★★★★★</div>
        <div class="price-line"><strong>${money(p.price)}</strong></div>
        <button class="add-btn" onclick="addProductToCart('${esc(p.id)}',1)">أضف للسلة</button>
      </div>
    </article>`).join('');
}
function saveCart(){ localStorage.setItem('aerova_cart', JSON.stringify(cart)); }
function addProductToCart(id, qty){
  const p = products.find(x=>x.id===id); if(!p) return;
  const found = cart.find(x=>x.id===id);
  if(found) found.qty += qty; else cart.push({id:p.id,name:p.name,price:Number(p.price||0),image:p.image,qty});
  saveCart(); updateCart(); openCart();
}
function addCurrent(){ addProductToCart(product.id, Math.max(1, Number($('#productQty').value || 1))); }
function changeQty(id,d){ const i=cart.find(x=>x.id===id); if(!i)return; i.qty=Math.max(1,i.qty+d); saveCart(); updateCart(); }
function removeFromCart(id){ cart=cart.filter(i=>i.id!==id); saveCart(); updateCart(); }
function updateCart(){
  const count = cart.reduce((s,i)=>s+i.qty,0), total = cart.reduce((s,i)=>s+i.price*i.qty,0);
  $('#cartCount').textContent=count; $('#cartTotal').textContent=money(total);
  $('#cartItems').innerHTML = cart.map(i=>`<div class="cart-item"><img src="${esc(i.image)}"><div class="cart-info"><b>${esc(i.name)}</b><span>${money(i.price)} × ${i.qty}</span><div class="qty-row"><button onclick="changeQty('${esc(i.id)}',1)">+</button><button onclick="changeQty('${esc(i.id)}',-1)">-</button><button class="link-danger" onclick="removeFromCart('${esc(i.id)}')">حذف</button></div></div></div>`).join('') || '<div class="empty-state">السلة فاضية.</div>';
}
function openCart(){ $('#cartDrawer').classList.add('open'); $('#overlay').classList.add('open'); }
function closeCart(){ $('#cartDrawer').classList.remove('open'); $('#overlay').classList.remove('open'); }
$('#openCart').addEventListener('click',openCart); $('#closeCart').addEventListener('click',closeCart); $('#overlay').addEventListener('click',closeCart);
$('#plusQty').addEventListener('click',()=>$('#productQty').value = Number($('#productQty').value||1)+1);
$('#minusQty').addEventListener('click',()=>$('#productQty').value = Math.max(1,Number($('#productQty').value||1)-1));
$('#detailAdd').addEventListener('click', addCurrent);
$('#detailBuy').addEventListener('click',()=>{ addCurrent(); location.href='/checkout'; });
init().catch(()=>$('#productPage').innerHTML='<div class="empty-state">حصل خطأ في تحميل المنتج.</div>');
