#!/usr/bin/env node
/* 밤 시간표 연구소 — OG 썸네일 1200×1200 (1:1) 생성
   폰트: tools/fonts/NotoSansKR-Bold.otf (Google 공식 noto-cjk 배포본)
   글자는 opentype.js 로 path 변환 → sharp 렌더. 시스템 폰트 의존 0 (한글 깨짐 방지).
   출력: og/time-{슬러그}.png  (기존 og/*.png 자산과 충돌하지 않도록 time- 접두사) */

const fs = require('fs');
const path = require('path');
const ot = require('opentype.js');
const sharp = require('sharp');
const { VENUES, HOME, HUB, ADVERTISERS } = require('./time-data.js');

const ROOT = path.resolve(__dirname, '..');
const FONT_PATH = path.join(ROOT, 'tools', 'fonts', 'NotoSansKR-Bold.otf');
if (!fs.existsSync(FONT_PATH)) { console.error('❌ 폰트 없음:', FONT_PATH); process.exit(1); }
const font = ot.parse(fs.readFileSync(FONT_PATH).buffer);

const SIZE = 1200, NAVY = '#0A1424', BLUE = '#38BDF8', WHITE = '#FFFFFF';
const adv = (t, s) => font.getAdvanceWidth(t, s);
/* 목표 폭·최대 크기에 맞춰 글자 크기 자동 결정 */
function fit(t, maxW, maxSize) {
  let s = maxSize;
  while (s > 8 && adv(t, s) > maxW) s -= 1;
  return s;
}
/* 중앙 정렬 path */
function center(t, size, y, fill) {
  const w = adv(t, size);
  const p = font.getPath(t, (SIZE - w) / 2, y, size);
  p.fill = fill;
  return { d: p.toPathData(2), fill, w, size };
}
/* 업소명 2줄 분할: 최대 폭을 넘으면 어절/글자 단위로 나눈다 */
function nameLines(name, maxW, size) {
  if (adv(name, size) <= maxW) return [name];
  const cut = Math.ceil([...name].length / 2);
  const a = [...name].slice(0, cut).join('');
  const b = [...name].slice(cut).join('');
  return [a, b];
}

const report = [];

async function build({ slug, name, bigLines }) {
  const parts = [];
  /* 상단 업소명 */
  let nameSize = fit(name, 1000, 92);
  let lines = nameLines(name, 1000, nameSize);
  if (lines.length === 2) nameSize = Math.min(nameSize, fit(lines[0], 1000, 92), fit(lines[1], 1000, 92));
  let y = lines.length === 2 ? 190 : 235;
  for (const L of lines) { parts.push(center(L, nameSize, y, WHITE)); y += nameSize * 1.22; }

  /* 중앙 대형 문구 */
  const blocks = bigLines;
  let by = lines.length === 2 ? 520 : 545;
  for (const b of blocks) {
    const s = fit(b.t, b.maxW, b.max);
    parts.push(center(b.t, s, by + s, b.fill || WHITE));
    by += s + (b.gap || 46);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${NAVY}"/>
  <rect x="0" y="0" width="${SIZE}" height="16" fill="${BLUE}"/>
  <rect x="0" y="${SIZE - 16}" width="${SIZE}" height="16" fill="${BLUE}"/>
  <rect x="100" y="330" width="1000" height="4" fill="${BLUE}"/>
${parts.map(p => `  <path d="${p.d}" fill="${p.fill}"/>`).join('\n')}
</svg>`;

  const buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  const meta = await sharp(buf).metadata();
  if (meta.width !== SIZE || meta.height !== SIZE) throw new Error('크기 불일치 ' + slug);
  for (const dir of [path.join(ROOT, 'og'), path.join(ROOT, 'public', 'og')]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `time-${slug}.png`), buf);
  }
  report.push({ slug, file: `time-${slug}.png`, size: `${meta.width}x${meta.height}`, kb: Math.round(buf.length / 1024), name, big: bigLines.map(b => b.t).join(' / ') });
}

/* 페이지별 문구 정답표 */
function bigFor(slug) {
  const ad = ADVERTISERS[slug === 'home' ? '__home__' : slug];
  if (ad) {
    const nick = ad.label.split(' ').pop();
    return [
      { t: nick, maxW: 900, max: 150, gap: 40 },
      { t: ad.phone, maxW: 1080, max: 190, gap: 30, fill: BLUE }
    ];
  }
  return [
    { t: '광고문의', maxW: 1060, max: 250, gap: 44 },
    { t: '카카오톡 besta12', maxW: 1000, max: 110, gap: 24, fill: BLUE }
  ];
}

(async () => {
  await build({ slug: HOME.slug, name: HOME.name, bigLines: bigFor('home') });
  await build({ slug: HUB.slug, name: '전국 나이트 시간표 40', bigLines: bigFor('time-hub') });
  for (const v of VENUES) await build({ slug: v.slug, name: v.name, bigLines: bigFor(v.slug) });

  console.log('\n파일'.padEnd(34) + '크기        용량   상단 업소명 / 중앙 문구');
  console.log('─'.repeat(104));
  for (const r of report) console.log(r.file.padEnd(34) + r.size + '  ' + String(r.kb).padStart(4) + 'KB  ' + r.name + ' / ' + r.big);
  console.log('─'.repeat(104));
  console.log(`총 ${report.length}장 · 전부 ${[...new Set(report.map(r => r.size))].join(',')}`);
  fs.writeFileSync(path.join(__dirname, 'time-og-report.json'), JSON.stringify(report, null, 1));
})().catch(e => { console.error('FAIL', e); process.exit(1); });
