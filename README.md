# Utilixo（7号站 / hho.us.ci）v17

7 语言（en 根 + zh / pt / es / fr / de / ja）× 73 页 = 511 个 HTML，56 个浏览器端工具。
本版为 2026-11-10 全站审计后的整改定稿 + 2026-11-13 收录对齐，**完整整套源码（539 文件），不是补丁包**。
v16 相对 v15 只多一处修复：6 个非英文版「Meta 标签生成器」输出模板改为读取表单输入，不再写死本页标题/描述（原版遗留，不是 v15 改写引入）。

## 部署

- 线上 Worker 名：`7-gongju-zhan`（`wrangler.toml` 已对齐）
- 结构：`public/`（Workers Assets）、`src/index.js`（Worker）、`wrangler.toml`
- Git 集成：push 后由 Workers Builds 执行 `npx wrangler deploy`
- 本地预览：`npx wrangler dev`；手动发布：`npx wrangler deploy`
- `package.json` 已无 `postinstall` / `build`；**仓库不再依赖 `site-pages.zip`**（该归档曾导致 Google「有害下载」误报），`build.js` 已删除

## URL 形态（全站唯一）

- 最终 URL：**无扩展名**，例 `https://hho.us.ci/tools/json-formatter`
- `.html` 是历史形态：Worker 显式 **301 永久**回无扩展名（v16 是 307）；全站声明与内链已不再指向 `.html`
- canonical / hreflang / `og:url` / sitemap `<loc>` / 站内 `<a href>` / 语言切换器 / JSON-LD 全部为无扩展名，且都直接 200

## 必须保留的两项配置（`wrangler.toml` 的 `[assets]`）

- `run_worker_first = true`：让**所有请求**先经过 Worker，410 禁止下载、硬 404、安全响应头、无扩展名映射才真正生效。改回 `false` 会让 Worker 只在静态资源未命中时才跑，等于回到「线上行为与源码脱节」。
- `html_handling = "none"`：让 `env.ASSETS.fetch('/xxx.html')` 直接返回 200 文件而不是重定向；Worker 才能把无扩展名 URL 映射到对应 html。改回默认 `auto-trailing-slash` 会让内部映射拿到 307，整站页面 404。

`not_found_handling` 保持默认 `none`（未命中不回退 SPA）。这两项是本次整改核心，部署后不要改回默认值；CF 控制台若有同名 Assets 路由设置，以 `wrangler.toml` 为准。

## 多语言声明

- 504 个可索引页各 8 条：`en` / `zh-CN` / `pt-BR` / `es` / `fr` / `de` / `ja` / `x-default`，7 组互指闭环，`x-default` 统一指英文版
- `<html lang>` 与 hreflang 代码一致（zh-CN / pt-BR）
- `sitemap.xml`：504 条 `<loc>`、4032 条 `xhtml:link`、每块带 `<lastmod>`
- 每页带 `og:locale` + 6 条 `og:locale:alternate`
- 7 个 404 页：`noindex`、`/404` 与 `/{lang}/404` 返回真正 404 状态，切换器不再指向软 404 URL

## 安全与广告

- `src/index.js`：归档/可执行后缀一律 410（纯文本、禁止下载）；HTML 响应统一附 HSTS / CSP / Permissions-Policy 等头
- `public/_headers`：同样的头（双保险）
- Cookie 同意条由 `app.js` 面向所有地区显示，未选择前不加载任何第三方脚本；删除了线上未生效的 `__UX_REGION_EEA__` 注入与反向 301 死代码
- 广告加载器仍是审核后启用的占位；`ads.txt` 为站点级声明，不代表已投放广告

## 本版相对 v14.4 基线的变化

- 511 页：URL 去 `.html`、语言码精确化、补 `og:locale`、description 规范化、移除未使用的 `tools-data.js` 引用
- 删除失效 `build.js`、未引用的 `tools-data.js` / `style.css`
- Worker 重写：410 / 硬 404 / 安全头 / 无扩展名映射 / `.html` 301（v16 为 307），并开启 `run_worker_first` + `html_handling="none"`
- sitemap 全量去 `.html`、补 `lastmod`；新增 README、`_headers` 补全、`package.json` 去 postinstall


## v16 收尾修复

- 全站扫描 511 页内联脚本：仅 7 个 `meta-tag-generator` 含 `mtRun()`；英文版本来正确，zh / pt / es / fr / de / ja 六版各有 6 条 `l.push(...)` 把 `<title>`、description、og:title、og:description、twitter:title、twitter:description 写死成本页文案，不读 `#mtT` / `#mtD`。原版即如此，属功能缺陷而非重复页问题。
- 现在 6 版与英文版一致，全部改用 `mtEsc(t)` / `mtEsc(d)` 拼接；共 36 处替换、6 个文件变化。
- 其余 532 个文件与 v15 逐字节相同；英文版 0 改动。

## v17 相对 v16 的两处运行改动（2026-11-13）

本包 = v16 全量整改定稿 + 以下 2 个运行文件改动，**539 文件、2 改 / 537 逐字节未变 / 0 增删**：

1. `src/index.js`：历史 `.html` 由 **307 临时重定向改为 301 永久**；Worker 内 robots fallback 字符串同步补 AdsBot-Google。
   307 是临时跳转，Google 会长期保留新旧两套 URL、旧的那套继续占抓取队列；301 才让权重与规范收敛到无扩展名 URL。
2. `public/robots.txt`：显式补 `User-agent: AdsBot-Google` / `Allow: /`，与 `Mediapartners-Google`、`Googlebot` 并列放行，跟 1号 / 6号 口径对齐。

511 个 HTML、sitemap.xml、ads.txt、`_headers`、`wrangler.toml`、410 / 硬 404 逻辑一个字节未动。

## 说明修正记录（2026-11-13，用户指出后复查）

v17 首版包里 `README.md` 与本文件仍沿用了 v16 的标题和「.html 会 307」描述，与本包实际源码矛盾，已订正。
**运行文件未因此二次改动**；已部署 v17 首版的站点行为正确，只是随包说明文字误导，无需重新部署。
另：511 个 HTML 内出现的字符串 `v16` 全部来自 SVG 路径数据（如 `<path d="M9 4v16"/>`），是绘图指令、不是版本号，无需修改。
