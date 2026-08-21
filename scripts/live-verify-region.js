#!/usr/bin/env node
/* 라이브 실측 — [20] 2·3·4·5 + G05 G06 G07 G08 G12 G20 G31 G32 G34
   실행: node scripts/live-verify-region.js */
const { chromium } = require('playwright');
const { REGIONS } = require('./region-data.js');
const { VENUES } = require('./night-data.js');
const fs = require('fs'), path = require('path');
const SITE = 'https://wish-5yw.pages.dev';
const BAD_PROPS = ['transform', 'filter', 'perspective', 'backdropFilter', 'willChange', 'contain'];

(async () => {
  /* 1. 신규 13 URL 본문 검증 */
  const curlRows = [];
  for (const v of REGIONS) {
    const url = `${SITE}/night/${v.slug}/?cb=${Date.now()}${v.no}`;
    const res = await fetch(url, { headers: { 'cache-control': 'no-cache' }, redirect: 'manual' });
    const html = res.status === 200 ? await res.text() : '';
    curlRows.push({
      no: v.no, kw: v.kw, url: `${SITE}/night/${v.slug}/`, http: res.status,
      kwA: (html.match(new RegExp(v.kw, 'g')) || []).length,
      callbar: html.includes('class="callbar"'),
      canonical: (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '',
      noindex: /noindex/.test(html), redirected: res.status >= 300 && res.status < 400,
      venueLink: html.includes(`/night/${v.venue.slug}/`)
    });
  }

  /* 2. 기존 13 URL 재확인 */
  const oldRows = [];
  for (const v of VENUES) {
    const r = await fetch(`${SITE}/night/${v.slug}/?cb=${Date.now()}`, { redirect: 'manual' });
    oldRows.push({ name: v.name, http: r.status });
  }

  /* 3. 배정 업소 링크 응답 */
  const venueRows = [];
  for (const v of REGIONS) {
    const u = `${SITE}/night/${v.venue.slug}/`;
    const r = await fetch(u + `?cb=${Date.now()}`, { redirect: 'manual' });
    venueRows.push({ kw: v.kw, venue: v.venue.name, url: u, http: r.status });
  }

  /* 4. OG 라이브 */
  const ogRows = [];
  for (const v of REGIONS) {
    const u = `${SITE}/og/${v.slug}-og.png`;
    const r = await fetch(u + `?cb=${Date.now()}`);
    let dim = '-', kb = 0;
    if (r.status === 200) {
      const b = Buffer.from(await r.arrayBuffer());
      dim = `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; kb = Math.round(b.length / 1024);
    }
    ogRows.push({ file: `${v.slug}-og.png`, url: u, http: r.status, dim, kb });
  }

  /* 5. robots.txt */
  const rb = await fetch(`${SITE}/robots.txt?cb=${Date.now()}`);
  const robotsTxt = rb.status === 200 ? await rb.text() : '';
  const robots = {
    http: rb.status,
    yeti: /User-agent:\s*Yeti[\s\S]{0,40}Allow:\s*\//i.test(robotsTxt),
    googlebot: /User-agent:\s*Googlebot[\s\S]{0,40}Allow:\s*\//i.test(robotsTxt),
    disallow: (robotsTxt.match(/^Disallow:\s*\S/gmi) || []).length
  };
  const smr = await fetch(`${SITE}/sitemap.xml?cb=${Date.now()}`);
  const smTxt = smr.status === 200 ? await smr.text() : '';
  const sitemap = { http: smr.status, hits: REGIONS.filter(v => smTxt.includes(`/night/${v.slug}/`)).length };

  /* 6. Playwright */
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || require('child_process').execSync('which chromium').toString().trim(),
    args: ['--no-sandbox']
  });
  const bar = [], anc = [], group = [], cover = [], alts = [], load = [];
  for (const vp of [{ n: '모바일 390x844', w: 390, h: 844 }, { n: '데스크톱 1920x1080', w: 1920, h: 1080 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const pg = await ctx.newPage();
    for (const v of REGIONS) {
      const url = `${SITE}/night/${v.slug}/?cb=${Date.now()}${v.no}`;
      const t0 = Date.now();
      await pg.goto(url, { waitUntil: 'networkidle' });
      const ms = Date.now() - t0;
      if (vp.w === 390) load.push({ kw: v.kw, ms });

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
      bar.push({ vp: vp.n, kw: v.kw, scrollable, atBottom, top0: +top0.toFixed(2), top1: +top1.toFixed(2), diff: +(top1 - top0).toFixed(2) });

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
      anc.push({ vp: vp.n, kw: v.kw, parent: chain.map(c => c.tag).join('>'), bad: chain.flatMap(c => c.hits).join(',') || '없음' });

      const barTxt = await pg.evaluate(() => document.querySelector('.callbar').textContent.trim().replace(/\s+/g, ' '));
      const footTxt = await pg.evaluate(() => (document.querySelector('.ad-inquiry') || {}).textContent || '');
      group.push({ vp: vp.n, kw: v.kw, grp: v.group, barTxt, barBesta: /besta12/.test(barTxt), footBesta: /besta12/.test(footTxt) });

      const c = await pg.evaluate(() => {
        const a = document.querySelector('.ad-inquiry').getBoundingClientRect();
        const b = document.querySelector('.callbar').getBoundingClientRect();
        return { adBottom: a.bottom, barTop: b.top };
      });
      cover.push({ vp: vp.n, kw: v.kw, ok: c.adBottom <= c.barTop + 0.5, adBottom: +c.adBottom.toFixed(1), barTop: +c.barTop.toFixed(1) });

      if (vp.w === 390) {
        const missAlt = await pg.evaluate(() => [...document.images].filter(i => !i.alt).length);
        const ogAlt = await pg.evaluate(() => (document.querySelector('meta[property="og:image:alt"]') || {}).content || '');
        alts.push({ kw: v.kw, missAlt, ogAlt });
      }
    }
    await ctx.close();
  }
  await browser.close();

  const out = { curlRows, oldRows, venueRows, ogRows, robots, sitemap, bar, anc, group, cover, alts, load };
  fs.writeFileSync(path.join(__dirname, 'live-region-report.json'), JSON.stringify(out, null, 1));

  console.log('\n[신규 13 라이브]');
  for (const r of curlRows) console.log(
    `${String(r.no).padStart(2)} ${r.kw.padEnd(12)} HTTP ${r.http}  A형 ${String(r.kwA).padStart(2)}회  callbar ${r.callbar ? 'O' : 'X'}  canonical자기참조 ${r.canonical === r.url ? 'O' : 'X ' + r.canonical}  noindex ${r.noindex ? 'YES' : 'no'}  업소링크 ${r.venueLink ? 'O' : 'X'}`);
  console.log('\n[기존 13 재확인] ' + oldRows.map(r => `${r.name}:${r.http}`).join(' · '));
  console.log('[배정 업소 링크 응답] 200 ' + venueRows.filter(r => r.http === 200).length + '/13');
  console.log('\n[OG 라이브]');
  for (const r of ogRows) console.log(`  ${r.file.padEnd(28)} ${r.http} ${r.dim} ${r.kb}KB`);
  console.log(`\n[robots] HTTP ${robots.http} · Yeti Allow ${robots.yeti ? 'O' : 'X'} · Googlebot Allow ${robots.googlebot ? 'O' : 'X'} · Disallow ${robots.disallow}건`);
  console.log(`[sitemap] HTTP ${sitemap.http} · 신규 13 URL 등재 ${sitemap.hits}/13`);
  console.log('\n[고정바 좌표 실측 26행]');
  let g05 = 0;
  for (const r of bar) { if (Math.abs(r.diff) > 0.001) g05++; console.log(`  ${r.vp.padEnd(18)} ${r.kw.padEnd(12)} scroll:${r.scrollable ? 'Y' : 'N'} 최하단:${r.atBottom ? 'Y' : 'N'} top0=${r.top0} top1=${r.top1} diff=${r.diff}`); }
  const badAnc = anc.filter(a => a.bad !== '없음');
  console.log(`\n[조상 체인] 위험 속성 보유 ${badAnc.length}/26 · 부모 체인 ${anc[0].parent}`);
  const gA = group.filter(g => g.grp === 'A'), gB = group.filter(g => g.grp === 'B');
  console.log(`[고정바] A그룹 besta12 ${gA.filter(g => g.barBesta).length}건(0이어야 PASS) · B그룹 노출 ${gB.filter(g => g.barBesta).length}/${gB.length} · 푸터 besta12 ${group.filter(g => g.footBesta).length}/${group.length}`);
  for (const g of group.filter(g => g.vp.startsWith('모바일'))) console.log(`   ${g.kw.padEnd(12)} [${g.grp}] "${g.barTxt}"`);
  console.log(`[G12] 고정바가 .ad-inquiry 가림 ${cover.filter(c => !c.ok).length}/${cover.length}건`);
  console.log(`[alt] img alt 누락 ${alts.reduce((a, b) => a + b.missAlt, 0)}건 · og:image:alt 고유 ${new Set(alts.map(a => a.ogAlt)).size}/13`);
  console.log(`[로딩] 최대 ${(Math.max(...load.map(l => l.ms)) / 1000).toFixed(2)}초 · 평균 ${(load.reduce((a, b) => a + b.ms, 0) / load.length / 1000).toFixed(2)}초`);
  console.log(`\n요약: HTTP200 ${curlRows.filter(r => r.http === 200).length}/13 · 기존 200 ${oldRows.filter(r => r.http === 200).length}/13 · OG200 ${ogRows.filter(r => r.http === 200).length}/13 · G05 diff≠0 ${g05}건`);
})();
