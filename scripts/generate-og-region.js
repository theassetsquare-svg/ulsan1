#!/usr/bin/env node
/* 지역 키워드 13페이지 OG 썸네일 — 1200x1200 (1:1)
   A그룹 4장: 주 키워드 대형 + 지역 + 하단 검은 띠(닉네임 / 전화번호)
   B그룹 9장: 주 키워드 대형 + 지역 + 사이트 브랜드 (전화번호·besta12 없음)
   연령 배지: 창원·대전 2장만 "만 27세 이상" / "만 38세 이상" 완전문
   실행: node scripts/generate-og-region.js */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { REGIONS } = require('./region-data.js');
const { VENUES } = require('./night-data.js');

const FONT_DIR = path.join(__dirname, 'fonts');
if (!fs.existsSync(path.join(FONT_DIR, 'NotoSansKR-Bold.ttf'))) {
  console.error('❌ 한글 폰트 없음: scripts/fonts/NotoSansKR-Bold.ttf'); process.exit(1);
}
if (!process.env.FONTCONFIG_FILE) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ogfc-'));
  const conf = path.join(tmp, 'fonts.conf');
  fs.writeFileSync(conf, `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${FONT_DIR}</dir>
  <cachedir>${path.join(tmp, 'cache')}</cachedir>
  <match target="pattern"><test qual="any" name="family"><string>sans-serif</string></test>
    <edit name="family" mode="prepend" binding="strong"><string>Noto Sans KR</string></edit></match>
</fontconfig>`);
  process.env.FONTCONFIG_FILE = conf;
}
const sharp = require('sharp');

const SIZE = 1200, FONT = 'Noto Sans KR', ROOT = path.resolve(__dirname, '..');
const BRAND = 'e.nolcool.com';

const cache = new Map();
async function measure(text, size, weight = 900) {
  const key = text + '|' + size + '|' + weight;
  if (cache.has(key)) return cache.get(key);
  const W = 4000, H = Math.ceil(size * 2.2);
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#000"/>
<text x="40" y="${Math.round(size * 1.4)}" fill="#fff" font-size="${size}" font-weight="${weight}" font-family="${FONT}">${text}</text></svg>`;
  const out = await sharp(Buffer.from(svg)).trim({ background: '#000000', threshold: 12 }).toBuffer({ resolveWithObject: true });
  const r = { w: out.info.width, h: out.info.height };
  cache.set(key, r); return r;
}
async function fit(text, { targetH, maxW, weight = 900, maxSize = 400 }) {
  const base = 100;
  const m = await measure(text, base, weight);
  let size = Math.floor(Math.min(targetH / m.h * base, maxW / m.w * base, maxSize));
  let real = await measure(text, size, weight);
  while (real.w > maxW && size > 10) { size -= 2; real = await measure(text, size, weight); }
  return { size, w: real.w, h: real.h };
}

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const report = [];
const MAXW = 1000;   // 좌우 여백 100px씩

async function build(v) {
  const [c1, c2] = v.ogBg, ac = v.ogAccent;
  const lines = v.ogSplit;
  const isA = v.group === 'A';

  const nameTargetH = isA ? 150 : 160;
  const fits = [];
  for (const L of lines) fits.push({ t: L, ...(await fit(L, { targetH: nameTargetH, maxW: MAXW })) });
  const nameH = Math.max(...fits.map(f => f.h));

  const reg = await fit(v.ogRegion, { targetH: 52, maxW: MAXW, weight: 700 });

  let body = '', tel = null, nick = null, brand = null;
  if (isA) {
    nick = await fit(v.staff.nick, { targetH: 70, maxW: 900, weight: 900 });
    tel = await fit(v.staff.phone, { targetH: 112, maxW: 1040, weight: 900 });
  } else {
    brand = await fit(BRAND, { targetH: 46, maxW: 900, weight: 700 });
  }

  let y = 210; const gap = 46;
  const nameSvg = fits.map(f => {
    y += f.h;
    const t = `<text x="600" y="${y}" text-anchor="middle" fill="#FFFFFF" font-size="${f.size}" font-weight="900" font-family="${FONT}">${f.t}</text>`;
    y += gap; return t;
  }).join('\n  ');

  const regY = 690, bandY = 720;

  if (isA) {
    body = `
  <rect x="0" y="${bandY}" width="${SIZE}" height="${SIZE - bandY}" fill="#000000"/>
  <rect x="0" y="${bandY}" width="${SIZE}" height="6" fill="${ac}"/>
  <text x="600" y="${bandY + 40 + nick.h}" text-anchor="middle" fill="#FFFFFF" font-size="${nick.size}" font-weight="900" font-family="${FONT}">${v.staff.nick}</text>
  <text x="600" y="${bandY + 40 + nick.h + 60 + tel.h}" text-anchor="middle" fill="#FFFFFF" font-size="${tel.size}" font-weight="900" font-family="${FONT}">${v.staff.phone}</text>`;
  } else {
    body = `
  <rect x="230" y="900" width="740" height="4" rx="2" fill="${ac}" opacity="0.55"/>
  <text x="600" y="${1010 + brand.h}" text-anchor="middle" fill="rgba(255,255,255,0.88)" font-size="${brand.size}" font-weight="700" font-family="${FONT}">${BRAND}</text>`;
  }

  let badge = '';
  if (v.age) {
    const b = await fit(v.age, { targetH: 40, maxW: 420, weight: 800 });
    const bw = b.w + 60, bh = 92, bx = SIZE - 44 - bw;
    badge = `
  <rect x="${bx}" y="42" width="${bw}" height="${bh}" rx="46" fill="#FFFFFF"/>
  <text x="${bx + bw / 2}" y="${42 + bh / 2 + b.h / 2}" text-anchor="middle" fill="#111111" font-size="${b.size}" font-weight="800" font-family="${FONT}">${v.age}</text>`;
  }

  const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${c1}"/><stop offset="60%" stop-color="${c2}"/><stop offset="100%" stop-color="${c1}"/>
  </linearGradient></defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <circle cx="180" cy="210" r="190" fill="${ac}" opacity="0.07"/>
  <circle cx="1020" cy="990" r="150" fill="${ac}" opacity="0.06"/>
  <rect x="0" y="0" width="${SIZE}" height="12" fill="${ac}"/>
  ${nameSvg}
  <text x="600" y="${regY}" text-anchor="middle" fill="${ac}" font-size="${reg.size}" font-weight="700" font-family="${FONT}">${v.ogRegion}</text>${body}${badge}
  <rect x="0" y="${SIZE - 12}" width="${SIZE}" height="12" fill="${ac}"/>
</svg>`;

  const buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  const meta = await sharp(buf).metadata();
  if (meta.width !== SIZE || meta.height !== SIZE) throw new Error('크기 불일치 ' + v.slug);

  for (const dir of [path.join(ROOT, 'og'), path.join(ROOT, 'public', 'og')]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${v.slug}-og.png`), buf);
  }

  report.push({
    slug: v.slug, kw: v.kw, group: v.group,
    file: `${v.slug}-og.png`, size: `${meta.width}x${meta.height}`, kb: Math.round(buf.length / 1024),
    bg: c1, kwH: nameH, kwW: Math.max(...fits.map(f => f.w)),
    nick: isA ? v.staff.nick : '-', phone: isA ? v.staff.phone : '-',
    phoneH: isA ? tel.h : '-', phoneW: isA ? tel.w : '-',
    clipped: isA ? (tel.w > 1040 ? 'YES' : 'no') : '-',
    bandContrast: isA ? ratio('#000000', '#FFFFFF').toFixed(1) + ':1' : '-',
    bgTextContrast: Math.min(ratio(c1, '#FFFFFF'), ratio(c2, '#FFFFFF')).toFixed(2) + ':1',
    badge: v.age || '-'
  });
}

(async () => {
  for (const v of REGIONS) await build(v);
  const bgs = new Set(report.map(r => r.bg));
  const oldBgs = new Set(VENUES.map(v => v.ogBg[0]));
  const overlap = [...bgs].filter(b => oldBgs.has(b));
  console.log('\nfile                         size      grp 닉네임 전화번호       번호높이 폭   잘림 띠대비  배경대비 배지');
  console.log('─'.repeat(126));
  for (const r of report) console.log(
    `${r.file.padEnd(29)}${r.size} ${String(r.kb).padStart(3)}KB ${r.group}  ${String(r.nick).padEnd(6)} ${String(r.phone).padEnd(14)} ${String(r.phoneH).padStart(4)}px ${String(r.phoneW).padStart(4)} ${String(r.clipped).padEnd(4)} ${String(r.bandContrast).padEnd(7)} ${r.bgTextContrast} ${r.badge}`);
  console.log('─'.repeat(126));
  console.log(`배경색 고유 ${bgs.size}/13 · 1차 13색과 겹침 ${overlap.length}건 · 최대 파일 ${Math.max(...report.map(r => r.kb))}KB · 키워드 글자높이 ${report.map(r => r.kwH).join(',')}`);
  // B그룹 이미지에 전화번호·besta12 문자열이 들어갈 여지 검사
  const bBad = report.filter(r => r.group === 'B' && (r.phone !== '-' || r.nick !== '-'));
  console.log(`B그룹 9장 전화번호·besta12 삽입 ${bBad.length}건`);
  fs.writeFileSync(path.join(__dirname, 'og-region-report.json'), JSON.stringify(report, null, 1));
})().catch(e => { console.error('FAIL', e); process.exit(1); });
