// 페이지: 취향실험실, 후루룩클럽, 내 도감, 소개·약관·문의, 운영 관리, 404
import { esc, cfg, SITE_NAME, OPERATOR, RAMEN, layout, icon, WAVE, img, pageBanner, crumbs, crumbLd, secHead, moreLink, today, readJSON, COUNTRIES, hotChip } from './lib.mjs';
import { HOTS, STYLES } from '../server/catalog-data.js';
import { promisesHTML } from './pages-main.mjs';
import { LEVELS, RULES, BADGES, levelOf, glyph, emblemSVG, badgeSVG } from '../server/growth-data.js';
import { POST_CATS } from '../server/util.js';

// ---------- 취향실험실 ----------
const LAB = [
  ['map', '맛 지도', '맵기와 진하기처럼 두 칸을 골라 라면들이 어디쯤 있는지 지도로 봐요.', 'lab-heat', '맵기가 다른 국물 세 숟가락', 'i-map'],
  ['compare', '라면 비교', '두세 개를 나란히 놓고 맛 지도와 기본 정보를 비교해요.', 'lab-compare', '빨간 국물과 맑은 국물 라면 비교', 'i-swap'],
  ['worldcup', '라면 월드컵', '둘 중 하나를 고르다 보면 나의 최애 라면이 남아요.', 'club-vote', '라면 두 그릇 앞의 빨간 표와 노란 표', 'i-trophy'],
  ['timer', '조리 타이머', '면 익힘을 초 단위로. 계란 넣을 때도 알려 줘요.', 'lab-texture', '젓가락으로 들어 올린 가는 면과 굵은 면', 'i-timer'],
  ['water', '물 양 계산기', '두 봉지, 세 봉지 끓일 때 물을 얼마나 넣을지 계산해요.', 'club-recipe', '냄비에서 끓고 있는 라면', 'i-drop'],
  ['heat', '맵기 사다리', '라면 회사가 밝힌 스코빌 지수로 매운 순서를 줄 세웠어요. 신라면의 몇 배인지도 함께 봐요.', 'broth-spicy', '빨간 국물 라면 한 그릇', 'i-flame'],
  ['pick', '오늘의 라면 뽑기', '나라, 맵기, 종류를 고르고 뽑기를 누르면 오늘 먹을 라면 하나를 골라 드려요.', 'mixed-bibim', '비빔면 한 그릇', 'i-dice'],
  ['quiz', '라면 퀴즈', '세계 라면 상식 10문제. 문제마다 답과 짧은 이야기가 따라 나와요.', 'archive-card', '라면 사진 카드를 꽂아 둔 나무 서랍', 'i-help'],
];
const labTabs = (cur) => `<nav class="sub-tabs" aria-label="취향실험실 메뉴"><a href="/lab/"${cur === '' ? ' aria-current="page"' : ''}>실험실 홈</a>${LAB.map(([k, t]) => `<a href="/lab/${k}/"${cur === k ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;

export function labHubPage() {
  const body = `${pageBanner('banner-lab', '취향실험실', '맵기 · 진하기 · 면 탄력 비교. 기록이 모일수록 실험이 정확해져요.', '빨간 국물 라면과 맑은 국물 라면', '면면 실험실')}
<div class="wrap">
${labTabs('')}
<div class="lab-cards">${LAB.map(([k, t, d, im, alt, ic]) => `<a class="lab-card" href="/lab/${k}/">${img(im, alt)}<div><h2>${icon(ic)}${t}</h2><p>${d}</p></div></a>`).join('')}</div>
<p class="note">맛 지도와 비교는 회원들이 남긴 한 그릇 기록으로 그려요. 기록이 세 개 넘게 모인 라면부터 지도에 나타나요.</p>
</div>`;
  return layout({ title: `취향실험실 - 맛 지도, 라면 비교, 맵기 사다리, 라면 퀴즈 | ${SITE_NAME}`, description: '라면 맛 지도, 라면 비교, 라면 월드컵, 맵기 사다리, 오늘의 라면 뽑기, 라면 퀴즈, 조리 타이머, 물 양 계산기. 내 입맛에 맞는 라면을 찾아요.', path: '/lab/', body });
}

function labPage(key, title, lead, inner, desc, script = 'lab.js') {
  const t = LAB.find((x) => x[0] === key);
  const body = `<div class="wrap">
${crumbs([['/', SITE_NAME], ['/lab/', '취향실험실'], [`/lab/${key}/`, title]])}
${labTabs(key)}
<section class="page-head page-head-pic">
<div><p class="kicker">${WAVE}취향실험실</p><h1>${esc(title)}</h1><p>${lead}</p></div>
${img(t[3], t[4], 'page-head-img', true)}
</section>
<div class="lab" data-lab="${key}">${inner}</div>
</div>`;
  return layout({ title: `${title} | ${SITE_NAME} 취향실험실`, description: desc, path: `/lab/${key}/`, body, scripts: script ? [script] : [], jsonld: crumbLd([['/', SITE_NAME], ['/lab/', '취향실험실'], [`/lab/${key}/`, title]]) });
}

export const labPages = () => [
  ['lab/map', labPage('map', '맛 지도', '두 칸을 골라 라면들이 어디쯤 있는지 봐요. 점을 누르면 그 라면으로 가요.', '<p class="muted">지도를 그리는 중이에요</p>', '회원들의 한 그릇 기록으로 그린 라면 맛 지도. 맵기, 진하기, 면 탄력 등 두 칸을 골라 라면 위치를 비교해요.')],
  ['lab/compare', labPage('compare', '라면 비교', '라면을 두세 개 골라 나란히 놓아 보세요. 맛 지도는 기록이 모인 라면만 그려요.', '<p class="muted">불러오는 중이에요</p>', '라면 두세 개를 골라 맛 지도, 별점, 기본 정보를 나란히 비교해요.')],
  ['lab/worldcup', labPage('worldcup', '라면 월드컵', '두 그릇 가운데 더 끌리는 쪽을 고르세요. 끝까지 고르면 모두의 결과와 비교해 드려요.', '<p class="muted">준비하는 중이에요</p>', '16강, 32강 라면 월드컵으로 나의 최애 라면을 찾고 모두의 우승 기록과 비교해요.')],
  ['lab/timer', labPage('timer', '조리 타이머', '봉지에 적힌 시간을 맞추고 시작을 누르세요. 화면을 켜 둔 채로 쓰면 가장 정확해요.', timerHTML(), '라면 조리 타이머. 3분, 4분, 4분 30초 같은 시간을 맞추고, 계란 넣을 때와 불 끌 때를 알려 줘요.')],
  ['lab/water', labPage('water', '물 양 계산기', '봉지 뒷면에 적힌 한 봉지 물 양을 넣으면 여러 봉지를 끓일 때 필요한 물을 계산해요.', waterHTML(), '라면 여러 봉지를 끓일 때 필요한 물 양을 ml, 종이컵, 계량컵으로 계산해요.')],
  ['lab/heat', labPage('heat', '맵기 사다리', '라면 회사가 밝혀 기사에 실린 스코빌 지수(SHU)로 매운 순서를 줄 세웠어요. 막대 오른쪽 숫자는 신라면(3,400 SHU)의 몇 배인지예요.', heatHTML(), '신라면, 불닭볶음면, 핵불닭, 틈새라면, 킹뚜껑까지 라면 회사가 밝힌 스코빌 지수로 줄 세운 맵기 사다리.', '')],
  ['lab/pick', labPage('pick', '오늘의 라면 뽑기', '고르기 어려운 날엔 뽑기에 맡겨 보세요. 조건을 정하면 그 안에서 하나를 골라 드려요.', pickHTML(), '나라, 맵기, 종류를 고르면 오늘 먹을 라면 하나를 골라 주는 라면 뽑기.', 'fun.js')],
  ['lab/quiz', labPage('quiz', '라면 퀴즈', '문제는 매번 섞여서 나와요. 다 풀면 점수와 함께 더 읽을거리를 보여 드려요.', quizHTML(), '세계 첫 라면부터 나라별 라면 문화까지, 라면 상식 퀴즈 10문제.', 'fun.js')],
];

// 맵기 사다리: 회사가 밝힌 스코빌 지수만 줄 세워요
const SHIN = 3400;
function heatHTML() {
  const list = RAMEN.filter((r) => r.shu).sort((a, b) => b.shu.v - a.shu.v || a.n.localeCompare(b.n, 'ko'));
  const max = list[0].shu.v;
  const rows = list.map((r, i) => {
    const x = r.shu.v / SHIN;
    return `<li class="hrow${r.s === 'shin-ramyun' ? ' hrow-base' : ''}">
<span class="hrow-n">${i + 1}</span>
<span class="hrow-name"><a href="/ramen/${r.s}/">${esc(r.n)}</a><small>${esc(r.maker)}</small></span>
<span class="hrow-bar"><i style="width:${Math.max(3, r.shu.v / max * 100).toFixed(1)}%"></i></span>
<span class="hrow-v"><b>${r.shu.v.toLocaleString('ko-KR')}</b> SHU<small>${r.s === 'shin-ramyun' ? '기준' : `신라면 × ${x >= 10 ? Math.round(x) : x.toFixed(1)}`}</small></span>
</li>`;
  }).join('');
  const SRC = [
    ['아시아경제(다음), 핵불닭보다 킹뚜껑…K-라면 매운맛 지도 (2024.7.28)', 'https://v.daum.net/v/20240728083011850'],
    ['비즈워치, 신라면=순한 맛 (2023.8.17)', 'https://news.bizwatch.co.kr/article/consumer/2023/08/17/0026'],
    ['디에디트, 어디까지 매워지는 거예요? 매운 라면 리뷰 4 (2023.9.7)', 'https://the-edit.co.kr/55927'],
    ['일간스포츠, 오뚜기 더핫 열라면 7500SHU (2025.8)', 'https://isplus.com/article/view/isp202508200001'],
  ];
  return `<ol class="heat-list">${rows}</ol>
<p class="small muted">값은 라면 회사가 밝혀 기사에 실린 것만 적었어요. 같은 제품도 기사마다 숫자가 조금씩 달라, 여러 제품이 함께 실린 한 기사(아시아경제, 2024.7)를 기준으로 맞추고 그 뒤에 나온 제품만 따로 적었어요. 회사가 값을 밝히지 않은 라면은 빠져 있어요. 용사라면은 가장 매운 단계를 골랐을 때 값이에요.</p>
<section class="sec heat-story" aria-labelledby="h-heat-story">
${secHead('매운맛 이야기', '', 'h-heat-story')}
<div class="heat-cards">
<div class="heat-card"><h3>신라면도 점점 매워졌어요</h3><p>신라면의 스코빌 지수는 처음에 1,300 정도였어요. 매운 라면이 늘던 2012년 2,000대로 올렸고, 2015년 지금의 3,400 SHU가 됐다고 해요. 2023년에는 그 두 배가 넘는 <a href="/ramen/shin-ramyun-the-red/">신라면 더 레드</a>(7,500 SHU)가 나왔어요.</p></div>
<div class="heat-card"><h3>숫자가 전부는 아니에요</h3><p>스코빌 지수는 매운 성분을 설탕물에 몇 배 희석해야 매운맛이 사라지는지로 재요. 그래서 국물에 풀리는 라면과 소스가 면에 바로 묻는 볶음면은 숫자가 같아도 느끼는 맵기가 달라요. 신라면 더 레드는 불닭볶음면보다 숫자가 높지만 국물에 희석돼 체감은 비슷하다는 후기도 있어요.</p></div>
<div class="heat-card"><h3>맵기 표시는 아직 제각각</h3><p>농림축산식품부는 2018년부터 라면 매운맛을 네 단계로 표시하도록 권했지만, 실제로 표시한 제품은 드물어요. 삼양식품은 불닭에 자체 단계(BFL)를, 맵탱에는 매운맛을 다섯 갈래로 나눈 ‘스파이시 펜타곤’을 붙여요.</p></div>
<div class="heat-card"><h3>덴마크 리콜 소동</h3><p>2024년 덴마크 정부가 핵불닭볶음면 등을 너무 맵다며 리콜했다가, 스코빌 지수를 잰 방식에 오류가 있었다는 한국 정부와 삼양식품의 지적을 받아들여 리콜을 풀었어요.</p></div>
</div>
</section>
<p class="row-btns"><a class="btn btn-line" href="/ramen/?hot=2">${icon('i-flame')}아주 매운 라면 모두 보기</a> <a class="btn btn-line" href="/lab/map/">맛 지도에서 체감 맵기 보기</a></p>
<section class="story-src" aria-labelledby="h-heat-src"><h2 id="h-heat-src">참고한 자료</h2><ol>${SRC.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ol></section>`;
}

// 오늘의 라면 뽑기: 조건은 화면에서 골라요
function pickHTML() {
  const chip = (k, v, label, on) => `<button type="button" class="fchip" data-pk="${k}" data-v="${v}" aria-pressed="${on ? 'true' : 'false'}">${esc(label)}</button>`;
  return `<div class="rpick" data-pick>
<div class="rpick-opts">
<div class="fgroup"><p class="fgroup-h">나라</p><div class="fchips">${chip('co', '', '어디든', true)}${chip('co', 'kr', '한국')}${chip('co', 'xx', '해외')}</div></div>
<div class="fgroup"><p class="fgroup-h">맵기</p><div class="fchips">${chip('hot', '', '상관없어요', true)}${Object.entries(HOTS).map(([k, v]) => chip('hot', k, v)).join('')}</div></div>
<div class="fgroup"><p class="fgroup-h">종류</p><div class="fchips">${chip('c', '', '아무거나', true)}${chip('c', 'soup', '국물')}${chip('c', 'dry', '볶음·비빔')}${chip('c', 'jj', '짜장·짬뽕')}${chip('c', 'udon', '우동·칼국수')}</div></div>
<label class="check"><input type="checkbox" data-pick-new><span>판매 중인 라면만</span></label>
</div>
<div class="rpick-stage" aria-live="polite">
<div class="rpick-slot" data-slot><span>오늘은 어떤 라면?</span></div>
<p class="rpick-pool small muted" data-pool></p>
<p class="row-btns"><button type="button" class="btn btn-main btn-lg" data-go>${icon('i-dice')}뽑기</button></p>
<div data-result></div>
</div>
</div>`;
}

// 라면 퀴즈: 문제는 content/quiz.json
const QUIZ = readJSON('content/quiz.json').questions;
QUIZ.forEach((x, i) => {
  if (!(x.o && x.o.length === 4 && x.a >= 0 && x.a < 4 && x.why && x.link)) { console.error(`[라면 퀴즈] ${i + 1}번 문제를 확인해 주세요.`); process.exit(1); }
});
function quizHTML() {
  return `<div class="quiz" data-quiz><p class="muted">퀴즈를 준비하는 중이에요</p></div>
<script type="application/json" id="quiz-data">${JSON.stringify(QUIZ).replace(/</g, '\\u003c')}</script>
<p class="note">문제는 면면 도감, 라면 이야기, 세계 라면 지도에 실은 사실로 냈어요. 틀린 곳이 보이면 <button type="button" class="link-btn" data-report="">알려 주세요</button>.</p>`;
}

function timerHTML() {
  return `<div class="timer" data-timer>
<div class="timer-face">
<svg class="timer-ring" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="88" class="ring-bg"/><circle cx="100" cy="100" r="88" class="ring-fg" data-ring/></svg>
<div class="timer-num"><output data-time aria-live="off">4:00</output><span data-state>준비</span></div>
</div>
<div class="timer-presets" role="group" aria-label="자주 쓰는 시간">${[[180, '3분'], [210, '3분 30초'], [240, '4분'], [270, '4분 30초'], [300, '5분']].map(([s, l]) => `<button type="button" class="chip" data-preset="${s}">${l}</button>`).join('')}</div>
<div class="timer-adj"><button type="button" class="btn btn-line" data-adj="-30">−30초</button><button type="button" class="btn btn-line" data-adj="-10">−10초</button><button type="button" class="btn btn-line" data-adj="10">+10초</button><button type="button" class="btn btn-line" data-adj="30">+30초</button></div>
<label class="check"><input type="checkbox" data-egg checked><span>${icon('i-egg')}끝나기 1분 전에 ‘계란 넣을 때’ 알림</span></label>
<div class="timer-go"><button type="button" class="btn btn-main btn-lg" data-start>${icon('i-play')}시작</button><button type="button" class="btn btn-sub btn-lg" data-reset>${icon('i-reset')}처음으로</button></div>
<p class="small muted">끝나면 소리와 진동(지원하는 휴대폰)으로 알려 드려요. 꼬들한 면이 좋다면 −30초로 줄여 보세요. 정확한 조리 시간은 봉지 뒷면 안내를 따라 주세요.</p>
</div>`;
}
function waterHTML() {
  return `<form class="water" data-water onsubmit="return false">
<label class="field"><span>한 봉지 물 양 (봉지 뒷면에 적힌 ml)</span><input type="number" name="per" inputmode="numeric" min="100" max="1500" step="10" value="550" required></label>
<label class="field"><span>몇 봉지 끓이나요?</span><input type="number" name="n" inputmode="numeric" min="1" max="10" value="2" required></label>
<fieldset class="field"><legend>국물 진하기</legend><div class="chips" role="radiogroup">${[['-10', '진하게 (−10%)'], ['0', '봉지대로'], ['10', '연하게 (+10%)']].map(([v, l], i) => `<label class="chip"><input type="radio" name="adj" value="${v}"${i === 1 ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
<div class="water-out" data-out aria-live="polite"></div>
<p class="small muted">종이컵 한 컵은 180ml, 계량컵 한 컵은 200ml로 셈했어요. 냄비가 넓으면 끓는 동안 물이 더 많이 줄어요. 정확한 물 양은 봉지 뒷면 안내가 기준이에요.</p>
</form>`;
}

// ---------- 후루룩클럽 ----------
const CM_TABS = [['/club/', '클럽 홈'], ['/club/board/', '게시판'], ['/recipes/', '레시피 자랑'], ['/club/feed/', '한 그릇 피드'], ['/club/events/', '시식회·번개'], ['/club/people/', '사람 랭킹'], ['/club/levels/', '등급 안내']];
export const cmTabs = (cur) => `<nav class="sub-tabs" aria-label="후루룩클럽 메뉴">${CM_TABS.map(([h, l]) => `<a href="${h}"${cur === h ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
const NOJS = '<noscript><p class="notice">후루룩클럽은 자바스크립트를 켜야 쓸 수 있어요.</p></noscript>';
function cmPage({ p, title, h1, lead, kind, desc, noindex = false, banner = false, tab }) {
  const head = banner
    ? pageBanner('banner-club', '후루룩클럽', '시식 모임 · 취향 투표 · 나만의 조합. 라면 좋아하는 사람들의 동네예요.', '친구들이 둘러앉아 라면을 나눠 먹는 장면', '면면 커뮤니티')
    : '';
  const body = `${head}<div class="wrap">
${banner ? '' : crumbs([['/', SITE_NAME], ['/club/', '후루룩클럽'], [p, h1]])}
${cmTabs(tab || p)}
${banner ? '' : `<section class="page-head page-head-sm"><h1 data-cm-title>${esc(h1)}</h1>${lead ? `<p>${lead}</p>` : ''}</section>`}
${NOJS}
<div class="cm" data-cm="${kind}"><p class="muted loading">불러오는 중이에요</p></div>
</div>`;
  return layout({ title: `${title} | ${SITE_NAME}`, description: desc, path: p, body, scripts: ['club.js'], noindex });
}
export const clubPages = () => [
  ['club', cmPage({ p: '/club/', title: '후루룩클럽 - 라면 커뮤니티', h1: '후루룩클럽', kind: 'hub', banner: true, desc: '라면 좋아하는 사람들의 커뮤니티. 조합·레시피, 시식 후기, 취향 투표, 시식회와 번개.' })],
  ['club/board', cmPage({ p: '/club/board/', title: '후루룩클럽 게시판', h1: '게시판', lead: '라면 이야기, 나만의 조합, 시식 후기, 신상 제보, 질문과 투표.', kind: 'board', desc: '라면 토크, 조합·레시피, 시식 후기, 신상 제보, 질문, 투표 게시판.' })],
  ['club/post', cmPage({ p: '/club/post/', title: '게시글', h1: '게시글', kind: 'post', desc: '후루룩클럽 게시글', tab: '/club/board/' })],
  ['club/write', cmPage({ p: '/club/write/', title: '글쓰기', h1: '글쓰기', kind: 'write', desc: '후루룩클럽 글쓰기', noindex: true, tab: '/club/board/' })],
  ['club/feed', cmPage({ p: '/club/feed/', title: '한 그릇 피드', h1: '한 그릇 피드', lead: '회원들이 방금 남긴 한 그릇 기록이에요.', kind: 'feed', desc: '회원들이 남긴 라면 한 그릇 기록을 시간순으로 봐요.' })],
  ['club/events', cmPage({ p: '/club/events/', title: '시식회·번개', h1: '시식회·번개', lead: '같이 끓여 먹고, 신상을 나눠 맛보는 모임이에요. 처음 만나는 사람과는 사람 많은 곳에서 만나요.', kind: 'events', desc: '라면 시식회와 라면 번개 모임 일정.' })],
  ['club/event', cmPage({ p: '/club/event/', title: '모임 일정', h1: '모임 일정', kind: 'event', desc: '시식회·번개 일정', tab: '/club/events/' })],
  ['club/people', cmPage({ p: '/club/people/', title: '사람 랭킹', h1: '사람 랭킹', lead: '이달의 활동왕과 기록왕. 순위는 활동 점수로만 정해요.', kind: 'people', desc: '후루룩클럽 이달의 활동왕, 기록왕, 인기쟁이.' })],
  ['club/u', cmPage({ p: '/club/u/', title: '회원 도감', h1: '회원 도감', kind: 'profile', desc: '회원의 라면 도감', noindex: true, tab: '' })],
];

export function levelsPage() {
  const L = (l) => levelOf(l.min, LEVELS);
  const body = `<div class="wrap">
${crumbs([['/', SITE_NAME], ['/club/', '후루룩클럽'], ['/club/levels/', '등급 안내']])}
${cmTabs('/club/levels/')}
<section class="page-head page-head-sm"><h1>등급과 배지</h1><p>기록을 남기고 이야기를 나눌수록 점수가 쌓여 등급이 올라가요. 첫 봉지에서 시작해 면면 명예의 전당까지 열 단계예요.</p></section>
<section class="sec" aria-labelledby="h-lv">${secHead('열 단계 등급', '', 'h-lv')}
<ol class="lv-list">${LEVELS.map((l) => `<li class="lv-item">${emblemSVG(L(l), 52, glyph)}<div><p class="lv-name">Lv.${l.lv} ${esc(l.name)}</p><p class="lv-min">${l.min.toLocaleString('ko-KR')}점부터</p><p class="small muted">${esc(l.line)}</p></div></li>`).join('')}</ol>
</section>
<section class="sec" aria-labelledby="h-pts">${secHead('점수 받는 법', '', 'h-pts')}
<table class="tbl"><thead><tr><th>활동</th><th>점수</th><th>하루 한도</th></tr></thead><tbody>${Object.values(RULES).map(([p, cap, d]) => `<tr><td>${esc(d)}</td><td>+${p}</td><td>${cap ? `${cap}번` : '없음'}</td></tr>`).join('')}</tbody></table>
<p class="small muted">같은 라면에 대한 기록 점수는 한 번만 받아요. 지운 글과 기록의 점수는 되돌려요.</p>
</section>
<section class="sec" aria-labelledby="h-bd">${secHead('배지', '', 'h-bd')}
<ul class="badge-list">${BADGES.map((b) => `<li>${badgeSVG(b, 48, false, glyph)}<div><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></div></li>`).join('')}</ul>
</section>
</div>`;
  return layout({ title: `등급과 배지 안내 | ${SITE_NAME} 후루룩클럽`, description: '후루룩클럽 열 단계 등급, 활동 점수, 배지 받는 법.', path: '/club/levels/', body });
}

const ul = (items) => `<ul class="list">${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
export function clubRulesPage() {
  return legalPage('/club/rules/', '후루룩클럽 이용 규칙', '서로 기분 좋게 라면 이야기를 나누기 위한 약속이에요.', [
    ['함께 지켜 주세요', ul(['먹어 본 라면만 기록해 주세요. 남의 기록을 옮겨 적거나, 먹지 않은 라면에 별점을 남기지 않아요.', '제조사나 판매처에서 제품을 받고 남기는 기록에는 ‘제품을 받았어요’를 꼭 골라 주세요. 랭킹에서 빠지고 기록에 표시가 붙어요.', '다른 사람의 입맛을 깎아내리지 않아요. ‘맵찔이’ 같은 놀림 대신 “저는 이렇게 느꼈어요”로 말해요.', '광고, 홍보 글, 같은 내용 반복 글은 지워요.'])],
    ['시식회·번개에서', ul(['처음 만나는 사람과는 사람이 많은 곳에서 만나요.', '돈을 미리 보내라는 요구에는 응하지 마세요.', '참여 신청을 했다면 시간을 지켜 주세요. 못 가게 되면 미리 취소해 주세요.', '모임이 끝나면 매너 별점을 남길 수 있어요. 점수는 이름 없이 평균으로만 보여요.'])],
    ['신고와 가림', ul(['규칙에 어긋나는 글, 댓글, 기록은 ‘신고’를 눌러 주세요.', '서로 다른 회원 다섯 명이 신고하면 운영자가 보기 전에 먼저 가려요.', '운영자가 확인한 뒤 지우거나 다시 보이게 해요. 같은 일이 반복되면 이용을 제한할 수 있어요.'])],
  ]);
}

// ---------- 내 도감 ----------
export function mePage() {
  const body = `<div class="wrap">
<div class="me" data-me><p class="muted loading">불러오는 중이에요</p></div>
</div>`;
  return layout({ title: `내 도감 | ${SITE_NAME}`, description: '내가 먹은 라면 기록, 맛 취향, 등급과 배지.', path: '/me/', body, scripts: ['me.js'], noindex: true });
}

// ---------- 소개, 약관, 문의 ----------
export function aboutPage() {
  const body = `<div class="wrap">
<section class="about-hero">
${img('archive-card', '라면 사진 카드를 꽂아 둔 나무 서랍', 'about-pic', true)}
<div><p class="kicker">${WAVE}${esc(SITE_NAME)} 소개</p><h1>먹어 본 라면은 기록하고,<br>안 먹어 본 라면은 미리 맛봐요</h1>
<p>마트와 편의점에는 라면이 수백 가지인데, 어떤 맛인지 알려 주는 곳은 생각보다 적어요. ${esc(SITE_NAME)}은 국내 라면을 한곳에 모아 같은 잣대로 맛을 기록하고, 먹어 본 사람들의 기록으로 순위를 매기는 라면 도감이에요.</p></div>
</section>
<section class="sec" aria-labelledby="h-what">${secHead(`${SITE_NAME}에서 할 수 있는 일`, '', 'h-what')}
<div class="feature-grid">
<a class="feature" href="/ramen/">${icon('i-book')}<b>라면 도감</b><span>라면 하나에 페이지 하나. 회사, 형태, 조리 방식, 출시, 판매처를 한눈에.</span></a>
<a class="feature" href="/record/">${icon('i-plus')}<b>한 그릇 기록</b><span>별점과 ‘또 먹을래요’, 맛 지도 여덟 칸, 끓인 방법과 넣은 재료.</span></a>
<a class="feature" href="/rank/">${icon('i-trophy')}<b>라면 랭킹</b><span>종합, 종류별, 급상승, 신상, 맛 기준, 매니아 픽. 계산식은 모두 공개.</span></a>
<a class="feature" href="/lab/">${icon('i-flask')}<b>취향실험실</b><span>맛 지도, 라면 비교, 라면 월드컵, 조리 타이머, 물 양 계산기.</span></a>
<a class="feature" href="/club/">${icon('i-chat')}<b>후루룩클럽</b><span>조합·레시피, 시식 후기, 취향 투표, 시식회와 번개.</span></a>
<a class="feature" href="/shop/">${icon('i-cart')}<b>라면몰</b><span>랭킹 순서대로 진열한 라면을 쿠팡에서 바로 살 수 있어요.</span></a>
</div>
</section>
<section class="sec" aria-labelledby="h-pr">${secHead('네 가지 약속', '', 'h-pr')}${promisesHTML()}</section>
<section class="sec" aria-labelledby="h-data">${secHead('정보는 이렇게 모아요', '', 'h-data')}
<div class="prose">${ul([
    '라면 이름, 회사, 출시 시기, 판매처 같은 기본 정보는 제조사 발표와 언론 기사로 확인한 것만 적어요. 확인하지 못한 칸은 비워 두고 ‘확인 중’으로 보여 드려요.',
    '스코빌 지수는 제조사나 판매처가 밝힌 값만 출처와 함께 적어요.',
    '맛 지도와 별점은 회원들이 남긴 기록으로만 계산해요. 편집부가 대신 점수를 매기지 않아요.',
    '라면 카드의 그릇 사진은 조리 방식을 보여 주는 예시 그림이에요. 제품 포장 사진은 쓰지 않아요.',
    `틀린 정보를 보면 페이지 아래 ‘틀린 정보 알려 주기’로 알려 주세요.`,
  ])}</div>
</section>
<section class="sec about-cta"><h2>오늘 먹은 라면부터 남겨 볼까요?</h2><p><a class="btn btn-main btn-lg" href="/record/">${icon('i-plus')}한 그릇 기록</a> <a class="btn btn-line btn-lg" href="/ramen/">라면 도감 보기</a></p></section>
</div>`;
  return layout({ title: `${SITE_NAME} 소개 | ${cfg.tagline}`, description: `${SITE_NAME}은 국내 라면을 한곳에 모아 같은 잣대로 맛을 기록하고, 먹어 본 사람들의 기록으로 순위를 매기는 라면 도감이에요.`, path: '/about/', body });
}

function legalPage(p, title, lead, sections) {
  const body = `<div class="wrap wrap-narrow prose">
${crumbs([['/', SITE_NAME], [p, title]])}
<h1>${esc(title)}</h1>
<p class="lead">${lead}</p>
${sections.map(([h, inner]) => `<h2>${esc(h)}</h2>${inner}`).join('\n')}
</div>`;
  return layout({ title: `${title} | ${SITE_NAME}`, description: `${SITE_NAME} ${title}`, path: p, body });
}
const contactLine = () => (cfg.privacyEmail || cfg.contactEmail ? `이메일 ${esc(cfg.privacyEmail || cfg.contactEmail)} 또는 <a href="/contact/">문의하기</a>` : '<a href="/contact/">문의하기</a> 페이지');
export function termsPage() {
  return legalPage('/terms/', '이용약관', `시행일: ${today}. ${esc(OPERATOR)}(이하 ‘운영자’)이 운영하는 ${esc(SITE_NAME)}을 이용할 때의 약속이에요.`, [
    ['1. 서비스', ul([`${esc(SITE_NAME)}은 라면 정보(라면 도감), 회원 기록(한 그릇 기록), 랭킹, 커뮤니티(후루룩클럽), 쇼핑 연결(라면몰)을 제공해요.`, '라면 정보는 확인한 범위에서 적지만, 제조사 사정으로 바뀔 수 있어요. 구매 전에는 상품 페이지와 포장의 안내를 확인해 주세요.'])],
    ['2. 회원', ul(['만 14세 이상이면 가입할 수 있어요.', '아이디와 비밀번호는 본인이 관리해요. 다른 사람에게 알려 생긴 문제는 책임지기 어려워요.', '언제든 내 도감 > 설정에서 탈퇴할 수 있어요.'])],
    ['3. 회원이 올린 글과 기록', ul(['글과 기록의 권리는 쓴 사람에게 있어요. 다만 운영자는 서비스 안에서 보여 주고 랭킹을 계산하는 데 쓸 수 있어요.', '탈퇴해도 남긴 글과 기록은 ‘탈퇴한 회원’ 이름으로 남아요. 지우고 싶다면 탈퇴 전에 직접 지워 주세요. 레시피 자랑에 올린 레시피와 사진, 후기는 탈퇴할 때 함께 지워요.', '사진은 직접 찍은 것만 올려 주세요. 다른 사람의 사진이나 얼굴이 알아보이는 사진은 가릴 수 있어요.', '법을 어기거나 이용 규칙에 맞지 않는 글은 알리지 않고 가리거나 지울 수 있어요.'])],
    ['4. 랭킹', ul(['랭킹은 공개한 평가 기준대로 계산해요. 운영자는 손으로 순위를 고치지 않고, 돈을 받고 순위를 바꾸지 않아요.', '여러 계정으로 순위를 조작하는 등 부정한 기록은 지우고 이용을 제한할 수 있어요.'])],
    ['5. 쇼핑 연결', ul(['라면몰과 라면 페이지의 구매 버튼은 쿠팡으로 연결돼요. 주문, 결제, 배송, 환불은 쿠팡과 판매자의 약관을 따라요.', '구매 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.'])],
    ['6. 책임', ul(['맛 기록은 회원 개인의 느낌이에요. 알레르기와 건강에 관한 판단은 제품 포장의 표시를 따라 주세요.', '서비스 점검이나 장애로 잠시 쓸 수 없을 때가 있어요.'])],
    ['7. 문의', `<p>${contactLine()}로 알려 주세요.</p>`],
  ]);
}
export function privacyPage() {
  return legalPage('/privacy/', '개인정보처리방침', `시행일: ${today}. ${esc(OPERATOR)}은 필요한 정보만 받고, 받은 정보는 아래 목적에만 써요.`, [
    ['1. 받는 정보와 쓰는 곳', `<table class="tbl"><thead><tr><th>언제</th><th>받는 정보</th><th>쓰는 곳</th><th>보관</th></tr></thead><tbody>
<tr><td>회원가입</td><td>아이디, 닉네임, 비밀번호(복원할 수 없게 바꿔 저장), 지역(선택)</td><td>로그인, 기록과 글 관리</td><td>탈퇴할 때까지</td></tr>
<tr><td>기록·글 작성</td><td>한 그릇 기록, 게시글, 댓글, 투표, 모임 참여</td><td>서비스 제공, 랭킹 계산</td><td>지울 때까지 (탈퇴 뒤에도 ‘탈퇴한 회원’으로 남음)</td></tr>
<tr><td>레시피 자랑</td><td>레시피 글, 사진, 따라 해 본 후기, 좋아요·저장</td><td>레시피 보여 주기, 공유 미리보기</td><td>지울 때까지 (탈퇴하면 레시피·사진·후기를 함께 지움)</td></tr>
<tr><td>문의</td><td>이름, 이메일, 연락처(선택), 문의 내용</td><td>답변</td><td>처리 후 1년</td></tr>
<tr><td>방문 통계</td><td>브라우저에 저장한 무작위 방문 번호, 본 페이지, 머문 시간, 들어온 경로, 기기 종류</td><td>서비스 개선</td><td>400일</td></tr>
</tbody></table>
<p>사진은 올리기 전에 브라우저에서 크기를 줄이고, 찍은 위치와 기기 정보(EXIF)를 지운 뒤 저장해요.</p>
<p>IP 주소는 하루마다 바뀌는 값으로 바꿔 짧은 시간의 반복 요청을 막는 데만 쓰고, 원래 주소는 저장하지 않아요.</p>
<p><button type="button" class="btn btn-line" data-notrack>이 브라우저의 방문 통계 끄기</button></p>`],
    ['2. 다른 곳에 주는 정보', '<p>받은 정보를 다른 회사에 팔거나 주지 않아요. 라면몰의 구매 버튼을 누르면 쿠팡으로 이동하고, 그 뒤의 정보 처리는 쿠팡의 방침을 따라요.</p>'],
    ['3. 맡겨서 처리하는 일', ul(['Cloudflare: 사이트 운영과 데이터·사진 저장 (Cloudflare Pages, D1, R2)'])],
    ['4. 내 정보 보기와 지우기', ul(['내 도감 > 설정에서 닉네임, 지역, 소개를 고치고 비밀번호를 바꿀 수 있어요.', '탈퇴하면 아이디, 비밀번호, 지역, 소개를 바로 지워요.', `그 밖의 요청은 ${contactLine()}로 보내 주세요.`])],
    ['5. 쿠키', '<p>로그인을 유지하는 쿠키(mm_sid) 하나만 써요. 광고용 쿠키는 쓰지 않아요.</p>'],
    ['6. 개인정보 보호 책임자', `<p>${esc(cfg.privacyOfficer || OPERATOR)} · ${contactLine()}</p>`],
  ]);
}

export function contactPage() {
  const KINDS = { partner: '제휴·협업 제안', maker: '제조사·브랜드 문의', ad: '광고 문의', ramen: '라면 추가·정보 수정 요청', bug: '오류·불편 신고', etc: '그 밖의 문의' };
  const body = `<div class="wrap wrap-narrow">
${crumbs([['/', SITE_NAME], ['/contact/', '문의하기']])}
<section class="page-head page-head-sm"><h1>문의하기</h1><p>제휴, 제조사 문의, 라면 정보 수정 요청을 받아요. 영업일 기준 3일 안에 이메일로 답할게요.</p></section>
<p class="notice">${SITE_NAME}은 돈을 받고 랭킹 순위를 바꾸거나 기록을 지우지 않아요. 이런 제안에는 답하지 않아요.</p>
<form class="contact-form" data-contact>
<label class="field"><span>문의 종류</span><select name="kind" required><option value="">골라 주세요</option>${Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
<div class="field-row"><label class="field"><span>이름 (담당자)</span><input name="name" maxlength="40" required autocomplete="name"></label><label class="field"><span>회사·단체 (선택)</span><input name="org" maxlength="60" autocomplete="organization"></label></div>
<div class="field-row"><label class="field"><span>이메일</span><input type="email" name="email" maxlength="120" required autocomplete="email"></label><label class="field"><span>연락처 (선택)</span><input name="phone" maxlength="30" autocomplete="tel"></label></div>
<label class="field"><span>제목</span><input name="title" maxlength="80"></label>
<label class="field"><span>내용</span><textarea name="message" rows="7" maxlength="3000" required></textarea></label>
<label class="check"><input type="checkbox" name="agree" required><span>답변을 위해 이름, 이메일, 연락처를 받고 1년 동안 보관하는 데 동의해요. <a href="/privacy/">개인정보처리방침</a></span></label>
<label class="hp" aria-hidden="true">비워 두세요<input name="website" tabindex="-1" autocomplete="off"></label>
<p class="form-msg" role="status" aria-live="polite"></p>
<button class="btn btn-main btn-lg" type="submit">보내기</button>
</form>
</div>`;
  return layout({ title: `문의하기 | ${SITE_NAME}`, description: `${SITE_NAME} 제휴, 제조사 문의, 라면 정보 수정 요청`, path: '/contact/', body });
}

// ---------- 운영 관리 ----------
export function adminPage() {
  const NAV = [
    ['', [['home', '대시보드']]],
    ['지표', [['kpi/overview', '한눈에 보기'], ['kpi/content', '페이지·라면'], ['kpi/traffic', '유입 경로'], ['kpi/shop', '구매·전환'], ['kpi/engage', '검색·참여'], ['kpi/live', '실시간']]],
    ['운영', [['content', '원고 관리'], ['reports', '제보·오류', 'reports'], ['inquiries', '문의함', 'inquiries'], ['community', '커뮤니티', 'flags'], ['demo', '시험 데이터']]],
    ['라면몰', [['shop', '쇼핑 링크'], ['coupang', '쿠팡 실적 입력']]],
    ['설정', [['settings', '설정·도움말']]],
  ];
  const panels = ['home', 'kpi-overview', 'kpi-content', 'kpi-traffic', 'kpi-shop', 'kpi-engage', 'kpi-live', 'content', 'reports', 'inquiries', 'community', 'demo', 'shop', 'coupang', 'settings'];
  const body = `<section class="adm" data-admin data-repo="${esc(cfg.githubRepo || '')}" data-branch="${esc(cfg.githubBranch || 'main')}">
<div class="adm-login" data-login>
<p class="brand">${'<span class="brand-mark"><span class="brand-t">' + esc(SITE_NAME) + '</span><i class="brand-dot"></i></span>'}</p>
<h1 class="page-title">운영 관리</h1>
<p class="muted">Cloudflare에 넣어 둔 관리자 비밀번호(ADMIN_PASSWORD)를 입력하세요.</p>
<form class="admin-form" data-login-form>
<label class="field"><span>관리자 비밀번호</span><input type="password" name="pw" autocomplete="current-password" required></label>
<label class="check"><input type="checkbox" name="remember"><span>이 기기에서 7일 동안 로그인 유지</span></label>
<button class="btn btn-main" type="submit">들어가기</button>
<p class="form-msg" role="status" aria-live="polite"></p>
</form>
</div>
<div class="adm-app" data-body hidden>
<aside class="adm-side">
<p class="adm-brand"><b>${esc(SITE_NAME)}</b> 운영 관리</p>
<nav class="adm-nav" aria-label="관리 메뉴">
${NAV.map(([group, items]) => `${group ? `<p class="adm-group">${group}</p>` : ''}${items.map(([r, label, badge]) => `<a href="#/${r}" data-route="${r}">${label}${badge ? `<span class="adm-count" data-count="${badge}" hidden></span>` : ''}</a>`).join('')}`).join('\n')}
</nav>
<div class="adm-side-foot"><a href="/" target="_blank" rel="noopener">사이트 열기</a><button type="button" class="link-btn" data-logout>로그아웃</button></div>
</aside>
<div class="adm-main">
<header class="adm-top"><div><p class="adm-crumb" data-crumb></p><h1 class="adm-title" data-title>대시보드</h1></div><div class="adm-period" data-period hidden></div></header>
${panels.map((id) => `<section class="adm-panel" id="a-${id}" hidden></section>`).join('\n')}
</div>
</div>
</section>`;
  return layout({ title: `운영 관리 - ${SITE_NAME}`, description: '운영 관리 화면', path: '/admin/', body, noindex: true, scripts: ['admin.js'], bodyClass: 'admin-page', bare: true });
}

export function notFoundPage() {
  const body = `<div class="wrap wrap-narrow nf">
${img('broth-clear', '맑은 국물 라면 한 그릇', 'nf-pic', true)}
<h1>찾는 페이지가 없어요</h1>
<p>주소가 바뀌었거나 지워진 페이지예요. 라면 이름으로 찾아보세요.</p>
<form class="hero-search" action="/ramen/" role="search">${icon('i-search')}<input type="search" name="q" placeholder="라면 찾기" aria-label="라면 찾기"><button class="btn btn-ink" type="submit">찾기</button></form>
<p><a class="btn btn-line" href="/">처음 화면으로</a></p>
</div>`;
  return layout({ title: `페이지를 찾을 수 없어요 | ${SITE_NAME}`, description: '찾는 페이지가 없어요', path: '/404.html', body, noindex: true });
}
export function offlinePage() {
  const body = `<div class="wrap wrap-narrow nf"><h1>인터넷에 연결되지 않았어요</h1><p>연결되면 다시 열어 주세요. 조리 타이머는 한 번 열어 둔 페이지라면 그대로 쓸 수 있어요.</p><p><a class="btn btn-main" href="/lab/timer/">조리 타이머</a></p></div>`;
  return layout({ title: `연결 안 됨 | ${SITE_NAME}`, description: '오프라인', path: '/offline/', body, noindex: true });
}

export { POST_CATS };
