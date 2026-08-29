#!/usr/bin/env node
/* sitemap.xml 갱신(홈+허브+40 추가, 기존 URL 보존) · llms.txt 재작성 · IndexNow 키 파일 생성
   실행: node scripts/time-seo.js */
const fs = require('fs');
const path = require('path');
const { SITE, TODAY, VENUES, HUB, HOME, KAKAO_ID } = require('./time-data.js');

const ROOT = path.resolve(__dirname, '..');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ── 1. sitemap ── */
const raw = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const blocks = [...raw.matchAll(/<url>[\s\S]*?<\/url>/g)].map(m => m[0]);
const homeLoc = `<loc>${SITE}/</loc>`;
const kept = blocks.filter(b => !b.includes(homeLoc) && !b.includes('/area/time/'));

function urlBlock(loc, lastmod, priority, changefreq, img, caption, title) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <image:image>
      <image:loc>${img}</image:loc>
      <image:caption>${esc(caption)}</image:caption>
      <image:title>${esc(title)}</image:title>
    </image:image>
  </url>`;
}

const fresh = [];
fresh.push(urlBlock(`${SITE}/`, TODAY, '1.0', 'daily', `${SITE}/og/time-home.png`, HOME.title, HOME.name));
fresh.push(urlBlock(`${SITE}/time/`, TODAY, '0.9', 'daily', `${SITE}/og/time-hub.png`, HUB.title, HUB.h1));
for (const v of VENUES) {
  fresh.push(urlBlock(`${SITE}/time/${v.slug}/`, TODAY, '0.8', 'weekly', `${SITE}/og/time-${v.slug}.png`, v.title, v.name));
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${fresh.join('\n')}
${kept.join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
fs.mkdirSync(path.join(ROOT, 'public'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), sitemap, 'utf8');

/* ── 2. llms.txt ── */
const nightDirs = fs.existsSync(path.join(ROOT, 'night'))
  ? fs.readdirSync(path.join(ROOT, 'night')).filter(d => fs.existsSync(path.join(ROOT, 'night', d, 'index.html')))
  : [];

const llms = `# 밤 시간표 연구소 (Night Timetable Lab)

> 전국 나이트 40곳을 시간·요일 축으로만 정리한 사이트. 오픈 직후부터 마감 흐름까지 구간별로 나눠 서술하며, 공개 자료에서 확인된 항목만 싣고 확인되지 않은 항목은 "확인 불가"로 남긴다.

## 사이트
- URL: ${SITE}/
- 허브: ${SITE}/time/  (전국 나이트 시간표 40)
- 홈: 울산챔피언나이트 — 요일마다 공기가 바뀐다
- 광고문의: 카카오톡 ${KAKAO_ID}
- 갱신일: ${TODAY}

## 원칙
- 방문자 수·잔여석·별점·요금 등 확인되지 않은 수치는 쓰지 않는다.
- 특정 시각을 단정하지 않고 일반적인 나이트 흐름(오픈 → 상승 → 정점 → 변곡 → 마감 → 요일 비교)으로 서술한다.
- 주소·역·층·연령 기준은 공개 자료에서 확인된 값만 표기하고, 나머지는 "공개 정보로 확인 불가"로 명시한다.

## 페이지 40 (제목 · URL)
${VENUES.map(v => `- ${v.title} — ${SITE}/time/${v.slug}/`).join('\n')}

## 허브
- ${HUB.title} — ${SITE}/time/

## 참고: 기존 지역 안내 페이지
${nightDirs.map(d => `- ${SITE}/night/${d}/`).join('\n')}
`;
fs.writeFileSync(path.join(ROOT, 'llms.txt'), llms, 'utf8');

/* ── 3. IndexNow 키 ── */
const KEYFILE = path.join(__dirname, 'time-indexnow-key.txt');
let key;
if (fs.existsSync(KEYFILE)) {
  key = fs.readFileSync(KEYFILE, 'utf8').trim();
} else {
  key = require('crypto').randomBytes(16).toString('hex');
  fs.writeFileSync(KEYFILE, key, 'utf8');
}
fs.writeFileSync(path.join(ROOT, `${key}.txt`), key, 'utf8');

/* 제출용 URL 목록 */
const urls = [`${SITE}/`, `${SITE}/time/`, ...VENUES.map(v => `${SITE}/time/${v.slug}/`)];
fs.writeFileSync(path.join(__dirname, 'time-indexnow.json'), JSON.stringify({
  host: SITE.replace('https://', ''), key, keyLocation: `${SITE}/${key}.txt`, urlList: urls
}, null, 1));

console.log(`✅ sitemap ${fresh.length}건 신규 + ${kept.length}건 보존 (총 ${fresh.length + kept.length})`);
console.log(`✅ llms.txt (40 페이지 + 허브)`);
console.log(`✅ IndexNow key ${key} → /${key}.txt · 제출 URL ${urls.length}건`);
