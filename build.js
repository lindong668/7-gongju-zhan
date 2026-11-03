// Utilixo — 部署前自动还原多语言页面
// 把 site-pages.zip 解压到 public/，无需任何外部依赖（纯 Node 实现）
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PUBLIC = path.join(__dirname, 'public');
const ZIP = path.join(PUBLIC, 'site-pages.zip');

if (!fs.existsSync(ZIP)) {
  console.log('[build] site-pages.zip 不存在，跳过（幂等）');
  process.exit(0);
}

const buf = fs.readFileSync(ZIP);

// ---- 定位 End of Central Directory ----
let eocd = -1;
for (let i = buf.length - 22; i >= 0 && i >= buf.length - 65558; i--) {
  if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
}
if (eocd < 0) { console.error('[build] 不是合法的 zip'); process.exit(1); }

let count = buf.readUInt16LE(eocd + 10);
let cdOff = buf.readUInt32LE(eocd + 16);

const ensureDir = d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };

let written = 0;
let p = cdOff;
for (let i = 0; i < count; i++) {
  if (buf.readUInt32LE(p) !== 0x02014b50) break;
  const method = buf.readUInt16LE(p + 10);
  const compSize = buf.readUInt32LE(p + 20);
  const fnLen = buf.readUInt16LE(p + 28);
  const exLen = buf.readUInt16LE(p + 30);
  const cmLen = buf.readUInt16LE(p + 32);
  const lhOff = buf.readUInt32LE(p + 42);
  const name = buf.toString('utf8', p + 46, p + 46 + fnLen);

  // local header -> 真实数据偏移
  const lFnLen = buf.readUInt16LE(lhOff + 26);
  const lExLen = buf.readUInt16LE(lhOff + 28);
  const dataOff = lhOff + 30 + lFnLen + lExLen;
  const raw = buf.slice(dataOff, dataOff + compSize);

  const dest = path.join(PUBLIC, name);

  if (name.endsWith('/')) {
    ensureDir(dest);
  } else {
    ensureDir(path.dirname(dest));
    let out;
    if (method === 0) out = raw;
    else if (method === 8) out = zlib.inflateRawSync(raw);
    else { console.error('[build] 不支持的压缩方式 ' + method + ' @ ' + name); process.exit(1); }
    fs.writeFileSync(dest, out);
    written++;
  }
  p += 46 + fnLen + exLen + cmLen;
}

fs.unlinkSync(ZIP);
console.log('[build] 已还原 ' + written + ' 个页面文件');
