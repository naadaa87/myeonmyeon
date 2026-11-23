/* 면면 공통 스크립트
   도구(MM), 서버 묻기, 로그인 표시, 방문 통계, 메뉴, 검색 창, 라면 카드 숫자, 저장, 틀린 정보 알려 주기, 점수 알림 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 공간을 못 쓰면 넘어가요 */ } }
  };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  var ico = function (id) { return '<svg class="ico" aria-hidden="true"><use href="#' + id + '"/></svg>'; };
  var MMD = window.MMD || {};
  var MMG = window.MMG || null;

  // ---------- 알림 ----------
  var toastTimer;
  function toast(msg) {
    var t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2400);
  }
  function copyText(text, okMsg) {
    var done = function () { toast(okMsg || '복사했어요'); };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(done, fallback);
    fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('복사하지 못했어요. 주소를 길게 눌러 복사해 주세요.'); }
      document.body.removeChild(ta);
    }
  }
  function share(data) {
    if (navigator.share) navigator.share(data).catch(function () { /* 사용자가 닫음 */ });
    else copyText((data.text ? data.text + '\n' : '') + (data.url || location.href), '링크를 복사했어요');
  }

  // ---------- 서버 ----------
  function api(path, opt) {
    opt = opt || {};
    var init = { method: opt.method || 'GET', credentials: 'same-origin', headers: {} };
    if (opt.body !== undefined) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(opt.body); }
    return fetch('/api/' + path, init).then(function (r) {
      return r.json().catch(function () { return { ok: false, message: '서버 응답을 읽지 못했어요.' }; }).then(function (j) { j._status = r.status; return j; });
    }, function () { return { ok: false, _status: 0, message: '인터넷 연결을 확인해 주세요.' }; });
  }

  // ---------- 날짜 ----------
  function ago(iso) {
    var t = new Date(iso).getTime();
    if (!t) return '';
    var s = (Date.now() - t) / 1000;
    if (s < 60) return '방금';
    if (s < 3600) return Math.floor(s / 60) + '분 전';
    if (s < 86400) return Math.floor(s / 3600) + '시간 전';
    if (s < 86400 * 7) return Math.floor(s / 86400) + '일 전';
    var d = new Date(t + 9 * 3600e3);
    return d.getUTCFullYear() + '.' + (d.getUTCMonth() + 1) + '.' + d.getUTCDate();
  }
  var kstToday = function () { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); };

  // 받침이 있으면 a, 없으면 b (예: 신라면 + 이/가 → 신라면이)
  function josa(word, a, b) {
    var w = String(word).replace(/[^가-힣0-9A-Za-z]/g, '');
    var c = w.charCodeAt(w.length - 1) - 0xac00;
    if (c >= 0 && c <= 11171) return word + (c % 28 ? a : b);
    return word + (/[013678]$/.test(w) ? a : b);
  }

  // ---------- 등급 칩, 닉네임 ----------
  function lvChip(xp) {
    if (!MMG) return '';
    var l = MMG.level(xp);
    return '<span class="lv" style="background:' + l.color + '" title="Lv.' + l.lv + ' ' + esc(l.name) + '"><i>' + l.lv + '</i>' + esc(l.name) + '</span>';
  }
  function who(o, link) {
    if (o.gone) return '<span class="muted">탈퇴한 회원</span>';
    if (o.sys) return '<b>' + esc(o.nick) + '</b>';
    var inner = esc(o.nick) + ' ' + lvChip(o.xp);
    return link === false ? '<span class="bowl-who">' + inner + '</span>' : '<a class="bowl-who" href="/club/u/?n=' + encodeURIComponent(o.nick) + '">' + inner + '</a>';
  }

  // ---------- 별 ----------
  function starsSVG(v) { // v: 0~5 (반 개 단위)
    var h = '';
    for (var i = 1; i <= 5; i++) {
      var fill = v >= i ? 1 : v >= i - 0.5 ? 0.5 : 0;
      var id = 'sg' + Math.random().toString(36).slice(2, 8);
      h += '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="' + id + '"><stop offset="' + (fill * 100) + '%" stop-color="#F2B33D"/><stop offset="' + (fill * 100) + '%" stop-color="#E8E0D6"/></linearGradient></defs><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z" fill="url(#' + id + ')"/></svg>';
    }
    return '<span class="stars" role="img" aria-label="별 ' + v + '개">' + h + '</span>';
  }
  var scoreHTML = function (v) { return '<span class="score">' + ico('i-star') + (Math.round(v * 10) / 10).toFixed(1) + '</span>'; };

  // ---------- 로그인 상태 ----------
  var mePromise = null;
  function getMe(force) {
    if (!mePromise || force) {
      mePromise = api('me').then(function (j) {
        var u = j && j.ok ? j.user : null;
        store.set('mm-me', u ? { nick: u.nick } : null);
        paintAccount(u);
        var bar = $('[data-demo-bar]');
        if (bar) bar.hidden = !(j && j.demo);
        return u;
      });
    }
    return mePromise;
  }
  function setMe(u) {
    store.set('mm-me', u ? { nick: u.nick } : null);
    mePromise = Promise.resolve(u);
    paintAccount(u);
  }
  function paintAccount(u) {
    var me = u === undefined ? store.get('mm-me', null) : u;
    $$('[data-acct]').forEach(function (a) {
      var nick = $('[data-acct-nick]', a);
      a.setAttribute('aria-label', me && me.nick ? '내 도감 (' + me.nick + ')' : '로그인');
      a.classList.toggle('on', !!(me && me.nick));
      if (nick) nick.textContent = me && me.nick ? me.nick : '';
    });
    $$('[data-unread]').forEach(function (d) { d.hidden = !(u && u.unread); });
  }
  paintAccount();

  // ---------- 점수 알림 ----------
  var gainTimer;
  var shortLabel = function (l) { var a = String(l).split(', '); return a.length > 2 ? a.slice(0, 2).join(' · ') + ' 외 ' + (a.length - 2) + '가지' : a.join(' · '); };
  function gain(g) {
    if (!g) return;
    var old = $('.gain'); if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'gain'; el.setAttribute('role', 'status');
    var lvl = g.up && MMG ? MMG.emblem(MMG.level(MMG.LEVELS[g.up.lv - 1].min), 44) : '';
    var bd = (g.badges || []).map(function (b) { return b.name; }).join(', ');
    el.innerHTML = lvl + '<div>' + (g.up ? '<b>등급이 올랐어요! Lv.' + g.up.lv + ' ' + esc(g.up.name) + '</b>' : (g.pts ? '<b class="gain-pts">+' + g.pts + '점</b>' : '')) +
      (g.label ? '<span>' + esc(shortLabel(g.label)) + '</span>' : '') + (bd ? '<span>새 배지: ' + esc(bd) + '</span>' : '') + '</div>';
    if (!g.pts && !g.up && !bd) return;
    document.body.appendChild(el);
    clearTimeout(gainTimer);
    gainTimer = setTimeout(function () { el.remove(); }, g.up || bd ? 4500 : 2600);
  }
  // 다른 페이지로 넘어가는 동작의 점수 알림은 다음 페이지에서 보여 줘요
  function gainLater(g) { if (g) try { sessionStorage.setItem('mm-gain', JSON.stringify(g)); } catch (e) { /* 넘어가요 */ } }
  function toastLater(msg) { try { sessionStorage.setItem('mm-toast', msg); } catch (e) { /* 넘어가요 */ } }
  try { var pt = sessionStorage.getItem('mm-toast'); if (pt) { sessionStorage.removeItem('mm-toast'); setTimeout(function () { toast(pt); }, 300); } } catch (e) { /* 넘어가요 */ }
  try { var pg = sessionStorage.getItem('mm-gain'); if (pg) { sessionStorage.removeItem('mm-gain'); setTimeout(function () { gain(JSON.parse(pg)); }, 400); } } catch (e) { /* 넘어가요 */ }

  // ---------- 방문 통계 (이름·IP 없이 이 브라우저에 저장한 무작위 번호로) ----------
  var params = new URLSearchParams(location.search);
  var stat = (function () {
    var off = false;
    try { off = localStorage.getItem('mm-notrack') === '1'; } catch (e) { off = false; }
    if (off || /^\/admin\//.test(location.pathname)) return null;
    var rnd = function () { return (Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-5)).replace(/[^a-z0-9]/g, ''); };
    var day = kstToday();
    var v = store.get('mm-vid', null);
    if (!v || !/^[a-z0-9]{6,24}$/.test(v.id || '')) { v = { id: rnd(), d: day }; store.set('mm-vid', v); }
    var s = store.get('mm-ses', null), now = Date.now(), entry = false;
    if (!s || !/^[a-z0-9]{6,24}$/.test(s.id || '') || now - (s.t || 0) > 30 * 60e3) { s = { id: rnd(), t: now }; entry = true; }
    s.t = now; store.set('mm-ses', s);
    return { vid: v.id, sid: s.id, nv: v.d === day ? 1 : 0, entry: entry, pv: rnd() };
  })();
  function send(obj) {
    try {
      var body = JSON.stringify(obj);
      if (navigator.sendBeacon && navigator.sendBeacon('/api/event', new Blob([body], { type: 'text/plain' }))) return;
      fetch('/api/event', { method: 'POST', body: body, keepalive: true }).catch(function () { /* 무시 */ });
    } catch (e) { /* 기록 실패는 화면에 영향 없음 */ }
  }
  function track(type, slug, extra) {
    if (!stat) return;
    var o = { t: type, s: slug || '', vid: stat.vid, sid: stat.sid };
    if (extra) for (var k in extra) o[k] = extra[k];
    send(o);
  }
  if (stat) {
    (function () {
      var ua = navigator.userAgent || '', w = window.innerWidth || screen.width || 0;
      var dev = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobi/i.test(ua)) ? 't' : (/Mobi|iPhone|Android/i.test(ua) || w < 600 ? 'm' : 'd');
      var ref = '', kw = '';
      try {
        if (document.referrer) {
          var r = new URL(document.referrer);
          if (r.host !== location.host) { ref = r.hostname; kw = (r.searchParams.get('query') || r.searchParams.get('q') || r.searchParams.get('wd') || '').slice(0, 60); }
        }
      } catch (e) { /* 무시 */ }
      var utm = params.get('utm_source') ? [params.get('utm_source'), params.get('utm_medium') || '', params.get('utm_campaign') || ''].join('/').slice(0, 120) : '';
      send({ t: 'pv', id: stat.pv, vid: stat.vid, sid: stat.sid, nv: stat.nv, en: stat.entry ? 1 : 0, p: location.pathname, r: stat.entry ? ref : '', q: stat.entry ? kw : '', u: stat.entry ? utm : '', qr: params.get('src') === 'qr' ? 1 : 0, d: dev });
      var active = 0, since = document.visibilityState === 'visible' ? Date.now() : 0, depth = 0, last = 0;
      var measure = function () {
        var h = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
        var seen = (window.scrollY || 0) + window.innerHeight;
        var d = h > 0 ? Math.min(100, Math.round(seen / h * 100)) : 100;
        if (d > depth) depth = d;
      };
      var flush = function () {
        if (since) { active += Date.now() - since; since = 0; }
        var sec = Math.round(active / 1000);
        if (sec === last && sec > 0) return;
        last = sec;
        var end = { t: 'end', id: stat.pv, vid: stat.vid, dur: sec, dep: depth };
        try { sessionStorage.setItem('mm-last-end', JSON.stringify(end)); } catch (e) { /* 무시 */ }
        send(end);
      };
      try {
        var prevEnd = JSON.parse(sessionStorage.getItem('mm-last-end') || 'null');
        sessionStorage.removeItem('mm-last-end');
        if (prevEnd && prevEnd.id && prevEnd.id !== stat.pv) send(prevEnd);
      } catch (e) { /* 무시 */ }
      window.addEventListener('scroll', measure, { passive: true });
      setTimeout(measure, 1500);
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') flush();
        else { since = Date.now(); store.set('mm-ses', { id: stat.sid, t: Date.now() }); }
      });
      window.addEventListener('pagehide', flush);
      // 구매 버튼: 누른 방문과 페이지를 함께 남겨요
      var tag = function (e) {
        var a = e.target.closest && e.target.closest('a[href^="/go/"]');
        if (!a || a.dataset.tagged) return;
        a.dataset.tagged = '1';
        var h = a.getAttribute('href');
        a.href = h + (h.indexOf('?') > -1 ? '&' : '?') + 'vi=' + stat.vid + '&si=' + stat.sid + '&pg=' + encodeURIComponent(location.pathname);
      };
      document.addEventListener('pointerdown', tag, true);
      document.addEventListener('click', tag, true);
    })();
  }
  // 개인정보처리방침의 ‘방문 통계 끄기’
  $$('[data-notrack]').forEach(function (b) {
    var paint = function () {
      var off = false;
      try { off = localStorage.getItem('mm-notrack') === '1'; } catch (e) { off = false; }
      b.textContent = off ? '이 브라우저의 방문 통계 다시 켜기' : '이 브라우저의 방문 통계 끄기';
    };
    paint();
    b.addEventListener('click', function () {
      try {
        // k_off: choisijun.com 통합 방문 집계(k1.js)도 함께 끄고 켜요
        if (localStorage.getItem('mm-notrack') === '1') { localStorage.removeItem('mm-notrack'); localStorage.removeItem('k_off'); toast('방문 통계를 다시 켰어요'); }
        else { localStorage.setItem('mm-notrack', '1'); localStorage.setItem('k_off', 'true'); toast('이 브라우저의 방문 통계를 껐어요'); }
      } catch (e) { toast('이 브라우저에서는 설정을 저장할 수 없어요'); }
      paint();
    });
  });

  // ---------- 메뉴 ----------
  var menuBtn = $('.menu-btn'), nav = $('#site-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    });
  }

  // ---------- 라면 목록, 숫자 ----------
  var CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  function cho(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i) - 0xac00; out += (c >= 0 && c < 11172) ? CHO[Math.floor(c / 588)] : s[i]; }
    return out;
  }
  // 된소리 초성(ㄲ, ㅉ 등)은 예사소리로 쳐요. ㅈㅍㄱㅌ로 짜파게티를 찾을 수 있게
  var DBL = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
  var norm = function (s) { return String(s || '').toLowerCase().replace(/[\s·:!,.()\-]/g, '').replace(/[ㄲㄸㅃㅆㅉ]/g, function (c) { return DBL[c]; }); };
  function matches(q, hay) {
    q = norm(q);
    if (!q) return true;
    return norm(hay).indexOf(q) > -1;
  }
  var ramenP = null, statsP = null, BY = {};
  function loadRamen() {
    if (!ramenP) ramenP = fetch('/data/ramen.json').then(function (r) { return r.json(); }).then(function (d) { d.ramen.forEach(function (r) { BY[r.s] = r; }); return d; });
    return ramenP;
  }
  function loadStats(force) {
    if (!statsP || force) statsP = api('ramen/stats').then(function (j) { if (j.demo) { var bar = $('[data-demo-bar]'); if (bar) bar.hidden = false; } return j.ok ? j.stats : {}; });
    return statsP;
  }
  var statLine = function (st) {
    if (!st || !st.n) return '기록 모으는 중';
    if (st.n < 3) return '기록 ' + st.n + '개 · 모으는 중';
    return scoreHTML(st.a) + '<span>기록 ' + st.n + '개</span>';
  };
  function paintCards(root) {
    var cards = $$('.rcard[data-s], .pcard[data-s]', root);
    if (!cards.length) return Promise.resolve();
    return loadStats().then(function (S) {
      cards.forEach(function (c) {
        var el = $('[data-stat]', c), st = S[c.dataset.s];
        if (el) el.innerHTML = statLine(st);
        c.dataset.n = st ? st.n : 0;
        c.dataset.a = st && st.n >= 3 ? st.a : 0;
      });
    });
  }
  // 라면 그림: 허락받은 실물 사진(pi[0]=2) > AI 조리 예시(1) > 조리 방식 예시 그림. big이 아니면 작은 그림을 써요.
  var picBase = function (r) { return r.pi[0] === 1 ? '/assets/img/ramen-ai/' : '/assets/img/ramen/'; };
  // kind: thumb(5:4) · s(작은 5:4) · q(띠 없는 정사각) · square(큰 정사각)
  var picOf = function (r, kind) {
    if (kind === 'q' && !r.pi[3]) kind = r.pi[2] ? 's' : 'thumb';
    if (kind === 's' && !r.pi[2]) kind = 'thumb';
    if (kind === 'square' && !r.pi[4]) kind = 'thumb';
    return picBase(r) + kind + '/' + (r.pi[1] || r.s) + '.webp';
  };
  // big: true = 카드용 5:4, 'square' = 큰 정사각, 없으면 작은 정사각 칸용
  var imgOf = function (r, big) {
    if (!r || !r.pi) return '/assets/img/' + (r && r.img ? r.img : 'broth-spicy') + '.webp';
    return picOf(r, big === true ? 'thumb' : big === 'square' ? 'square' : 'q');
  };
  var imgTag = function (r, w, h, lazy) {
    var set = r.pi && r.pi[2] ? ' srcset="' + picOf(r, 's') + ' 400w, ' + picOf(r, 'thumb') + ' 1000w" sizes="(min-width: 1100px) 260px, (min-width: 760px) 30vw, 46vw"' : '';
    return '<img src="' + imgOf(r, true) + '"' + set + ' width="' + (r.pi ? 1000 : w) + '" height="' + (r.pi ? 800 : h) + '" alt=""' + (lazy ? ' loading="lazy"' : '') + ' decoding="async">';
  };
  function cardHTML(r, st) {
    var st2 = r.st && r.st !== 'sale' ? '<span class="chip-st st-' + r.st + '">' + esc((MMD.STATUS || {})[r.st] || '') + (r.ch ? ' · ' + esc(r.ch) : '') + '</span>' : '';
    var hot = r.hot == null ? '' : '<span class="chip-hot hot' + r.hot + '">' + (r.hot === 2 ? ico('i-flame') + ico('i-flame') : r.hot === 1 ? ico('i-flame') : '') + esc(MMD.HOTS[r.hot]) + '</span>';
    return '<article class="rcard" data-s="' + r.s + '"><a class="rcard-link" href="/ramen/' + r.s + '/"><div class="rcard-img">' + imgTag(r, 800, 800, true) + st2 + '</div>' +
      '<div class="rcard-body"><p class="rcard-maker">' + (r.cn ? '<span class="rcard-co">' + esc(r.cn) + '</span>' : '') + esc(r.mn) + (r.f ? ' · ' + esc(MMD.FORMS[r.f]) : '') + '</p><h3 class="rcard-name">' + esc(r.n) + '</h3>' +
      '<p class="rcard-tags"><span class="chip-style">' + esc(MMD.STYLES[r.c]) + '</span>' + hot + '</p><p class="rcard-stat" data-stat>' + statLine(st) + '</p></div></a>' +
      '<button type="button" class="save-btn" data-save="' + r.s + '" aria-pressed="false" aria-label="' + esc(r.n) + ' 저장">' + ico('i-bookmark') + '</button></article>';
  }

  // ---------- 저장 (책갈피) ----------
  // 로그인 전에는 이 기기에, 로그인하면 계정에 저장해요.
  var saved = store.get('mm-saved', []);
  function paintSaved() {
    $$('[data-save]').forEach(function (b) { b.setAttribute('aria-pressed', String(saved.indexOf(b.dataset.save) > -1)); });
  }
  function setSaved(list) { saved = list; store.set('mm-saved', saved); paintSaved(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-save]');
    if (!b) return;
    e.preventDefault();
    var s = b.dataset.save, on = saved.indexOf(s) < 0;
    setSaved(on ? saved.concat([s]) : saved.filter(function (x) { return x !== s; }));
    toast(on ? '저장했어요. 내 도감에서 모아 볼 수 있어요.' : '저장을 지웠어요.');
    getMe().then(function (me) { if (me) api('ramen/' + s + '/mark', { method: 'POST', body: { kind: 'saved', on: on } }); });
  });
  paintSaved();
  function syncSaved() {
    return api('sync', { method: 'POST', body: { slugs: saved } }).then(function (j) {
      if (j.ok) setSaved(j.marks.filter(function (m) { return m.kind === 'saved'; }).map(function (m) { return m.slug; }));
      return j;
    });
  }

  // ---------- 검색 창 ----------
  var sd = $('#search-dialog');
  function openSearch(q) {
    if (!sd) return;
    if (sd.showModal) sd.showModal(); else sd.setAttribute('open', '');
    var inp = $('[data-search-input]', sd);
    if (q != null) inp.value = q;
    inp.focus();
    runSearch();
  }
  function runSearch() {
    var q = $('[data-search-input]', sd).value.trim();
    var box = $('[data-search-results]', sd);
    loadRamen().then(function (d) {
      var list = q ? d.ramen.filter(function (r) { return matches(q, r.q); }) : d.ramen.slice().sort(function (a, b) { return b.yk - a.yk; }).slice(0, 8);
      if (q) track('search', '', { k: q.slice(0, 40), n: list.length });
      box.innerHTML = (q ? '' : '<p class="small muted">최근에 나온 라면</p>') + (list.length ? list.slice(0, 20).map(function (r) {
        return '<a class="pick" href="/ramen/' + r.s + '/"><img src="' + imgOf(r) + '" alt="" width="48" height="48"><span><b>' + esc(r.n) + '</b><span>' + esc(r.mn) + ' · ' + esc(MMD.STYLES[r.c]) + '</span></span>' + ico('i-chev') + '</a>';
      }).join('') : '<div class="empty"><p>‘' + esc(q) + '’에 맞는 라면이 없어요.</p><p><button type="button" class="btn btn-line" data-report="" data-kind="newramen">새 라면 제보하기</button></p></div>');
    });
  }
  if (sd) {
    var st = 0;
    $('[data-search-input]', sd).addEventListener('input', function () { clearTimeout(st); st = setTimeout(runSearch, 120); });
    $('[data-search-form]', sd).addEventListener('submit', function (e) { e.preventDefault(); var a = $('.pick', sd); if (a) location.href = a.href; });
    sd.addEventListener('click', function (e) { if (e.target === sd || e.target.closest('[data-close]')) sd.close(); });
  }
  $$('[data-search-open]').forEach(function (b) { b.addEventListener('click', function () { openSearch(); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });

  // ---------- 틀린 정보 알려 주기 ----------
  var dlg = $('#report-dialog');
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-report]');
    if (!b || !dlg) return;
    e.preventDefault();
    if (sd && sd.open) sd.close();
    var f = $('#report-form');
    f.slug.value = b.dataset.report || '';
    f.kind.value = b.dataset.kind || (b.dataset.report ? 'wrong' : 'other');
    $('.form-msg', f).textContent = '';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
  if (dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
    $('#report-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, msg = $('.form-msg', f), btn = $('button[type=submit]', f);
      btn.disabled = true;
      api('report', { method: 'POST', body: { slug: f.slug.value, kind: f.kind.value, message: f.message.value, contact: f.contact.value, website: f.website.value, page: location.pathname } }).then(function (j) {
        btn.disabled = false;
        if (j.ok) { f.reset(); dlg.close(); toast('고마워요. 확인한 뒤 고칠게요.'); }
        else { msg.className = 'form-msg err'; msg.textContent = j.message || '보내지 못했어요.'; }
      });
    });
  }

  // ---------- 문의하기 ----------
  var cf = $('[data-contact]');
  if (cf) {
    cf.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('.form-msg', cf), btn = $('button[type=submit]', cf), data = {};
      ['kind', 'name', 'org', 'email', 'phone', 'title', 'message', 'website'].forEach(function (k) { data[k] = cf[k].value; });
      data.agree = cf.agree.checked; data.page = document.referrer || '';
      btn.disabled = true;
      api('contact', { method: 'POST', body: data }).then(function (j) {
        btn.disabled = false;
        if (j.ok) { cf.reset(); msg.className = 'form-msg ok'; msg.textContent = '보냈어요. 적어 주신 이메일로 답할게요.'; }
        else { msg.className = 'form-msg err'; msg.textContent = j.message || '보내지 못했어요.'; }
      });
    });
  }

  // ---------- 공유 버튼 ----------
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-share]');
    if (!b) return;
    share({ title: document.title, url: location.href.split('#')[0] });
    track('share', (document.querySelector('[data-ramen]') || {}).dataset ? document.querySelector('[data-ramen]').dataset.ramen : '');
  });

  // ---------- 맛 지도 (방사형 그림) ----------
  // series: [{ v: [8칸 값 1~5 또는 null], cls: 's0' }]
  function radar(series, size) {
    size = size || 320;
    var AX = MMD.AXES || [], n = AX.length, c = size / 2, R = size / 2 - 46;
    var pt = function (i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [c + Math.cos(a) * R * v / 5, c + Math.sin(a) * R * v / 5]; };
    var g = '';
    for (var k = 1; k <= 5; k++) g += '<polygon class="grid" points="' + AX.map(function (_, i) { return pt(i, k).join(','); }).join(' ') + '"/>';
    AX.forEach(function (a, i) {
      var e = pt(i, 5), l = pt(i, 6.15);
      g += '<line class="axis" x1="' + c + '" y1="' + c + '" x2="' + e[0] + '" y2="' + e[1] + '"/>';
      g += '<text x="' + l[0] + '" y="' + (l[1] + 4) + '" text-anchor="middle">' + esc(a.name) + '</text>';
    });
    series.forEach(function (s) {
      var vals = s.v.map(function (x) { return x == null ? 0 : x; });
      g += '<polygon class="shape ' + (s.cls || '') + '" points="' + vals.map(function (v, i) { return pt(i, v).join(','); }).join(' ') + '"/>';
    });
    return '<svg class="radar" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="맛 지도: ' + series.map(function (s) { return AX.map(function (a, i) { return a.name + ' ' + (s.v[i] == null ? '기록 없음' : s.v[i]); }).join(', '); }).join(' / ') + '">' + g + '</svg>';
  }

  // ---------- 레시피 카드 (레시피 자랑, 처음 화면, 라면 페이지, 클럽 홈에서 함께 써요) ----------
  var recipeImg = function (id, small) { return '/api/img/' + id + (small ? '/s' : ''); };
  function recipeCard(r) {
    var first = (r.ramen || [])[0], rr = first ? BY[first] : null;
    var pic = r.cover ? recipeImg(r.cover, true) : rr ? imgOf(rr) : '/assets/img/club-recipe.webp';
    var avg = r.reviews ? Math.round(r.rsum / r.reviews * 10) / 10 : 0;
    var names = (r.ramen || []).map(function (s) { return BY[s] ? BY[s].n : ''; }).filter(Boolean);
    return '<a class="rcp-card" href="/recipes/' + r.id + '"><span class="rcp-pic' + (r.cover ? '' : ' rcp-nopic') + '"><img src="' + pic + '" alt="" loading="lazy" width="400" height="300">' +
      (r.mins ? '<span class="rcp-time">' + ico('i-timer') + r.mins + '분</span>' : '') + (r.hidden ? '<span class="rcp-hid">가려짐</span>' : '') + '</span>' +
      '<span class="rcp-body"><b class="rcp-t">' + esc(r.title) + '</b>' +
      (names.length ? '<span class="rcp-ramen">' + esc(names[0]) + (names.length > 1 ? ' 외 ' + (names.length - 1) + '가지' : '') + '</span>' : '') +
      '<span class="rcp-meta"><span class="rcp-who">' + (r.gone ? '탈퇴한 회원' : esc(r.nick)) + '</span>' +
      '<span>' + ico('i-heart') + (r.likes || 0) + '</span><span>' + ico('i-chat') + (r.comments || 0) + '</span>' + (r.reviews ? '<span class="rcp-rev">' + ico('i-star') + avg.toFixed(1) + ' · ' + r.reviews + '명</span>' : '') + '</span></span></a>';
  }
  // <div data-recipe-strip data-q="sort=hot&per=4"> 를 찾아 채워요
  function recipeStrips() {
    $$('[data-recipe-strip]').forEach(function (el) {
      Promise.all([api('recipes?' + (el.dataset.q || 'per=4')), loadRamen()]).then(function (r) {
        var j = r[0];
        var list = (j.recipes || []).filter(function (x) { return String(x.id) !== el.dataset.skip; });
        if (el.dataset.max) list = list.slice(0, Number(el.dataset.max));
        if (!j.ok || !list.length) {
          if (el.dataset.hideEmpty) { var sec = el.closest('[data-recipe-sec]'); if (sec) sec.hidden = true; return; }
          el.classList.add('rcp-empty-wrap');
          el.innerHTML = '<div class="rcp-empty"><p>' + esc(el.dataset.empty || '아직 올라온 레시피가 없어요.') + '</p><a class="btn btn-main btn-sm" href="/recipes/write/' + (el.dataset.ramen ? '?ramen=' + el.dataset.ramen : '') + '">' + ico('i-pen') + '첫 레시피 자랑하기</a></div>';
          return;
        }
        el.innerHTML = list.map(recipeCard).join('');
      });
    });
  }

  window.MM = {
    $: $, $$: $$, esc: esc, ico: ico, store: store, toast: toast, copyText: copyText, share: share, api: api, track: track,
    ago: ago, kstToday: kstToday, josa: josa, lvChip: lvChip, who: who, starsSVG: starsSVG, scoreHTML: scoreHTML,
    getMe: getMe, setMe: setMe, gain: gain, gainLater: gainLater, toastLater: toastLater, cho: cho, matches: matches,
    loadRamen: loadRamen, loadStats: loadStats, BY: BY, imgOf: imgOf, imgTag: imgTag, cardHTML: cardHTML, paintCards: paintCards, statLine: statLine,
    radar: radar, recipeCard: recipeCard, recipeImg: recipeImg, getSaved: function () { return saved.slice(); }, setSaved: setSaved, paintSaved: paintSaved, syncSaved: syncSaved, D: MMD, G: MMG
  };

  // 카드 숫자 채우기, 레시피 줄 채우기, 로그인 확인 (모든 페이지)
  paintCards();
  recipeStrips();
  getMe().then(function (me) {
    if (!me) return;
    var done = false;
    try { done = sessionStorage.getItem('mm-synced') === me.nick; } catch (e) { done = false; }
    if (!done) syncSaved().then(function () { try { sessionStorage.setItem('mm-synced', me.nick); } catch (e) { /* 넘어가요 */ } });
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () { /* 무시 */ }); });
  }
})();
