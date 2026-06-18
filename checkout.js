let products=[]; const cartKey='aerova_cart_v2';
const $=s=>document.querySelector(s); const money=n=>`${Number(n||0).toLocaleString('ar-EG')} جنيه`;
const getCart=()=>JSON.parse(localStorage.getItem(cartKey)||'[]');
function details(){return getCart().map(i=>({...products.find(p=>p.id===i.id),qty:i.qty})).filter(x=>x.id)}
function render(){const items=details(); const total=items.reduce((s,i)=>s+i.price*i.qty,0); $('#checkoutTotal').textContent=money(total); $('#checkoutItems').innerHTML=items.length?items.map(i=>`<div class="summary-item"><img src="${i.image}" alt="${i.name}"><div><h4>${i.name}</h4><span class="muted">الكمية: ${i.qty}</span></div><b>${money(i.price*i.qty)}</b></div>`).join(''):'<p class="muted">السلة فاضية.</p>';}
$('#checkoutForm').addEventListener('submit',async e=>{e.preventDefault(); const items=getCart(); if(!items.length) return alert('السلة فاضية'); const f=new FormData(e.target); const customer=Object.fromEntries(f.entries()); const res=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,customer})}); const data=await res.json(); if(data.ok){localStorage.removeItem(cartKey); location.href='/success'} else alert(data.error||'حصل خطأ');});
fetch('/api/products').then(r=>r.json()).then(d=>{products=d;render()});
