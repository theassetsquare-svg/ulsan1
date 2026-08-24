/**
 * OG 썸네일 생성기 — 1200x1200 (1:1)
 * 네이버/카카오/구글 검색 썸네일용.
 * 모든 페이지에 닉네임 "춘자" + 전화번호 "010-5653-0069"를 크게 노출한다.
 *
 * 실행: node scripts/generate-og-1x1.js
 *   한글 폰트(scripts/fonts/NotoSansKR-Bold.ttf)를 fontconfig에 자동 등록한다.
 *   등록이 안 되면 sharp가 한글을 두부(□)로 렌더링하므로 반드시 확인할 것.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

/* ---- 한글 폰트 자동 등록 (fontconfig) ---- */
const FONT_DIR = path.join(__dirname, 'fonts');
if (!process.env.FONTCONFIG_FILE) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ogfc-'));
  const conf = path.join(tmp, 'fonts.conf');
  fs.writeFileSync(conf, `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${FONT_DIR}</dir>
  <cachedir>${path.join(tmp, 'cache')}</cachedir>
  <match target="pattern">
    <test qual="any" name="family"><string>sans-serif</string></test>
    <edit name="family" mode="prepend" binding="strong"><string>Noto Sans KR</string></edit>
  </match>
</fontconfig>`);
  process.env.FONTCONFIG_FILE = conf;
}
const sharp = require('sharp');

const SIZE = 1200;
const NICK = '춘자';
const PHONE = '010-5653-0069';
const FONT = 'Noto Sans KR';
const GOLD = '#C9A96E';

const OUT_ROOT = path.join(__dirname, '..', 'og');
const OUT_PUBLIC = path.join(__dirname, '..', 'public', 'og');

/* 페이지별 라벨만 다르게 — 닉네임/전화번호는 전 페이지 공통 노출 */
const pages = [
  { file: 'main',      label: '울산나이트 완전정복 가이드' },
  { file: 'dresscode', label: '드레스코드 — 뭘 입고 갈까' },
  { file: 'budget',    label: '예산 — 현실적으로 얼마 드나' },
  { file: 'timing',    label: '시간대 — 몇 시에 가야 하나' },
  { file: 'parking',   label: '주차·교통 — 차 가져가도 되나' },
  { file: 'manners',   label: '매너 — 암묵적인 룰 정리' },
  { file: 'nearby',    label: '주변 코스 — 1차 어디서 먹나' },
  { file: 'compare',   label: '나이트 비교 — 뭐가 다른가' },
  { file: 'legal',     label: '합법 운영 — 안심하고 가는 곳' },
];

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function svgFor(label) {
  return `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F1F33"/>
      <stop offset="55%" stop-color="#1E3A5F"/>
      <stop offset="100%" stop-color="#16273F"/>
    </linearGradient>
    <linearGradient id="tel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6B21A8"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>

  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>

  <!-- 장식 -->
  <circle cx="1000" cy="180"  r="190" fill="${GOLD}" opacity="0.05"/>
  <circle cx="180"  cy="1010" r="140" fill="${GOLD}" opacity="0.05"/>
  <circle cx="430"  cy="140"  r="4"   fill="${GOLD}" opacity="0.45"/>
  <circle cx="1080" cy="640"  r="5"   fill="${GOLD}" opacity="0.30"/>
  <circle cx="120"  cy="520"  r="4"   fill="${GOLD}" opacity="0.35"/>

  <rect x="0" y="0" width="${SIZE}" height="12" fill="${GOLD}"/>

  <!-- 업소명 -->
  <text x="600" y="150" text-anchor="middle" fill="rgba(255,255,255,0.62)"
        font-size="52" font-weight="700" font-family="${FONT}">울산챔피언나이트</text>

  <!-- ★ 닉네임 — 가장 크게 ★ -->
  <text x="604" y="434" text-anchor="middle" fill="rgba(0,0,0,0.45)"
        font-size="280" font-weight="900" font-family="${FONT}">${NICK}</text>
  <text x="600" y="430" text-anchor="middle" fill="${GOLD}"
        font-size="280" font-weight="900" font-family="${FONT}">${NICK}</text>

  <!-- 역할 -->
  <text x="600" y="514" text-anchor="middle" fill="rgba(255,255,255,0.75)"
        font-size="46" font-weight="700" font-family="${FONT}">예약 담당 실장</text>

  <!-- ★ 전화번호 — 보라 알약 안에 크게 ★ -->
  <rect x="88" y="580" width="1024" height="200" rx="100" fill="url(#tel)"/>
  <rect x="88" y="580" width="1024" height="200" rx="100" fill="none"
        stroke="${GOLD}" stroke-width="5" opacity="0.55"/>
  <text x="600" y="710" text-anchor="middle" fill="#FFFFFF"
        font-size="126" font-weight="900" font-family="${FONT}">${PHONE}</text>

  <!-- 안내 -->
  <text x="600" y="858" text-anchor="middle" fill="${GOLD}"
        font-size="50" font-weight="800" font-family="${FONT}">24시간 예약 문의 환영</text>

  <!-- 페이지 라벨 -->
  <rect x="150" y="920" width="900" height="4" rx="2" fill="${GOLD}" opacity="0.3"/>
  <text x="600" y="1022" text-anchor="middle" fill="rgba(255,255,255,0.92)"
        font-size="52" font-weight="700" font-family="${FONT}">${esc(label)}</text>

  <text x="600" y="1128" text-anchor="middle" fill="rgba(255,255,255,0.42)"
        font-size="36" font-weight="600" font-family="${FONT}">e.nolcool.com</text>
  <rect x="0" y="${SIZE - 12}" width="${SIZE}" height="12" fill="${GOLD}"/>
</svg>`;
}

(async () => {
  for (const dir of [OUT_ROOT, OUT_PUBLIC]) fs.mkdirSync(dir, { recursive: true });

  for (const p of pages) {
    const buf = await sharp(Buffer.from(svgFor(p.label)))
      .png({ compressionLevel: 9 })
      .toBuffer();

    const meta = await sharp(buf).metadata();
    if (meta.width !== SIZE || meta.height !== SIZE) {
      throw new Error(`${p.file}: 크기 불일치 ${meta.width}x${meta.height}`);
    }
    for (const dir of [OUT_ROOT, OUT_PUBLIC]) {
      fs.writeFileSync(path.join(dir, `${p.file}.png`), buf);
    }
    console.log(`OK ${p.file}.png  ${meta.width}x${meta.height}  ${Math.round(buf.length / 1024)}KB`);
  }
  console.log(`\n완료: ${pages.length}개 (닉네임 ${NICK} / 전화 ${PHONE})`);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
