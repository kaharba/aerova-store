let token = localStorage.getItem('aerova_admin_token') || '';
let products = [], orders = [];
const $ = s => document.querySelector(s);
const money = n => `${Number(n || 0).toLocaleString('ar-EG')} جنيه`;
const headers = () => ({'Content-Type':'application/json','Authorization':`Bearer ${token}`});
function showPanel(){ $('#loginBox').classList.add('hidden'); $('#adminPanel').classList.remove('hidden'); loadAll(); }
if(token) showPanel();
$('#loginBtn').onclick = async()=>{
  const res = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('#adminPass').value})});
  const data = await res.json();
  if(res.ok){token=data.token; localStorage.setItem('aerova_admin_token',token); showPanel();}
  else $('#loginMsg').textContent = data.error || 'فشل الدخول';
};
$('#logoutBtn').onclick=()=>{localStorage.removeItem('aerova_admin_token'); location.reload();};
async function loadAll(){
  products = await fetch('/api/products').then(r=>r.json());
  orders = await fetch('/api/orders',{headers:headers()}).then(r=>r.json()).catch(()=>[]);
  renderStats(); renderProducts(); renderOrders();
}
function renderStats(){
  $('#statProducts').textContent = products.length;
  $('#statOrders').textContent = Array.isArray(orders)?orders.length:0;
  $('#statSales').textContent = money((orders||[]).reduce((s,o)=>s+Number(o.total||0),0));
}
function renderProducts(){
  $('#adminProducts').innerHTML = products.map(p=>`
  <div class="admin-product"><img src="${p.image}" alt=""><div><b>${p.name}</b><br><small>${p.category} — ${money(p.price)} — مخزون ${p.stock}</small><div class="actions"><button class="mini-btn edit" onclick="editProduct('${p.id}')">تعديل</button><button class="mini-btn danger" onclick="deleteProduct('${p.id}')">حذف</button></div></div></div>`).join('') || 'لا يوجد منتجات';
}
function renderOrders(){
  $('#adminOrders').innerHTML = (orders||[]).map(o=>`
  <div class="order-card"><h3>${o.customer.name} — ${money(o.total)}</h3><div class="order-meta">${new Date(o.createdAt).toLocaleString('ar-EG')} | ${o.customer.phone} | ${o.customer.governorate} - ${o.customer.city}<br>${o.customer.address}<br>الحالة: <b>${o.status}</b> | الدفع: ${o.payment}</div><div class="order-items">${o.items.map(i=>`<div><span>${i.name} × ${i.qty}</span><b>${money(i.price*i.qty)}</b></div>`).join('')}</div><div class="order-actions"><button class="mini-btn status" onclick="setStatus('${o.id}','confirmed')">تم التأكيد</button><button class="mini-btn status" onclick="setStatus('${o.id}','shipped')">تم الشحن</button><button class="mini-btn status" onclick="setStatus('${o.id}','done')">تم التسليم</button><button class="mini-btn danger" onclick="deleteOrder('${o.id}')">حذف</button></div></div>`).join('') || 'لا يوجد طلبات';
}
function editProduct(id){
  const p=products.find(x=>x.id===id); if(!p)return; const f=$('#productForm');
  f.elements['id'].value=p.id; f.name.value=p.name; f.category.value=p.category; f.badge.value=p.badge||''; f.price.value=p.price; f.oldPrice.value=p.oldPrice||''; f.stock.value=p.stock; f.image.value=p.image; f.description.value=p.description||''; f.features.value=(p.features||[]).join('\n');
  $('#productFormTitle').textContent='تعديل منتج'; scrollTo({top:0,behavior:'smooth'});
}
async function deleteProduct(id){ if(!confirm('تحذف المنتج؟'))return; await fetch('/api/products/'+id,{method:'DELETE',headers:headers()}); loadAll(); }
async function setStatus(id,status){ await fetch('/api/orders/'+id,{method:'PATCH',headers:headers(),body:JSON.stringify({status})}); loadAll(); }
async function deleteOrder(id){ if(!confirm('تحذف الطلب؟'))return; await fetch('/api/orders/'+id,{method:'DELETE',headers:headers()}); loadAll(); }
$('#resetProduct').onclick=()=>{ $('#productForm').reset(); $('#productFormTitle').textContent='إضافة منتج'; $('#productForm').elements['id'].value=''; };
$('#imageFile').addEventListener('change', e=>{
  const file=e.target.files[0]; if(!file)return; const reader=new FileReader(); reader.onload=()=>{$('#productForm').image.value=reader.result;}; reader.readAsDataURL(file);
});
$('#productForm').addEventListener('submit', async e=>{
  e.preventDefault(); const f=e.target;
  const payload={name:f.name.value,category:f.category.value,badge:f.badge.value,price:f.price.value,oldPrice:f.oldPrice.value,stock:f.stock.value,image:f.image.value,description:f.description.value,features:f.features.value.split('\n').filter(Boolean)};
  const id=f.elements['id'].value; const url=id?'/api/products/'+id:'/api/products'; const method=id?'PUT':'POST';
  await fetch(url,{method,headers:headers(),body:JSON.stringify(payload)}); f.reset(); $('#productFormTitle').textContent='إضافة منتج'; loadAll();
});
