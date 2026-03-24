// generate-og-images.js — 네이비+골드 OG 이미지 생성
// Usage: node scripts/generate-og-images.js

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const pages = [
  { slug: 'main', sub: '완벽 가이드', icon: '👑', desc: '가기 전에 이것만 알면 된다' },
  { slug: 'dresscode', sub: '드레스코드 가이드', icon: '👔', desc: '뭘 입고 가야 하나' },
  { slug: 'budget', sub: '예산 가이드', icon: '💰', desc: '현실적으로 얼마 들어가나' },
  { slug: 'timing', sub: '시간대별 가이드', icon: '⏰', desc: '언제 가야 분위기 좋나' },
  { slug: 'parking', sub: '주차·교통 가이드', icon: '🚗', desc: '차 가져가도 되나' },
  { slug: 'manners', sub: '매너·에티켓 가이드', icon: '🤝', desc: '이것만 지키면 된다' },
  { slug: 'nearby', sub: '1차·2차 코스 추천', icon: '🍻', desc: '밥 먹고 나이트 가고 해장까지' },
  { slug: 'compare', sub: '울산 나이트 비교', icon: '⚔️', desc: '챔피언 vs 다른 곳' },
];

const outDir = path.join(__dirname, '..', 'og');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const page of pages) {
  const w = 1200, h = 630;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Navy gradient background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#0F1F33');
  grad.addColorStop(0.5, '#1E3A5F');
  grad.addColorStop(1, '#2A4F7A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle radial glow
  const radial = ctx.createRadialGradient(300, 300, 50, 300, 300, 500);
  radial.addColorStop(0, 'rgba(201,169,110,0.08)');
  radial.addColorStop(1, 'transparent');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, w, h);

  // Gold crown shape (larger)
  ctx.fillStyle = '#C9A96E';
  ctx.beginPath();
  ctx.moveTo(60, 220);
  ctx.lineTo(85, 170);
  ctx.lineTo(110, 200);
  ctx.lineTo(135, 155);
  ctx.lineTo(160, 200);
  ctx.lineTo(185, 170);
  ctx.lineTo(210, 220);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(60, 220, 150, 16);

  // Gold accent line
  ctx.fillStyle = '#C9A96E';
  ctx.fillRect(60, 270, 100, 3);

  // Title: 울산챔피언나이트
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 60px sans-serif';
  ctx.fillText('울산챔피언나이트', 60, 340);

  // Subtitle
  ctx.fillStyle = '#C9A96E';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(page.sub, 60, 400);

  // Description
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '26px sans-serif';
  ctx.fillText(page.desc, 60, 450);

  // Bottom bar
  ctx.fillStyle = 'rgba(201,169,110,0.12)';
  ctx.fillRect(0, h - 70, w, 70);
  ctx.fillStyle = '#C9A96E';
  ctx.font = '22px sans-serif';
  ctx.fillText('ulsan1.pages.dev', 60, h - 25);

  // Right side decorative dots
  for (let i = 0; i < 40; i++) {
    const opacity = Math.random() * 0.25;
    ctx.fillStyle = `rgba(201,169,110,${opacity})`;
    ctx.beginPath();
    ctx.arc(
      650 + Math.random() * 480,
      60 + Math.random() * 450,
      2 + Math.random() * 8,
      0, Math.PI * 2
    );
    ctx.fill();
  }

  // Right side large circle decoration
  ctx.strokeStyle = 'rgba(201,169,110,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(1000, 200, 180, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(1000, 200, 120, 0, Math.PI * 2);
  ctx.stroke();

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outDir, `${page.slug}.png`), buf);
  console.log(`✓ ${page.slug}.png (${w}x${h})`);
}

console.log('Done!');
