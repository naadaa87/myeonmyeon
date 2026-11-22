// 빌드 공통: 설정, 원고 읽기, 글자 다루기, 아이콘, 머리·바닥·틀
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLES, FORMS, STATUS, HOTS, GROUPS, inGroup, bowlImage, tasteIds } from '../server/catalog-data.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, 'public');
export const STATIC = path.join(ROOT, 'src', 'static');
export const BUILD = Date.now().toString(36);

export const readJSON = (rel) => {
  const file = path.join(ROOT, rel);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`\n[원고 오류] ${rel} 파일을 읽지 못했어요. 쉼표나 따옴표가 빠졌는지 확인해 주세요.\n${e.message}\n`);
    process.exit(1);
  }
};

export const cfg = readJSON('site.config.json');
export const SITE = cfg.siteUrl.replace(/\/$/, '');
export const abs = (p) => SITE + p;
export const SITE_NAME = cfg.siteName || '면면';
export const OPERATOR = cfg.operator || `${SITE_NAME} 운영팀`;

// ---------- 글자 ----------
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
export const cho = (s) => [...String(s)].map((ch) => {
  const c = ch.charCodeAt(0) - 0xac00;
  return c >= 0 && c <= 11171 ? CHO[Math.floor(c / 588)] : ch;
}).join('');
// 받침이 있으면 a, 없으면 b
export const josa = (word, a, b) => {
  const last = String(word).replace(/[^가-힣0-9A-Za-z]/g, '').slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code >= 0 && code <= 11171) return word + (code % 28 ? a : b);
  return word + (/[013678]$/.test(last) ? a : b);
};
export const collator = new Intl.Collator('ko');
export const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
export const yearText = (y) => {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(String(y || ''));
  return m ? (m[2] ? `${m[1]}년 ${Number(m[2])}월` : `${m[1]}년`) : '';
};

// ---------- 라면 원고 ----------
const RAW = readJSON('content/ramen.json');
export const MAKERS = RAW.makers;
export const WORLD = readJSON('content/world.json');
export const COUNTRIES = Object.fromEntries(WORLD.countries.map((c) => [c.code, c]));
export const countryName = (co) => (COUNTRIES[co] ? COUNTRIES[co].name : co);
export const DOGAM_CHECKED = (() => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(RAW.checked || ''); return m ? `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일` : ''; })();
export const problems = [];
// ---------- 라면 사진 ----------
// 1) 실물 사진: content/photos.json에서 출처의 allowed(허락 기록)가 적힌 것만 써요. 파일은 src/static/img/ramen/
// 2) AI 조리 예시: 텍스트로 새로 만든 그림. 파일은 src/static/img/ramen-ai/ (작은 그림 s/ 는 있으면 씀)
// 3) 둘 다 없으면 조리 방식 예시 그림
export const PHOTOS = readJSON('content/photos.json');
const PHOTO_ROOT = path.join(STATIC, 'img', 'ramen');
const AI_ROOT = path.join(STATIC, 'img', 'ramen-ai');
const has = (dir, kind, f) => fs.existsSync(path.join(dir, kind, `${f}.webp`));
const allowedAll = (list) => Array.isArray(list) && list.length > 0 && list.every(([id]) => PHOTOS.sources[id] && String(PHOTOS.sources[id].allowed || '').trim());
export const PHOTO_PROBLEMS = [];
const AI_ALIAS = (fs.existsSync(path.join(ROOT, 'content/ai-images.json')) ? readJSON('content/ai-images.json').alias : null) || {};
function picOf(s) {
  const p = PHOTOS.photos[s];
  if (p) {
    const f = p.file || s;
    const packOk = allowedAll(p.pack), dishOk = packOk && allowedAll(p.dish);
    if (packOk && has(PHOTO_ROOT, 'thumb', f)) {
      const detail = dishOk && has(PHOTO_ROOT, 'square', f) && has(PHOTO_ROOT, 'wide', f);
      const used = detail ? [...p.pack, ...p.dish] : p.pack;
      const credits = [];
      for (const [id, page] of used) if (!credits.some((c) => c.id === id)) credits.push({ id, name: PHOTOS.sources[id].name, url: page || PHOTOS.sources[id].home, license: PHOTOS.sources[id].license || '' });
      return { kind: 'photo', base: '/assets/img/ramen', f, small: false, sq: false, detail, alt: p.altPack || '', altBig: detail ? p.altDish || p.altPack || '' : p.altPack || '', credits };
    }
    if (has(PHOTO_ROOT, 'thumb', f) && !packOk) PHOTO_PROBLEMS.push(`${s}: 허락 기록이 없는 실물 사진 파일이 올라와 있어요. 화면과 배포 파일에는 넣지 않았어요.`);
  }
  const ai = has(AI_ROOT, 'thumb', s) ? s : AI_ALIAS[s] && has(AI_ROOT, 'thumb', AI_ALIAS[s]) ? AI_ALIAS[s] : '';
  if (ai) {
    return { kind: 'ai', base: '/assets/img/ramen-ai', f: ai, small: has(AI_ROOT, 's', ai), sq: has(AI_ROOT, 'q', ai), detail: has(AI_ROOT, 'square', ai) && has(AI_ROOT, 'wide', ai), alt: '', altBig: '', credits: [] };
  }
  return null;
}

const slugs = new Set();
export const RAMEN = RAW.ramen.map((r, i) => {
  const where = `content/ramen.json ${i + 1}번째 라면(${r.n || r.s || '이름 없음'})`;
  const need = (ok, msg) => { if (!ok) problems.push(`${where}: ${msg}`); };
  need(/^[a-z0-9-]{2,60}$/.test(r.s || ''), '주소(s)는 영문 소문자, 숫자, 하이픈으로 적어 주세요.');
  need(!slugs.has(r.s), `주소(s) ${r.s}가 겹쳐요.`);
  slugs.add(r.s);
  need(r.n && r.n.length >= 2, '이름(n)이 비었어요.');
  need(MAKERS[r.m], `회사(m) ${r.m}가 makers에 없어요.`);
  need(STYLES[r.c], `조리 방식(c) ${r.c}를 알 수 없어요.`);
  need(r.f == null || FORMS[r.f], `형태(f) ${r.f}를 알 수 없어요.`);
  need(STATUS[r.st || 'sale'], `판매 상태(st) ${r.st}를 알 수 없어요.`);
  need(r.hot == null || HOTS[r.hot] !== undefined, `편집부 맵기 분류(hot) ${r.hot}는 0, 1, 2 가운데 하나로 적어 주세요.`);
  need(r.d && r.d.length >= 10, '설명(d)을 한두 문장 적어 주세요.');
  need(!r.co || COUNTRIES[r.co], `나라(co) ${r.co}가 content/world.json에 없어요.`);
  const groups = GROUPS.filter((g) => inGroup(r, g)).map((g) => g.id);
  const co = r.co || 'kr';
  return { ...r, co, coName: countryName(co), st: r.st || 'sale', t: r.t || [], k: r.k || [], maker: MAKERS[r.m] || r.m, img: bowlImage(r), pic: picOf(r.s), groups, ta: tasteIds(r) };
});
if (problems.length) {
  console.error('\n[원고 점검] 고쳐야 할 곳이 있어요:\n' + problems.map((p) => ' - ' + p).join('\n') + '\n');
  process.exit(1);
}
export const BY = Object.fromEntries(RAMEN.map((r) => [r.s, r]));
export const SORTED = [...RAMEN].sort((a, b) => collator.compare(a.n, b.n));
export const releaseKey = (r) => {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(String(r.y || ''));
  return m ? Number(m[1]) * 100 + (m[2] ? Number(m[2]) : 0) : 0;
};
export const NEWEST = [...RAMEN].sort((a, b) => releaseKey(b) - releaseKey(a) || collator.compare(a.n, b.n));
export const formText = (r) => (r.f ? FORMS[r.f] : '');
export const styleText = (r) => STYLES[r.c] || '';
export const ramenSearchText = (r) => [r.n, r.on || '', r.maker, r.co !== 'kr' ? `${r.coName} 해외` : '', ...(r.k || []), ...(r.t || []), styleText(r), formText(r)].join(' ');

// ---------- 아이콘 (선 그림) ----------
const ICONS = {
  'i-clock': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  'i-dice': '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/>',
  'i-help': '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"/><path d="M12 17h.01"/>',
  'i-search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  'i-bell': '<path d="M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15.5 6 9"/><path d="M10.2 20.5a2 2 0 0 0 3.6 0"/>',
  'i-user': '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
  'i-home': '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  'i-book': '<path d="M4 5.5C6.5 4.3 9.5 4.3 12 6c2.5-1.7 5.5-1.7 8-.5v13c-2.5-1.2-5.5-1.2-8 .5-2.5-1.7-5.5-1.7-8-.5z"/><path d="M12 6v13"/>',
  'i-trophy': '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4"/>',
  'i-chat': '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5z"/>',
  'i-plus': '<path d="M12 5v14M5 12h14"/>',
  'i-bookmark': '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>',
  'i-flame': '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.2 3.6-7.6.4 1.5 1.2 2.6 2.4 3.2C11.6 7.4 13 5 15 3.5c-.3 3 1.3 4.5 2.4 6.2.8 1.3 1.1 2.6 1.1 4.1 0 4-2.7 7.2-6.5 7.2z"/>',
  'i-filter': '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
  'i-close': '<path d="M6 6l12 12M18 6 6 18"/>',
  'i-menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
  'i-star': '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>',
  'i-heart': '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  'i-share': '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.2M8.2 13.2l7.6 4.2"/>',
  'i-timer': '<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V10M10 3.5h4M18 7l1.3-1.3"/>',
  'i-flask': '<path d="M9.5 3.5h5M10.5 3.5v5.5L5.5 18a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3l-5-9V3.5"/><path d="M8 15h8"/>',
  'i-map': '<path d="m3.5 6.5 5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  'i-cart': '<path d="M3 4h2.5l2.2 11h10.6L20.5 7H6.3"/><circle cx="9.5" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
  'i-chev': '<path d="m9 5 7 7-7 7"/>',
  'i-chev-l': '<path d="m15 5-7 7 7 7"/>',
  'i-check': '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  'i-pen': '<path d="M5 19l1-4L15.5 5.5a2.1 2.1 0 0 1 3 3L9 18z"/><path d="M13.5 7.5l3 3"/>',
  'i-trash': '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  'i-flag': '<path d="M6 21V4M6 4.5c3-1.5 5 1.5 8 0s4-.5 4-.5v8s-1-1-4 .5-5-1.5-8 0"/>',
  'i-cal': '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  'i-people': '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.5-3.4 2.9-5.5 6-5.5s5.5 2.1 6 5.5"/><circle cx="16.5" cy="9" r="2.6"/><path d="M16 14c2.6.1 4.4 1.9 5 5"/>',
  'i-bowl': '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M8 20.5h8"/><path d="M8.5 8.5c0-1.5 1-1.5 1-3M12 8.5c0-1.5 1-1.5 1-3M15.5 8.5c0-1.5 1-1.5 1-3"/>',
  'i-up': '<path d="m6 14 6-6 6 6"/>',
  'i-down': '<path d="m6 10 6 6 6-6"/>',
  'i-new': '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  'i-drop': '<path d="M12 3.5s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  'i-ext': '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  'i-grid': '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  'i-list': '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  'i-vote': '<path d="M4 13h16v7H4z"/><path d="M8 13V6.5A1.5 1.5 0 0 1 9.5 5h5A1.5 1.5 0 0 1 16 6.5V13"/><path d="m9.8 9 1.6 1.6L14.4 7.6"/>',
  'i-noodle': '<path d="M4 6c2.7 0 2.7 3 5.3 3s2.7-3 5.4-3S17.3 9 20 9M4 11.5c2.7 0 2.7 3 5.3 3s2.7-3 5.4-3 2.6 3 5.3 3M4 17c2.7 0 2.7 3 5.3 3s2.7-3 5.4-3 2.6 3 5.3 3"/>',
  'i-pin': '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  'i-store': '<path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12v8h13v-8"/>',
  'i-logout': '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
  'i-gear': '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  'i-play': '<path d="M7 4.5v15l12-7.5z"/>',
  'i-pause': '<path d="M8 5v14M16 5v14"/>',
  'i-reset': '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/>',
  'i-swap': '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  'i-egg': '<path d="M12 3c3.6 0 6.5 5.3 6.5 9.8A6.5 6.5 0 0 1 5.5 12.8C5.5 8.3 8.4 3 12 3z"/>',
};
export const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${Object.entries(ICONS).map(([id, d]) => `<symbol id="${id}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</symbol>`).join('')}</defs></svg>`;
export const icon = (id, cls = '') => `<svg class="ico${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#${id}"/></svg>`;

// 무드보드의 빨간 면발 물결
export const WAVE = '<svg class="wave" viewBox="0 0 64 10" aria-hidden="true"><path d="M2 5c3.75 0 3.75-3 7.5-3s3.75 3 7.5 3 3.75-3 7.5-3 3.75 3 7.5 3 3.75-3 7.5-3 3.75 3 7.5 3 3.75-3 7.5-3 3.75 3 7.5 3"/></svg>';
export const brandMark = (cls = '') => `<span class="brand-mark ${cls}"><span class="brand-t">${esc(SITE_NAME)}</span><i class="brand-dot" aria-hidden="true"></i></span>`;

// ---------- 그림 ----------
const IMG_SIZE = {
  'home-wide': [1920, 800], 'home-mobile': [960, 1200], 'banner-atlas': [1920, 800], 'banner-lab': [1920, 800], 'banner-club': [1920, 800],
  'banner-atlas-m': [780, 630], 'banner-lab-m': [780, 630], 'banner-club-m': [780, 630], 'banner-story': [1920, 800], 'banner-story-m': [780, 630],
};
export const imgSize = (name) => IMG_SIZE[name] || (/^(broth|black|stir|mixed|cup)/.test(name) ? [800, 800] : [1200, 800]);
export const img = (name, alt = '', cls = '', eager = false, sizes = '') => {
  const [w, h] = imgSize(name);
  return `<img class="${cls}" src="/assets/img/${name}.webp" width="${w}" height="${h}" alt="${esc(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}${sizes ? ` sizes="${sizes}"` : ''}>`;
};
// 페이지 머리 띠: 큰 화면은 글자가 들어간 브랜드 띠, 휴대폰은 사진만 잘라 쓰고 글자는 HTML로
export const pageBanner = (name, title, lead, alt, kicker = SITE_NAME) => `<section class="pbanner" aria-labelledby="pb-title">
<picture><source media="(min-width: 760px)" srcset="/assets/img/${name}.webp"><img src="/assets/img/${name}-m.webp" width="780" height="630" alt="${esc(alt)}" fetchpriority="high"></picture>
<div class="pbanner-text"><p class="kicker">${WAVE}${esc(kicker)}</p><h1 id="pb-title">${esc(title)}</h1><p>${esc(lead)}</p></div>
</section>`;

// ---------- 머리, 바닥, 아래 탭 ----------
export const NAV = [
  ['/ramen/', '라면 도감'],
  ['/story/', '라면 이야기'],
  ['/rank/', '랭킹'],
  ['/lab/', '취향실험실'],
  ['/club/', '후루룩클럽'],
  ['/recipes/', '레시피 자랑'],
  ['/new/', '신상 레이더'],
  ['/shop/', '라면몰'],
];
function header(current) {
  return `<header class="site-head">
<div class="wrap head-row">
<a class="brand" href="/" aria-label="${esc(SITE_NAME)} 처음 화면">${brandMark()}</a>
<nav class="nav" id="site-nav" aria-label="주요 메뉴">
${NAV.map(([href, label]) => `<a href="${href}"${current.startsWith(href) ? ' aria-current="page"' : ''}>${label}</a>`).join('\n')}
</nav>
<div class="head-tools">
<button class="icon-btn" type="button" data-search-open aria-label="라면 찾기">${icon('i-search')}</button>
<a class="icon-btn" href="/me/#notes" data-bell aria-label="알림">${icon('i-bell')}<span class="dot" data-unread hidden></span></a>
<a class="icon-btn acct-btn" href="/me/" data-acct aria-label="로그인">${icon('i-user')}<span class="acct-nick" data-acct-nick></span></a>
<button class="icon-btn menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="메뉴 열기">${icon('i-menu')}</button>
</div>
</div>
</header>`;
}
const TABS = [['/', '홈', 'i-home'], ['/ramen/', '라면 도감', 'i-book'], ['/record/', '기록', 'i-plus'], ['/rank/', '랭킹', 'i-trophy'], ['/club/', '후루룩클럽', 'i-chat']];
function tabbar(current) {
  const on = (h) => (h === '/' ? current === '/' : current.startsWith(h));
  return `<nav class="tabbar" aria-label="아래 메뉴">${TABS.map(([h, l, ic]) => h === '/record/'
    ? `<a class="tab-rec" href="${h}"${on(h) ? ' aria-current="page"' : ''} aria-label="한 그릇 기록"><span class="tab-plus">${icon(ic)}</span></a>`
    : `<a href="${h}"${on(h) ? ' aria-current="page"' : ''}>${icon(ic)}<span>${l}</span></a>`).join('')}</nav>`;
}
function footer() {
  return `<footer class="site-foot">
<div class="wrap foot-grid">
<div class="foot-brand">
<a class="brand" href="/">${brandMark()}</a>
<p class="foot-tag">${esc(cfg.tagline)}</p>
<p class="foot-lead">먹어 본 사람의 기록으로 만드는 라면 도감이에요. 순위는 팔지 않아요.</p>
</div>
<nav class="foot-nav" aria-label="바닥 메뉴">
<div><b>둘러보기</b><a href="/ramen/">라면 도감</a><a href="/world/">세계 라면 지도</a><a href="/story/">라면 이야기</a><a href="/rank/">랭킹</a><a href="/new/">신상 레이더</a><a href="/shop/">라면몰</a></div>
<div><b>함께하기</b><a href="/record/">한 그릇 기록</a><a href="/lab/">취향실험실</a><a href="/club/">후루룩클럽</a><a href="/recipes/">레시피 자랑</a><a href="/me/">내 도감</a></div>
<div><b>${esc(SITE_NAME)}</b><a href="/about/">${esc(SITE_NAME)} 소개</a><a href="/rank/rules/">평가 기준</a><a href="/contact/">문의하기</a><button type="button" class="link-btn" data-report="">틀린 정보 알려 주기</button></div>
</nav>
<nav class="foot-legal" aria-label="약관과 정책">
<a href="/terms/">이용약관</a>
<a href="/privacy/"><b>개인정보처리방침</b></a>
<a href="/club/rules/">후루룩클럽 이용 규칙</a>
</nav>
<p class="foot-note">라면 이름과 상표는 각 제조사의 것이에요. 라면 카드의 그릇 사진은 조리 방식을 보여 주는 예시 그림이고, 실제 제품 사진이 아니에요.</p>
<p class="foot-note">${esc(SITE_NAME)} 라면몰과 라면 페이지의 구매 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다. 수수료는 랭킹 계산에 들어가지 않아요.</p>
<p class="foot-copy">© ${new Date().getFullYear()} ${esc(OPERATOR)}</p>
</div>
</footer>`;
}

// 검색 창 (어느 페이지에서나 머리의 돋보기로 열어요)
function searchDialog() {
  return `<dialog class="sheet search-sheet" id="search-dialog" aria-label="라면 찾기">
<div class="sheet-body">
<form class="search-row" data-search-form role="search">
${icon('i-search')}<input type="search" name="q" placeholder="라면 이름, 회사, 초성 (예: ㅅㄹㅁ)" autocomplete="off" aria-label="라면 찾기" data-search-input>
<button type="button" class="icon-btn" data-close aria-label="닫기">${icon('i-close')}</button>
</form>
<div class="search-results" data-search-results aria-live="polite"></div>
</div>
</dialog>`;
}

function reportDialog() {
  const options = SORTED.map((r) => `<option value="${r.s}">${esc(r.n)} (${esc(r.maker)})</option>`).join('');
  return `<dialog class="sheet" id="report-dialog" aria-labelledby="report-title">
<form class="sheet-body" id="report-form" method="dialog">
<div class="sheet-head"><h2 id="report-title">틀린 정보 알려 주기</h2><button type="button" class="icon-btn" data-close aria-label="닫기">${icon('i-close')}</button></div>
<p class="muted">확인한 뒤 도감을 고칠게요. 새로 나온 라면 제보도 여기로 보내 주세요.</p>
<label class="field"><span>어떤 라면인가요?</span>
<select name="slug"><option value="">라면과 상관없는 의견</option>${options}</select></label>
<label class="field"><span>어떤 내용인가요?</span>
<select name="kind">
<option value="wrong">정보가 틀렸어요</option>
<option value="newramen">새 라면을 제보해요</option>
<option value="sale">단종·판매처가 바뀌었어요</option>
<option value="typo">오타나 어색한 표현이 있어요</option>
<option value="other">그 밖의 의견</option>
</select></label>
<label class="field"><span>자세히 적어 주세요</span>
<textarea name="message" rows="5" maxlength="1000" required placeholder="예: 이 라면은 2024년에 리뉴얼되면서 면이 굵어졌어요. 관련 기사 주소도 함께 적어 주시면 더 빨리 고칠 수 있어요."></textarea></label>
<label class="field"><span>답을 받고 싶다면 연락처 (선택)</span>
<input name="contact" maxlength="100" autocomplete="email" placeholder="이메일"></label>
<label class="hp" aria-hidden="true">비워 두세요<input name="website" tabindex="-1" autocomplete="off"></label>
<p class="form-msg" role="status" aria-live="polite"></p>
<div class="sheet-actions"><button type="submit" class="btn btn-main">보내기</button></div>
</form>
</dialog>`;
}

export function layout({ title, description, path: p, body, scripts = [], noindex = false, jsonld = null, bodyClass = '', ogImage = '', ogSize = null, ogType = 'website', bare = false }) {
  const url = abs(p);
  const lds = [].concat(jsonld || []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${abs(ogImage || '/assets/img/og.png')}">
<meta property="og:image:width" content="${ogSize ? ogSize[0] : 1200}">
<meta property="og:image:height" content="${ogSize ? ogSize[1] : 630}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FAF7F3">
${cfg.naverSiteVerification ? `<meta name="naver-site-verification" content="${esc(cfg.naverSiteVerification)}">` : ''}
${cfg.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(cfg.googleSiteVerification)}">` : ''}
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/img/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE_NAME)} 라면 도감" href="/rss.xml">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="/assets/css/app.css?v=${BUILD}">
<script>document.documentElement.classList.add('js')</script>
${lds}
</head>
<body class="${bodyClass}">
${SPRITE}
<a class="skip" href="#main">본문으로 건너뛰기</a>
<div class="demo-bar" data-demo-bar hidden><b>시험 데이터가 섞여 있어요.</b> 지금 보이는 랭킹과 기록 일부는 화면을 점검하려고 넣은 가짜 기록이에요.</div>
${bare ? '' : header(p)}
<main id="main">
${body}
</main>
${bare ? '' : footer()}
${bare ? '' : tabbar(p)}
${searchDialog()}
${reportDialog()}
<script src="/assets/js/meta.js?v=${BUILD}" defer></script>
<script src="/assets/js/app.js?v=${BUILD}" defer></script>
${scripts.map((s) => `<script src="/assets/js/${s}?v=${BUILD}" defer></script>`).join('\n')}
</body>
</html>`;
}

// ---------- 조각 ----------
export const crumbs = (items) => `<nav class="crumbs" aria-label="현재 위치"><ol>${items.map(([h, l], i) => (i < items.length - 1 ? `<li><a href="${h}">${esc(l)}</a></li>` : `<li aria-current="page">${esc(l)}</li>`)).join('')}</ol></nav>`;
export const crumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([h, l], i) => ({ '@type': 'ListItem', position: i + 1, name: l, item: abs(h) })) });
export const secHead = (title, more = '', id = '') => `<div class="sec-head"><h2${id ? ` id="${id}"` : ''}>${WAVE}<span>${esc(title)}</span></h2>${more}</div>`;
export const moreLink = (href, label = '모두 보기') => `<a class="more-link" href="${href}">${esc(label)}${icon('i-chev')}</a>`;

export const hotChip = (r) => (r.hot == null ? '' : `<span class="chip-hot hot${r.hot}" title="편집부 분류">${r.hot === 2 ? icon('i-flame') + icon('i-flame') : r.hot === 1 ? icon('i-flame') : ''}${HOTS[r.hot]}</span>`);
export const statusChip = (r) => (r.st && r.st !== 'sale' ? `<span class="chip-st st-${r.st}">${STATUS[r.st]}${r.ch ? ' · ' + esc(r.ch) : ''}</span>` : '');

// 라면 그림: 허락받은 실물 사진 > AI 조리 예시 > 조리 방식 예시 그림
export const picSrc = (r, kind = 'thumb') => {
  if (!r.pic) return `/assets/img/${r.img}.webp`;
  if (kind === 'q' && !r.pic.sq) kind = r.pic.small ? 's' : 'thumb';
  if (kind === 's' && !r.pic.small) kind = 'thumb';
  return `${r.pic.base}/${kind}/${r.pic.f}.webp`;
};
// 정사각 칸(라면몰 카드 등): 띠 없이 그릇만 자른 작은 정사각 그림
export function ramenImgSq(r) {
  if (!r.pic || !r.pic.sq) return ramenImg(r, false, '(min-width: 760px) 240px, 46vw');
  return `<img src="${picSrc(r, 'q')}" width="480" height="480" alt="" loading="lazy" decoding="async">`;
}
export function ramenImg(r, eager = false, sizes = '(min-width: 1100px) 260px, (min-width: 760px) 30vw, 46vw') {
  if (!r.pic) return img(r.img, '', '', eager);
  const set = r.pic.small ? ` srcset="${picSrc(r, 's')} 400w, ${picSrc(r)} 1000w" sizes="${sizes}"` : '';
  return `<img src="${picSrc(r)}"${set} width="1000" height="800" alt="${esc(r.pic.alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`;
}
// 라면 페이지 큰 그림과 출처 한 줄
export function ramenHero(r) {
  const p = r.pic;
  if (!p) return `${img(r.img, `${STYLES[r.c]} 라면 예시 그림`, '', true)}${statusChip(r)}<p class="pic-note">그림은 조리 방식을 보여 주는 예시예요.</p>`;
  const alt = p.kind === 'ai' ? `${r.n} AI 조리 예시 그림` : p.altBig;
  const pic = p.detail
    ? `<picture><source media="(min-width: 600px)" srcset="${picSrc(r, 'square')}"><img src="${picSrc(r, 'wide')}" width="1440" height="900" alt="${esc(alt)}" fetchpriority="high" decoding="async"></picture>`
    : `<img class="is-pack" src="${picSrc(r)}" width="1000" height="800" alt="${esc(alt)}" fetchpriority="high" decoding="async">`;
  const note = p.kind === 'ai'
    ? '<p class="pic-note">AI로 새로 만든 조리 예시 그림이에요. 실제 제품의 양, 건더기, 색과 다를 수 있어요.</p>'
    : `<p class="pic-note">사진 출처 ${p.credits.map((c) => `<a href="${esc(c.url)}" rel="noopener nofollow" target="_blank">${esc(c.name)}</a>${c.license ? ` (${esc(c.license.replace(/\(.*\)/, ''))})` : ''}`).join(', ')} · 허락을 받아 실었어요.</p>`;
  return `${pic}${statusChip(r)}${note}`;
}

// 라면 카드 (도감, 처음 화면, 비슷한 라면). 숫자는 화면에서 채워요(data-stat).
export function ramenCard(r, { eager = false, from = '' } = {}) {
  return `<article class="rcard" data-s="${r.s}" data-g="${r.groups.join(' ')}" data-m="${r.m}" data-f="${r.f || ''}" data-c="${r.c}" data-hot="${r.hot == null ? '' : r.hot}" data-st="${r.st}" data-co="${r.co}" data-ta="${r.ta.join(' ')}" data-nd="${r.noodle || 'oil'}" data-y="${releaseKey(r)}" data-q="${esc((ramenSearchText(r) + ' ' + cho(ramenSearchText(r))).toLowerCase())}">
<a class="rcard-link" href="/ramen/${r.s}/${from}">
<div class="rcard-img">${ramenImg(r, eager)}${statusChip(r)}</div>
<div class="rcard-body">
<p class="rcard-maker">${r.co !== 'kr' ? `<span class="rcard-co">${esc(r.coName)}</span>` : ''}${esc(r.maker)}${r.f ? ` · ${formText(r)}` : ''}</p>
<h3 class="rcard-name">${esc(r.n)}</h3>
<p class="rcard-tags"><span class="chip-style">${styleText(r)}</span>${hotChip(r)}</p>
<p class="rcard-stat" data-stat>기록 모으는 중</p>
</div>
</a>
<button type="button" class="save-btn" data-save="${r.s}" aria-pressed="false" aria-label="${esc(r.n)} 저장">${icon('i-bookmark')}</button>
</article>`;
}
export const ramenGrid = (list, opt) => `<div class="rgrid">${list.map((r, i) => ramenCard(r, { ...opt, eager: opt && opt.eagerFirst ? i < 4 : false })).join('')}</div>`;

export const goHref = (id, from) => `/go/${id}${from ? `?from=${from}` : ''}`;
export const buyLink = (id, from, label = '쿠팡에서 보기', cls = 'btn btn-buy') => `<a class="${cls}" href="${goHref(id, from)}" rel="sponsored nofollow noopener" target="_blank" data-buy="${id}">${icon('i-cart')}${esc(label)}</a>`;
export const DISCLOSURE = '이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';
