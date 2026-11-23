// 면면 사이트 빌드 스크립트
// content/ 폴더의 원고(JSON)를 읽어 public/ 폴더에 정적 페이지를 만들어요.
// 실행: npm run build  (Cloudflare Pages 빌드 명령도 같아요)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, STATIC, BUILD, cfg, SITE, abs, SITE_NAME, RAMEN, BY, MAKERS, cho, ramenSearchText, releaseKey, today, readJSON, esc, PHOTOS, PHOTO_PROBLEMS, PAGEHASH } from './lib.mjs';
import { homePage, dogamPage, ramenPage, recordPage, rankPage, rankRulesPage, newPage, shopPage } from './pages-main.mjs';
import { storyHubPage, storyPage, timelinePage, wordsPage, STORIES } from './pages-story.mjs';
import { recipeListPage, recipeWritePage, recipeViewPage } from './pages-recipes.mjs';
import { listPages, LIST_URLS, TYPE_PAGES } from './pages-lists.mjs';
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
write('data/pagehash.json', JSON.stringify({ built: today, pages: Object.fromEntries(urls.map(([u]) => [u, PAGEHASH[u] || ''])) }));
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, p]) => `<url><loc>${abs(u)}</loc><lastmod>${modOf[u]}</lastmod><priority>${p}</priority></url>`).join('\n')}
</urlset>
`);
// IndexNow 열쇠 파일 (빙·네이버·얀덱스 등에 바뀐 주소를 바로 알릴 때 써요)
if (cfg.indexNowKey) write(`${cfg.indexNowKey}.txt`, cfg.indexNowKey);
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
${RAMEN.map((r) => `<item><title>${xesc(`${r.n} - ${r.maker}`)}</title><link>${abs(`/ramen/${r.s}/`)}</link><guid>${abs(`/ramen/${r.s}/`)}</guid><pubDate>${rssDate(modOf[`/ramen/${r.s}/`] || today)}</pubDate><description>${xesc(r.d)}</description></item>`).join('\n')}
</channel></rss>
`);

// AI 검색용 사이트 요약
write('llms.txt', `# ${SITE_NAME}

> ${SITE_NAME}(${abs('/')})은 한국과 세계 라면 ${RAMEN.length}가지를 모은 라면 도감이에요. 먹어 본 사람들의 한 그릇 기록으로 맛 지도와 라면 랭킹을 만들고, 라면의 역사와 나라별 라면 문화를 자료와 함께 정리해요.

- 라면 정보(회사, 형태, 조리 방식, 출시, 판매 상태)는 제조사 발표와 기사로 확인한 것만 실어요. 확인하지 못한 칸은 비워 둬요.
- 맵기 분류는 편집부가 나눈 것이고, 스코빌 지수는 회사가 밝힌 숫자만 적어요.
- 별점과 맛 지도는 회원 기록으로만 계산하고, 순위는 팔지 않아요.
- 라면 그림은 AI로 새로 만든 조리 예시나 예시 그림이에요. 실제 제품 사진이 아니에요.
- 구매 링크는 쿠팡 파트너스 링크예요.

## 주요 페이지

- [라면 도감](${abs('/ramen/')}): 라면 ${RAMEN.length}가지, 나라·맵기·맛·조리 방식으로 찾기
- [라면 랭킹](${abs('/rank/')}): 회원 기록으로 매긴 순위와 [계산 기준](${abs('/rank/rules/')})
- [매운 라면](${abs('/ramen/spicy/')}), [맵기 사다리(스코빌 지수 순위)](${abs('/lab/heat/')})
- [편의점 라면](${abs('/ramen/cvs/')})
${Object.entries(TYPE_PAGES).map(([g, t]) => `- [${t.h} 종류](${abs(`/ramen/type/${g}/`)})`).join('\n')}
- [세계 라면 지도](${abs('/world/')}), [세계가 뽑은 라면 TOP 10](${abs('/world/best/')})
- [라면 이야기](${abs('/story/')}): 라면의 기원, 한국 라면 역사, 만드는 법
- [라면 용어 사전](${abs('/story/words/')})
- [사이트맵](${abs('/sitemap.xml')})
`);

// 사이트맵에 들어간 페이지 수와 빌드 정보
write('build.txt', `${SITE_NAME} build ${BUILD} ${new Date().toISOString()}\n라면 ${RAMEN.length}가지, 페이지 ${urls.length}개\n`);
console.log(`[면면] 빌드 끝: 라면 ${RAMEN.length}가지, 사이트맵 ${urls.length}쪽 → public/`);
void SITE; void esc; void ROOT;
