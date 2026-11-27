// 면면 사이트 빌드 스크립트
// content/ 폴더의 원고(JSON)를 읽어 public/ 폴더에 정적 페이지를 만들어요.
// 실행: npm run build  (Cloudflare Pages 빌드 명령도 같아요)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, STATIC, BUILD, cfg, SITE, abs, SITE_NAME, RAMEN, BY, MAKERS, cho, ramenSearchText, releaseKey, today, readJSON, esc, PHOTOS, PHOTO_PROBLEMS, PAGEHASH, yearText } from './lib.mjs';
import { homePage, dogamPage, ramenPage, recordPage, rankPage, rankRulesPage, newPage, shopPage } from './pages-main.mjs';
import { storyHubPage, storyPage, timelinePage, wordsPage, STORIES } from './pages-story.mjs';
import { recipeListPage, recipeWritePage, recipeViewPage } from './pages-recipes.mjs';
import { listPages, LIST_URLS, TYPE_PAGES, MAKER_PAGES } from './pages-lists.mjs';
import { guideHubPage, guidePage, GUIDES, GUIDE_URLS, COOK } from './pages-guide.mjs';
import { worldHubPage, worldCountryPage, WORLD_PAGES, worldTimelinePage, worldBrandsPage, worldBestPage } from './pages-world.mjs';
import { labHubPage, labPages, clubPages, levelsPage, clubRulesPage, mePage, aboutPage, termsPage, privacyPage, contactPage, adminPage, notFoundPage, offlinePage } from './pages-more.mjs';
import * as CD from '../server/catalog-data.js';
import { LEVELS, RULES, BADGES, levelOf, glyph, emblemSVG, badgeSVG } from '../server/growth-data.js';
import { POST_CATS, USER_CATS, REGIONS } from '../server/util.js';

const NEWS = readJSON('content/news.json').news;
const SHOP = readJSON('content/shop.json');

function write(rel, data) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}
const page = (dir, html) => write(dir ? `${dir}/index.html` : 'index.html', html);
function copyDir(src, dst, skip = []) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (skip.includes(f)) continue;
    const s = path.join(src, f), d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// ---------- 페이지 ----------
page('', homePage());
page('ramen', dogamPage());
for (const r of RAMEN) page(`ramen/${r.s}`, ramenPage(r));
for (const [dir, html] of listPages()) page(dir, html);
page('guide', guideHubPage());
for (const g of GUIDES) page(`guide/${g.s}`, guidePage(g));
page('story', storyHubPage());
for (const s of STORIES) page(`story/${s.s}`, storyPage(s));
page('story/timeline', timelinePage());
page('story/words', wordsPage());
page('world', worldHubPage());
page('world/timeline', worldTimelinePage());
page('world/brands', worldBrandsPage());
page('world/best', worldBestPage());
for (const c of WORLD_PAGES) page(`world/${c.code}`, worldCountryPage(c));
page('record', recordPage());
page('rank', rankPage());
page('rank/rules', rankRulesPage());
page('new', newPage());
page('shop', shopPage());
page('lab', labHubPage());
for (const [dir, html] of labPages()) page(dir, html);
for (const [dir, html] of clubPages()) page(dir, html);
page('recipes', recipeListPage());
page('recipes/write', recipeWritePage());
page('recipes/view', recipeViewPage());
page('club/levels', levelsPage());
page('club/rules', clubRulesPage());
page('me', mePage());
page('about', aboutPage());
page('terms', termsPage());
page('privacy', privacyPage());
page('contact', contactPage());
page('admin', adminPage());
page('offline', offlinePage());
write('404.html', notFoundPage());

// ---------- 정적 파일 ----------
copyDir(path.join(STATIC, 'css'), path.join(OUT, 'assets/css'));
copyDir(path.join(STATIC, 'js'), path.join(OUT, 'assets/js'));
// 실물 사진(img/ramen)은 허락 기록이 있는 것만 골라 옮겨요. AI 조리 예시(img/ramen-ai)는 그대로.
copyDir(path.join(STATIC, 'img'), path.join(OUT, 'assets/img'), ['ramen']);
for (const r of RAMEN) {
  if (!r.pic || r.pic.kind !== 'photo') continue;
  for (const kind of r.pic.detail ? ['thumb', 'square', 'wide'] : ['thumb']) {
    const to = path.join(OUT, 'assets/img/ramen', kind, `${r.pic.f}.webp`);
    if (fs.existsSync(to)) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(STATIC, 'img/ramen', kind, `${r.pic.f}.webp`), to);
  }
}
if (PHOTO_PROBLEMS.length) console.warn('[사진 점검] ' + PHOTO_PROBLEMS.join('\n[사진 점검] '));
for (const f of ['_headers', 'sw.js']) if (fs.existsSync(path.join(STATIC, f))) fs.copyFileSync(path.join(STATIC, f), path.join(OUT, f));

// 화면에서 쓰는 자료: 서버(server/*-data.js)와 같은 것을 그대로 옮겨 적어요
const fn = (f) => f.toString();
const meta = `/* 빌드가 만든 파일이에요. 고치려면 server/growth-data.js, server/catalog-data.js를 고치세요. */
(function () {
  var LEVELS = ${JSON.stringify(LEVELS)};
  var RULES = ${JSON.stringify(RULES)};
  var BADGES = ${JSON.stringify(BADGES)};
  var levelOf = ${fn(levelOf)};
  var glyph = ${fn(glyph)};
  var emblemSVG = ${fn(emblemSVG)};
  var badgeSVG = ${fn(badgeSVG)};
  window.MMG = {
    LEVELS: LEVELS, RULES: RULES, BADGES: BADGES,
    level: function (xp) { return levelOf(xp || 0, LEVELS); },
    glyph: glyph,
    emblem: function (info, size) { return emblemSVG(info, size, glyph); },
    badge: function (b, size, locked) { return badgeSVG(b, size, locked, glyph); }
  };
  window.MMD = ${JSON.stringify({
    STYLES: CD.STYLES, FORMS: CD.FORMS, STATUS: CD.STATUS, HOTS: CD.HOTS, GROUPS: CD.GROUPS, AXES: CD.AXES, AGAIN: CD.AGAIN, COOKS: CD.COOKS, WATERS: CD.WATERS, PLACES: CD.PLACES, ADDS: CD.ADDS, TAGS: CD.TAGS, RANK_RULE: CD.RANK_RULE,
    MAKERS, POST_CATS, USER_CATS, REGIONS, SITE: SITE_NAME,
  })};
})();
`;
write('assets/js/meta.js', meta);

// 라면 목록 (화면과 서버가 함께 읽어요)
const compact = RAMEN.map((r) => ({
  s: r.s, n: r.n, m: r.m, mn: r.maker, co: r.co, cn: r.co === 'kr' ? '' : r.coName, ta: r.ta, nd: r.noodle || 'oil', f: r.f || null, c: r.c, hot: r.hot ?? null, st: r.st, ch: r.ch || '', y: r.y || '', yk: releaseKey(r),
  shu: r.shu || null, t: r.t, img: r.img, g: r.groups, q: (ramenSearchText(r) + ' ' + cho(ramenSearchText(r))).toLowerCase(),
  pi: r.pic ? [r.pic.kind === 'ai' ? 1 : 2, r.pic.f === r.s ? '' : r.pic.f, r.pic.small ? 1 : 0, r.pic.sq ? 1 : 0, r.pic.detail ? 1 : 0] : null,
}));
write('data/ramen.json', JSON.stringify({ built: today, ramen: compact }));

// 운영 관리 › 라면 사진: 출처별 허락 현황 (사진 파일 주소는 넣지 않아요)
{
  const used = {}, onCount = { photo: 0, ai: 0 };
  for (const [s, p] of Object.entries(PHOTOS.photos)) {
    if (!BY[s]) continue;
    for (const part of ['pack', 'dish']) for (const [id] of p[part]) (used[id] = used[id] || new Set()).add(s);
  }
  for (const r of RAMEN) if (r.pic) onCount[r.pic.kind] += 1;
  const sources = Object.entries(PHOTOS.sources).map(([id, x]) => ({
    id, name: x.name, greet: x.greet || '', kind: x.kind, home: x.home, ask: x.ask || '', license: x.license || '', allowed: x.allowed || '',
    ramen: [...(used[id] || [])].map((s) => [s, BY[s].n]),
  }));
  write('data/photo-status.json', JSON.stringify({
    built: today, total: Object.keys(PHOTOS.photos).length, on: onCount, illus: RAMEN.filter((r) => !r.pic).length,
    problems: PHOTO_PROBLEMS, sources, repo: cfg.githubRepo || '', branch: cfg.githubBranch || 'main',
  }));
}

// 구매 버튼(/go/)이 읽는 상품 목록: 라면 주소 -> 이름, 쿠팡 검색어, 고정 링크
const items = {};
for (const r of RAMEN) items[r.s] = { n: r.n, q: r.q || `${r.maker} ${r.n}`, u: r.u || '' };
for (const [id, it] of Object.entries(SHOP.items || {})) items[id] = { n: it.n || id, q: it.q || it.n || id, u: it.u || it.url || '' };
write('data/shop.json', JSON.stringify({ items, shelves: SHOP.shelves.map((s) => ({ id: s.id, title: s.title, auto: s.auto || '', items: s.items || [] })) }));

// 앱처럼 설치
write('manifest.webmanifest', JSON.stringify({
  name: `${SITE_NAME} | ${cfg.tagline}`, short_name: SITE_NAME, start_url: '/', display: 'standalone', background_color: '#FAF7F3', theme_color: '#FAF7F3', lang: 'ko',
  icons: [
    { src: '/assets/img/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/assets/img/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts: [{ name: '한 그릇 기록', url: '/record/' }, { name: '조리 타이머', url: '/lab/timer/' }],
}));

// 검색 엔진
const urls = [
  ['/', '1.0'], ['/ramen/', '0.9'], ...LIST_URLS().map((u) => [u, '0.8']), ['/rank/', '0.9'], ['/rank/rules/', '0.5'], ['/new/', '0.7'], ['/shop/', '0.6'],
  ['/world/', '0.8'], ['/world/best/', '0.7'], ['/world/timeline/', '0.7'], ['/world/brands/', '0.6'], ...WORLD_PAGES.map((c) => [`/world/${c.code}/`, '0.7']),
  ...GUIDE_URLS().map((u) => [u, '0.8']),
  ['/story/', '0.8'], ['/story/timeline/', '0.7'], ['/story/words/', '0.7'], ...STORIES.map((s) => [`/story/${s.s}/`, '0.7']),
  ['/lab/', '0.6'], ['/lab/map/', '0.6'], ['/lab/compare/', '0.6'], ['/lab/worldcup/', '0.6'], ['/lab/timer/', '0.6'], ['/lab/water/', '0.5'], ['/lab/heat/', '0.6'], ['/lab/pick/', '0.5'], ['/lab/quiz/', '0.5'], ['/lab/match/', '0.6'], ['/lab/quest/', '0.6'], ['/lab/chosung/', '0.5'],
  ['/club/', '0.6'], ['/club/board/', '0.6'], ['/recipes/', '0.7'], ['/club/feed/', '0.5'], ['/club/events/', '0.5'], ['/club/people/', '0.4'], ['/club/levels/', '0.4'], ['/club/rules/', '0.3'],
  ['/about/', '0.4'], ['/contact/', '0.3'], ['/terms/', '0.2'], ['/privacy/', '0.2'],
  ...RAMEN.map((r) => [`/ramen/${r.s}/`, '0.8']),
];
// 페이지 본문이 바뀐 날만 lastmod로 적어요. 바뀐 날은 scripts/lastmod.json에 남겨요
// (내 컴퓨터에서 빌드할 때만 이 파일을 고쳐 써요. Cloudflare 빌드에서는 읽기만 해요)
const LASTMOD_FILE = path.join(ROOT, 'scripts/lastmod.json');
const lastmod = fs.existsSync(LASTMOD_FILE) ? JSON.parse(fs.readFileSync(LASTMOD_FILE, 'utf8')) : {};
const modOf = {};
for (const [u] of urls) {
  const h = PAGEHASH[u] || '';
  const was = lastmod[u];
  modOf[u] = was && was[0] === h ? was[1] : today;
  lastmod[u] = [h, modOf[u]];
}
if (process.env.CF_PAGES !== '1') fs.writeFileSync(LASTMOD_FILE, JSON.stringify(Object.fromEntries(Object.entries(lastmod).filter(([u]) => modOf[u]).sort()), null, 0).replace(/\],"/g, '],\n"') + '\n');
// 페이지에 넣어 둔 고친 날짜 자리(%%MOD%%, %%MODKO%%)를 실제 날짜로 바꿔요 (본문 비교값에는 영향 없음)
const koDate = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); return m ? `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일` : d; };
for (const [u] of urls) {
  const f = path.join(OUT, u === '/' ? 'index.html' : `${u.slice(1)}index.html`);
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');
  if (html.includes('%%MOD')) fs.writeFileSync(f, html.replaceAll('%%MODKO%%', koDate(modOf[u])).replaceAll('%%MOD%%', modOf[u]));
}
write('data/pagehash.json', JSON.stringify({ built: today, pages: Object.fromEntries(urls.map(([u]) => [u, PAGEHASH[u] || ''])) }));
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, p]) => `<url><loc>${abs(u)}</loc><lastmod>${modOf[u]}</lastmod><priority>${p}</priority></url>`).join('\n')}
</urlset>
`);
// IndexNow 열쇠 파일 (빙·네이버·얀덱스 등에 바뀐 주소를 바로 알릴 때 써요)
if (cfg.indexNowKey) write(`${cfg.indexNowKey}.txt`, cfg.indexNowKey);
// 네이버 서치어드바이저 소유확인 파일 (HTML 파일 업로드 방식)
if (/^naver[0-9a-f]+\.html$/.test(cfg.naverVerificationFile || '')) write(cfg.naverVerificationFile, `naver-site-verification: ${cfg.naverVerificationFile}`);
write('robots.txt', `User-agent: *
Allow: /
Allow: /api/img/
Disallow: /admin/
Disallow: /api/
Disallow: /go/
Disallow: /me/
Disallow: /record/

Sitemap: ${abs('/sitemap.xml')}
${cfg.daumWebmasterPin ? `\n${cfg.daumWebmasterPin.startsWith('#') ? cfg.daumWebmasterPin : `#DaumWebMasterTool:${cfg.daumWebmasterPin}`}\n` : ''}`);
const xesc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rssDate = (d) => new Date(`${(d.length === 7 ? d + '-01' : d)}T09:00:00+09:00`).toUTCString();
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${xesc(SITE_NAME)} | 라면 도감과 신상 라면 소식</title>
<link>${abs('/')}</link>
<atom:link href="${abs('/rss.xml')}" rel="self" type="application/rss+xml"/>
<description>${xesc(`${SITE_NAME} 라면 도감과 신상 라면 소식`)}</description>
<language>ko</language>
${NEWS.map((n) => `<item><title>${xesc(n.title)}</title><link>${abs(n.ramen[0] && BY[n.ramen[0]] ? `/ramen/${n.ramen[0]}/` : '/new/')}</link><guid isPermaLink="false">news-${xesc(n.date)}-${xesc(n.title.slice(0, 20))}</guid><pubDate>${rssDate(n.date)}</pubDate><description>${xesc(n.body)}</description></item>`).join('\n')}
${GUIDES.map((g) => `<item><title>${xesc(g.h1 || g.title)}</title><link>${abs(`/guide/${g.s}/`)}</link><guid>${abs(`/guide/${g.s}/`)}</guid><pubDate>${rssDate(modOf[`/guide/${g.s}/`] || today)}</pubDate><description>${xesc(g.answer)}</description></item>`).join('\n')}
${STORIES.map((x) => `<item><title>${xesc(x.title)}</title><link>${abs(`/story/${x.s}/`)}</link><guid>${abs(`/story/${x.s}/`)}</guid><pubDate>${rssDate(modOf[`/story/${x.s}/`] || today)}</pubDate><description>${xesc(x.short)}</description></item>`).join('\n')}
${RAMEN.map((r) => `<item><title>${xesc(`${r.n} - ${r.maker}`)}</title><link>${abs(`/ramen/${r.s}/`)}</link><guid>${abs(`/ramen/${r.s}/`)}</guid><pubDate>${rssDate(modOf[`/ramen/${r.s}/`] || today)}</pubDate><description>${xesc(r.d)}</description></item>`).join('\n')}
</channel></rss>
`);

// AI 검색(GEO)용 사이트 요약: llms.txt(요약·길잡이)와 llms-full.txt(라면 도감 전체와 상식 글 본문)
const md = (t) => String(t || '').replace(/\[\[[a-z]+:[^|\]]+\|([^\]]+)\]\]/g, '$1');
const ramenLine = (r) => {
  const bits = [r.maker, r.co !== 'kr' ? r.coName : '한국', r.f ? CD.FORMS[r.f] : '', `${CD.STYLES[r.c]}`, r.y ? `${yearText(r.y)} 출시` : '', r.hot != null ? `맵기 ${CD.HOTS[r.hot]}` : '', r.shu ? `스코빌 ${r.shu.v.toLocaleString('ko-KR')} SHU` : '', CD.STATUS[r.st] + (r.ch ? `(${r.ch})` : '')].filter(Boolean);
  return `- [${r.n}](${abs(`/ramen/${r.s}/`)}): ${bits.join(', ')}. ${r.d}${COOK[r.s] ? ` 조리법: ${COOK[r.s].how}` : ''}`;
};
write('llms.txt', `# ${SITE_NAME}

> ${SITE_NAME}(${abs('/')})은 한국과 세계 라면 ${RAMEN.length}가지를 모은 라면 도감이자 라면 정보 사이트예요. 라면마다 회사, 형태, 조리 방식, 출시 연도, 맵기, 판매 상태를 정리하고, 라면 끓이는 법·물 양·소비기한·나트륨 같은 질문에는 자료를 밝힌 '라면 상식' 글로 답해요. 별점과 순위는 먹어 본 회원의 기록으로만 계산해요.

이 사이트의 정보 원칙:
- 라면 정보는 제조사 발표, 포장·판매처 표기, 언론 보도로 확인한 것만 실어요. 확인하지 못한 칸은 비워 둬요.
- 맵기 분류(순한 편, 매콤, 아주 매운 편)는 편집부가 이름과 제조사 설명을 보고 나눈 것이고, 스코빌 지수는 회사 발표나 언론에 실린 숫자만 출처와 함께 적어요.
- 별점과 맛 지도는 회원 기록으로만 계산하고, 순위는 팔지 않아요.
- 라면 그림은 AI로 새로 만든 조리 예시나 예시 그림이에요. 실제 제품 사진이 아니에요.
- 구매 링크는 쿠팡 파트너스 링크예요.
- 인용할 때는 페이지 주소를 함께 밝혀 주세요. 라면 도감 전체와 상식 글 본문은 [llms-full.txt](${abs('/llms-full.txt')})에 있어요.

## 라면 상식 (질문과 짧은 답)

${GUIDES.map((g) => `- [${g.h1 || g.title}](${abs(`/guide/${g.s}/`)}): ${g.answer}`).join('\n')}

## 라면 모아 보기

- [라면 도감 전체](${abs('/ramen/')}): ${RAMEN.length}가지, 나라·맵기·맛·조리 방식으로 찾기
${Object.entries(TYPE_PAGES).map(([g, t]) => `- [${t.kw}](${abs(`/ramen/type/${g}/`)})`).join('\n')}
- [매운 라면 종류](${abs('/ramen/spicy/')}), [매운 라면 순위(스코빌 지수 맵기 사다리)](${abs('/lab/heat/')})
- [편의점 라면(단독 판매)](${abs('/ramen/cvs/')})
${MAKER_PAGES.map((m) => `- [${MAKERS[m]} 라면 종류](${abs(`/ramen/maker/${m}/`)})`).join('\n')}

## 랭킹과 도구

- [라면 순위](${abs('/rank/')}): 회원 기록으로 매긴 종합·종류별·급상승 순위, [계산 기준](${abs('/rank/rules/')})
- [나에게 맞는 라면 찾기](${abs('/lab/match/')}), [라면 물 양 계산기](${abs('/lab/water/')}), [라면 타이머](${abs('/lab/timer/')}), [라면 비교](${abs('/lab/compare/')})

## 세계 라면과 라면 이야기

- [세계 라면 지도](${abs('/world/')}): ${WORLD_PAGES.length}개 나라 페이지, [세계가 뽑은 라면 TOP 10](${abs('/world/best/')}), [세계 라면 연표](${abs('/world/timeline/')})
${STORIES.map((x) => `- [${x.title}](${abs(`/story/${x.s}/`)}): ${x.short}`).join('\n')}
- [한국 라면 연표](${abs('/story/timeline/')}), [라면 용어 사전](${abs('/story/words/')})

## 선택

- [사이트맵](${abs('/sitemap.xml')}), [RSS](${abs('/rss.xml')})
`);
write('llms-full.txt', `# ${SITE_NAME} 전체 자료

> ${abs('/')} 의 라면 상식 글 본문과 라면 도감 ${RAMEN.length}가지를 한 파일에 모았어요. ${today} 빌드 기준이에요. 각 항목의 주소가 원문이에요.

${GUIDES.map((g) => `## ${g.h1 || g.title}

주소: ${abs(`/guide/${g.s}/`)}

짧은 답: ${g.answer}

${g.steps ? g.steps.map((x, k) => `${k + 1}. ${x.t}: ${md(x.d)}`).join('\n') + '\n\n' : ''}${g.table ? `${g.table.caption}\n\n| ${g.table.head.join(' | ')} |\n|${g.table.head.map(() => '---').join('|')}|\n${g.table.rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n\n` : ''}${(g.sections || []).map((x) => `### ${x.h}\n\n${x.p.map(md).join('\n\n')}`).join('\n\n')}

${g.faq ? `### 자주 묻는 질문\n\n${g.faq.map(([q, a]) => `- ${q} ${a}`).join('\n')}\n\n` : ''}참고한 자료: ${g.sources.map((x) => `${x.t} (${x.u})`).join('; ')}
`).join('\n')}
## 라면 도감 (${RAMEN.length}가지)

형식: 이름(주소): 회사, 나라, 형태, 조리 방식, 출시, 맵기(편집부 분류), 스코빌(회사 공개값), 판매 상태. 설명.

${RAMEN.map(ramenLine).join('\n')}
`);

// 사이트맵에 들어간 페이지 수와 빌드 정보
write('build.txt', `${SITE_NAME} build ${BUILD} ${new Date().toISOString()}\n라면 ${RAMEN.length}가지, 페이지 ${urls.length}개\n`);
console.log(`[면면] 빌드 끝: 라면 ${RAMEN.length}가지, 사이트맵 ${urls.length}쪽 → public/`);
void SITE; void esc; void ROOT;
