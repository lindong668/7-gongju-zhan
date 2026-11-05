/**
 * Utilixo Tools — Cloudflare Worker
 * 职责：
 *   1. 给无扩展名路径补 .html / index.html（保证 /tools/xxx 与 /category/xxx 可访问）
 *   2. 从静态资源提供 ads.txt（根目录可访问，text/plain）
 *   3. 修正 sitemap / robots 的 Content-Type
 *   4. 注入地区标记 __UX_REGION_EEA__（用于欧盟/英国/瑞士的 Cookie 同意门控）
 * 其余全部交给 Workers Assets 静态托管，不改动任何业务内容。
 */

// GDPR / ePrivacy 需要事前同意的地区：EEA + 英国 + 瑞士
const EEA = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
  'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  'IS','LI','NO','GB','CH'
]);

// 静态资源不可用时的兜底，必须与 public/ads.txt 保持一致
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

function flagScript(request) {
  const c = (request.cf && request.cf.country) || '';
  const isEEA = EEA.has(String(c).toUpperCase());
  return '<script>window.__UX_REGION_EEA__=' + (isEEA ? 'true' : 'false') + ';</script>';
}

// 给 HTML 响应注入地区标记；非 HTML 原样返回
async function withFlag(response, request) {
  if (!response || response.status !== 200) return response;
  const ct = response.headers.get('content-type') || '';
  if (ct.indexOf('text/html') === -1) return response;
  let html;
  try {
    html = await response.text();
  } catch (e) {
    return response;
  }
  const i = html.indexOf('<head>');
  if (i === -1) return response;
  const out = html.slice(0, i + 6) + flagScript(request) + html.slice(i + 6);
  const h = new Headers(response.headers);
  h.set('content-type', 'text/html; charset=utf-8');
  return new Response(out, { status: response.status, headers: h });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let p = url.pathname;

    // ---- ads.txt：优先读静态文件（与 public/ads.txt 单一来源，避免改了不生效）----
    if (p === '/ads.txt') {
      const r = await env.ASSETS.fetch(request);
      const body = (r && r.status === 200) ? await r.text() : FALLBACK_ADS_TXT;
      return new Response(body, {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' }
      });
    }

    // ---- robots.txt / sitemap：保证 Content-Type 正确 ----
    if (p === '/robots.txt') {
      const r = await env.ASSETS.fetch(request);
      if (r && r.status === 200) {
        return new Response(await r.text(), {
          headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' }
        });
      }
      return new Response('User-agent: *\nAllow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    if (p === '/sitemap.xml') {
      const r = await env.ASSETS.fetch(request);
      if (r && r.status === 200) {
        return new Response(await r.text(), {
          headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' }
        });
      }
      return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
        headers: { 'content-type': 'application/xml; charset=utf-8' }
      });
    }

    // ---- 已带扩展名：直接交给静态资源 ----
    if (/\.[a-zA-Z0-9]+$/.test(p)) {
      return await withFlag(await env.ASSETS.fetch(request), request);
    }

    // ---- 无扩展名：依次尝试 index.html / xxx.html ----
    const tries = [];
    const base = p.endsWith('/') ? p.slice(0, -1) : p;
    tries.push(base + '/index.html');
    tries.push(base + '.html');
    for (const t of tries) {
      const u = new URL(request.url);
      u.pathname = t;
      const r = await env.ASSETS.fetch(new Request(u.toString(), request));
      if (r && r.status === 200) {
        // Only non-index .html pages are canonicalised with a 301;
        // home and language indexes keep their trailing-slash canonical.
        if (/\.html$/.test(t) && !/index\.html$/.test(t)) {
          const u2 = new URL(request.url);
          u2.pathname = t;
          return Response.redirect(u2.toString(), 301);
        }
        return await withFlag(r, request);
      }
    }

    // ---- 首页兜底 ----
    if (p === '/' || p === '') {
      const u = new URL(request.url);
      u.pathname = '/index.html';
      const r = await env.ASSETS.fetch(new Request(u.toString(), request));
      if (r && r.status === 200) return await withFlag(r, request);
    }

    const u = new URL(request.url);
    u.pathname = '/404.html';
    const nf = await env.ASSETS.fetch(new Request(u.toString(), request));
    if (nf && nf.status === 200) {
      const html = await nf.text();
      const i = html.indexOf('<head>');
      const out = i === -1 ? html : html.slice(0, i + 6) + flagScript(request) + html.slice(i + 6);
      return new Response(out, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    return new Response('Not found', { status: 404 });
  }
};
