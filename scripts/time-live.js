#!/usr/bin/env node
/* 라이브 실측 — 배포된 페이지를 직접 받아 검사한다 (curl 상당)
   실행: node scripts/time-live.js */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { SITE, VENUES, HUB, HOME, ADVERTISERS, TODAY } = require('./time-data.js');

const get = (url, asBuffer = false) => new Promise((resolve) => {
  const req = https.get(url + (url.includes('?') ? '&' : '?') + 'cb=' + Math.floor(Math.random() * 1e9),
    { headers: { 'user-agent': 'Mozilla/5.0 (time-lab live check)', 'cache-control': 'no-cache' } }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode, body: asBuffer ? buf : buf.toString('utf8'), len: buf.length });
      });
    });
  req.on('error', (e) => resolve({ status: 0, body: '', err: e.message, len: 0 }));
  req.setTimeout(25000, () => { req.destroy(); resolve({ status: 0, body: '', err: 'timeout', len: 0 }); });
});

const pngSize = (b) => (b.length > 24 && b.slice(1, 4).toString() === 'PNG')
  ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null;

const PAGES = [
  { key: '홈', name: HOME.name, url: `${SITE}/`, title: HOME.title, og: `${SITE}/og/time-home.png`, bar: `${ADVERTISERS.__home__.label} ${ADVERTISERS.__home__.phone}`, addr: HOME.addr },
  { key: '허브', name: HUB.h1, url: `${SITE}/time/`, title: HUB.title, og: `${SITE}/og/time-hub.png`, bar: '광고문의 카카오톡 besta12', addr: null },
  ...VENUES.map(v => {
    const ad = ADVERTISERS[v.slug];
    return {
      key: v.no, name: v.name, url: `${SITE}/time/${v.slug}/`, title: v.title,
      og: `${SITE}/og/time-${v.slug}.png`,
      bar: ad ? `${ad.label} ${ad.phone}` : '광고문의 카카오톡 besta12',
      addr: v.addr
    };
  })
];

(async () => {
  const rows = [];
  for (const p of PAGES) {
    const r = await get(p.url);
    const title = (r.body.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1];
    const bar = (r.body.match(/<div class="callbar">[\s\S]*?<\/div>/) || [, ''])[0] || '';
    const barText = bar.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const img = await get(p.og, true);
    const size = pngSize(img.body);
    rows.push({
      name: p.name, url: p.url.replace(SITE, ''), http: r.status,
      titleOk: title === p.title ? 'O' : `X(${title.slice(0, 20)})`,
      bar: barText.replace(/^[📞💬]\s*/, ''),
      barOk: barText.includes(p.bar) ? 'O' : 'X',
      thumb: size ? `${size.w}x${size.h}` : `실패(${img.status})`,
      thumbOk: size && size.w === 1200 && size.h === 1200 ? 'O' : 'X',
      addr: p.addr ? (r.body.includes(p.addr) ? '확인' : 'X') : '확인 불가',
      dateOk: r.body.includes(TODAY) ? 'O' : 'X'
    });
    process.stdout.write('.');
  }
  console.log('\n');

  const assets = ['/llms.txt', '/sitemap.xml', '/robots.txt', '/time.css'];
  const key = fs.readFileSync(path.join(__dirname, 'time-indexnow-key.txt'), 'utf8').trim();
  assets.push(`/${key}.txt`);
  const assetRows = [];
  for (const a of assets) {
    const r = await get(SITE + a);
    assetRows.push({ path: a, http: r.status, bytes: r.len });
  }

  const bad = rows.filter(r => r.http !== 200 || r.titleOk !== 'O' || r.barOk !== 'O' || r.thumbOk !== 'O');
  console.log('업소명'.padEnd(22) + 'URL'.padEnd(30) + 'HTTP  title  전화바  썸네일  주소');
  console.log('─'.repeat(110));
  for (const r of rows) {
    console.log(String(r.name).padEnd(22) + r.url.padEnd(30) + String(r.http).padEnd(6) +
      r.titleOk.padEnd(7) + r.barOk.padEnd(8) + (r.thumbOk === 'O' ? r.thumb : r.thumb + ' X').padEnd(8) + r.addr);
  }
  console.log('─'.repeat(110));
  for (const a of assetRows) console.log(a.path.padEnd(42) + a.http + '  ' + a.bytes + 'B');
  console.log(`\n실패 ${bad.length}건 / 전체 ${rows.length}건`);
  fs.writeFileSync(path.join(__dirname, 'time-live-report.json'), JSON.stringify({ TODAY, rows, assetRows }, null, 1));
})();
