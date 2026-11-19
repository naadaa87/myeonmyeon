// 면면 사이트 빌드 스크립트
// content/ 폴더의 원고(JSON)를 읽어 public/ 폴더에 정적 페이지를 만들어요.
// 실행: npm run build  (Cloudflare Pages 빌드 명령도 같아요)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, STATIC, BUILD, cfg, SITE, abs, SITE_NAME, RAMEN, BY, MAKERS, cho, ramenSearchText, releaseKey, today, readJSON, esc } from './lib.mjs';
import { homePage, dogamPage, ramenPage, recordPage, rankPage, rankRulesPage, newPage, shopPage } from './pages-main.mjs';
import { storyHubPage, storyPage, timelinePage, wordsPage, STORIES } from './pages-story.mjs';
import { recipeListPage, recipeWritePage, recipeViewPage } from './pages-recipes.mjs';
import { worldHubPage, worldCountryPage, WORLD_PAGES } from './pages-world.mjs';
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
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
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
page('story', storyHubPage());
for (const s of STORIES) page(`story/${s.s}`, storyPage(s));
page('story/timeline', timelinePage());
page('story/words', wordsPage());
page('world', worldHubPage());
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
copyDir(path.join(STATIC, 'img'), path.join(OUT, 'assets/img'));
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
  s: r.s, n: r.n, m: r.m, mn: r.maker, co: r.co, cn: r.co === 'kr' ? '' : r.coName, f: r.f || null, c: r.c, hot: r.hot ?? null, st: r.st, ch: r.ch || '', y: r.y || '', yk: releaseKey(r),
  shu: r.shu || null, t: r.t, img: r.img, g: r.groups, q: (ramenSearchText(r) + ' ' + cho(ramenSearchText(r))).toLowerCase(),
}));
write('data/ramen.json', JSON.stringify({ built: today, ramen: compact }));

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
  ['/', '1.0'], ['/ramen/', '0.9'], ['/rank/', '0.9'], ['/rank/rules/', '0.5'], ['/new/', '0.7'], ['/shop/', '0.6'],
  ['/world/', '0.8'], ...WORLD_PAGES.map((c) => [`/world/${c.code}/`, '0.7']),
  ['/story/', '0.8'], ['/story/timeline/', '0.7'], ['/story/words/', '0.7'], ...STORIES.map((s) => [`/story/${s.s}/`, '0.7']),
  ['/lab/', '0.6'], ['/lab/map/', '0.6'], ['/lab/compare/', '0.6'], ['/lab/worldcup/', '0.6'], ['/lab/timer/', '0.6'], ['/lab/water/', '0.5'], ['/lab/heat/', '0.6'], ['/lab/pick/', '0.5'], ['/lab/quiz/', '0.5'],
  ['/club/', '0.6'], ['/club/board/', '0.6'], ['/recipes/', '0.7'], ['/club/feed/', '0.5'], ['/club/events/', '0.5'], ['/club/people/', '0.4'], ['/club/levels/', '0.4'], ['/club/rules/', '0.3'],
  ['/about/', '0.4'], ['/contact/', '0.3'], ['/terms/', '0.2'], ['/privacy/', '0.2'],
  ...RAMEN.map((r) => [`/ramen/${r.s}/`, '0.8']),
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, p]) => `<url><loc>${abs(u)}</loc><lastmod>${today}</lastmod><priority>${p}</priority></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *
Allow: /
Allow: /api/img/
Disallow: /admin/
Disallow: /api/
Disallow: /go/
Disallow: /me/
Disallow: /record/

Sitemap: ${abs('/sitemap.xml')}
`);
const xesc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rssDate = (d) => new Date(`${(d.length === 7 ? d + '-01' : d)}T09:00:00+09:00`).toUTCString();
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${xesc(SITE_NAME)} | ${xesc(cfg.tagline)}</title>
<link>${abs('/')}</link>
<description>${xesc(`${SITE_NAME} 라면 도감과 신상 라면 소식`)}</description>
<language>ko</language>
${NEWS.map((n) => `<item><title>${xesc(n.title)}</title><link>${abs(n.ramen[0] && BY[n.ramen[0]] ? `/ramen/${n.ramen[0]}/` : '/new/')}</link><guid isPermaLink="false">news-${xesc(n.date)}-${xesc(n.title.slice(0, 20))}</guid><pubDate>${rssDate(n.date)}</pubDate><description>${xesc(n.body)}</description></item>`).join('\n')}
${RAMEN.map((r) => `<item><title>${xesc(`${r.n} - ${r.maker}`)}</title><link>${abs(`/ramen/${r.s}/`)}</link><guid>${abs(`/ramen/${r.s}/`)}</guid><description>${xesc(r.d)}</description></item>`).join('\n')}
</channel></rss>
`);

// 사이트맵에 들어간 페이지 수와 빌드 정보
write('build.txt', `${SITE_NAME} build ${BUILD} ${new Date().toISOString()}\n라면 ${RAMEN.length}가지, 페이지 ${urls.length}개\n`);
console.log(`[면면] 빌드 끝: 라면 ${RAMEN.length}가지, 사이트맵 ${urls.length}쪽 → public/`);
void SITE; void esc; void ROOT;
