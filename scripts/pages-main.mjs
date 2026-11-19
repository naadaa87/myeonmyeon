// 페이지: 처음 화면, 라면 도감, 라면 한 개, 한 그릇 기록, 랭킹, 평가 기준, 신상 레이더, 라면몰
import {
  esc, cfg, SITE_NAME, abs, RAMEN, BY, SORTED, NEWEST, MAKERS, layout, icon, WAVE, img, pageBanner, crumbs, crumbLd, secHead, moreLink,
  ramenCard, ramenGrid, hotChip, statusChip, formText, styleText, yearText, releaseKey, buyLink, DISCLOSURE, josa, readJSON, cho, DOGAM_CHECKED, COUNTRIES, WORLD,
} from './lib.mjs';
import { STYLES, FORMS, STATUS, HOTS, GROUPS, AXES, RANK_RULE, TASTES, NOODLE_TYPES } from '../server/catalog-data.js';
import { storyHomeCards } from './pages-story.mjs';

const NEWS = readJSON('content/news.json').news;
const SHOP = readJSON('content/shop.json');
const groupName = (id) => (GROUPS.find((g) => g.id === id) || {}).name || '';

// 카테고리 탭 (무드보드): 그릇 그림 + 이름
export const groupTiles = (cur = '') => `<nav class="gtiles" aria-label="라면 종류">
<a class="gtile" href="/ramen/"${cur === '' ? ' aria-current="page"' : ''}><span class="gtile-img gtile-all">${icon('i-grid')}</span><span>전체</span></a>
${GROUPS.map((g) => `<a class="gtile" href="/ramen/?g=${g.id}"${cur === g.id ? ' aria-current="page"' : ''} data-g="${g.id}"><span class="gtile-img">${img(g.img, '')}</span><span>${g.name}</span></a>`).join('\n')}
</nav>`;

const PROMISES = [
  ['순위는 팔지 않아요', '광고비나 쇼핑 수수료는 랭킹 계산에 한 푼도 들어가지 않아요. 운영자가 손으로 순위를 고치지도 않아요.'],
  ['먹어 본 사람만 세요', '한 사람이 라면 하나에 남긴 기록은 한 개만 세요. 다시 먹고 고치면 가장 새 기록으로 바뀌어요.'],
  ['같은 잣대로 재요', '맵기, 짠맛, 진하기, 면 탄력처럼 모든 라면을 똑같은 여덟 칸으로 기록해요.'],
  ['돈이 오가면 먼저 밝혀요', '구매 링크에는 쿠팡 파트너스 문구를 먼저 붙이고, 제공받은 제품으로 남긴 기록은 랭킹에서 빼요.'],
];
export const promisesHTML = () => `<div class="promises">${PROMISES.map(([t, d], i) => `<div class="promise"><span class="promise-n">${i + 1}</span><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>`;

// ---------- 처음 화면 ----------
export function homePage() {
  const newest = NEWEST.slice(0, 8);
  const shelf = (SHOP.shelves.find((s) => s.items) || { items: [] });
  const body = `<section class="hero">
<picture class="hero-pic"><source media="(min-width: 760px)" srcset="/assets/img/home-wide.webp"><img src="/assets/img/home-mobile.webp" width="960" height="1200" alt="달걀과 대파를 올린 매운 국물 라면 한 그릇" fetchpriority="high"></picture>
<div class="wrap hero-in">
<div class="hero-text">
<p class="kicker">${WAVE}라면 도감 · 랭킹 · 커뮤니티</p>
<h1>오늘 끓인 라면,<br>한 그릇씩 남겨요</h1>
<p class="hero-lead">한국인의 일상 라면을 한곳에 모은 라면 도감이에요. 먹어 본 사람들의 기록이 모여 맛 지도와 랭킹이 돼요.</p>
<form class="hero-search" action="/ramen/" role="search">${icon('i-search')}<input type="search" name="q" placeholder="라면 찾기 (예: 신라면, ㅂㄷ)" aria-label="라면 찾기"><button class="btn btn-ink" type="submit">찾기</button></form>
<div class="hero-actions"><a class="btn btn-main btn-lg" href="/record/">${icon('i-plus')}한 그릇 기록</a><a class="btn btn-line btn-lg" href="/ramen/">라면 도감 보기</a></div>
</div>
</div>
</section>

<div class="wrap">
${groupTiles()}

<section class="sec" aria-labelledby="h-rank">
${secHead('이번 주 랭킹', moreLink('/rank/', '랭킹 전체'), 'h-rank')}
<p class="sec-lead" data-week-note>먹어 본 사람들의 별점을 같은 기준으로 모아 매일 다시 계산해요.</p>
<div data-home-rank class="home-rank"><p class="muted loading">랭킹을 불러오는 중이에요</p></div>
</section>

<section class="sec" aria-labelledby="h-dogam">
${secHead('라면 도감', moreLink('/ramen/', `${RAMEN.length}가지 모두 보기`), 'h-dogam')}
<p class="sec-lead">최근에 나온 라면부터 보여 드려요. 마음에 드는 라면은 책갈피로 저장해 두세요.</p>
${ramenGrid(newest)}
</section>
</div>

<section class="band band-lab" aria-labelledby="h-lab">
<div class="wrap band-in">
<div class="band-text">
<p class="kicker">${WAVE}취향실험실</p>
<h2 id="h-lab">맵기 · 진하기 · 면 탄력,<br>내 입맛을 실험해 보세요</h2>
<p>모두의 기록으로 그린 맛 지도에서 라면 사이 거리를 보고, 두세 개를 나란히 비교하고, 라면 월드컵으로 최애를 가려요.</p>
<div class="band-links">
<a href="/lab/map/">${icon('i-map')}맛 지도</a><a href="/lab/compare/">${icon('i-swap')}라면 비교</a><a href="/lab/worldcup/">${icon('i-trophy')}라면 월드컵</a><a href="/lab/timer/">${icon('i-timer')}조리 타이머</a><a href="/lab/water/">${icon('i-drop')}물 양 계산기</a>
</div>
</div>
<a class="band-pic" href="/lab/">${img('lab-compare', '빨간 국물 라면과 맑은 국물 라면을 나란히 놓은 비교 사진')}</a>
</div>
</section>

<div class="wrap">
<section class="sec" aria-labelledby="h-club">
${secHead('커뮤니티', moreLink('/club/', '후루룩클럽 가기'), 'h-club')}
<div class="club-strip">
<a class="club-card" href="/recipes/">${img('club-recipe', '냄비에 끓인 라면에 치즈를 올리는 장면')}<span><b>레시피 자랑</b>사진으로 보는 남의 라면</span></a>
<a class="club-card" href="/club/events/">${img('club-tasting', '친구들이 둘러앉아 라면을 나눠 먹는 시식 모임')}<span><b>시식회·번개</b>같이 먹으면 더 맛있어요</span></a>
<a class="club-card" href="/club/board/?cat=poll">${img('club-vote', '라면 두 그릇 앞에 빨간 표와 노란 표가 놓인 취향 투표')}<span><b>취향 투표</b>꼬들면이냐 퍼진면이냐</span></a>
</div>
<div class="home-feed" data-home-feed><p class="muted loading">새 소식을 불러오는 중이에요</p></div>
</section>

<section class="sec" aria-labelledby="h-recipes">
${secHead('레시피 자랑', moreLink('/recipes/', '레시피 모두 보기'), 'h-recipes')}
<p class="sec-lead">회원들이 직접 끓여 올린 라면이에요. 따라 해 보고 후기를 남겨 주세요.</p>
<div class="rcp-grid rcp-grid-sm" data-recipe-strip data-q="sort=hot&amp;per=4" data-empty="아직 올라온 레시피가 없어요. 나만 아는 라면 조합이 있다면 사진으로 자랑해 주세요."><p class="muted loading">레시피를 불러오는 중이에요</p></div>
</section>

<section class="sec" aria-labelledby="h-new">
${secHead('신상 레이더', moreLink('/new/', '소식 모두 보기'), 'h-new')}
<ul class="news-list news-home">${NEWS.slice(0, 4).map(newsItem).join('')}</ul>
</section>

<section class="sec" aria-labelledby="h-world">
${secHead('세계 라면 지도', moreLink('/world/', '나라별로 보기'), 'h-world')}
<p class="sec-lead">일본 컵누들, 인도네시아 미고렝, 태국 똠얌, 싱가포르 락사까지. 해외 ${new Set(RAMEN.filter((r) => r.co !== 'kr').map((r) => r.co)).size}개 나라 라면 ${RAMEN.filter((r) => r.co !== 'kr').length}가지를 나라·맵기·맛으로 골라 보세요.</p>
<nav class="wjump" aria-label="나라별 라면">${WORLD.countries.filter((c) => c.code !== 'kr').map((c) => `<a class="pill" href="/world/${c.code}/">${esc(c.name)}</a>`).join('')}</nav>
${ramenGrid(['nissin-cup-noodle', 'indomie-mi-goreng', 'mama-tomyum-shrimp', 'prima-wholegrain-laksa'].map((x) => BY[x]).filter(Boolean), { from: '' })}
</section>

<section class="sec" aria-labelledby="h-mania">
${secHead('라면 매니아 코너', '', 'h-mania')}
<div class="mania">${[
    ['/lab/heat/', 'i-flame', '맵기 사다리', '신라면의 몇 배일까? 스코빌 지수로 줄 세운 매운 라면'],
    ['/lab/pick/', 'i-dice', '오늘의 라면 뽑기', '고르기 어려운 날엔 조건만 정하고 뽑기에 맡겨요'],
    ['/lab/quiz/', 'i-help', '라면 퀴즈', '세계 첫 라면부터 나라별 라면 문화까지 10문제'],
    ['/story/words/', 'i-book', '라면 용어 사전', '유탕면, 조미유, 똠얌, 미 똠까지 낱말 풀이'],
    ['/story/places/', 'i-pin', '라면 성지 여행', '컵누들 뮤지엄과 구미라면축제 가는 길'],
    ['/me/#coll', 'i-map', '세계 라면 여권', '기록한 라면의 나라마다 도장을 모아요'],
  ].map(([h, ic, t, d]) => `<a class="mania-tile" href="${h}"><span class="mania-ico">${icon(ic)}</span><b>${t}</b><span>${d}</span></a>`).join('')}</div>
</section>

<section class="sec" aria-labelledby="h-story">
${secHead('라면 이야기', moreLink('/story/', '읽을거리 모두 보기'), 'h-story')}
<div class="sgrid sgrid-home">${storyHomeCards(3)}</div>
</section>

<section class="sec" aria-labelledby="h-shop">
${secHead('라면몰', moreLink('/shop/', '라면몰 가기'), 'h-shop')}
<p class="disclosure">${esc(DISCLOSURE)}</p>
<div class="shop-row">${shelf.items.slice(0, 5).map((s) => productCard(BY[s], 'home')).join('')}</div>
</section>

<section class="sec" aria-labelledby="h-promise">
${secHead(`${SITE_NAME}의 약속`, moreLink('/rank/rules/', '평가 기준 자세히'), 'h-promise')}
${promisesHTML()}
</section>
</div>`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: abs('/'), potentialAction: { '@type': 'SearchAction', target: abs('/ramen/?q={q}'), 'query-input': 'required name=q' } },
    { '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: abs('/'), logo: abs('/assets/img/icon-512.png') },
  ];
  return layout({ title: `${SITE_NAME} | ${cfg.tagline}`, description: `국내 라면 ${RAMEN.length}가지를 한곳에 모은 라면 도감. 먹어 본 사람들의 한 그릇 기록으로 맛 지도와 라면 랭킹을 만들어요.`, path: '/', body, scripts: ['home.js'], jsonld, bodyClass: 'page-home' });
}

export const newsItem = (n) => `<li class="news-item"><p class="news-date">${esc(n.date.replace(/-/g, '.'))}</p><div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><p class="news-meta">${n.ramen.filter((s) => BY[s]).map((s) => `<a class="pill" href="/ramen/${s}/">${esc(BY[s].n)}</a>`).join('')}${n.url ? `<a class="news-src" href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.src || '출처')} ${icon('i-ext')}</a>` : ''}</p></div></li>`;

// ---------- 라면몰 상품 카드 ----------
export function productCard(r, from) {
  if (!r) return '';
  return `<article class="pcard" data-s="${r.s}">
<a class="pcard-img" href="/ramen/${r.s}/">${img(r.img, '')}${statusChip(r)}</a>
<div class="pcard-body">
<p class="rcard-maker">${esc(r.maker)}${r.f ? ` · ${formText(r)}` : ''}</p>
<h3><a href="/ramen/${r.s}/">${esc(r.n)}</a></h3>
<p class="rcard-stat" data-stat>기록 모으는 중</p>
${buyLink(r.s, from, '쿠팡에서 보기', 'btn btn-buy btn-sm')}
</div>
</article>`;
}

// ---------- 라면 도감 ----------
const RETAILERS = ['gs25', 'cu', 'seven', 'emart24', 'emart', 'homeplus', 'lottemart'];
// 필터 칩: 값마다 버튼 하나 (숫자는 화면에서 채워요)
const fchip = (k, v, label) => `<button type="button" class="fchip" data-k="${k}" data-v="${esc(v)}" data-label="${esc(label)}" aria-pressed="false">${esc(label)}<span class="fchip-n"></span></button>`;
const fgroup = (id, title, chips) => `<div class="fgroup" role="group" aria-labelledby="fg-${id}"><p class="fgroup-h" id="fg-${id}">${title}</p><div class="fchips">${chips}</div></div>`;

export function dogamPage() {
  const cnt = (fn) => RAMEN.filter(fn).length;
  const KR = cnt((r) => r.co === 'kr');
  const ABROAD = RAMEN.length - KR;
  const nations = Object.values(COUNTRIES).filter((c) => c.code !== 'kr' && RAMEN.some((r) => r.co === c.code))
    .sort((a, b) => cnt((r) => r.co === b.code) - cnt((r) => r.co === a.code));
  const makerCos = (k) => [...new Set(RAMEN.filter((x) => x.m === k).map((x) => x.co))];
  const makerCo = (k) => makerCos(k)[0] || 'kr';
  const makers = Object.entries(MAKERS).filter(([k]) => RAMEN.some((r) => r.m === k));
  const opt = ([k, v]) => `<option value="${k}">${esc(v)}</option>`;
  const krMakers = makers.filter(([k]) => makerCo(k) === 'kr' && !RETAILERS.includes(k));
  const shopMakers = makers.filter(([k]) => RETAILERS.includes(k));
  const abroadMakers = makers.filter(([k]) => makerCo(k) !== 'kr').sort((a, b) => a[1].localeCompare(b[1], 'ko'));
  const body = `${pageBanner('banner-atlas', '라면 도감', `한국 라면 ${KR}가지와 해외 ${nations.length}개 나라 라면 ${ABROAD}가지를 모았어요. 나라·맵기·맛으로 골라 보고, 초성으로도 찾을 수 있어요.`, '달걀과 대파를 올린 매운 국물 라면', '면면도감')}
<div class="wrap" data-dogam>
<nav class="sub-tabs" aria-label="도감 둘러보기"><a href="/ramen/" aria-current="page">라면 도감</a><a href="/world/">세계 라면 지도</a><a href="/new/">신상 레이더</a></nav>
${groupTiles()}
<form class="filter-bar dfilter" data-filter role="search" onsubmit="return false">
<label class="search-box">${icon('i-search')}<input type="search" name="q" placeholder="라면 이름, 회사, 나라, 초성 (예: ㅈㅍㄱㅌ)" aria-label="라면 찾기" autocomplete="off"></label>
<div class="dfilter-top">
<button type="button" class="btn btn-line dfilter-toggle" data-ftoggle aria-expanded="false" aria-controls="fpanel">${icon('i-filter')}필터<b class="fbadge" data-fcount hidden></b></button>
<label class="sel"><span class="sr">정렬</span><select name="sort"><option value="name">가나다순</option><option value="new">최근 출시순</option><option value="n">기록 많은 순</option><option value="a">별점 높은 순</option><option value="saved">내가 저장한 라면</option></select></label>
</div>
<div class="factive" data-factive hidden></div>
<div class="fpanel" id="fpanel" data-fpanel>
${fgroup('co', '나라', fchip('co', 'kr', '한국') + fchip('co', 'xx', '해외 전체') + nations.map((c) => fchip('co', c.code, c.name)).join(''))}
${fgroup('hot', '맵기', Object.entries(HOTS).map(([k, v]) => fchip('hot', k, v)).join('') + fchip('hot', 'u', '미분류'))}
${fgroup('ta', '맛', TASTES.map((t) => fchip('ta', t.id, t.name)).join(''))}
${fgroup('c', '조리 방식', Object.entries(STYLES).map(([k, v]) => fchip('c', k, v)).join(''))}
${fgroup('f', '형태', Object.entries(FORMS).map(([k, v]) => fchip('f', k, v)).join(''))}
${fgroup('nd', '면', Object.entries(NOODLE_TYPES).filter(([k]) => k === 'oil' || RAMEN.some((r) => r.noodle === k)).map(([k, v]) => fchip('nd', k, v)).join(''))}
<div class="fgroup"><p class="fgroup-h">회사·판매</p><div class="fsel-row">
<label class="sel"><span class="sr">회사</span><select name="m"><option value="">회사 전체</option><optgroup label="한국 라면 회사">${krMakers.map(opt).join('')}</optgroup><optgroup label="편의점·마트 자체 라면">${shopMakers.map(opt).join('')}</optgroup><optgroup label="해외 라면 회사">${abroadMakers.map(([k, v]) => `<option value="${k}">${esc(v)} (${makerCos(k).map((c) => esc(COUNTRIES[c].name)).join('·')})</option>`).join('')}</optgroup></select></label>
<label class="sel"><span class="sr">판매</span><select name="st"><option value="">판매 상태 전체</option>${Object.entries(STATUS).filter(([k]) => RAMEN.some((r) => r.st === k)).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
</div></div>
</div>
</form>
<p class="filter-count" data-count aria-live="polite">${RAMEN.length}가지</p>
<div class="rgrid" data-list>${SORTED.map((r, i) => ramenCard(r, { eager: i < 4 })).join('')}</div>
<p class="more-wrap"><button type="button" class="btn btn-line" data-more hidden>더 보기</button></p>
<div class="empty" data-empty hidden><p>조건에 맞는 라면이 없어요.</p><p><button type="button" class="btn btn-sub" data-reset>조건 지우기</button> <button type="button" class="btn btn-line" data-report="">새 라면 제보하기</button></p></div>
<p class="note">맵기 표시(${icon('i-flame')})와 맛 분류는 이름과 제조사 설명을 보고 편집부가 나눈 거예요. 실제로 먹어 본 사람들이 느낀 맛은 라면 페이지의 맛 지도에서 볼 수 있어요.</p>
<p class="note">수록 기준: 한국 라면은 농심·오뚜기·삼양식품·팔도·하림·풀무원의 공식 홈페이지와 공식 쇼핑몰 제품 목록을 따랐어요. 편의점(GS25·CU·세븐일레븐·이마트24)과 대형마트(이마트·홈플러스·롯데마트)의 자체 라면과 단독 라면은 각 회사 상품 안내와 발표, 기사로 확인한 것만 실었어요. 해외 라면은 나라마다 시장을 이끄는 회사의 대표 제품과 오래 팔린 제품, 세계 라면 평가에서 이름난 제품을 골라 실었고, 나라 이야기는 <a href="/world/">세계 라면 지도</a>에 정리했어요(${esc(DOGAM_CHECKED)} 확인). 해외 라면은 국내 판매 여부와 값이 수입 사정에 따라 달라요. 같은 맛이라도 봉지·컵·큰컵은 맛과 양이 달라 따로 실었어요. 빠진 라면이 있으면 <button type="button" class="link-btn" data-report="">제보</button>해 주세요. <a href="/ramen/?st=exclusive">편의점·마트 라면만 모아 보기</a></p>
</div>`;
  const jsonld = [crumbLd([['/', SITE_NAME], ['/ramen/', '라면 도감']]), { '@context': 'https://schema.org', '@type': 'ItemList', name: `${SITE_NAME} 라면 도감`, numberOfItems: RAMEN.length, itemListElement: SORTED.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/ramen/${r.s}/`), name: r.n })) }];
  return layout({ title: `라면 도감 - 한국과 세계 라면 ${RAMEN.length}가지 | ${SITE_NAME}`, description: `신라면, 불닭볶음면, 짜파게티부터 닛신 컵누들, 인도미 미고렝, 마마 똠얌꿍까지 ${RAMEN.length}가지. 나라·맵기·맛·조리 방식으로 골라 보고 초성으로 찾아요.`, path: '/ramen/', body, scripts: ['dogam.js'], jsonld });
}

// ---------- 라면 한 개 ----------
function similar(r) {
  const same = RAMEN.filter((x) => x.s !== r.s && x.groups.some((g) => r.groups.includes(g)));
  same.sort((a, b) => (b.co === r.co) - (a.co === r.co) || (b.c === r.c) - (a.c === r.c) || (b.m === r.m) - (a.m === r.m) || Math.abs((a.hot ?? 1) - (r.hot ?? 1)) - Math.abs((b.hot ?? 1) - (r.hot ?? 1)) || collatorCmp(a, b));
  return same.slice(0, 4);
}
const collatorCmp = (a, b) => a.n.localeCompare(b.n, 'ko');
const NOODLES = { dry: '건면 (기름에 튀기지 않고 말린 면)', fresh: '생면', cooked: '숙면 (익혀서 살균 포장한 면)', rice: '쌀국수 면', glass: '당면' };

export function ramenPage(r) {
  const g = r.groups[0];
  const path = `/ramen/${r.s}/`;
  const items = [['/', SITE_NAME], ['/ramen/', '라면 도감'], [`/ramen/?g=${g}`, groupName(g)], [path, r.n]];
  const news = NEWS.filter((n) => n.ramen.includes(r.s));
  const facts = [
    r.co !== 'kr' ? ['나라', `<a href="/world/${r.co}/">${esc(r.coName)}</a>`] : null,
    r.on ? ['원래 이름', `<span lang="${r.co === 'jp' ? 'ja' : r.co === 'cn' || r.co === 'tw' || r.co === 'hk' ? 'zh' : 'en'}">${esc(r.on)}</span>`] : null,
    ['회사', `<a href="/ramen/?m=${r.m}">${esc(r.maker)}</a>`],
    ['형태', r.f ? FORMS[r.f] : '<span class="muted">확인 중</span>'],
    ['조리 방식', STYLES[r.c]],
    r.noodle ? ['면', NOODLES[r.noodle] || ''] : null,
    ['맵기 분류', r.hot == null ? '<span class="muted">미분류</span>' : `${HOTS[r.hot]} <small class="muted">(편집부)</small>`],
    r.y ? ['출시', yearText(r.y)] : null,
    ['판매', `${STATUS[r.st]}${r.ch ? ` · ${esc(r.ch)}` : ''}`],
    r.shu ? ['스코빌 지수', `${r.shu.v.toLocaleString('ko-KR')} SHU <small class="muted">(${esc(r.shu.src)})</small>`] : null,
  ].filter(Boolean);
  const body = `<div class="wrap">
${crumbs(items)}
<article class="rhead" data-ramen="${r.s}" data-name="${esc(r.n)}">
<div class="rhead-pic">${img(r.img, `${STYLES[r.c]} 라면 예시 그림`, '', true)}${statusChip(r)}<p class="pic-note">그림은 조리 방식을 보여 주는 예시예요.</p></div>
<div class="rhead-text">
<p class="rhead-maker">${r.co !== 'kr' ? `<a class="rcard-co" href="/world/${r.co}/">${esc(r.coName)}</a>` : ''}<a href="/ramen/?m=${r.m}">${esc(r.maker)}</a>${r.f ? ` · ${formText(r)}` : ''} · ${styleText(r)}</p>
<h1>${esc(r.n)}</h1>
<p class="rcard-tags">${hotChip(r)}${r.t.map((t) => `<span class="pill pill-sm">${esc(t)}</span>`).join('')}</p>
<p class="rhead-desc">${esc(r.d)}</p>
<div class="rhead-score" data-score><p class="muted">기록을 불러오는 중이에요</p></div>
<div class="rhead-actions">
<a class="btn btn-main btn-lg" href="/record/?r=${r.s}" data-rec-btn>${icon('i-plus')}한 그릇 기록</a>
<button type="button" class="btn btn-line" data-mark="tried" aria-pressed="false">${icon('i-check')}먹어 봤어요 <span data-mc="tried"></span></button>
<button type="button" class="btn btn-line" data-mark="want" aria-pressed="false">${icon('i-heart')}먹고 싶어요 <span data-mc="want"></span></button>
<button type="button" class="icon-btn icon-btn-line" data-save="${r.s}" aria-pressed="false" aria-label="저장">${icon('i-bookmark')}</button>
<button type="button" class="icon-btn icon-btn-line" data-share aria-label="공유">${icon('i-share')}</button>
</div>
</div>
</article>

<div class="rbody">
<div class="rmain">
<section class="sec" aria-labelledby="h-taste">
${secHead('맛 지도', `<a class="more-link" href="/lab/compare/?r=${r.s}">다른 라면과 비교${icon('i-chev')}</a>`, 'h-taste')}
<p class="sec-lead">먹어 본 사람들이 여덟 칸에 남긴 점수의 평균이에요. 칸마다 적은 사람 수가 달라요.</p>
<div class="taste" data-taste><p class="muted">불러오는 중이에요</p></div>
</section>

<section class="sec" aria-labelledby="h-how">
${secHead('이렇게 먹었어요', '', 'h-how')}
<div class="how" data-how><p class="muted">불러오는 중이에요</p></div>
</section>

<section class="sec" id="recipes" aria-labelledby="h-recipes">
${secHead('이 라면으로 만든 레시피', `<a class="more-link" href="/recipes/?ramen=${r.s}">모두 보기${icon('i-chev')}</a>`, 'h-recipes')}
<div class="rcp-grid rcp-grid-sm rcp-grid-2" data-recipe-strip data-q="ramen=${r.s}&amp;sort=hot&amp;per=4" data-ramen="${r.s}" data-empty="이 라면으로 만든 레시피가 아직 없어요. 나만의 방법이 있다면 처음으로 올려 주세요."><p class="muted">불러오는 중이에요</p></div>
</section>

<section class="sec" id="bowls" aria-labelledby="h-bowls">
${secHead('한 그릇 기록', '', 'h-bowls')}
<div data-bowls><p class="muted">불러오는 중이에요</p></div>
</section>

<section class="sec" aria-labelledby="h-posts" data-posts-sec hidden>
${secHead('후루룩클럽 이야기', `<a class="more-link" href="/club/write/?ramen=${r.s}">이 라면으로 글쓰기${icon('i-chev')}</a>`, 'h-posts')}
<ul class="post-list" data-posts></ul>
</section>
</div>

<aside class="rside">
<section class="side-box" aria-labelledby="h-facts">
<h2 id="h-facts" class="side-title">기본 정보</h2>
<dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
<button type="button" class="link-btn small" data-report="${r.s}">${icon('i-flag')}정보가 틀렸나요?</button>
</section>
<section class="side-box buy-box" aria-labelledby="h-buy">
<h2 id="h-buy" class="side-title">사러 가기</h2>
<p class="disclosure">${esc(DISCLOSURE)}</p>
${buyLink(r.s, 'ramen', `쿠팡에서 ${r.n} 보기`, 'btn btn-buy btn-block')}
<p class="small muted">가격과 구성은 쿠팡에서 확인해 주세요. ${SITE_NAME}는 가격을 적지 않아요.</p>
</section>
${news.length ? `<section class="side-box"><h2 class="side-title">관련 소식</h2><ul class="news-mini">${news.map((n) => `<li><span>${esc(n.date.replace(/-/g, '.'))}</span><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a></li>`).join('')}</ul></section>` : ''}
</aside>
</div>

<section class="sec" aria-labelledby="h-sim">
${secHead(`${josa(groupName(g), '과', '와')} 비슷한 라면`, moreLink(`/ramen/?g=${g}`, `${groupName(g)} 모두`), 'h-sim')}
${ramenGrid(similar(r))}
</section>
</div>`;
  const jsonld = [crumbLd(items), { '@context': 'https://schema.org', '@type': 'Product', name: r.n, brand: { '@type': 'Brand', name: r.maker }, category: `${groupName(g)} 라면`, description: r.d, url: abs(path), image: abs(`/assets/img/${r.img}.webp`) }];
  const desc = `${r.maker} ${r.n}${r.y ? `(${yearText(r.y)} 출시)` : ''}. ${r.d}`.slice(0, 155);
  return layout({ title: `${r.n} 맛 기록과 랭킹 - ${r.maker} | ${SITE_NAME}`, description: desc, path, body, scripts: ['ramen.js'], jsonld, ogType: 'product' });
}

// ---------- 한 그릇 기록 ----------
export function recordPage() {
  const body = `<div class="wrap wrap-narrow">
<section class="rec-head">
${img('record-notebook', '라면 한 그릇 옆에 펼쳐 둔 수첩', 'rec-pic', true)}
<div><p class="kicker">${WAVE}한 그릇 기록</p><h1>오늘 먹은 라면을 남겨요</h1><p>별점과 ‘또 먹을래요’만 고르면 30초면 끝나요. 맛 지도와 조리법은 아는 만큼만 채워 주세요.</p></div>
</section>
<div data-record><p class="muted">불러오는 중이에요</p></div>
</div>`;
  return layout({ title: `한 그릇 기록 | ${SITE_NAME}`, description: '먹은 라면의 별점, 맛 지도, 끓인 방법을 기록해 내 라면 도감을 채워요.', path: '/record/', body, scripts: ['record.js'], noindex: true });
}

// ---------- 랭킹 ----------
export const RANK_TABS = [
  ['total', '종합'], ['group', '종류별'], ['rising', '급상승'], ['new', '신상'], ['axis', '맛 기준'], ['mania', '매니아 픽'], ['again', '또 먹을래요'],
];
export function rankPage() {
  const body = `<div class="wrap">
<section class="page-head">
<p class="kicker">${WAVE}라면 랭킹</p>
<h1>먹어 본 사람들이 매긴 라면 순위</h1>
<p>별점을 그대로 평균 내지 않고, 기록이 적은 라면이 우연히 위로 뛰지 않게 보정해서 매일 다시 계산해요. <a href="/rank/rules/">평가 기준 보기</a></p>
</section>
<div class="rank" data-rank>
<div class="tabs" role="tablist" aria-label="랭킹 종류">${RANK_TABS.map(([k, l], i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-type="${k}">${l}</button>`).join('')}<a class="tab-link" href="/club/people/">사람 랭킹</a></div>
<div class="chips" data-sub hidden></div>
<p class="rank-desc" data-desc></p>
<div data-list><p class="muted">불러오는 중이에요</p></div>
</div>
</div>`;
  return layout({ title: `라면 랭킹 - 종합, 종류별, 급상승, 신상 | ${SITE_NAME}`, description: '먹어 본 사람들의 한 그릇 기록으로 매긴 라면 랭킹. 종합, 국물면·비빔면·짜장면·볶음면·컵라면 종류별, 급상승, 신상, 맵기 기준, 매니아 픽 순위.', path: '/rank/', body, scripts: ['rank.js'] });
}

export function rankRulesPage() {
  const R = RANK_RULE;
  const body = `<div class="wrap wrap-narrow prose">
${crumbs([['/', SITE_NAME], ['/rank/', '랭킹'], ['/rank/rules/', '평가 기준']])}
<h1>${SITE_NAME} 랭킹은 이렇게 계산해요</h1>
<p class="lead">순위를 정하는 식을 모두 공개해요. 운영자가 손으로 순위를 올리거나 내리지 않고, 광고비와 쇼핑 수수료는 계산에 들어가지 않아요.</p>

<h2>1. 누구의 기록을 세나요</h2>
<ul class="list">
<li>회원이 남긴 ‘한 그릇 기록’만 세요. 별점만 누르는 건 따로 없고, 기록을 남겨야 순위에 들어가요.</li>
<li>한 사람이 라면 하나에 남길 수 있는 기록은 하나예요. 다시 먹고 고치면 가장 새 기록으로 바뀌어요.</li>
<li>제조사나 판매처에서 제품을 받아 남긴 기록은 랭킹에서 빼요. 기록할 때 ‘제품을 받았어요’를 고르면 기록에 표시가 붙어요.</li>
<li>신고가 쌓여 가려진 기록은 빼요.</li>
</ul>

<h2>2. 기록마다 무게가 달라요</h2>
<p>짧은 시간에 만든 계정으로 순위를 흔들지 못하게, 기록 하나하나에 무게를 곱해요.</p>
<table class="tbl">
<thead><tr><th>조건</th><th>무게</th></tr></thead>
<tbody>
<tr><td>가입하고 7일 안에 남긴 기록</td><td>× 0.5</td></tr>
<tr><td>사진이나 바코드로 먹은 걸 확인한 기록 (준비 중)</td><td>× 1.1 / × 1.2</td></tr>
<tr><td>마지막으로 고친 지 12개월이 지난 기록</td><td>× 0.7</td></tr>
<tr><td>그 밖의 기록</td><td>× 1</td></tr>
</tbody>
</table>

<h2>3. 종합 점수</h2>
<p>기록이 두세 개뿐인 라면이 별 다섯 개로 1등이 되는 일을 막으려고 ‘베이지안 평균’을 써요. 기록이 적을수록 전체 평균 쪽으로 당겨지고, 기록이 쌓일수록 그 라면 자체의 평균에 가까워져요.</p>
<p class="formula">점수 = <i>n</i> ÷ (<i>n</i> + ${R.m}) × <i>R</i> + ${R.m} ÷ (<i>n</i> + ${R.m}) × <i>C</i></p>
<ul class="list">
<li><i>R</i>: 그 라면의 무게를 곱한 평균 별점</li>
<li><i>n</i>: 그 라면 기록들의 무게 합</li>
<li><i>C</i>: 모든 라면 기록의 무게를 곱한 평균 별점</li>
<li>${R.m}: 기준 기록 수. 처음에는 이 값으로 시작하고, 기록이 많이 쌓이면 다시 정해 이 페이지에 알려요.</li>
</ul>
<p>기록이 <b>${R.minN}개</b> 이상 모인 라면부터 순위에 올라요. 그 전에는 ‘기록 모으는 중’ 목록에 보여 드려요.</p>

<h2>4. 랭킹 종류</h2>
<table class="tbl">
<thead><tr><th>랭킹</th><th>기준</th></tr></thead>
<tbody>
<tr><td>종합</td><td>위 점수 순서. 기록 ${R.minN}개 이상. 주가 시작될 때의 순위와 비교해 오르내림을 표시해요.</td></tr>
<tr><td>종류별</td><td>국물면, 비빔면, 짜장면, 볶음면, 컵라면, 봉지라면 안에서 같은 점수 순서</td></tr>
<tr><td>급상승</td><td>최근 ${R.risingDays}일 기록 수 ÷ 그 전 ${R.risingDays}일 기록 수(적어도 ${R.risingFloor}개로 계산). 최근 기록 ${R.risingMinRecent}개 이상</td></tr>
<tr><td>신상</td><td>출시한 지 ${R.newMonths}개월 안의 라면. 기록 ${R.newMinN}개 이상</td></tr>
<tr><td>맛 기준</td><td>맵기, 진하기처럼 한 칸의 평균. 그 칸을 적은 기록 ${R.axisMinN}개 이상</td></tr>
<tr><td>매니아 픽</td><td>기록을 ${R.maniaBowls}개 넘게 남긴 회원들의 기록만 모은 점수 (기준 기록 수 ${R.maniaM}, 기록 ${R.maniaMinN}개 이상)</td></tr>
<tr><td>또 먹을래요</td><td>‘또 먹을래요’를 고른 비율. 이 칸에 답한 기록 ${R.againMinN}개 이상</td></tr>
</tbody>
</table>

<h2>5. 맛 지도 여덟 칸</h2>
<p>모든 라면을 같은 여덟 칸으로 기록해요. 칸마다 1점부터 5점까지 고르고, 모르는 칸은 비워 둬요.</p>
<table class="tbl">
<thead><tr><th>칸</th><th>1점</th><th>5점</th></tr></thead>
<tbody>${AXES.map((a) => `<tr><td>${a.name}</td><td>${a.lo}</td><td>${a.hi}</td></tr>`).join('')}</tbody>
</table>
<p>라면 카드의 맵기 표시(순한 편, 매콤, 아주 매운 편)는 이름과 제조사 설명을 보고 편집부가 나눈 거예요. 실제로 먹은 사람들의 맵기는 맛 지도에서 따로 보여 드려요. 스코빌 지수는 제조사나 판매처가 밝힌 값만 적어요.</p>

<h2>6. 기록과 저장</h2>
<p>순위는 1분마다 새로 계산하고, 주가 시작될 때와 달마다 마지막 순위를 따로 저장해 둬요. 라면몰의 ‘이달의 랭킹’ 진열대는 지난달 마지막 순위를 그대로 써요.</p>

<h2>7. 이상한 기록을 발견했다면</h2>
<p>같은 사람이 여러 계정으로 기록하는 것 같거나, 광고성 기록이 보이면 기록 옆의 ‘신고’를 눌러 주세요. 서로 다른 회원 다섯 명이 신고하면 일단 가리고 운영자가 확인해요.</p>
<p><a class="btn btn-main" href="/rank/">랭킹 보러 가기</a></p>
</div>`;
  return layout({ title: `평가 기준 - 라면 랭킹 계산법 | ${SITE_NAME}`, description: `${SITE_NAME} 라면 랭킹의 계산식과 기준을 모두 공개해요. 베이지안 평균, 기록 무게, 랭킹 종류, 맛 지도 여덟 칸.`, path: '/rank/rules/', body, jsonld: crumbLd([['/', SITE_NAME], ['/rank/', '랭킹'], ['/rank/rules/', '평가 기준']]) });
}

// ---------- 신상 레이더 ----------
export function newPage() {
  const recent = NEWEST.filter((r) => releaseKey(r) >= 202501).slice(0, 12);
  const body = `<div class="wrap">
<section class="page-head">
<p class="kicker">${WAVE}신상 레이더</p>
<h1>새로 나온 라면 소식</h1>
<p>제조사 발표와 기사로 확인한 신제품, 한정판, 편의점 단독 라면 소식을 모아요. 소식마다 출처를 함께 적어요.</p>
</section>
<div class="two-col">
<section aria-labelledby="h-news">
<h2 id="h-news" class="h2">소식</h2>
<ul class="news-list">${NEWS.map(newsItem).join('')}</ul>
</section>
<aside class="side-box tip-box">
<h2 class="side-title">새 라면을 봤나요?</h2>
<p>편의점이나 마트에서 처음 보는 라면을 만났다면 알려 주세요. 확인한 뒤 도감에 넣고, 제보가 반영되면 점수 10점을 드려요.</p>
<button type="button" class="btn btn-main btn-block" data-report="" data-kind="newramen">${icon('i-new')}새 라면 제보하기</button>
<p class="small muted">후루룩클럽 게시판의 ‘신상 제보’ 말머리로 사진과 함께 올려도 돼요.</p>
</aside>
</div>
<section class="sec" aria-labelledby="h-recent">
${secHead('2025년 이후 나온 라면', moreLink('/rank/?type=new', '신상 랭킹'), 'h-recent')}
${ramenGrid(recent)}
</section>
</div>`;
  return layout({ title: `신상 라면 레이더 - 새로 나온 라면 소식 | ${SITE_NAME}`, description: '새로 나온 라면, 한정판, 편의점 단독 라면 소식을 출처와 함께 모았어요.', path: '/new/', body });
}

// ---------- 라면몰 ----------
export function shopPage() {
  const shelf = (s) => {
    let list = [];
    if (s.items) list = s.items.map((x) => BY[x]).filter(Boolean);
    else if (s.auto === 'hot') list = RAMEN.filter((r) => r.hot === 2);
    return `<section class="sec shelf" aria-labelledby="sh-${s.id}" ${s.auto === 'rank' ? 'data-shelf-rank' : ''}>
${secHead(s.title, '', `sh-${s.id}`)}
<p class="sec-lead">${esc(s.desc)}</p>
<div class="shop-row" ${s.auto === 'rank' ? 'data-shelf-list' : ''}>${s.auto === 'rank' ? '<p class="muted">랭킹을 불러오는 중이에요</p>' : list.map((r) => productCard(r, `shop-${s.id}`)).join('')}</div>
</section>`;
  };
  const body = `<div class="wrap">
<section class="page-head shop-head">
<p class="kicker">${WAVE}라면몰</p>
<h1>먹어 보고 고른 라면, 바로 담아 가세요</h1>
<p>진열 순서는 ${SITE_NAME} 랭킹과 편집부 분류를 따라요. 돈을 받고 앞에 놓는 자리는 없어요.</p>
<p class="disclosure disclosure-strong">${esc(DISCLOSURE)}</p>
</section>
${SHOP.shelves.map(shelf).join('\n')}
<section class="sec" aria-labelledby="h-allshop">
${secHead('종류별로 모두 보기', '', 'h-allshop')}
${GROUPS.map((g) => `<details class="shop-group"><summary>${img(g.img, '')}<b>${g.name}</b><span class="muted">${RAMEN.filter((r) => r.groups.includes(g.id)).length}가지</span></summary><div class="shop-row">${RAMEN.filter((r) => r.groups.includes(g.id)).map((r) => productCard(r, `shop-${g.id}`)).join('')}</div></details>`).join('')}
</section>
<p class="note">상품 그림은 조리 방식을 보여 주는 예시예요. 실제 상품 사진과 가격, 구성은 쿠팡 상품 페이지에서 확인해 주세요.</p>
</div>`;
  return layout({ title: `라면몰 - 랭킹으로 고른 라면 | ${SITE_NAME}`, description: '면면 랭킹과 편집부 분류로 진열한 라면몰. 이달의 랭킹, 맵기 도전, 비빔면, 짜장라면, 컵라면.', path: '/shop/', body, scripts: ['shop.js'] });
}

export { groupName };
