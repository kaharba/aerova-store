let pass = sessionStorage.getItem('aerova_admin_pass') || '';
let products = [];
const $ = s => document.querySelector(s);
const api = (url, opt={}) => fetch(url,{...opt,headers:{'Content-Type':'application/json','x-admin-password':pass,...(opt.headers||{})}}).then(r=>r.json());
function money(n){return `${Number(n||0).toLocaleString('ar-EG')} جنيه`}
function showAdmin(){ $('#loginBox').hidden=true; $('#adminPanel').hidden=false; loadAll(); }
function showLogin(){ $('#loginBox').hidden=false; $('#adminPanel').hidden=true; }
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault(); pass=$('#adminPassword').value; const res=await api('/api/admin/products'); if(Array.isArray(res)){sessionStorage.setItem('aerova_admin_pass',pass);showAdmin()} else alert('الباسورد غير صحيح أو غير متفعل في Render');});
$('#logoutBtn').onclick=()=>{sessionStorage.removeItem('aerova_admin_pass'); pass=''; showLogin();}
async function loadAll(){ products=await api('/api/admin/products'); renderProducts(); const orders=await api('/api/admin/orders'); renderOrders(Array.isArray(orders)?orders:[]); }
function renderProducts(){ $('#productsList').innerHTML=products.map(p=>`<div class="admin-row"><h4>${p.name}</h4><p>${p.category} · ${money(p.price)} · مخزون ${p.stock||0}</p><div class="admin-actions"><button onclick="editProduct('${p.id}')">تعديل</button><button onclick="deleteProduct('${p.id}')">حذف</button><a class="view-btn" href="/product/${p.id}" target="_blank">عرض</a></div></div>`).join('') || '<p class="muted">لا توجد منتجات</p>'; }
function renderOrders(orders){ $('#ordersList').innerHTML=orders.map(o=>`<div class="order-row"><b>${o.id}</b><p>${o.customer?.name||''} · ${o.customer?.phone||''}</p><p>${(o.items||[]).map(i=>`${i.name} × ${i.qty}`).join('، ')}</p><p><b>${money(o.total)}</b> · ${o.status}</p><select onchange="updateOrder('${o.id}',this.value)"><option>جديد</option><option>تم التأكيد</option><option>تم الشحن</option><option>ملغي</option></select></div>`).join('') || '<p class="muted">لا توجد طلبات</p>'; }
window.editProduct = id => { const p=products.find(x=>x.id===id); if(!p) return; const f=$('#productForm'); Object.keys(p).forEach(k=>{ if(f.elements[k]) f.elements[k].value = Array.isArray(p[k]) ? p[k].join('\n') : p[k]; }); scrollTo({top:0,behavior:'smooth'}); };
window.deleteProduct = async id => { if(!confirm('حذف المنتج؟')) return; await api('/api/admin/products/'+id,{method:'DELETE'}); loadAll(); };
window.updateOrder = async (id,status) => { await api('/api/admin/orders/'+id,{method:'PATCH',body:JSON.stringify({status})}); loadAll(); };
$('#clearForm').onclick=()=>$('#productForm').reset();
$('#imageUpload').addEventListener('change', e=>{ const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=async()=>{ const res=await api('/api/admin/upload',{method:'POST',body:JSON.stringify({image:reader.result})}); if(res.url){ $('#productForm').elements.image.value=res.url; alert('تم رفع الصورة'); } else alert(res.error||'فشل رفع الصورة'); }; reader.readAsDataURL(file); });
$('#productForm').addEventListener('submit',async e=>{ e.preventDefault(); const data=Object.fromEntries(new FormData(e.target).entries()); data.features=(data.features||'').split('\n').filter(Boolean); const id=data.id; const method=id && products.some(p=>p.id===id)?'PUT':'POST'; const url=method==='PUT'?'/api/admin/products/'+id:'/api/admin/products'; await api(url,{method,body:JSON.stringify(data)}); e.target.reset(); loadAll(); });
if(pass) showAdmin(); else showLogin();
