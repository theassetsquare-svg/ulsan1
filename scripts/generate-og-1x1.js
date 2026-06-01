const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SIZE = 1200;
const OUT_PUBLIC = path.join(__dirname, '..', 'public', 'og');
const OUT_ROOT = path.join(__dirname, '..', 'og');

const pages = [
  { file: 'main.png', sub: '울산챔피언나이트 가이드' },
  { file: 'dresscode.png', sub: '드레스코드 가이드' },
  { file: 'budget.png', sub: '예산 가이드' },
  { file: 'timing.png', sub: '시간대 가이드' },
  { file: 'parking.png', sub: '주차·교통 가이드' },
  { file: 'manners.png', sub: '매너 가이드' },
  { file: 'nearby.png', sub: '주변 코스 가이드' },
  { file: 'compare.png', sub: '울산 나이트 비교' },
];

const FONT = 'Noto Sans KR, sans-serif';

async function generate() {
  for (const p of pages) {
    const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F1F33"/>
      <stop offset="100%" stop-color="#1E3A5F"/>
    </linearGradient>
  </defs>

  <!-- 배경 -->
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>

  <!-- 장식 -->
  <circle cx="975" cy="195" r="150" fill="rgba(201,169,110,0.06)"/>
  <circle cx="225" cy="1005" r="105" fill="rgba(201,169,110,0.06)"/>
  <circle cx="450" cy="135" r="3" fill="#C9A96E" opacity="0.5"/>
  <circle cx="1050" cy="600" r="4" fill="#C9A96E" opacity="0.3"/>
  <circle cx="150" cy="525" r="3" fill="#C9A96E" opacity="0.4"/>
  <circle cx="750" cy="1050" r="3" fill="#C9A96E" opacity="0.3"/>

  <!-- 상단 영문 로고 -->
  <text x="600" y="120" text-anchor="middle" fill="rgba(201,169,110,0.12)" font-size="72" font-weight="800" font-family="${FONT}">CHAMPION NIGHT</text>

  <!-- ★ 춘자 — 메인! 크게! ★ -->
  <text x="600" y="585" text-anchor="middle" fill="#C9A96E" font-size="330" font-weight="900" font-family="${FONT}">춘자</text>

  <!-- 골드 밑줄 -->
  <rect x="330" y="645" width="540" height="6" rx="3" fill="#C9A96E" opacity="0.5"/>

  <!-- 서브타이틀 -->
  <text x="600" y="780" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="51" font-weight="700" font-family="${FONT}">${p.sub}</text>

  <!-- 전화번호 -->
  <text x="600" y="878" text-anchor="middle" fill="rgba(201,169,110,0.6)" font-size="39" font-weight="600" font-family="${FONT}">010-5653-0069</text>

  <!-- 하단 브랜딩 -->
  <rect x="120" y="${SIZE - 18}" width="${SIZE - 240}" height="4" rx="2" fill="#C9A96E" opacity="0.3"/>
  <text x="600" y="${SIZE - 45}" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="30" font-family="${FONT}">울산챔피언나이트 | 놀쿨 NOLCOOL</text>
</svg>`;

    const buf = await sharp(Buffer.from(svg)).png().toBuffer();
    fs.writeFileSync(path.join(OUT_PUBLIC, p.file), buf);
    fs.writeFileSync(path.join(OUT_ROOT, p.file), buf);
    console.log(`✅ ${p.file} (${SIZE}x${SIZE})`);
  }
  console.log('\n전체 완료!');
}

generate().catch(console.error);
