let cart = JSON.parse(localStorage.getItem('aerova_cart') || '[]');
const money = n => `${Number(n || 0).toLocaleString('ar-EG')} جنيه`;
const $ = selector => document.querySelector(selector);

function saveCart() {
  localStorage.setItem('aerova_cart', JSON.stringify(cart));
}

function changeCheckoutQty(id, delta) {
  const item = cart.find(row => row.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  renderCheckout();
}

function removeCheckoutItem(id) {
  cart = cart.filter(item => item.id !== id);
  saveCart();
  renderCheckout();
}

function renderCheckout() {
  const itemsBox = $('#checkoutItems');
  const totalsBox = $('#checkoutTotals');
  if (!itemsBox || !totalsBox) return;

  if (!cart.length) {
    itemsBox.innerHTML = `
      <div class="empty-checkout">
        <h3>السلة فاضية</h3>
        <p>ارجع للمتجر وضيف المنتج اللي عايزه الأول.</p>
        <a class="btn primary" href="/">تسوق المنتجات</a>
      </div>
    `;
    totalsBox.innerHTML = '';
    return;
  }

  itemsBox.innerHTML = cart.map(item => `
    <div class="checkout-item">
      <img src="${item.image}" alt="">
      <div>
        <h3>${item.name}</h3>
        <small>${money(item.price)} للقطعة</small>
        <div class="qty-controls">
          <button type="button" class="mini-btn status" onclick="changeCheckoutQty('${item.id}', 1)">+</button>
          <b>${item.qty}</b>
          <button type="button" class="mini-btn status" onclick="changeCheckoutQty('${item.id}', -1)">-</button>
          <button type="button" class="mini-btn danger" onclick="removeCheckoutItem('${item.id}')">حذف</button>
        </div>
      </div>
      <strong>${money(item.price * item.qty)}</strong>
    </div>
  `).join('');

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = subtotal >= 300 ? 0 : 50;
  totalsBox.innerHTML = `
    <div><span>قيمة المنتجات</span><b>${money(subtotal)}</b></div>
    <div><span>الشحن</span><b>${shipping ? money(shipping) : 'مجاني'}</b></div>
    <div class="grand"><span>الإجمالي</span><b>${money(subtotal + shipping)}</b></div>
    <p>الدفع عند الاستلام بعد تأكيد الطلب.</p>
  `;
}

$('#checkoutForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const msg = $('#formMsg');
  if (!cart.length) {
    msg.textContent = 'السلة فاضية. ضيف منتج الأول.';
    msg.style.color = '#a01818';
    return;
  }

  const form = event.target;
  const formData = new FormData(form);
  const payload = {
    items: cart,
    customer: {
      name: formData.get('name'),
      phone: formData.get('phone'),
      altPhone: formData.get('altPhone'),
      governorate: formData.get('governorate'),
      city: formData.get('city'),
      address: formData.get('address')
    },
    notes: formData.get('notes')
  };

  msg.textContent = 'جاري إرسال الطلب...';
  msg.style.color = 'var(--navy)';

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'حصل خطأ أثناء إرسال الطلب');
    localStorage.removeItem('aerova_cart');
    window.location.href = `/success?id=${encodeURIComponent(data.id)}`;
  } catch (error) {
    msg.textContent = error.message;
    msg.style.color = '#a01818';
  }
});

function revealOnScroll(){
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting) entry.target.classList.add('visible'); }), { threshold: .12 });
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
}

renderCheckout();
revealOnScroll();
