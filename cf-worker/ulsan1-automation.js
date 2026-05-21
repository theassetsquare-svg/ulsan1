// ulsan1.pages.dev — 24h 자동화 Cloudflare Worker
// 영구 룰: 위험 단어 / 가짜별점 / Schema 5종 자동 감시

const SITE = 'https://ulsan1.pages.dev';
const PAGES = ['/', '/dresscode', '/budget', '/timing', '/parking', '/manners', '/nearby', '/compare', '/legal'];
const ASSETS = ['/sitemap.xml', '/robots.txt', '/llms.txt', '/site.webmanifest', '/sw.js', '/favicon.svg', '/og/main.png', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
const DANGEROUS = ['밤문화', '유흥'];
const REQUIRED_SCHEMA = ['WebSite', 'NightClub', 'LocalBusiness', 'Article', 'BreadcrumbList', 'FAQPage', 'HowTo', 'Organization'];

function log(level, msg, extra) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...(extra || {}) }));
}

async function healthCheck() {
  const fails = [];
  for (const path of [...PAGES, ...ASSETS]) {
    try {
      const r = await fetch(SITE + path, { cf: { cacheTtl: 0 } });
      if (r.status !== 200) fails.push(`${path} → ${r.status}`);
    } catch (e) {
      fails.push(`${path} → ${e.message}`);
    }
  }
  if (fails.length) {
    log('error', 'health-check FAIL', { fails });
    throw new Error('health-check FAIL: ' + fails.join(', '));
  }
  log('info', 'health-check OK', { pages: PAGES.length, assets: ASSETS.length });
  return { ok: true, checked: PAGES.length + ASSETS.length };
}

async function permanentRuleCheck() {
  const issues = [];
  for (const path of PAGES) {
    const r = await fetch(SITE + path, { cf: { cacheTtl: 0 } });
    const body = await r.text();
    for (const word of DANGEROUS) {
      const count = (body.match(new RegExp(word, 'g')) || []).length;
      if (count > 0) issues.push(`${path}: '${word}' x${count}`);
    }
    if (/AggregateRating|aggregateRating/.test(body)) {
      issues.push(`${path}: AggregateRating present (영구 룰 위반)`);
    }
  }
  if (issues.length) {
    log('error', 'permanent-rule FAIL', { issues });
    throw new Error('permanent-rule FAIL: ' + issues.join('; '));
  }
  log('info', 'permanent-rule OK', { pages: PAGES.length });
  return { ok: true };
}

async function schemaCheck() {
  const r = await fetch(SITE + '/', { cf: { cacheTtl: 0 } });
  const body = await r.text();
  const missing = REQUIRED_SCHEMA.filter((t) => !body.includes(`"@type": "${t}"`));
  if (missing.length) {
    log('error', 'schema FAIL', { missing });
    throw new Error('schema missing: ' + missing.join(', '));
  }
  // JSON-LD blocks parse
  const blocks = body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
  let parseFails = 0;
  for (const block of blocks) {
    const json = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
    try { JSON.parse(json); } catch { parseFails++; }
  }
  if (parseFails > 0) {
    log('error', 'schema JSON parse FAIL', { parseFails });
    throw new Error(`JSON-LD parse failed: ${parseFails} block(s)`);
  }
  log('info', 'schema OK', { types: REQUIRED_SCHEMA.length, jsonLdBlocks: blocks.length });
  return { ok: true };
}

async function indexNowPing() {
  // Google ping (deprecated but harmless) + Bing IndexNow
  const urls = [
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITE + '/sitemap.xml')}`,
  ];
  const results = [];
  for (const u of urls) {
    try {
      const r = await fetch(u, { method: 'GET' });
      results.push(`${u} → ${r.status}`);
    } catch (e) {
      results.push(`${u} → error: ${e.message}`);
    }
  }
  // IndexNow protocol (Bing + Yandex)
  const indexNowKey = '7b3e9c2a4f5d8a1b6c9e0d2f4a8b3c5d';
  try {
    const inResp = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'ulsan1.pages.dev',
        key: indexNowKey,
        urlList: PAGES.map((p) => SITE + p),
      }),
    });
    results.push(`IndexNow API → ${inResp.status}`);
  } catch (e) {
    results.push(`IndexNow API → error: ${e.message}`);
  }
  log('info', 'indexnow ping done', { results });
  return { ok: true, results };
}

async function pageSpeedCheck() {
  // Free Google PageSpeed Insights API — no key needed for limited use
  const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(SITE)}&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    const scores = {};
    const cats = data?.lighthouseResult?.categories || {};
    for (const [k, v] of Object.entries(cats)) scores[k] = v.score;
    log('info', 'pagespeed scores', { scores });
    const lowScores = Object.entries(scores).filter(([_, s]) => s !== null && s < 0.85);
    if (lowScores.length > 0) {
      log('warn', 'pagespeed low scores', { lowScores });
    }
    return { ok: true, scores };
  } catch (e) {
    log('warn', 'pagespeed check skipped', { error: e.message });
    return { ok: false, error: e.message };
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    // Manual trigger via /run?task=health|rule|schema|indexnow|pagespeed|all
    if (url.pathname === '/run') {
      const task = url.searchParams.get('task') || 'all';
      const results = {};
      try {
        if (task === 'health' || task === 'all') results.health = await healthCheck();
        if (task === 'rule' || task === 'all') results.rule = await permanentRuleCheck();
        if (task === 'schema' || task === 'all') results.schema = await schemaCheck();
        if (task === 'indexnow' || task === 'all') results.indexnow = await indexNowPing();
        if (task === 'pagespeed' || task === 'all') results.pagespeed = await pageSpeedCheck();
        return new Response(JSON.stringify({ ok: true, task, results }, null, 2), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, task, error: e.message, results }, null, 2), {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
    }
    return new Response(
      '울산챔피언나이트 24h 자동화 Worker\nEndpoints: /run?task=all|health|rule|schema|indexnow|pagespeed',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  },

  async scheduled(event, env, ctx) {
    const cron = event.cron;
    log('info', 'cron trigger', { cron });
    // Dispatch by cron expression
    try {
      if (cron === '0 3 * * *') {
        // KST 12:00 — daily SEO ping
        await indexNowPing();
      } else if (cron === '30 3 * * *') {
        // KST 12:30 — PageSpeed
        await pageSpeedCheck();
      } else if (cron === '0 4 * * *') {
        // KST 13:00 — permanent rule + schema validation
        await permanentRuleCheck();
        await schemaCheck();
      } else if (cron === '0 */6 * * *') {
        // Every 6h — health check
        await healthCheck();
      }
    } catch (e) {
      log('error', 'scheduled task failed', { cron, error: e.message });
      throw e;
    }
  },
};
