/* Utilixo — 首页广告位加载器（全站唯一实现）
   职责只有两件：push AdSense 队列 + 监听 data-ad-status 切换 .is-filled。
   不读写高度、不折叠、不清空高度；占位高度完全交给 ads.css。
   只在 7 个语言首页被引用；同意前不加载任何第三方脚本。 */
(function () {
  var CLIENT = 'ca-pub-8915931557404979';
  var slots = [].slice.call(document.querySelectorAll('.ad-slot .adsbygoogle'));
  if (!slots.length) return;

  function load() {
    if (window.__UX_ADS_LOADED__) return;
    window.__UX_ADS_LOADED__ = true;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + CLIENT;
    document.head.appendChild(s);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }

  /* 供 app.js 的同意流程调用（app.js 不再持有任何广告逻辑） */
  window.uxAdsLoad = load;

  var consent = null;
  try { consent = localStorage.getItem('utilixo-consent'); } catch (e) {}
  if (consent === 'granted') load();

  /* 只观察状态属性：filled -> 加 .is-filled（高度转 auto）；unfilled -> 去掉 */
  function sync(el) {
    var box = el.closest ? el.closest('.ad-slot') : null;
    if (!box) return;
    if (el.getAttribute('data-ad-status') === 'filled') box.classList.add('is-filled');
    else if (el.getAttribute('data-ad-status') === 'unfilled') box.classList.remove('is-filled');
  }
  if (window.MutationObserver) {
    var mo = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) sync(records[i].target);
    });
    slots.forEach(function (el) {
      mo.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    });
  }
})();
