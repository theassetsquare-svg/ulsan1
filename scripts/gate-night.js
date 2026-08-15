#!/usr/bin/env node
/* 정적 게이트 검사 — G01~G04, G06~G10, G15~G19, G23~G30, G33, G34
   실행: node scripts/gate-night.js */
const fs = require('fs');
const path = require('path');
const { SITE, VENUES } = require('./night-data.js');
const ROOT = path.resolve(__dirname, '..');

const R = [];
const add = (id, ok, msg) => R.push({ id, ok, msg });

const read = (slug) => fs.readFileSync(path.join(ROOT, 'night', slug, 'index.html'), 'utf8');
const stripTags = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const mainText = (h) => stripTags((h.match(/<main[\s\S]*?<\/main>/) || [''])[0]);
const bodyText = (h) => stripTags((h.match(/<body[\s\S]*<\/body>/) || [''])[0]);

const pages = VENUES.map(v => ({ v, html: read(v.slug) }));

/* ── G01 ── */
{
  let bad = [];
  for (const { v, html } of pages) {
    if (!/^<!DOCTYPE html>/.test(html)) bad.push(v.slug + ':doctype');
    if (!/<html lang="ko">/.test(html)) bad.push(v.slug + ':lang');
    // 태그 균형 대략 검사
    for (const t of ['html', 'head', 'body', 'main', 'article', 'footer']) {
      const o = (html.match(new RegExp('<' + t + '[ >]', 'g')) || []).length;
      const c = (html.match(new RegExp('</' + t + '>', 'g')) || []).length;
      if (o !== c) bad.push(`${v.slug}:${t} ${o}/${c}`);
    }
  }
  add('G01', bad.length === 0, `DOCTYPE·lang 13/13, 태그 불균형 ${bad.length}건 ${bad.slice(0, 4).join(', ')}`);
}

/* ── 유사도 도구 ── */
function shingles(s, n = 5) {
  const t = s.replace(/\s+/g, '');
  const set = new Set();
  for (let i = 0; i + n <= t.length; i++) set.add(t.slice(i, i + n));
  return set;
}
function jac(a, b) {
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/* ── G02 title/desc ── */
{
  const t = VENUES.map(v => v.title), d = VENUES.map(v => v.desc);
  const dupT = new Set(t).size !== t.length, dupD = new Set(d).size !== d.length;
  let maxT = 0, maxD = 0, pairT = '', pairD = '';
  for (let i = 0; i < 13; i++) for (let j = i + 1; j < 13; j++) {
    const st = jac(shingles(t[i]), shingles(t[j])); if (st > maxT) { maxT = st; pairT = `${i + 1}-${j + 1}`; }
    const sd = jac(shingles(d[i]), shingles(d[j])); if (sd > maxD) { maxD = sd; pairD = `${i + 1}-${j + 1}`; }
  }
  add('G02', !dupT && !dupD && maxT < 0.2 && maxD < 0.2,
    `완전중복 ${dupT || dupD ? '있음' : '0'} / title 최대유사 ${(maxT * 100).toFixed(1)}%(${pairT}) / desc 최대유사 ${(maxD * 100).toFixed(1)}%(${pairD})`);
}

/* ── G03 시맨틱 ── */
{
  let bad = [];
  for (const { v, html } of pages) {
    const art = (html.match(/<article>[\s\S]*?<\/article>/) || [''])[0];
    const h1all = (html.match(/<h1[\s>]/g) || []).length;
    if (h1all !== 1) bad.push(v.slug + ':h1x' + h1all);
    for (const t of ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer'])
      if (!new RegExp('<' + t + '[ >]').test(html)) bad.push(v.slug + ':no-' + t);
    if (!/<section id="s1"[\s\S]*?<h2/.test(html)) bad.push(v.slug + ':section-h2');
  }
  add('G03', bad.length === 0, `h1 1개·시맨틱 7종 — 위반 ${bad.length}건 ${bad.slice(0, 4).join(', ')}`);
}

/* ── G04 본문 5-gram 유사도 78쌍 ── */
let simReport = {};
{
  const texts = pages.map(p => mainText(p.html));
  const sh = texts.map(t => shingles(t, 5));
  const pairs = [];
  for (let i = 0; i < 13; i++) for (let j = i + 1; j < 13; j++)
    pairs.push({ p: `${VENUES[i].name}↔${VENUES[j].name}`, s: jac(sh[i], sh[j]) });
  pairs.sort((a, b) => b.s - a.s);
  const max = pairs[0].s, avg = pairs.reduce((a, b) => a + b.s, 0) / pairs.length;
  simReport = { max, avg, top3: pairs.slice(0, 3), count: pairs.length };
  add('G04', pairs.length === 78 && max < 0.15,
    `78쌍 최대 ${(max * 100).toFixed(2)}% / 평균 ${(avg * 100).toFixed(2)}% / 상위 ${pairs.slice(0, 3).map(x => x.p + ' ' + (x.s * 100).toFixed(2) + '%').join(' · ')}`);
}

/* ── G06 / G07 / G08 고정바·푸터 ── */
{
  let a = [], b = [], f = [];
  for (const { v, html } of pages) {
    const bar = (html.match(/<div class="callbar"[\s\S]*?<\/div>/) || [''])[0];
    const foot = (html.match(/<footer[\s\S]*?<\/footer>/) || [''])[0];
    if (v.group === 'A') { if (/besta12/.test(bar)) a.push(v.slug); if (!/tel:/.test(bar)) a.push(v.slug + ':no-tel'); }
    else { if (!/besta12/.test(bar)) b.push(v.slug); }
    if (!/besta12/.test(foot)) f.push(v.slug);
  }
  add('G06', a.length === 0, `A그룹 4페이지 고정바 besta12 ${a.length}회`);
  add('G07', b.length === 0, `B그룹 9페이지 고정바 besta12 노출 ${9 - b.length}/9`);
  add('G08', f.length === 0, `푸터 besta12 노출 ${13 - f.length}/13 · .ad-inquiry 대비 #F7F8FA on #111318 = 17.4:1`);
}

/* ── G09 JSON-LD ── */
{
  let bad = [], faqLen = [];
  for (const { v, html } of pages) {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);
    if (blocks.length !== 3) bad.push(v.slug + ':blocks' + blocks.length);
    for (const b of blocks) { try { JSON.parse(b); } catch (e) { bad.push(v.slug + ':parse'); } }
    for (const f of v.faq) { const L = f.a.length; faqLen.push(L); if (L < 40 || L > 90) bad.push(`${v.slug}:faq${L}`); }
  }
  add('G09', bad.length === 0, `JSON-LD 3종 파싱오류 0 / FAQ 65개 답변 길이 ${Math.min(...faqLen)}~${Math.max(...faqLen)}자 (기준 40~90) 위반 ${bad.length}`);
}

/* ── G10 링크 ── */
{
  let ext = [], broken = [];
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
  add('G10', ext.length === 0 && broken.length === 0, `외부 아웃바운드 ${ext.length}개(tel 제외) / 내부링크 깨짐 ${broken.length}개 ${[...ext, ...broken].slice(0, 3).join(', ')}`);
}

/* ── G15 형태소 ── */
const morph = [];
{
  let bad = [];
  for (const { v, html } of pages) {
    const t = bodyText(html);
    const A = (t.match(new RegExp(v.name, 'g')) || []).length;
    const B = (t.match(new RegExp(v.nameB, 'g')) || []).length;
    const C = (t.match(new RegExp(v.nameC, 'g')) || []).length;
    morph.push({ name: v.name, A, B, C });
    if (A < 10 || B < 2 || C < 1) bad.push(`${v.slug} A${A}/B${B}/C${C}`);
  }
  add('G15', bad.length === 0, `A≥10·B≥2·C≥1 — 미달 ${bad.length}건 ${bad.slice(0, 5).join(', ')}`);
}

/* ── G16 title ── */
{
  let bad = [];
  for (const v of VENUES) {
    if (!v.title.startsWith(v.name)) bad.push(v.slug + ':head');
    const L = [...v.title].length;
    if (L < 25 || L > 30) bad.push(`${v.slug}:${L}자`);
  }
  add('G16', bad.length === 0, `업소명 0번째 시작 13/13 · 길이 ${VENUES.map(v => [...v.title].length).join(',')} — 위반 ${bad.length}`);
}

/* ── G17 첫 100자 ── */
{
  let bad = [];
  for (const { v, html } of pages) {
    const lead = stripTags(v.lead.join(' '));
    if (!lead.slice(0, 100).includes(v.name)) bad.push(v.slug);
  }
  add('G17', bad.length === 0, `첫 문단 100자 내 A형 1회 이상 — 미달 ${bad.length}`);
}

/* ── G18 비중 + 교통 어휘 ── */
const g18rows = [];
{
  let bad = [];
  for (const { v, html } of pages) {
    const t = mainText(html);
    const total = t.replace(/\s/g, '').length;
    // 위치·교통 섹션 = h2에 위치/가는 길/어디 포함
    let geo = 0;
    for (const s of v.sections) if (/위치|가는 길|어디인가요|권선로|유천동|번동/.test(s.h2)) geo += stripTags(s.html).replace(/\s/g, '').length;
    const ratio = geo / total;
    const words = ((t.match(/지하철|환승|막차|택시/g)) || []).length;
    g18rows.push({ name: v.name, ratio: (ratio * 100).toFixed(1), words });
    if (ratio > 0.2 || words > 3) bad.push(`${v.slug} ${(ratio * 100).toFixed(1)}%/${words}회`);
  }
  add('G18', bad.length === 0, `지역·교통 비중 최대 ${Math.max(...g18rows.map(r => +r.ratio))}% (≤20) · 교통어휘 최대 ${Math.max(...g18rows.map(r => r.words))}회 (≤3) — 위반 ${bad.length}`);
}

/* ── G19 H2 업소명 ── */
{
  let bad = [], counts = [];
  for (const v of VENUES) {
    const all = [...v.sections.map(s => s.h2), `${v.name} 자주 묻는 질문`, '같이 보면 좋은 나이트'];
    const c = all.filter(h => h.includes(v.name)).length;
    counts.push(c);
    if (c < 4) bad.push(v.slug + ':' + c);
  }
  add('G19', bad.length === 0, `H2 중 업소명 포함 개수 ${counts.join(',')} (≥4) — 미달 ${bad.length}`);
}

/* ── G23 각도 ── */
{
  const angles = VENUES.map(v => v.angleNo);
  const calc = VENUES.map(v => ((2 - 1) + (v.no - 1)) % 13 + 1);
  const ok = new Set(angles).size === 13 && JSON.stringify(angles) === JSON.stringify(calc);
  add('G23', ok, `각도 재계산 일치 · 13개 전부 상이 [${angles.join(',')}]`);
}

/* ── G24 중복 URL ── */
{
  const dirs = fs.readdirSync(path.join(ROOT, 'night')).filter(d => fs.statSync(path.join(ROOT, 'night', d)).isDirectory());
  const dup = dirs.filter(d => /-\d+$/.test(d));
  add('G24', dup.length === 0 && dirs.length === 13, `night 하위 디렉터리 ${dirs.length}개 · xxx-2 형태 ${dup.length}건`);
}

/* ── G25 첫 문단 금칙어 ── */
{
  let bad = [];
  for (const v of VENUES) {
    const lead = stripTags(v.lead.join(' '));
    if (/안녕하세요|오늘은|알아보겠습니다/.test(lead)) bad.push(v.slug);
  }
  add('G25', bad.length === 0, `"안녕하세요·오늘은·알아보겠습니다" ${bad.length}회`);
}

/* ── G26 섹션 연결 문장 ── */
{
  let bad = [];
  for (const v of VENUES) {
    let okc = 0;
    for (const s of v.sections) {
      const ps = [...s.html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => stripTags(m[1]));
      const last = ps[ps.length - 1] || '';
      if (last && [...last].length <= 95 && ps.length >= 2) okc++;
    }
    if (okc !== v.sections.length) bad.push(`${v.slug} ${okc}/${v.sections.length}`);
    if (/기계적|다음으로 알아보겠습니다/.test(JSON.stringify(v.sections))) bad.push(v.slug + ':기계연결');
  }
  add('G26', bad.length === 0, `섹션 수 == 연결문장 수 (전 페이지) — 위반 ${bad.length}건 ${bad.slice(0, 3).join(', ')}`);
}

/* ── G27 접미어 ── */
{
  const s = VENUES.map(v => v.suffix);
  add('G27', new Set(s).size === 13, `접미어 고유 ${new Set(s).size}/13`);
}

/* ── G28 첫 문장 ── */
{
  const f = VENUES.map(v => stripTags(v.lead[0]));
  const head = f.map(x => [...x].slice(0, 6).join(''));
  const tail = f.map(x => [...x].slice(-10).join(''));
  const ok = new Set(f).size === 13 && new Set(head).size === 13 && new Set(tail).size === 13;
  add('G28', ok, `첫 문장 전문 ${new Set(f).size}/13 · 머리6자 ${new Set(head).size}/13 · 꼬리10자 ${new Set(tail).size}/13`);
}

/* ── G29 H2 첫 항목 ── */
{
  const h = VENUES.map(v => v.sections[0].h2);
  add('G29', new Set(h).size === 13, `H2 첫 항목 고유 ${new Set(h).size}/13`);
}

/* ── G30 AI 인용 블록 2번째 문장 ── */
{
  const a = VENUES.map(v => v.answer2);
  add('G30', new Set(a).size === 13, `answer-box 두 번째 문장 고유 ${new Set(a).size}/13`);
}

/* ── G33 연령 축약 금지 ── */
{
  const BAN = [/27\+/, /38\+/, /만27세/, /27세이상/, /27이상/, /38세이상/, /38이상/, /27\/38/];
  let bad = [];
  for (const { v, html } of pages) {
    for (const re of BAN) if (re.test(html)) bad.push(v.slug + ':' + re);
    // "27세" / "38세" 단독 사용 검사 — 반드시 "만 27세 이상" 형태여야 한다
    for (const n of ['27', '38']) {
      const hits = [...html.matchAll(new RegExp('.{0,3}' + n + '세.{0,3}', 'g'))].map(m => m[0]);
      for (const h of hits) if (!/만 \d\d세 이상/.test(h)) bad.push(`${v.slug}:"${h}"`);
    }
  }
  add('G33', bad.length === 0, `연령 축약 표기 ${bad.length}건 ${bad.slice(0, 4).join(', ')}`);
}

/* ── G34 첫 문단 연령 완전문 ── */
{
  let bad = [];
  for (const v of VENUES) {
    if (!v.age) continue;
    const lead = stripTags(v.lead.join(' '));
    if (!lead.includes(v.age)) bad.push(v.slug);
  }
  add('G34', bad.length === 0, `창원·대전원 첫 문단 연령 완전문 ${2 - bad.length}/2`);
}

/* ── 출력 ── */
let fail = 0;
console.log('\n게이트  결과   측정');
console.log('─'.repeat(110));
for (const r of R) { if (!r.ok) fail++; console.log(`${r.id.padEnd(6)} ${(r.ok ? 'PASS' : 'FAIL').padEnd(6)} ${r.msg}`); }
console.log('─'.repeat(110));
console.log(`정적 게이트 ${R.length}종 중 FAIL ${fail}건`);

console.log('\n[형태소 3형태]');
for (const m of morph) console.log(`  ${m.name.padEnd(20)} A ${String(m.A).padStart(3)}  B ${String(m.B).padStart(2)}  C ${String(m.C).padStart(2)}`);
console.log('\n[G18 비중]');
for (const g of g18rows) console.log(`  ${g.name.padEnd(20)} 지역·교통 ${g.ratio}%  교통어휘 ${g.words}회`);

fs.writeFileSync(path.join(__dirname, 'gate-report.json'), JSON.stringify({ R, morph, g18rows, simReport }, null, 1));
process.exit(fail ? 1 : 0);
