// 페이지: 라면 상식(가이드) — 검색창에 그대로 묻는 질문에 짧은 답부터 주는 글
// 원고는 content/guide.json. 라면 페이지의 '끓이는 법' 칸(cook)도 여기서 읽어요.
import {
  esc, abs, SITE_NAME, BY, layout, icon, WAVE, img, crumbs, crumbLd, secHead, moreLink, ramenGrid, readJSON,
} from './lib.mjs';

const RAW = readJSON('content/guide.json');
export const GUIDES = RAW.guides;
export const COOK = RAW.cook || {};
export const GUIDE_UPDATED = RAW.updated || '';
const GBY = Object.fromEntries(GUIDES.map((g) => [g.s, g]));

// 원고 점검: 링크와 라면 주소가 살아 있는지, 출처가 있는지
const problems = [];
for (const g of GUIDES) {
  const text = [g.answer, ...(g.sections || []).flatMap((x) => x.p), ...(g.steps || []).map((x) => x.d)].join(' ');
  for (const m of text.matchAll(/\[\[(ramen|guide|page):([^|\]]+)\|/g)) {
    if (m[1] === 'ramen' && !BY[m[2]]) problems.push(`${g.s}: 라면 주소 ${m[2]}가 도감에 없어요.`);
    if (m[1] === 'guide' && !GBY[m[2]]) problems.push(`${g.s}: 글 주소 ${m[2]}가 없어요.`);
    if (m[1] === 'page' && !/^\/[a-z0-9\-/]*\/$/.test(m[2])) problems.push(`${g.s}: 페이지 주소 ${m[2]} 모양이 이상해요.`);
  }
  for (const r of g.ramen || []) if (!BY[r]) problems.push(`${g.s}: ramen 목록의 ${r}가 도감에 없어요.`);
  if (!g.sources || !g.sources.length) problems.push(`${g.s}: 참고 자료(sources)를 적어 주세요.`);
  if (!g.answer) problems.push(`${g.s}: 짧은 답(answer)을 적어 주세요.`);
}
for (const s of Object.keys(COOK)) if (!BY[s]) problems.push(`cook: ${s}가 도감에 없어요.`);
if (problems.length) {
  console.error('\n[라면 상식 원고 점검]\n' + problems.map((p) => ' - ' + p).join('\n') + '\n');
  process.exit(1);
}

const dateText = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '');
  return m ? `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일` : '';
};
const plain = (p) => String(p || '').replace(/\[\[[a-z]+:[^|\]]+\|([^\]]+)\]\]/g, '$1');
export function richGuide(p) {
  return esc(p).replace(/\[\[(ramen|guide|page):([^|\]]+)\|([^\]]+)\]\]/g, (_, kind, slug, label) => {
    const href = kind === 'ramen' ? `/ramen/${slug}/` : kind === 'guide' ? `/guide/${slug}/` : slug;
    return `<a class="${kind === 'ramen' ? 'ilink-ramen' : 'ilink-story'}" href="${href}">${label}</a>`;
  });
}

function guideCard(g, eager = false) {
  return `<article class="scard">
<a class="scard-link" href="/guide/${g.s}/">
<div class="scard-img">${img(g.img, '', '', eager)}</div>
<div class="scard-body">
<p class="scard-cat">${esc(g.cat)}</p>
<h3>${esc(g.title)}</h3>
<p class="scard-short">${esc(g.answer)}</p>
<p class="scard-meta">${icon('i-book')}자주 묻는 질문 ${(g.faq || []).length}개</p>
</div>
</a>
</article>`;
}

// 다른 페이지(홈, 라면 이야기, 라면 페이지)에서 쓰는 짧은 링크 줄
export function guideLinks(exclude = '') {
  return `<nav class="pill-links" aria-label="라면 상식">${GUIDES.filter((g) => g.s !== exclude).map((g) => `<a class="pill" href="/guide/${g.s}/">${esc(g.title)}</a>`).join('')}</nav>`;
}
export const guideCards = (n = 3) => GUIDES.slice(0, n).map((g) => guideCard(g)).join('');

export function guideHubPage() {
  const path = '/guide/';
  const items = [['/', SITE_NAME], [path, '라면 상식']];
  const qa = GUIDES.flatMap((g) => (g.faq || []).slice(0, 2).map(([q, a]) => ({ q, a, g })));
  const body = `<div class="wrap">
${crumbs(items)}
<section class="page-head">
<div><p class="kicker">${WAVE}면면 라면 상식</p><h1>라면 상식: 끓이는 법부터 소비기한, 나트륨까지</h1>
<p>라면을 끓이고 고르고 보관하면서 자주 궁금해지는 것들을 질문 하나에 글 하나로 정리했어요. 글마다 맨 위에 짧은 답을 먼저 적고, 제조사 조리법과 정부·소비자원 자료로 확인한 내용만 실었어요.</p></div>
</section>
<section class="sec" aria-labelledby="h-guides">
${secHead('라면 상식 글', '', 'h-guides')}
<div class="sgrid">${GUIDES.map((g, i) => guideCard(g, i < 2)).join('')}</div>
</section>
<section class="sec" aria-labelledby="h-qa">
${secHead('자주 묻는 질문', '', 'h-qa')}
<div class="faq faq-hub">${qa.map(({ q, a, g }) => `<div class="faq-item"><h3>${esc(q)}</h3><p>${esc(a)} <a href="/guide/${g.s}/">${esc(g.title)}${icon('i-chev')}</a></p></div>`).join('')}</div>
</section>
<section class="sec" aria-labelledby="h-more">
${secHead('함께 보면 좋은 곳', '', 'h-more')}
<nav class="pill-links"><a class="pill" href="/lab/water/">라면 물 양 계산기</a><a class="pill" href="/lab/timer/">라면 타이머</a><a class="pill" href="/lab/heat/">매운 라면 순위(스코빌)</a><a class="pill" href="/story/kinds/">라면의 종류</a><a class="pill" href="/story/how-made/">라면은 어떻게 만들어질까</a><a class="pill" href="/story/words/">라면 용어 사전</a></nav>
<p class="note">${icon('i-flag')}조리법과 숫자는 제조사 포장·판매처 상품 정보, 정부와 한국소비자원 자료로 확인했고 글마다 자료를 밝혀 두었어요. 제품이 바뀌어 조리법이 달라졌다면 <button type="button" class="link-btn" data-report="">알려 주세요</button>.</p>
</section>
</div>`;
  const jsonld = [crumbLd(items), {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: `라면 상식 | ${SITE_NAME}`, url: abs(path), inLanguage: 'ko', dateModified: GUIDE_UPDATED,
    hasPart: GUIDES.map((g) => ({ '@type': 'Article', headline: g.h1 || g.title, url: abs(`/guide/${g.s}/`) })),
  }];
  return layout({ title: `라면 상식 - 끓이는 법, 물 양, 소비기한, 나트륨 Q&A | ${SITE_NAME}`, description: '라면 맛있게 끓이는 법, 제품별 물 양과 시간, 짜파구리 비율, 소비기한, 나트륨과 칼로리, 컵라면 전자레인지까지. 자주 묻는 질문에 짧은 답부터 정리했어요.', path, body, jsonld });
}

export function guidePage(g) {
  const path = `/guide/${g.s}/`;
  const items = [['/', SITE_NAME], ['/guide/', '라면 상식'], [path, g.title]];
  const ramen = (g.ramen || []).map((r) => BY[r]).filter(Boolean);
  const table = g.table ? `<div class="table-wrap"><table class="stable"><caption>${esc(g.table.caption)}</caption><thead><tr>${g.table.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${g.table.rows.map((r) => `<tr>${r.map((c, j) => (j === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  const toc = [
    g.steps ? ['steps', '순서대로 따라 하기'] : null,
    ...(g.sections || []).map((x, k) => [`s${k + 1}`, x.h]),
    g.faq ? ['faq', '자주 묻는 질문'] : null,
  ].filter(Boolean);
  const others = GUIDES.filter((x) => x.s !== g.s);
  const body = `<div class="wrap">
${crumbs(items)}
<article class="story guide">
<header class="story-head">
<p class="kicker">${WAVE}라면 상식 · ${esc(g.cat)}</p>
<h1>${esc(g.h1 || g.title)}</h1>
<div class="answer-box"><p class="answer-label">짧게 답하면</p><p class="answer-text">${esc(g.answer)}</p></div>
<p class="story-meta"><span>${esc(dateText(GUIDE_UPDATED))} 확인</span><span>참고 자료 ${g.sources.length}개</span>${g.faq ? `<span>자주 묻는 질문 ${g.faq.length}개</span>` : ''}</p>
</header>
${g.facts ? `<dl class="story-facts">${g.facts.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>` : ''}
${table}
<div class="story-grid">
<nav class="story-toc" aria-label="이 글의 차례"><p>차례</p><ol>${toc.map(([id, h]) => `<li><a href="#${id}">${esc(h)}</a></li>`).join('')}</ol></nav>
<div class="story-body">
${g.steps ? `<section aria-labelledby="steps"><h2 id="steps">순서대로 따라 하기</h2><ol class="gsteps">${g.steps.map((s, k) => `<li><span class="gstep-n">${k + 1}</span><div><h3>${esc(s.t)}</h3><p>${richGuide(s.d)}</p></div></li>`).join('')}</ol></section>` : ''}
${(g.sections || []).map((x, k) => `<section aria-labelledby="s${k + 1}"><h2 id="s${k + 1}">${esc(x.h)}</h2>${x.p.map((p) => `<p>${richGuide(p)}</p>`).join('')}</section>`).join('\n')}
${g.faq ? `<section class="faq" aria-labelledby="faq"><h2 id="faq">자주 묻는 질문</h2>${g.faq.map(([q, a]) => `<div class="faq-item"><h3>${esc(q)}</h3><p>${esc(a)}</p></div>`).join('')}</section>` : ''}
<section class="story-src" aria-labelledby="h-src">
<h2 id="h-src">참고한 자료</h2>
<ol>${g.sources.map((x) => `<li><a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)}</a></li>`).join('')}</ol>
<p class="small muted">조리법과 영양성분은 제품이 바뀌면 달라질 수 있어요. 손에 든 포장의 표기가 다르면 포장을 따라 주세요. 고칠 곳이 보이면 <button type="button" class="link-btn" data-report="">알려 주세요</button>.</p>
</section>
</div>
</div>
</article>
${ramen.length ? `<section class="sec" aria-labelledby="h-gr">${secHead('이 글에 나온 라면', moreLink('/ramen/', '라면 도감'), 'h-gr')}${ramenGrid(ramen, { from: '' })}</section>` : ''}
<section class="sec" aria-labelledby="h-og">
${secHead('다른 라면 상식', moreLink('/guide/', '모두 보기'), 'h-og')}
<div class="sgrid">${others.slice(0, 3).map((x) => guideCard(x)).join('')}</div>
</section>
</div>`;
  const text = [g.answer, ...(g.steps || []).map((s) => s.d), ...(g.sections || []).flatMap((x) => x.p)].map(plain).join(' ');
  const jsonld = [crumbLd(items), {
    '@context': 'https://schema.org', '@type': 'Article', headline: g.h1 || g.title, description: g.short, abstract: g.answer, articleSection: g.cat, inLanguage: 'ko',
    dateModified: GUIDE_UPDATED, image: abs(`/assets/img/${g.img}.webp`), mainEntityOfPage: abs(path), wordCount: text.length,
    author: { '@type': 'Organization', name: SITE_NAME, url: abs('/') }, publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: abs('/assets/img/icon-512.png') } },
    citation: g.sources.map((x) => x.u),
    about: ramen.slice(0, 6).map((r) => ({ '@type': 'Thing', name: r.n, url: abs(`/ramen/${r.s}/`) })),
  }];
  if (g.faq && g.faq.length) {
    jsonld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: g.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  }
  if (g.steps && g.steps.length) {
    jsonld.push({ '@context': 'https://schema.org', '@type': 'HowTo', name: g.h1 || g.title, description: g.answer, step: g.steps.map((s, k) => ({ '@type': 'HowToStep', position: k + 1, name: s.t, text: plain(s.d) })) });
  }
  return layout({ title: `${(g.h1 && g.h1.length <= 38) ? g.h1 : g.title} | ${SITE_NAME}`, description: g.short, path, body, jsonld, ogType: 'article', ogImage: `/assets/img/${g.img}.webp` });
}

export const GUIDE_URLS = () => ['/guide/', ...GUIDES.map((g) => `/guide/${g.s}/`)];
export const guideByS = (s) => GBY[s];
