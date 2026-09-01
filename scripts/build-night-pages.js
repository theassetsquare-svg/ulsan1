#!/usr/bin/env node
/* /night/<slug>/ 13개 페이지 + /night/ 목록 생성기
   실행: node scripts/build-night-pages.js
   ★기존 파일은 건드리지 않는다. night/ 디렉터리만 새로 쓴다. */

const fs = require('fs');
const path = require('path');
const { SITE, VENUES } = require('./night-data.js');

const ROOT = path.resolve(__dirname, '..');
const TODAY = '2026-08-15';
const KAKAO = 'besta12';

const VERIFY = `<meta name="naver-site-verification" content="f2ccb19e94081bc4ed40329b47b204cc3c71d646">
<meta name="naver-site-verification" content="00679a4e543c2a8cccca6c3d345da5d8c0a9e279">
<meta name="google-site-verification" content="HJjm7MRxykCQ7d_9L7glaTeeaWrmJIzAKY0BcNcfm88">`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const je = (s) => JSON.stringify(String(s)).slice(1, -1);

/* ─────────────── 공통 스타일 ───────────────
   [12] 고정바 CSS는 지정된 규격 그대로. position:sticky·JS 스크롤 금지. */
function css(v) {
  const [bg1, bg2] = v.ogBg;
  return `*{margin:0;padding:0;box-sizing:border-box}
:root{--h1:${bg1};--h2:${bg2};--ac:${v.ogAccent};--ink:#17181C;--dim:#565A63;--line:#E4E6EA;--paper:#FFFFFF;--soft:#F5F6F8}
html{scroll-behavior:smooth;-webkit-text-size-adjust:전부}
body{font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',system-ui,-apple-system,'Malgun Gothic',sans-serif;
  background:var(--paper);color:var(--ink);font-size:16px;line-height:1.7;word-break:keep-all;
  padding-bottom:calc(84px + env(safe-area-inset-bottom,0px))}
.wrap{max-width:820px;margin:0 auto;padding:0 18px}
a{color:#0F4C81}
.top{background:linear-gradient(150deg,var(--h1) 0%,var(--h2) 78%,var(--h1) 100%);color:#fff;padding:34px 0 30px;border-bottom:5px solid var(--ac)}
.crumb{font-size:13px;color:rgba(255,255,255,.78);margin-bottom:14px}
.crumb a{color:rgba(255,255,255,.92)}
.crumb ol{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin:0}
.crumb li+li::before{content:'›';margin-right:6px;opacity:.6}
h1{font-size:26px;line-height:1.35;font-weight:900;letter-spacing:-.4px}
.tag{display:inline-block;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.38);color:#fff;
  font-size:12.5px;font-weight:700;padding:5px 11px;border-radius:999px;margin-bottom:12px}
.top .lead{margin-top:12px;color:rgba(255,255,255,.9);font-size:15.5px}
.top .lead p{margin-bottom:6px}
.stamp{margin-top:14px;font-size:12.5px;color:rgba(255,255,255,.72)}
.answer-box{background:var(--soft);border:2px solid var(--h2);border-left-width:8px;border-radius:12px;padding:18px 16px;margin:26px 0}
.answer-box p{font-size:16px;margin:0}
main section{margin:32px 0}
h2{font-size:20.5px;font-weight:800;line-height:1.4;margin-bottom:12px;letter-spacing:-.3px}
h2::before{content:'';display:block;width:36px;height:4px;background:var(--h2);border-radius:2px;margin-bottom:10px}
p{margin-bottom:13px}
ul,ol{margin:0 0 15px 20px}li{margin-bottom:7px}
.tablewrap{overflow-x:auto;margin:16px 0}
table{width:100%;border-collapse:collapse;font-size:15.5px;min-width:380px}
caption{text-align:left;font-weight:700;font-size:15px;padding-bottom:8px;color:var(--dim)}
th,td{border:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top}
th{background:var(--soft);font-weight:700}
.faq{border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-top:14px}
.faq details{border-bottom:1px solid var(--line)}
.faq details:last-child{border-bottom:0}
.faq summary{cursor:pointer;padding:15px 16px;font-weight:700;font-size:16px;min-height:44px;display:flex;align-items:center;gap:8px}
.faq .a{padding:0 16px 15px;color:#3A3F47;font-size:15.5px}
.recap{background:var(--soft);border-radius:12px;padding:16px 18px;margin:26px 0;border:1px solid var(--line)}
.recap ul{margin:8px 0 0 18px}
aside{border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:26px 0}
aside h2{font-size:17px}
aside h2::before{width:26px;height:3px}
aside ul{margin:6px 0 0 18px}
footer{border-top:1px solid var(--line);margin-top:34px;padding:22px 0 10px;color:var(--dim);font-size:14px}
footer p{margin-bottom:8px}
.ad-inquiry{background:#111318;color:#F7F8FA;border-radius:12px;padding:15px 16px;margin:14px 0;font-size:15px;line-height:1.6}
.ad-inquiry b{color:#FFFFFF;font-weight:800;letter-spacing:.3px}
/* ── [12] 고정 전화바 ── */
.callbar{
  position:fixed; left:0; right:0; bottom:0; z-index:99999;
  display:flex; align-items:center; justify-content:center; gap:12px;
  height:64px; box-sizing:content-box;
  padding-bottom:env(safe-area-inset-bottom,0px);
  background:#111; color:#fff; font-weight:800; font-size:18px;
  box-shadow:0 -2px 14px rgba(0,0,0,.35);
  transform:translateZ(0); backface-visibility:hidden;
}
.callbar a{color:#fff; text-decoration:none; display:flex; align-items:center; height:100%;}
body{ padding-bottom:calc(84px + env(safe-area-inset-bottom,0px)); }
@media(max-width:480px){
  .callbar{height:60px; font-size:16px;}
  body{ padding-bottom:calc(80px + env(safe-area-inset-bottom,0px)); }
}
@media(min-width:768px){h1{font-size:32px}h2{font-size:23px}body{font-size:17px}}`;
}

/* ─────────────── JSON-LD 3종 ─────────────── */
function jsonld(v) {
  const url = `${SITE}/night/${v.slug}/`;
  const og = `${SITE}/og/${v.slug}-og.png`;
  const club = {
    '@context': 'https://schema.org', '@type': 'NightClub',
    '@id': url + '#nightclub',
    name: v.name, url, image: og, description: v.desc,
    address: { '@type': 'PostalAddress', addressLocality: v.locality, addressRegion: v.regionAdmin, addressCountry: 'KR' }
  };
  if (v.group === 'A') club.telephone = '+82-' + v.staff.phone.replace(/^0/, '').replace(/-/g, '-');
  if (v.age) club.typicalAgeRange = v.age;
  if (v.openingHours) club.openingHours = v.openingHours;

  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage', '@id': url + '#faq',
    mainEntity: v.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  };
  const bc = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '나이트', item: SITE + '/night/' },
      { '@type': 'ListItem', position: 2, name: v.name, item: url }
    ]
  };
  return [club, faq, bc].map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
}

/* ─────────────── 고정바 ─────────────── */
function callbar(v) {
  if (v.group === 'A') {
    return `<div class="callbar" role="complementary" aria-label="전화 연결">
  <a href="tel:${v.staff.phone.replace(/-/g, '')}">📞 ${v.staff.nick} ${v.staff.phone}</a>
</div>`;
  }
  return `<div class="callbar" role="complementary" aria-label="광고 제휴 문의">
  <span>광고·제휴 입점 문의 카톡 <b>${KAKAO}</b></span>
</div>`;
}

/* ─────────────── 페이지 ─────────────── */
function page(v) {
  const url = `${SITE}/night/${v.slug}/`;
  const og = `${SITE}/og/${v.slug}-og.png`;
  const byName = Object.fromEntries(VENUES.map(x => [x.slug, x]));
  const rel = v.related.map(s => byName[s]);

  const secs = v.sections.map((s, i) =>
    `  <section id="s${i + 1}" aria-labelledby="h-s${i + 1}">
    <h2 id="h-s${i + 1}">${esc(s.h2)}</h2>${s.html}
  </section>`).join('\n\n');

  const faqHtml = v.faq.map(f =>
    `      <details><summary>${esc(f.q)}</summary><div class="a">${esc(f.a)}</div></details>`).join('\n');

  const recapLines = v.group === 'A'
    ? [`${v.name}는 ${v.region}에 있다.`,
       `자리는 도착 시각에 따라 갈린다.`,
       `예약·문의는 ${v.staff.nick} ${v.staff.phone}.`]
    : [`${v.name}는 ${v.region}에 있다.`,
       `인원과 도착 시각을 먼저 정하면 밤이 편해진다.`,
       `자리 종류는 목적에 맞춰 고르는 게 기준이다.`];

  const tail = v.group === 'A'
    ? `<p>${esc(v.name)} 예약·문의는 <strong>${esc(v.staff.nick)} ${esc(v.staff.phone)}</strong>로 연락하면 된다. 통화 한 통이면 자리까지 정리된다.</p>`
    : `<p>${esc(v.name)} 방문 계획은 요일과 인원부터 정하는 게 순서다. 그 두 가지가 정해지면 나머지는 현장에서 맞춰진다.</p>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(v.title)}</title>
<meta name="description" content="${esc(v.desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(v.title)}">
<meta property="og:description" content="${esc(v.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="ko_KR">
<meta property="og:image" content="${og}">
<meta property="og:image:secure_url" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="${esc(v.ogAlt)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(v.title)}">
<meta name="twitter:description" content="${esc(v.desc)}">
<meta name="twitter:image" content="${og}">
<meta name="thumbnail" content="${og}">
${VERIFY}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>${css(v)}</style>
${jsonld(v)}
</head>
<body>

<header class="top">
  <div class="wrap">
    <nav class="crumb" aria-label="현재 위치">
      <ol>
        <li><a href="/night/">나이트</a></li>
        <li>${esc(v.name)}</li>
      </ol>
    </nav>
    <span class="tag">${esc(v.region)}</span>
    <h1>${esc(v.name)}</h1>
    <div class="lead">
${v.lead.map(l => `      <p>${l}</p>`).join('\n')}
    </div>
    <p class="stamp">최종 정리 <time datetime="${TODAY}">${TODAY}</time></p>
  </div>
</header>

<main class="wrap">
<article>

  <div class="answer-box">
    <p><strong>${esc(v.name)}</strong>은 ${esc(v.region)}에 있는 나이트클럽입니다. ${esc(v.answer2)}.${v.age ? ` 출입은 <strong>${esc(v.age)}</strong>만 가능합니다.` : ''}</p>
  </div>

  <img src="/og/${v.slug}-og.png" alt="${esc(v.name)} ${esc(v.region)} ${esc(v.suffix)}" width="1200" height="1200" style="max-width:100%;height:auto" loading="eager">

${secs}

  <section id="faq" aria-labelledby="h-faq">
    <h2 id="h-faq">${esc(v.name)} 자주 묻는 질문</h2>
    <div class="faq">
${faqHtml}
    </div>
  </section>

  <div class="recap">
    <b>세 줄 요약</b>
    <ul>
${recapLines.map(l => `      <li>${esc(l)}</li>`).join('\n')}
    </ul>
  </div>

  ${tail}

  <aside aria-labelledby="h-aside">
    <h2 id="h-aside">같이 보면 좋은 나이트</h2>
    <ul>
${rel.map(r => `      <li><a href="/night/${r.slug}/">${esc(r.name)}</a> — ${esc(r.region)}</li>`).join('\n')}
      <li><a href="/night/">나이트 목록 전체 보기</a></li>
    </ul>
  </aside>

</article>
</main>

<footer class="wrap">
  <p>이 페이지는 ${esc(v.name)} 방문 안내 목적으로 작성됐다. 요금과 운영 조건은 현장 기준이 우선한다.</p>
  <div class="ad-inquiry">광고·제휴 입점 문의 카톡 <b>${KAKAO}</b> — 업소 사장님 대상 채널입니다. 손님 예약 문의는 받지 않습니다.</div>
  <p><a href="/night/">나이트 목록</a></p>
</footer>

${callbar(v)}

</body>
</html>
`;
}

/* ─────────────── /night/ 목록 ─────────────── */
function indexPage() {
  const rows = VENUES.map(v =>
    `      <li><a href="/night/${v.slug}/">${esc(v.name)}</a> — ${esc(v.region)} · ${esc(v.suffix)}</li>`).join('\n');
  // 다음 자리(지역 키워드) 13페이지 — 목록에서 1단계로 도달해야 한다
  let regionRows = '';
  try {
    const { REGIONS } = require('./region-data.js');
    regionRows = `  <section id="region" aria-labelledby="h-region">
    <h2 id="h-region">지역 키워드로 보는 나이트 13곳</h2>
    <ul>
${REGIONS.map(v => `      <li><a href="/night/${v.slug}/">${esc(v.kw)}</a> — ${esc(v.area)} · ${esc(v.suffix)}</li>`).join('\n')}
    </ul>
  </section>
`;
  } catch (e) { regionRows = ''; }
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>나이트 안내 목록 — 전국 13곳 방문 정보</title>
<meta name="description" content="전국 나이트클럽 13곳의 방문 안내를 한곳에 모았다. 지역별 홀 구조와 좌석, 시간대, 예약 순서를 업소마다 따로 정리한 목록 페이지다.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${SITE}/night/">
<meta property="og:type" content="website">
<meta property="og:title" content="나이트 안내 목록 — 전국 13곳 방문 정보">
<meta property="og:description" content="전국 나이트클럽 13곳의 방문 안내를 한곳에 모았다. 지역별 홀 구조와 좌석, 시간대, 예약 순서를 업소마다 따로 정리한 목록 페이지다.">
<meta property="og:url" content="${SITE}/night/">
<meta property="og:locale" content="ko_KR">
<meta property="og:image" content="${SITE}/og/night-hub-og.png">
<meta property="og:image:secure_url" content="${SITE}/og/night-hub-og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="나이트 안내 목록 전국 13곳 방문 정보">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="나이트 안내 목록 — 전국 13곳 방문 정보">
<meta name="twitter:description" content="전국 나이트클럽 13곳의 방문 안내를 한곳에 모았다. 지역별 홀 구조와 좌석, 시간대, 예약 순서를 업소마다 따로 정리한 목록 페이지다.">
<meta name="twitter:image" content="${SITE}/og/night-hub-og.png">
<meta name="thumbnail" content="${SITE}/og/night-hub-og.png">
${VERIFY}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>${css({ ogBg: ['#15171C', '#374151'], ogAccent: '#9CA3AF' })}</style>
</head>
<body>
<header class="top"><div class="wrap">
  <nav class="crumb" aria-label="현재 위치"><ol><li>나이트</li></ol></nav>
  <h1>나이트 안내 목록</h1>
  <div class="lead"><p>업소마다 홀 구조와 자리 배정 방식이 다르다. 그 차이를 지역별로 나눠 정리했다.</p></div>
  <p class="stamp">최종 정리 <time datetime="${TODAY}">${TODAY}</time></p>
</div></header>
<main class="wrap"><article>
  <img src="/og/night-hub-og.png" alt="나이트 안내 목록 전국 13곳 방문 정보" width="1200" height="1200" style="max-width:100%;height:auto" loading="eager">

  <section id="list" aria-labelledby="h-list">
    <h2 id="h-list">지역별 나이트 13곳</h2>
    <ul>
${rows}
    </ul>
  </section>
${regionRows}  <aside aria-labelledby="h-a"><h2 id="h-a">안내</h2>
    <ul><li>각 페이지의 위치·운영 정보는 공개된 자료에서 확인된 항목만 실었다.</li></ul>
  </aside>
</article></main>
<footer class="wrap">
  <p>업소별 세부 조건은 현장 기준이 우선한다.</p>
  <div class="ad-inquiry">광고·제휴 입점 문의 카톡 <b>${KAKAO}</b> — 업소 사장님 대상 채널입니다.</div>
</footer>
<div class="callbar" role="complementary" aria-label="광고 제휴 문의">
  <span>광고·제휴 입점 문의 카톡 <b>${KAKAO}</b></span>
</div>
</body>
</html>
`;
}

/* ─────────────── 쓰기 ─────────────── */
const outs = [];
for (const v of VENUES) {
  const dir = path.join(ROOT, 'night', v.slug);
  fs.mkdirSync(dir, { recursive: true });
  const html = page(v);
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  outs.push([`/night/${v.slug}/`, html.length]);
}
fs.mkdirSync(path.join(ROOT, 'night'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'night', 'index.html'), indexPage(), 'utf8');

console.log('✅ night 페이지 생성 완료');
for (const [u, l] of outs) console.log('  ' + u.padEnd(38) + (l / 1024).toFixed(1) + 'KB');
console.log('  /night/ (목록)');
