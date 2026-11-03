/**
 * Utilixo Tools — Cloudflare Worker
 * 职责：
 *   1. 给无扩展名路径补 .html / index.html（保证 /tools/xxx 与 /category/xxx 可访问）
 *   2. 硬编码 ads.txt（AdSense 抓取要求根目录必须可返回）
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

    // ---- ads.txt：AdSense 要求根目录可访问，且必须是 text/plain ----
    if (p === '/ads.txt') {
      return new Response('google.com, pub-8915931557404979, DIRECT, f08c47fec0942fa0\n', {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' }
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
      if (r && r.status === 200) return await withFlag(r, request);
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
