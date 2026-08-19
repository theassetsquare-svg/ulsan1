/* 밤 시간표 연구소 — 데이터 집계
   업소 원고는 time-venues-1..4.js 에 나뉘어 있다. 공용 문장 풀 없음: 페이지마다 새로 씀. */

const SITE = 'https://ulsanf.pages.dev';
const TODAY = '2026-08-16';
const KAKAO_ID = 'besta12';
const KAKAO_URL = 'https://open.kakao.com/o/sBesta12';

/* 페이지 단위 전화 정답표 — 이 셋과 홈 외에는 어떤 전화번호도 넣지 않는다 */
const ADVERTISERS = {
  '__home__': { label: '울산챔피언나이트 춘자', phone: '010-5653-0069' },
  'ulsan-champion': { label: '울산챔피언나이트 춘자', phone: '010-5653-0069' },
  'changwon-lululala': { label: '창원룰루랄라나이트 로또', phone: '010-7528-4936' },
  'bulgwang-hobak': { label: '불광동호박나이트 손흥민', phone: '010-2221-1937' }
};

const VENUES = [].concat(
  require('./time-venues-1.js'),
  require('./time-venues-2.js'),
  require('./time-venues-3.js'),
  require('./time-venues-4.js')
);

const HUB = {
  slug: 'hub',
  title: '전국 나이트 시간표 40 — 도시마다 밤이 다르다',
  h1: '전국 나이트 시간표 40',
  desc: '전국 나이트 마흔 곳을 시간과 요일 축으로만 정리한 목록이다. 도시마다 밤이 데워지는 속도가 다르다.',
  ogAlt: '전국 나이트 시간표 40 허브 — 광고문의 카카오톡 besta12',
  lead: [
    '이 목록은 마흔 곳을 <strong>시간과 요일</strong>이라는 하나의 축으로만 다시 세운 것이다.',
    '어느 도시는 초저녁부터 사람이 앉고, 어느 도시는 자정을 넘겨야 홀이 데워진다. 같은 밤이라는 말이 실제로는 서로 다른 밤을 가리킨다.',
    '각 페이지는 오픈 직후부터 마감 흐름까지를 순서대로 따라간다. 궁금한 지역부터 열어보면 된다.'
  ],
  oneline: '도시를 고르기 전에, 그 도시의 밤이 몇 번째 곡에서 데워지는지를 먼저 본다.'
};

module.exports = { SITE, TODAY, VENUES, HUB, KAKAO_ID, KAKAO_URL, ADVERTISERS, HOME: require('./time-home.js') };
