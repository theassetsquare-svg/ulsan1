/* 최종 게이트 — G9+ / G10 / G13 / G14 / G15 / G16 */
const fs=require('fs'),path=require('path');
const sharp=require('sharp');
const ROOT=path.resolve(__dirname,'..');
process.chdir(ROOT);
function walk(d,out=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name.startsWith('.'))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p,out);else if(e.name.endsWith('.html'))out.push(p);}return out;}
const ALL=walk('.').sort();
const PAGES=ALL.filter(f=>!f.startsWith('src/'));
const HOME='index.html';
const fail=[],pass=[];
const F=(g,m)=>fail.push(g+' :: '+m);
const OWNPH={'울산챔피언나이트':'010-5653-0069','창원룰루랄라나이트':'010-7528-4936','불광동호박나이트':'010-2221-1937','청담나이트':'010-5655-4866','답십리미라클나이트':'010-8156-6558'};
const NICKS={'춘자':'울산챔피언나이트','로또':'창원룰루랄라나이트','손흥민':'불광동호박나이트','펩시맨':'청담나이트','유재석':'답십리미라클나이트'};
const REGIONKW=new Set(['은평나이트','창원나이트','울산나이트','강남나이트','대전나이트','신림나이트','상봉동나이트','수유나이트','부산나이트','수원나이트','안산나이트','유천동나이트','일산나이트']);
const HUBS=new Set(['night/index.html','time/index.html']);

const own={};
for(const f of PAGES){const h=fs.readFileSync(f,'utf8');const t=(h.match(/<title>([^<]*)<\/title>/)||[])[1]||'';const m=t.match(/^([가-힣A-Za-z0-9]+나이트)/);own[f]=m?m[1]:null;}
const STORE=[...new Set(Object.values(own).filter(Boolean))].filter(n=>!REGIONKW.has(n)).sort((a,b)=>b.length-a.length);

(async()=>{
/* ── G9+ ── */
const NEED=['og:image','og:image:secure_url','og:image:width','og:image:height','og:image:type','og:image:alt','twitter:card','twitter:image','thumbnail'];
for(const f of PAGES){
  const h=fs.readFileSync(f,'utf8');
  const get=k=>{const re=new RegExp('<meta (?:property|name)="'+k.replace(/[:]/g,':')+'" content="([^"]*)"','g');const m=[...h.matchAll(re)];return m;};
  for(const k of NEED){const m=get(k);
    if(m.length===0)F('G9+','META 누락 '+f+' '+k);
    else if(m.length>1)F('G9+','META 중복 '+f+' '+k+' x'+m.length);}
  const og=(get('og:image')[0]||[])[1]||'';
  if(!/^https:\/\//.test(og))F('G9+','og:image 절대URL 아님 '+f);
  if(((get('og:image:width')[0]||[])[1])!=='1200'||((get('og:image:height')[0]||[])[1])!=='1200')F('G9+','og width/height≠1200 '+f);
  if(((get('og:image:type')[0]||[])[1])!=='image/png')F('G9+','og:image:type≠image/png '+f);
  if(((get('twitter:card')[0]||[])[1])!=='summary')F('G9+','twitter:card≠summary '+f);
  const imgs=[...h.matchAll(/<img[^>]*src="([^"]*)"[^>]*>/g)];
  if(f===HOME){
    if(imgs.length)F('G16','홈 본문 <img> '+imgs.length+'개');
  }else{
    if(imgs.length===0){F('G9+','본문 img 없음 '+f);continue;}
    const rel=og.replace(/^https:\/\/[^/]+/,'');
    if(!imgs.some(m=>m[1]===rel))F('G9+','og:image ≠ 본문 img '+f);
    const tag=imgs.find(m=>m[1]===rel);
    const alt=(tag&&tag[0].match(/alt="([^"]*)"/)||[])[1]||'';
    const o=own[f];
    if(HUBS.has(f)){ if(STORE.some(n=>alt.includes(n)))F('G13','허브 alt에 가게이름 '+f+' :: '+alt); }
    else if(o&&!alt.includes(o))F('G9+','alt에 자기 가게이름 없음 '+f+' :: '+alt);
    const file=path.join('og',path.basename(rel));
    if(!fs.existsSync(file)){F('G9+','파일 없음 '+file);continue;}
    const md=await sharp(file).metadata();const sz=fs.statSync(file).size;
    if(md.width!==1200||md.height!==1200)F('G9+','실측 크기 '+file+' '+md.width+'x'+md.height);
    if(sz>300*1024)F('G9+','300KB 초과 '+file+' '+(sz/1024).toFixed(0)+'KB');
  }
}
// 홈 메타 확인 (③만)
{const h=fs.readFileSync(HOME,'utf8');
 for(const k of NEED){if(!new RegExp('<meta (?:property|name)="'+k+'" content="').test(h))F('G9+','홈 META 누락 '+k);}}

/* ── G10 전화번호 ── */
for(const f of ALL){
  const h=fs.readFileSync(f,'utf8');
  const nums=[...new Set([...h.matchAll(/01[016789][-]?[0-9]{3,4}[-]?[0-9]{4}/g)].map(m=>m[0].replace(/-/g,'')))];
  if(!nums.length)continue;
  if(nums.length>1)F('G10','한 페이지 번호 2개 이상 '+f+' '+nums.join(','));
  const o=f.startsWith('src/')?'울산챔피언나이트':own[f];
  const want=(OWNPH[o]||'').replace(/-/g,'');
  for(const n of nums){
    const knowns=Object.values(OWNPH).map(x=>x.replace(/-/g,''));
    if(!knowns.includes(n))F('G10','미등록 010 번호 '+f+' '+n);
    else if(n!==want)F('G10','타 광고주 번호 '+f+' '+n+' (own='+o+')');
  }
}
/* ── G13 가게이름 오염 (예외 a 허브 · b 앵커텍스트 · c 인천아라비안) ── */
for(const f of PAGES){
  if(HUBS.has(f)||f===HOME)continue;
  const o=own[f];if(!o)continue;
  fs.readFileSync(f,'utf8').split('\n').forEach((L,i)=>{
    const s=L.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g,'<a/>');
    const m=s.split(o).join('§');
    for(const n of STORE){if(n===o||o.includes(n))continue;if(m.includes(n))F('G13',f+' L'+(i+1)+' ['+n+']');}
    for(const nk of Object.keys(NICKS)){if(NICKS[nk]===o)continue;if(m.includes(nk))F('G13',f+' L'+(i+1)+' [닉 '+nk+']');}
  });
}
/* ── G14 / G15 썸네일 (manifest 기준) ── */
const MAN=JSON.parse(fs.readFileSync('og/manifest.json','utf8'));
if(MAN.length!==PAGES.length-1)F('G14','manifest 수 불일치 '+MAN.length+' vs '+(PAGES.length-1));
for(const m of MAN){
  const o=m.venue;
  const joined=m.texts.map(t=>t.text).join(' ');
  // G14 오염
  for(const n of STORE){if(n===o||(o&&o.includes(n)))continue;if(joined.includes(n))F('G14','썸네일 텍스트 타 가게이름 '+m.file+' ['+n+']');}
  for(const nk of Object.keys(NICKS)){if(NICKS[nk]===o)continue;if(joined.includes(nk))F('G14','썸네일 텍스트 타 닉네임 '+m.file+' ['+nk+']');}
  for(const [ph] of Object.entries(OWNPH).map(([k,v])=>[v,k])){}
  for(const [venue,ph] of Object.entries(OWNPH)){ if(venue===o)continue; if(joined.includes(ph))F('G14','썸네일 텍스트 타 번호 '+m.file+' ['+ph+']'); }
  if(m.rule.startsWith('a(')&&STORE.some(n=>joined.includes(n)))F('G14','허브 썸네일에 가게이름 '+m.file);
  // G15 크기
  const maxH=Math.max(...m.texts.map(t=>t.heightPx));
  if(m.heroHeightPx<maxH)F('G15','주인공보다 큰 글자 존재 '+m.file);
  if(m.texts.filter(t=>t.heightPx===maxH).length>1)F('G15','최대 높이 동률 '+m.file);
  if(m.rule.startsWith('A')){
    if(m.heroWidthPx<972)F('G15','전화번호 폭<972 '+m.file+' '+m.heroWidthPx);
  }else{
    if(m.heroHeightPx<240)F('G15','"광고문의" 높이<240 '+m.file+' '+m.heroHeightPx);
  }
  if(m.canvas.width!==1200||m.canvas.height!==1200)F('G15','캔버스≠1200 '+m.file);
  if(m.bytes>300*1024)F('G15','300KB 초과 '+m.file);
}
/* ── G16 홈 단독화 ── */
{
 const h=fs.readFileSync(HOME,'utf8');
 if(/<img\b/.test(h))F('G16','홈 <img> 존재');
 if(/background-image\s*:\s*url\(/.test(h))F('G16','홈 background-image 존재');
 if(/<a\b/.test(h))F('G16','홈에 <a> 존재(자기자신 링크 금지 확인)');
}
/* <a> 태그의 href 만 검사 — <link rel="canonical"> 등 검색용 메타는 H2 에 따라 유지 */
const HOMEHREF=/^(\/|\.\/|index\.html|\/index\.html|https?:\/\/ulsanf\.pages\.dev\/|https?:\/\/ulsanf\.pages\.dev\/index\.html)$/;
for(const f of ALL){
  const h=fs.readFileSync(f,'utf8');
  h.split('\n').forEach((L,i)=>{ let m; const re=/<a\b[^>]*\bhref="([^"]*)"/g;
    while((m=re.exec(L)))if(HOMEHREF.test(m[1]))F('G16','홈 링크 잔존 '+f+' L'+(i+1)+' '+m[1]); });
  if(/"name":"홈"/.test(h))F('G16','BreadcrumbList 홈 항목 '+f);
}
/* ── robots / sitemap ── */
{
 const r=fs.readFileSync('robots.txt','utf8');
 if(/^\s*Disallow:\s*\S/m.test(r))F('ROBOTS','Disallow 존재');
 if(/noimageindex/i.test(r))F('ROBOTS','noimageindex 존재');
 for(const f of ALL){if(/noimageindex/i.test(fs.readFileSync(f,'utf8')))F('ROBOTS','noimageindex in '+f);}
 const sm=fs.readFileSync('sitemap.xml','utf8');
 if(!/<loc>https:\/\/ulsanf\.pages\.dev\/<\/loc>/.test(sm))F('SITEMAP','홈 URL 누락');
}
console.log(fail.length?('❌ 실패 '+fail.length+'건\n'+fail.join('\n')):'✅ 전 게이트 통과 (G9+ / G10 / G13 / G14 / G15 / G16 / robots / sitemap)');
process.exit(fail.length?1:0);
})();
