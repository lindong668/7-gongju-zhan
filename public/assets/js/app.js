/* Utilixo Tools — 全局：主题、搜索过滤、复制 */
(function(){
  var K='utilixo-theme';
  /* 主题只认「用户手动选择」：默认浅色，系统深浅色与语言均不参与 */
  try{
    var s=localStorage.getItem(K);
    document.documentElement.setAttribute('data-theme',s==='dark'?'dark':'light');
  }catch(e){document.documentElement.setAttribute('data-theme','light');}
  window.utilixoToggle=function(){
    var cur=document.documentElement.getAttribute('data-theme')||'light';
    var nx=cur==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',nx);
    try{localStorage.setItem(K,nx);}catch(e){}
    var b=document.getElementById('themeBtn');
    if(b)b.textContent=nx==='dark'?'☀':'☾';
  };
  /* 复制成功提示：按页面语言显示，不再固定英文 */
  var COPY_TXT={en:'Copied!',zh:'已复制',ja:'コピーしました',de:'Kopiert!',
                fr:'Copié !',es:'¡Copiado!',pt:'Copiado!'};
  var EMPTY_TXT={en:'Nothing to copy',zh:'暂无可复制内容',ja:'コピーする内容がありません',
                 de:'Nichts zum Kopieren',fr:'Rien à copier',es:'Nada que copiar',pt:'Nada para copiar'};
  var FAIL_TXT={en:'Copy failed',zh:'复制失败',ja:'コピーに失敗',de:'Kopieren fehlgeschlagen',
                fr:'Échec de la copie',es:'Error al copiar',pt:'Falha ao copiar'};
  function langKey(){
    var L=(document.documentElement.lang||'en').toLowerCase().slice(0,2);
    return COPY_TXT[L]?L:'en';
  }
  /* 屏幕中央的提示条，比只改按钮文字明显得多 */
  window.toast=function(m){toast(m);};
  function toast(msg){
    var old=document.getElementById('uxToast');if(old)old.remove();
    var d=document.createElement('div');d.id='uxToast';d.textContent=msg;
    d.style.cssText='position:fixed;left:50%;bottom:34px;transform:translateX(-50%);'+
      'z-index:9999;padding:11px 22px;border-radius:11px;font-size:14px;font-weight:700;'+
      'background:#0F172A;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.35);'+
      'opacity:0;transition:opacity .18s,transform .18s;pointer-events:none;max-width:90vw;text-align:center';
    document.body.appendChild(d);
    requestAnimationFrame(function(){d.style.opacity='1';d.style.transform='translateX(-50%) translateY(-6px)';});
    setTimeout(function(){d.style.opacity='0';setTimeout(function(){if(d.parentNode)d.remove();},220);},1500);
  }
  /* 通用提示条，开放给各工具页调用（按页面语言显示） */
  var UX_TXT={
    updated:{en:'List updated',zh:'名单已更新',ja:'リストを更新しました',
             de:'Liste aktualisiert',fr:'Liste mise à jour',
             es:'Lista actualizada',pt:'Lista atualizada'},
    empty:{en:'Please enter at least one name',zh:'请先输入至少一个名字',
           ja:'名前を1つ以上入力してください',de:'Bitte mindestens einen Namen eingeben',
           fr:'Veuillez saisir au moins un nom',es:'Introduce al menos un nombre',
           pt:'Digite pelo menos um nome'},
    needUpdate:{en:'Click "Update list" to apply changes',
                zh:'改完名字请点「更新名单」生效',
                ja:'変更後は「リストを更新」をクリックしてください',
                de:'Klicken Sie auf „Liste aktualisieren“, um zu übernehmen',
                fr:'Cliquez sur « Mettre à jour la liste » pour appliquer',
                es:'Haz clic en «Actualizar lista» para aplicar',
                pt:'Clique em «Atualizar lista» para aplicar'}
  };
  window.utilixoTxt=function(k){
    var m=UX_TXT[k];if(!m)return '';
    var L=langKey();return m[L]||m.en;
  };
  window.utilixoToast=toast;
  window.utilixoCopy=function(txt,btn){
    var L=langKey();
    if(txt===null||txt===undefined)txt='';
    txt=String(txt);
    /* 结果为空时不谎报成功：明确告诉用户没有可复制的内容 */
    if(!txt.trim()||txt.trim()==='—'||txt.trim()==='-'){
      if(btn){var ob=btn.getAttribute('data-ot')||btn.textContent;if(!btn.getAttribute('data-ot'))btn.setAttribute('data-ot',ob);btn.textContent=EMPTY_TXT[L];setTimeout(function(){btn.textContent=ob;},1500);}
      toast(EMPTY_TXT[L]);return;
    }
    var done=function(){
      if(btn){
        var o=btn.getAttribute('data-ot')||btn.textContent;
        if(!btn.getAttribute('data-ot'))btn.setAttribute('data-ot',o);
        btn.textContent=COPY_TXT[L];
        setTimeout(function(){btn.textContent=o;},1500);
      }
      toast(COPY_TXT[L]);
    };
    var fail=function(){
      if(btn){var o=btn.getAttribute('data-ot')||btn.textContent;btn.textContent=FAIL_TXT[L];
        setTimeout(function(){btn.textContent=o;},1500);}
      toast(FAIL_TXT[L]+' — '+txt.slice(0,0));
    };
    /* 优先用现代剪贴板接口；失败或不存在时回退到 execCommand */
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(function(){done();},function(){legacy();});
    }else{legacy();}
    function legacy(){
      var ta=document.createElement('textarea');
      ta.value=txt;
      /* 必须可见才能被选中：放在视口内且仅透明，不能用 display:none */
      ta.style.cssText='position:fixed;top:10px;left:10px;width:1px;height:1px;opacity:0;padding:0;border:0;';
      ta.setAttribute('readonly','');
      document.body.appendChild(ta);
      ta.focus();ta.select();ta.setSelectionRange(0,txt.length);
      var ok=false;
      try{ok=document.execCommand('copy');}catch(e){ok=false;}
      document.body.removeChild(ta);
      if(ok)done();else fail();
    }
  };
  /* 搜索过滤：首页与分类页共用 */
  window.utilixoFilter=function(q){
    q=(q||'').trim().toLowerCase();
    var cards=document.querySelectorAll('.card[data-search]');
    var shown=0;
    for(var i=0;i<cards.length;i++){
      var c=cards[i];
      var hit=!q||(c.getAttribute('data-search')||'').indexOf(q)>=0;
      c.classList.toggle('hide',!hit);
      if(hit)shown++;
    }
    var secs=document.querySelectorAll('.sec[data-cat]');
    for(var j=0;j<secs.length;j++){
      var vis=secs[j].querySelectorAll('.card:not(.hide)').length;
      secs[j].style.display=vis?'':'none';
    }
    var em=document.getElementById('noResult');
    if(em)em.style.display=(q&&shown===0)?'block':'none';
  };
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.getElementById('themeBtn');
    if(b)b.textContent=(document.documentElement.getAttribute('data-theme')==='dark')?'☀':'☾';
    var inputs=document.querySelectorAll('[data-filter]');
    for(var i=0;i<inputs.length;i++){
      (function(el){
        el.addEventListener('input',function(){window.utilixoFilter(el.value);});
      })(inputs[i]);
    }
  });

  /* ===== Cookie / 广告同意（GDPR + ePrivacy） =====
     实现：向所有地区访客在首次访问时显示同意条，未选择前不加载任何广告脚本；
     这比「仅 EEA 门控」更保守，也不依赖 Worker 端地区注入（该注入在线上从未生效）。
     选择记在本地，可随时在页脚 Cookie settings 更改。
     ================================================ */
  var CK = 'utilixo-consent';
  var CK_TXT = {
   en:{t:'We use no tracking cookies of our own. If advertising is shown, its provider may set cookies to serve and measure ads. You can accept or decline — every tool works either way.',p:'Privacy Policy',a:'Accept',d:'Decline',s:'Cookie settings',al:'Cookie consent'},
   zh:{t:'我们自己不使用任何追踪 Cookie。若展示广告，广告提供商可能会设置 Cookie 用于投放与统计。你可以选择接受或拒绝——无论哪种，所有工具都能正常使用。',p:'隐私政策',a:'接受',d:'拒绝',s:'Cookie 设置',al:'Cookie 同意'},
   pt:{t:'Não usamos cookies de rastreamento próprios. Se anúncios forem exibidos, o provedor pode definir cookies para veiculá-los e medi-los. Você pode aceitar ou recusar — todas as ferramentas funcionam de qualquer forma.',p:'Política de Privacidade',a:'Aceitar',d:'Recusar',s:'Configurações de cookies',al:'Consentimento de cookies'},
   es:{t:'No usamos cookies de seguimiento propias. Si se muestran anuncios, su proveedor puede establecer cookies para publicarlos y medirlos. Puedes aceptar o rechazar: todas las herramientas funcionan igual.',p:'Política de Privacidad',a:'Aceptar',d:'Rechazar',s:'Configuración de cookies',al:'Consentimiento de cookies'},
   fr:{t:'Nous n’utilisons aucun cookie de suivi propre. Si des publicités sont affichées, leur fournisseur peut déposer des cookies pour les diffuser et les mesurer. Vous pouvez accepter ou refuser — tous les outils fonctionnent dans les deux cas.',p:'Politique de confidentialité',a:'Accepter',d:'Refuser',s:'Paramètres des cookies',al:'Consentement aux cookies'},
   de:{t:'Wir verwenden keine eigenen Tracking-Cookies. Falls Werbung angezeigt wird, kann deren Anbieter Cookies setzen, um Anzeigen auszuliefern und zu messen. Sie können akzeptieren oder ablehnen – alle Tools funktionieren in beiden Fällen.',p:'Datenschutz',a:'Akzeptieren',d:'Ablehnen',s:'Cookie-Einstellungen',al:'Cookie-Einwilligung'},
   ja:{t:'当サイト自体ではトラッキングCookieを使用していません。広告が表示される場合、広告提供者が配信・計測のためにCookieを設定することがあります。同意または拒否を選択できます — いずれの場合もすべてのツールはご利用いただけます。',p:'プライバシーポリシー',a:'同意する',d:'拒否する',s:'Cookie設定',al:'Cookieの同意'}
  };
  var CK_DIR={en:'',zh:'/zh',pt:'/pt',es:'/es',fr:'/fr',de:'/de',ja:'/ja'};
  function ckLang(){
   var l=(document.documentElement.getAttribute('lang')||'en').toLowerCase();
   if(l.indexOf('zh')===0) return 'zh';
   return CK_TXT[l]?l:'en';
  }
  function ckGet(){ try{ return localStorage.getItem(CK); }catch(e){ return null; } }
  function ckSet(v){ try{ localStorage.setItem(CK,v); }catch(e){} }
  window.utilixoConsent = function(v){ ckSet(v); ckHide(); if(v==='granted'){ uxLoadAds(); } };
  window.utilixoConsentOpen = function(){ ckShow(); };

  /* ===== 广告加载：实现统一在 /assets/js/ads.js（仅首页引用），这里只转发同意结果 =====
     未同意前不加载任何第三方脚本；非首页不会存在广告容器，转发为 no-op。 */
  function uxLoadAds(){
    if(typeof window.uxAdsLoad === 'function') window.uxAdsLoad();
  }

  function ckShow(){ var b=document.getElementById('ckBanner'); if(b){ b.style.display='block'; } }
  function ckHide(){ var b=document.getElementById('ckBanner'); if(b){ b.style.display='none'; } }

  function ckBuild(){
    if(document.getElementById('ckBanner')) return;
    var d=document.createElement('div');
    d.id='ckBanner'; d.className='ck'; d.style.display='none';
    var lg=ckLang(), T=CK_TXT[lg], dir=CK_DIR[lg]||'';
    d.setAttribute('role','dialog'); d.setAttribute('aria-label',T.al);
    d.innerHTML =
      '<div class="ck-in">' +
      '<p class="ck-t">'+T.t+' <a href="'+dir+'/pages/privacy">'+T.p+'</a></p>' +
      '<div class="ck-b">' +
      '<button class="btn ghost" onclick="utilixoConsent(\'denied\')">'+T.d+'</button>' +
      '<button class="btn" onclick="utilixoConsent(\'granted\')">'+T.a+'</button>' +
      '</div></div>';
    document.body.appendChild(d);
    /* 页脚加入「Cookie 设置」，便于随时撤回同意 */
    var fl=document.querySelector('.ftr-links');
    if(fl && !document.getElementById('ckOpen')){
      var a=document.createElement('button');
      a.id='ckOpen'; a.className='ftr-ck'; a.type='button';
      a.textContent=T.s;
      a.onclick=function(){ window.utilixoConsentOpen(); };
      fl.appendChild(a);
    }
  }

  document.addEventListener('DOMContentLoaded',function(){
    ckBuild();
    var c = ckGet();
    if(c === 'granted'){ uxLoadAds(); }
    else if(c === 'denied'){ /* 保持不加载 */ }
    else { ckShow(); }
  });

})();
