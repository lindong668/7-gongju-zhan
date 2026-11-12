/* Utilixo — QR Code Generator (renderer)
   Requires /assets/js/qrcode-lib.js (Kazuhiko Arase, MIT).
   Replaces the previous hand-rolled encoder, whose RS generator polynomial
   produced invalid check codes (ZXing: ChecksumException). */
(function () {
  if (typeof qrcode === 'undefined') return;
  // byte mode with real UTF-8, so non-ASCII text is scannable too
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  var L = (document.documentElement.lang || 'en').toLowerCase().split('-')[0];
  var S = {
    en: {mod:'modules', ch:'characters', empty:'Enter some text or a URL first.', fail:'Could not generate a QR code for this input (try shorter text).', dl:'Download PNG', ver:'QR version'},
    zh: {mod:'模块', ch:'个字符', empty:'请先输入文字或链接。', fail:'无法为这段内容生成二维码，请尝试缩短文本。', dl:'下载 PNG', ver:'二维码版本'},
    de: {mod:'Module', ch:'Zeichen', empty:'Bitte zuerst Text oder eine URL eingeben.', fail:'QR-Code konnte nicht erzeugt werden (kürzeren Text versuchen).', dl:'PNG herunterladen', ver:'QR-Version'},
    fr: {mod:'modules', ch:'caractères', empty:'Saisissez d’abord du texte ou une URL.', fail:'Impossible de générer le QR code (essayez un texte plus court).', dl:'Télécharger PNG', ver:'Version QR'},
    es: {mod:'módulos', ch:'caracteres', empty:'Introduce primero un texto o una URL.', fail:'No se pudo generar el código QR (prueba con un texto más corto).', dl:'Descargar PNG', ver:'Versión QR'},
    pt: {mod:'módulos', ch:'caracteres', empty:'Introduza primeiro um texto ou URL.', fail:'Não foi possível gerar o código QR (tente um texto mais curto).', dl:'Descarregar PNG', ver:'Versão QR'},
    ja: {mod:'モジュール', ch:'文字', empty:'テキストまたは URL を入力してください。', fail:'QR コードを生成できませんでした（短いテキストをお試しください）。', dl:'PNG をダウンロード', ver:'QR バージョン'}
  };
  var t = S[L] || S.en;

  window.qrGo = function () {
    var txtEl = document.getElementById('qrT');
    var box = document.getElementById('qrBox');
    var msg = document.getElementById('qrMsg');
    if (!txtEl || !box || !msg) return;
    var txt = txtEl.value || '';
    box.innerHTML = '';
    msg.innerHTML = '';
    if (!txt.trim()) {
      msg.innerHTML = '<div class="err-t">' + t.empty + '</div>';
      return;
    }
    try {
      var ec = (document.getElementById('qrE') || {}).value || 'M';
      if (['L','M','Q','H'].indexOf(ec) < 0) ec = 'M';
      // typeNumber 0 = auto-select smallest version that fits
      var qr = qrcode(0, ec);
      qr.addData(txt, 'Byte');
      qr.make();
      var n = qr.getModuleCount();
      var scale = parseInt((document.getElementById('qrS') || {}).value, 10) || 6;
      var quiet = 4; // ISO/IEC 18004 requires a 4-module quiet zone
      var px = (n + quiet * 2) * scale;
      var c = document.createElement('canvas');
      c.width = px; c.height = px;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, px, px);
      ctx.fillStyle = '#000';
      for (var r = 0; r < n; r++) {
        for (var col = 0; col < n; col++) {
          if (qr.isDark(r, col)) {
            ctx.fillRect((col + quiet) * scale, (r + quiet) * scale, scale, scale);
          }
        }
      }
      box.appendChild(c);
      var a = document.createElement('button');
      a.className = 'btn-o';
      a.textContent = t.dl;
      a.onclick = function () {
        var l = document.createElement('a');
        l.href = c.toDataURL('image/png');
        l.download = 'qrcode.png';
        l.click();
      };
      box.appendChild(a);
      msg.innerHTML = '<div class="ok-t">' + t.ver + ' ' + ((n - 17) / 4) +
        ' · ' + n + '×' + n + ' ' + t.mod + ' · ' + txt.length + ' ' + t.ch + '</div>';
    } catch (err) {
      msg.innerHTML = '<div class="err-t">' + t.fail + '</div>';
    }
  };
})();
