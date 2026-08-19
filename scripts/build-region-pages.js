#!/usr/bin/env node
/* /night/<지역 slug>/ 13개 지역 키워드 페이지 생성기
   실행: node scripts/build-region-pages.js
   ★기존 /night/ 13개 업소 페이지는 읽지도 쓰지도 않는다. 새 디렉터리만 만든다. */

const fs = require('fs');
const path = require('path');
const { SITE, REGIONS } = require('./region-data.js');

const ROOT = path.resolve(__dirname, '..');
const TODAY = '2026-08-15';
const TODAY_KR = '2026년 8월 15일';
const KAKAO = 'besta12';

/* [12] 인증 메타 — 기존 페이지에서 grep 추출한 값 그대로 */
const VERIFY = `<meta name="naver-site-verification" content="f2ccb19e94081bc4ed40329b47b204cc3c71d646">
<meta name="naver-site-verification" content="00679a4e543c2a8cccca6c3d345da5d8c0a9e279">
<meta name="google-site-verification" content="HJjm7MRxykCQ7d_9L7glaTeeaWrmJIzAKY0BcNcfm88">`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function css(v) {
  const [bg1, bg2] = v.ogBg;
  return `*{margin:0;padding:0;box-sizing:border-box}
:root{--h1:${bg1};--h2:${bg2};--ac:${v.ogAccent};--ink:#17181C;--dim:#565A63;--line:#E4E6EA;--paper:#FFFFFF;--soft:#F5F6F8}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',system-ui,-apple-system,'Malgun Gothic',sans-serif;
  background:var(--paper);color:var(--ink);font-size:16px;line-height:1.7;word-break:keep-all;
  padding-bottom:calc(84px + env(safe-area-inset-bottom,0px))}
.wrap{max-width:820px;margin:0 auto;padding:0 18px}
a{color:#0F4C81}
.top{background:linear-gradient(150deg,var(--h1) 0%,var(--h2) 78%,var(--h1) 100%);color:#fff;padding:34px 0 30px;border-bottom:5px solid var(--ac)}
.crumb{font-size:13px;color:rgba(255,255,255,.78);margin-bottom:14px}
.crumb a{color:rgba(255,255,255,.92)}
.crumb ol{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin:0}
.crumb li+li::before{content:'\\203A';margin-right:6px;opacity:.6}
h1{font-size:26px;line-height:1.35;font-weight:900;letter-spacing:-.4px}
.tag{display:inline-block;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.38);color:#fff;
  font-size:12.5px;font-weight:700;padding:5px 11px;border-radius:999px;margin-bottom:12px}
.top .lead{margin-top:12px;color:rgba(255,255,255,.92);font-size:15.5px}
.top .lead p{margin-bottom:6px}
.stamp{margin-top:14px;font-size:12.5px;color:rgba(255,255,255,.8)}
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
.site-footer{border-top:1px solid var(--line);margin-top:34px;padding:22px 0 10px;color:#3A3F47;font-size:14px}
.footer-note{margin-bottom:8px}
.ad-inquiry{background:#ffd400;color:#111;font-weight:900;font-size:18px;
  padding:16px;text-align:center;border-radius:10px;margin:24px auto;max-width:720px;}
/* [14] 고정 전화바 — position:sticky 금지 / JS 스크롤 이벤트 없음 */
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

/* ── [13] JSON-LD 3종 : Article / FAQPage / BreadcrumbList ── */
function jsonld(v) {
  const url = `${SITE}/night/${v.slug}/`;
  const og = `${SITE}/og/${v.slug}-og.png`;
  const article = {
    '@context': 'https://schema.org', '@type': 'Article',
    '@id': url + '#article',
    headline: v.title,
    description: v.desc,
    inLanguage: 'ko-KR',
    datePublished: TODAY, dateModified: TODAY,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: og,
    about: { '@type': 'Place', name: v.area },
    mentions: [{ '@type': 'NightClub', name: v.venue.name, url: `${SITE}/night/${v.venue.slug}/` }]
  };
  if (v.age) article.audience = { '@type': 'Audience', name: v.venue.name + ' 출입 기준', suggestedMinAge: v.age };
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage', '@id': url + '#faq',
    mainEntity: v.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  };
  const bc = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: '나이트', item: SITE + '/night/' },
      { '@type': 'ListItem', position: 3, name: v.kw, item: url }
    ]
  };
  return [article, faq, bc].map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
}

/* ── [14] 고정바 — body 직계 자식으로 출력 ── */
function callbar(v) {
  if (v.group === 'A') {
    return `<div class="callbar" role="complementary" aria-label="전화 연결">
  <a href="tel:${v.staff.phone.replace(/-/g, '')}">\u{1F4DE} ${v.staff.nick} ${v.staff.phone}</a>
</div>`;
  }
  return `<div class="callbar" role="complementary" aria-label="광고 제휴 문의">
  <span>광고·제휴 입점 문의 카톡 <b>${KAKAO}</b></span>
</div>`;
}

function page(v, byNo) {
  const url = `${SITE}/night/${v.slug}/`;
  const og = `${SITE}/og/${v.slug}-og.png`;
  const rel = v.related.map(n => byNo[n]);

  const secs = v.sections.map((s, i) =>
    `  <section id="s${i + 1}" aria-labelledby="h-s${i + 1}">
    <h2 id="h-s${i + 1}">${esc(s.h2)}</h2>${s.html}
  </section>`).join('\n\n');

  const faqHtml = v.faq.map(f =>
    `      <details><summary>${esc(f.q)}</summary><div class="a">${esc(f.a)}</div></details>`).join('\n');

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
        <li><a href="/">홈</a></li>
        <li><a href="/night/">나이트</a></li>
        <li>${esc(v.kw)}</li>
      </ol>
    </nav>
    <span class="tag">${esc(v.area)}</span>
    <h1>${esc(v.kw)}</h1>
    <div class="lead">
${v.lead.map(l => `      <p>${l}</p>`).join('\n')}
    </div>
    <p class="stamp">최종 정리 <time datetime="${TODAY}">${TODAY_KR}</time></p>
  </div>
</header>

<main class="wrap">
<article>

  <div class="answer-box">
    <p><strong>${esc(v.kw)}</strong>는 ${esc(v.area)}의 나이트클럽 밤 문화를 뜻합니다. ${esc(v.answer2)}.</p>
  </div>

  <img src="/og/${v.slug}-og.png" alt="${esc(v.kw)} ${esc(v.area)} ${esc(v.suffix)}" width="1200" height="1200" style="max-width:100%;height:auto" loading="eager">

${secs}

  <section id="faq" aria-labelledby="h-faq">
    <h2 id="h-faq">${esc(v.kw)} 자주 묻는 질문</h2>
    <div class="faq">
${faqHtml}
    </div>
  </section>

  <div class="recap">
    <b>세 줄 요약</b>
    <ul>
${v.recap.map(l => `      <li>${esc(l)}</li>`).join('\n')}
    </ul>
  </div>

  ${v.tail}

  <aside aria-labelledby="h-aside">
    <h2 id="h-aside">같이 보면 좋은 지역</h2>
    <ul>
${rel.map(r => `      <li><a href="/night/${r.slug}/">${esc(r.kw)}</a> — ${esc(r.area)}</li>`).join('\n')}
      <li><a href="/night/${v.venue.slug}/">${esc(v.venue.name)}</a> — ${esc(v.venue.area)}</li>
    </ul>
  </aside>

</article>
</main>

<footer class="site-footer wrap">
  <div class="ad-inquiry">
    광고·제휴 입점 문의 &nbsp;|&nbsp; 카카오톡 ID <strong>${KAKAO}</strong>
  </div>
  <p class="footer-note">본 페이지는 업소 정보 제공 페이지입니다. 출입 연령 및 이용 규정은 각 업소 방침을 따릅니다.</p>
  <p class="footer-note">최종 수정 <time datetime="${TODAY}">${TODAY_KR}</time> · 공개된 웹 정보를 정리했으며 실제와 다를 수 있습니다.</p>
  <p class="footer-note"><a href="/night/">나이트 목록</a> · <a href="/">홈</a></p>
</footer>

${callbar(v)}

</body>
</html>
`;
}

const byNo = Object.fromEntries(REGIONS.map(v => [v.no, v]));
const outs = [];
for (const v of REGIONS) {
  const dir = path.join(ROOT, 'night', v.slug);
  if (fs.existsSync(path.join(dir, 'index.html')) && !process.env.REGION_OVERWRITE) {
    // 기존 업소 페이지와 충돌하는지 최종 확인
    const cur = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    if (!cur.includes('#article')) {
      console.error('❌ slug 충돌: /night/' + v.slug + '/ 에 다른 페이지가 있다. 중단.');
      process.exit(1);
    }
  }
  fs.mkdirSync(dir, { recursive: true });
  const html = page(v, byNo);
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  outs.push([`/night/${v.slug}/`, html.length]);
}

console.log('✅ 지역 페이지 13종 생성 완료');
for (const [u, l] of outs) console.log('  ' + u.padEnd(30) + (l / 1024).toFixed(1) + 'KB');
