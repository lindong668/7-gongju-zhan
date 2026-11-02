/**
 * Yarrow Tools — Cloudflare Worker
 * 只做三件事：
 *   1. 给无扩展名路径补 .html / index.html（保证 /tools/xxx 与 /category/xxx 可访问）
 *   2. 硬编码 ads.txt（AdSense 抓取要求根目录必须可返回）
 *   3. 修正 sitemap / robots 的 Content-Type
 * 其余全部交给 Workers Assets 静态托管，不改动任何业务内容。
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let p = url.pathname;

    // ---- ads.txt：AdSense 要求根目录可访问，且必须是 text/plain ----
    if (p === '/ads.txt') {
      return new Response('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n', {
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
      return env.ASSETS.fetch(request);
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
      if (r && r.status === 200) return r;
    }

    // ---- 首页兜底 ----
    if (p === '/' || p === '') {
      const u = new URL(request.url);
      u.pathname = '/index.html';
      const r = await env.ASSETS.fetch(new Request(u.toString(), request));
      if (r && r.status === 200) return r;
    }

    const u = new URL(request.url);
    u.pathname = '/404.html';
    const nf = await env.ASSETS.fetch(new Request(u.toString(), request));
    return nf && nf.status === 200 ? new Response(nf.body, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } })
      : new Response('Not found', { status: 404 });
  }
};
