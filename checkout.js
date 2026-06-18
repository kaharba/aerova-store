<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>تم استلام الطلب | Aerova Egypt</title>
  <link rel="icon" href="/assets/logo.png" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="success-page">
  <main class="success-card">
    <img src="/assets/logo.png" alt="Aerova">
    <div class="success-icon">✓</div>
    <h1>تم استلام طلبك بنجاح</h1>
    <p>هنراجع الطلب ونتواصل معاك للتأكيد قبل الشحن.</p>
    <div class="order-summary" id="successOrderId"></div>
    <a class="btn primary" href="/">رجوع للمتجر</a>
  </main>
  <script>
    const id = new URLSearchParams(location.search).get('id');
    document.getElementById('successOrderId').innerHTML = id ? `رقم الطلب: <b>${id}</b>` : 'تم تسجيل الطلب.';
  </script>
</body>
</html>
