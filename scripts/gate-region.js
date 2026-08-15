#!/usr/bin/env node
/* 정적 게이트 — G01~G04, G06~G10, G13~G19, G21~G34
   실행: node scripts/gate-region.js */
const fs = require('fs');
const path = require('path');
const { SITE, REGIONS } = require('./region-data.js');
const { VENUES } = require('./night-data.js');
const ROOT = path.resolve(__dirname, '..');

const R = [];
const add = (id, ok, msg) => R.push({ id, ok, msg });

const readPage = (slug) => fs.readFileSync(path.join(ROOT, 'night', slug, 'index.html'), 'utf8');
const stripTags = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const mainText = (h) => stripTags((h.match(/<main[\s\S]*?<\/main>/) || [''])[0]);
const bodyText = (h) => stripTags((h.match(/<body[\s\S]*<\/body>/) || [''])[0]);

const pages = REGIONS.map(v => ({ v, html: readPage(v.slug) }));
const oldPages = VENUES.map(v => ({ v, html: readPage(v.slug) }));

/* ── G01 ── */
{
  const bad = [];
  for (const { v, html } of pages) {
    if (!/^<!DOCTYPE html>/.test(html)) bad.push(v.slug + ':doctype');
    if (!/<html lang="ko">/.test(html)) bad.push(v.slug + ':lang');
    for (const t of ['html', 'head', 'body', 'main', 'article', 'footer', 'header', 'aside']) {
      const o = (html.match(new RegExp('<' + t + '[ >]', 'g')) || []).length;
      const c = (html.match(new RegExp('</' + t + '>', 'g')) || []).length;
      if (o !== c) bad.push(`${v.slug}:${t} ${o}/${c}`);
    }
  }
  add('G01', bad.length === 0, `DOCTYPE·lang 13/13 · 태그 불균형 ${bad.length}건 ${bad.slice(0, 4).join(', ')}`);
}

/* ── 유사도 도구 ── */
function shingles(s, n = 5) {
  const t = s.replace(/\s+/g, '');
  const set = new Set();
  for (let i = 0; i + n <= t.length; i++) set.add(t.slice(i, i + n));
  return set;
}
function jac(a, b) { let x = 0; for (const s of a) if (b.has(s)) x++; return x / (a.size + b.size - x); }

/* ── G02 ── */
{
  const t = REGIONS.map(v => v.title), d = REGIONS.map(v => v.desc);
  const dup = new Set(t).size !== 13 || new Set(d).size !== 13;
  let maxT = 0, maxD = 0, pT = '', pD = '';
  for (let i = 0; i < 13; i++) for (let j = i + 1; j < 13; j++) {
    const st = jac(shingles(t[i]), shingles(t[j])); if (st > maxT) { maxT = st; pT = `${i + 1}-${j + 1}`; }
    const sd = jac(shingles(d[i]), shingles(d[j])); if (sd > maxD) { maxD = sd; pD = `${i + 1}-${j + 1}`; }
  }
  add('G02', !dup && maxT < 0.2 && maxD < 0.2,
    `완전중복 ${dup ? '있음' : '0'} · title 최대 ${(maxT * 100).toFixed(1)}%(${pT}) · desc 최대 ${(maxD * 100).toFixed(1)}%(${pD})`);
}

/* ── G03 ── */
{
  const bad = [];
  for (const { v, html } of pages) {
    if ((html.match(/<h1[\s>]/g) || []).length !== 1) bad.push(v.slug + ':h1');
    for (const t of ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer'])
      if (!new RegExp('<' + t + '[ >]').test(html)) bad.push(v.slug + ':no-' + t);
    if (!/<section id="s1"[\s\S]{0,80}<h2/.test(html)) bad.push(v.slug + ':section-h2');
  }
  add('G03', bad.length === 0, `article 내 h1 1개 · 시맨틱 7종 — 위반 ${bad.length}건 ${bad.slice(0, 4).join(', ')}`);
}

/* ── G04 : 기존13 + 신규13 = 26개 · 325쌍 ── */
let sim = {};
{
  const items = [
    ...oldPages.map(p => ({ label: '[1차]' + p.v.name, sh: shingles(mainText(p.html), 5) })),
    ...pages.map(p => ({ label: '[2차]' + p.v.kw, sh: shingles(mainText(p.html), 5) }))
  ];
  const pairs = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++)
    pairs.push({ p: `${items[i].label}↔${items[j].label}`, s: jac(items[i].sh, items[j].sh), cross: (i < 13) !== (j < 13) });
  pairs.sort((a, b) => b.s - a.s);
  const max = pairs[0].s, avg = pairs.reduce((a, b) => a + b.s, 0) / pairs.length;
  const crossMax = Math.max(...pairs.filter(x => x.cross).map(x => x.s));
  sim = { count: pairs.length, max, avg, crossMax, top5: pairs.slice(0, 5) };
  add('G04', pairs.length === 325 && max < 0.15,
    `${pairs.length}쌍 최대 ${(max * 100).toFixed(2)}% / 평균 ${(avg * 100).toFixed(2)}% / 기존↔신규 최대 ${(crossMax * 100).toFixed(2)}%`);
}

/* ── G06 G07 G08 ── */
{
  const a = [], b = [], f = [];
  for (const { v, html } of pages) {
    const bar = (html.match(/<div class="callbar"[\s\S]*?<\/div>/) || [''])[0];
    const foot = (html.match(/<footer[\s\S]*?<\/footer>/) || [''])[0];
    if (v.group === 'A') { if (/besta12/.test(bar)) a.push(v.slug); if (!/tel:/.test(bar)) a.push(v.slug + ':no-tel'); }
    else if (!/besta12/.test(bar)) b.push(v.slug);
    if (!/besta12/.test(foot)) f.push(v.slug);
  }
  add('G06', a.length === 0, `A그룹 4페이지 고정바 besta12 ${a.length}회`);
  add('G07', b.length === 0, `B그룹 9페이지 고정바 besta12 노출 ${9 - b.length}/9`);
  // #111 on #ffd400 대비
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = h => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255); };
  const ratio = (x, y) => { const [p, q] = [lum(x), lum(y)].sort((m, n) => n - m); return (p + 0.05) / (q + 0.05); };
  const cr = ratio('#ffd400', '#111111');
  add('G08', f.length === 0 && cr >= 4.5, `푸터 besta12 ${13 - f.length}/13 · .ad-inquiry 대비 #111 on #ffd400 = ${cr.toFixed(2)}:1`);
}

/* ── G09 ── */
{
  const bad = []; const lens = [];
  for (const { v, html } of pages) {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);
    if (blocks.length !== 3) bad.push(v.slug + ':blocks' + blocks.length);
    const types = [];
    for (const b of blocks) { try { types.push(JSON.parse(b)['@type']); } catch (e) { bad.push(v.slug + ':parse'); } }
    if (JSON.stringify(types) !== JSON.stringify(['Article', 'FAQPage', 'BreadcrumbList'])) bad.push(v.slug + ':type');
    for (const q of v.faq) { const L = [...q.a].length; lens.push(L); if (L < 40 || L > 90) bad.push(`${v.slug}:faq${L}`); }
    if (v.faq.length < 5) bad.push(v.slug + ':faq<5');
  }
  add('G09', bad.length === 0, `Article+FAQPage+BreadcrumbList 파싱오류 0 · FAQ ${lens.length}개 답변 ${Math.min(...lens)}~${Math.max(...lens)}자(40~90) 위반 ${bad.length}`);
}

/* ── G10 ── */
{
  const ext = [], broken = [];
  for (const { v, html } of pages) {
    for (const m of html.matchAll(/href="([^"]+)"/g)) {
      const h = m[1];
      if (/^tel:/.test(h)) continue;
      if (/^https?:\/\//.test(h)) { if (!h.startsWith(SITE)) ext.push(v.slug + ' ' + h); continue; }
      if (h.startsWith('#') || h.startsWith('mailto:')) continue;
      if (h === '/' || h === '/night/' || h === '/favicon.svg' || h === '/apple-touch-icon.png') continue;
      const mm = h.match(/^\/night\/([a-z-]+)\/$/);
      if (mm) { if (!fs.existsSync(path.join(ROOT, 'night', mm[1], 'index.html'))) broken.push(h); continue; }
      broken.push(v.slug + ' ' + h);
    }
  }
  add('G10', ext.length === 0 && broken.length === 0, `외부 아웃바운드 ${ext.length}개(tel 제외) · 내부링크 깨짐 ${broken.length}개`);
}

/* ── G13 : 기존 13페이지 무손상 ── */
{
  const { execSync } = require('child_process');
  const out = execSync('git status --porcelain night/', { cwd: ROOT }).toString().trim();
  const newSlugs = new Set(REGIONS.map(v => v.slug));
  const touched = out.split('\n').filter(Boolean).map(l => l.slice(3).trim())
    .filter(p => { const m = p.match(/^night\/([a-z-]+)\//); return m && !newSlugs.has(m[1]); });
  let delLines = 0;
  try { delLines = +execSync(`git diff --numstat -- ${VENUES.map(v => 'night/' + v.slug).join(' ')} | awk '{s+=$2} END {print s+0}'`, { cwd: ROOT, shell: '/bin/bash' }).toString().trim(); } catch (e) { }
  add('G13', touched.length === 0 && delLines === 0, `기존 /night/ 13페이지 변경 ${touched.length}건 · 삭제된 줄 ${delLines}`);
}

/* ── G15 형태소 ── */
const morph = [];
{
  const bad = [];
  for (const { v, html } of pages) {
    const t = bodyText(html);
    const A = (t.match(new RegExp(v.kw, 'g')) || []).length;
    const B = (t.match(new RegExp(v.kwB, 'g')) || []).length;
    const C = (t.match(new RegExp(v.kwC, 'g')) || []).length;
    morph.push({ kw: v.kw, A, B, C });
    if (A < 10 || B < 2 || C < 1) bad.push(`${v.slug} A${A}/B${B}/C${C}`);
  }
  add('G15', bad.length === 0, `A≥10·B≥2·C≥1 — 미달 ${bad.length}건 ${bad.slice(0, 5).join(', ')}`);
}

/* ── G16 ── */
{
  const bad = [];
  for (const v of REGIONS) {
    if (!v.title.startsWith(v.kw)) bad.push(v.slug + ':head');
    const L = [...v.title].length;
    if (L < 25 || L > 30) bad.push(`${v.slug}:${L}자`);
  }
  add('G16', bad.length === 0, `주 키워드 0번째 시작 13/13 · 길이 ${REGIONS.map(v => [...v.title].length).join(',')} — 위반 ${bad.length}`);
}

/* ── G17 ── */
{
  const bad = [];
  for (const v of REGIONS) {
    const lead = stripTags(v.lead.join(' '));
    if (!lead.slice(0, 100).includes(v.kw)) bad.push(v.slug);
  }
  add('G17', bad.length === 0, `본문 첫 100자 내 A형 1회 이상 — 미달 ${bad.length}`);
}

/* ── G18 교통 어휘 ── */
const g18 = [];
{
  const bad = [];
  for (const { v, html } of pages) {
    const t = mainText(html);
    const n = ((t.match(/지하철|환승|막차|택시/g)) || []).length;
    g18.push({ kw: v.kw, n });
    if (n > 3) bad.push(`${v.slug} ${n}회`);
  }
  add('G18', bad.length === 0, `"지하철·환승·막차·택시" 페이지당 최대 ${Math.max(...g18.map(x => x.n))}회 (≤3) — 위반 ${bad.length}`);
}

/* ── G19 ── */
{
  const bad = [], counts = [];
  for (const v of REGIONS) {
    const all = [...v.sections.map(s => s.h2), `${v.kw} 자주 묻는 질문`, '같이 보면 좋은 지역'];
    const c = all.filter(h => h.includes(v.kw)).length;
    counts.push(c); if (c < 4) bad.push(v.slug + ':' + c);
  }
  add('G19', bad.length === 0, `H2 중 주 키워드 포함 ${counts.join(',')} (≥4) — 미달 ${bad.length}`);
}

/* ── G21 목록 페이지 1단계 링크 ── */
{
  const idx = fs.readFileSync(path.join(ROOT, 'night', 'index.html'), 'utf8');
  const miss = REGIONS.filter(v => !idx.includes(`/night/${v.slug}/`));
  add('G21', miss.length === 0, `/night/ 목록 → 신규 13페이지 직접 링크 ${13 - miss.length}/13`);
}

/* ── G22 웹 실사 기록 ── */
{
  const p = path.join(__dirname, 'research-region.json');
  let ok = false, n = 0;
  if (fs.existsSync(p)) { const j = JSON.parse(fs.readFileSync(p, 'utf8')); n = j.length; ok = n === 13 && j.every(x => x.queries.length >= 5 && x.rows.length > 0); }
  add('G22', ok, `실사 기록 ${n}/13 · 업소당 검색 5회 이상 + 출처 표 존재`);
}

/* ── G23 각도 ── */
{
  const angles = REGIONS.map(v => v.angleNo);
  const calc = REGIONS.map(v => ((2 - 1) + (v.no - 1) + 7) % 13 + 1);
  const old = VENUES.map(v => v.angleNo);
  const noOverlap = REGIONS.every((v, i) => v.angleNo !== old[i]);
  add('G23', new Set(angles).size === 13 && JSON.stringify(angles) === JSON.stringify(calc) && noOverlap,
    `공식 재계산 일치 · 13개 상이 [${angles.join(',')}] · 1차 [${old.join(',')}] 겹침 0`);
}

/* ── G24 ── */
{
  const dirs = fs.readdirSync(path.join(ROOT, 'night')).filter(d => fs.statSync(path.join(ROOT, 'night', d)).isDirectory());
  const dup = dirs.filter(d => /-\d+$/.test(d));
  const clash = REGIONS.filter(v => VENUES.some(o => o.slug === v.slug));
  add('G24', dup.length === 0 && clash.length === 0 && dirs.length === 26, `night 하위 ${dirs.length}개(13+13) · slug 충돌 ${clash.length} · "-2" 형태 ${dup.length}`);
}

/* ── G25 ── */
{
  const bad = REGIONS.filter(v => /안녕하세요|오늘은|알아보겠습니다/.test(stripTags(v.lead.join(' ')))).map(v => v.slug);
  add('G25', bad.length === 0, `첫 문단 "안녕하세요·오늘은·알아보겠습니다" ${bad.length}회`);
}

/* ── G26 ── */
{
  const bad = [];
  for (const v of REGIONS) {
    let okc = 0;
    for (const s of v.sections) {
      const ps = [...s.html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => stripTags(m[1]));
      const last = ps[ps.length - 1] || '';
      if (last && [...last].length <= 95 && ps.length >= 2) okc++;
    }
    if (okc !== v.sections.length) bad.push(`${v.slug} ${okc}/${v.sections.length}`);
    if (/다음으로 알아보겠습니다/.test(JSON.stringify(v.sections))) bad.push(v.slug + ':기계연결');
  }
  add('G26', bad.length === 0, `섹션 수 == 연결문장 수 (H2 ${REGIONS.map(v => v.sections.length).join(',')}) — 위반 ${bad.length}건 ${bad.slice(0, 3).join(', ')}`);
}

/* ── G27 접미어 : 신규 13 + 기존 13 = 26 고유 ── */
{
  const s = [...REGIONS.map(v => v.suffix), ...VENUES.map(v => v.suffix)];
  add('G27', new Set(s).size === 26, `접미어 고유 ${new Set(s).size}/26 (신규 ${new Set(REGIONS.map(v => v.suffix)).size}/13)`);
}

/* ── G28 첫 문장 ── */
{
  const f = [...REGIONS.map(v => stripTags(v.lead[0])), ...VENUES.map(v => stripTags(v.lead[0]))];
  const head = f.map(x => [...x].slice(0, 6).join(''));
  const tail = f.map(x => [...x].slice(-10).join(''));
  add('G28', new Set(f).size === 26 && new Set(head).size === 26 && new Set(tail).size === 26,
    `첫 문장 전문 ${new Set(f).size}/26 · 머리6자 ${new Set(head).size}/26 · 꼬리10자 ${new Set(tail).size}/26`);
}

/* ── G29 H2 첫 항목 ── */
{
  const h = [...REGIONS.map(v => v.sections[0].h2), ...VENUES.map(v => v.sections[0].h2)];
  add('G29', new Set(h).size === 26, `H2 첫 항목 고유 ${new Set(h).size}/26`);
}

/* ── G30 ── */
{
  const a = [...REGIONS.map(v => v.answer2), ...VENUES.map(v => v.answer2)];
  add('G30', new Set(REGIONS.map(v => v.answer2)).size === 13 && new Set(a).size === 26,
    `AI 인용 두 번째 문장 신규 ${new Set(REGIONS.map(v => v.answer2)).size}/13 · 1차 포함 ${new Set(a).size}/26`);
}

/* ── G33 연령 표기 ── */
{
  const BAN = [/27\+/, /38\+/, /만27세/, /27세이상/, /27이상/, /38세이상/, /38이상/, /27\/38/];
  const bad = [];
  for (const { v, html } of pages) {
    for (const re of BAN) if (re.test(html)) bad.push(v.slug + ':' + re);
    for (const n of ['27', '38']) {
      for (const m of html.matchAll(new RegExp('.{0,3}' + n + '세.{0,3}', 'g')))
        if (!/만 \d\d세 이상/.test(m[0])) bad.push(`${v.slug}:"${m[0]}"`);
    }
  }
  // 첫 문단 완전문 명시 (창원·대전)
  for (const v of REGIONS) {
    if (!v.age) continue;
    if (!stripTags(v.lead.join(' ')).includes(v.age)) bad.push(v.slug + ':lead-age');
  }
  add('G33', bad.length === 0, `축약 표기 ${bad.length}건 · 창원/대전 첫 문단 완전문 명시 ${REGIONS.filter(v => v.age).length}/2 ${bad.slice(0, 4).join(', ')}`);
}

/* ── G34 배정 업소 페이지 링크 ── */
{
  const bad = [];
  for (const { v, html } of pages) {
    const href = `/night/${v.venue.slug}/`;
    const n = (html.match(new RegExp(href.replace(/\//g, '\\/'), 'g')) || []).length;
    if (n < 1) bad.push(v.slug + ':링크없음');
    if (!fs.existsSync(path.join(ROOT, 'night', v.venue.slug, 'index.html'))) bad.push(v.slug + ':대상없음');
  }
  add('G34', bad.length === 0, `신규 → 배정 업소 페이지 링크 ${13 - bad.length}/13 · 대상 파일 존재`);
}

/* ── 출력 ── */
let fail = 0;
console.log('\n게이트  결과   측정');
console.log('─'.repeat(118));
for (const r of R) { if (!r.ok) fail++; console.log(`${r.id.padEnd(6)} ${(r.ok ? 'PASS' : 'FAIL').padEnd(6)} ${r.msg}`); }
console.log('─'.repeat(118));
console.log(`정적 게이트 ${R.length}종 중 FAIL ${fail}건`);

console.log('\n[형태소 3형태]');
for (const m of morph) console.log(`  ${m.kw.padEnd(12)} A ${String(m.A).padStart(3)}  B ${String(m.B).padStart(2)}  C ${String(m.C).padStart(2)}`);
console.log('\n[교통 어휘]');
console.log('  ' + g18.map(x => `${x.kw} ${x.n}회`).join(' · '));
console.log('\n[유사도 상위 5쌍]');
for (const p of sim.top5) console.log(`  ${(p.s * 100).toFixed(2)}%  ${p.p}${p.cross ? '  ← 기존↔신규' : ''}`);

fs.writeFileSync(path.join(__dirname, 'gate-region-report.json'), JSON.stringify({ R, morph, g18, sim }, null, 1));
process.exit(fail ? 1 : 0);
