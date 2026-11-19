// 페이지: 세계 라면 지도 (나라별 소비, 나라 이야기, 나라별 라면)
import {
  esc, abs, SITE_NAME, BY, RAMEN, SORTED, layout, icon, WAVE, crumbs, crumbLd, secHead, moreLink, ramenGrid, WORLD, COUNTRIES, readJSON, MAKERS, yearText,
} from './lib.mjs';
const MORE = readJSON('content/world-more.json');

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
for (const [, co, , r] of MORE.timeline) {
  if (co && !COUNTRIES[co]) problems.push(`연표: 나라 ${co}가 없어요.`);
  if (r && !r.startsWith('/') && !BY[r]) problems.push(`연표: 라면 주소 ${r}가 도감에 없어요.`);
}
for (const f of MORE.families) for (const m of f.makers) if (!MAKERS[m]) problems.push(`가계도: 회사 ${m}가 없어요.`);
for (const l of MORE.best.lists) for (const [, co, , r] of l.rows) {
  if (!COUNTRIES[co] && !(MORE.best.others || {})[co]) problems.push(`TOP 10: 나라 ${co}가 없어요.`);
  if (r && !BY[r]) problems.push(`TOP 10: 라면 주소 ${r}가 도감에 없어요.`);
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
${tileMap()}
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

<section class="sec" aria-labelledby="h-wmore">
${secHead('세계 라면 더 읽기', '', 'h-wmore')}
<div class="mania">${[
    ['/world/best/', 'i-trophy', '세계가 뽑은 라면 TOP 10', '라면 후기 5,000편을 쓴 평론가가 해마다 고르는 역대 최고 라면'],
    ['/world/timeline/', 'i-clock', '세계 라면 연표', `1958년 치킨라멘부터 오늘까지 ${MORE.timeline.length}개 장면`],
    ['/world/brands/', 'i-grid', '라면 가계도', '닛신, 네슬레, 유니레버… 나라는 달라도 한 집안인 라면들'],
  ].map(([h, ic, t, d]) => `<a class="mania-tile" href="${h}"><span class="mania-ico">${icon(ic)}</span><b>${t}</b><span>${d}</span></a>`).join('')}</div>
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

// ---------- 나라 타일 지도: 대략의 위치에 나라 칸을 놓아요 ----------
const TILE = {
  gb: [6, 1], pl: [7, 1], ru: [9, 1], ua: [8, 2], us: [2, 2], mx: [2, 3], pe: [3, 5], br: [4, 5], ng: [6, 4],
  pk: [9, 3], np: [10, 3], in: [10, 4], bd: [11, 4], cn: [12, 2], kr: [13, 2], jp: [14, 2], hk: [12, 3], tw: [13, 3],
  th: [11, 5], vn: [12, 5], ph: [14, 4], my: [11, 6], sg: [12, 6], id: [13, 6], au: [14, 7],
  ca: [2, 1], sa: [8, 3], lk: [10, 5], mm: [12, 4],
};
function tileMap() {
  const miss = LIST.filter((c) => !TILE[c.code]).map((c) => c.code);
  if (miss.length) { console.error(`[세계 라면 지도] 타일 위치가 없는 나라: ${miss.join(', ')}`); process.exit(1); }
  const n = (code) => RAMEN.filter((r) => r.co === code).length;
  const lv = (k) => (k >= 10 ? 4 : k >= 5 ? 3 : k >= 2 ? 2 : 1);
  return `<figure class="tmap-wrap"><div class="tmap" role="list" aria-label="나라별 도감 수록 수">${LIST.map((c) => {
    const k = n(c.code), [x, y] = TILE[c.code];
    return `<a role="listitem" class="tile tile-${c.code === 'kr' ? 'kr' : lv(k)}" style="grid-column:${x};grid-row:${y}" href="${countryHref(c)}"><b>${esc(c.name)}</b><span>${k}</span></a>`;
  }).join('')}</div><figcaption class="small muted">칸 위치는 실제 지도를 단순하게 옮긴 거예요. 숫자는 도감에 실은 그 나라 라면 수이고, 많을수록 색이 진해요.</figcaption></figure>`;
}

const ymd = (d) => { const [y, m, dd] = d.split('-'); return `${y}년${m ? ` ${+m}월` : ''}${dd ? ` ${+dd}일` : ''}`; };
const cn = (co) => (co ? (COUNTRIES[co] ? COUNTRIES[co].name : (MORE.best.others || {})[co] || co) : '세계');
const srcList = (arr) => `<section class="story-src" aria-labelledby="h-src"><h2 id="h-src">참고한 자료</h2><ol>${arr.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ol>
<p class="small muted">나라별 라면 이야기의 자료는 나라 페이지마다 따로 밝혀 두었어요. 고칠 곳이 보이면 <button type="button" class="link-btn" data-report="">알려 주세요</button>.</p></section>`;
const head = (kick, h1, lead) => `<header class="story-head"><p class="kicker">${WAVE}${kick}</p><h1>${h1}</h1><p class="story-lead">${lead}</p></header>`;

export function worldTimelinePage() {
  const path = '/world/timeline/';
  const items = [['/', SITE_NAME], ['/world/', '세계 라면 지도'], [path, '세계 라면 연표']];
  const used = [...new Set(MORE.timeline.map((t) => t[1]).filter(Boolean))];
  const decades = [...new Set(MORE.timeline.map((t) => `${t[0].slice(0, 3)}0`))];
  const body = `<div class="wrap">
${crumbs(items)}
${head('세계 라면 지도 · 연표', '세계 라면 연표', `1958년 일본 오사카의 작은 오두막에서 시작된 인스턴트 라면이 어떻게 세계로 퍼졌는지 ${MORE.timeline.length}개 장면으로 정리했어요. 나라를 골라 그 나라 이야기만 볼 수도 있어요.`)}
<div class="fchips tl-filter" role="group" aria-label="나라 고르기"><button type="button" class="fchip" data-tl="" aria-pressed="true">모든 나라</button>${used.map((co) => `<button type="button" class="fchip" data-tl="${co}" aria-pressed="false">${esc(cn(co))}</button>`).join('')}</div>
<nav class="wjump" aria-label="연대 바로 가기">${decades.map((d) => `<a class="pill" href="#d${d}">${d}년대</a>`).join('')}</nav>
<ol class="wtl">${decades.map((d) => `<li class="wtl-dec" id="d${d}"><h2>${d}년대</h2><ol>${MORE.timeline.filter((t) => t[0].startsWith(d.slice(0, 3))).map(([date, co, text, r]) => {
    const href = !r ? '' : r.startsWith('/') ? r : `/ramen/${r}/`;
    return `<li class="wtl-item" data-co="${co}"><span class="wtl-date">${ymd(date)}</span><span class="wtl-co">${esc(cn(co))}</span><p>${esc(text)}${href ? ` <a href="${href}">${r.startsWith('/') ? '더 보기' : esc(BY[r].n)}${icon('i-chev')}</a>` : ''}</p></li>`;
  }).join('')}</ol></li>`).join('')}</ol>
<p class="note">한국 라면의 더 자세한 연표는 <a href="/story/timeline/">한국 라면 연표</a>에 있어요. 날짜는 회사 발표와 기사로 확인한 만큼만 적었어요(연도만 확인된 것은 연도만).</p>
${srcList(WORLD.sources)}
</div>
<script>(function(){var b=document.querySelectorAll('[data-tl]');b.forEach(function(x){x.addEventListener('click',function(){var v=x.dataset.tl;b.forEach(function(y){y.setAttribute('aria-pressed',String(y===x));});document.querySelectorAll('.wtl-item').forEach(function(i){i.hidden=!!v&&i.dataset.co!==v;});document.querySelectorAll('.wtl-dec').forEach(function(d){d.hidden=!d.querySelector('.wtl-item:not([hidden])');});});});})();</script>`;
  return layout({ title: `세계 라면 연표 - 1958년 치킨라멘부터 | ${SITE_NAME}`, description: `치킨라멘(1958), 컵누들(1971), 인도미 미고렝(1982), 캉스푸(1992)까지 세계 라면 역사 ${MORE.timeline.length}개 장면.`, path, body, jsonld: [crumbLd(items)] });
}

export function worldBrandsPage() {
  const path = '/world/brands/';
  const items = [['/', SITE_NAME], ['/world/', '세계 라면 지도'], [path, '라면 가계도']];
  const fam = MORE.families.map((f) => {
    const list = RAMEN.filter((r) => f.makers.includes(r.m) || f.extra.includes(r.s));
    const byCo = {};
    list.forEach((r) => { (byCo[r.co] = byCo[r.co] || []).push(r); });
    const cos = Object.keys(byCo).sort((a, b) => byCo[b].length - byCo[a].length);
    return `<section class="fam" id="f-${f.makers[0]}">
<h2>${esc(f.name)}${f.home ? `<small>${esc(cn(f.home))}</small>` : ''}<span class="fam-n">${cos.length}개 나라 · ${list.length}가지</span></h2>
<p>${esc(f.note)}</p>
<div class="fam-cos">${cos.map((co) => `<div class="fam-co"><b>${esc(cn(co))}</b><span>${byCo[co].map((r) => `<a href="/ramen/${r.s}/">${esc(r.n)}</a>`).join('')}</span></div>`).join('')}</div>
</section>`;
  }).join('');
  const body = `<div class="wrap">
${crumbs(items)}
${head('세계 라면 지도 · 가계도', '라면 가계도', '나라도 이름도 다르지만 알고 보면 한 회사가 만드는 라면이 많아요. 홍콩 공자이몐과 브라질 미오조는 닛신 집안이고, 영국 팟누들과 파키스탄 크노르 누들은 유니레버 집안이에요. 도감에 실은 라면을 회사별로 묶었어요.')}
<nav class="wjump" aria-label="회사 바로 가기">${MORE.families.map((f) => `<a class="pill" href="#f-${f.makers[0]}">${esc(f.name)}</a>`).join('')}</nav>
<div class="fams">${fam}</div>
<p class="note">회사 관계는 회사 발표와 기사로 확인한 것만 적었어요. 도감에 실은 라면만 보여 주므로 회사가 만드는 라면 전부는 아니에요.</p>
${srcList(WORLD.sources)}
</div>`;
  return layout({ title: `라면 가계도 - 나라는 달라도 한 집안인 라면 | ${SITE_NAME}`, description: '닛신, 도요수산, 네슬레, 유니레버, 인도푸드, 퉁이 그룹, 아지노모토, 팔도가 나라마다 만드는 라면을 한눈에.', path, body, jsonld: [crumbLd(items)] });
}

export function worldBestPage() {
  const path = '/world/best/';
  const items = [['/', SITE_NAME], ['/world/', '세계 라면 지도'], [path, '세계가 뽑은 라면 TOP 10']];
  const B = MORE.best;
  const lists = B.lists.map((l, li) => `<section class="sec best" aria-labelledby="h-best-${li}">
${secHead(esc(l.h), `<span class="small muted">${esc(l.date)}</span>`, `h-best-${li}`)}
<ol class="best-list">${l.rows.map(([n, co, name, r]) => `<li class="best-row${n === '1' ? ' best-1' : ''}"><span class="best-n">${n}</span><span class="best-name">${r ? `<a href="/ramen/${r}/">${esc(name)}</a>` : esc(name)}<small>${esc(cn(co))}</small></span>${r ? `<a class="best-go" href="/ramen/${r}/" aria-label="${esc(name)} 도감 보기">${icon('i-chev')}</a>` : '<span class="best-go small muted">도감 준비 중</span>'}</li>`).join('')}</ol>
</section>`).join('');
  const inDogam = [...new Set(B.lists.flatMap((l) => l.rows.map((x) => x[3]).filter(Boolean)))].map((x) => BY[x]);
  const body = `<div class="wrap">
${crumbs(items)}
${head('세계 라면 지도 · 평론가의 선택', '세계가 뽑은 라면 TOP 10', esc(B.about))}
<nav class="best-nav" aria-label="목록 바로가기">${B.lists.map((l, li) => `<a class="pill" href="#h-best-${li}">${esc(l.h)}</a>`).join('')}</nav>
${lists}
<section class="sec" aria-labelledby="h-best-notes">
${secHead('해마다 바뀌는 순위', '', 'h-best-notes')}
<ul class="heat-cards best-notes">${B.notes.map((t) => `<li class="heat-card"><p>${esc(t)}</p></li>`).join('')}</ul>
</section>
<section class="sec" aria-labelledby="h-best-dogam">
${secHead('도감에서 만나기', moreLink('/ramen/?co=xx', '해외 라면 모두 보기'), 'h-best-dogam')}
${ramenGrid(inDogam, { from: '' })}
<p class="note">순위는 한 사람의 취향으로 고른 목록이에요. 면면 랭킹은 먹어 본 회원들의 기록으로 따로 계산해요. 국내 판매 여부와 값은 수입 사정에 따라 달라요.</p>
</section>
${srcList(B.sources)}
</div>`;
  return layout({ title: `세계가 뽑은 라면 TOP 10 - 더 라멘 레이터 역대 최고 라면 | ${SITE_NAME}`, description: '라면 후기 5,000편을 쓴 평론가 한스 리네시가 고른 역대 최고 라면 TOP 10. 프리마테이스트 락사, 잇푸도 가라카멘, 아샤 유성 비빔면까지.', path, body, jsonld: [crumbLd(items)] });
}
