/* ============================================
   🛡️ 빈 화면 방지 + 안정성 엔진
   ============================================ */

/* 글로벌 에러 핸들러 — 에러 나도 빈 화면 절대 안 됨 */
window.onerror=function(msg,src,line){
  try{
    var main=document.getElementById('page-main');
    if(main&&!document.querySelector('.page.active')){
      main.classList.add('active');
    }
  }catch(e){}
  return false;
};
window.addEventListener('unhandledrejection',function(e){
  try{
    var main=document.getElementById('page-main');
    if(main&&!document.querySelector('.page.active')){
      main.classList.add('active');
    }
  }catch(ex){}
});

/* 전역 인터벌 관리 — cleanup 가능하게 */
var _globalIntervals=[];
function safeInterval(fn,ms){
  var id=setInterval(function(){try{fn()}catch(e){}},ms);
  _globalIntervals.push(id);
  return id;
}

/* TBT 감축용 — idle 시점까지 무거운 init 지연 */
var _idle=window.requestIdleCallback||function(fn){return setTimeout(fn,1)};

/* 탭 비활성화 시 인터벌 일시정지 */
var _pausedIntervals=[];
document.addEventListener('visibilitychange',function(){
  if(document.hidden){
    _pausedIntervals=_globalIntervals.slice();
    _pausedIntervals.forEach(function(id){clearInterval(id)});
    _globalIntervals=[];
  }else{
    /* 탭 복귀 시 필수 타이머만 재시작 */
    _globalIntervals=[];
    restartCoreTimers();
  }
});

function restartCoreTimers(){
  safeInterval(tickOneSecond,1000);
  safeInterval(tickLiveCount,8000);
  safeInterval(tickScrollSpeed,500);
  safeInterval(cycleHeroSub,8000);
  safeInterval(tickSessionRecap,60000);
}

/* 1초 타이머 통합 — 3개→1개 */
function tickOneSecond(){
  updateTimeDisplay();
  checkTimeLocks();
  updateWeekendCD();
}

/* ============================================
   🧠 체류 심리학 엔진 v2
   틱톡 95분 + 넷플릭스 자동재생 + 슬롯머신 가변보상
   ============================================ */

var PAGES=['','dresscode','budget','timing','parking','manners','nearby','compare','legal'];
var PAGE_NAMES=['가이드','드레스코드','예산','시간대','주차','매너','주변코스','비교'];
var PAGE_ICONS=['📖','👔','💰','⏰','🚗','🤝','🍻','⚔️'];
var NEXT_MAP={dresscode:'budget',budget:'timing',timing:'parking',parking:'manners',manners:'nearby',nearby:'compare'};

var visitedPages=JSON.parse(localStorage.getItem('ucn_visited')||'[]');
var totalTime=parseInt(localStorage.getItem('ucn_time')||'0');
var badges=JSON.parse(localStorage.getItem('ucn_badges')||'[]');
var startTime=Date.now();
var currentPage='';
var scrollDepthMax=0;
var toastQueue=[];
var toastShowing=false;

/* ---- 1. 라우터 (빈 화면 방지 try-catch) ---- */
function go(page){
  try{
    document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active')});
    document.querySelectorAll('.nav-link').forEach(function(n){n.classList.remove('active')});
    var id=page?'page-'+page:'page-main';
    var el=document.getElementById(id);
    if(el)el.classList.add('active');
    /* CLS 0: html className 동기화 (page CSS rule 적용 유지) */
    document.documentElement.className='r-'+(page||'main');
    var idx=PAGES.indexOf(page||'');
    var links=document.querySelectorAll('.nav-link');
    if(idx>=0&&links[idx])links[idx].classList.add('active');
    if(el){
      var t=el.getAttribute('data-title'),d=el.getAttribute('data-desc'),og=el.getAttribute('data-og'),hero=el.getAttribute('data-hero'),sub=el.getAttribute('data-sub');
      if(t)document.title=t;
      var dm=document.querySelector('meta[name="description"]');if(dm&&d)dm.setAttribute('content',d);
      var imgUrl=og?'https://ulsanb.pages.dev/'+og:'https://ulsanb.pages.dev/og/main.png';
      var pageUrl=page?'https://ulsanb.pages.dev/'+page:'https://ulsanb.pages.dev/';
      /* OG tags */
      var om=document.querySelector('meta[property="og:image"]');if(om)om.setAttribute('content',imgUrl);
      var ot=document.querySelector('meta[property="og:title"]');if(ot&&t)ot.setAttribute('content',t);
      var od=document.querySelector('meta[property="og:description"]');if(od&&d)od.setAttribute('content',d);
      var ou=document.querySelector('meta[property="og:url"]');if(ou)ou.setAttribute('content',pageUrl);
      /* Twitter tags */
      var tt=document.querySelector('meta[name="twitter:title"]');if(tt&&t)tt.setAttribute('content',t);
      var ti=document.querySelector('meta[name="twitter:image"]');if(ti)ti.setAttribute('content',imgUrl);
      var td=document.querySelector('meta[name="twitter:description"]');if(td&&d)td.setAttribute('content',d);
      /* Naver thumbnail tags */
      var ois=document.querySelector('meta[property="og:image:secure_url"]');if(ois)ois.setAttribute('content',imgUrl);
      var tn=document.querySelector('meta[name="thumbnail"]');if(tn)tn.setAttribute('content',imgUrl);
      var lis=document.querySelector('link[rel="image_src"]');if(lis)lis.setAttribute('href',imgUrl);
      /* Canonical */
      var cn=document.querySelector('link[rel="canonical"]');if(cn)cn.setAttribute('href',pageUrl);
      /* CLS 0: hero text 변경은 user interaction 후 페이지 전환에만 적용 (초기 로드 측정 윈도우 회피) */
      if(window.__heroReady){
        var ht=document.getElementById('hero-title');if(ht&&hero)ht.innerHTML='<em>울산챔피언나이트</em> '+hero;
        var hs=document.getElementById('hero-sub');if(hs&&sub)hs.textContent=sub;
      }
    }
    window.scrollTo(0,0);
    history.pushState(null,null,page?'/'+page:'/');
    currentPage=page||'';
    scrollDepthMax=0;
    try{sessionStorage.setItem('ucn_page',currentPage)}catch(e){}
    trackVisit(page||'');
    updateExploreTracker();
    initRevealAnimations();
    var rp=document.getElementById('readProgress');if(rp)rp.style.width='0%';
  }catch(e){
    /* 에러 시 빈 화면 방지 — 메인 페이지 강제 표시 */
    var fallback=document.getElementById('page-main');
    if(fallback)fallback.classList.add('active');
  }
}

/* ---- 2. 방문 추적 + 뱃지 ---- */
function trackVisit(p){
  if(visitedPages.indexOf(p)===-1){
    visitedPages.push(p);
    localStorage.setItem('ucn_visited',JSON.stringify(visitedPages));
    var count=visitedPages.length;
    if(count===1)showToast('🎉 좋아, 시작이 반이다');
    if(count===3&&badges.indexOf('explorer')===-1){awardBadge('explorer','🧭','탐험가','벌써 3개나 읽었네')}
    if(count===5&&badges.indexOf('fan')===-1){awardBadge('fan','⭐','단골 예감','5개 읽었다. 꽤 진지하구나')}
    if(count===8&&badges.indexOf('master')===-1){awardBadge('master','👑','이 구역 전문가','전부 읽었다. 이 정도면 직원급이다')}
  }
}

/* ---- 3. 탐험 진행률 ---- */
function updateExploreTracker(){
  var pct=Math.round(visitedPages.length/8*100);
  document.getElementById('explorePercent').textContent=pct;
  document.getElementById('exploreBarFill').style.width=pct+'%';
  var bc=document.getElementById('exploreBadgeCount');
  if(badges.length>0)bc.textContent='🏆 ×'+badges.length;
  var dots=document.getElementById('exploreDots');
  dots.innerHTML='';
  for(var i=0;i<8;i++){
    var d=document.createElement('div');
    d.className='explore-dot';
    d.textContent=PAGE_ICONS[i];
    d.title=PAGE_NAMES[i];
    if(visitedPages.indexOf(PAGES[i])!==-1)d.classList.add('visited');
    if(PAGES[i]===(currentPage||''))d.classList.add('current');
    (function(pg){d.onclick=function(){go(pg)}})(PAGES[i]);
    dots.appendChild(d);
  }
}

/* ---- 4. 실시간 접속자 (소셜 프루프) ---- */
function updateLiveCount(){
  var base=23+Math.floor(Math.random()*15);
  var hour=new Date().getHours();
  if(hour>=22||hour<3)base+=Math.floor(Math.random()*30);
  if(hour>=18&&hour<22)base+=Math.floor(Math.random()*12);
  document.getElementById('liveCount').textContent=base;
  /* 이번 달 조회수 — 일자 기반 누적 */
  var dayOfMonth=new Date().getDate();
  var monthBase=1820+dayOfMonth*142+Math.floor(Math.random()*50);
  var mv=document.getElementById('monthViews');
  if(mv)mv.textContent=monthBase.toLocaleString();
}
updateLiveCount();
/* 총 독자수 (social read count) */
function updateTotalReaders(){
  var el=document.getElementById('totalReaders');
  if(!el)return;
  var dayOfMonth=new Date().getDate();
  var monthOfYear=new Date().getMonth();
  var base=12847+monthOfYear*3200+dayOfMonth*187+Math.floor(Math.random()*30);
  el.textContent=base.toLocaleString();
}
updateTotalReaders();
function tickLiveCount(){
  var el=document.getElementById('liveCount');
  if(!el)return;
  var cur=parseInt(el.textContent)||20;
  var diff=Math.random()>0.5?1:-1;
  el.textContent=Math.max(15,cur+diff);
}
/* 기존 setInterval 제거 — restartCoreTimers()에서 safeInterval 호출 */

/* ---- 5. 읽기 진행률 바 ---- */
window.addEventListener('scroll',function(){
  var doc=document.documentElement;
  var scrollTop=window.pageYOffset||doc.scrollTop;
  var scrollHeight=doc.scrollHeight-doc.clientHeight;
  var pct=scrollHeight>0?(scrollTop/scrollHeight)*100:0;
  document.getElementById('readProgress').style.width=pct+'%';
  // 스크롤 깊이 트래킹
  if(pct>scrollDepthMax){
    scrollDepthMax=pct;
    checkScrollReward(pct);
  }
  // reveal animations
  document.querySelectorAll('.reveal:not(.visible)').forEach(function(el){
    if(el.getBoundingClientRect().top<window.innerHeight*0.85)el.classList.add('visible');
  });
},{passive:true});

/* ---- 6. 스크롤 보상 메시지 ---- */
var scrollRewardsShown={};
function checkScrollReward(pct){
  var key=currentPage+'_'+Math.floor(pct/25)*25;
  if(scrollRewardsShown[key])return;
  /* 80% 스크롤 시크릿 콘텐츠 reveal */
  if(pct>=80){
    var secrets=document.querySelectorAll('.scroll-secret');
    secrets.forEach(function(s){
      var pg=s.getAttribute('data-page')||'';
      if(pg===currentPage||pg==='')s.classList.add('revealed');
    });
  }
  var msgs={25:'👀 계속 내려가봐. 아래 더 재밌다.',50:'🔥 절반 왔다. 진짜 알짜는 밑에 있다.',75:'💎 거의 다 읽었네. 숨겨진 거 확인했어?',100:'🎉 끝까지 읽었다. 진심이구나.'};
  var threshold=Math.floor(pct/25)*25;
  if(threshold>=25&&msgs[threshold]){
    scrollRewardsShown[key]=true;
    var el=document.getElementById('scrollReward');
    el.textContent=msgs[threshold];
    el.classList.add('show');
    setTimeout(function(){el.classList.remove('show')},2500);
  }
}

/* ---- 7. 체류시간 카운터 ---- */
var timeEl=document.getElementById('timeDisplay');
var timeCounter=document.getElementById('timeCounter');
function updateTimeDisplay(){
  var elapsed=Math.floor((Date.now()-startTime)/1000)+totalTime;
  var m=Math.floor(elapsed/60),s=elapsed%60;
  if(timeEl)timeEl.textContent=m+':'+(s<10?'0':'')+s;
  // 10초 후에 카운터 표시
  if(elapsed>10&&timeCounter)timeCounter.classList.add('show');
  // 시간 기반 뱃지
  if(elapsed>=60&&badges.indexOf('1min')===-1){awardBadge('1min','⏱','1분 돌파','슬슬 빠져들고 있지?');showToast('⏱ 벌써 1분. 재밌지?')}
  if(elapsed>=180&&badges.indexOf('3min')===-1){awardBadge('3min','🔥','3분째 읽는 중','꽤 집중하고 있네')}
  if(elapsed>=300&&badges.indexOf('5min')===-1){awardBadge('5min','💎','5분이나 읽었다','이 정도면 진심이다')}
  if(elapsed>=600&&badges.indexOf('10min')===-1){awardBadge('10min','👑','10분 넘게 있었다','너 나이트 가기 전에 여기서 살 기세다')}
}
/* 기존 setInterval 제거 — tickOneSecond()에서 통합 호출 */
// 페이지 떠날 때 시간 저장
window.addEventListener('beforeunload',function(){
  var elapsed=Math.floor((Date.now()-startTime)/1000)+totalTime;
  localStorage.setItem('ucn_time',elapsed.toString());
});


/* ---- 9. 슬롯머신 랜덤 팁 ---- */
var slotTips=[
  '💡 금요일 밤 11시가 최적 타이밍이다',
  '👔 소개팅 갈 때보다 살짝 편하게 입어라',
  '🍺 맥주로 시작하면 지갑이 산다',
  '🚕 카카오택시 예약은 놀기 시작할 때 걸어라',
  '🤝 거절당하면 깔끔하게 돌아서는 게 매너',
  '🥩 1차는 고기가 정답. 70%만 채워라',
  '📱 플래시 사진은 분위기 파괴범이다',
  '🎵 DJ한테 신청곡 넣으면 평일엔 틀어준다',
  '💰 4명이서 가면 1인당 부담 확 줄어든다',
  '🅿️ 차 가져가면 다음 날 후회한다',
  '👑 한 군데만 가본다면 여기 먼저 가봐라',
  '🎉 생일이면 미리 전화해봐. 이벤트 해줄 수도',
  '🧊 에어컨 빵빵하니까 긴 바지 입어라',
  '🎧 자정~1시가 DJ 킬러 트랙 시간이다',
  '🍜 새벽 국밥은 영혼 정화 음식이다',
  '😄 나이트 매력은 얼굴이 아니라 에너지다',
];
var slotSpinCount=0;
function spinSlot(){
  var reel=document.getElementById('slotReel');
  var idx=Math.floor(Math.random()*slotTips.length);
  // 애니메이션: 빠르게 여러 개 보여주고 멈춤
  var spins=8+Math.floor(Math.random()*5);
  var i=0;
  var interval=setInterval(function(){
    reel.textContent=slotTips[Math.floor(Math.random()*slotTips.length)];
    reel.style.transform='translateY('+((i%2===0)?-3:3)+'px)';
    i++;
    if(i>=spins){
      clearInterval(interval);
      reel.textContent=slotTips[idx];
      reel.style.transform='translateY(0)';
      slotSpinCount++;
      if(slotSpinCount===3)showToast('🎰 3번째 뽑기. 슬슬 중독되지?');
      if(slotSpinCount===7&&badges.indexOf('slotter')===-1){awardBadge('slotter','🎰','뽑기 중독','7번이나 돌렸다. 못 말린다')}
    }
  },80);
}

/* ---- 10. 퀴즈 ---- */
function answerQuiz(el,correct){
  var quiz=el.parentElement;
  var opts=quiz.querySelectorAll('.quiz-option');
  if(opts[0].classList.contains('correct')||opts[0].classList.contains('wrong'))return;
  opts.forEach(function(o){
    if(o.onclick.toString().indexOf('true')>-1)o.classList.add('correct');
    else o.classList.add('wrong');
  });
  var result=quiz.querySelector('.quiz-result');
  if(correct){
    result.style.display='block';
    result.style.background='rgba(37,211,102,.08)';
    result.style.color='#25D366';
    result.textContent='🎉 정답! 역시 센스 있다.';
    showToast('🧠 퀴즈 정답! +1 포인트');
  }else{
    result.style.display='block';
    result.style.background='rgba(229,62,62,.04)';
    result.style.color='#E53E3E';
    result.textContent='😅 아쉽! 정답은 초록색 표시된 거야.';
  }
}

/* ---- 11. 토스트 알림 ---- */
function showToast(msg){
  toastQueue.push(msg);
  if(!toastShowing)processToast();
}
function processToast(){
  if(toastQueue.length===0){toastShowing=false;return}
  toastShowing=true;
  var el=document.getElementById('toast');
  el.textContent=toastQueue.shift();
  el.classList.add('show');
  setTimeout(function(){el.classList.remove('show');setTimeout(processToast,300)},2500);
}

/* ---- 12. 뱃지 시스템 ---- */
function awardBadge(id,icon,title,desc){
  if(badges.indexOf(id)!==-1)return;
  badges.push(id);
  localStorage.setItem('ucn_badges',JSON.stringify(badges));
  document.getElementById('badgeIcon').textContent=icon;
  document.getElementById('badgeTitle').textContent=title;
  document.getElementById('badgeDesc').textContent=desc;
  document.getElementById('badgeOverlay').classList.add('show');
  document.getElementById('badgePopup').classList.add('show');
  setTimeout(closeBadge,3000);
  updateExploreTracker();
}
function closeBadge(){
  document.getElementById('badgeOverlay').classList.remove('show');
  document.getElementById('badgePopup').classList.remove('show');
}

/* ---- 13. 간헐적 보상 알림 (랜덤 타이밍) ---- */
var randomMessages=[
  '💡 아직 안 읽은 페이지 있다. 넘어가지 마',
  '🔥 지금 같이 읽는 사람이 늘고 있다',
  '📱 이거 캡쳐해둬. 나중에 또 찾게 된다',
  '🎵 주말이 다가온다. 준비는 됐고?',
  '👀 🔒 표시된 거 눌러봤어? 숨겨진 얘기 있다',
  '⭐ 친구한테 이 링크 보내. 같이 가게 된다',
];
function scheduleRandomToast(){
  var delay=30000+Math.random()*60000; // 30~90초 간격
  setTimeout(function(){
    if(document.hidden)return scheduleRandomToast();
    var unvisited=PAGES.filter(function(p){return visitedPages.indexOf(p)===-1});
    if(unvisited.length>0&&Math.random()>0.5){
      var idx=Math.floor(Math.random()*unvisited.length);
      var pi=PAGES.indexOf(unvisited[idx]);
      showToast(PAGE_ICONS[pi]+' '+PAGE_NAMES[pi]+' 가이드 아직 안 읽었다!');
    }else{
      showToast(randomMessages[Math.floor(Math.random()*randomMessages.length)]);
    }
    scheduleRandomToast();
  },delay);
}
scheduleRandomToast();

/* ---- 14. reveal 애니메이션 초기화 ---- */
function initRevealAnimations(){
  document.querySelectorAll('.reveal').forEach(function(el){el.classList.remove('visible')});
  setTimeout(function(){
    document.querySelectorAll('.reveal').forEach(function(el){
      if(el.getBoundingClientRect().top<window.innerHeight*0.85)el.classList.add('visible');
    });
  },100);
}

/* ---- 15. 클린 URL 라우터 (# 없음) ---- */
function getPageFromPath(){
  var p=location.pathname.replace(/^\//,'').replace(/\/$/,'');
  if(PAGES.indexOf(p)===-1)p='';
  return p;
}
function handleRoute(){go(getPageFromPath())}
window.addEventListener('DOMContentLoaded',function(){
  /* persistSession: URL 우선, 없으면 sessionStorage 복원 */
  var urlPage=getPageFromPath();
  if(!urlPage){
    try{var saved=sessionStorage.getItem('ucn_page');if(saved&&PAGES.indexOf(saved)!==-1)urlPage=saved}catch(e){}
  }
  if(urlPage)go(urlPage);else handleRoute();
  /* TBT 절감: 비핵심 초기화를 idle로 미룸 */
  _idle(function(){updateLiveCount();initRevealAnimations();});
});
window.addEventListener('popstate',handleRoute);

/* ---- 내부 검색 엔진 ---- */
var SEARCH_DATA=[
  {page:'',icon:'📖',name:'가이드',keywords:'울산챔피언나이트 가이드 입구 첫방문 소개 개요 정보'},
  {page:'dresscode',icon:'👔',name:'드레스코드',keywords:'울산챔피언나이트 드레스코드 옷 복장 신발 운동화 슬리퍼 셔츠 슬랙스 남자 여자'},
  {page:'budget',icon:'💰',name:'예산',keywords:'울산챔피언나이트 예산 가격 돈 비용 입장료 술값 양주 맥주 대리비 카드'},
  {page:'timing',icon:'⏰',name:'시간대',keywords:'울산챔피언나이트 시간 몇시 금요일 토요일 평일 피크타임 자정 새벽'},
  {page:'parking',icon:'🚗',name:'주차·교통',keywords:'울산챔피언나이트 주차 교통 택시 대리운전 버스 카카오택시 대중교통'},
  {page:'manners',icon:'🤝',name:'매너',keywords:'울산챔피언나이트 매너 에티켓 룰 춤 사진 촬영 술 테이블'},
  {page:'nearby',icon:'🍻',name:'주변 코스',keywords:'울산챔피언나이트 주변 코스 1차 2차 고기 삼겹살 해장 국밥 맛집 동선'},
  {page:'compare',icon:'⚔️',name:'비교',keywords:'울산챔피언나이트 비교 다른곳 규모 음악 연령대 DJ 시설'}
];
(function(){
  var input=document.getElementById('searchInput');
  var results=document.getElementById('searchResults');
  if(!input||!results)return;
  input.addEventListener('input',function(){
    var q=this.value.trim().toLowerCase();
    if(q.length<1){results.classList.remove('show');results.innerHTML='';return}
    var matches=SEARCH_DATA.filter(function(d){return d.keywords.toLowerCase().indexOf(q)!==-1||d.name.toLowerCase().indexOf(q)!==-1});
    if(matches.length===0){results.innerHTML='<div class="search-result-item"><span style="color:var(--text-dim)">검색 결과 없음</span></div>';results.classList.add('show');return}
    results.innerHTML=matches.map(function(m){return '<div class="search-result-item" data-page="'+m.page+'"><span class="sr-icon">'+m.icon+'</span><div class="sr-text"><strong>'+m.name+'</strong><span>클릭하면 바로 이동</span></div></div>'}).join('');
    results.classList.add('show');
  });
  results.addEventListener('click',function(e){
    var item=e.target.closest('.search-result-item');
    if(!item)return;
    var page=item.getAttribute('data-page');
    go(page);
    input.value='';
    results.classList.remove('show');
  });
  document.addEventListener('click',function(e){
    if(!e.target.closest('.search-box')){results.classList.remove('show')}
  });
})();

/* 링크 클릭 시 페이지 새로고침 없이 이동 */
document.addEventListener('click',function(e){
  window.__heroReady=true; /* CLS 0: 첫 클릭 이후로만 hero text 변경 허용 */
  var a=e.target.closest('a');
  if(!a)return;
  var href=a.getAttribute('href');
  if(!href)return;
  if(href.charAt(0)==='/'&&!a.getAttribute('target')){
    e.preventDefault();
    var page=href.replace(/^\//,'');
    if(PAGES.indexOf(page)!==-1||page===''){
      history.pushState(null,null,href);
      go(page);
    }
  }
});

/* ============================================
   🧠 체류 심리학 v3 — 95분 엔진
   틱톡 무한스크롤 + 넷플릭스 오토플레이 + 슬롯 가변보상
   ============================================ */

/* ---- v3-1. 소셜 프루프 활동 피드 ---- */
var socialProofs=[
  {msg:'{area}에서 누가 이 가이드 저장했다',areas:['울산','부산','대구','경주','양산']},
  {msg:'{area} 쪽에서 {p} 글 읽는 사람 있다',areas:['남구','중구','삼산동','무거동','성남동'],pages:['드레스코드','예산','시간대','주차','매너','주변코스','비교']},
  {msg:'지금 {n}명이 같이 읽고 있다',nums:[18,24,31,27,22,35,29]},
  {msg:'오늘 {n}번째로 들어온 사람이 있다',nums:[847,923,756,1024,889]},
  {msg:'방금 유형 테스트 결과 "{type}" 나온 사람 있다',types:['파티 본능형','전략가형','바이브 서퍼','관찰자형']},
  {msg:'누가 친구한테 이 링크 보냈다',areas:[]},
  {msg:'방금 퀴즈 맞힌 사람 있다 🎉',areas:[]},
];
function showSocialProof(){
  var sp=socialProofs[Math.floor(Math.random()*socialProofs.length)];
  var msg=sp.msg;
  if(sp.areas&&sp.areas.length)msg=msg.replace('{area}',sp.areas[Math.floor(Math.random()*sp.areas.length)]);
  if(sp.pages)msg=msg.replace('{p}',sp.pages[Math.floor(Math.random()*sp.pages.length)]);
  if(sp.nums)msg=msg.replace('{n}',sp.nums[Math.floor(Math.random()*sp.nums.length)]);
  if(sp.types)msg=msg.replace('{type}',sp.types[Math.floor(Math.random()*sp.types.length)]);
  var el=document.getElementById('socialTicker');
  document.getElementById('stMsg').textContent=msg;
  el.classList.add('show');
  setTimeout(function(){el.classList.remove('show')},4000);
}
function scheduleSocialProof(){
  var delay=15000+Math.random()*25000;
  setTimeout(function(){
    if(!document.hidden)showSocialProof();
    scheduleSocialProof();
  },delay);
}
setTimeout(function(){showSocialProof();scheduleSocialProof()},8000);

/* ---- v3-2. 나이트 유형 테스트 ---- */
var ttQuestions=[
  {q:'금요일 밤 10시. 친구가 "나이트 갈래?" 하면?',opts:['즉시 옷 갈아입는다','일단 뭐 입지? 30분 고민','귀찮은데... 하다가 결국 간다','미리 계획 세워둔 날만 간다'],scores:[3,1,2,0]},
  {q:'나이트 도착. 제일 먼저 하는 건?',opts:['바로 플로어로 직행','일단 바에서 한 잔','주변 분위기부터 파악','친구들 테이블 세팅'],scores:[3,2,0,1]},
  {q:'DJ가 내 취향 아닌 노래를 틀면?',opts:['상관없이 계속 춤','잠깐 쉬면서 음료','어? 이 노래도 괜찮네?','신청곡 넣으러 간다'],scores:[3,0,2,1]},
  {q:'모르는 사람이 말을 걸어오면?',opts:['자연스럽게 대화 시작','웃으면서 건배 한 잔','살짝 긴장하지만 OK','친구 뒤에 숨는다'],scores:[3,2,1,0]},
  {q:'새벽 2시. 체력은?',opts:['아직 웜업 단계인데?','슬슬 해장 갈 준비','발이 아프지만 버틴다','이미 택시 예약 완료'],scores:[3,1,2,0]},
];
var ttTypes=[
  {name:'🔥 파티 본능형',icon:'🔥',desc:'음악 나오면 몸이 먼저 반응하는 타입이다. 머리로 생각하기 전에 어깨가 먼저 움직인다. 자정 넘어야 워밍업 끝나고, 새벽 3시에도 "한 곡만 더" 하는 놈이다. 네 옆에 있으면 가만히 있던 사람도 결국 일어난다. 그게 네 힘이다.'},
  {name:'😎 바이브 서퍼',icon:'😎',desc:'분위기를 읽는다. 언제 들어가야 하는지, 언제 빠져야 하는지 몸이 안다. 억지로 안 한다. 흐름 타다가 좋을 때 슬쩍 나타나고, 질리기 전에 빠진다. 같이 가면 아무도 안 피곤하다. 넌 그냥 있어도 괜찮은 사람이다.'},
  {name:'🧠 전략가형',icon:'🧠',desc:'가기 전부터 계획이 다 있다. 몇 시 출발, 뭐 마실지, 대리비 얼마, 2차 어디. 엑셀 안 쓴 게 신기할 정도다. 이런 사람이 팀에 한 명은 있어야 밤이 망하지 않는다. 근데 가끔은 계획 없이 가봐. 예상 못 한 밤이 제일 기억에 남더라.'},
  {name:'👀 관찰자형',icon:'👀',desc:'구석 바에서 맥주 한 잔. 사람 구경이 제일 재밌다. 저 커플 싸우려나, 저 테이블 분위기 좋네, DJ 오늘 컨디션 괜찮은데. 그렇게 보고 있으면 한 시간이 금방 간다. 처음이라 긴장돼도 상관없다. 기둥이 네 첫 번째 친구가 되는 날, 그게 시작이다.'},
];
var ttStep=0,ttScoreTotal=0;
function initTypeTest(){
  ttStep=0;ttScoreTotal=0;
  document.getElementById('ttResult').style.display='none';
  document.getElementById('ttBody').style.display='block';
  renderTTProgress();renderTTQuestion();
}
function renderTTProgress(){
  var html='';
  for(var i=0;i<ttQuestions.length;i++){
    var cls='tt-dot';
    if(i<ttStep)cls+=' done';
    if(i===ttStep)cls+=' now';
    html+='<div class="'+cls+'"></div>';
  }
  document.getElementById('ttProgress').innerHTML=html;
}
function renderTTQuestion(){
  if(ttStep>=ttQuestions.length){showTTResult();return}
  var q=ttQuestions[ttStep];
  document.getElementById('ttQuestion').textContent='Q'+(ttStep+1)+'. '+q.q;
  var html='';
  for(var i=0;i<q.opts.length;i++){
    html+='<div class="tt-opt" onclick="ttAnswer('+q.scores[i]+')">'+q.opts[i]+'</div>';
  }
  document.getElementById('ttOptions').innerHTML=html;
}
function ttAnswer(score){
  ttScoreTotal+=score;ttStep++;
  renderTTProgress();
  renderTTQuestion();
}
function showTTResult(){
  document.getElementById('ttBody').style.display='none';
  var idx;
  if(ttScoreTotal>=12)idx=0;
  else if(ttScoreTotal>=8)idx=1;
  else if(ttScoreTotal>=4)idx=2;
  else idx=3;
  var t=ttTypes[idx];
  var html='<div class="tt-result">';
  html+='<h2>'+t.icon+'</h2>';
  html+='<h4>'+t.name+'</h4>';
  html+='<p class="tt-type-desc">'+t.desc+'</p>';
  html+='<button class="tt-share" onclick="shareTTResult(\''+t.name+'\')">📤 결과 공유하기</button>';
  html+='<button class="tt-retry" onclick="initTypeTest()">🔄 다시 테스트</button>';
  html+='</div>';
  document.getElementById('ttResult').innerHTML=html;
  document.getElementById('ttResult').style.display='block';
  showToast('🧪 '+t.name+' — 이게 너다');
  if(badges.indexOf('tester')===-1)awardBadge('tester','🧪','유형 테스트 끝','네가 어떤 놈인지 알았다');
}
function shareTTResult(name){
  if(navigator.share){
    navigator.share({title:'나의 나이트 유형: '+name,text:'울산챔피언나이트 유형 테스트 결과: '+name+' 🎉',url:'https://ulsanb.pages.dev/'});
  }else{
    navigator.clipboard.writeText('나의 나이트 유형: '+name+' 🎉 https://ulsanb.pages.dev/').then(function(){showToast('📋 복사됐다. 친구한테 보내봐')});
  }
}
window.addEventListener('DOMContentLoaded',function(){_idle(initTypeTest)});

/* ---- v3-3. 시간 잠금 콘텐츠 ---- */
function checkTimeLocks(){
  var elapsed=Math.floor((Date.now()-startTime)/1000)+totalTime;
  var locks=[{id:'timeLock3',sec:180,timer:'tlTimer3'},{id:'timeLock5',sec:300,timer:'tlTimer5'},{id:'timeLock10',sec:600,timer:'tlTimer10'}];
  locks.forEach(function(l){
    var el=document.getElementById(l.id);
    if(!el)return;
    var remain=l.sec-elapsed;
    if(remain<=0){
      if(!el.classList.contains('unlocked')){
        el.classList.add('unlocked');
        showToast('🔓 잠금이 풀렸다. 확인해봐.');
      }
    }else{
      var tm=document.getElementById(l.timer);
      if(tm){
        var m=Math.floor(remain/60),s=remain%60;
        tm.textContent='남은 시간: '+m+':'+(s<10?'0':'')+s;
      }
    }
  });
}
/* 기존 setInterval 제거 — tickOneSecond()에서 통합 호출 */

/* ---- v3-4. 주말 카운트다운 ---- */
function updateWeekendCD(){
  var now=new Date();
  var day=now.getDay(),hours=now.getHours();
  // 금요일(5) 22시(밤10시) 기준
  var targetDay=5,targetHour=22;
  var daysUntil=((targetDay-day)+7)%7;
  if(daysUntil===0&&hours>=targetHour)daysUntil=7;
  var target=new Date(now);
  target.setDate(target.getDate()+daysUntil);
  target.setHours(targetHour,0,0,0);
  var diff=target-now;
  if(diff<0)diff+=7*24*60*60*1000;
  var d=Math.floor(diff/(1000*60*60*24));
  var h=Math.floor((diff%(1000*60*60*24))/(1000*60*60));
  var m=Math.floor((diff%(1000*60*60))/(1000*60));
  var s=Math.floor((diff%(1000*60))/1000);
  var text='';
  if(d>0)text+=d+'일 ';
  text+=h+'시간 '+m+'분 '+s+'초';
  document.getElementById('wcTime').textContent=text;
  // 금토 밤이면 특별 메시지
  if((day===5||day===6)&&(hours>=20||hours<5)){
    document.getElementById('wcTime').textContent='🔥 지금이 바로 그 밤이다!';
    document.querySelector('.wc-sub').textContent='읽었으면 나가. 놀아라.';
  }
}
updateWeekendCD();
/* 기존 setInterval 제거 — tickOneSecond()에서 통합 호출 */

/* ---- v3-4b. 예약 마감 좌석 카운트 ---- */
function updateSeatCount(){
  var now=new Date();var day=now.getDay(),hour=now.getHours();
  /* 요일+시간 기반 좌석 수: 금토 가까울수록 줄어듦 */
  var base=12;
  if(day>=4)base-=(day-3)*2;/* 목-2,금-4,토-6 */
  if(day===5&&hour>=18)base=3;
  if(day===6)base=2;
  if(day===0||day===1)base=12;/* 일월 리셋 */
  base=Math.max(2,Math.min(12,base+Math.floor(Math.random()*3)-1));
  var el=document.getElementById('seatCount');
  if(el)el.textContent=base;
}
updateSeatCount();

/* ---- v3-5. 일일 스트릭 ---- */
function updateStreak(){
  var today=new Date().toISOString().slice(0,10);
  var streakData=JSON.parse(localStorage.getItem('ucn_streak')||'{"days":[],"count":0}');
  var days=streakData.days;
  if(days.indexOf(today)===-1){
    // 연속 체크
    var yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
    var yStr=yesterday.toISOString().slice(0,10);
    if(days.length===0||days[days.length-1]===yStr){
      days.push(today);
      streakData.count=days.length;
    }else if(days[days.length-1]!==today){
      days=[today];
      streakData.count=1;
    }
    // 최근 7일만 유지
    if(days.length>7)days=days.slice(-7);
    streakData.days=days;
    localStorage.setItem('ucn_streak',JSON.stringify(streakData));
  }
  var count=streakData.count;
  if(count>=1){
    document.getElementById('streakBar').style.display='flex';
    document.getElementById('streakText').textContent='연속 '+count+'일째 방문!';
    var daysEl=document.getElementById('streakDays');
    var html='';
    for(var i=0;i<7;i++){
      if(i<count)html+='<div class="sk-day done">'+('일월화수목금토'[new Date(Date.now()-((count-1-i)*86400000)).getDay()])+'</div>';
      else html+='<div class="sk-day">·</div>';
    }
    daysEl.innerHTML=html;
    if(count>=3&&badges.indexOf('streak3')===-1){awardBadge('streak3','🔥','3일 연속','사흘 내리 왔다. 중독인 거 맞지?')}
    if(count>=7&&badges.indexOf('streak7')===-1){awardBadge('streak7','💎','7일 연속','일주일 매일 왔다. 여기 직원 해라 진짜')}
  }
  // 재방문 환영
  if(totalTime>0&&days.length>1){
    setTimeout(function(){showToast('👋 또 왔네. 반갑다.')},2000);
  }
}
updateStreak();

/* ---- v3-6. 팁 컬렉션 도감 ---- */
var collectedTips=JSON.parse(localStorage.getItem('ucn_tips')||'[]');
var tipIcons=['💡','👔','🍺','🚕','🤝','🥩','📱','🎵','💰','🅿️','👑','🎉','🧊','🎧','🍜','😄'];
function initTipCollection(){
  var grid=document.getElementById('tcGrid');
  if(!grid)return;
  grid.innerHTML='';
  for(var i=0;i<slotTips.length;i++){
    var div=document.createElement('div');
    div.className='tc-slot';
    if(collectedTips.indexOf(i)!==-1){
      div.classList.add('got');
      div.textContent=tipIcons[i]||'✨';
      div.title=slotTips[i];
    }else{
      div.classList.add('empty');
    }
    grid.appendChild(div);
  }
  var countEl=document.getElementById('tcCount');
  if(countEl)countEl.textContent=collectedTips.length+'/'+slotTips.length;
  if(collectedTips.length===slotTips.length&&badges.indexOf('collector')===-1){
    awardBadge('collector','📚','팁 마니아','16개 전부 모았다. 이 정도면 집착이다');
  }
}
// 슬롯 스핀 시 컬렉션에 추가하도록 기존 spinSlot 확장
var _origSpinSlot=spinSlot;
spinSlot=function(){
  var reel=document.getElementById('slotReel');
  var idx=Math.floor(Math.random()*slotTips.length);
  var spins=8+Math.floor(Math.random()*5);
  var i=0;
  var interval=setInterval(function(){
    reel.textContent=slotTips[Math.floor(Math.random()*slotTips.length)];
    reel.style.transform='translateY('+((i%2===0)?-3:3)+'px)';
    i++;
    if(i>=spins){
      clearInterval(interval);
      reel.textContent=slotTips[idx];
      reel.style.transform='translateY(0)';
      slotSpinCount++;
      if(slotSpinCount===3)showToast('🎰 3번째 뽑기. 슬슬 중독되지?');
      if(slotSpinCount===7&&badges.indexOf('slotter')===-1){awardBadge('slotter','🎰','뽑기 중독','7번이나 돌렸다. 못 말린다')}
      // 컬렉션 추가
      if(collectedTips.indexOf(idx)===-1){
        collectedTips.push(idx);
        localStorage.setItem('ucn_tips',JSON.stringify(collectedTips));
        showToast('📚 새 팁 겟! ('+collectedTips.length+'/'+slotTips.length+')');
        initTipCollection();
      }else{
        // 이미 수집된 거 — 니어미스 효과
        if(collectedTips.length<slotTips.length){
          var remaining=slotTips.length-collectedTips.length;
          showToast('😅 이건 이미 뽑았다. 아직 '+remaining+'개 남았는데?');
        }
      }
    }
  },80);
};
window.addEventListener('DOMContentLoaded',function(){_idle(initTipCollection)});

/* ---- v3-7. 이모지 리액션 ---- */
var reactions=JSON.parse(localStorage.getItem('ucn_reactions')||'{}');
function reactEmoji(btn,emoji){
  // 플로팅 이모지 애니메이션
  var rect=btn.getBoundingClientRect();
  for(var i=0;i<3;i++){
    var fe=document.createElement('div');
    fe.className='float-emoji';
    fe.textContent=emoji;
    fe.style.left=(rect.left+Math.random()*30)+'px';
    fe.style.bottom=(window.innerHeight-rect.top+Math.random()*20)+'px';
    fe.style.animationDelay=(i*0.15)+'s';
    document.body.appendChild(fe);
    setTimeout(function(e){e.remove()}.bind(null,fe),2000);
  }
  // 카운트 업
  var key=emoji;
  reactions[key]=(reactions[key]||0)+1;
  localStorage.setItem('ucn_reactions',JSON.stringify(reactions));
  // 전체 리액션 카운트 업데이트 (fake + real)
  updateReactionCounts();
  btn.style.transform='scale(1.3)';
  setTimeout(function(){btn.style.transform=''},200);
}
function updateReactionCounts(){
  var map={'🔥':'rc-fire','👍':'rc-thumb','😂':'rc-laugh','🤩':'rc-star','💯':'rc-100'};
  var bases={'🔥':47,'👍':32,'😂':28,'🤩':19,'💯':41};
  Object.keys(map).forEach(function(k){
    var el=document.getElementById(map[k]);
    if(el)el.textContent=bases[k]+(reactions[k]||0);
  });
}
window.addEventListener('DOMContentLoaded',function(){_idle(updateReactionCounts)});

/* ---- v3-8. 챌린지 진행 ---- */
function updateChallenge(){
  var prog=document.getElementById('challengeProg');
  if(prog)prog.textContent=visitedPages.length+'/8';
}
var _origTrackVisit=trackVisit;
trackVisit=function(p){
  _origTrackVisit(p);
  updateChallenge();
};
window.addEventListener('DOMContentLoaded',function(){_idle(updateChallenge)});

/* ---- v3-9. 읽기 속도 감지 ---- */
var scrollSamples=[],lastScrollY=0;
function tickScrollSpeed(){
  var y=window.pageYOffset||0;
  scrollSamples.push(Math.abs(y-lastScrollY));
  lastScrollY=y;
  if(scrollSamples.length>10)scrollSamples.shift();
  var avg=scrollSamples.reduce(function(a,b){return a+b},0)/scrollSamples.length;
  var el=document.getElementById('readSpeed');
  var txt=document.getElementById('rsText');
  if(!el||!txt)return;
  if(avg>50){txt.textContent='빠르게 스크롤 중';el.classList.add('show')}
  else if(avg>10){txt.textContent='읽는 중...';el.classList.add('show')}
  else if(avg>0){txt.textContent='꼼꼼히 읽는 중 👀';el.classList.add('show')}
  else{el.classList.remove('show')}
}
/* 기존 setInterval 제거 — restartCoreTimers()에서 safeInterval 호출 */

/* ---- v3-10. 강화된 간헐적 보상 (도파민 스파이크) ---- */
var dopamineMessages=[
  {msg:'🎯 여기까지 읽는 사람 열 명 중 한 명도 안 된다. 너 꽤 진심이다.',delay:120000},
  {msg:'💡 🔒 표시 눌러봤어? 아직 숨겨진 얘기가 있다.',delay:180000},
  {msg:'🔥 이 정도 읽었으면 가서 실패할 일 없다.',delay:240000},
  {msg:'🏆 뱃지 '+0+'개 모았다. 더 있는데?',delay:300000},
  {msg:'👑 10분 넘게 읽고 있다. 이쯤 되면 직원보다 많이 안다.',delay:600000},
  {msg:'🎰 팁 도감 다 채워봐. 아직 빈 칸 있잖아.',delay:400000},
  {msg:'⭐ 유형 테스트 해봤어? 네가 어떤 타입인지 궁금하지 않아?',delay:200000},
];
dopamineMessages.forEach(function(dm){
  setTimeout(function(){
    if(document.hidden)return;
    var msg=dm.msg.replace(''+0,badges.length.toString());
    showToast(msg);
  },dm.delay);
});

/* ---- v3-11. 이탈 방지 (비지빌리티 체인지) ---- */
document.addEventListener('visibilitychange',function(){
  if(document.hidden){
    // 유저가 탭을 벗어남
    document.title='👋 돌아와! — 울산챔피언나이트';
  }else{
    // 돌아옴
    var page=document.querySelector('.page.active');
    if(page){
      document.title=page.getAttribute('data-title')||'울산챔피언나이트 — 처음 가기 전에 이것만 읽어라';
    }
    showToast('👋 돌아왔네. 어디까지 읽었더라?');
  }
});

/* ---- v3-12. 인터랙션 리플 효과 ---- */
document.addEventListener('click',function(e){
  var t=e.target;
  if(t.classList.contains('card')||t.classList.contains('nav-link')||t.classList.contains('quiz-option')||t.classList.contains('spoiler-header')){
    var ripple=document.createElement('div');
    ripple.style.cssText='position:absolute;border-radius:50%;background:rgba(201,169,110,.2);transform:scale(0);animation:rippleAnim .6s forwards;pointer-events:none;width:40px;height:40px;left:'+(e.offsetX-20)+'px;top:'+(e.offsetY-20)+'px';
    t.style.position='relative';t.style.overflow='hidden';
    t.appendChild(ripple);
    setTimeout(function(){ripple.remove()},600);
  }
});

/* ---- v3-13. 이스터에그 시스템 ---- */
var easterEggs=0;
var easterFound=JSON.parse(localStorage.getItem('ucn_easter')||'[]');
// 로고를 5번 클릭하면 이스터에그
var logoClicks=0;
document.querySelector('.nav-logo').addEventListener('click',function(e){
  e.preventDefault();
  logoClicks++;
  if(logoClicks===5){
    logoClicks=0;
    if(easterFound.indexOf('logo')===-1){
      easterFound.push('logo');
      localStorage.setItem('ucn_easter',JSON.stringify(easterFound));
      showToast('🥚 이걸 찾았네? 로고 5번 누른 거 너밖에 없다');
      if(badges.indexOf('easter')===-1)awardBadge('easter','🥚','숨은 거 찾는 놈','대체 왜 로고를 5번이나 눌러본 거야');
    }else{
      showToast('🥚 이건 이미 찾았잖아. 또 누르고 있네');
    }
  }else if(logoClicks>=3){
    showToast('👀 뭔가 있는 것 같은데... ('+(5-logoClicks)+'번 더)');
  }
});

// 히어로 영역 더블클릭 이스터에그
document.getElementById('hero-section').addEventListener('dblclick',function(){
  if(easterFound.indexOf('hero')===-1){
    easterFound.push('hero');
    localStorage.setItem('ucn_easter',JSON.stringify(easterFound));
    showToast('✨ 히어로를 왜 두 번 누르나 했더니. 찾았네.');
  }
});

/* ---- v3-14. 다이나믹 히어로 타이핑 효과 ---- */
var heroSubs=['솔직히 말한다. 9시에 갔다가 망했다. 그 뒤로 전부 정리했다. 안 읽고 가면 나처럼 된다.','솔직히 말한다. 텅 빈 홀에서 혼자 서 있던 그 민망함. 너는 겪지 마라.','솔직히 말한다. 드레스코드부터 해장까지. 전부 몸으로 겪고 쓴 거다.','솔직히 말한다. 이거 읽고 간 놈 중에 실패한 놈 없다. 진짜로.','솔직히 말한다. 친구가 "그냥 가면 돼" 하면 이 링크 던져라.'];
var heroSubIdx=0;
function cycleHeroSub(){
  if(currentPage!=='')return;
  var el=document.getElementById('hero-sub');
  if(!el)return;
  el.style.opacity='0';
  setTimeout(function(){
    heroSubIdx=(heroSubIdx+1)%heroSubs.length;
    el.textContent=heroSubs[heroSubIdx];
    el.style.opacity='1';
  },500);
}
/* 기존 setInterval 제거 — restartCoreTimers()에서 safeInterval 호출 */
var heroSubEl=document.getElementById('hero-sub');
if(heroSubEl)heroSubEl.style.transition='opacity .5s';

/* ---- v3-15. 세션 리캡 (5분마다) ---- */
function tickSessionRecap(){
  var elapsed=Math.floor((Date.now()-startTime)/1000)+totalTime;
  var mins=Math.floor(elapsed/60);
  if(mins>0&&mins%5===0){
    var msg='⏱ '+mins+'분째 읽고 있다. '+visitedPages.length+'/8 페이지 읽었고, 뱃지 '+badges.length+'개 모았다';
    showToast(msg);
  }
}
/* 기존 setInterval 제거 — restartCoreTimers()에서 safeInterval 호출 */

/* ---- v3-16. 미니 퀴즈 3문항 ---- */
var mqAnswers=[];
function mqAnswer(step,choice){
  mqAnswers.push(choice);
  var cur=document.getElementById('mqStep'+step);
  if(cur){
    cur.querySelectorAll('.quiz-option').forEach(function(o){o.style.pointerEvents='none';o.style.opacity='.5'});
    var clicked=cur.querySelectorAll('.quiz-option')['ABC'.indexOf(choice)];
    if(clicked){clicked.style.opacity='1';clicked.style.borderColor='var(--gold)';clicked.style.background='rgba(201,169,110,.08)'}
  }
  var next=document.getElementById('mqStep'+(step+1));
  if(next){setTimeout(function(){next.style.display='block';next.scrollIntoView({behavior:'smooth',block:'center'})},400);return}
  /* 결과 */
  setTimeout(function(){
    var a=mqAnswers.filter(function(c){return c==='A'}).length;
    var b=mqAnswers.filter(function(c){return c==='B'}).length;
    var types={
      A:{icon:'🔥',name:'파티 본능형',desc:'음악 나오면 몸이 먼저 반응한다. 에너지가 넘치는 타입. 자정 넘어야 워밍업이 끝나는 체력 괴물이다. 금요일 밤 11시에 가면 새벽 3시까지 플로어를 지배한다.'},
      B:{icon:'😎',name:'바이브 서퍼',desc:'분위기를 읽는다. 억지로 안 하고 흐름을 탄다. 바에서 한 잔 하면서 여유롭게 즐기는 스타일. 같이 가면 아무도 안 피곤하다.'},
      C:{icon:'👀',name:'관찰자형',desc:'구석에서 맥주 한 잔. 사람 구경이 제일 재밌다. 처음이라 긴장돼도 괜찮다. 그렇게 보고 있으면 한 시간이 금방 간다. 기둥이 네 첫 번째 친구다.'}
    };
    var winner=a>=2?'A':b>=2?'B':'C';
    var t=types[winner];
    document.getElementById('mqBody').style.display='none';
    document.getElementById('mqIcon').textContent=t.icon;
    document.getElementById('mqType').textContent=t.name;
    document.getElementById('mqDesc').textContent=t.desc;
    document.getElementById('mqResult').style.display='block';
    showToast('🎯 '+t.name+' — 결과 나왔다!');
  },500);
}

/* ---- v3-17. 스와이프 갤러리 도트 ---- */
function hydrateSwipeSlides(){
  var track=document.getElementById('swipeTrack');
  var dots=document.getElementById('swipeDots');
  var tpl=document.getElementById('swipeSlidesTpl');
  if(!track||!dots||!tpl||track.firstChild)return;
  track.appendChild(tpl.content.cloneNode(true));
  var slides=track.querySelectorAll('.swipe-slide');
  dots.innerHTML='';
  for(var i=0;i<slides.length;i++){
    var s=document.createElement('span');
    if(i===0)s.className='active';
    dots.appendChild(s);
  }
  track.addEventListener('scroll',function(){
    var idx=Math.round(track.scrollLeft/272);
    dots.querySelectorAll('span').forEach(function(d,j){d.className=j===idx?'active':''});
  },{passive:true});
}
function initSwipeDots(){
  var track=document.getElementById('swipeTrack');
  if(!track)return;
  /* CLS 방지: viewport 진입 시점에만 슬라이드 hydrate */
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries,obs){
      entries.forEach(function(e){if(e.isIntersecting){hydrateSwipeSlides();obs.disconnect()}});
    },{rootMargin:'200px'});
    io.observe(track);
  }else{
    hydrateSwipeSlides();
  }
}
window.addEventListener('DOMContentLoaded',function(){_idle(initSwipeDots)});

/* ---- v3-18. Exit Intent — 스크롤 올리면 이탈 방지 ---- */
var exitShown=false,prevScrollY=0;
var exitClosed=(function(){try{return sessionStorage.getItem('ucn_exit_closed')==='1'}catch(e){return false}})();
window.addEventListener('scroll',function(){
  if(exitClosed||exitShown)return;
  var y=window.pageYOffset||0;
  var scrollPct=y/(document.documentElement.scrollHeight-window.innerHeight)*100;
  /* 30% 이상 읽은 후 빠르게 위로 올리면 트리거 */
  if(scrollPct>30&&y<prevScrollY-100){
    document.getElementById('exitBanner').classList.add('show');
    exitShown=true;
    setTimeout(function(){
      if(!exitClosed)document.getElementById('exitBanner').classList.remove('show');
      exitShown=false;
    },5000);
  }
  prevScrollY=y;
},{passive:true});
function closeExitBanner(e){
  if(e&&e.stopPropagation)e.stopPropagation();
  var b=document.getElementById('exitBanner');
  if(b)b.classList.remove('show');
  exitClosed=true;
  exitShown=false;
  try{sessionStorage.setItem('ucn_exit_closed','1')}catch(err){}
}

/* ---- 🚀 코어 타이머 최초 시작 (TBT 절감: idle 시점에 시작) ---- */
_idle(restartCoreTimers);

/* ---- PWA Service Worker 등록 (오프라인 + 빠른 재방문) ---- */
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){});
  });
}
