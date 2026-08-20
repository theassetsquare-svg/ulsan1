#!/usr/bin/env node
/* 밤 시간표 연구소 — /time/ 40개 페이지 + 허브 + 홈 생성기
   실행: node scripts/time-build.js
   ★기존 /night/·루트 콘텐츠 페이지는 건드리지 않는다. index.html(홈)만 지시대로 교체한다. */

const fs = require('fs');
const path = require('path');
const { SITE, TODAY, VENUES, HOME, HUB, KAKAO_URL, KAKAO_ID, ADVERTISERS } = require('./time-data.js');

const ROOT = path.resolve(__dirname, '..');
const GOOGLE = 'HJjm7MRxykCQ7d_9L7glaTeeaWrmJIzAKY0BcNcfm88';
/* 리포지터리에 이미 존재하는 실제 네이버 소유확인 코드(발급 완료분) */
const NAVER = ['f2ccb19e94081bc4ed40329b47b204cc3c71d646', '00679a4e543c2a8cccca6c3d345da5d8c0a9e279'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const head = (o) => `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${o.url}">
<meta property="og:type" content="${o.ogType || 'article'}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${o.url}">
<meta property="og:site_name" content="밤 시간표 연구소">
<meta property="og:locale" content="ko_KR">
<meta property="og:image" content="${o.og}">
<meta property="og:image:secure_url" content="${o.og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="${esc(o.ogAlt)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.desc)}">
<meta name="twitter:image" content="${o.og}">
<meta name="thumbnail" content="${o.og}">
<meta name="google-site-verification" content="${GOOGLE}">
${NAVER.map(c => `<meta name="naver-site-verification" content="${c}">`).join('\n')}
<meta name="theme-color" content="#0A1424">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/time.css">`;

/* ── 고정 전화바: 페이지 단위 정답표 ── */
function callbar(v) {
  const ad = ADVERTISERS[v.slug];
  if (ad) {
    return `<div class="callbar"><a href="tel:${ad.phone.replace(/-/g, '')}">📞 ${esc(ad.label)} ${ad.phone}</a></div>`;
  }
  return `<div class="callbar"><a href="${KAKAO_URL}" rel="nofollow">💬 광고문의 카카오톡 ${KAKAO_ID}</a></div>`;
}

function footer(v) {
  return `<footer class="wrap">
  <div class="adbox"><b>광고문의 카톡: ${KAKAO_ID}</b></div>
  <p class="disc">공개된 웹 정보를 정리했으며 실제와 다를 수 있습니다.</p>
  <p class="disc">작성일 <time datetime="${TODAY}">${TODAY}</time></p>
  <p class="fnav"><a href="/time/">전국 나이트 시간표 40</a></p>
</footer>`;
}

/* ── 사실 표 ── */
function factTable(v) {
  const unknown = '공개 정보로 확인 불가';
  const rows = [
    ['주소', v.addr || unknown],
    ['가까운 역', v.station || unknown],
    ['층', v.floor || unknown],
    ['연령 기준', v.age || unknown],
    ['확인일', TODAY]
  ];
  return `  <div class="tablewrap">
  <table>
    <caption>공개 자료에서 확인된 항목만 실었다</caption>
    <tbody>
${rows.map(([k, val]) => `      <tr><th scope="row">${esc(k)}</th><td>${esc(val)}</td></tr>`).join('\n')}
    </tbody>
  </table>
  </div>`;
}

/* ── JSON-LD ── */
function jsonld(v) {
  const url = `${SITE}/time/${v.slug}/`;
  const og = `${SITE}/og/time-${v.slug}.png`;
  const club = {
    '@context': 'https://schema.org', '@type': 'NightClub', '@id': url + '#nightclub',
    name: v.name, url, image: og, description: v.desc
  };
  if (v.addr) {
    club.address = {
      '@type': 'PostalAddress', streetAddress: v.addr,
      addressLocality: v.locality, addressRegion: v.regionAdmin, addressCountry: 'KR'
    };
  } else {
    club.address = { '@type': 'PostalAddress', addressLocality: v.locality, addressRegion: v.regionAdmin, addressCountry: 'KR' };
  }
  if (v.age) club.typicalAgeRange = v.age;
  const ad = ADVERTISERS[v.slug];
  if (ad) club.telephone = '+82-' + ad.phone.slice(1).replace(/-/g, '-');

  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage', '@id': url + '#faq',
    mainEntity: v.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  };
  const bc = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '전국 나이트 시간표 40', item: SITE + '/time/' },
      { '@type': 'ListItem', position: 2, name: v.name, item: url }
    ]
  };
  return [club, faq, bc].map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
}

/* ── 본문 조립 ── */
function timeline(v) {
  return `  <div class="tl">
${v.sections.map((s, i) => `    <section class="tl-item" id="t${i + 1}">
      <span class="tl-mark">${esc(s.mark)}</span>
      <h2>${esc(s.h2)}</h2>
${s.ps.map(p => `      <p>${p}</p>`).join('\n')}
    </section>`).join('\n')}
  </div>`;
}

function page(v) {
  const url = `${SITE}/time/${v.slug}/`;
  const og = `${SITE}/og/time-${v.slug}.png`;
  const byslug = Object.fromEntries(VENUES.map(x => [x.slug, x]));
  const rel = v.related.map(s => byslug[s]).filter(Boolean);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
${head({ title: v.title, desc: v.desc, url, og, ogAlt: v.ogAlt })}
${jsonld(v)}
</head>
<body>

<header class="top">
  <div class="wrap">
    <nav class="crumb"><ol>
      <li>밤 시간표 연구소</li>
      <li><a href="/time/">시간표 40</a></li>
      <li>${esc(v.name)}</li>
    </ol></nav>
    <span class="tag">${esc(v.region)}</span>
    <h1>${esc(v.title)}</h1>
  </div>
</header>

<main class="wrap">
<article>

  <div class="lead">
${v.lead.map(p => `    <p>${p}</p>`).join('\n')}
  </div>

  <div class="answer">
    <b>세 줄 직답</b>
    <ul>
${v.answer3.map(a => `      <li>${a}</li>`).join('\n')}
    </ul>
  </div>

  <img src="/og/time-${v.slug}.png" alt="${esc(v.name)} ${esc(v.title.replace(/^[^,—]+[,—]\s*/, ''))}" width="1200" height="1200" style="max-width:100%;height:auto" loading="eager">

${factTable(v)}

${timeline(v)}

  <section class="ending" id="answer">
    <h2>${esc(v.ending.h2)}</h2>
${v.ending.ps.map(p => `    <p>${p}</p>`).join('\n')}
  </section>

  <section class="faqwrap" id="faq">
    <h2>자주 묻는 질문 셋</h2>
    <div class="faq">
${v.faq.map(f => `      <details><summary>${esc(f.q)}</summary><div class="a">${esc(f.a)}</div></details>`).join('\n')}
    </div>
  </section>

  <p class="oneline">${v.oneline}</p>

  <nav class="near">
    <b>같은 시간대를 다르게 쓰는 곳</b>
    <ul>
      <li><a href="/time/">전국 나이트 시간표 40 — 허브</a></li>
${rel.map(r => `      <li><a href="/time/${r.slug}/">${esc(r.title)}</a></li>`).join('\n')}
    </ul>
  </nav>

</article>
</main>

${footer(v)}
${callbar(v)}

</body>
</html>
`;
}

/* ── 허브 ── */
function hubPage() {
  const url = `${SITE}/time/`;
  const og = `${SITE}/og/time-${HUB.slug}.png`;
  const groups = {};
  for (const v of VENUES) (groups[v.group] = groups[v.group] || []).push(v);
  const itemList = {
    '@context': 'https://schema.org', '@type': 'ItemList', '@id': url + '#list',
    name: HUB.title, numberOfItems: VENUES.length,
    itemListElement: VENUES.map((v, i) => ({ '@type': 'ListItem', position: i + 1, name: v.name, url: `${SITE}/time/${v.slug}/` }))
  };
  const bc = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: HUB.h1, item: url }
    ]
  };
  return `<!DOCTYPE html>
<html lang="ko">
<head>
${head({ title: HUB.title, desc: HUB.desc, url, og, ogAlt: HUB.ogAlt, ogType: 'website' })}
<script type="application/ld+json">${JSON.stringify(itemList)}</script>
<script type="application/ld+json">${JSON.stringify(bc)}</script>
</head>
<body>

<header class="top">
  <div class="wrap">
    <nav class="crumb"><ol><li>밤 시간표 연구소</li><li>시간표 40</li></ol></nav>
    <span class="tag">시간·요일 축으로 다시 쓴 40곳</span>
    <h1>${esc(HUB.h1)}</h1>
  </div>
</header>

<main class="wrap">
<article>
  <img src="/og/time-${HUB.slug}.png" alt="${esc(HUB.h1)} 지역별 시간표 모음" width="1200" height="1200" style="max-width:100%;height:auto" loading="eager">

  <div class="lead">
${HUB.lead.map(p => `    <p>${p}</p>`).join('\n')}
  </div>

${Object.entries(groups).map(([g, list]) => `  <section class="hubsec">
    <h2>${esc(g)}</h2>
    <ul class="hublist">
${list.map(v => `      <li><a href="/time/${v.slug}/"><b>${esc(v.name)}</b><span>${esc(v.hubline)}</span></a></li>`).join('\n')}
    </ul>
  </section>`).join('\n\n')}

  <p class="oneline">${HUB.oneline}</p>
</article>
</main>

${footer(HUB)}
<div class="callbar"><a href="${KAKAO_URL}" rel="nofollow">💬 광고문의 카카오톡 ${KAKAO_ID}</a></div>

</body>
</html>
`;
}

/* ── 홈 ── */
function homePage() {
  const url = `${SITE}/`;
  const og = `${SITE}/og/time-${HOME.slug}.png`;
  const ad = ADVERTISERS['__home__'];
  const club = {
    '@context': 'https://schema.org', '@type': 'NightClub', '@id': url + '#nightclub',
    name: HOME.name, url, image: og, description: HOME.desc,
    telephone: '+82-' + ad.phone.slice(1).replace(/-/g, '-'),
    address: { '@type': 'PostalAddress', streetAddress: HOME.addr, addressLocality: HOME.locality, addressRegion: HOME.regionAdmin, addressCountry: 'KR' }
  };
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage', '@id': url + '#faq',
    mainEntity: HOME.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  };
  const site = {
    '@context': 'https://schema.org', '@type': 'WebSite', '@id': url + '#website',
    name: '밤 시간표 연구소', url, inLanguage: 'ko'
  };
  return `<!DOCTYPE html>
<html lang="ko">
<head>
${head({ title: HOME.title, desc: HOME.desc, url, og, ogAlt: HOME.ogAlt, ogType: 'website' })}
<script type="application/ld+json">${JSON.stringify(club)}</script>
<script type="application/ld+json">${JSON.stringify(faq)}</script>
<script type="application/ld+json">${JSON.stringify(site)}</script>
</head>
<body>

<header class="top home">
  <div class="wrap">
    <nav class="crumb"><ol><li>밤 시간표 연구소</li></ol></nav>
    <span class="tag">${esc(HOME.region)}</span>
    <h1>${esc(HOME.title)}</h1>
  </div>
</header>

<main class="wrap">
<article>

  <div class="lead">
${HOME.lead.map(p => `    <p>${p}</p>`).join('\n')}
  </div>

  <div class="answer">
    <b>세 줄 직답</b>
    <ul>
${HOME.answer3.map(a => `      <li>${a}</li>`).join('\n')}
    </ul>
  </div>

${factTable(HOME)}

${timeline(HOME)}

  <section class="ending" id="answer">
    <h2>${esc(HOME.ending.h2)}</h2>
${HOME.ending.ps.map(p => `    <p>${p}</p>`).join('\n')}
  </section>

  <section class="faqwrap" id="faq">
    <h2>자주 묻는 질문 셋</h2>
    <div class="faq">
${HOME.faq.map(f => `      <details><summary>${esc(f.q)}</summary><div class="a">${esc(f.a)}</div></details>`).join('\n')}
    </div>
  </section>

  <p class="oneline">${HOME.oneline}</p>

  <nav class="near">
    <b>전국 시간표로 넘어가기</b>
    <ul>
      <li><a href="/time/">전국 나이트 시간표 40 — 허브</a></li>
${HOME.related.map(s => VENUES.find(x => x.slug === s)).filter(Boolean).map(v => `      <li><a href="/time/${v.slug}/">${esc(v.title)}</a></li>`).join('\n')}
    </ul>
  </nav>

</article>
</main>

${footer(HOME)}
<div class="callbar"><a href="tel:${ad.phone.replace(/-/g, '')}">📞 ${esc(ad.label)} ${ad.phone}</a></div>

</body>
</html>
`;
}

/* ── 쓰기 ── */
const written = [];
for (const v of VENUES) {
  const dir = path.join(ROOT, 'time', v.slug);
  fs.mkdirSync(dir, { recursive: true });
  const html = page(v);
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  written.push([`/time/${v.slug}/`, html.length]);
}
fs.writeFileSync(path.join(ROOT, 'time', 'index.html'), hubPage(), 'utf8');
/* 홈(/)은 독립 성공스토리 단독 페이지다. 빌드가 덮어쓰지 않도록 src/home-story.html을 그대로 복사한다. */
fs.copyFileSync(path.join(ROOT, 'src', 'home-story.html'), path.join(ROOT, 'index.html'));

console.log(`✅ /time/ ${VENUES.length}개 + 허브 + 홈 생성`);
for (const [u, l] of written) console.log('  ' + u.padEnd(34) + (l / 1024).toFixed(1) + 'KB');
