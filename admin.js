let adminPass = sessionStorage.getItem('aerova_admin_pass') || '';
const $ = s => document.querySelector(s);
const money = n => `${Number(n||0).toLocaleString('ar-EG')} جنيه`;
async function api(path, opt={}){
  opt.headers = { 'Content-Type':'application/json', 'x-admin-password': adminPass, ...(opt.headers||{}) };
  const r = await fetch(path,opt); const d = await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||'Error'); return d;
}
function showAdmin(){ $('#login').classList.add('hide'); $('#admin').classList.remove('hide'); loadAdmin(); }
async function login(){
  adminPass = $('#pass').value;
  try{ await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:adminPass})}).then(r=>{if(!r.ok)throw 0;return r.json()}); sessionStorage.setItem('aerova_admin_pass',adminPass); showAdmin(); }
  catch{ $('#err').textContent='الباسورد غلط أو غير مضبوط في Render'; }
}
async function loadAdmin(){ await Promise.all([loadProducts(), loadOrders()]); }
async function loadProducts(){
  const products = await api('/api/admin/products');
  $('#productsList').innerHTML = products.map(p=>`<div class="rowCard"><b>${p.name}</b><span class="small">${p.category} • ${money(p.price)} • مخزون ${p.stock}</span><div><button class="btn ghost" onclick='editProduct(${JSON.stringify(p).replaceAll("'","&apos;")})'>تعديل</button> <button class="btn danger" onclick="delProduct('${p.id}')">حذف</button></div></div>`).join('') || '<div class="empty">لا توجد منتجات</div>';
}
async function loadOrders(){
  const orders = await api('/api/admin/orders');
  $('#ordersList').innerHTML = orders.map(o=>`<div class="rowCard"><b>${o.id}</b><span>${o.customer.name} - ${o.customer.phone}</span><span class="small">${o.customer.city} • ${money(o.total)} • ${new Date(o.createdAt).toLocaleString('ar-EG')}</span><select onchange="updateOrder('${o.id}',this.value)"><option ${o.status==='new'?'selected':''} value="new">جديد</option><option ${o.status==='confirmed'?'selected':''} value="confirmed">تم التأكيد</option><option ${o.status==='shipped'?'selected':''} value="shipped">تم الشحن</option><option ${o.status==='cancelled'?'selected':''} value="cancelled">ملغي</option></select></div>`).join('') || '<div class="empty">لا توجد طلبات</div>';
}
function editProduct(p){
  for(const k of ['id','name','category','price','oldPrice','stock','image','badge','rating','description']) if($(`[name=${k}]`)) $(`[name=${k}]`).value = p[k] ?? '';
  $('[name=features]').value = (p.features||[]).join('\n');
  scrollTo({top:0,behavior:'smooth'});
}
async function saveProduct(e){
  e.preventDefault(); const fd = new FormData(e.target); const p = Object.fromEntries(fd.entries()); p.features = p.features.split('\n').filter(Boolean);
  await api('/api/admin/products',{method:'POST',body:JSON.stringify(p)}); e.target.reset(); loadProducts();
}
async function delProduct(id){ if(confirm('تحذف المنتج؟')){ await api('/api/admin/products/'+id,{method:'DELETE'}); loadProducts(); } }
async function updateOrder(id,status){ await api('/api/admin/orders/'+id,{method:'PATCH',body:JSON.stringify({status})}); }
if(adminPass) showAdmin();
