const lighthouse = require('lighthouse').default || require('lighthouse');
const { spawn, execSync } = require('child_process');
const { REGIONS } = require('./region-data.js');
const fs = require('fs');
const PORT = 9333;
(async () => {
  const bin = execSync('which chromium').toString().trim();
  const proc = spawn(bin, [
    `--remote-debugging-port=${PORT}`, '--headless', '--no-sandbox', '--disable-gpu',
    '--disable-dev-shm-usage', '--user-data-dir=/tmp/lh-region-profile', 'about:blank'
  ], { stdio: 'ignore', detached: true });
  // 디버깅 포트가 열릴 때까지 대기
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch (e) { }
    await new Promise(r => setTimeout(r, 500));
  }
  const rows = [];
  for (const v of REGIONS) {
    const url = `https://ulsanb.pages.dev/night/${v.slug}/`;
    const r = await lighthouse(url, { port: PORT, output: 'json', logLevel: 'error',
      onlyCategories: ['seo', 'accessibility', 'performance'], formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2 } });
    const c = r.lhr.categories;
    const row = { kw: v.kw, err: r.lhr.runtimeError ? r.lhr.runtimeError.code : null,
      seo: Math.round(c.seo.score * 100), a11y: Math.round(c.accessibility.score * 100),
      perf: Math.round(c.performance.score * 100), lcp: r.lhr.audits['largest-contentful-paint'].displayValue,
      fail: Object.values(r.lhr.audits).filter(a => (a.score !== null && a.score < 1) &&
        ['seo', 'accessibility'].some(k => (c[k].auditRefs || []).some(ar => ar.id === a.id))).map(a => a.id) };
    rows.push(row);
    console.log(`${row.kw.padEnd(12)} SEO ${String(row.seo).padStart(3)}  A11y ${String(row.a11y).padStart(3)}  Perf ${String(row.perf).padStart(3)}  LCP ${row.lcp}  감점 ${row.fail.join(',') || '없음'}${row.err ? ' ERR:' + row.err : ''}`);
  }
  try { process.kill(-proc.pid); } catch (e) { }
  fs.writeFileSync(__dirname + '/lh-region-report.json', JSON.stringify(rows, null, 1));
  console.log('\nSEO min', Math.min(...rows.map(r => r.seo)), '| A11y min', Math.min(...rows.map(r => r.a11y)), '| Perf min', Math.min(...rows.map(r => r.perf)));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
