/* ─────────────────────────────────────────────────────────────
   /og/*.png 썸네일 생성기 — 폭·높이 실측 기반 자동 크기 조정
   규칙 (A) 광고주 4곳: 주인공 = 전화번호
        (B) 비광고주   : 주인공 = "광고문의"
        (a) 허브 목록  : 중립 문구 + 광고문의만
   캔버스 1200x1200 / 좌우 안전여백 60px (가용 폭 1080px)
   opentype.js 로 path 실측 → sharp 로 렌더
   ───────────────────────────────────────────────────────────── */
const fs = require('fs');
const path = require('path');
const ot = require('opentype.js');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SIZE = 1200, PAD = 60, USABLE = SIZE - PAD * 2;   // 1080
const CX = SIZE / 2;
const FONT = ot.parse(fs.readFileSync(path.join(ROOT, 'tools/fonts/NotoSansKR-Bold.otf')).buffer.slice(0));

/* opentype.js 2.0.0 의 toPathData() 는 일부 좌표에서 NaN 을 출력한다(글자 잘림).
   커맨드에서 직접 SVG path 문자열을 만든다. */
function toD(commands, dp) {
  const n = v => {
    const r = Number(v.toFixed(dp));
    return (Object.is(r, -0) ? 0 : r).toString();
  };
  const out = [];
  for (const c of commands) {
    if (c.type === 'M') out.push('M' + n(c.x) + ' ' + n(c.y));
    else if (c.type === 'L') out.push('L' + n(c.x) + ' ' + n(c.y));
    else if (c.type === 'C') out.push('C' + n(c.x1) + ' ' + n(c.y1) + ' ' + n(c.x2) + ' ' + n(c.y2) + ' ' + n(c.x) + ' ' + n(c.y));
    else if (c.type === 'Q') out.push('Q' + n(c.x1) + ' ' + n(c.y1) + ' ' + n(c.x) + ' ' + n(c.y));
    else if (c.type === 'Z') out.push('Z');
  }
  return out.join('');
}

/* ── 실측 helper ───────────────────────────────────────────── */
function measure(text, fontSize) {
  const p = FONT.getPath(text, 0, 0, fontSize);
  const b = p.getBoundingBox();
  return { path: p, x1: b.x1, y1: b.y1, w: b.x2 - b.x1, h: b.y2 - b.y1 };
}
const unitW = t => measure(t, 100).w / 100;   // 1px 기준 폭
const unitH = t => measure(t, 100).h / 100;   // 1px 기준 높이

/* 폭 기준: 목표 폭에 정확히 맞도록 폰트 크기 계산 (등방 배율) */
function rowByWidth(text, targetW) {
  const fontSize = targetW / unitW(text);
  const m = measure(text, fontSize);
  return { text, fontSize, sx: 1, w: m.w, h: m.h, m };
}
/* 높이 기준: 목표 높이로 폰트 크기 계산 후, 폭을 밴드 안으로 가로 배율 조정 */
function rowByHeight(text, targetH, wmin, wmax) {
  const fontSize = targetH / unitH(text);
  const m = measure(text, fontSize);
  const w = Math.min(Math.max(m.w, wmin), wmax);
  return { text, fontSize, sx: w / m.w, w, h: m.h, m };
}

function svgText(row, cx, top, fill) {
  const { m, sx } = row;
  const left = cx - row.w / 2;
  const tx = left - sx * m.x1;
  const ty = top - m.y1;
  return `<path d="${toD(m.path.commands, 2)}" fill="${fill}" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${sx.toFixed(5)} 1)"/>`;
}

/* ── 팔레트 (어두운 단색 배경) ─────────────────────────────── */
const PALETTE = [
  { bg: '#0B1220', neon: '#5EEAD4', sub: '#93A4BF' },
  { bg: '#160B1E', neon: '#F0ABFC', sub: '#B79BC4' },
  { bg: '#101A0E', neon: '#A3E635', sub: '#9DB08F' },
  { bg: '#1B0F0A', neon: '#FDBA74', sub: '#C0A18C' },
  { bg: '#0A1A1A', neon: '#67E8F9', sub: '#8FB3B7' },
  { bg: '#14101F', neon: '#C4B5FD', sub: '#A79EC2' },
  { bg: '#1A0D12', neon: '#FDA4AF', sub: '#C29AA2' },
  { bg: '#0D1608', neon: '#FDE047', sub: '#AEB08A' },
];
const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

/* ── 레이아웃 ──────────────────────────────────────────────── */
function layoutA(name, nick, phone) {           // 광고주 — 주인공 = 전화번호
  const r1 = rowByWidth(name, USABLE * 0.60);                       // 60%
  const r2 = rowByHeight(nick, 172, USABLE * 0.45, USABLE * 0.60);  // 45~60% / h>=170
  const r3 = rowByHeight(phone, 186, USABLE * 0.90, USABLE * 0.94); // 90~94% / 최대 높이
  const r4 = rowByWidth('광고문의 카톡 besta12', USABLE * 0.55);     // 55%
  return { rows: [r1, r2, r3, r4], gaps: [118, 96, 118], hero: 2 };
}
function layoutB(line1) {                        // 비광고주 — 주인공 = "광고문의"
  const r1 = rowByWidth(line1, USABLE * 0.60);                        // 60%
  const r2 = rowByHeight('광고문의', 255, USABLE * 0.75, USABLE * 0.85); // 75~85% / h>=240
  const r3 = rowByHeight('카카오톡 besta12', 130, USABLE * 0.70, USABLE * 0.80); // 70~80% / h>=120
  return { rows: [r1, r2, r3], gaps: [138, 88], hero: 1 };
}

function render(spec) {
  const pal = PALETTE[hash(spec.file) % PALETTE.length];
  const L = spec.type === 'A'
    ? layoutA(spec.line1, spec.nick, spec.phone)
    : layoutB(spec.line1);
  const total = L.rows.reduce((a, r) => a + r.h, 0) + L.gaps.reduce((a, g) => a + g, 0);
  let y = (SIZE - total) / 2;

  const parts = [];
  const drawn = [];
  const colorsA = ['#E9EEF6', pal.neon, '#FFFFFF', pal.sub];
  const colorsB = ['#E9EEF6', '#FFFFFF', pal.neon];
  const colors = spec.type === 'A' ? colorsA : colorsB;

  L.rows.forEach((r, i) => {
    if (spec.type === 'A' && i === 2) {          // 전화번호 뒤 대비 박스
      parts.push(`<rect x="${PAD - 12}" y="${(y - 34).toFixed(1)}" width="${USABLE + 24}" height="${(r.h + 68).toFixed(1)}" rx="26" fill="#000000" fill-opacity="0.42"/>`);
    }
    parts.push(svgText(r, CX, y, colors[i]));
    drawn.push({ text: r.text, widthPx: +r.w.toFixed(1), heightPx: +r.h.toFixed(1), fontSizePx: +r.fontSize.toFixed(1), scaleX: +r.sx.toFixed(4) });
    y += r.h + (L.gaps[i] || 0);
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
<rect width="${SIZE}" height="${SIZE}" fill="${pal.bg}"/>
<rect x="0" y="0" width="${SIZE}" height="14" fill="${pal.neon}"/>
<rect x="0" y="${SIZE - 14}" width="${SIZE}" height="14" fill="${pal.neon}"/>
${parts.join('\n')}
</svg>`;
  return { svg, drawn, hero: L.hero };
}

/* ── 실행 ──────────────────────────────────────────────────── */
async function main() {
  const specs = JSON.parse(fs.readFileSync(path.join(__dirname, 'thumb-specs.json'), 'utf8'));
  const manifest = [];
  for (const spec of specs) {
    const { svg, drawn, hero } = render(spec);
    if (/NaN|undefined/.test(svg)) throw new Error('SVG 좌표 오류: ' + spec.og);
    const out = path.join(ROOT, 'og', spec.og);
    let buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, quality: 100, effort: 10 }).toBuffer();
    if (buf.length > 300 * 1024) {
      buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, colours: 64, effort: 10 }).toBuffer();
    }
    fs.writeFileSync(out, buf);
    const meta = await sharp(buf).metadata();
    manifest.push({
      file: '/og/' + spec.og,
      page: spec.url,
      venue: spec.venue,
      rule: spec.type === 'A' ? 'A(광고주·전화번호 주인공)' : (spec.type === 'HUB' ? 'a(허브·중립문구)' : 'B(비광고주·광고문의 주인공)'),
      texts: drawn,
      heroText: drawn[hero].text,
      heroWidthPx: drawn[hero].widthPx,
      heroHeightPx: drawn[hero].heightPx,
      canvas: { width: meta.width, height: meta.height },
      bytes: buf.length
    });
    console.log(spec.og.padEnd(34), spec.type, 'hero=', drawn[hero].text.padEnd(16), 'w=' + drawn[hero].widthPx, 'h=' + drawn[hero].heightPx, (buf.length / 1024).toFixed(0) + 'KB');
  }
  fs.writeFileSync(path.join(ROOT, 'og', 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\n생성:', manifest.length, '개 · manifest.json 기록 완료');
}
main().catch(e => { console.error(e); process.exit(1); });
