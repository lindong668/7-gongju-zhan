# Yarrow Tools — 56 个免费浏览器工具

纯静态 + Cloudflare Workers，全部计算在浏览器本地完成，不上传任何数据。

## 部署前必须做一件事：替换域名

全站 canonical / og:url / sitemap / wrangler routes 都用占位符 `__DOMAIN__`。

```bash
bash setdomain.sh yourdomain.com
```

脚本会自动替换全部 68 个文件里的占位符，并写入 wrangler 的 zone。

## 替换 AdSense / 广告 ID

`public/ads.txt` 里目前是占位 ID：

```
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
```

把 `pub-0000000000000000` 换成你自己的发布商 ID。

## 部署

```bash
npm install
npx wrangler deploy
```

## 结构

```
public/
  index.html              首页（搜索 + 5 分类 + 56 卡片）
  404.html
  tools/*.html            56 个工具页
  category/*.html         5 个分类聚合页
  pages/*.html            about / contact / privacy / terms / disclaimer
  assets/css/style.css    配色与布局（含暗色模式）
  assets/js/app.js        主题、搜索过滤、复制
  sitemap.xml             67 条
  robots.txt
  ads.txt
  manifest.webmanifest
  _headers
src/index.js              Worker：补 .html、ads.txt、sitemap Content-Type
```

## 工具清单（56）

- **Text & Code 17**：JSON 格式化、JSON→TS、字数统计、大小写转换、Base64、URL 编解码、哈希(MD5/SHA)、JWT 解码、文本对比、正则测试、Slug、去重行、数字转英文、HTML 实体、Markdown→HTML、SQL 格式化、XML 格式化
- **Finance 9**：百分比、小费分账、贷款 EMI、房贷、复利、折扣、ROI 盈亏平衡、工时工资、薪资换算
- **Health 8**：年龄、BMI、日期差、卡路里 TDEE、预产期、成绩、睡眠周期、GPA
- **Converters 10**：单位、进制、颜色、时间戳、时区、CSV↔JSON、YAML↔JSON、图片转 Base64、速度、数据存储
- **Generators 12**：密码、UUID、二维码、Lorem、Meta 标签、图片压缩、Favicon、CSS 阴影、**随机名字转盘**、骰子、抛硬币、取色器

## 已验证

- 核心算法独立复算 26/26
- 全站 67 页手机视口：HTTP 全 200、无横向溢出、无 JS 错误
- 功能实测 67 项全通过
- 桌面 1280 / 平板 768：无溢出无错误
- 静态合规检查 39/39（canonical / og / JSON-LD / robots / ads.txt / 隐私页要素）
