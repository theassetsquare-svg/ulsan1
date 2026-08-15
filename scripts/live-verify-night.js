#!/usr/bin/env node
/* 라이브 실측 — [18] 2·3·4 + G05 G06 G07 G08 G12 G20
   실행: node scripts/live-verify-night.js */
const { chromium } = require('playwright');
const { VENUES } = require('./night-data.js');
const fs = require('fs'), path = require('path');
const SITE = 'https://ulsanb.pages.dev';

const BAD_PROPS = ['transform', 'filter', 'perspective', 'backdropFilter', 'willChange', 'contain'];

(async () => {
  /* ── 1. curl 성격의 본문 검증 ── */
  const curlRows = [];
  for (const v of VENUES) {
    const url = `${SITE}/night/${v.slug}/?cb=${Date.now()}${v.no}`;
    const res = await fetch(url, { headers: { 'cache-control': 'no-cache' }, redirect: 'manual' });
    const html = res.status === 200 ? await res.text() : '';
    curlRows.push({
      no: v.no, name: v.name, url: `${SITE}/night/${v.slug}/`,
      http: res.status, name_ok: html.includes(v.name), callbar: html.includes('class="callbar"'),
      canonical: (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '',
      noindex: /noindex/.test(html)
    });
  }

  /* ── 2. OG 이미지 라이브 ── */
  const ogRows = [];
  for (const v of VENUES) {
    const u = `${SITE}/og/${v.slug}-og.png`;
    const r = await fetch(u + `?cb=${Date.now()}`);
    let dim = '-';
    if (r.status === 200) {
      const b = Buffer.from(await r.arrayBuffer());
      dim = `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
    }
    ogRows.push({ file: `${v.slug}-og.png`, url: u, http: r.status, dim });
  }

  /* ── 3. Playwright 고정바 실측 ── */
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || require('child_process').execSync('which chromium').toString().trim(),
    args: ['--no-sandbox']
  });
  const bar = [], anc = [], group = [], cover = [];
  for (const vp of [{ n: '모바일 390x844', w: 390, h: 844 }, { n: '데스크톱 1920x1080', w: 1920, h: 1080 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const pg = await ctx.newPage();
    for (const v of VENUES) {
      const url = `${SITE}/night/${v.slug}/?cb=${Date.now()}${v.no}`;
      await pg.goto(url, { waitUntil: 'networkidle' });
      await pg.evaluate(() => { try { sessionStorage.clear(); localStorage.clear(); } catch (e) { } });

      const scrollable = await pg.evaluate(() => document.documentElement.scrollHeight > window.innerHeight);
      const top0 = await pg.evaluate(() => document.querySelector('.callbar').getBoundingClientRect().top);
      await pg.evaluate(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
      });
      await pg.waitForTimeout(300);
      const atBottom = await pg.evaluate(() =>
        Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight) < 2);
      const top1 = await pg.evaluate(() => document.querySelector('.callbar').getBoundingClientRect().top);

      bar.push({ vp: vp.n, name: v.name, scrollable, atBottom, top0: +top0.toFixed(2), top1: +top1.toFixed(2), diff: +(top1 - top0).toFixed(2) });

      /* 조상 체인 검사 */
      const chain = await pg.evaluate((props) => {
        const out = []; let el = document.querySelector('.callbar').parentElement;
        while (el && el !== document.documentElement) {
          const cs = getComputedStyle(el); const hits = [];
          for (const p of props) { const val = cs[p]; if (val && val !== 'none' && val !== 'auto' && val !== 'normal') hits.push(p + ':' + val); }
          out.push({ tag: el.tagName.toLowerCase(), hits });
          el = el.parentElement;
        }
        return out;
      }, BAD_PROPS);
      anc.push({ vp: vp.n, name: v.name, parent: chain.map(c => c.tag).join('>'), bad: chain.flatMap(c => c.hits).join(',') || '없음' });

      /* 고정바 문구 */
      const barTxt = await pg.evaluate(() => document.querySelector('.callbar').textContent.trim().replace(/\\s+/g,' '));
      const footTxt = await pg.evaluate(() => (document.querySelector('.ad-inquiry') || {}).textContent || '');
      group.push({ vp: vp.n, name: v.name, grp: v.group, barTxt, barBesta: /besta12/.test(barTxt), footBesta: /besta12/.test(footTxt) });

      /* G12 — 고정바가 .ad-inquiry 를 가리는가 */
      const c = await pg.evaluate(() => {
        const a = document.querySelector('.ad-inquiry').getBoundingClientRect();
        const b = document.querySelector('.callbar').getBoundingClientRect();
        return { adBottom: a.bottom, barTop: b.top };
      });
      cover.push({ vp: vp.n, name: v.name, ok: c.adBottom <= c.barTop + 0.5, adBottom: +c.adBottom.toFixed(1), barTop: +c.barTop.toFixed(1) });
    }
    await ctx.close();
  }
  await browser.close();

  const out = { curlRows, ogRows, bar, anc, group, cover };
  fs.writeFileSync(path.join(__dirname, 'live-report.json'), JSON.stringify(out, null, 1));

  /* ── 출력 ── */
  console.log('\n[라이브 URL 검증]');
  console.log('no 업소'.padEnd(24) + 'HTTP 본문 고정바 canonical자기참조 noindex');
  for (const r of curlRows) console.log(
    `${String(r.no).padStart(2)} ${r.name.padEnd(20)} ${r.http}  ${r.name_ok ? 'O' : 'X'}    ${r.callbar ? 'O' : 'X'}     ${r.canonical === r.url ? 'O' : 'X ' + r.canonical}        ${r.noindex ? 'YES' : 'no'}`);

  console.log('\n[OG 라이브]');
  for (const r of ogRows) console.log(`  ${r.file.padEnd(32)} ${r.http} ${r.dim}`);

  console.log('\n[고정바 좌표 실측 26행]');
  let g05 = 0;
  for (const r of bar) { if (Math.abs(r.diff) > 0.001) g05++; console.log(`  ${r.vp.padEnd(18)} ${r.name.padEnd(20)} scroll:${r.scrollable ? 'Y' : 'N'} 최하단:${r.atBottom ? 'Y' : 'N'} top0=${r.top0} top1=${r.top1} diff=${r.diff}`); }

  console.log('\n[조상 체인]');
  const badAnc = anc.filter(a => a.bad !== '없음');
  console.log(`  위험 속성 보유 조상 ${badAnc.length}건 / 26 · 부모 체인 예: ${anc[0].parent}`);
  for (const a of badAnc.slice(0, 5)) console.log(`   ! ${a.vp} ${a.name} ${a.bad}`);

  console.log('\n[고정바 문구 · 푸터]');
  const gA = group.filter(g => g.grp === 'A'), gB = group.filter(g => g.grp === 'B');
  console.log(`  A그룹 고정바 besta12 노출: ${gA.filter(g => g.barBesta).length}건 (0이어야 PASS)`);
  console.log(`  B그룹 고정바 besta12 노출: ${gB.filter(g => g.barBesta).length}/${gB.length}`);
  console.log(`  전 페이지 푸터 besta12 노출: ${group.filter(g => g.footBesta).length}/${group.length}`);
  for (const g of group.filter(g => g.vp.startsWith('모바일'))) console.log(`   ${g.name.padEnd(20)} [${g.grp}] "${g.barTxt.replace(/\n/g, ' ')}"`);

  console.log('\n[G12 고정바 vs .ad-inquiry]');
  console.log(`  가림 발생 ${cover.filter(c => !c.ok).length}건 / ${cover.length}`);

  console.log(`\n요약: G05 diff≠0 ${g05}건 · HTTP 200 ${curlRows.filter(r => r.http === 200).length}/13 · OG 200 ${ogRows.filter(r => r.http === 200).length}/13`);
})();
