/**
 * 불광동호박나이트 OG 썸네일 — 1200x1200 (1:1)
 * 네이버/카카오/구글 검색 썸네일용. 닉네임 "손흥민" + 전화번호를 가장 크게 노출.
 * 실행: node scripts/generate-og-hobak.js
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
const VENUE = '불광동호박나이트';
const NICK = '손흥민';
const PHONE = '010-2221-1937';
const FONT = 'Noto Sans KR';
const GOLD = '#F5C15E';

const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2A1206"/>
      <stop offset="55%" stop-color="#6B2E0B"/>
      <stop offset="100%" stop-color="#3A1707"/>
    </linearGradient>
    <linearGradient id="tel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C2410C"/>
      <stop offset="100%" stop-color="#EA580C"/>
    </linearGradient>
  </defs>

  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>

  <circle cx="1000" cy="180"  r="190" fill="${GOLD}" opacity="0.06"/>
  <circle cx="180"  cy="1010" r="140" fill="${GOLD}" opacity="0.06"/>
  <circle cx="430"  cy="140"  r="4"   fill="${GOLD}" opacity="0.45"/>
  <circle cx="1080" cy="640"  r="5"   fill="${GOLD}" opacity="0.30"/>
  <circle cx="120"  cy="520"  r="4"   fill="${GOLD}" opacity="0.35"/>

  <rect x="0" y="0" width="${SIZE}" height="12" fill="${GOLD}"/>

  <text x="600" y="152" text-anchor="middle" fill="rgba(255,255,255,0.72)"
        font-size="62" font-weight="800" font-family="${FONT}">${VENUE}</text>
  <text x="600" y="216" text-anchor="middle" fill="rgba(255,255,255,0.5)"
        font-size="40" font-weight="600" font-family="${FONT}">서울 은평구 불광동</text>

  <text x="604" y="466" text-anchor="middle" fill="rgba(0,0,0,0.45)"
        font-size="230" font-weight="900" font-family="${FONT}">${NICK}</text>
  <text x="600" y="462" text-anchor="middle" fill="${GOLD}"
        font-size="230" font-weight="900" font-family="${FONT}">${NICK}</text>

  <text x="600" y="542" text-anchor="middle" fill="rgba(255,255,255,0.78)"
        font-size="46" font-weight="700" font-family="${FONT}">예약 담당 실장</text>

  <rect x="88" y="600" width="1024" height="200" rx="100" fill="url(#tel)"/>
  <rect x="88" y="600" width="1024" height="200" rx="100" fill="none"
        stroke="${GOLD}" stroke-width="5" opacity="0.55"/>
  <text x="600" y="730" text-anchor="middle" fill="#FFFFFF"
        font-size="126" font-weight="900" font-family="${FONT}">${PHONE}</text>

  <text x="600" y="876" text-anchor="middle" fill="${GOLD}"
        font-size="50" font-weight="800" font-family="${FONT}">전화 한 통이면 예약 끝</text>

  <rect x="150" y="936" width="900" height="4" rx="2" fill="${GOLD}" opacity="0.3"/>
  <text x="600" y="1036" text-anchor="middle" fill="rgba(255,255,255,0.92)"
        font-size="50" font-weight="700" font-family="${FONT}">불광역 인근 · 주말 예약 필수</text>

  <text x="600" y="1136" text-anchor="middle" fill="rgba(255,255,255,0.45)"
        font-size="36" font-weight="600" font-family="${FONT}">ulsanf.pages.dev/bulgwang-hobak</text>
  <rect x="0" y="${SIZE - 12}" width="${SIZE}" height="12" fill="${GOLD}"/>
</svg>`;

(async () => {
  const buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  const meta = await sharp(buf).metadata();
  if (meta.width !== SIZE || meta.height !== SIZE) {
    throw new Error(`크기 불일치 ${meta.width}x${meta.height}`);
  }
  for (const dir of [path.join(__dirname, '..', 'og'), path.join(__dirname, '..', 'public', 'og')]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'bulgwang-hobak.png'), buf);
  }
  console.log(`OK bulgwang-hobak.png ${meta.width}x${meta.height} ${Math.round(buf.length / 1024)}KB (${NICK} / ${PHONE})`);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
