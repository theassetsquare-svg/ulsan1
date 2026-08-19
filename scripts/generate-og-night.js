#!/usr/bin/env node
/* /night/ 13개 페이지 OG 썸네일 — 1200x1200 (1:1)
   A그룹 4장: 업소명 대형 + 지역 + 하단 검은 띠(닉네임 / 전화번호)
   B그룹 9장: 업소명 대형 + 지역 + 사이트 브랜드 (전화번호·besta12 없음)
   실행: node scripts/generate-og-night.js */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { VENUES } = require('./night-data.js');

/* ── 한글 폰트 등록 (fontconfig) ── */
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
const BRAND = 'ulsanf.pages.dev';

/* ── 실측: 텍스트 잉크 박스 ── */
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
  cache.set(key, r);
  return r;
}
/* 목표 글자높이 + 최대 폭에 맞춰 폰트 크기 자동 결정 */
async function fit(text, { targetH, maxW, weight = 900, maxSize = 400 }) {
  const base = 100;
  const m = await measure(text, base, weight);
  let size = Math.min(targetH / m.h * base, maxW / m.w * base, maxSize);
  size = Math.floor(size);
  let real = await measure(text, size, weight);
  while (real.w > maxW && size > 10) { size -= 2; real = await measure(text, size, weight); }
  return { size, w: real.w, h: real.h };
}

/* ── 대비 계산 ── */
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/* ── 업소명 2줄 분할 ── */
const SPLIT = {
  'bulgwang-hobak-night': ['불광동', '호박나이트'],
  'changwon-lululala-night': ['창원', '룰루랄라나이트'],
  'ulsan-champion-night': ['울산', '챔피언나이트'],
  'cheongdam-night': ['청담나이트'],
  'daejeon-one-night': ['대전', '원나이트'],
  'sillim-grandprix-night': ['신림', '그랑프리나이트'],
  'sangbong-hangukgwan-night': ['상봉동', '한국관나이트'],
  'suyu-shampoo-night': ['수유', '샴푸나이트'],
  'busan-asiad-night': ['부산', '아시아드나이트'],
  'suwon-chance-dome-night': ['수원', '찬스돔나이트'],
  'ansan-hit-night': ['안산', '히트나이트'],
  'daejeon-seven-night': ['대전', '세븐나이트'],
  'ilsan-shampoo-night': ['일산', '샴푸나이트'],
  /* /night/ 허브 — 업소가 아니므로 B그룹(브랜드 표기) 규칙 그대로 */
  'night-hub': ['나이트', '안내 목록'],
  /* 홈(/) 독립 성공스토리 페이지 — 같은 B그룹 규칙 */
  'home-success': ['성공스토리', '1,340일의 기록']
};

/* /night/ 목록 페이지용 썸네일 — 페이지 헤더 색과 동일 */
const HUB_OG = {
  slug: 'night-hub', name: '나이트 안내 목록', group: 'B',
  ogBg: ['#15171C', '#374151'], ogAccent: '#9CA3AF',
  ogRegion: '전국 13곳 방문 정보', age: null
};

/* 홈(/) 성공스토리 단독 페이지용 썸네일 — 페이지 색(종이/먹) 대비 규칙 유지 */
const HOME_OG = {
  slug: 'home-success', name: '성공스토리', group: 'B',
  ogBg: ['#12100E', '#3D3630'], ogAccent: '#C9A96E',
  ogRegion: '바닥에서 다시 선 사람의 기록', age: null
};

const report = [];

async function build(v) {
  const [c1, c2] = v.ogBg, ac = v.ogAccent;
  const lines = SPLIT[v.slug];
  const isA = v.group === 'A';
  const MAXW = 1000;                       // 좌우 여백 100px씩

  /* 업소명 — 이 이미지에서 가장 큰 글자 */
  const nameTargetH = isA ? (lines.length === 1 ? 175 : 150) : (lines.length === 1 ? 185 : 160);
  const fits = [];
  for (const L of lines) fits.push({ t: L, ...(await fit(L, { targetH: nameTargetH, maxW: MAXW })) });
  const nameH = Math.max(...fits.map(f => f.h));

  /* 지역 */
  const reg = await fit(v.ogRegion, { targetH: 52, maxW: MAXW, weight: 700 });

  let body = '', tel = null, nick = null, brand = null;

  if (isA) {
    nick = await fit(v.staff.nick, { targetH: 70, maxW: 900, weight: 900 });
    tel = await fit(v.staff.phone, { targetH: 112, maxW: 1060, weight: 900 });
  } else {
    brand = await fit(BRAND, { targetH: 46, maxW: 900, weight: 700 });
  }

  /* 세로 배치 */
  const nameBlockTop = lines.length === 1 ? 300 : 210;
  const gap = 46;
  let y = nameBlockTop;
  const nameSvg = fits.map(f => {
    y += f.h;
    const t = `<text x="600" y="${y}" text-anchor="middle" fill="#FFFFFF" font-size="${f.size}" font-weight="900" font-family="${FONT}">${f.t}</text>`;
    y += gap;
    return t;
  }).join('\n  ');

  const regY = 690;                         // 55~60% 구간
  const bandY = 720;                        // 60% 지점부터 하단 띠

  if (isA) {
    body = `
  <rect x="0" y="${bandY}" width="${SIZE}" height="${SIZE - bandY}" fill="#000000"/>
  <rect x="0" y="${bandY}" width="${SIZE}" height="6" fill="${ac}"/>
  <text x="600" y="${bandY + 40 + nick.h}" text-anchor="middle" fill="#FFFFFF" font-size="${nick.size}" font-weight="900" font-family="${FONT}">${v.staff.nick}</text>
  <text x="600" y="${bandY + 40 + nick.h + 60 + tel.h}" text-anchor="middle" fill="#FFFFFF" font-size="${tel.size}" font-weight="900" font-family="${FONT}">${v.staff.phone}</text>`;
  } else {
    body = `
  <rect x="230" y="900" width="740" height="4" rx="2" fill="${ac}" opacity="0.55"/>
  <text x="600" y="${1010 + brand.h}" text-anchor="middle" fill="rgba(255,255,255,0.86)" font-size="${brand.size}" font-weight="700" font-family="${FONT}">${BRAND}</text>`;
  }

  /* 연령 배지 (창원·대전원) */
  let badge = '';
  if (v.age) {
    const b = await fit(v.age, { targetH: 40, maxW: 420, weight: 800 });
    const bw = b.w + 60, bh = 92;
    const bx = SIZE - 44 - bw;
    badge = `
  <rect x="${bx}" y="42" width="${bw}" height="${bh}" rx="46" fill="#FFFFFF"/>
  <text x="${bx + bw / 2}" y="${42 + bh / 2 + b.h / 2}" text-anchor="middle" fill="#111111" font-size="${b.size}" font-weight="800" font-family="${FONT}">${v.age}</text>`;
  }

  const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${c1}"/><stop offset="60%" stop-color="${c2}"/><stop offset="100%" stop-color="${c1}"/>
  </linearGradient></defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <circle cx="1010" cy="200" r="200" fill="${ac}" opacity="0.07"/>
  <circle cx="170" cy="980" r="150" fill="${ac}" opacity="0.06"/>
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
    slug: v.slug, name: v.name, group: v.group,
    file: `${v.slug}-og.png`, size: `${meta.width}x${meta.height}`, kb: Math.round(buf.length / 1024),
    bg: c1, nameH, nameW: Math.max(...fits.map(f => f.w)),
    nick: isA ? v.staff.nick : '-', phone: isA ? v.staff.phone : '-',
    phoneH: isA ? tel.h : '-', phoneW: isA ? tel.w : '-',
    clipped: isA ? (tel.w > MAXW + 60 ? 'YES' : 'no') : '-',
    bandContrast: isA ? ratio('#000000', '#FFFFFF').toFixed(1) + ':1' : '-',
    textContrast: Math.min(ratio(c1, '#FFFFFF'), ratio(c2, '#FFFFFF')).toFixed(2) + ':1',
    badge: v.age || '-'
  });
}

(async () => {
  for (const v of VENUES) await build(v);
  await build(HUB_OG);
  await build(HOME_OG);
  const bgs = new Set(report.map(r => r.bg));
  console.log('\nfile                          size      grp nick   phone          글자높이 폭   잘림 띠대비  배경대비 배지');
  console.log('─'.repeat(128));
  for (const r of report) console.log(
    `${r.file.padEnd(30)}${r.size} ${r.kb.toString().padStart(3)}KB ${r.group}  ${String(r.nick).padEnd(6)} ${String(r.phone).padEnd(14)} ${String(r.phoneH).padStart(4)}px ${String(r.phoneW).padStart(4)} ${String(r.clipped).padEnd(4)} ${String(r.bandContrast).padEnd(7)} ${r.textContrast} ${r.badge}`);
  console.log('─'.repeat(128));
  console.log(`배경색 고유 ${bgs.size}/13 · 최대 파일 ${Math.max(...report.map(r => r.kb))}KB · 업소명 글자높이 ${report.map(r => r.nameH).join(',')}`);
  fs.writeFileSync(path.join(__dirname, 'og-report.json'), JSON.stringify(report, null, 1));
})().catch(e => { console.error('FAIL', e); process.exit(1); });
