#!/usr/bin/env node
/* 정적 페이지 빌더 — src/index.template.html → index.html + /<slug>/index.html × 8
   목적: 각 URL이 실제 파일로 존재 = JS 없이도 해당 페이지 HTML 그대로 응답.
   canonical / title / meta / og / JSON-LD 전부 페이지별로 head에 박아서 출력한다.
   실행: node scripts/build-pages.js  (출력물은 커밋 대상) */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://ulsanf.pages.dev';
const THUMB_NAME = '울산챔피언나이트';   /* 썸네일 alt에 반드시 들어가는 가게이름 */
const TPL = path.join(ROOT, 'src/index.template.html');
/* app.js 캐시버스터 — 내용 해시로 자동 생성.
   _headers가 /*.js를 immutable(1년)로 주기 때문에 버전이 안 바뀌면 브라우저·서비스워커가
   옛 app.js를 계속 쓴다. 라우팅 표가 낡으면 주소가 메인으로 튕긴다 — 그 사고의 재발 방지. */
const ASSET_VERSION = require('crypto')
  .createHash('md5')
  .update(fs.readFileSync(path.join(ROOT, 'app.js')))
  .digest('hex')
  .slice(0, 10);

/* 슬러그 → 빵부스러기(breadcrumb)에 쓸 페이지 이름 */
const NAMES = {
  dresscodea: '드레스코드',
  budgeta: '예산',
  timinga: '시간대',
  parkinga: '주차·교통',
  mannersa: '매너',
  nearbya: '주변 코스',
  comparea: '나이트 비교',
  legala: '합법 운영 안내',
};

const tpl = fs.readFileSync(TPL, 'utf8');

/* ---- 1. article 블록 추출 (page-main + 8개 서브) ---- */
const ARTICLE_RE = /<article class="page" id="page-([a-z]+)"[\s\S]*?<\/article>/g;
const articles = [];
let m;
while ((m = ARTICLE_RE.exec(tpl)) !== null) {
  articles.push({ id: m[1], html: m[0], start: m.index, end: m.index + m[0].length });
}
if (articles.length < 2) {
  console.error('❌ article 블록을 찾지 못했다. 템플릿 구조 확인 필요.');
  process.exit(1);
}

function attr(html, name) {
  const r = new RegExp(name + '="([^"]*)"');
  const mm = html.match(r);
  return mm ? mm[1] : '';
}

/* HTML 속성값에 안전하게 넣기 */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
/* JSON 문자열에 안전하게 넣기 */
function jesc(s) {
  return JSON.stringify(s).slice(1, -1);
}

const pages = articles.map((a) => {
  const open = a.html.slice(0, a.html.indexOf('>') + 1);
  const slug = a.id === 'main' ? '' : a.id;
  return {
    id: a.id,
    slug,
    url: slug ? SITE + '/' + slug : SITE + '/',
    og: SITE + '/' + attr(open, 'data-og'),
    title: attr(open, 'data-title'),
    desc: attr(open, 'data-desc'),
    hero: attr(open, 'data-hero'),
    sub: attr(open, 'data-sub'),
    name: NAMES[a.id] || '',
  };
});

/* ---- 2. 페이지별 HTML 생성 ---- */
function build(page) {
  /* 2-1. 다른 페이지 article 전부 제거 → 페이지마다 고유 본문만 남는다 (중복 콘텐츠 방지) */
  let out = '';
  let cursor = 0;
  for (const a of articles) {
    out += tpl.slice(cursor, a.start);
    if (a.id === page.id) out += a.html;
    cursor = a.end;
  }
  out += tpl.slice(cursor);

  /* 2-2. head 메타 — 전부 이 페이지 값으로 교체 */
  const T = esc(page.title);
  const D = esc(page.desc);
  const rep = [
    [/<title>[\s\S]*?<\/title>/, `<title>${T}</title>`],
    [/<meta name="description" content="[^"]*">/, `<meta name="description" content="${D}">`],
    [/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${T}">`],
    [/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${D}">`],
    [/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${page.url}">`],
    [/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${page.og}">`],
    [/<meta property="og:image:secure_url" content="[^"]*">/, `<meta property="og:image:secure_url" content="${page.og}">`],
    [/<meta name="thumbnail" content="[^"]*">/, `<meta name="thumbnail" content="${page.og}">`],
    [/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${T}">`],
    [/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${D}">`],
    [/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${page.og}">`],
    [/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${page.url}">`],
    [/<link rel="image_src" href="[^"]*">/, `<link rel="image_src" href="${page.og}">`],
    [/<link rel="preload" href="https:\/\/ulsanf\.pages\.dev\/og\/[^"]*" as="image" fetchpriority="high">/,
      `<link rel="preload" href="${page.og}" as="image" fetchpriority="high">`],
    /* JS 없이도 해당 페이지가 보이도록 라우팅 클래스를 서버 응답에 박는다 */
    [/<html lang="ko"[^>]*>/, `<html lang="ko" class="r-${page.slug || 'main'}">`],
    /* 히어로 카피도 페이지별로 (JS 실행 전 CLS·빈 텍스트 방지) */
    [/<h1 id="hero-title">[\s\S]*?<\/h1>/, `<h1 id="hero-title"><em>울산챔피언나이트</em> ${esc(page.hero)}</h1>`],
    [/<p class="hero-sub" id="hero-sub">[\s\S]*?<\/p>/,
      `<p class="hero-sub" id="hero-sub">${esc(page.sub)}</p>\n` +
      /* 네이버 썸네일 조건: og:image와 같은 파일을 본문에도 실제로 넣는다 (h1 바로 아래) */
      `<img src="/og/${page.og.split('/og/')[1]}" alt="${esc(THUMB_NAME + ' ' + page.hero)}" width="1200" height="1200" style="max-width:100%;height:auto" loading="eager">`],
    [/<meta property="og:image:alt" content="[^"]*">/,
      `<meta property="og:image:alt" content="${esc(THUMB_NAME + ' ' + page.hero)}">`],
    /* 캐시버스터 */
    [/<script src="\/app\.js[^"]*" defer><\/script>/, `<script src="/app.js?v=${ASSET_VERSION}" defer></script>`],
  ];
  for (const [re, val] of rep) {
    if (!re.test(out)) {
      console.error('❌ 치환 실패 — 템플릿에서 패턴을 못 찾음: ' + re);
      process.exit(1);
    }
    out = out.replace(re, val);
  }

  /* 2-3. JSON-LD — Article / BreadcrumbList를 이 페이지 기준으로 */
  if (page.slug) {
    out = out
      .replace('"@id": "https://ulsanf.pages.dev/#article"', `"@id": "${page.url}#article"`)
      .replace(/"headline": "[^"]*"/, `"headline": "${jesc(page.title)}"`)
      .replace(/"@type": "Article",([\s\S]{0,200}?)"description": "[^"]*"/, `"@type": "Article",$1"description": "${jesc(page.desc)}"`)
      .replace('"mainEntityOfPage": "https://ulsanf.pages.dev/"', `"mainEntityOfPage": "${page.url}"`)
      .replace('"@id": "https://ulsanf.pages.dev/#breadcrumb"', `"@id": "${page.url}#breadcrumb"`)
      .replace(/("@id": "[^"]*#breadcrumb",\s*"itemListElement": )\[[\s\S]*?\]/,
        `$1[\n        {"@type":"ListItem","position":1,"name":"홈","item":"${SITE}/"},\n        {"@type":"ListItem","position":2,"name":"${jesc(page.name)}","item":"${page.url}"}\n      ]`);
    /* Article 대표 이미지도 페이지 og로 */
    out = out.replace(/("@type": "ImageObject",\s*"url": ")https:\/\/ulsanf\.pages\.dev\/og\/main\.png(",\s*"width": 1200,\s*"height": 1200\s*\}\s*\}\s*,\s*\{\s*"@type": "BreadcrumbList")/,
      `$1${page.og}$2`);
  }

  return out;
}

/* ---- 3. 파일 쓰기 ---- */
const written = [];
for (const page of pages) {
  /* 홈(/)은 독립 성공스토리 단독 페이지(src/home-story.html)로 분리됐다.
     여기서 다시 만들면 그 페이지를 덮어쓰므로 루트는 건너뛴다. */
  if (!page.slug) continue;
  const html = build(page);
  /* <slug>.html 로 쓴다. Cloudflare Pages가 /<slug> 요청에 이 파일을 200으로 바로 준다.
     <slug>/index.html 로 두면 /<slug> → /<slug>/ 로 308 리다이렉트가 붙어
     canonical(슬래시 없음)과 어긋나고 홉이 하나 더 생긴다. */
  const file = page.slug ? path.join(ROOT, page.slug + '.html') : path.join(ROOT, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, 'utf8');
  written.push([page.url, path.relative(ROOT, file), html.length]);
}

console.log('✅ 정적 페이지 생성 완료 (app.js?v=' + ASSET_VERSION + ')');
for (const [url, file, len] of written) {
  console.log(`  ${url.padEnd(40)} → ${file.padEnd(24)} ${(len / 1024).toFixed(1)}KB`);
}
