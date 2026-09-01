#!/usr/bin/env node
/* 밤 시간표 연구소 — 배포 게이트 G1~G11
   실행: node scripts/time-gate.js   (하나라도 FAIL이면 exit 1 = 배포 금지) */

const fs = require('fs');
const path = require('path');
const { VENUES, HOME, HUB, TODAY, ADVERTISERS, KAKAO_ID } = require('./time-data.js');

const ROOT = path.resolve(__dirname, '..');
/* 홈(/)은 업소 시간표 페이지가 아니라 독립 성공스토리 단독 페이지로 분리됐다.
   업소 페이지 기준(업소명·전화바·FAQ·글자수)으로 재면 전부 오탐이므로 대상에서 뺀다. */
const PAGES = [
  { key: 'HUB /time/', file: path.join(ROOT, 'time', 'index.html'), v: HUB, kind: 'hub' },
  ...VENUES.map(v => ({ key: `/time/${v.slug}/`, file: path.join(ROOT, 'time', v.slug, 'index.html'), v, kind: 'venue' }))
];

const fails = [];
const notes = [];
const fail = (g, msg) => fails.push(`${g} ${msg}`);

for (const p of PAGES) {
  if (!fs.existsSync(p.file)) { fail('G0', `${p.key} 파일 없음`); continue; }
  p.html = fs.readFileSync(p.file, 'utf8');
  const m = p.html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  const main = m ? m[1] : '';
  const noNav = main.replace(/<nav class="near">[\s\S]*?<\/nav>/g, '');
  p.body = noNav.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  p.prose = noNav.replace(/<div class="tablewrap">[\s\S]*?<\/div>/g, '').replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  p.title = (p.html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1];
  p.h1 = (p.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1].replace(/<[^>]+>/g, '');
  p.ogTitle = (p.html.match(/property="og:title" content="([^"]*)"/) || [, ''])[1];
  p.descMeta = (p.html.match(/name="description" content="([^"]*)"/) || [, ''])[1];
  p.h2s = [...p.html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(x => x[1].replace(/<[^>]+>/g, ''));
}

/* ── G1 금지어 ── */
const BANNED = ['룸살롱', '룸싸롱', '노래방', '밤문화', '유흥', '2차'];
let g1 = 0;
for (const p of PAGES) for (const w of BANNED) {
  const n = (p.html.match(new RegExp(w, 'g')) || []).length;
  if (n) { fail('G1', `${p.key} 금지어 "${w}" ${n}회`); g1 += n; }
}

/* ── G2 별점·평점 ── */
const RATING = ['aggregateRating', 'ratingValue', '★', '별점', '평점', 'reviewCount'];
let g2 = 0;
for (const p of PAGES) for (const w of RATING) {
  const n = (p.html.match(new RegExp(w, 'g')) || []).length;
  if (n) { fail('G2', `${p.key} 평점 요소 "${w}" ${n}회`); g2 += n; }
}

/* ── G3 창작수치 0
   본문(서술+FAQ)에 등장하는 모든 숫자는 확인된 사실(주소·역·층·연령)에 실제로 있는 값이어야 한다.
   광고주 전화번호만 예외. 그 외 숫자가 하나라도 있으면 창작수치로 보고 FAIL. */
const PHONES = Object.values(ADVERTISERS).map(a => a.phone);
const stripPhones = (t) => PHONES.reduce((acc, ph) => acc.split(ph).join(''), t);
for (const p of PAGES) {
  if (p.kind !== 'venue') continue;
  const allowed = new Set(String([p.v.addr, p.v.station, p.v.floor, p.v.age].filter(Boolean).join(' ')).match(/\d+/g) || []);
  const nums = stripPhones(p.prose).match(/\d+/g) || [];
  const bad = [...new Set(nums.filter(n => !allowed.has(n)))];
  if (bad.length) fail('G3', `${p.key} 미확인 숫자: ${bad.join(', ')}`);
}

/* ── G4 title 중복 0 · 20~30자 · title=og:title=h1 ── */
const seen = new Map();
for (const p of PAGES) {
  const L = [...p.title].length;
  if (L < 20 || L > 30) fail('G4', `${p.key} title ${L}자 (20~30 아님): ${p.title}`);
  if (seen.has(p.title)) fail('G4', `${p.key} title 중복 (${seen.get(p.title)})`);
  seen.set(p.title, p.key);
  if (p.kind === 'venue' && p.title !== p.h1) fail('G4', `${p.key} title≠h1`);
  if (p.title !== p.ogTitle) fail('G4', `${p.key} title≠og:title`);
}
/* description 70~80자 · 중복 0 */
const dseen = new Map();
for (const p of PAGES) {
  const L = [...p.descMeta].length;
  if (p.kind === 'venue' && (L < 70 || L > 80)) fail('G4d', `${p.key} description ${L}자 (70~80 아님)`);
  if (dseen.has(p.descMeta)) fail('G4d', `${p.key} description 중복`);
  dseen.set(p.descMeta, p.key);
}

/* ── G5 페이지 쌍 20자 이상 동일 문장 3개 이상 ── */
const sentsOf = (t) => t.split(/(?<=[.?!])\s+|\n+/).map(s => s.trim()).filter(s => [...s].length >= 20);
for (const p of PAGES) p.sents = new Set(sentsOf(p.body));
for (let i = 0; i < PAGES.length; i++) for (let j = i + 1; j < PAGES.length; j++) {
  const dup = [...PAGES[i].sents].filter(s => PAGES[j].sents.has(s));
  if (dup.length >= 3) fail('G5', `${PAGES[i].key} ↔ ${PAGES[j].key} 동일 문장 ${dup.length}개: ${dup[0].slice(0, 30)}…`);
  else if (dup.length > 0) notes.push(`G5 참고 ${PAGES[i].key} ↔ ${PAGES[j].key} 동일 문장 ${dup.length}개`);
}

/* ── G6 본문 1,800자 이상 ── */
for (const p of PAGES) {
  if (p.kind !== 'venue') continue;
  const L = [...p.body].length;                       // 공백 포함
  const L2 = [...p.body.replace(/\s/g, '')].length;    // 공백 제외
  p.bodyLen = L; p.bodyLen2 = L2;
  if (L < 1800) fail('G6', `${p.key} 본문 ${L}자 (1,800 미만)`);
  if (L > 2500) fail('G6', `${p.key} 본문 ${L}자 (2,500 초과)`);
}

/* ── G7 내부 링크 404 ── */
for (const p of PAGES) {
  const hrefs = [...p.html.matchAll(/<a [^>]*href="([^"]+)"/g)].map(x => x[1]);
  for (const h of hrefs) {
    if (/^(tel:|https?:|mailto:|#)/.test(h)) continue;
    const rel = h.replace(/^\//, '').replace(/[?#].*$/, '');
    const cands = [path.join(ROOT, rel), path.join(ROOT, rel, 'index.html')];
    if (!cands.some(c => fs.existsSync(c))) fail('G7', `${p.key} 깨진 링크 ${h}`);
  }
  /* 외부 링크 허용 목록 */
  const ext = [...p.html.matchAll(/<a [^>]*href="(https?:\/\/[^"]+)"/g)].map(x => x[1]);
  for (const e of ext) if (!e.startsWith('https://open.kakao.com/o/sBesta12')) fail('G7e', `${p.key} 허용되지 않은 외부 링크 ${e}`);
}

/* ── G8 필수요소 ── */
const MUST = [
  ['google-site-verification" content="HJjm7MRxykCQ7d_9L7glaTeeaWrmJIzAKY0BcNcfm88"', 'google 인증'],
  ['<link rel="canonical"', 'canonical'],
  ['property="og:image:width" content="1200"', 'og:image:width'],
  ['property="og:image:height" content="1200"', 'og:image:height'],
  ['property="og:image:type" content="image/png"', 'og:image:type'],
  ['property="og:image:alt"', 'og:image:alt'],
  ['name="twitter:card" content="summary"', 'twitter:card'],
  ['name="twitter:image"', 'twitter:image'],
  ['name="thumbnail"', 'thumbnail'],
  ['name="viewport"', 'viewport'],
  ['class="callbar"', '고정 전화바'],
  [`광고문의 카톡: ${KAKAO_ID}`, '푸터 광고문의 박스'],
  ['공개된 웹 정보를 정리했으며 실제와 다를 수 있습니다', '푸터 고지문'],
  [TODAY, '오늘 날짜'],
  ['application/ld+json', 'JSON-LD']
];
for (const p of PAGES) for (const [needle, label] of MUST) {
  if (!p.html.includes(needle)) fail('G8', `${p.key} 필수요소 누락: ${label}`);
}
/* 숨김 텍스트 금지 */
for (const p of PAGES) if (/display:\s*none|visibility:\s*hidden|font-size:\s*0|text-indent:\s*-/.test(p.html)) fail('G8h', `${p.key} 숨김 텍스트 의심`);
/* FAQPage 3문항 */
for (const p of PAGES) {
  if (p.kind !== 'venue') continue;
  const faq = (p.html.match(/"@type":"Question"/g) || []).length;
  if (faq !== 3) fail('G8f', `${p.key} FAQ ${faq}문항 (3 아님)`);
}

/* ── G9 썸네일 1200×1200 실측 ── */
function pngSize(f) {
  const b = fs.readFileSync(f);
  if (b.slice(1, 4).toString() !== 'PNG') return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
for (const p of PAGES) {
  const slug = p.v.slug;
  const f = path.join(ROOT, 'og', `time-${slug}.png`);
  if (!fs.existsSync(f)) { fail('G9', `${p.key} 썸네일 없음 og/${slug}.png`); continue; }
  const s = pngSize(f);
  p.ogSize = s ? `${s.w}x${s.h}` : 'PNG 아님';
  if (!s || s.w !== 1200 || s.h !== 1200) fail('G9', `${p.key} 썸네일 ${p.ogSize}`);
}

/* ── G10 전화번호 위치 ── */
const RULE = {
  '010-5653-0069': ['HOME /', '/place/ulsan-champion-night/'],
  '010-7528-4936': ['/place/changwon-lululala-night/'],
  '010-2221-1937': ['/place/bulgwang-hobak-night/']
};
for (const p of PAGES) {
  const found = [...new Set(p.html.match(/01[016789]-?\d{3,4}-?\d{4}/g) || [])];
  for (const f of found) {
    const norm = f.length === 11 ? `${f.slice(0, 3)}-${f.slice(3, 7)}-${f.slice(7)}` : f;
    const allowed = RULE[norm];
    if (!allowed) { fail('G10', `${p.key} 허용되지 않은 번호 ${f}`); continue; }
    if (!allowed.includes(p.key)) fail('G10', `${p.key} 에 ${norm} 존재 (허용: ${allowed.join(', ')})`);
  }
  for (const [num, keys] of Object.entries(RULE)) {
    if (keys.includes(p.key) && !p.html.includes(num)) fail('G10', `${p.key} 에 ${num} 누락`);
  }
}

/* ── G11 키워드 배치 ── */
for (const p of PAGES) {
  if (p.kind !== 'venue') continue;
  const n = p.v.name;
  if (![...p.title].join('').startsWith(n)) fail('G11', `${p.key} title 맨 앞에 업소명 없음`);
  const firstPara = (p.html.match(/<div class="lead">\s*<p>([\s\S]*?)<\/p>/) || [, ''])[1].replace(/<[^>]+>/g, '');
  const firstSent = firstPara.split(/(?<=[.?!])\s+/)[0] || '';
  if (!firstSent.includes(n)) fail('G11', `${p.key} 첫 문단 첫 문장에 업소명 없음`);
  if (!p.h2s.some(h => h.includes(n))) fail('G11', `${p.key} H2 중 업소명 포함 없음`);
  const cnt = (p.body.match(new RegExp(n, 'g')) || []).length;
  p.kwCount = cnt;
  if (cnt < 3 || cnt > 5) fail('G11', `${p.key} 본문 업소명 ${cnt}회 (3~5 아님)`);
  const dc = (p.descMeta.match(new RegExp(n, 'g')) || []).length;
  if (dc !== 1) fail('G11', `${p.key} description 업소명 ${dc}회 (1 아님)`);
  const alt = (p.html.match(/property="og:image:alt" content="([^"]*)"/) || [, ''])[1];
  if (!alt.includes(n)) fail('G11', `${p.key} og:image:alt 에 업소명 없음`);
  const ld = (p.html.match(/"name":"([^"]*)"/) || [, ''])[1];
  if (!p.html.includes(`"name":"${n}"`)) fail('G11', `${p.key} JSON-LD name 에 업소명 없음 (${ld})`);
  /* 보조 키워드 지역+나이트 1~2회 */
  if (p.v.kw2) {
    const k2 = (p.body.match(new RegExp(p.v.kw2, 'g')) || []).length;
    p.kw2Count = k2;
    if (k2 < 1 || k2 > 2) fail('G11b', `${p.key} 보조 키워드 ${p.v.kw2} ${k2}회 (1~2 아님)`);
  }
}

/* ── 결과 ── */
const rows = PAGES.map(p => [p.key, (p.bodyLen ? p.bodyLen + '/' + p.bodyLen2 : '-'), [...(p.title || '')].length, p.kwCount || '-', p.kw2Count || '-', p.ogSize || '-']);
console.log('\n페이지'.padEnd(30) + ' 본문(포함/제외) title 업소명 보조 썸네일');
console.log('─'.repeat(74));
for (const r of rows) console.log(String(r[0]).padEnd(30) + String(r[1]).padStart(12) + String(r[2]).padStart(8) + String(r[3]).padStart(7) + String(r[4]).padStart(6) + '  ' + r[5]);
console.log('─'.repeat(74));

if (notes.length) { console.log(`\n참고 ${notes.length}건 (실패 아님)`); notes.slice(0, 5).forEach(n => console.log('  ' + n)); }

if (fails.length) {
  console.log(`\n❌ FAIL ${fails.length}건 — 배포 금지`);
  fails.slice(0, 80).forEach(f => console.log('  ' + f));
  if (fails.length > 80) console.log(`  … 외 ${fails.length - 80}건`);
  process.exit(1);
}
console.log('\n✅ G1~G11 전부 통과');
fs.writeFileSync(path.join(__dirname, 'time-gate-report.json'), JSON.stringify({ TODAY, pages: rows.length, rows }, null, 1));
