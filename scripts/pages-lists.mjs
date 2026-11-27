// 모아 보기 페이지: 종류별(국물·비빔·짜장·볶음·컵·봉지), 회사별, 편의점 라면, 매운 라면
// 도감 필터(?g=, ?m=)는 화면에서만 바뀌어 검색에 잡히지 않아서, 자주 찾는 묶음을 따로 페이지로 만들어요.
import {
  RAMEN, MAKERS, COUNTRIES, SITE_NAME, abs, esc, layout, crumbs, crumbLd, secHead, moreLink, ramenGrid, icon, WAVE,
  collator, releaseKey, yearText, josa,
} from './lib.mjs';
import { STYLES, FORMS, GROUPS, inGroup } from '../server/catalog-data.js';

const RETAILERS = ['gs25', 'cu', 'seven', 'emart24', 'emart', 'homeplus', 'lottemart'];
const BIG4 = ['nongshim', 'ottogi', 'samyang', 'paldo'];
const byName = (a, b) => collator.compare(a.n, b.n);
const byOld = (a, b) => (releaseKey(a) || 999999) - (releaseKey(b) || 999999) || byName(a, b);
const count = (list, fn) => list.filter(fn).length;
const num = (n) => n.toLocaleString('ko-KR');

// 종류 페이지에 붙이는 이름과 소개
export const TYPE_PAGES = {
  soup: { h: '국물 라면', kw: '국물 라면 종류', lead: '얼큰한 라면부터 맑은 국물, 짬뽕, 우동·칼국수까지 국물에 면을 말아 먹는 라면을 모았어요.' },
  bibim: { h: '비빔면', kw: '비빔면 종류', lead: '삶아서 찬물에 헹군 면에 소스를 비벼 먹는 라면이에요. 냉면·막국수처럼 차게 먹는 라면도 여기에 넣었어요.' },
  jjajang: { h: '짜장라면', kw: '짜장라면 종류', lead: '물을 조금 남기고 짜장 소스에 비벼 먹는 라면이에요. 춘장 맛이 진한 것부터 매운 짜장까지 있어요.' },
  fried: { h: '볶음면', kw: '볶음면 종류', lead: '물을 버리고 소스에 볶거나 비벼 먹는 라면이에요. 불닭볶음면 같은 매운 볶음면과 해외 미고렝·야키소바가 여기에 들어요.' },
  cup: { h: '컵라면', kw: '컵라면 종류', lead: '뜨거운 물만 부으면 되는 컵라면과 큰컵 라면을 모았어요. 같은 이름이라도 봉지라면과 맛과 양이 달라 따로 실었어요.' },
  bag: { h: '봉지라면', kw: '봉지라면 종류', lead: '냄비에 끓이거나 삶아 먹는 봉지라면을 모았어요. 국물 라면, 비빔면, 짜장라면, 볶음면이 모두 들어 있어요.' },
};
// 회사 페이지를 만드는 기준: 도감에 6가지 이상
export const MAKER_PAGES = Object.keys(MAKERS).filter((m) => count(RAMEN, (r) => r.m === m) >= 6);
const makerName = (m) => MAKERS[m] || m;
const shortMaker = (m) => ({ samyang: '삼양' }[m] || makerName(m).replace(/\(.*\)$/, ''));

// 다른 모아 보기로 가는 길 (모든 모아 보기 페이지 아래에 같은 순서로)
function moreLists(cur) {
  const links = [
    ...Object.entries(TYPE_PAGES).map(([g, t]) => [`/ramen/type/${g}/`, t.h]),
    ['/ramen/spicy/', '매운 라면'], ['/ramen/cvs/', '편의점 라면'],
    ...MAKER_PAGES.filter((m) => !RETAILERS.includes(m)).map((m) => [`/ramen/maker/${m}/`, `${shortMaker(m)} 라면`]),
  ].filter(([h]) => h !== cur);
  return `<nav class="pill-links" aria-label="다른 라면 모아 보기">${links.map(([h, l]) => `<a class="pill" href="${h}">${esc(l)}</a>`).join('')}<a class="pill" href="/world/">나라별 라면</a><a class="pill" href="/guide/">라면 상식 Q&amp;A</a></nav>`;
}

// 숫자로 쓰는 소개 문장 (원고에 있는 사실만 써요)
function factLine(list, { skipMaker = false } = {}) {
  const kr = count(list, (r) => r.co === 'kr');
  const out = [];
  out.push(kr === list.length ? `모두 한국 라면이에요.` : kr ? `한국 라면 ${kr}가지, 해외 라면 ${list.length - kr}가지예요.` : `모두 해외 라면이에요.`);
  if (!skipMaker) {
    const ms = Object.entries(list.reduce((o, r) => ((o[r.m] = (o[r.m] || 0) + 1), o), {})).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (ms.length > 1) out.push(`회사별로는 ${ms.map(([m, n]) => `${makerName(m)} ${n}가지`).join(', ')} 순으로 많아요.`);
  }
  const dated = list.filter((r) => releaseKey(r)).sort(byOld);
  if (dated.length >= 2) {
    const o = dated[0], n = dated[dated.length - 1];
    out.push(`가장 오래된 것은 ${yearText(o.y)}에 나온 ${josa(o.n, '이고', '고')}, 가장 최근 것은 ${yearText(n.y)}에 나온 ${josa(n.n, '이에요', '예요')}.`);
  }
  const hot2 = count(list, (r) => r.hot === 2);
  if (hot2) out.push(`편집부가 '아주 매운 편'으로 나눈 라면은 ${hot2}가지예요.`);
  return out.join(' ');
}

// 대표 이름 몇 개 (설명 문구용): 많이 알려진 라면을 먼저, 그다음 큰 네 회사의 오래된 라면
const KNOWN = ['shin-ramyun', 'buldak', 'chapagetti', 'jin-ramen-hot', 'samyang-ramen', 'neoguri', 'ansung-tangmyun', 'paldo-bibimmyeon', 'yukgaejang-sabalmyun',
  'dosirak', 'king-lid', 'jin-jjamppong', 'yeol-ramen', 'jjawang', 'ojingeo-jjamppong', 'baehongdong-bibimmyeon', 'jin-bibimmyeon', 'carbo-buldak', 'sesame-ramen',
  'kokomyeon', 'nissin-chicken-ramen', 'nissin-cup-noodle', 'indomie-mi-goreng', 'cup-noodle', 'snack-myeon', 'shin-ramyun-black'];
const known = (r) => { const i = KNOWN.indexOf(r.s); return i < 0 ? 999 : i; };
function famous(list, n = 3) {
  const pick = [...list].sort((a, b) => known(a) - known(b) || (BIG4.includes(b.m) - BIG4.includes(a.m)) || (b.co === 'kr') - (a.co === 'kr') || byOld(a, b));
  return pick.slice(0, n).map((r) => r.n);
}

function listPage({ path, crumbName, h1, kicker, lead, sections, title, description, list }) {
  const items = [['/', SITE_NAME], ['/ramen/', '라면 도감'], [path, crumbName]];
  const body = `<div class="wrap">
${crumbs(items)}
<section class="page-head">
<div><p class="kicker">${WAVE}${esc(kicker)}</p><h1>${esc(h1)}</h1><p>${lead}</p></div>
</section>
${sections.length > 1 ? `<nav class="pill-links jump" aria-label="이 페이지 안에서 바로 가기">${sections.map((s, i) => `<a class="pill" href="#l${i + 1}">${esc(s.title)} <small>${s.list.length}</small></a>`).join('')}</nav>` : ''}
${sections.map((s, i) => `<section class="sec" aria-labelledby="l${i + 1}">
${secHead(`${s.title} ${s.list.length}가지`, s.more || '', `l${i + 1}`)}
${s.lead ? `<p class="sec-lead">${s.lead}</p>` : ''}
${ramenGrid(s.list, { eagerFirst: i === 0 })}
</section>`).join('\n')}
<section class="sec" aria-labelledby="h-more">
${secHead('다른 라면 모아 보기', moreLink('/ramen/', '라면 도감 전체'), 'h-more')}
${moreLists(path)}
<p class="note">형태와 조리 방식, 맵기 분류는 제조사 설명과 이름을 보고 편집부가 나눈 거예요. 맛과 별점은 먹어 본 사람들의 한 그릇 기록으로 라면 페이지마다 따로 모아요. 빠진 라면이나 틀린 정보는 <button type="button" class="link-btn" data-report="">제보</button>해 주세요.</p>
</section>
</div>`;
  const jsonld = [crumbLd(items), {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: h1, url: abs(path), description,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: abs('/') },
    mainEntity: { '@type': 'ItemList', numberOfItems: list.length, itemListElement: list.slice(0, 100).map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/ramen/${r.s}/`), name: r.n })) },
  }];
  return layout({ title, description, path, body, jsonld });
}

// 나라·회사 순으로 묶기 (종류 페이지)
function sectionsByMaker(list, g) {
  const kr = list.filter((r) => r.co === 'kr');
  const makers = [...new Set(kr.map((r) => r.m))].sort((a, b) => (RETAILERS.includes(a) - RETAILERS.includes(b)) || count(kr, (r) => r.m === b) - count(kr, (r) => r.m === a) || collator.compare(makerName(a), makerName(b)));
  const big = makers.filter((m) => !RETAILERS.includes(m) && count(kr, (r) => r.m === m) >= 4);
  const out = big.map((m) => ({ title: `${makerName(m)}`, list: kr.filter((r) => r.m === m).sort(byOld), more: MAKER_PAGES.includes(m) ? moreLink(`/ramen/maker/${m}/`, `${shortMaker(m)} 라면 모두`) : '' }));
  const rest = kr.filter((r) => !big.includes(r.m) && !RETAILERS.includes(r.m)).sort(byName);
  if (rest.length) out.push({ title: '그 밖의 한국 라면', list: rest });
  const shop = kr.filter((r) => RETAILERS.includes(r.m)).sort(byName);
  if (shop.length) out.push({ title: '편의점·마트 자체 라면', list: shop, more: moreLink('/ramen/cvs/', '편의점 라면 모두') });
  const abroad = list.filter((r) => r.co !== 'kr').sort((a, b) => collator.compare(a.coName, b.coName) || byName(a, b));
  if (abroad.length) out.push({ title: '해외 라면', list: abroad, more: moreLink(`/ramen/?g=${g}&co=xx`, '나라로 골라 보기'), lead: `${[...new Set(abroad.map((r) => r.coName))].join(', ')} 라면이에요.` });
  return out;
}

export function typePage(g) {
  const t = TYPE_PAGES[g];
  const grp = GROUPS.find((x) => x.id === g);
  const list = RAMEN.filter((r) => inGroup(r, grp));
  const path = `/ramen/type/${g}/`;
  const names = famous(list);
  const lead = `${esc(t.lead)} 면면 도감에 실린 ${esc(josa(t.h, '은', '는'))} 모두 ${num(list.length)}가지예요. ${esc(factLine(list))}`;
  return listPage({
    path, crumbName: t.h, h1: `${t.kw} ${num(list.length)}가지`, kicker: '라면 모아 보기', lead, list,
    sections: sectionsByMaker(list, g),
    title: `${t.kw} ${num(list.length)}가지 한눈에 보기 | ${SITE_NAME}`,
    description: `${names.join(', ')} 등 ${t.h} ${num(list.length)}가지를 회사·출시 연도·맵기와 함께 모았어요. 한국 라면과 해외 라면을 나눠 봐요.`,
  });
}

// 제목이 너무 길면 대표 이름을 줄여요 (검색 결과에서 잘리지 않게)
function makerTitle(name, n, names) {
  const base = `${name} 라면 종류 ${num(n)}가지`;
  for (const k of [2, 1]) {
    const t = `${base} - ${names.slice(0, k).join(', ')}부터`;
    if (t.length <= 38) return `${t} | ${SITE_NAME}`;
  }
  return `${base} | ${SITE_NAME}`;
}

export function makerPage(m) {
  const list = RAMEN.filter((r) => r.m === m);
  const name = makerName(m);
  const path = `/ramen/maker/${m}/`;
  const cos = [...new Set(list.map((r) => r.co))];
  const forms = Object.entries(FORMS).map(([k, v]) => [v, count(list, (r) => r.f === k)]).filter(([, n]) => n);
  const shu = list.filter((r) => r.shu).sort((a, b) => b.shu.v - a.shu.v)[0];
  const isShop = RETAILERS.includes(m);
  const coText = cos.length === 1 && cos[0] !== 'kr' ? `${COUNTRIES[cos[0]].name} ` : '';
  const leadParts = [
    `면면 도감에 실린 ${coText}${esc(name)} 라면은 ${num(list.length)}가지예요.`,
    forms.length === 1 && !count(list, (r) => !r.f) ? `모두 ${forms[0][0]}라면이에요.` : forms.length ? `${forms.map(([v, n]) => `${v} ${n}가지`).join(', ')}${count(list, (r) => !r.f) ? `, 형태를 확인 중인 것 ${count(list, (r) => !r.f)}가지` : ''}로 나뉘어요.` : '',
    esc(factLine(list, { skipMaker: true }).replace(/^모두 (한국|해외) 라면이에요\. ?/, '')),
    shu ? `회사가 밝힌 스코빌 지수가 가장 높은 것은 ${num(shu.shu.v)} SHU인 ${esc(josa(shu.n, '이에요', '예요'))}.` : '',
    isShop ? '편의점·마트 라면은 행사와 매장에 따라 없을 수 있어요.' : '',
    cos.length === 1 && cos[0] !== 'kr' ? `<a href="/world/${cos[0]}/">${esc(COUNTRIES[cos[0]].name)} 라면 이야기</a>도 함께 읽어 보세요.` : '',
  ].filter(Boolean);
  const styles = Object.keys(STYLES).filter((c) => list.some((r) => r.c === c));
  const sections = styles.map((c) => ({ title: `${STYLES[c]}`, list: list.filter((r) => r.c === c).sort(byOld) }));
  // 한 칸짜리 묶음이 많으면 합쳐서 보기 좋게
  const small = sections.filter((s) => s.list.length < 3);
  const merged = small.length >= 2 ? [...sections.filter((s) => s.list.length >= 3), { title: small.map((s) => s.title).join('·'), list: small.flatMap((s) => s.list) }] : sections;
  merged.forEach((s) => { s.title = /라면|면$/.test(s.title) ? s.title : `${s.title} 라면`; });
  const names = famous(list);
  return listPage({
    path, crumbName: `${shortMaker(m)} 라면`, h1: `${name} 라면 종류 ${num(list.length)}가지`, kicker: isShop ? '편의점·마트 라면' : cos[0] !== 'kr' && cos.length === 1 ? `${COUNTRIES[cos[0]].name} 라면 회사` : '라면 회사', lead: leadParts.join(' '), list,
    sections: merged,
    title: makerTitle(name, list.length, names),
    description: `${isShop ? `${name}에서만 파는 라면` : `${josa(name, '이', '가')} 만든 라면`} ${num(list.length)}가지. ${names.join(', ')} 등 봉지라면과 컵라면을 국물·비빔·짜장·볶음으로 나눠 출시 연도 순으로 모았어요.`,
  });
}

export function cvsPage() {
  const list = RAMEN.filter((r) => r.st === 'exclusive');
  const path = '/ramen/cvs/';
  const CVS = ['GS25', 'CU', '세븐일레븐', '이마트24'];
  const chains = [...new Set(list.map((r) => r.ch).filter(Boolean))].sort((a, b) => (CVS.includes(b) - CVS.includes(a)) || count(list, (r) => r.ch === b) - count(list, (r) => r.ch === a));
  const sections = chains.map((ch) => ({ title: ch, list: list.filter((r) => r.ch === ch).sort(byOld) }));
  const etc = list.filter((r) => !r.ch);
  if (etc.length) sections.push({ title: '그 밖의 단독 라면', list: etc });
  const lead = `편의점과 대형마트에서만 파는 라면을 모았어요. 면면 도감에 실린 단독 판매 라면은 ${num(list.length)}가지이고, ${chains.map((ch) => `${ch} ${count(list, (r) => r.ch === ch)}가지`).join(', ')}예요. 라면 회사가 편의점과 함께 만든 제품도 들어 있어요. 한정판과 행사 상품은 자주 바뀌어서 매장에 없을 수 있어요.`;
  return listPage({
    path, crumbName: '편의점 라면', h1: `편의점 라면 ${num(list.length)}가지`, kicker: '편의점·마트 단독 라면', lead, list, sections,
    title: `편의점 라면 종류 ${num(list.length)}가지 - ${chains.filter((c) => CVS.includes(c)).join('·')} 단독 라면 | ${SITE_NAME}`,
    description: `${chains.join(', ')}에서만 파는 라면 ${num(list.length)}가지. 편의점 PB 라면과 단독 판매 라면을 체인별로 출시 순서대로 모았어요.`,
  });
}

export function spicyPage() {
  const hot2 = RAMEN.filter((r) => r.hot === 2).sort((a, b) => ((b.shu && b.shu.v) || 0) - ((a.shu && a.shu.v) || 0) || byName(a, b));
  const hot1 = RAMEN.filter((r) => r.hot === 1).sort((a, b) => ((b.shu && b.shu.v) || 0) - ((a.shu && a.shu.v) || 0) || byName(a, b));
  const list = [...hot2, ...hot1];
  const path = '/ramen/spicy/';
  const shuTop = RAMEN.filter((r) => r.shu).sort((a, b) => b.shu.v - a.shu.v).slice(0, 3);
  const lead = `편집부가 이름과 제조사 설명을 보고 '아주 매운 편'과 '매콤'으로 나눈 라면 ${num(list.length)}가지예요. 회사가 스코빌 지수를 밝힌 라면은 그 숫자가 높은 순서로 앞에 두었어요. ${shuTop.length ? `밝혀진 숫자로는 ${shuTop.map((r) => `${esc(r.n)}(${num(r.shu.v)} SHU)`).join(', ')} 순으로 매워요.` : ''} 스코빌 지수로 줄 세운 순위는 <a href="/lab/heat/">맵기 사다리</a>에서 볼 수 있어요.`;
  return listPage({
    path, crumbName: '매운 라면', h1: `매운 라면 ${num(list.length)}가지`, kicker: '라면 모아 보기', lead, list,
    sections: [
      { title: '아주 매운 편', list: hot2, more: moreLink('/lab/heat/', '스코빌 순위 보기'), lead: '매운맛이 강하다고 알려진 라면이에요. 처음 먹는다면 스프를 조금 덜 넣어 보세요.' },
      { title: '매콤한 라면', list: hot1, lead: '신라면처럼 얼큰하게 매운 정도의 라면이에요.' },
    ],
    title: `매운 라면 종류 ${num(list.length)}가지 - 스코빌 지수 높은 라면부터 | ${SITE_NAME}`,
    description: `아주 매운 라면 ${hot2.length}가지와 매콤한 라면 ${hot1.length}가지. ${shuTop.map((r) => r.n).join(', ')} 등 회사가 밝힌 스코빌 지수 순으로 정리했어요.`,
  });
}

// 빌드에서 쓰는 목록: [경로, html]
export function listPages() {
  return [
    ...Object.keys(TYPE_PAGES).map((g) => [`ramen/type/${g}`, typePage(g)]),
    ...MAKER_PAGES.map((m) => [`ramen/maker/${m}`, makerPage(m)]),
    ['ramen/cvs', cvsPage()],
    ['ramen/spicy', spicyPage()],
  ];
}
export const LIST_URLS = () => [
  ...Object.keys(TYPE_PAGES).map((g) => `/ramen/type/${g}/`),
  ...MAKER_PAGES.map((m) => `/ramen/maker/${m}/`),
  '/ramen/cvs/', '/ramen/spicy/',
];
void icon;
