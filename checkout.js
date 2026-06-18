let cart = JSON.parse(localStorage.getItem('aerova_cart') || '[]');
const $ = s => document.querySelector(s);
const money = n => `${Number(n || 0).toLocaleString('ar-EG')} جنيه`;
function saveCart(){ localStorage.setItem('aerova_cart', JSON.stringify(cart)); }
function changeCheckoutQty(id,d){ const i=cart.find(x=>x.id===id); if(!i)return; i.qty=Math.max(1,i.qty+d); saveCart(); renderCheckout(); }
function removeCheckoutItem(id){ cart=cart.filter(i=>i.id!==id); saveCart(); renderCheckout(); }
function renderCheckout(){
  const itemsBox = $('#checkoutItems'), totalsBox = $('#checkoutTotals');
  if(!cart.length){ itemsBox.innerHTML='<div class="empty-state">السلة فاضية. <a href="/">تسوق الآن</a></div>'; totalsBox.innerHTML=''; return; }
  itemsBox.innerHTML = cart.map(i=>`<div class="checkout-item"><img src="${i.image}" alt=""><div><b>${i.name}</b><span>${money(i.price)}</span><div class="qty-row"><button onclick="changeCheckoutQty('${i.id}',1)">+</button><b>${i.qty}</b><button onclick="changeCheckoutQty('${i.id}',-1)">-</button><button class="link-danger" onclick="removeCheckoutItem('${i.id}')">حذف</button></div></div><strong>${money(i.price*i.qty)}</strong></div>`).join('');
  const subtotal = cart.reduce((s,i)=>s+i.price*i.qty,0), shipping = subtotal >= 300 ? 0 : 50;
  totalsBox.innerHTML = `<div><span>المنتجات</span><b>${money(subtotal)}</b></div><div><span>الشحن</span><b>${shipping ? money(shipping) : 'مجاني'}</b></div><div class="grand"><span>الإجمالي</span><b>${money(subtotal+shipping)}</b></div><p>الدفع عند الاستلام.</p>`;
}
$('#checkoutForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg=$('#formMsg');
  if(!cart.length){ msg.textContent='السلة فاضية'; return; }
  const fd=new FormData(e.target);
  const payload={items:cart, customer:{name:fd.get('name'),phone:fd.get('phone'),altPhone:fd.get('altPhone'),governorate:fd.get('governorate'),city:fd.get('city'),address:fd.get('address')}, notes:fd.get('notes')};
  msg.textContent='جاري تسجيل الطلب...';
  try{
    const res=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json(); if(!res.ok) throw new Error(data.error || 'حصل خطأ');
    localStorage.removeItem('aerova_cart'); location.href=`/success?id=${encodeURIComponent(data.id)}`;
  }catch(err){ msg.textContent=err.message; }
});
renderCheckout();
