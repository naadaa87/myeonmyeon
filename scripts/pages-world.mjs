// 페이지: 세계 라면 지도 (나라별 소비, 나라 이야기, 나라별 라면)
import {
  esc, abs, SITE_NAME, BY, RAMEN, SORTED, layout, icon, WAVE, crumbs, crumbLd, secHead, moreLink, ramenGrid, WORLD, COUNTRIES,
} from './lib.mjs';

const W = WORLD.wina;
const LIST = WORLD.countries;
const ABROAD = LIST.filter((c) => c.code !== 'kr');
const ofCountry = (code) => SORTED.filter((r) => r.co === code);

// 원고 점검: 본문 링크와 나라별 라면이 실제로 있는지
const problems = [];
for (const c of LIST) {
  for (const p of c.body || []) for (const m of p.matchAll(/\[\[ramen:([a-z0-9-]+)\|/g)) if (!BY[m[1]]) problems.push(`${c.code}: 라면 주소 ${m[1]}가 도감에 없어요.`);
  if (c.code !== 'kr' && !ofCountry(c.code).length) problems.push(`${c.code}: 도감에 이 나라 라면이 없어요.`);
  if (c.code !== 'kr' && !(c.sources || []).length) problems.push(`${c.code}: 참고 자료(sources)를 적어 주세요.`);
}
if (problems.length) {
  console.error('\n[세계 라면 지도 원고 점검]\n' + problems.map((p) => ' - ' + p).join('\n') + '\n');
  process.exit(1);
}

const rich = (p) => esc(p).replace(/\[\[ramen:([a-z0-9-]+)\|([^\]]+)\]\]/g, (_, s, label) => `<a class="ilink-ramen" href="/ramen/${s}/">${label}</a>`);
const eok = (v) => {
  const whole = Math.floor(v), rest = Math.round((v - whole) * 10) * 1000;
  return `${whole.toLocaleString('ko-KR')}억${rest ? ` ${rest.toLocaleString('ko-KR')}만` : ''} 개`;
};
const countryHref = (c) => (c.code === 'kr' ? '/ramen/?co=kr' : `/world/${c.code}/`);

// 막대 그래프: 가장 큰 값을 100%로
function bars(rows, { max, unit, note }) {
  return `<ol class="wbars">${rows.map((r) => {
    const v = r.v;
    const w = v == null ? (r.ghost || 0) / max * 100 : v / max * 100;
    return `<li class="wbar${r.me ? ' wbar-me' : ''}${v == null ? ' ghost' : ''}">
<span class="wbar-k">${r.rank ? `<b>${esc(r.rank)}</b>` : ''}${r.href ? `<a href="${r.href}">${esc(r.name)}</a>` : esc(r.name)}</span>
<span class="wbar-track"><span class="wbar-fill" style="width:${Math.max(2, w).toFixed(1)}%"></span></span>
<span class="wbar-v">${esc(r.label || `${v}${unit}`)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span>
</li>`;
  }).join('')}</ol>${note ? `<p class="small muted wbars-note">${esc(note)}</p>` : ''}`;
}

const byName = Object.fromEntries(LIST.map((c) => [c.name, c]));
const nameHref = (n) => (byName[n] ? countryHref(byName[n]) : n === '중국·홍콩' ? '/world/cn/' : '');

function countryCard(c) {
  const list = c.code === 'kr' ? RAMEN.filter((r) => r.co === 'kr') : ofCountry(c.code);
  const picks = c.code === 'kr' ? [] : RAMEN.filter((r) => r.co === c.code).slice(0, 3);
  return `<article class="wcard">
<a class="wcard-link" href="${countryHref(c)}">
<p class="wcard-top"><span class="wcard-region">${esc(c.region)}</span><span class="wcard-n">${list.length}가지</span></p>
<h3>${esc(c.name)}<small lang="en">${esc(c.en)}</small></h3>
<p class="wcard-lead">${esc(c.lead)}</p>
<p class="wcard-short">${esc(c.short)}</p>
${picks.length ? `<p class="wcard-picks">${picks.map((r) => `<span class="pill pill-sm">${esc(r.n)}</span>`).join('')}</p>` : ''}
</a>
</article>`;
}

export function worldHubPage() {
  const path = '/world/';
  const items = [['/', SITE_NAME], ['/ramen/', '라면 도감'], [path, '세계 라면 지도']];
  const n = RAMEN.length - RAMEN.filter((r) => r.co === 'kr').length;
  const wrows = W.rows.map(([rank, name, v, sub]) => {
    const approx = /^약/.test(sub);
    return {
      rank, name, v, href: nameHref(name), me: name === '한국', ghost: name === '한국' ? 41 : 0,
      label: v == null ? `${W.year}년 값 확인 중` : `${approx ? '약 ' : ''}${eok(v)}`, sub: approx ? '' : sub,
    };
  });
  const prow = W.percap.map(([name, v]) => ({ name, v, href: nameHref(name), me: name === '한국', label: `${v}개` }));
  const body = `<div class="wrap">
${crumbs(items)}
<header class="story-head world-head">
<p class="kicker">${WAVE}라면 도감 · 세계</p>
<h1>세계 라면 지도</h1>
<p class="story-lead">한 해 1,242억 그릇. 나라마다 즐겨 먹는 맛과 대표 라면이 어떻게 다른지 정리했어요. 해외 ${ABROAD.length}개 나라 라면 ${n}가지를 도감에서 바로 골라 볼 수 있어요.</p>
<p class="story-meta"><span>세계라면협회(WINA) ${esc(W.released)} 발표 기준</span><span>${esc(WORLD.updated.replace(/-/g, '.'))} 고침</span></p>
</header>
<dl class="story-facts">
<div><dt>${esc(W.total)}</dt><dd>${W.year}년 세계 라면 소비량, ${esc(W.change)}</dd></div>
<div><dt>중국·홍콩</dt><dd>총소비 1위, ${eok(W.rows[0][2])}</dd></div>
<div><dt>베트남 81개</dt><dd>1인당 소비 1위 (2024년). 한국은 79.2개로 2위</dd></div>
<div><dt>${ABROAD.length}개 나라 ${n}가지</dt><dd>면면 도감에 실은 해외 라면</dd></div>
</dl>
<nav class="wjump" aria-label="나라 바로 가기"><a class="pill" href="/ramen/?co=xx">${icon('i-grid')}해외 라면 모두 보기</a>${ABROAD.map((c) => `<a class="pill" href="/world/${c.code}/">${esc(c.name)}</a>`).join('')}</nav>

<section class="sec" aria-labelledby="h-wina">
${secHead(`${W.year}년 라면을 가장 많이 먹은 나라`, '', 'h-wina')}
${bars(wrows, { max: W.rows[0][2], unit: '억 개', note: W.note })}
</section>

<section class="sec" aria-labelledby="h-percap">
${secHead('한 사람이 가장 많이 먹는 나라', '', 'h-percap')}
${bars(prow, { max: 81, unit: '개', note: W.percapNote })}
</section>

<section class="sec" aria-labelledby="h-nations">
${secHead('나라별로 보기', moreLink('/ramen/?co=xx', '도감에서 필터로 고르기'), 'h-nations')}
<div class="wgrid">${LIST.map(countryCard).join('')}</div>
<p class="note">${icon('i-pin')}먹어 본 라면을 기록하면 <a href="/me/#coll">내 도감의 세계 라면 여권</a>에 나라마다 도장이 찍혀요.</p>
</section>

<section class="sec" aria-labelledby="h-regions">
${secHead('지역마다 다른 맛', '', 'h-regions')}
<div class="wregions">${WORLD.regions.map((r) => `<div class="wregion"><h3>${esc(r.h)}</h3><p>${esc(r.p)}</p></div>`).join('')}</div>
</section>

<section class="sec" aria-labelledby="h-tips">
${secHead('해외 라면 고를 때', '', 'h-tips')}
<ol class="wtips">${WORLD.tips.map(([h, p]) => `<li><b>${esc(h)}</b><p>${esc(p)}</p></li>`).join('')}</ol>
</section>

<section class="story-src" aria-labelledby="h-src">
<h2 id="h-src">참고한 자료</h2>
<ol>${WORLD.sources.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ol>
<p class="small muted">나라별 이야기에 쓴 자료는 나라 페이지마다 따로 밝혀 두었어요. 고칠 곳이 보이면 <button type="button" class="link-btn" data-report="">알려 주세요</button>.</p>
</section>
</div>`;
  const jsonld = [crumbLd(items), {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: `세계 라면 지도 | ${SITE_NAME}`, url: abs(path),
    hasPart: ABROAD.map((c) => ({ '@type': 'WebPage', name: `${c.name} 라면`, url: abs(`/world/${c.code}/`) })),
  }];
  return layout({ title: `세계 라면 지도 - 나라별 라면 소비와 대표 라면 | ${SITE_NAME}`, description: `${W.year}년 세계 라면 소비 ${W.total}. 중국, 인도네시아, 일본, 베트남, 태국, 대만 등 ${ABROAD.length}개 나라의 라면 문화와 대표 라면 ${n}가지를 정리했어요.`, path, body, jsonld });
}

export function worldCountryPage(c) {
  const path = `/world/${c.code}/`;
  const items = [['/', SITE_NAME], ['/world/', '세계 라면 지도'], [path, `${c.name} 라면`]];
  const list = ofCountry(c.code);
  const facts = [
    c.wina ? [c.wina, `${W.year}년 라면 소비량 (WINA)`] : null,
    c.percap ? [`${c.percap}개`, '2024년 한 사람이 먹은 라면'] : null,
    [`${list.length}가지`, '면면 도감에 실은 라면'],
  ].filter(Boolean);
  const others = ABROAD.filter((x) => x.code !== c.code);
  const body = `<div class="wrap">
${crumbs(items)}
<article class="story">
<header class="story-head">
<p class="kicker">${WAVE}세계 라면 지도 · ${esc(c.region)}</p>
<h1>${esc(c.name)} 라면</h1>
<p class="story-lead">${esc(c.lead)}. ${esc(c.short)}</p>
<p class="story-meta"><span lang="en">${esc(c.en)}</span><span>참고 자료 ${c.sources.length}개</span></p>
</header>
<dl class="story-facts">${facts.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
<dl class="wmeta">${c.makers ? `<div><dt>주요 회사</dt><dd>${esc(c.makers)}</dd></div>` : ''}${c.flavors ? `<div><dt>많이 먹는 맛</dt><dd>${esc(c.flavors)}</dd></div>` : ''}</dl>
<div class="story-body world-body">${c.body.map((p) => `<p>${rich(p)}</p>`).join('')}</div>
${c.eat ? `<aside class="weat"><h2>${icon('i-bowl')}이렇게 먹어요</h2><p>${esc(c.eat)}</p></aside>` : ''}
</article>
<section class="sec" aria-labelledby="h-list">
${secHead(`도감 속 ${c.name} 라면`, moreLink(`/ramen/?co=${c.code}`, '맵기·맛으로 골라 보기'), 'h-list')}
${ramenGrid(list, { from: '', eagerFirst: true })}
<p class="note">국내 판매 여부와 값은 수입 사정에 따라 달라요. 구매 버튼은 쿠팡 검색 결과로 이어지고, 면면은 쿠팡 파트너스 활동으로 일정 수수료를 받을 수 있어요.</p>
</section>
<section class="story-src" aria-labelledby="h-src">
<h2 id="h-src">참고한 자료</h2>
<ol>${c.sources.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ol>
<p class="small muted">연도와 숫자는 회사 발표, 협회 자료, 언론 보도로 확인한 것만 적었어요. 고칠 곳이 보이면 <button type="button" class="link-btn" data-report="">알려 주세요</button>.</p>
</section>
<nav class="wjump wjump-foot" aria-label="다른 나라"><a class="pill" href="/world/">${icon('i-grid')}세계 라면 지도</a>${others.map((x) => `<a class="pill" href="/world/${x.code}/">${esc(x.name)}</a>`).join('')}</nav>
</div>`;
  const jsonld = [crumbLd(items), {
    '@context': 'https://schema.org', '@type': 'ItemList', name: `${c.name} 라면 | ${SITE_NAME}`, numberOfItems: list.length,
    itemListElement: list.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/ramen/${r.s}/`), name: r.n })),
  }];
  const names = list.slice(0, 3).map((r) => r.n).join(', ');
  return layout({ title: `${c.name} 라면 - 대표 라면과 라면 문화 | ${SITE_NAME}`, description: `${c.short} ${names} 등 ${c.name} 라면 ${list.length}가지를 맵기와 맛으로 골라 보세요.`, path, body, jsonld });
}

export const WORLD_PAGES = ABROAD;
