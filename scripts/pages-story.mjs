// 페이지: 라면 이야기 (기원, 한국 라면사, 만드는 법, 종류, 세계, 연표)
import {
  esc, abs, SITE_NAME, BY, layout, icon, WAVE, img, pageBanner, crumbs, crumbLd, secHead, moreLink, ramenGrid, readJSON,
} from './lib.mjs';

const RAW = readJSON('content/story.json');
export const STORIES = RAW.stories;
export const TIMELINE = RAW.timeline;
const UPDATED = RAW.updated || '';
const SBY = Object.fromEntries(STORIES.map((s) => [s.s, s]));

const problems = [];
for (const s of STORIES) {
  const text = s.sections.flatMap((x) => x.p).join(' ');
  for (const m of text.matchAll(/\[\[(ramen|story):([a-z0-9-]+)\|/g)) {
    if (m[1] === 'ramen' && !BY[m[2]]) problems.push(`${s.s}: 라면 주소 ${m[2]}가 도감에 없어요.`);
    if (m[1] === 'story' && !SBY[m[2]]) problems.push(`${s.s}: 글 주소 ${m[2]}가 없어요.`);
  }
  for (const r of s.ramen || []) if (!BY[r]) problems.push(`${s.s}: ramen 목록의 ${r}가 도감에 없어요.`);
  if (!s.sources || !s.sources.length) problems.push(`${s.s}: 참고 자료(sources)를 적어 주세요.`);
}
for (const t of TIMELINE) for (const r of t.ramen || []) if (!BY[r]) problems.push(`연표 ${t.y}: ${r}가 도감에 없어요.`);
if (problems.length) {
  console.error('\n[라면 이야기 원고 점검]\n' + problems.map((p) => ' - ' + p).join('\n') + '\n');
  process.exit(1);
}

const dateText = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '');
  return m ? `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일` : '';
};
const readMin = (s) => Math.max(2, Math.ceil(s.sections.flatMap((x) => x.p).join('').length / 450));

// 문단 안의 [[ramen:주소|글자]], [[story:주소|글자]]를 링크로
function rich(p) {
  return esc(p).replace(/\[\[(ramen|story):([a-z0-9-]+)\|([^\]]+)\]\]/g, (_, kind, slug, label) => {
    const href = kind === 'ramen' ? `/ramen/${slug}/` : `/story/${slug}/`;
    return `<a class="${kind === 'ramen' ? 'ilink-ramen' : 'ilink-story'}" href="${href}">${label}</a>`;
  });
}

function storyCard(s, eager = false) {
  return `<article class="scard">
<a class="scard-link" href="/story/${s.s}/">
<div class="scard-img">${img(s.img, '', '', eager)}</div>
<div class="scard-body">
<p class="scard-cat">${esc(s.cat)}</p>
<h3>${esc(s.title)}</h3>
<p class="scard-short">${esc(s.short)}</p>
<p class="scard-meta">${icon('i-book')}읽는 데 ${readMin(s)}분</p>
</div>
</a>
</article>`;
}

function timelineList(items, compact = false) {
  return `<ol class="tl${compact ? ' tl-compact' : ''}">${items.map((t) => `<li class="tl-item">
<p class="tl-year">${esc(t.y)}${t.m ? `<span>${esc(t.m)}</span>` : ''}</p>
<div class="tl-body">
<h3>${esc(t.t)}</h3>
${compact ? '' : `<p>${esc(t.d)}</p>`}
${compact ? '' : `<p class="tl-links">${(t.ramen || []).map((r) => `<a class="pill pill-sm" href="/ramen/${r}/">${esc(BY[r].n)}</a>`).join('')}${t.story ? `<a class="tl-story" href="/story/${t.story}/">${esc(SBY[t.story].title)}${icon('i-chev')}</a>` : ''}</p>`}
</div>
</li>`).join('')}</ol>`;
}

export function storyHubPage() {
  const key = ['1958', '1963', '1985', '1989', '2012', '2025'];
  const picks = key.map((y) => TIMELINE.find((t) => t.y === y)).filter(Boolean);
  const body = `${pageBanner('banner-story', '라면 이야기', '라면이 어디서 왔고 어떻게 지금의 한 그릇이 됐는지, 자료를 하나씩 확인해 가며 정리했어요.', '라면 사진 카드를 꽂아 둔 나무 서랍', '면면 읽을거리')}
<div class="wrap">
<section class="sec" aria-labelledby="h-stories">
${secHead('읽을거리', '', 'h-stories')}
<div class="sgrid">${STORIES.map((s, i) => storyCard(s, i < 2)).join('')}
<article class="scard scard-tl"><a class="scard-link" href="/story/timeline/"><div class="scard-img">${img('broth-spicy', '')}</div><div class="scard-body"><p class="scard-cat">연표</p><h3>한국 라면 연표</h3><p class="scard-short">1958년 치킨라멘부터 2026년 신라면 40주년까지, 흐름을 바꾼 ${TIMELINE.length}개 장면을 한 줄로 이었어요.</p><p class="scard-meta">${icon('i-cal')}1958~2026</p></div></a></article>
</div>
</section>
<section class="sec" aria-labelledby="h-tl">
${secHead('한국 라면 연표', moreLink('/story/timeline/', `${TIMELINE.length}개 장면 모두 보기`), 'h-tl')}
${timelineList(picks, true)}
</section>
<p class="note">${icon('i-flag')}글에 적은 연도와 숫자는 제조사 발표, 정부 자료, 언론 보도로 확인한 것만 실었고, 글마다 참고한 자료를 밝혀 두었어요. 틀린 곳을 찾으면 <button type="button" class="link-btn" data-report="">알려 주세요</button>.</p>
</div>`;
  const jsonld = [crumbLd([['/', SITE_NAME], ['/story/', '라면 이야기']]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `라면 이야기 | ${SITE_NAME}`, url: abs('/story/'), hasPart: STORIES.map((s) => ({ '@type': 'Article', headline: s.title, url: abs(`/story/${s.s}/`) })) }];
  return layout({ title: `라면 이야기 - 라면의 기원, 역사, 만드는 법 | ${SITE_NAME}`, description: '인스턴트 라면의 기원과 한국 라면 60년 역사, 라면 만드는 법과 종류, 세계 라면 소비까지. 자료를 확인해 정리한 라면 읽을거리.', path: '/story/', body, jsonld });
}

export function storyPage(s) {
  const i = STORIES.indexOf(s);
  const prev = STORIES[i - 1], next = STORIES[i + 1];
  const path = `/story/${s.s}/`;
  const items = [['/', SITE_NAME], ['/story/', '라면 이야기'], [path, s.title]];
  const toc = s.sections.map((x, k) => `<li><a href="#s${k + 1}">${esc(x.h)}</a></li>`).join('');
  const table = s.table ? `<div class="table-wrap"><table class="stable"><caption>${esc(s.table.caption)}</caption><thead><tr>${s.table.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${s.table.rows.map((r) => `<tr>${r.map((c, j) => (j === 1 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  const ramen = (s.ramen || []).map((r) => BY[r]).filter(Boolean);
  const body = `<div class="wrap">
${crumbs(items)}
<article class="story">
<header class="story-head">
<p class="kicker">${WAVE}라면 이야기 · ${esc(s.cat)}</p>
<h1>${esc(s.title)}</h1>
<p class="story-lead">${esc(s.lead)}</p>
<p class="story-meta"><span>읽는 데 ${readMin(s)}분</span><span>${esc(dateText(UPDATED))} 고침</span><span>참고 자료 ${s.sources.length}개</span></p>
</header>
${s.facts ? `<dl class="story-facts">${s.facts.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>` : ''}
<div class="story-grid">
<nav class="story-toc" aria-label="이 글의 차례"><p>차례</p><ol>${toc}</ol></nav>
<div class="story-body">
${s.sections.map((x, k) => `<section aria-labelledby="s${k + 1}"><h2 id="s${k + 1}">${esc(x.h)}</h2>${x.p.map((p) => `<p>${rich(p)}</p>`).join('')}${k === 0 ? table : ''}</section>`).join('\n')}
<section class="story-src" aria-labelledby="h-src">
<h2 id="h-src">참고한 자료</h2>
<ol>${s.sources.map((x) => `<li><a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)}</a></li>`).join('')}</ol>
<p class="small muted">자료마다 숫자가 조금씩 다를 때는 정부 자료와 회사 발표를 먼저 따랐어요. 고칠 곳이 보이면 <button type="button" class="link-btn" data-report="">알려 주세요</button>.</p>
</section>
</div>
</div>
</article>
${ramen.length ? `<section class="sec" aria-labelledby="h-sr">${secHead('이 글에 나온 라면', moreLink('/ramen/', '라면 도감'), 'h-sr')}${ramenGrid(ramen, { from: '' })}</section>` : ''}
<nav class="story-next" aria-label="다른 글">
${prev ? `<a class="snext prev" href="/story/${prev.s}/"><span>${icon('i-chev-l')}이전 글</span><b>${esc(prev.title)}</b></a>` : '<span></span>'}
${next ? `<a class="snext next" href="/story/${next.s}/"><span>다음 글${icon('i-chev')}</span><b>${esc(next.title)}</b></a>` : `<a class="snext next" href="/story/timeline/"><span>다음 글${icon('i-chev')}</span><b>한국 라면 연표</b></a>`}
</nav>
</div>`;
  const text = s.sections.flatMap((x) => x.p).join(' ').replace(/\[\[[a-z]+:[a-z0-9-]+\|([^\]]+)\]\]/g, '$1');
  const jsonld = [crumbLd(items), {
    '@context': 'https://schema.org', '@type': 'Article', headline: s.title, description: s.short, articleSection: s.cat,
    dateModified: UPDATED, image: abs(`/assets/img/${s.img}.webp`), mainEntityOfPage: abs(path), wordCount: text.length,
    author: { '@type': 'Organization', name: SITE_NAME, url: abs('/') }, publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: abs('/assets/img/icon-512.png') } },
    citation: s.sources.map((x) => x.u),
  }];
  return layout({ title: `${s.title} - 라면 이야기 | ${SITE_NAME}`, description: s.short, path, body, jsonld, ogType: 'article', ogImage: `/assets/img/${s.img}.webp` });
}

export function timelinePage() {
  const path = '/story/timeline/';
  const items = [['/', SITE_NAME], ['/story/', '라면 이야기'], [path, '한국 라면 연표']];
  const body = `<div class="wrap wrap-narrow">
${crumbs(items)}
<header class="story-head">
<p class="kicker">${WAVE}라면 이야기 · 연표</p>
<h1>한국 라면 연표</h1>
<p class="story-lead">1958년 일본의 치킨라멘부터 2026년 신라면 40주년까지, 한국 라면의 흐름을 바꾼 ${TIMELINE.length}개 장면이에요. 장면마다 자세한 글과 도감 페이지로 이어져요.</p>
</header>
${timelineList(TIMELINE)}
<p class="note">${icon('i-flag')}연도와 숫자는 각 글에 밝힌 자료로 확인했어요. 빠진 장면이나 틀린 곳이 있으면 <button type="button" class="link-btn" data-report="">알려 주세요</button>.</p>
</div>`;
  const jsonld = [crumbLd(items)];
  return layout({ title: `한국 라면 연표 1958~2026 | ${SITE_NAME}`, description: '삼양라면, 농심의 1위, 우지 파동, 하얀 국물, 불닭볶음면, 짜파구리, 수출 15억 달러까지. 한국 라면 60년을 연도별로 정리했어요.', path, body, jsonld });
}

export const storyHomeCards = (n = 3) => STORIES.slice(0, n).map((s) => storyCard(s)).join('');
