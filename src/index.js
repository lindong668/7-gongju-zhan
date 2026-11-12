/**
 * Utilixo Tools — Cloudflare Worker (v15)
 * 最终 URL 形态：无扩展名（/tools/json-formatter），.html 为历史形态并 301 永久回无扩展名。
 * 职责：
 *   1. 归档/可执行类路径显式 410（禁止下载，杜绝 site-pages.zip 类误报复发）
 *   2. ads.txt / robots.txt / sitemap.xml 保证 Content-Type 与内容
 *   3. 无扩展名路径映射到 public/*.html 并直接 200（不产生 301 反向跳转）
 *   4. /404 与 /{lang}/404 返回真正的 404 状态（消除软 404）
 *   5. HTML 响应统一附加安全响应头
 * 配置（wrangler.toml [assets]）：
 *   run_worker_first = true —— 所有请求先经过本 Worker，以上职责才真正生效；
 *   html_handling = "none" —— ASSETS.fetch 不做 .html 重定向，内部映射才能取到 200 文件；
 *   not_found_handling 保持默认 none —— 未命中不回退 SPA。
 * 删除了历史版本里线上未生效的 EEA 地区标记注入与反向 301 死代码；
 * Cookie 同意条由 app.js 面向所有地区显示，不依赖地区标记。
 */

const ARCHIVE_EXT = /\.(zip|rar|7z|tar|gz|tgz|bz2|xz|apk|exe|dmg|msi|bin|iso|jar|war|deb|rpm|cab)$/i;
const GONE_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8">'
  + '<meta name="robots" content="noindex,nofollow">'
  + '<title>410 Gone</title></head><body>'
  + '<h1>410 Gone</h1><p>This resource has been permanently removed. No downloadable archives are hosted on this site.</p>'
  + '</body></html>';

function goneResponse(method) {
  return new Response(method === 'HEAD' ? null : GONE_HTML, {
    status: 410,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-disposition': 'inline',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0'
    }
  });
}

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'content-security-policy': "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; img-src 'self' https: data: blob:; script-src 'self' https: 'unsafe-inline' 'unsafe-eval' blob: data:; style-src 'self' https: 'unsafe-inline'"
};

function withSecurity(response, isHtml) {
  if (!response) return response;
  const h = new Headers(response.headers);
  h.delete('content-length'); // 重建响应，交由运行时重新计算，避免长度不一致
  if (isHtml) {
    for (const k of Object.keys(SECURITY_HEADERS)) h.set(k, SECURITY_HEADERS[k]);
    h.set('content-type', 'text/html; charset=utf-8');
  } else {
    h.set('x-content-type-options', 'nosniff');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h });
}

function htmlResponse(body, status) {
  return new Response(body, {
    status: status,
    headers: Object.assign({ 'content-type': 'text/html; charset=utf-8' }, SECURITY_HEADERS)
  });
}

const FALLBACK_ADS_TXT = `# refreshed 2026-11-03
google.com, pub-8915931557404979, DIRECT, f08c47fec0942fa0

# SOVRN
lijit.com, 618581, DIRECT, fafdf38b16bf6b2b #SOVRN
lijit.com, 618581-eb, DIRECT, fafdf38b16bf6b2b #SOVRN
openx.com, 538959099, RESELLER, 6a698e2ec38604c6
pubmatic.com, 137711, RESELLER, 5d62403b186f2ace
pubmatic.com, 156212, RESELLER, 5d62403b186f2ace
rubiconproject.com, 17960, RESELLER, 0bfd66d529a55807
appnexus.com, 1019, RESELLER, f5ab79cb980f11d1
video.unrulymedia.com, 2444764291, RESELLER
krushmedia.com, AJxF6R572a9M6CaTvK, RESELLER
motorik.io, 100463, RESELLER
smaato.com, 1100056344, RESELLER, 07bcf65f187117b4
smartadserver.com, 4926, RESELLER, 060d053dcf45cbf3
opera.com, pub10014056052800, RESELLER, 55a0c5fd61378de3
axonix.com, 59143, RESELLER, bc385f2b4a87b721
programmaticx.ai, 100464, RESELLER
sharethrough.com, 4926, RESELLER, 060d053dcf45cbf3
`;

const LANGS = ['', 'zh', 'pt', 'es', 'fr', 'de', 'ja'];

async function assetText(env, request, pathname, fallback) {
  const u = new URL(request.url);
  u.pathname = pathname;
  const r = await env.ASSETS.fetch(new Request(u.toString(), request));
  return (r && r.status === 200) ? await r.text() : fallback;
}

async function notFound(env, request, langdir) {
  const p = '/' + (langdir ? langdir + '/' : '') + '404.html';
  const body = await assetText(env, request, p, '<!doctype html><html lang="en"><head><meta name="robots" content="noindex"><title>Not found</title></head><body><h1>404 Not found</h1></body></html>');
  const h = Object.assign({ 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, follow' }, SECURITY_HEADERS);
  return new Response(body, { status: 404, headers: h });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let p = url.pathname;

    // ---- 归档/可执行类路径：明确 410，不走下载通道 ----
    if (ARCHIVE_EXT.test(p) || /site-pages/i.test(p)) {
      return withSecurity(goneResponse(request.method), true);
    }

    // ---- ads.txt ----
    if (p === '/ads.txt') {
      const body = await assetText(env, request, '/ads.txt', FALLBACK_ADS_TXT);
      return withSecurity(new Response(body, {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' }
      }), false);
    }

    // ---- robots.txt / sitemap.xml ----
    if (p === '/robots.txt') {
      const body = await assetText(env, request, '/robots.txt', 'User-agent: Mediapartners-Google\nAllow: /\n\nUser-agent: AdsBot-Google\nAllow: /\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: *\nAllow: /\n\nSitemap: https://hho.us.ci/sitemap.xml\n');
      return withSecurity(new Response(body, {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' }
      }), false);
    }
    if (p === '/sitemap.xml') {
      const body = await assetText(env, request, '/sitemap.xml',
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
      return withSecurity(new Response(body, {
        headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' }
      }), false);
    }

    // ---- 硬 404：/404 与 /{lang}/404 返回 404 状态 ----
    const m404 = p.match(/^\/(?:(zh|pt|es|fr|de|ja)\/)?404\/?$/);
    if (m404) return await notFound(env, request, m404[1] || '');

    // ---- .html 历史形态：301 永久回无扩展名最终 URL（307 会让 Google 保留两套 URL）----
    if (/\.html$/i.test(p)) {
      const target = new URL(request.url);
      target.pathname = p.replace(/\.html$/i, '');
      return withSecurity(new Response(null, {
        status: 301, headers: { 'location': target.pathname + target.search }
      }), false);
    }

    // ---- 无扩展名：映射到 index.html / xxx.html，直接 200（不反向 301）----
    const base = p.endsWith('/') ? p.slice(0, -1) : p;
    const tries = [base + '/index.html', base + '.html'];
    if (p === '/' || p === '') tries.unshift('/index.html');
    for (const t of tries) {
      const u = new URL(request.url);
      u.pathname = t;
      const r = await env.ASSETS.fetch(new Request(u.toString(), request));
      if (r && r.status === 200) return withSecurity(r, true);
    }

    // ---- 其它静态资源（css/js/图片/manifest 等）原样交给 Assets ----
    if (/\.[a-zA-Z0-9]+$/.test(p)) {
      return withSecurity(await env.ASSETS.fetch(request), false);
    }

    // ---- 未知路径：对应语言 404 页 + 404 状态 ----
    const seg = p.split('/').filter(Boolean)[0] || '';
    const langdir = LANGS.indexOf(seg) >= 0 ? seg : '';
    return await notFound(env, request, langdir);
  }
};
