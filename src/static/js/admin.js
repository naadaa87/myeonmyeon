/* 면면 운영 관리
   대시보드, 지표(KPI), 원고 관리, 제보·오류, 문의함, 커뮤니티, 시험 데이터, 쇼핑 링크, 쿠팡 실적 입력, 설정
   주소의 # 뒤(#/kpi/overview 등)로 화면을 바꿔요. */
(function () {
  'use strict';
  var RS = window.MM;
  var root = document.querySelector('[data-admin]');
  if (!RS || !root) return;
  var $ = RS.$, $$ = RS.$$, esc = RS.esc;
  var repo = root.dataset.repo, branch = root.dataset.branch || 'main';
  var TOK = 'mm-admin-token';
  var token = '';
  try { token = sessionStorage.getItem(TOK) || localStorage.getItem(TOK) || ''; } catch (e) { token = ''; }
  var gamesBySlug = {}, gamesData = null, shopData = null;
  var KIND = { wrong: '정보가 틀림', newramen: '새 라면 제보', sale: '단종·판매처 바뀜', typo: '오타, 표현', other: '그 밖의 의견' };

  // 칩 묶음(하나만 고르기) 공통 처리
  RS.radioGroup = function (container, onChange) {
    container.addEventListener('click', function (e) {
      var b = e.target.closest('[role="radio"]');
      if (!b || !container.contains(b)) return;
      $$('[role="radio"]', container).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
      onChange(b);
    });
  };

  // ---------- 서버 ----------
  function api(path, opt) {
    opt = opt || {};
    opt.headers = Object.assign({ 'x-admin-token': token }, opt.headers || {});
    return fetch('/api/admin/' + path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        j._status = r.status;
        if (r.status === 401 && token) logout('로그인이 끝났어요. 다시 들어가 주세요.');
        return j;
      });
    });
  }
  var post = function (path, body) { return api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) }); };

  // ---------- 모양 다듬기 ----------
  var N = function (n) { return n == null ? '–' : Number(n).toLocaleString('ko-KR'); };
  var P = function (n, d) { return n == null || isNaN(n) ? '–' : Number(n).toFixed(d == null ? 1 : d) + '%'; };
  var W = function (n) { return n == null ? '–' : '₩' + Number(n).toLocaleString('ko-KR'); };
  var D = function (sec) {
    sec = Math.round(sec || 0);
    if (!sec) return '–';
    var m = Math.floor(sec / 60), s = sec % 60;
    return m ? m + '분 ' + (s < 10 ? '0' : '') + s + '초' : s + '초';
  };
  var pct = function (a, b) { return b ? a / b * 100 : null; };
  var fmtTime = function (iso) {
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  var hm = function (iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); };
  var md = function (day) { var p = String(day).split('-'); return Number(p[1]) + '/' + Number(p[2]); };
  var gameName = function (s) { return gamesBySlug[s] ? gamesBySlug[s].n : s; };
  var itemName = function (id) { return shopData && shopData.items[id] ? shopData.items[id].n : id; };
  var PAGES = { '/': '처음 화면', '/ramen/': '라면 도감', '/rank/': '랭킹', '/rank/rules/': '평가 기준', '/record/': '한 그릇 기록', '/new/': '신상 레이더', '/shop/': '라면몰', '/lab/': '취향실험실', '/lab/map/': '맛 지도', '/lab/compare/': '라면 비교', '/lab/worldcup/': '라면 월드컵', '/lab/timer/': '조리 타이머', '/lab/water/': '물 양 계산기', '/club/': '후루룩클럽 홈', '/me/': '내 도감', '/about/': '면면 소개', '/privacy/': '개인정보처리방침', '/terms/': '이용약관', '/contact/': '문의하기' };
  var pageName = function (p) {
    var m = String(p || '').match(/^\/ramen\/([a-z0-9-]+)\/$/);
    if (m) return gameName(m[1]);
    if (PAGES[p]) return PAGES[p];
    m = String(p || '').match(/^\/club\/([a-z-]+)\//);
    if (m) return '후루룩클럽 · ' + ({ board: '게시판', post: '글', feed: '한 그릇 피드', events: '시식회·번개', event: '모임', people: '사람 랭킹', u: '회원 도감', levels: '등급 안내', rules: '이용 규칙', write: '글쓰기' }[m[1]] || m[1]);
    return p;
  };
  var pageCell = function (p) { return '<a href="' + esc(p) + '" target="_blank" rel="noopener">' + esc(pageName(p)) + '</a><br><small class="muted">' + esc(p) + '</small>'; };
  var CH = { naver: '네이버 검색', 'naver-community': '네이버 블로그·카페', google: '구글', daum: '다음·카카오 검색', 'search-other': '그 밖의 검색', youtube: '유튜브', social: 'SNS', kakaotalk: '카카오톡', qr: 'QR 코드', campaign: '캠페인 링크(utm)', referral: '다른 사이트', direct: '직접 들어옴', internal: '다시 들어옴(30분 넘게 쉼)', '': '알 수 없음' };
  var SRC = { ramen: '라면 페이지 사러 가기', home: '처음 화면 라면몰 줄', 'shop-monthly': '라면몰 · 이달의 랭킹', 'shop-hot': '라면몰 · 맵기 도전', 'shop-summer': '라면몰 · 비빔면·막국수', 'shop-jjajang': '라면몰 · 짜장라면', 'shop-cup': '라면몰 · 컵라면', unknown: '알 수 없음' };
  var DEV = { m: '휴대폰', t: '태블릿', d: 'PC' };
  var FEAT = { timer: '조리 타이머', compare: '라면 비교', worldcup: '라면 월드컵', map: '맛 지도', share: '링크 보내기' };

  // 앞뒤 기간 비교
  function delta(cur, prev, invert) {
    if (cur == null || prev == null) return '';
    if (!prev && !cur) return '<span class="delta flat">변화 없음</span>';
    if (!prev) return '<span class="delta up">새로 생김</span>';
    var d = (cur - prev) / prev * 100;
    if (Math.abs(d) < 0.05) return '<span class="delta flat">변화 없음</span>';
    var good = invert ? d < 0 : d > 0;
    return '<span class="delta ' + (good ? 'up' : 'down') + '">' + (d > 0 ? '▲ ' : '▼ ') + Math.abs(d).toFixed(Math.abs(d) < 10 ? 1 : 0) + '%</span>';
  }
  function kpiCard(label, value, sub, dl) {
    return '<div class="kpi"><span class="kpi-label">' + label + '</span><b class="kpi-val">' + value + '</b><span class="kpi-sub">' + (dl || '') + (sub ? '<small>' + sub + '</small>' : '') + '</span></div>';
  }
  function card(title, inner, extra) {
    return '<section class="adm-card"><div class="adm-card-head"><h2>' + title + '</h2>' + (extra || '') + '</div>' + inner + '</section>';
  }
  function empty(msg) { return '<p class="adm-empty">' + (msg || '아직 기록이 없어요.') + '</p>'; }
  function tableHTML(head, rows, opt) {
    opt = opt || {};
    if (!rows.length) return empty(opt.empty);
    return '<div class="tbl-wrap"><table class="tbl' + (opt.cls ? ' ' + opt.cls : '') + '"' + (opt.sort ? ' data-sortable' : '') + '><thead><tr>' + head.map(function (h, i) { return '<th' + (i ? ' class="num"' : '') + '>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c, i) { var v = c && typeof c === 'object' ? c : { h: c }; return '<td' + (i ? ' class="num"' : '') + (v.s != null ? ' data-s="' + esc(v.s) + '"' : '') + '>' + (v.h == null ? '' : v.h) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  // 표 머리를 누르면 정렬
  root.addEventListener('click', function (e) {
    var th = e.target.closest('table[data-sortable] th');
    if (!th) return;
    var tbl = th.closest('table'), idx = Array.prototype.indexOf.call(th.parentNode.children, th);
    var asc = th.dataset.dir === 'desc';
    $$('th', tbl).forEach(function (x) { delete x.dataset.dir; });
    th.dataset.dir = asc ? 'asc' : 'desc';
    var rows = $$('tbody tr', tbl);
    var val = function (tr) { var td = tr.children[idx]; var s = td.dataset.s != null ? td.dataset.s : td.textContent; var n = Number(String(s).replace(/[^0-9.-]/g, '')); return s !== '' && !isNaN(n) && /\d/.test(s) ? n : s; };
    rows.sort(function (a, b) { var x = val(a), y = val(b); var c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko'); return asc ? c : -c; });
    rows.forEach(function (r) { r.parentNode.appendChild(r); });
  });

  // 가로 막대
  function bars(rows, fmt, opt) {
    opt = opt || {};
    if (!rows.length) return empty(opt.empty);
    var max = Math.max.apply(null, rows.map(function (r) { return r.v || 0; }).concat([1]));
    var total = rows.reduce(function (n, r) { return n + (r.v || 0); }, 0);
    return '<ul class="hbars">' + rows.map(function (r) {
      return '<li><span class="hb-label">' + r.label + '</span><span class="hb-track"><span class="hb-fill" style="width:' + Math.max(1.5, (r.v || 0) / max * 100).toFixed(1) + '%"></span></span><span class="hb-val">' + (fmt || N)(r.v) + (opt.share && total ? ' <small>' + P(r.v / total * 100, 0) + '</small>' : '') + '</span></li>';
    }).join('') + '</ul>';
  }
  // 날짜별 꺾은선 (SVG)
  function lineChart(labels, series, fmt) {
    var narrow = window.innerWidth < 640;
    var W0 = narrow ? 420 : 720, H0 = narrow ? 240 : 230, L = 40, R = 10, T = 14, B = 28;
    var all = [];
    series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) all.push(v); }); });
    var max = Math.max.apply(null, all.concat([1]));
    // 눈금 4칸이 정수로 떨어지게
    var unit = Math.max(1, Math.pow(10, Math.floor(Math.log10(max / 4))));
    var nice = Math.max(4, Math.ceil(max / (4 * unit)) * 4 * unit);
    var n = labels.length, iw = W0 - L - R, ih = H0 - T - B;
    var x = function (i) { return L + (n === 1 ? iw / 2 : i / (n - 1) * iw); };
    var y = function (v) { return T + ih - v / nice * ih; };
    var g = '';
    for (var k = 0; k <= 4; k++) {
      var gv = nice / 4 * k, gy = y(gv);
      g += '<line x1="' + L + '" x2="' + (W0 - R) + '" y1="' + gy + '" y2="' + gy + '" class="grid"/><text x="' + (L - 8) + '" y="' + (gy + 4) + '" text-anchor="end" class="ax">' + (fmt || N)(Math.round(gv * 10) / 10) + '</text>';
    }
    var every = Math.max(1, Math.ceil(n / (narrow ? 5 : 8)));
    labels.forEach(function (lb, i) { if (i % every === 0 || (i === n - 1 && (n - 1) % every >= every / 2)) g += '<text x="' + x(i) + '" y="' + (H0 - 8) + '" text-anchor="middle" class="ax">' + esc(lb) + '</text>'; });
    series.forEach(function (s, si) {
      var pts = [];
      s.values.forEach(function (v, i) { if (v != null) pts.push([x(i), y(v), v, i]); });
      if (pts.length > 1) g += '<path class="ln ln' + si + '" d="M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + '"/>';
      pts.forEach(function (p) { g += '<circle class="pt pt' + si + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (n > 40 ? 2 : 3.5) + '"><title>' + esc(labels[p[3]] + ' ' + s.name + ' ' + (fmt || N)(p[2])) + '</title></circle>'; });
    });
    var legend = '<p class="legend">' + series.map(function (s, i) { return '<span class="lg lg' + i + '">' + esc(s.name) + '</span>'; }).join('') + '</p>';
    var summary = series.map(function (s) { var t = s.values.reduce(function (a, b) { return a + (b || 0); }, 0); return s.name + ' 합계 ' + N(t); }).join(', ');
    return legend + '<svg class="chart" viewBox="0 0 ' + W0 + ' ' + H0 + '" role="img" aria-label="' + esc(summary) + '">' + g + '</svg>';
  }
  function hourChart(hours) {
    var arr = []; for (var i = 0; i < 24; i++) arr.push(0);
    hours.forEach(function (h) { arr[h.hr] = h.pv; });
    var max = Math.max.apply(null, arr.concat([1]));
    return '<div class="hours" role="img" aria-label="시간대별 페이지뷰">' + arr.map(function (v, h) { return '<span title="' + h + '시 ' + N(v) + '"><i style="height:' + Math.max(2, v / max * 100) + '%"></i>' + (h % 6 === 0 ? '<em>' + h + '시</em>' : '') + '</span>'; }).join('') + '</div>';
  }
  function funnel(steps) {
    var first = steps[0].v || 0;
    return '<ol class="funnel">' + steps.map(function (s, i) {
      var prev = i ? steps[i - 1].v : null;
      var w = first ? Math.max(2, (s.v || 0) / first * 100) : 2;
      return '<li><div class="fn-head"><b>' + s.label + '</b><span>' + (s.v == null ? '입력 전' : N(s.v)) + (i && s.v != null && prev ? ' <small>앞 단계의 ' + P(s.v / prev * 100) + '</small>' : '') + '</span></div><span class="fn-bar"><i style="width:' + (s.v == null ? 0 : w.toFixed(1)) + '%"></i></span>' + (s.note ? '<small class="muted">' + s.note + '</small>' : '') + '</li>';
    }).join('') + '</ol>';
  }

  // ---------- 들어가기 ----------
  var login = $('[data-login]', root), app = $('[data-body]', root), lform = $('[data-login-form]', root), lmsg = $('.form-msg', lform);
  var health = {};
  fetch('/api/health').then(function (r) { return r.json(); }).then(function (h) {
    health = h;
    var miss = [];
    if (!h.db) miss.push('D1 데이터베이스를 <b>DB</b>라는 이름으로 연결하기');
    if (!h.admin) miss.push('비밀 값 <b>ADMIN_PASSWORD</b> 넣기 (Cloudflare → Workers & Pages → myeonmyeon → 설정 → 변수 및 비밀)');
    if (miss.length) login.insertAdjacentHTML('beforeend', '<div class="notice"><b>Cloudflare 설정이 아직 끝나지 않았어요.</b> 아래를 마친 뒤 다시 배포해 주세요. 자세한 순서는 README에 있어요.<ol>' + miss.map(function (m) { return '<li>' + m + '</li>'; }).join('') + '</ol></div>');
  }).catch(function () {
    login.insertAdjacentHTML('beforeend', '<div class="notice">서버 기능(/api)에 연결하지 못했어요. 이 화면은 Cloudflare에 배포한 주소에서 열어 주세요.</div>');
  });
  function saveToken(t, remember) {
    try {
      sessionStorage.removeItem(TOK); localStorage.removeItem(TOK);
      if (t) (remember ? localStorage : sessionStorage).setItem(TOK, t);
    } catch (e) { /* 무시 */ }
  }
  function logout(msg) {
    token = ''; saveToken('');
    app.hidden = true; login.hidden = false;
    if (msg) { lmsg.className = 'form-msg err'; lmsg.textContent = msg; }
  }
  lform.addEventListener('submit', function (e) {
    e.preventDefault();
    lmsg.className = 'form-msg'; lmsg.textContent = '확인하는 중이에요';
    var remember = lform.elements.remember.checked;
    fetch('/api/admin-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pw: lform.elements.pw.value, remember: remember }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) {
        if (!j.ok) { lmsg.className = 'form-msg err'; lmsg.textContent = j.message || '들어가지 못했어요.'; return; }
        token = j.token; saveToken(token, remember);
        lform.elements.pw.value = '';
        // 운영자 기기의 방문은 지표에서 빼요 (설정에서 바꿀 수 있어요)
        try { if (localStorage.getItem('mm-notrack-set') !== '1') { localStorage.setItem('mm-notrack', '1'); localStorage.setItem('mm-notrack-set', '1'); } } catch (e2) { /* 무시 */ }
        start();
      }).catch(function () { lmsg.className = 'form-msg err'; lmsg.textContent = '서버에 연결하지 못했어요.'; });
  });
  $('[data-logout]', root).addEventListener('click', function () { logout('로그아웃했어요.'); });

  var started = false;
  function start() {
    login.hidden = true; app.hidden = false;
    if (started) { route(); return; }
    started = true;
    Promise.all([
      RS.loadRamen().then(function (d) { gamesData = { games: d.ramen }; d.ramen.forEach(function (g) { gamesBySlug[g.s] = g; }); }).catch(function () { gamesData = { games: [] }; }),
      fetch('/data/shop.json').then(function (r) { return r.json(); }).then(function (d) { shopData = d; }).catch(function () { shopData = { items: {} }; }),
    ]).then(function () { route(); refreshCounts(); });
  }
  if (token) {
    api('system').then(function (j) { if (j._status === 200) start(); else logout(j._status === 401 ? '' : (j.message || '')); });
  }

  // ---------- 화면 바꾸기 ----------
  var ROUTES = {
    home: ['대시보드', '', renderHome],
    'kpi/overview': ['한눈에 보기', '지표', kpiOverview, true],
    'kpi/content': ['페이지·라면', '지표', kpiContent, true],
    'kpi/traffic': ['유입 경로', '지표', kpiTraffic, true],
    'kpi/shop': ['구매·전환', '지표', kpiShop, true],
    'kpi/engage': ['검색·참여', '지표', kpiEngage, true],
    'kpi/live': ['실시간', '지표', kpiLive],
    content: ['원고 관리', '운영', loadContent],
    photos: ['라면 사진', '운영', loadPhotos],
    reports: ['제보·오류', '운영', loadReports],
    inquiries: ['문의함', '운영', loadInq],
    community: ['커뮤니티', '운영', loadCm],
    demo: ['시험 데이터', '운영', loadDemo],
    shop: ['쇼핑 링크', '라면몰', loadShop],
    coupang: ['쿠팡 실적 입력', '라면몰', loadCp],
    settings: ['설정·도움말', '설정', loadSettings],
  };
  var shown = {}, current = '', liveTimer = null;
  function panelOf(r) { return $('#a-' + r.replace('/', '-')); }
  function route() {
    var r = (location.hash.match(/^#\/(.+)$/) || [])[1] || 'home';
    if (!ROUTES[r]) r = 'home';
    current = r;
    var def = ROUTES[r];
    $$('.adm-panel', root).forEach(function (p) { p.hidden = true; });
    $$('[data-route]', root).forEach(function (a) { if (a.dataset.route === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('[data-title]', root).textContent = def[0];
    $('[data-crumb]', root).textContent = def[1] || '';
    var per = $('[data-period]', root);
    per.hidden = !def[3];
    if (def[3]) paintPeriod();
    var p = panelOf(r);
    p.hidden = false;
    clearInterval(liveTimer);
    var key = r + (def[3] ? '|' + periodKey() : '');
    if (!def[3] || shown[r] !== key) { shown[r] = key; p.innerHTML = '<p class="adm-empty">불러오는 중이에요</p>'; def[2](p); }
    document.title = def[0] + ' - 운영 관리';
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', function () { if (started && !app.hidden) route(); });
  function refreshCounts() {
    api('kpi/dash').then(function (j) {
      if (!j.ok) return;
      ['reports', 'inquiries', 'flags'].forEach(function (k) {
        var el = $('[data-count="' + k + '"]', root);
        if (el) { el.textContent = j.todo[k]; el.hidden = !j.todo[k]; }
      });
    });
  }

  // ---------- 기간 ----------
  var kstToday = function () { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); };
  var addDay = function (day, n) { return new Date(Date.parse(day + 'T00:00:00Z') + n * 86400e3).toISOString().slice(0, 10); };
  var period = { p: '7', from: '', to: '' };
  try { period = JSON.parse(sessionStorage.getItem('mm-admin-period')) || period; } catch (e) { /* 무시 */ }
  function rangeOf() {
    var t = kstToday();
    if (period.p === 'today') return [t, t];
    if (period.p === 'yday') return [addDay(t, -1), addDay(t, -1)];
    if (period.p === 'custom' && period.from && period.to) return [period.from, period.to];
    var n = Number(period.p) || 7;
    return [addDay(t, -(n - 1)), t];
  }
  var periodKey = function () { return rangeOf().join('~'); };
  var qs = function () { var r = rangeOf(); return 'from=' + r[0] + '&to=' + r[1]; };
  function paintPeriod() {
    var el = $('[data-period]', root), r = rangeOf();
    var opts = [['today', '오늘'], ['yday', '어제'], ['7', '7일'], ['30', '30일'], ['90', '90일'], ['custom', '직접']];
    el.innerHTML = '<div class="seg" role="radiogroup" aria-label="기간">' + opts.map(function (o) { return '<button type="button" role="radio" aria-checked="' + (period.p === o[0]) + '" data-p="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<form class="per-custom" data-custom' + (period.p === 'custom' ? '' : ' hidden') + '><input type="date" name="from" value="' + r[0] + '" max="' + kstToday() + '" aria-label="시작일"><span>~</span><input type="date" name="to" value="' + r[1] + '" max="' + kstToday() + '" aria-label="종료일"><button class="btn btn-sub btn-sm" type="submit">보기</button></form>' +
      '<p class="per-text">' + md(r[0]) + (r[0] !== r[1] ? ' ~ ' + md(r[1]) : '') + ' · 비교: 바로 앞 같은 기간</p>';
  }
  $('[data-period]', root).addEventListener('click', function (e) {
    var b = e.target.closest('[data-p]'); if (!b) return;
    period.p = b.dataset.p;
    if (period.p === 'custom') { var r = rangeOf(); period.from = period.from || r[0]; period.to = period.to || r[1]; }
    try { sessionStorage.setItem('mm-admin-period', JSON.stringify(period)); } catch (e2) { /* 무시 */ }
    route();
  });
  $('[data-period]', root).addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (!f.elements.from.value || !f.elements.to.value) return;
    period = { p: 'custom', from: f.elements.from.value, to: f.elements.to.value };
    try { sessionStorage.setItem('mm-admin-period', JSON.stringify(period)); } catch (e2) { /* 무시 */ }
    route();
  });
  function csvLink(kind, label) {
    return '<button type="button" class="btn btn-ghost btn-sm" data-csv="' + kind + '">' + (label || 'CSV 내려받기') + '</button>';
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-csv]'); if (!b) return;
    fetch('/api/admin/kpi/csv?kind=' + b.dataset.csv + '&' + qs(), { headers: { 'x-admin-token': token } }).then(function (r) {
      if (!r.ok) { RS.toast('내려받지 못했어요'); return; }
      return r.blob().then(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'myeonmyeon-' + b.dataset.csv + '-' + periodKey().replace('~', '_') + '.csv';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      });
    });
  });
  function failBox(p, j) { p.innerHTML = '<p class="notice">' + esc((j && j.message) || '불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.') + '</p>'; }

  // ---------- 지표 설명 ----------
  var GLOSSARY = [
    ['방문자', '기간 안에 들어온 브라우저 수예요. 브라우저마다 저장한 무작위 번호로 세요. 같은 사람이라도 휴대폰과 PC는 따로 세져요.'],
    ['방문', '30분 넘게 아무 페이지도 열지 않으면 다음에 들어올 때 새 방문으로 세요. (구글 애널리틱스의 세션과 같은 뜻)'],
    ['페이지뷰', '페이지를 연 횟수예요.'],
    ['평균 체류 시간', '페이지를 화면에 띄워 두고 실제로 보고 있던 시간의 평균이에요. 다른 탭으로 옮긴 시간은 빼요. 한 페이지는 30분까지만 세요.'],
    ['이탈률', '한 페이지만 보고 구매 버튼도 누르지 않은 방문의 비율이에요. 낮을수록 좋아요.'],
    ['신규 방문자', '그날 처음 생긴 방문자 번호예요. 브라우저 데이터를 지운 사람도 새로 세져요.'],
    ['구매 버튼 클릭', '쿠팡으로 가는 구매 버튼(/go/)을 누른 횟수예요. 검색 로봇은 빼요.'],
    ['구매 클릭률', '구매 버튼을 한 번 이상 누른 방문 ÷ 전체 방문이에요.'],
    ['쿠팡 주문·구매액·수익', '쿠팡 파트너스 리포트의 숫자를 ‘쿠팡 실적 입력’에 옮겨 적은 값이에요. 링크를 누르고 24시간 안의 모든 구매가 들어가요(다른 상품 포함). 리포트에는 다음 날 오후 4시쯤 반영돼요.'],
    ['구매 전환율', '쿠팡 주문 수 ÷ 우리 사이트 구매 버튼 클릭 수예요. 실적을 입력한 날만 계산해요.'],
    ['끝까지 읽음', '라면 페이지를 90% 넘게 스크롤한 비율이에요.'],
  ];
  var glossaryHTML = '<dl class="gloss">' + GLOSSARY.map(function (g) { return '<dt>' + g[0] + '</dt><dd>' + g[1] + '</dd>'; }).join('') + '</dl>';

  // ---------- 대시보드 ----------
  function renderHome(p) {
    Promise.all([api('kpi/dash'), api('system')]).then(function (r) {
      var j = r[0], s = r[1];
      if (!j.ok) { failBox(p, j); return; }
      var t = j.t, y = j.y;
      var todo = [
        ['#/reports', '새 제보·오류', j.todo.reports, '틀린 정보와 새 라면 제보예요. 원고를 고친 뒤 처리 완료로 옮겨 주세요.'],
        ['#/inquiries', '새 문의', j.todo.inquiries, '문의하기 양식으로 들어온 글이에요.'],
        ['#/community', '커뮤니티 신고', j.todo.flags, '회원이 신고한 글·댓글·기록이에요.'],
      ];
      var cpGap = j.cpLast ? Math.round((Date.parse(j.today) - Date.parse(j.cpLast)) / 86400e3) : null;
      var todoHTML = '<ul class="todo">' + todo.map(function (x) {
        return '<li class="' + (x[2] ? 'on' : '') + '"><a href="' + x[0] + '"><b>' + x[1] + '</b><span class="todo-n">' + x[2] + '</span></a><small>' + x[3] + '</small></li>';
      }).join('') +
        '<li class="' + (cpGap == null || cpGap > 2 ? 'on' : '') + '"><a href="#/coupang"><b>쿠팡 실적 입력</b><span class="todo-n">' + (j.cpLast ? md(j.cpLast) : '처음') + '</span></a><small>' + (j.cpLast ? '마지막으로 넣은 날짜예요. 파트너스 리포트의 어제 숫자를 옮겨 적으면 전환율이 보여요.' : '아직 넣은 실적이 없어요. 파트너스 리포트의 일별 숫자를 옮겨 적어 주세요.') + '</small></li>' +
        '<li><a href="#/demo"><b>시험 데이터</b><span class="todo-n">확인</span></a><small>문을 열기 전에는 시험 데이터를 꼭 지워 주세요.</small></li></ul>';
      var setup = [
        ['D1 데이터베이스(DB)', true, '연결됨'],
        ['관리자 비밀번호', true, '설정됨'],
        ['쿠팡 파트너스 API 키', s.coupangApi, s.coupangApi ? '설정됨' : '최종 승인 뒤 넣으면 링크 자동 만들기를 쓸 수 있어요'],
        ['새 문의 알림(INQUIRY_WEBHOOK_URL)', s.webhook, s.webhook ? '설정됨' : '선택 사항'],
        ['방문 통계', !!s.firstDay, s.firstDay ? md(s.firstDay) + '부터 모으는 중' : '첫 방문을 기다리는 중'],
      ];
      p.innerHTML =
        '<div class="kpi-grid kpi-4">' +
        kpiCard('오늘 방문자', N(t.uv), '어제 ' + N(y.uv), '') +
        kpiCard('오늘 페이지뷰', N(t.pv), '어제 ' + N(y.pv), '') +
        kpiCard('오늘 구매 버튼 클릭', N(t.clicks), '어제 ' + N(y.clicks), '') +
        kpiCard('지금 보고 있는 사람', N(j.live), '최근 5분', '<a class="small" href="#/kpi/live">실시간 보기</a>') +
        '</div>' +
        '<div class="adm-cols">' +
        card('최근 14일', lineChart(j.days.map(function (d) { return md(d.day); }), [{ name: '방문자', values: j.days.map(function (d) { return d.uv; }) }, { name: '구매 버튼 클릭', values: j.days.map(function (d) { return d.clicks; }) }]), '<a class="small" href="#/kpi/overview">지표 자세히</a>') +
        card('할 일', todoHTML) +
        '</div><div class="adm-cols">' +
        card('이번 주 많이 본 라면', bars(j.games.map(function (g) { return { label: '<a href="/ramen/' + g.slug + '/" target="_blank">' + esc(gameName(g.slug)) + '</a>', v: g.pv }; }), N, { empty: '아직 라면 페이지 기록이 없어요.' })) +
        card('설정 상태', '<ul class="setup">' + setup.map(function (x) { return '<li class="' + (x[1] ? 'ok' : 'no') + '"><b>' + x[0] + '</b><span>' + x[2] + '</span></li>'; }).join('') + '</ul><p class="small muted">자세한 내용은 <a href="#/settings">설정·도움말</a>에 있어요.</p>') +
        '</div>' +
        card('바로가기', '<div class="quick">' + [
          ['/', '면면 사이트'], ['https://partners.coupang.com/#affiliate/ws/report/trend/daily', '쿠팡 파트너스 리포트'], ['https://dash.cloudflare.com/', 'Cloudflare'],
          ['https://github.com/' + repo, 'GitHub 저장소'], ['https://searchadvisor.naver.com/', '네이버 서치어드바이저'], ['https://search.google.com/search-console', '구글 서치 콘솔'],
        ].map(function (q) { return '<a class="btn btn-ghost btn-sm" href="' + q[0] + '" target="_blank" rel="noopener">' + q[1] + '</a>'; }).join('') + '</div>');
      refreshCounts();
    });
  }

  // ---------- 지표: 한눈에 보기 ----------
  var trendMetric = 'uv';
  function kpiOverview(p) {
    api('kpi/summary?' + qs()).then(function (j) {
      if (!j.ok) { failBox(p, j); return; }
      var c = j.cur, v = j.prev;
      var cvr = c.cpDays ? pct(c.orders, c.clicks) : null, pcvr = v.cpDays ? pct(v.orders, v.clicks) : null;
      var visit = '<div class="kpi-grid">' +
        kpiCard('방문자', N(c.uv), '신규 ' + N(c.newUv) + (c.uv ? ' (' + P(c.newUv / c.uv * 100, 0) + ')' : ''), delta(c.uv, v.uv)) +
        kpiCard('방문', N(c.ses), '', delta(c.ses, v.ses)) +
        kpiCard('페이지뷰', N(c.pv), '방문당 ' + c.pps + '쪽', delta(c.pv, v.pv)) +
        kpiCard('평균 체류 시간', D(c.dur), '방문당 ' + D(c.sesDur), delta(c.dur, v.dur)) +
        kpiCard('이탈률', P(c.bounce), '한 페이지만 보고 나감', delta(c.bounce, v.bounce, true)) +
        kpiCard('라면 페이지 조회', N(c.gamePv), '라면 페이지 페이지뷰', delta(c.gamePv, v.gamePv)) +
        '</div>';
      var buy = '<div class="kpi-grid">' +
        kpiCard('구매 버튼 클릭', N(c.clicks), '누른 방문자 ' + N(c.clickUv), delta(c.clicks, v.clicks)) +
        kpiCard('구매 클릭률', P(c.ctr, 2), '구매 버튼을 누른 방문 비율', delta(c.ctr, v.ctr)) +
        kpiCard('쿠팡 주문', c.cpDays ? N(c.orders) : '입력 전', c.cpDays ? c.cpDays + '일 입력됨' : '<a href="#/coupang">실적 입력하기</a>', c.cpDays ? delta(c.orders, v.orders) : '') +
        kpiCard('구매 전환율', cvr == null ? '–' : P(cvr, 2), '주문 ÷ 구매 버튼 클릭', cvr == null ? '' : delta(cvr, pcvr)) +
        kpiCard('구매액', c.cpDays ? W(c.gmv) : '–', '쿠팡 리포트 합산 금액', c.cpDays ? delta(c.gmv, v.gmv) : '') +
        kpiCard('수익', c.cpDays ? W(c.commission) : '–', '파트너스 수수료(지급 전)', c.cpDays ? delta(c.commission, v.commission) : '') +
        '</div>';
      var eng = '<div class="kpi-grid">' +
        kpiCard('새 회원', N(c.signups), '', delta(c.signups, v.signups)) +
        kpiCard('한 그릇 기록', N(c.reviews), '시험 데이터 빼고', delta(c.reviews, v.reviews)) +
        kpiCard('게시글', N(c.posts), '공지 빼고', delta(c.posts, v.posts)) +
        kpiCard('댓글', N(c.comments), '', delta(c.comments, v.comments)) +
        '</div>';
      var M = { uv: ['방문자', 'uv'], ses: ['방문', 'ses'], pv: ['페이지뷰', 'pv'], clicks: ['구매 버튼 클릭', 'clicks'], orders: ['쿠팡 주문', 'orders'] };
      var trend = function () {
        var m = M[trendMetric];
        return lineChart(j.days.map(function (d) { return md(d.day); }), [{ name: m[0], values: j.days.map(function (d) { return d[m[1]]; }) }]);
      };
      p.innerHTML =
        '<h2 class="adm-h">방문</h2>' + visit +
        '<h2 class="adm-h">구매 연결 (쿠팡 파트너스)</h2>' + buy +
        '<h2 class="adm-h">참여</h2>' + eng +
        '<div class="adm-cols">' +
        card('날짜별 흐름', '<div class="seg seg-sm" role="radiogroup" aria-label="지표 고르기" data-trend>' + Object.keys(M).map(function (k) { return '<button type="button" role="radio" aria-checked="' + (k === trendMetric) + '" data-m="' + k + '">' + M[k][0] + '</button>'; }).join('') + '</div><div data-chart>' + trend() + '</div>', csvLink('daily', '일별 CSV')) +
        card('구매로 이어지는 흐름', funnel([
          { label: '방문', v: c.ses },
          { label: '라면 페이지를 본 방문', v: c.gameSes },
          { label: '구매 버튼을 누른 방문', v: c.clickSes },
          { label: '쿠팡 주문', v: c.cpDays ? c.orders : null, note: c.cpDays ? '쿠팡 리포트 기준(24시간 안의 모든 구매)' : '쿠팡 실적을 입력하면 보여요' },
        ])) +
        '</div><div class="adm-cols adm-cols-3">' +
        card('많이 본 라면', bars(j.games.map(function (g) { return { label: esc(gameName(g.slug)), v: g.pv }; })), '<a class="small" href="#/kpi/content">전체</a>') +
        card('많이 본 페이지', bars(j.pages.map(function (g) { return { label: esc(pageName(g.path)), v: g.pv }; })), '<a class="small" href="#/kpi/content">전체</a>') +
        card('들어온 경로', bars(j.channels.map(function (g) { return { label: esc(CH[g.ch] || g.ch), v: g.ses }; }), N, { share: true }), '<a class="small" href="#/kpi/traffic">전체</a>') +
        '</div>' +
        '<details class="adm-card adm-details"><summary>지표 설명</summary>' + glossaryHTML + '</details>';
      $('[data-trend]', p).addEventListener('click', function (e) {
        var b = e.target.closest('[data-m]'); if (!b) return;
        trendMetric = b.dataset.m;
        $$('[data-m]', p).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
        $('[data-chart]', p).innerHTML = trend();
      });
    }).catch(function () { failBox(p); });
  }

  // ---------- 지표: 페이지·라면 ----------
  function kpiContent(p) {
    api('kpi/content?' + qs()).then(function (j) {
      if (!j.ok) { failBox(p, j); return; }
      var clk = {}, ev = {}, rv = {};
      j.gameClicks.forEach(function (x) { clk[x.slug] = x; });
      j.gameEvents.forEach(function (x) { (ev[x.slug] = ev[x.slug] || {})[x.t] = x.n; });
      j.reviews.forEach(function (x) { rv[x.slug] = x; });
      var seen = {};
      var rows = j.games.map(function (g) {
        seen[g.slug] = 1;
        var c = clk[g.slug] || {}, e = ev[g.slug] || {}, r = rv[g.slug] || {};
        return ['<a href="/ramen/' + g.slug + '/" target="_blank">' + esc(gameName(g.slug)) + '</a>', N(g.pv), N(g.uv), { h: D(g.dur), s: Math.round(g.dur || 0) }, P(g.done, 0), N(e.compare || 0), N(c.clicks || 0), { h: P(pct(c.ses || 0, g.ses), 1), s: pct(c.ses || 0, g.ses) || 0 }, N(r.n || 0), r.rating ? r.rating.toFixed(1) : '–'];
      });
      var unseen = (gamesData.games || []).filter(function (g) { return !seen[g.s]; });
      p.innerHTML =
        card('라면별 성과', tableHTML(['라면', '조회', '방문자', '평균 체류', '끝까지 읽음', '비교에 쓰임', '구매 클릭', '구매 클릭률', '기록(누적)', '평균 별점'], rows, { sort: true, empty: '이 기간에 라면 페이지 기록이 없어요.' }) +
          (unseen.length ? '<p class="small muted">이 기간에 한 번도 열리지 않은 라면 ' + unseen.length + '개: ' + unseen.slice(0, 30).map(function (g) { return esc(g.n); }).join(', ') + (unseen.length > 30 ? ' 외' : '') + '</p>' : '') +
          '<p class="small muted">표 머리를 누르면 정렬돼요. 구매 클릭률은 그 라면 페이지를 본 방문 가운데 그 페이지에서 구매 버튼을 누른 방문의 비율이에요. 평균 별점은 5점 만점이에요.</p>') +
        card('페이지별', tableHTML(['페이지', '페이지뷰', '방문자', '평균 체류', '평균 스크롤', '들어온 수'], j.pages.map(function (x) {
          return [pageCell(x.path), N(x.pv), N(x.uv), { h: D(x.dur), s: Math.round(x.dur || 0) }, P(x.dep, 0), N(x.entries)];
        }), { sort: true }), csvLink('pages')) +
        card('처음 들어온 페이지', tableHTML(['페이지', '들어온 수', '바로 나간 비율'], j.landing.map(function (x) {
          return [pageCell(x.path), N(x.entries), { h: P(pct(x.single, x.entries), 0), s: pct(x.single, x.entries) || 0 }];
        }), { sort: true }) + '<p class="small muted">바로 나간 비율이 높은 첫 페이지는 제목·첫 화면을 손볼 후보예요.</p>');
    }).catch(function () { failBox(p); });
  }

  // ---------- 지표: 유입 경로 ----------
  function kpiTraffic(p) {
    api('kpi/traffic?' + qs()).then(function (j) {
      if (!j.ok) { failBox(p, j); return; }
      var totalSes = j.devices.reduce(function (n, d) { return n + d.ses; }, 0);
      var vis = j.visitors || {};
      p.innerHTML =
        card('들어온 경로', tableHTML(['경로', '방문', '방문자', '바로 나간 비율', '구매 버튼 누른 방문', '구매 클릭률'], j.channels.map(function (x) {
          return [esc(CH[x.ch] || x.ch), N(x.ses), N(x.uv), { h: P(pct(x.single, x.ses), 0), s: pct(x.single, x.ses) || 0 }, N(x.buyers), { h: P(pct(x.buyers, x.ses), 1), s: pct(x.buyers, x.ses) || 0 }];
        }), { sort: true }) + '<p class="small muted">방문이 시작된 첫 페이지 기준이에요. 카카오톡·인스타그램 앱 안 브라우저는 이전 주소를 알려 주지 않아 앱 이름으로 나눠요.</p>') +
        '<div class="adm-cols">' +
        card('기기', bars(j.devices.map(function (d) { return { label: DEV[d.dev] || d.dev, v: d.ses }; }), N, { share: true }) + '<p class="small muted">방문 ' + N(totalSes) + '번 기준</p>') +
        card('새로 온 방문자와 다시 온 방문자', bars([{ label: '처음 온 방문자', v: vis.nv || 0 }, { label: '다시 온 방문자', v: Math.max(0, (vis.n || 0) - (vis.nv || 0)) }], N, { share: true })) +
        '</div>' +
        card('시간대 (한국 시간)', hourChart(j.hours) + '<p class="small muted">페이지뷰 기준. 공지·투표를 올릴 시간을 정할 때 참고하세요.</p>') +
        '<div class="adm-cols">' +
        card('이전 사이트', tableHTML(['사이트', '방문'], j.refs.map(function (x) { return [esc(x.ref), N(x.ses)]; }), { empty: '다른 사이트에서 들어온 기록이 없어요.' })) +
        card('검색어', tableHTML(['검색어', '경로', '방문'], j.keywords.map(function (x) { return [esc(x.kw), esc(CH[x.ch] || x.ch), N(x.ses)]; }), { empty: '검색어를 알 수 있는 방문이 아직 없어요. 네이버·구글은 대부분 검색어를 넘겨주지 않아요. 서치어드바이저·서치 콘솔에서 확인하세요.' })) +
        '</div><div class="adm-cols">' +
        card('캠페인 링크(utm)', tableHTML(['source/medium/campaign', '방문'], j.utm.map(function (x) { return [esc(x.utm), N(x.ses)]; }), { empty: '캠페인 링크로 들어온 방문이 없어요. 홍보 글에 ?utm_source=instagram&utm_campaign=이름 을 붙이면 따로 세져요.' })) +
        card('국가', bars(j.countries.map(function (x) { return { label: esc(x.cc || '알 수 없음'), v: x.ses }; }), N, { share: true })) +
        '</div>';
    }).catch(function () { failBox(p); });
  }

  // ---------- 지표: 구매·전환 ----------
  function kpiShop(p) {
    api('kpi/shop?' + qs()).then(function (j) {
      if (!j.ok) { failBox(p, j); return; }
      var t = j.totals, totalClicks = t.clicks;
      var cvr = t.cpDays ? pct(t.orders, t.clicks) : null;
      var shopCtr = pct(j.shopClicks.ses, j.shopPage.ses);
      p.innerHTML =
        '<div class="kpi-grid">' +
        kpiCard('구매 버튼 클릭', N(t.clicks), '누른 방문자 ' + N(t.clickUv)) +
        kpiCard('구매 클릭률', P(t.ctr, 2), '전체 방문 기준') +
        kpiCard('라면몰 방문', N(j.shopPage.ses), '페이지뷰 ' + N(j.shopPage.pv)) +
        kpiCard('라면몰 클릭률', P(shopCtr, 1), '라면몰을 본 방문 가운데 구매 버튼을 누른 비율') +
        kpiCard('쿠팡 주문', t.cpDays ? N(t.orders) : '입력 전', t.cpDays ? '취소 ' + N(t.cancels) : '<a href="#/coupang">실적 입력하기</a>') +
        kpiCard('구매 전환율', cvr == null ? '–' : P(cvr, 2), '주문 ÷ 구매 버튼 클릭') +
        kpiCard('구매액', t.cpDays ? W(t.gmv) : '–', t.orders ? '주문당 ' + W(Math.round(t.gmv / t.orders)) : '') +
        kpiCard('수익', t.cpDays ? W(t.commission) : '–', t.clicks && t.cpDays ? '클릭당 ' + W(Math.round(t.commission / t.clicks)) : '') +
        '</div>' +
        '<div class="adm-cols">' +
        card('어디서 눌렀나요', bars(j.sources.map(function (x) { return { label: esc(SRC[x.src] || x.src), v: x.clicks }; }), N, { share: true, empty: '이 기간에 구매 버튼 클릭이 없어요.' })) +
        card('쿠팡 실적 (입력한 날)', tableHTML(['날짜', '쿠팡 클릭', '주문', '구매액', '수익'], j.cp.map(function (x) { return [md(x.day), N(x.clicks), N(x.orders), W(x.gmv), W(x.commission)]; }), { empty: '이 기간에 입력한 실적이 없어요.' }), '<a class="small" href="#/coupang">입력하기</a>') +
        '</div>' +
        card('상품별 클릭', tableHTML(['상품', '클릭', '클릭한 방문자', '비중'], j.items.map(function (x) {
          return [esc(itemName(x.item)) + '<br><small class="muted">' + esc(x.item) + '</small>', N(x.clicks), N(x.uv), P(pct(x.clicks, totalClicks), 1)];
        }), { sort: true, empty: '이 기간에 구매 버튼 클릭이 없어요.' }), csvLink('items')) +
        '<div class="notice small"><b>전환은 이렇게 세요.</b> 쿠팡은 파트너스 링크로 들어온 뒤 24시간 안의 모든 구매(다른 상품 포함)를 실적으로 잡아요. 그래서 상품별 주문은 쿠팡 리포트에서만 볼 수 있고, 여기서는 날짜별 합계를 우리 클릭 수와 견줘 전환율을 계산해요. 본인 구매·취소·반품은 수익에서 빠져요.</div>';
    }).catch(function () { failBox(p); });
  }

  // ---------- 지표: 검색·참여 ----------
  function kpiEngage(p) {
    api('kpi/engage?' + qs()).then(function (j) {
      if (!j.ok) { failBox(p, j); return; }
      var c = j.community, mk = {};
      j.marks.forEach(function (x) { mk[x.kind] = x.n; });
      p.innerHTML =
        '<div class="kpi-grid">' +
        kpiCard('새 회원', N(c.signups), '전체 회원 ' + N(c.members)) +
        kpiCard('점수를 받은 회원', N(c.active), '이 기간에 활동한 회원') +
        kpiCard('한 그릇 기록', N(c.reviews)) + kpiCard('게시글', N(c.posts)) + kpiCard('댓글', N(c.comments)) +
        kpiCard('투표 참여', N(c.votes)) + kpiCard('시식회·번개 참여 신청', N(c.joins)) +
        kpiCard('저장·먹어 봤어요', N((mk.saved || 0) + (mk.tried || 0)), '저장 ' + N(mk.saved || 0) + ' · 먹어 봤어요 ' + N(mk.tried || 0) + ' · 먹고 싶어요 ' + N(mk.want || 0)) +
        '</div>' +
        '<div class="adm-cols">' +
        card('사이트 안 검색어', tableHTML(['검색어', '검색', '결과'], j.search.map(function (x) { return [esc(x.k), N(x.n), x.minRes ? N(x.minRes) + '개' : '<span class="badge badge-warn">없음</span>']; }), { empty: '라면을 검색한 기록이 없어요.' }), csvLink('search')) +
        card('결과가 없던 검색어', tableHTML(['검색어', '검색'], j.zero.map(function (x) { return [esc(x.k), N(x.n)]; }), { empty: '결과 없는 검색이 없어요.' }) + '<p class="small muted">찾았는데 없던 라면이에요. 도감에 넣을 후보로 보세요.</p>') +
        '</div>' +
        card('기능 사용', bars(j.features.map(function (x) { return { label: esc(FEAT[x.t] || x.t) + ' <small class="muted">방문자 ' + N(x.uv) + '</small>', v: x.n }; }), N, { empty: '이 기간에 기능 사용 기록이 없어요.' }));
    }).catch(function () { failBox(p); });
  }

  // ---------- 지표: 실시간 ----------
  function kpiLive(p) {
    var draw = function () {
      api('kpi/live').then(function (j) {
        if (!j.ok) { failBox(p, j); return; }
        p.innerHTML =
          '<div class="kpi-grid kpi-3">' + kpiCard('지금 보고 있는 사람', N(j.v5), '최근 5분 방문자') + kpiCard('최근 30분 방문자', N(j.v30)) + kpiCard('최근 30분 페이지뷰', N(j.pv30)) + '</div>' +
          '<div class="adm-cols">' +
          card('최근 30분 페이지', bars(j.pages.map(function (x) { return { label: esc(pageName(x.path)), v: x.uv }; }), N, { empty: '최근 30분 동안 들어온 사람이 없어요.' })) +
          card('최근 24시간 구매 버튼', tableHTML(['시각', '상품', '누른 곳'], j.clicks.map(function (x) { return [hm(x.ts), esc(itemName(x.item)), esc(x.path ? pageName(x.path) : (SRC[x.src] || x.src || '–'))]; }), { empty: '최근 24시간 동안 누른 사람이 없어요.' })) +
          '</div>' +
          card('방금 열린 페이지', tableHTML(['시각', '페이지', '들어온 경로', '기기'], j.recent.map(function (x) { return [hm(x.ts), esc(pageName(x.path)), x.en ? esc(CH[x.ch] || x.ch) : '<span class="muted">사이트 안</span>', DEV[x.dev] || x.dev]; }))) +
          '<p class="small muted">30초마다 새로 고쳐요. 마지막: ' + hm(j.now) + '</p>';
      });
    };
    draw();
    liveTimer = setInterval(function () { if (current === 'kpi/live' && document.visibilityState === 'visible') draw(); }, 30000);
  }

  // ---------- 쿠팡 실적 입력 ----------
  function parsePaste(text) {
    var out = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      var m = line.match(/(20\d{2})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})/);
      if (!m) return;
      var day = m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
      var rest = line.slice(line.indexOf(m[0]) + m[0].length);
      var nums = (rest.match(/-?[\d,]+(\.\d+)?/g) || []).map(function (x) { return Number(x.replace(/,/g, '')); });
      out.push({ day: day, clicks: nums[0] || 0, orders: nums[1] || 0, gmv: nums[2] || 0, commission: nums[3] || 0, cancels: nums[4] || 0 });
    });
    return out;
  }
  function loadCp(p) {
    Promise.all([api('cp'), api('kpi/summary?from=' + addDay(kstToday(), -89) + '&to=' + kstToday())]).then(function (r) {
      var j = r[0], s = r[1];
      if (!j.ok) { failBox(p, j); return; }
      var ours = {};
      (s.days || []).forEach(function (d) { ours[d.day] = d.clicks; });
      var y = addDay(kstToday(), -1);
      p.innerHTML =
        '<div class="notice small"><b>옮겨 적는 순서</b><ol><li><a href="https://partners.coupang.com/#affiliate/ws/report/trend/daily" target="_blank" rel="noopener">쿠팡 파트너스 → 리포트 → 기간별 리포트(일별 실적)</a>에서 날짜별 숫자를 봐요. 숫자는 다음 날 오후 4시쯤 반영돼요.</li><li>아래 칸에 날짜별로 클릭, 구매 건수, 합산 금액, 수익을 넣고 저장해요. 여러 날은 표를 복사해 ‘한꺼번에 붙여 넣기’에 넣으면 돼요.</li><li>저장하면 지표의 구매 전환율·구매액·수익에 바로 쓰여요.</li></ol>쿠팡 파트너스 최종 승인 뒤 Open API 키를 받으면, 이 입력을 자동으로 가져오도록 붙일 수 있어요.</div>' +
        card('하루씩 넣기', '<form class="cp-form" data-cpform>' +
          '<label class="field"><span>날짜</span><input type="date" name="day" value="' + y + '" max="' + kstToday() + '" required></label>' +
          '<label class="field"><span>쿠팡 클릭</span><input name="clicks" inputmode="numeric" placeholder="0"></label>' +
          '<label class="field"><span>구매 건수</span><input name="orders" inputmode="numeric" placeholder="0"></label>' +
          '<label class="field"><span>합산 금액(원)</span><input name="gmv" inputmode="numeric" placeholder="0"></label>' +
          '<label class="field"><span>수익(원)</span><input name="commission" inputmode="numeric" placeholder="0"></label>' +
          '<label class="field"><span>취소 건수</span><input name="cancels" inputmode="numeric" placeholder="0"></label>' +
          '<label class="field cp-memo"><span>메모</span><input name="memo" maxlength="100" placeholder="예: 블로그 글 올린 날"></label>' +
          '<button class="btn btn-main" type="submit">저장</button></form>') +
        card('한꺼번에 붙여 넣기', '<p class="small muted">한 줄에 하루씩, 날짜 다음에 클릭 · 구매 건수 · 합산 금액 · 수익 · 취소 순서로 숫자가 오면 돼요. 쿠팡 리포트 표를 그대로 복사해도 순서가 같으면 읽어요.</p><textarea rows="5" data-paste placeholder="2026-11-17\t12\t1\t32,600\t978\n2026-11-18\t8\t0\t0\t0"></textarea><div class="row-btns"><button type="button" class="btn btn-sub" data-preview>미리 보기</button></div><div data-prev></div>') +
        card('넣은 실적', tableHTML(['날짜', '우리 사이트 클릭', '쿠팡 클릭', '구매 건수', '합산 금액', '수익', '취소', '전환율', ''], j.rows.map(function (x) {
          var ourC = ours[x.day];
          return [md(x.day) + (x.memo ? '<br><small class="muted">' + esc(x.memo) + '</small>' : ''), ourC == null ? '–' : N(ourC), N(x.clicks), N(x.orders), W(x.gmv), W(x.commission), N(x.cancels), ourC ? P(pct(x.orders, ourC), 1) : '–',
            '<span class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-edit=\'' + esc(JSON.stringify(x)) + '\'>고치기</button><button type="button" class="btn btn-ghost btn-sm" data-delday="' + x.day + '">지우기</button></span>'];
        }), { empty: '아직 넣은 실적이 없어요.' }));
      var f = $('[data-cpform]', p);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var el = f.elements, row = { day: el.day.value };
        ['clicks', 'orders', 'gmv', 'commission', 'cancels', 'memo'].forEach(function (k) { row[k] = el[k].value; });
        post('cp/save', { rows: [row] }).then(function (x) { RS.toast(x.ok ? '저장했어요' : (x.message || '저장하지 못했어요')); if (x.ok) { shown = {}; loadCp(p); } });
      });
    }).catch(function () { failBox(p); });
  }
  var cpPreview = [];
  $('#a-coupang').addEventListener('click', function (e) {
    var p = $('#a-coupang'), b = e.target.closest('button'); if (!b) return;
    var f = $('[data-cpform]', p);
    if (b.hasAttribute('data-preview')) {
      cpPreview = parsePaste($('[data-paste]', p).value);
      var box = $('[data-prev]', p);
      if (!cpPreview.length) { box.innerHTML = '<p class="notice small">날짜가 있는 줄을 찾지 못했어요. 2026-11-17처럼 날짜로 시작하게 붙여 넣어 주세요.</p>'; return; }
      box.innerHTML = tableHTML(['날짜', '쿠팡 클릭', '구매 건수', '합산 금액', '수익', '취소'], cpPreview.map(function (x) { return [x.day, N(x.clicks), N(x.orders), W(x.gmv), W(x.commission), N(x.cancels)]; })) +
        '<div class="row-btns"><button type="button" class="btn btn-main" data-saveall>' + cpPreview.length + '일 저장</button></div>';
    }
    if (b.hasAttribute('data-saveall')) post('cp/save', { rows: cpPreview }).then(function (x) { RS.toast(x.ok ? x.saved + '일을 저장했어요' : (x.message || '저장하지 못했어요')); if (x.ok) { shown = {}; loadCp(p); } });
    if (b.dataset.delday) {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = '한 번 더'; return; }
      post('cp/delete', { day: b.dataset.delday }).then(function (x) { RS.toast(x.ok ? '지웠어요' : '지우지 못했어요'); shown = {}; loadCp(p); });
    }
    if (b.dataset.edit && f) {
      var x = JSON.parse(b.dataset.edit), el = f.elements;
      el.day.value = x.day;
      ['clicks', 'orders', 'gmv', 'commission', 'cancels', 'memo'].forEach(function (k) { el[k].value = x[k] || (k === 'memo' ? '' : 0); });
      f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // ---------- 설정·도움말 ----------
  function loadSettings(p) {
    api('system').then(function (s) {
      if (!s.ok) { failBox(p, s); return; }
      var off = false;
      try { off = localStorage.getItem('mm-notrack') === '1'; } catch (e) { off = false; }
      var rows = [
        ['D1 데이터베이스(DB)', '연결됨', true],
        ['관리자 비밀번호(ADMIN_PASSWORD)', '설정됨 · 바꾸면 모든 기기에서 다시 로그인해야 해요', true],
        ['쿠팡 파트너스 API 키', s.coupangApi ? '설정됨' : '없음 · 최종 승인 뒤 COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY를 비밀 값으로 넣어요', s.coupangApi],
        ['새 문의 알림', s.webhook ? '설정됨' : '없음 · 선택 사항(INQUIRY_WEBHOOK_URL)', s.webhook],
        ['비밀번호 보강 값', s.pepper ? '설정됨' : '없음 · 선택 사항(AUTH_PEPPER, 회원이 생기기 전에만 넣으세요)', s.pepper],
      ];
      p.innerHTML =
        card('이 기기', '<p>운영자 기기의 방문은 지표를 흐리게 해요. 처음 로그인할 때 이 브라우저의 방문 통계를 자동으로 껐어요.</p><p><b data-ntstate>' + (off ? '이 브라우저의 방문은 지표에서 빼고 있어요.' : '이 브라우저의 방문도 지표에 들어가요.') + '</b></p><div class="row-btns"><button type="button" class="btn btn-sub" data-nt>' + (off ? '이 브라우저도 세기' : '이 브라우저 빼기') + '</button></div><p class="small muted">휴대폰 등 다른 기기도 빼려면 그 기기에서 개인정보처리방침 페이지의 ‘방문 통계 끄기’를 누르세요.</p>') +
        card('Cloudflare 설정 상태', '<ul class="setup">' + rows.map(function (x) { return '<li class="' + (x[2] ? 'ok' : 'no') + '"><b>' + x[0] + '</b><span>' + x[1] + '</span></li>'; }).join('') + '</ul><p class="small muted">비밀 값은 Cloudflare → Workers & Pages → myeonmyeon → 설정 → 변수 및 비밀에서 넣고, 넣은 뒤에는 다시 배포해야 적용돼요.</p>') +
        card('모은 기록', tableHTML(['종류', '줄 수'], [['페이지뷰 기록', N(s.rows.pv)], ['구매 버튼 기록', N(s.rows.clk)], ['검색·기능 기록', N(s.rows.ev)], ['회원', N(s.rows.users)], ['한 그릇 기록 (시험 데이터 빼고)', N(s.rows.bowls)]]) + '<p class="small muted">' + (s.firstDay ? md(s.firstDay) + '부터 모았어요. ' : '') + '방문 기록은 400일이 지나면 자동으로 지워요. 이름·IP는 모으지 않아요.</p>') +
        card('지표 설명', glossaryHTML) +
        card('로그인', '<p class="small">로그인은 12시간(‘7일 유지’를 고르면 7일) 동안 이어져요. 비밀번호를 15분 안에 8번 틀리면 잠시 막혀요.</p><div class="row-btns"><button type="button" class="btn btn-ghost" data-logout2>로그아웃</button></div>');
      $('[data-nt]', p).addEventListener('click', function () {
        try {
          if (localStorage.getItem('mm-notrack') === '1') localStorage.removeItem('mm-notrack'); else localStorage.setItem('mm-notrack', '1');
          localStorage.setItem('mm-notrack-set', '1');
        } catch (e) { /* 무시 */ }
        loadSettings(p);
      });
      $('[data-logout2]', p).addEventListener('click', function () { logout('로그아웃했어요.'); });
    });
  }

  // ---------- 오류 신고 ----------
  var repStatus = 'new';
  function loadReports(p) {
    p.innerHTML = '<div class="row-btns" role="radiogroup" aria-label="보기">' +
      [['new', '새 신고'], ['done', '처리함'], ['all', '전체']].map(function (x) {
        return '<button type="button" class="chip" role="radio" aria-checked="' + (repStatus === x[0]) + '" data-st="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div><div class="report-list" data-list><p class="muted">불러오는 중이에요</p></div>';
    RS.radioGroup($('[role="radiogroup"]', p), function (b) { repStatus = b.dataset.st; fetchReports(); });
    fetchReports();
  }
  var ghEdit = function () { return 'https://github.com/' + repo + '/edit/' + branch + '/content/ramen.json'; };
  function fetchReports() {
    var box = $('#a-reports [data-list]');
    api('reports?status=' + repStatus).then(function (j) {
      if (j._status !== 200) { box.innerHTML = '<p class="notice">' + esc(j.message || '신고를 불러오지 못했어요.') + '</p>'; return; }
      if (!j.reports.length) { box.innerHTML = '<p class="muted">' + (repStatus === 'new' ? '새 신고가 없어요.' : '신고가 없어요.') + '</p>'; return; }
      box.innerHTML = j.reports.map(function (r) {
        var g = gamesBySlug[r.slug];
        return '<article class="report" data-id="' + r.id + '">' +
          '<div class="report-meta"><span class="badge' + (r.status === 'new' ? ' new' : '') + '">' + (r.status === 'new' ? '새 신고' : '처리함') + '</span>' +
          '<b>' + esc(KIND[r.kind] || r.kind) + '</b><span>' + esc(g ? g.n : (r.slug || '라면과 상관없음')) + '</span><span>' + esc(fmtTime(r.created_at)) + '</span>' +
          (r.page ? '<span>' + esc(r.page) + '</span>' : '') + '</div>' +
          '<p class="report-msg">' + esc(r.message) + '</p>' +
          (r.contact ? '<p class="small">답장 받을 곳: ' + esc(r.contact) + '</p>' : '') +
          '<div class="row-btns">' +
          (r.status === 'new' ? '<button type="button" class="btn btn-sub" data-done>처리 완료</button>' : '<button type="button" class="btn btn-ghost" data-undo>새 신고로 되돌리기</button>') +
          ((g || r.kind === 'newramen') && repo ? '<a class="btn btn-ghost" href="' + ghEdit(r.slug) + '" target="_blank" rel="noopener">원고 고치기</a>' : '') +
          '<button type="button" class="btn btn-ghost" data-del>지우기</button></div></article>';
      }).join('');
    }).catch(function () { box.innerHTML = '<p class="notice">서버에 연결하지 못했어요.</p>'; });
  }
  $('#a-reports').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var cardEl = b.closest('[data-id]'); if (!cardEl) return;
    var id = cardEl.dataset.id;
    if (b.hasAttribute('data-done') || b.hasAttribute('data-undo')) {
      b.disabled = true;
      post('reports/' + id, { status: b.hasAttribute('data-done') ? 'done' : 'new' })
        .then(function (j) { if (j.ok) { cardEl.remove(); RS.toast(b.hasAttribute('data-done') ? '처리 완료로 옮겼어요' : '새 신고로 되돌렸어요'); refreshCounts(); } else { b.disabled = false; RS.toast('바꾸지 못했어요'); } });
    }
    if (b.hasAttribute('data-del')) {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = '한 번 더 누르면 지워요'; return; }
      api('reports/' + id, { method: 'DELETE' }).then(function (j) { if (j.ok) { cardEl.remove(); RS.toast('지웠어요'); refreshCounts(); } else RS.toast('지우지 못했어요'); });
    }
  });

  // ---------- 원고 관리 ----------
  var FILES = [
    ['content/ramen.json', '라면 도감', '라면 하나가 항목 하나예요. 이름, 회사, 형태, 조리 방식, 출시, 판매처, 설명.'],
    ['content/news.json', '신상 레이더', '새로 나온 라면 소식. 날짜, 제목, 내용, 기사 주소, 관련 라면.'],
    ['content/shop.json', '라면몰 진열대', '진열대 이름과 순서, 진열할 라면. ‘이달의 랭킹’과 ‘맵기 도전’은 자동으로 채워요.'],
    ['site.config.json', '사이트 설정', '사이트 주소, 운영자 이름, 연락처, 검색 등록 코드.'],
  ];
  var SAMPLE = '{ "s": "new-ramen", "n": "새 라면 이름", "m": "nongshim", "f": "bag", "c": "soup", "t": [], "y": "2026-12", "hot": 1, "st": "sale", "k": ["검색어"], "d": "한두 문장 설명. 확인한 사실만 적어요." },';
  function loadContent(p) {
    var list = (gamesData && gamesData.games) || [];
    var noForm = list.filter(function (g) { return !g.f; }).length, noHot = list.filter(function (g) { return g.hot == null; }).length, noYear = list.filter(function (g) { return !g.y; }).length;
    p.innerHTML = '<div class="kpi-grid kpi-4">' + kpiCard('도감 라면', N(list.length)) + kpiCard('형태 확인 중', N(noForm), '형태(f)가 비어 있음') + kpiCard('맵기 미분류', N(noHot), '편집부 분류(hot)가 비어 있음') + kpiCard('출시 연도 없음', N(noYear)) + '</div>' +
      '<div class="notice small">원고는 GitHub 저장소의 JSON 파일이에요. ‘고치기’를 누르면 GitHub 편집 화면이 열리고, 아래쪽 <b>Commit changes</b>를 누르면 1~2분 뒤 사이트에 반영돼요. 쉼표 하나가 빠져도 빌드가 멈추니, 저장한 뒤 Cloudflare의 배포 결과를 한 번 확인해 주세요. 빌드가 멈추면 이전 사이트가 그대로 보여요.</div>' +
      card('원고 파일', tableHTML(['파일', '내용', ''], FILES.map(function (f) { return ['<b>' + esc(f[1]) + '</b><br><small class="muted">' + esc(f[0]) + '</small>', esc(f[2]), repo ? '<a class="btn btn-sub btn-sm" href="https://github.com/' + repo + '/edit/' + branch + '/' + f[0] + '" target="_blank" rel="noopener">고치기</a>' : '']; }))) +
      card('새 라면을 넣을 때', '<ol class="list" style="list-style:decimal;padding-left:18px"><li>content/ramen.json을 열고 마지막 라면 항목 아래에 한 줄을 붙여 넣어요. 앞 항목 끝에 쉼표(,)가 있어야 해요.</li><li><b>s</b>는 주소예요. 영문 소문자와 하이픈으로, 다른 라면과 겹치지 않게 정해요.</li><li><b>m</b>(회사)은 위쪽 makers에 있는 이름을 써요. 새 회사라면 makers에도 한 줄 넣어요.</li><li>확실하지 않은 값은 비워 두세요. 형태를 모르면 "f": null로 적으면 ‘확인 중’으로 보여요.</li></ol><p class="small muted">붙여 넣을 예시</p><pre class="code">' + esc(SAMPLE) + '</pre>') +
      card('도감 목록', tableHTML(['라면', '회사', '형태', '조리', '맵기 분류', '출시', '판매'], list.map(function (g) {
        return ['<a href="/ramen/' + g.s + '/" target="_blank">' + esc(g.n) + '</a><br><small class="muted">' + esc(g.s) + '</small>', esc(g.mn), g.f ? esc(RS.D.FORMS[g.f]) : '<span class="badge draft">확인 중</span>', esc(RS.D.STYLES[g.c]), g.hot == null ? '<span class="badge draft">미분류</span>' : esc(RS.D.HOTS[g.hot]), esc(g.y || '–'), esc(RS.D.STATUS[g.st] || g.st)];
      }), { sort: true }));
  }

  // ---------- 문의함 ----------
  var chipsHTML = function (cur, list, attr) {
    return '<div class="row-btns" role="radiogroup">' + list.map(function (x) { return '<button type="button" class="chip" role="radio" aria-checked="' + (cur === x[0]) + '" ' + attr + '="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
  };
  var IKIND = { partner: '제휴·협업', maker: '제조사·브랜드', ad: '광고', ramen: '라면 추가·수정', bug: '오류·불편', etc: '그 밖의 문의' };
  var inqStatus = 'new';
  function loadInq(p) {
    p.innerHTML = chipsHTML(inqStatus, [['new', '새 문의'], ['done', '답변함'], ['all', '전체']], 'data-ist') + '<div data-list><p class="muted">불러오는 중이에요</p></div>';
    RS.radioGroup($('[role="radiogroup"]', p), function (b) { inqStatus = b.dataset.ist; fetchInq(); });
    fetchInq();
  }
  function fetchInq() {
    var box = $('#a-inquiries [data-list]');
    api('inquiries?status=' + inqStatus).then(function (j) {
      if (j._status !== 200) { box.innerHTML = '<p class="notice">' + esc(j.message || '문의를 불러오지 못했어요.') + '</p>'; return; }
      if (!j.inquiries.length) { box.innerHTML = '<p class="muted">' + (inqStatus === 'new' ? '새 문의가 없어요.' : '문의가 없어요.') + '</p>'; return; }
      box.innerHTML = j.inquiries.map(function (r) {
        var reply = 'mailto:' + encodeURIComponent(r.email) + '?subject=' + encodeURIComponent('[면면] ' + (r.title || IKIND[r.kind] + ' 문의') + ' 답변드려요');
        return '<article class="report" data-id="' + r.id + '"><div class="report-meta"><span class="badge' + (r.status === 'new' ? ' new' : '') + '">' + (r.status === 'new' ? '새 문의' : '답변함') + '</span><b>' + esc(IKIND[r.kind] || r.kind) + '</b><span>' + esc(fmtTime(r.created_at)) + '</span></div>' +
          (r.title ? '<p><b>' + esc(r.title) + '</b></p>' : '') + '<p class="report-msg">' + esc(r.message) + '</p>' +
          '<p class="small">' + esc(r.name) + (r.org ? ' · ' + esc(r.org) : '') + ' · <a href="' + reply + '">' + esc(r.email) + '</a>' + (r.phone ? ' · ' + esc(r.phone) : '') + '</p>' +
          '<label class="field"><span class="small">메모</span><input data-memo maxlength="500" value="' + esc(r.memo || '') + '" placeholder="처리 내용을 적어 두세요"></label>' +
          '<div class="row-btns"><a class="btn btn-sub" href="' + reply + '">이메일로 답하기</a>' +
          (r.status === 'new' ? '<button type="button" class="btn btn-sub" data-done>답변함으로 옮기기</button>' : '<button type="button" class="btn btn-ghost" data-undo>새 문의로 되돌리기</button>') +
          '<button type="button" class="btn btn-ghost" data-save>메모 저장</button><button type="button" class="btn btn-ghost" data-del>지우기</button></div></article>';
      }).join('');
    });
  }
  $('#a-inquiries').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var cardEl = b.closest('[data-id]'); if (!cardEl) return;
    var id = cardEl.dataset.id, memo = $('[data-memo]', cardEl).value;
    if (b.hasAttribute('data-done') || b.hasAttribute('data-undo') || b.hasAttribute('data-save')) {
      var st = b.hasAttribute('data-done') ? 'done' : b.hasAttribute('data-undo') ? 'new' : (inqStatus === 'done' ? 'done' : $('.badge.new', cardEl) ? 'new' : 'done');
      post('inquiries/' + id, { status: st, memo: memo }).then(function (j) {
        if (!j.ok) { RS.toast('저장하지 못했어요'); return; }
        RS.toast(b.hasAttribute('data-save') ? '메모를 저장했어요' : '옮겼어요');
        if (!b.hasAttribute('data-save') && inqStatus !== 'all') cardEl.remove();
        refreshCounts();
      });
    }
    if (b.hasAttribute('data-del')) {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = '한 번 더 누르면 지워요'; return; }
      api('inquiries/' + id, { method: 'DELETE' }).then(function (j) { if (j.ok) { cardEl.remove(); RS.toast('지웠어요'); refreshCounts(); } });
    }
  });

  // ---------- 쇼핑 링크 ----------
  function loadShop(p) {
    api('shop?days=30').then(function (j) {
      var shopItems = shopData.items;
      if (j._status !== 200) { p.innerHTML = '<p class="notice">' + esc(j.message || '불러오지 못했어요.') + '</p>'; return; }
      var link = {}, clicks = {};
      j.links.forEach(function (l) { link[l.id] = l.url; });
      j.clicks.forEach(function (c) { clicks[c.id] = c.n; });
      var ids = Object.keys(shopItems).sort(function (a, b) { return (clicks[b] || 0) - (clicks[a] || 0) || (link[a] ? 1 : 0) - (link[b] ? 1 : 0); });
      var done = ids.filter(function (id) { return link[id] || shopItems[id].u; }).length;
      var total = ids.reduce(function (n, id) { return n + (clicks[id] || 0); }, 0);
      p.innerHTML = '<div class="kpi-grid kpi-3">' + kpiCard('파트너스 링크 넣음', done + ' / ' + ids.length, done === ids.length ? '모든 구매 버튼에 수수료가 붙어요' : '비어 있는 상품은 수수료가 없어요') + kpiCard('최근 30일 구매 버튼', N(total)) + kpiCard('쿠팡 API', j.api ? '연결됨' : '없음', j.api ? '' : '최종 승인 뒤 키를 넣을 수 있어요') + '</div>' +
        '<div class="notice small"><b>파트너스 링크 바꾸는 순서</b><ol><li>‘고른 상품 열기’ 또는 ‘쿠팡에서 찾기’로 알맞은 상품 페이지를 열고 주소를 복사해요.</li><li>쿠팡 파트너스 → 링크 생성 → 간편 링크 만들기에 그 주소를 붙여 넣고 단축 링크(https://link.coupang.com/a/...)를 만들어요.</li><li>아래 칸에 붙여 넣고 ‘저장’을 누르면 바로 사이트의 구매 버튼에 쓰여요. 원고에 적은 링크보다 이 칸이 먼저 쓰여요. 링크가 없으면 쿠팡 검색 결과로 가고, 그때는 수수료가 붙지 않아요.</li></ol></div>' +
        (j.api ? '<div class="row-btns"><button type="button" class="btn btn-main" data-auto>쿠팡 API로 빈 링크 자동 만들기</button></div>' : '') +
        (j.sources.length ? card('어디서 많이 눌렀나요 (최근 30일)', bars(j.sources.map(function (s) { return { label: esc(SRC[s.src] || (gamesBySlug[s.src] ? gameName(s.src) + ' 페이지' : (s.src || '').indexOf('shop-') === 0 ? '라면몰 · ' + s.src.slice(5) : s.src || '알 수 없음')), v: s.n }; }), N, { share: true })) : '') +
        card('상품과 링크', '<div class="tbl-wrap"><table class="tbl shop-tbl"><thead><tr><th>상품</th><th class="num">30일 클릭</th><th>파트너스 링크</th></tr></thead><tbody>' +
        ids.map(function (id) {
          var it = shopItems[id];
          var search = 'https://www.coupang.com/np/search?q=' + encodeURIComponent(it.q);
          var state = link[id] ? '<span class="badge">관리 화면 링크</span>' : it.u ? '<span class="badge">원고 링크</span>' : '<span class="badge badge-warn">수수료 없음</span>';
          return '<tr data-id="' + id + '"><td><div class="shop-row">' + (it.img ? '<img src="' + esc(it.img) + '" width="48" height="48" alt="" loading="lazy" referrerpolicy="no-referrer">' : '') + '<div><b>' + esc(it.n) + '</b> ' + state + '<br>' + (it.cu ? '<a class="small" href="' + esc(it.cu) + '" target="_blank" rel="noopener">고른 상품 열기</a> · ' : '') + '<a class="small" href="' + search + '" target="_blank" rel="noopener">쿠팡에서 찾기</a> · <span class="small muted">' + id + '</span></div></div></td><td class="num">' + (clicks[id] || 0) + '</td>' +
            '<td><div class="shop-in"><input data-url value="' + esc(link[id] || '') + '" placeholder="' + esc(it.u || 'https://link.coupang.com/a/...') + '" inputmode="url"><button type="button" class="btn btn-sub btn-sm" data-save>저장</button></div></td></tr>';
        }).join('') + '</tbody></table></div>');
    });
  }
  $('#a-shop').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-auto')) {
      b.disabled = true; b.textContent = '만드는 중이에요';
      post('shop/auto').then(function (j) { RS.toast(j.ok ? '링크 ' + j.made + '개를 만들었어요' : (j.message || '만들지 못했어요')); loadShop($('#a-shop')); });
      return;
    }
    var row = b.closest('[data-id]'); if (!row || !b.hasAttribute('data-save')) return;
    post('shop/link', { id: row.dataset.id, url: $('[data-url]', row).value.trim() }).then(function (j) { RS.toast(j.ok ? (j.removed ? '링크를 지웠어요' : '저장했어요') : (j.message || '저장하지 못했어요')); });
  });

  // ---------- 라면 사진 ----------
  // 실물 사진은 출처(권리자)가 허락한 것만 화면에 나와요. 허락 기록은 content/photos.json의 allowed에 적어요.
  var photoData = null;
  var isKo = function (x) { return /[가-힣]/.test(x.name) || /\.kr(\/|$)|naver\.com|tistory\.com|daum\.net/.test(x.home || ''); };
  function askText(x) {
    var site = location.origin.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://myeonmyeon.com');
    var list = x.ramen.map(function (r) { return '- ' + r[1]; }).join('\n');
    var name = x.greet || x.name.replace(/\(네이버 블로그\)$/, '');
    if (!isKo(x)) {
      return 'Subject: Permission request to use your ramen photos on Myeonmyeon\n\nHello ' + name + ',\n\n' +
        'I am [your name], preparing Myeonmyeon (' + site + '), a Korean-language encyclopedia of instant noodles from Korea and around the world.\n\n' +
        'We would like to show some of your photos on our product pages, with credit and a link back to your original page. They are the package or cooked-noodle photos of these ' + x.ramen.length + ' product(s):\n' + list + '\n\n' +
        '- Where: product cards and product pages on Myeonmyeon\n- Credit: "Photo: ' + name + '" with a link to your original page under each photo\n- Edits: cropped to fit our layout and resized only\n- Note: the site includes Coupang Partners affiliate links, so it may earn a commission on purchases.\n\n' +
        'If you are happy for us to use them, please let us know any conditions. If you would rather not, that is completely fine. We will also take down any photo right away whenever you ask.\n\nBest regards,\n[your name]\n[email]';
    }
    if (x.kind === '개인') {
      return '제목: 라면 사진 사용 허락을 여쭙니다 (면면 라면 도감)\n\n안녕하세요, ' + name + '님.\n라면 정보 사이트 ‘면면’(' + site + ')을 준비하고 있는 [이름]입니다.\n\n' +
        name + '님 글에 올라온 라면 사진이 제품을 잘 보여 줘서, 면면 라면 도감에 출처를 밝히고 싣고 싶어 연락드립니다.\n\n' +
        '- 쓰고 싶은 사진: 아래 ' + x.ramen.length + '가지 라면의 포장·조리 사진\n' + list + '\n' +
        '- 쓰는 곳: 면면 라면 도감의 라면 카드와 라면 페이지\n- 표기: 사진 아래에 ‘사진 ' + name + '’과 원래 글 링크를 적어요.\n- 편집: 화면 비율에 맞춰 자르고 크기만 줄여요. 색이나 내용은 바꾸지 않아요.\n- 참고: 사이트에 쿠팡 파트너스 링크가 있어 구매가 일어나면 수수료를 받을 수 있어요.\n\n' +
        '허락해 주시면 정말 감사하겠습니다. 어려우시면 편하게 거절하셔도 괜찮고, 나중에라도 내려 달라고 하시면 바로 내리겠습니다.\n\n[이름] 드림\n[연락처]';
    }
    return '제목: [면면] 라면 도감 제품 사진 사용 허락 요청\n\n안녕하세요. 라면 정보 사이트 ‘면면’(' + site + ')을 준비하고 있는 [이름]입니다.\n\n' +
      '면면은 국내외 라면을 한곳에 모아 제품 정보와 먹어 본 사람들의 기록을 보여 주는 라면 도감입니다. 라면 페이지에 ' + x.name + '에서 공개한 제품 사진을 쓰고 싶어 허락을 여쭙니다.\n\n' +
      '- 쓰려는 사진: 아래 ' + x.ramen.length + '가지 제품의 포장 사진과 조리 예시 사진\n' + list + '\n' +
      '- 쓰는 곳: 면면 라면 도감의 제품 카드와 제품 페이지\n- 표기: 사진 아래에 ‘사진 ' + x.name + '’과 원문 링크를 적습니다.\n- 편집: 화면 비율에 맞춰 자르고 크기만 줄입니다. 색이나 내용은 바꾸지 않습니다.\n- 참고: 사이트에 쿠팡 파트너스 제휴 링크가 있어 구매가 일어나면 수수료를 받을 수 있습니다.\n\n' +
      '허락해 주시면 정해 주신 범위와 조건 안에서만 쓰고, 요청하시면 언제든 바로 내리겠습니다. 쓰면 안 되는 사진이나 따로 지켜야 할 조건이 있으면 알려 주세요.\n\n[이름] 드림\n[연락처]';
  }
  function loadPhotos(p) {
    fetch('/data/photo-status.json?' + Date.now()).then(function (r) { return r.json(); }).then(function (j) {
      photoData = j;
      var ok = j.sources.filter(function (x) { return x.allowed; }).length;
      var gh = j.repo ? 'https://github.com/' + j.repo : '';
      var steps = '<ol class="list">' +
        '<li>권리자에게 허락을 받아요. 출처마다 ‘요청 문안 복사’를 누르면 메일·쪽지에 붙여 넣을 글이 복사돼요.</li>' +
        '<li>허락을 받으면 ' + (gh ? '<a href="' + gh + '/edit/' + j.branch + '/content/photos.json" target="_blank" rel="noopener">content/photos.json</a>' : 'content/photos.json') + '에서 그 출처의 <code>allowed</code>에 날짜와 방법을 적어요. 예: <code>"2026-12-03 농심 고객상담 메일 회신"</code></li>' +
        '<li>드라이브 ‘라면도감_제품별_실물사진’의 사진을 ' + (gh ? '<a href="' + gh + '/upload/' + j.branch + '/src/static/img/ramen/thumb" target="_blank" rel="noopener">src/static/img/ramen/thumb</a>' : 'src/static/img/ramen/thumb') + '(1000×800), wide(1440×900), square(1200×1200) 폴더에 같은 이름으로 올려요.</li>' +
        '<li>1~2분 뒤 다시 배포되면 그 라면의 카드와 페이지에 사진과 출처가 나와요. 허락 기록이 없는 출처의 파일은 올라와 있어도 화면에 쓰지 않아요.</li></ol>' +
        '<p class="small muted">저장소가 공개라서 파일을 올리는 순간 GitHub에서는 누구나 볼 수 있어요. 허락을 받기 전에는 실물 사진 파일을 올리지 마세요. AI 조리 예시 그림(src/static/img/ramen-ai)은 텍스트로 새로 만든 그림이라 허락 없이 바로 써요.</p>';
      var rows = j.sources.map(function (x, i) {
        var st = x.allowed ? '<span class="pill pill-ok">허락: ' + esc(x.allowed) + '</span>' : x.license ? '<span class="pill">공개 이용조건: ' + esc(x.license) + '</span>' : '<span class="pill pill-warn">허락 전</span>';
        return [
          '<b>' + esc(x.name) + '</b><br><span class="small muted">' + esc(x.kind) + '</span> <details class="small"><summary>라면 ' + x.ramen.length + '가지</summary>' + x.ramen.map(function (r) { return '<a href="/ramen/' + r[0] + '/" target="_blank" rel="noopener">' + esc(r[1]) + '</a>'; }).join(', ') + '</details>',
          { h: x.ramen.length, s: x.ramen.length }, st,
          '<div class="row-btns" style="justify-content:flex-end;margin:0"><button type="button" class="btn btn-sub btn-sm" data-ask="' + i + '">요청 문안 복사</button>' +
          (x.ask || x.home ? '<a class="btn btn-line btn-sm" href="' + esc(x.ask || x.home) + '" target="_blank" rel="noopener nofollow">' + (x.ask ? '문의 창구' : '사이트') + '</a>' : '') + '</div>',
        ];
      });
      p.innerHTML = '<div class="kpi-grid kpi-4">' +
        kpiCard('AI 조리 예시', N(j.on.ai) + '가지', '텍스트로 새로 만든 그림') +
        kpiCard('허락받은 실물 사진', N(j.on.photo) + '가지', '출처 ' + N(ok) + '곳 허락') +
        kpiCard('실물 사진 후보', N(j.total) + '가지', '드라이브에 준비된 사진') +
        kpiCard('예시 그림만', N(j.illus) + '가지', '조리 방식 그림') + '</div>' +
        (j.problems && j.problems.length ? card('확인이 필요한 파일', '<ul class="list">' + j.problems.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul><p class="small muted">허락 기록이 없는 실물 사진 파일은 저장소에서 지워 주세요.</p>') : '') +
        card('사진을 켜는 순서', steps) +
        card('출처별 허락 현황', tableHTML(['출처', '라면 수', '상태', ''], rows));
    }).catch(function (e) { failBox(p); if (window.console) console.error(e); });
  }
  $('#a-photos').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ask]');
    if (!b || !photoData) return;
    RS.copyText(askText(photoData.sources[+b.dataset.ask]), '요청 문안을 복사했어요. [이름]과 [연락처]를 채워서 보내 주세요.');
  });

  // ---------- 시험 데이터 ----------
  function loadDemo(p) {
    api('demo').then(function (j) {
      if (j._status !== 200) { failBox(p, j); return; }
      var has = j.users > 0 || j.bowls > 0;
      p.innerHTML = '<div class="kpi-grid kpi-3">' + kpiCard('시험 회원', N(j.users)) + kpiCard('시험 기록', N(j.bowls)) + kpiCard('상태', has ? '들어 있음' : '비어 있음', has ? '모든 페이지 위에 안내 띠가 떠요' : '') + '</div>' +
        card('시험 데이터란?', '<p>기록이 하나도 없으면 랭킹, 맛 지도, 라면 비교가 모두 비어 보여요. 문을 열기 전에 화면이 어떻게 보이는지 확인하려고 <b>가짜 회원 30명과 가짜 기록</b>을 넣는 기능이에요.</p>' +
          '<ul class="list"><li>시험 회원은 로그인할 수 없고, 닉네임이 ‘시험회원01’처럼 보여요.</li><li>시험 데이터가 있는 동안에는 모든 페이지 맨 위에 ‘시험 데이터가 섞여 있어요’ 띠가 떠요.</li><li>시험 기록에는 ‘시험 데이터’ 표시가 붙어요.</li><li><b>사이트를 알리기 전에 꼭 지워 주세요.</b> 지우면 시험 회원, 시험 기록, 그동안 저장한 주간·월간 랭킹 기록도 함께 지워져요.</li></ul>' +
          '<div class="row-btns">' + (has ? '<button type="button" class="btn btn-main" data-demo-clear>시험 데이터 모두 지우기</button>' : '<button type="button" class="btn btn-sub" data-demo-fill>시험 데이터 넣기</button>') + '</div>');
    });
  }
  $('#a-demo').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var p = $('#a-demo');
    if (b.hasAttribute('data-demo-fill')) {
      if (!confirm('가짜 회원 30명과 가짜 기록을 넣을까요? 사이트를 알리기 전에 꼭 지워야 해요.')) return;
      b.disabled = true; b.textContent = '넣는 중이에요';
      post('demo/fill').then(function (j) { RS.toast(j.ok ? '시험 기록 ' + j.bowls + '개를 넣었어요' : (j.message || '넣지 못했어요')); loadDemo(p); });
    }
    if (b.hasAttribute('data-demo-clear')) {
      if (!confirm('시험 데이터를 모두 지울까요?')) return;
      b.disabled = true; b.textContent = '지우는 중이에요';
      post('demo/clear').then(function (j) { RS.toast(j.ok ? '시험 데이터를 지웠어요' : (j.message || '지우지 못했어요')); loadDemo(p); });
    }
  });

  // ---------- 커뮤니티 관리 ----------
  var TARGET = { post: '글', event: '모임', club: '모임', comment: '댓글', bowl: '한 그릇 기록', recipe: '레시피', rreview: '레시피 후기' };
  var linkOf = function (t, id, parent) {
    if (t === 'post') return '/club/post/?id=' + id;
    if (t === 'event') return '/club/event/?id=' + id;
    if (t === 'club') return '/club/';
    if (t === 'recipe') return '/recipes/' + id;
    var pp = String(parent || '').split(':');
    if (pp[0] === 'ramen') return '/ramen/' + pp[1] + '/#bowls';
    return pp[0] ? linkOf(pp[0], pp[1]) : '#';
  };
  function table(rows, cols) {
    if (!rows || !rows.length) return '<p class="muted">없어요.</p>';
    return '<div class="tbl-wrap"><table class="tbl"><tbody>' + rows.map(function (r) { return '<tr>' + cols(r).map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function loadCm(p) {
    p = p || $('#a-community');
    Promise.all([api('community/flags'), api('community/recent')]).then(function (r) {
      var f = r[0], c = r[1];
      if (f._status !== 200) { p.innerHTML = '<p class="notice">' + esc(f.message || '불러오지 못했어요.') + '</p>'; return; }
      var act = function (t, id, hidden) {
        return '<span class="row-btns" data-t="' + t + '" data-i="' + id + '"><button type="button" class="btn btn-ghost btn-sm" data-hide="' + (hidden ? 0 : 1) + '">' + (hidden ? '다시 보이기' : '가리기') + '</button><button type="button" class="btn btn-ghost btn-sm" data-remove>지우기</button></span>';
      };
      var userAct = function (u) {
        return '<span class="row-btns" data-u="' + u.id + '">' + (u.status === 'banned' ? '<button type="button" class="btn btn-ghost btn-sm" data-ua="unban">제한 풀기</button>' : '<button type="button" class="btn btn-ghost btn-sm" data-ua="ban">이용 제한</button>') +
          '<button type="button" class="btn btn-ghost btn-sm" data-ua="reset">임시 비밀번호</button></span>';
      };
      var CATN = RS.D.POST_CATS;
      p.innerHTML = '<div class="kpi-grid kpi-3">' + kpiCard('회원', N(c.userCount)) + kpiCard('확인할 신고', N(f.flags.length)) + kpiCard('시험 데이터 기록', N((c.bowls || []).filter(function (x) { return x.demo; }).length), '최근 40개 가운데') + '</div>' +
        card('확인할 신고', f.flags.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>대상</th><th>신고</th><th>사유</th><th></th></tr></thead><tbody>' + f.flags.map(function (x) {
          return '<tr><td>' + TARGET[x.target] + ' · <a href="' + linkOf(x.target, x.target_id, x.parent) + '" target="_blank">' + esc(x.label || '(지워짐)') + '</a>' + (x.hidden ? ' <span class="badge">가려짐</span>' : '') + '</td><td>' + x.n + '</td><td class="small">' + esc(x.reasons || '') + '</td><td>' + act(x.target, x.target_id, x.hidden) +
            '<span class="row-btns" data-t="' + x.target + '" data-i="' + x.target_id + '"><button type="button" class="btn btn-ghost btn-sm" data-dismiss>문제없음</button></span></td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="muted">확인할 신고가 없어요.</p>') +
        card('공지·투표 올리기', '<form class="cm-form" data-sysform><p class="muted small">‘면면 운영팀’ 이름으로 올라가요. 고정하면 게시판과 클럽 홈 맨 위에 보여요.</p>' +
          '<div class="row-btns" role="radiogroup" data-syscat><button type="button" class="chip" role="radio" aria-checked="true" data-c="notice">공지</button><button type="button" class="chip" role="radio" aria-checked="false" data-c="poll">투표</button></div>' +
          '<label class="field"><span>제목</span><input name="title" maxlength="60" required></label>' +
          '<label class="field"><span>내용</span><textarea name="body" rows="5" maxlength="5000"></textarea></label>' +
          '<div class="field" data-sysopts hidden><span>투표 보기 (한 줄에 하나, 2~6개)</span><textarea name="options" rows="4" placeholder="꼬들면\n보통\n푹 익힌 면"></textarea><label class="field field-inline"><span>기간</span><select name="days"><option value="3">3일</option><option value="7" selected>7일</option><option value="14">14일</option><option value="30">30일</option></select></label></div>' +
          '<label class="check"><input type="checkbox" name="pinned" checked><span>맨 위에 고정하기</span></label>' +
          '<p class="form-msg" role="status"></p><button class="btn btn-main" type="submit">올리기</button></form>') +
        card('최근 글', table(c.posts, function (x) { return [esc(CATN[x.cat] || x.cat), '<a href="/club/post/?id=' + x.id + '" target="_blank">' + esc(x.title) + '</a>' + (x.pinned ? ' <span class="badge">고정</span>' : '') + (x.hidden ? ' <span class="badge">가려짐</span>' : ''), esc(x.nick), act('post', x.id, x.hidden) + '<span class="row-btns" data-pin="' + x.id + '"><button type="button" class="btn btn-ghost btn-sm" data-pinv="' + (x.pinned ? 0 : 1) + '">' + (x.pinned ? '고정 풀기' : '고정') + '</button></span>']; })) +
        card('최근 레시피 자랑', table(c.recipes, function (x) { return ['<a href="/recipes/' + x.id + '" target="_blank">' + esc(x.title) + '</a>' + (x.hidden ? ' <span class="badge">가려짐</span>' : ''), '사진 ' + (x.photos ? x.photos.split(',').length : 0) + ' · 좋아요 ' + x.likes + ' · 후기 ' + x.reviews, esc(x.nick), act('recipe', x.id, x.hidden)]; }) +
          (c.images ? '<p class="muted small">레시피 사진 ' + N(c.images.n) + '장 · ' + (c.images.bytes / 1048576).toFixed(1) + 'MB 저장 중. ' + (c.images.r2bound ? '사진은 R2(PHOTOS)에 저장하고 있어요.' : '지금은 사진을 D1에 저장해요. D1 무료 한도는 데이터베이스 하나에 500MB라, 사진이 많아지면 README의 ‘사진 저장소(R2) 연결’ 순서대로 R2를 붙여 주세요.') + '</p>' : '')) +
        card('최근 한 그릇 기록', table(c.bowls, function (x) { return [esc(gameName(x.slug)) + ' · ★' + (x.rating / 2).toFixed(1) + (x.demo ? ' <span class="badge draft">시험</span>' : ''), '<a href="/ramen/' + x.slug + '/#bowls" target="_blank">' + esc(x.body || '(메모 없음)') + '</a>' + (x.hidden ? ' <span class="badge">가려짐</span>' : ''), esc(x.nick), act('bowl', x.id, x.hidden)]; })) +
        card('최근 시식회·번개', table(c.events, function (x) { return [x.kind === 'tasting' ? '시식회' : '번개', '<a href="/club/event/?id=' + x.id + '" target="_blank">' + esc(x.title) + '</a>' + (x.hidden ? ' <span class="badge">가려짐</span>' : ''), esc(x.nick), act('event', x.id, x.hidden)]; })) +
        card('최근 가입한 회원', table(c.users, function (u) { return [esc(u.login), esc(u.nick) + (u.demo ? ' <span class="badge draft">시험</span>' : '') + (u.status === 'banned' ? ' <span class="badge">제한</span>' : ''), esc(fmtTime(u.created_at)), userAct(u)]; }) +
          '<p class="muted small">임시 비밀번호는 비밀번호를 잊은 회원이 문의했을 때 본인인지 확인한 뒤 알려 주세요. 회원은 로그인한 뒤 내 도감 > 설정에서 비밀번호를 바꿀 수 있어요.</p>');
      var sf = $('[data-sysform]', p), syscat = 'notice';
      RS.radioGroup($('[data-syscat]', sf), function (b) { syscat = b.dataset.c; $('[data-sysopts]', sf).hidden = syscat !== 'poll'; });
      sf.addEventListener('submit', function (e) {
        e.preventDefault();
        var m = $('.form-msg', sf), el = sf.elements;
        var body = { cat: syscat, title: el.title.value.trim(), body: el.body.value, pinned: el.pinned.checked, days: Number(el.days.value), options: el.options.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean) };
        post('community/post', body).then(function (j) {
          if (!j.ok) { m.className = 'form-msg err'; m.textContent = j.message || '올리지 못했어요.'; return; }
          RS.toast('올렸어요'); loadCm(p);
        });
      });
      refreshCounts();
    });
  }
  $('#a-community').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var p = $('#a-community');
    var box = b.closest('[data-t]'), ub = b.closest('[data-u]'), pin = b.closest('[data-pin]');
    if (pin) { post('community/pin', { id: Number(pin.dataset.pin), pinned: b.dataset.pinv === '1' }).then(function (j) { RS.toast(j.ok ? (b.dataset.pinv === '1' ? '고정했어요' : '고정을 풀었어요') : '바꾸지 못했어요'); loadCm(p); }); return; }
    if (box) {
      var body = { target: box.dataset.t, id: Number(box.dataset.i) };
      if (b.hasAttribute('data-hide')) { body.hidden = b.dataset.hide === '1'; post('community/hide', body).then(function (j) { RS.toast(j.ok ? (body.hidden ? '가렸어요' : '다시 보이게 했어요') : '바꾸지 못했어요'); loadCm(p); }); }
      if (b.hasAttribute('data-dismiss')) post('community/dismiss', body).then(function () { RS.toast('신고를 정리했어요'); loadCm(p); });
      if (b.hasAttribute('data-remove')) {
        if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = '한 번 더 누르면 지워요'; return; }
        post('community/remove', body).then(function (j) { RS.toast(j.ok ? '지웠어요' : '지우지 못했어요'); loadCm(p); });
      }
    }
    if (ub) {
      var a = b.dataset.ua;
      if (a === 'reset' && !confirm('이 회원의 비밀번호를 임시 비밀번호로 바꿀까요?')) return;
      post('community/user/' + ub.dataset.u, { action: a }).then(function (j) {
        if (!j.ok) { RS.toast('바꾸지 못했어요'); return; }
        if (a === 'reset') prompt('임시 비밀번호예요. 회원에게 알려 주세요.', j.temp); else { RS.toast(a === 'ban' ? '이용을 제한했어요' : '제한을 풀었어요'); loadCm(p); }
      });
    }
  });
})();
