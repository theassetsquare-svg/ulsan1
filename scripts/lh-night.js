const lighthouse = require('lighthouse').default || require('lighthouse');
const { launch } = require('chrome-launcher');
const { VENUES } = require('./night-data.js');
const fs = require('fs');
(async () => {
  const chrome = await launch({ chromePath: require('child_process').execSync('which chromium').toString().trim(),
    chromeFlags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const rows = [];
  for (const v of VENUES) {
    const url = `https://ulsanb.pages.dev/night/${v.slug}/`;
    const r = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error',
      onlyCategories: ['seo', 'accessibility', 'performance'], formFactor: 'mobile', screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2 } });
    const c = r.lhr.categories;
    rows.push({ name: v.name, seo: Math.round(c.seo.score * 100), a11y: Math.round(c.accessibility.score * 100),
      perf: Math.round(c.performance.score * 100), lcp: r.lhr.audits['largest-contentful-paint'].displayValue,
      fail: Object.values(r.lhr.audits).filter(a => (a.score !== null && a.score < 1) && ['seo','accessibility'].some(k => (c[k].auditRefs||[]).some(ar=>ar.id===a.id))).map(a=>a.id) });
    console.log(`${v.name.padEnd(20)} SEO ${rows.at(-1).seo}  A11y ${rows.at(-1).a11y}  Perf ${rows.at(-1).perf}  LCP ${rows.at(-1).lcp}`);
  }
  await chrome.kill();
  fs.writeFileSync(__dirname + '/lh-report.json', JSON.stringify(rows, null, 1));
  console.log('\nSEO min', Math.min(...rows.map(r=>r.seo)), '| A11y min', Math.min(...rows.map(r=>r.a11y)), '| Perf min', Math.min(...rows.map(r=>r.perf)));
  const issues = [...new Set(rows.flatMap(r=>r.fail))];
  console.log('감점 항목:', issues.join(', ') || '없음');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
