/* Yarrow Tools — 全局：主题、搜索过滤、复制 */
(function(){
  var K='yarrow-theme';
  try{
    var s=localStorage.getItem(K);
    if(!s){s=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}
    document.documentElement.setAttribute('data-theme',s);
  }catch(e){}
  window.yarrowToggle=function(){
    var cur=document.documentElement.getAttribute('data-theme')||'light';
    var nx=cur==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',nx);
    try{localStorage.setItem(K,nx);}catch(e){}
    var b=document.getElementById('themeBtn');
    if(b)b.textContent=nx==='dark'?'☀':'☾';
  };
  window.yarrowCopy=function(txt,btn){
    var done=function(){
      if(btn){var o=btn.textContent;btn.textContent='Copied!';setTimeout(function(){btn.textContent=o;},1400);}
    };
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(done,function(){fallback();});
    }else{fallback();}
    function fallback(){
      var ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy');done();}catch(e){}
      document.body.removeChild(ta);
    }
  };
  /* 搜索过滤：首页与分类页共用 */
  window.yarrowFilter=function(q){
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
        el.addEventListener('input',function(){window.yarrowFilter(el.value);});
      })(inputs[i]);
    }
  });
})();
