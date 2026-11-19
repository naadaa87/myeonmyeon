/* 내 도감: 로그인·가입, 내 도감(모은 라면), 라면 일기, 내 입맛, 올해 결산, 저장, 배지, 알림, 설정 */
(function () {
  'use strict';
  var MM = window.MM;
  var root = MM && MM.$('[data-me]');
  if (!root) return;
  var $ = MM.$, $$ = MM.$$, esc = MM.esc, ico = MM.ico, D = MM.D, G = MM.G, api = MM.api;
  var params = new URLSearchParams(location.search);
  var next = params.get('next') || '';
  if (!/^\/[^/]/.test(next)) next = '';
  var TIES = ['매운맛파', '순한맛파', '국물파', '볶음파', '비빔파', '짜장파', '컵라면파', '꼬들면파', '퍼진면파', '건더기파'];

  // ---------- 로그인, 가입 ----------
  function auth(tab) {
    tab = tab || params.get('tab') || 'login';
    root.innerHTML = '<div class="auth"><p class="kicker"><svg class="wave" viewBox="0 0 64 10" aria-hidden="true"><path d="M2 5c3.75 0 3.75-3 7.5-3s3.75 3 7.5 3 3.75-3 7.5-3 3.75 3 7.5 3 3.75-3 7.5-3 3.75 3 7.5 3 3.75-3 7.5-3 3.75 3 7.5 3"/></svg>내 도감</p>' +
      '<h1>' + (tab === 'signup' ? '가입하고 내 라면 도감 만들기' : '다시 오셨네요') + '</h1>' +
      '<div class="tabs" role="tablist"><button type="button" role="tab" aria-selected="' + (tab === 'login') + '" data-t="login">로그인</button><button type="button" role="tab" aria-selected="' + (tab === 'signup') + '" data-t="signup">가입하기</button></div>' +
      (tab === 'login'
        ? '<form class="auth-form" data-login><label class="field"><span>아이디</span><input name="login" autocomplete="username" required maxlength="20" autocapitalize="off"></label><label class="field"><span>비밀번호</span><input type="password" name="password" autocomplete="current-password" required maxlength="64"></label><p class="form-msg" role="status" aria-live="polite"></p><button class="btn btn-main btn-lg" type="submit">로그인</button><p class="small muted">비밀번호를 잊었다면 <a href="/contact/">문의하기</a>로 아이디와 닉네임을 알려 주세요. 확인한 뒤 임시 비밀번호를 드려요.</p></form>'
        : '<form class="auth-form" data-signup><label class="field"><span>아이디 (영문 소문자, 숫자, 밑줄 4~20자)</span><input name="login" autocomplete="username" required maxlength="20" pattern="[a-z0-9_]{4,20}" autocapitalize="off"></label>' +
          '<label class="field"><span>닉네임 (2~12자, 다른 사람에게 보여요)</span><input name="nick" required maxlength="12"></label>' +
          '<label class="field"><span>비밀번호 (영문과 숫자를 섞어 8자 이상)</span><input type="password" name="password" autocomplete="new-password" required minlength="8" maxlength="64"></label>' +
          '<label class="field"><span>비밀번호 한 번 더</span><input type="password" name="password2" autocomplete="new-password" required maxlength="64"></label>' +
          '<div class="field-row"><label class="field"><span>지역 (선택)</span><select name="region"><option value="">고르지 않음</option>' + D.REGIONS.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></label>' +
          '<label class="field"><span>나의 라면 취향 (선택)</span><select name="tie"><option value="">고르지 않음</option>' + TIES.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></label></div>' +
          '<label class="check"><input type="checkbox" name="age14" required><span>만 14세 이상이에요.</span></label>' +
          '<label class="check"><input type="checkbox" name="terms" required><span><a href="/terms/" target="_blank">이용약관</a>과 <a href="/club/rules/" target="_blank">후루룩클럽 이용 규칙</a>에 동의해요.</span></label>' +
          '<label class="check"><input type="checkbox" name="privacy" required><span>아이디, 닉네임, 비밀번호, 지역을 회원 관리에 쓰는 데 동의해요. <a href="/privacy/" target="_blank">개인정보처리방침</a></span></label>' +
          '<label class="hp" aria-hidden="true">비워 두세요<input name="website" tabindex="-1" autocomplete="off"></label>' +
          '<p class="form-msg" role="status" aria-live="polite"></p><button class="btn btn-main btn-lg" type="submit">가입하기</button></form>') + '</div>';
    $$('[data-t]', root).forEach(function (b) { b.addEventListener('click', function () { auth(b.dataset.t); }); });
    var done = function (j) {
      MM.setMe(j.user);
      MM.syncSaved();
      if (j.gain) MM.gainLater(j.gain);
      if (next) location.href = next; else { MM.getMe(true).then(function (u) { dash(u); }); }
    };
    var lf = $('[data-login]', root);
    if (lf) lf.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('.form-msg', lf), btn = $('button[type=submit]', lf); btn.disabled = true;
      api('auth/login', { method: 'POST', body: { login: lf.login.value.trim(), password: lf.password.value } }).then(function (j) {
        btn.disabled = false;
        if (!j.ok) { msg.className = 'form-msg err'; msg.textContent = j.message; return; }
        done(j);
      });
    });
    var sf = $('[data-signup]', root);
    if (sf) sf.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('.form-msg', sf), btn = $('button[type=submit]', sf);
      if (sf.password.value !== sf.password2.value) { msg.className = 'form-msg err'; msg.textContent = '두 비밀번호가 달라요.'; return; }
      btn.disabled = true;
      api('auth/signup', { method: 'POST', body: { login: sf.login.value.trim().toLowerCase(), nick: sf.nick.value.trim(), password: sf.password.value, region: sf.region.value, age14: sf.age14.checked, terms: sf.terms.checked, privacy: sf.privacy.checked, website: sf.website.value } }).then(function (j) {
        btn.disabled = false;
        if (!j.ok) { msg.className = 'form-msg err'; msg.textContent = j.message; return; }
        if (sf.tie.value) api('auth/profile', { method: 'POST', body: { nick: j.user.nick, region: j.user.region, bio: '', tie: sf.tie.value, badge: '' } });
        done(j);
      });
    });
  }

  // ---------- 내 도감 ----------
  var TABS = [['coll', '내 도감'], ['diary', '라면 일기'], ['taste', '내 입맛'], ['recap', '올해 결산'], ['saved', '저장'], ['badges', '배지'], ['notes', '알림'], ['settings', '설정']];
  var g = null, ramen = null, me = null;

  function dash(u) {
    me = u;
    Promise.all([api('growth'), MM.loadRamen(), MM.loadStats()]).then(function (r) {
      g = r[0]; ramen = r[1].ramen;
      if (!g.ok) { root.innerHTML = '<p class="notice">' + esc(g.message) + '</p>'; return; }
      var lv = g.level;
      var tab = (location.hash || '').slice(1);
      if (!TABS.some(function (t) { return t[0] === tab; })) tab = 'coll';
      root.innerHTML = '<section class="me-card"><div class="me-top">' + G.emblem(lv, 64) + '<div><h1>' + esc(me.nick) + '</h1><p>Lv.' + lv.lv + ' ' + esc(lv.name) + (g.tie ? ' · ' + esc(g.tie) : '') + ' · <a href="/club/u/?n=' + encodeURIComponent(me.nick) + '">내 공개 도감 보기</a></p></div></div>' +
        '<div><div class="xp-bar"><i style="width:' + lv.pct + '%"></i></div><p class="small muted" style="margin-top:4px">' + g.xp.toLocaleString('ko-KR') + '점' + (lv.next ? ' · 다음 등급 ‘' + esc(lv.nextName) + '’까지 ' + lv.need + '점' : ' · 가장 높은 등급이에요') + '</p></div>' +
        '<div class="me-stats"><div><b>' + g.bowls.length + '</b><span>기록한 라면</span></div><div><b>' + g.bowls.reduce(function (a, b) { return a + (b.times || 1); }, 0) + '</b><span>먹은 그릇</span></div><div><b>' + g.stars + '</b><span>받은 별</span></div><div><b>' + (g.streak || 0) + '</b><span>연속 출석</span></div></div>' +
        '<p class="row-btns" style="margin:0"><a class="btn btn-main" href="/record/">' + ico('i-plus') + '한 그릇 기록</a><button type="button" class="btn ' + (g.checked ? 'btn-sub' : 'btn-line') + '" data-checkin' + (g.checked ? ' disabled' : '') + '>' + ico('i-check') + (g.checked ? '오늘 출석 완료' : '출석 체크') + '</button></p></section>' +
        '<nav class="sub-tabs" aria-label="내 도감 메뉴">' + TABS.map(function (t) { return '<a href="#' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + t[1] + (t[0] === 'notes' && me.unread ? ' <b style="color:#D93A26">' + me.unread + '</b>' : '') + '</a>'; }).join('') + '</nav><div data-tab></div>';
      var ci = $('[data-checkin]', root);
      if (ci) ci.addEventListener('click', function () {
        ci.disabled = true;
        api('checkin', { method: 'POST' }).then(function (x) { if (x.gain) MM.gain(x.gain); ci.className = 'btn btn-sub'; ci.innerHTML = ico('i-check') + '오늘 출석 완료'; });
      });
      showTab(tab);
    });
  }
  window.addEventListener('hashchange', function () {
    if (!g) return;
    var tab = location.hash.slice(1);
    $$('.sub-tabs a', root).forEach(function (a) { if (a.getAttribute('href') === '#' + tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    showTab(tab);
  });
  function showTab(tab) {
    var box = $('[data-tab]', root);
    ({ coll: coll, diary: diary, taste: taste, recap: recap, saved: savedTab, badges: badges, notes: notes, settings: settings }[tab] || coll)(box);
  }
  var byS = function () { var o = {}; g.bowls.forEach(function (b) { o[b.s] = b; }); return o; };

  function coll(box) {
    var mine = byS();
    var got = ramen.filter(function (r) { return mine[r.s]; }).length;
    var groups = D.GROUPS.map(function (gr) {
      var all = ramen.filter(function (r) { return r.g.indexOf(gr.id) > -1; });
      var n = all.filter(function (r) { return mine[r.s]; }).length;
      return '<div class="dist-row"><span>' + esc(gr.name) + '</span><span class="bar"><i style="width:' + (all.length ? n / all.length * 100 : 0) + '%"></i></span><span>' + n + ' / ' + all.length + '</span></div>';
    }).join('');
    var makers = Object.keys(D.MAKERS).map(function (m) {
      var all = ramen.filter(function (r) { return r.m === m && r.co === 'kr'; });
      var n = all.filter(function (r) { return mine[r.s]; }).length;
      return all.length ? '<div class="dist-row"><span>' + esc(D.MAKERS[m]) + '</span><span class="bar"><i style="width:' + n / all.length * 100 + '%"></i></span><span>' + n + ' / ' + all.length + '</span></div>' : '';
    }).join('');
    // 세계 라면 여권: 기록한 라면의 나라마다 도장을 찍어요
    var cos = {};
    ramen.forEach(function (r) {
      var c = cos[r.co] || (cos[r.co] = { name: r.co === 'kr' ? '한국' : r.cn, all: 0, n: 0 });
      c.all++;
      if (mine[r.s]) c.n++;
    });
    var keys = Object.keys(cos).sort(function (a, b) { return (a === 'kr' ? -1 : b === 'kr' ? 1 : 0) || cos[b].all - cos[a].all; });
    var stamped = keys.filter(function (k) { return cos[k].n; }).length;
    var passport = '<section class="card passport"><h2>' + ico('i-pin') + '세계 라면 여권 <small>' + stamped + ' / ' + keys.length + '개 나라</small></h2>' +
      '<p class="small muted">기록한 라면의 나라마다 도장이 찍혀요. 흐린 도장을 누르면 그 나라 라면을 볼 수 있어요.</p><div class="stamps">' +
      keys.map(function (k, i) {
        var c = cos[k];
        return '<a class="stamp' + (c.n ? ' on' : '') + '" style="--tilt:' + ((i * 37) % 13 - 6) + 'deg" href="' + (k === 'kr' ? '/ramen/?co=kr' : '/world/' + k + '/') + '"><b>' + esc(c.name) + '</b><span>' + (c.n ? c.n + '그릇' : c.all + '가지') + '</span></a>';
      }).join('') + '</div></section>';
    box.innerHTML = passport + '<section class="card"><h2>' + ico('i-book') + '도감 ' + got + ' / ' + ramen.length + '칸</h2><div class="cm-grid"><div class="coll-sum"><p class="small muted">종류별</p>' + groups + '</div><div class="coll-sum"><p class="small muted">한국 라면 회사별</p>' + makers + '</div></div>' +
      '<div class="coll">' + ramen.slice().sort(function (a, b) { return (mine[b.s] ? 1 : 0) - (mine[a.s] ? 1 : 0) || a.n.localeCompare(b.n, 'ko'); }).map(function (r) {
        var b = mine[r.s];
        return '<a href="' + (b ? '/ramen/' + r.s + '/' : '/record/?r=' + r.s) + '"' + (b ? ' class="got" data-r="★' + (b.r / 2).toFixed(1) + '"' : '') + '><img src="' + MM.imgOf(r) + '" alt="" width="96" height="96" loading="lazy">' + esc(r.n) + '</a>';
      }).join('') + '</div><p class="small muted" style="margin-top:10px">흐린 칸을 누르면 바로 기록할 수 있어요.</p></section>';
  }

  function diary(box) {
    if (!g.bowls.length) { box.innerHTML = '<div class="card"><p class="muted">아직 기록이 없어요. <a href="/record/">첫 그릇을 남겨 주세요.</a></p></div>'; return; }
    box.innerHTML = '<div class="diary">' + g.bowls.map(function (b) {
      var r = MM.BY[b.s];
      if (!r) return '';
      return '<article class="diary-item"><img src="' + MM.imgOf(r) + '" alt="" width="64" height="64" loading="lazy"><div><p><a href="/ramen/' + b.s + '/"><b>' + esc(r.n) + '</b></a> ' + MM.starsSVG(b.r / 2) + (b.again ? ' <span class="again ' + b.again + '">' + esc(D.AGAIN[b.again]) + '</span>' : '') + '</p>' +
        (b.body ? '<p class="small">' + esc(b.body) + '</p>' : '') + '<p class="mini-meta">' + MM.ago(b.at) + (b.times > 1 ? ' · ' + b.times + '번 먹음' : '') + (b.helpful ? ' · 도움돼요 ' + b.helpful : '') + ' · <a href="/record/?r=' + b.s + '">고치기</a></p></div></article>';
    }).join('') + '</div>';
  }

  function taste(box) {
    var sums = D.AXES.map(function () { return [0, 0]; });
    g.bowls.forEach(function (b) { b.x.forEach(function (v, i) { if (v) { sums[i][0] += v; sums[i][1]++; } }); });
    var avg = sums.map(function (s) { return s[1] ? Math.round(s[0] / s[1] * 10) / 10 : null; });
    var styles = {};
    g.bowls.forEach(function (b) { var r = MM.BY[b.s]; if (!r) return; var k = r.c; styles[k] = styles[k] || [0, 0]; styles[k][0]++; styles[k][1] += b.r; });
    var fav = Object.keys(styles).sort(function (a, b) { return styles[b][0] - styles[a][0]; })[0];
    var best = g.bowls.slice().sort(function (a, b) { return b.r - a.r; }).slice(0, 5);
    var tags = {};
    g.bowls.forEach(function (b) { (b.adds ? b.adds.split(',') : []).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; }); });
    var adds = Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; }).slice(0, 6);
    if (!g.bowls.length) { box.innerHTML = '<div class="card"><p class="muted">기록이 쌓이면 내 입맛을 그려 드려요.</p></div>'; return; }
    box.innerHTML = '<div class="cm-grid"><section class="card"><h2>' + ico('i-map') + '내가 고른 맛 지도</h2>' + (avg.some(function (v) { return v != null; }) ? MM.radar([{ v: avg, cls: '' }], 320) + '<p class="small muted">맛 지도 칸을 채운 기록들의 평균이에요.</p>' : '<p class="muted">맛 지도 칸을 채운 기록이 아직 없어요.</p>') + '</section>' +
      '<section class="card"><h2>' + ico('i-heart') + '나는 이런 라면파</h2>' + (fav ? '<p>가장 많이 먹은 종류는 <b>' + esc(D.STYLES[fav]) + '</b>이에요. (' + styles[fav][0] + '가지)</p>' : '') +
      (adds.length ? '<p style="margin-top:8px">자주 넣는 재료: ' + adds.map(function (a) { return '<span class="pill pill-sm">' + esc(a) + ' ' + tags[a] + '</span>'; }).join(' ') + '</p>' : '') +
      '<h3 style="margin-top:14px">내가 준 별점 TOP 5</h3><ol class="rank-list">' + best.map(function (b, i) { var r = MM.BY[b.s]; return r ? '<li><span class="rank-n">' + (i + 1) + '</span><a href="/ramen/' + b.s + '/">' + esc(r.n) + '</a><span class="rank-s">★' + (b.r / 2).toFixed(1) + '</span></li>' : ''; }).join('') + '</ol>' +
      '<p class="row-btns"><a class="btn btn-line btn-sm" href="/lab/compare/?r=' + (best[0] ? best[0].s : '') + '">' + ico('i-swap') + '최애 라면 비교하기</a></p></section></div>';
  }

  function recap(box) {
    var y = String(new Date(Date.now() + 9 * 3600e3).getUTCFullYear());
    var list = g.bowls.filter(function (b) { return (b.at || '').slice(0, 4) === y || (b.first || '').slice(0, 4) === y; });
    var newOnes = g.bowls.filter(function (b) { return (b.first || '').slice(0, 4) === y; });
    if (!list.length) { box.innerHTML = '<div class="recap"><h2>' + y + '년 라면 결산</h2><p>올해 남긴 기록이 아직 없어요. 한 그릇씩 쌓이면 여기서 한 해를 돌아볼 수 있어요.</p></div>'; return; }
    var makers = {};
    list.forEach(function (b) { var r = MM.BY[b.s]; if (r) makers[r.mn] = (makers[r.mn] || 0) + 1; });
    var topMaker = Object.keys(makers).sort(function (a, b) { return makers[b] - makers[a]; })[0];
    var best = list.slice().sort(function (a, b) { return b.r - a.r; })[0];
    var bowls = list.reduce(function (a, b) { return a + (b.times || 1); }, 0);
    box.innerHTML = '<section class="recap"><h2>' + esc(me.nick) + '님의 ' + y + '년 라면 결산</h2><p class="recap-big">' + bowls + '그릇</p><ul>' +
      '<li>올해 처음 기록한 라면 <b>' + newOnes.length + '가지</b></li>' +
      (topMaker ? '<li>가장 많이 먹은 회사 <b>' + esc(topMaker) + '</b> (' + makers[topMaker] + '가지)</li>' : '') +
      (best && MM.BY[best.s] ? '<li>올해 가장 높은 별점 <b>' + esc(MM.BY[best.s].n) + '</b> ★' + (best.r / 2).toFixed(1) + '</li>' : '') +
      '<li>지금 등급 <b>Lv.' + g.level.lv + ' ' + esc(g.level.name) + '</b></li></ul>' +
      '<p class="row-btns"><button type="button" class="btn btn-main" data-share-recap>' + ico('i-share') + '결산 공유하기</button></p></section>';
    $('[data-share-recap]', box).addEventListener('click', function () {
      MM.share({ title: y + '년 라면 결산', text: '올해 라면 ' + bowls + '그릇, 처음 먹어 본 라면 ' + newOnes.length + '가지' + (best && MM.BY[best.s] ? ', 최고의 한 그릇은 ' + MM.BY[best.s].n : '') + '. 면면에서 정리했어요.', url: location.origin + '/' });
    });
  }

  function savedTab(box) {
    var marks = g.marks || [];
    var saved = MM.getSaved();
    var want = marks.filter(function (m) { return m.kind === 'want'; }).map(function (m) { return m.slug; });
    var row = function (title, list, empty) {
      return '<section class="sec"><div class="sec-head"><h2><span>' + title + '</span></h2></div>' + (list.length ? '<div class="rgrid">' + list.map(function (s) { var r = MM.BY[s]; return r ? MM.cardHTML(r) : ''; }).join('') + '</div>' : '<p class="muted">' + empty + '</p>') + '</section>';
    };
    box.innerHTML = row('저장한 라면', saved, '라면 카드의 책갈피를 누르면 여기에 모여요.') + row('먹고 싶은 라면', want, '라면 페이지에서 ‘먹고 싶어요’를 누르면 여기에 모여요.');
    MM.paintCards(box); MM.paintSaved();
  }

  function badges(box) {
    var have = {};
    g.badges.forEach(function (b) { have[b.badge] = b.created_at; });
    box.innerHTML = '<section class="card" id="badges"><h2>' + ico('i-star') + '배지 ' + g.badges.length + ' / ' + G.BADGES.length + '</h2><ul class="badge-list">' + G.BADGES.map(function (b) {
      return '<li class="' + (have[b.key] ? '' : 'locked') + '">' + G.badge(b, 44, !have[b.key]) + '<div><b>' + esc(b.name) + '</b><span>' + esc(b.desc) + (have[b.key] ? ' · ' + MM.ago(have[b.key]) : '') + '</span></div></li>';
    }).join('') + '</ul><p class="small muted" style="margin-top:10px">받은 배지 하나를 설정에서 대표 배지로 고를 수 있어요. 점수 받는 법은 <a href="/club/levels/">등급 안내</a>에 있어요.</p></section>';
  }

  function notes(box) {
    api('notes').then(function (j) {
      box.innerHTML = '<section class="card"><h2>' + ico('i-bell') + '알림</h2>' + (j.notes && j.notes.length ? '<ul class="note-list">' + j.notes.map(function (n) { return '<li class="' + (n.read ? '' : 'unread') + '"><b>' + esc(n.text) + '</b><span class="mini-meta">' + MM.ago(n.created_at) + (n.link ? ' · <a href="' + esc(n.link) + '">보러 가기</a>' : '') + '</span></li>'; }).join('') + '</ul>' : '<p class="muted">새 알림이 없어요.</p>') + '</section>';
      if (j.notes && j.notes.some(function (n) { return !n.read; })) api('notes', { method: 'POST' }).then(function () { MM.getMe(true); });
    });
  }

  function settings(box) {
    var mine = g.badges.map(function (b) { return b.badge; });
    var BY = {}; G.BADGES.forEach(function (b) { BY[b.key] = b; });
    box.innerHTML = '<section class="card"><h2>' + ico('i-user') + '프로필</h2><form class="auth-form" data-prof style="padding:0">' +
      '<label class="field"><span>닉네임</span><input name="nick" maxlength="12" required value="' + esc(me.nick) + '"></label>' +
      '<div class="field-row"><label class="field"><span>지역</span><select name="region"><option value="">고르지 않음</option>' + D.REGIONS.map(function (r) { return '<option' + (r === me.region ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span>나의 라면 취향</span><select name="tie"><option value="">고르지 않음</option>' + TIES.map(function (r) { return '<option' + (r === g.tie ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="field"><span>한 줄 소개</span><input name="bio" maxlength="80" value="' + esc(me.bio || '') + '" placeholder="예: 꼬들면 3분 30초 지킴이"></label>' +
      '<label class="field"><span>대표 배지</span><select name="badge"><option value="">달지 않음</option>' + mine.map(function (k) { return BY[k] ? '<option value="' + k + '"' + (k === g.badge ? ' selected' : '') + '>' + esc(BY[k].name) + '</option>' : ''; }).join('') + '</select></label>' +
      '<p class="form-msg" role="status"></p><button class="btn btn-main" type="submit">저장</button></form></section>' +
      '<section class="card"><h2>' + ico('i-gear') + '비밀번호 바꾸기</h2><form class="auth-form" data-pw style="padding:0"><label class="field"><span>지금 비밀번호</span><input type="password" name="current" autocomplete="current-password" required></label><label class="field"><span>새 비밀번호 (영문과 숫자 8자 이상)</span><input type="password" name="next" autocomplete="new-password" required minlength="8"></label><p class="form-msg" role="status"></p><button class="btn btn-line" type="submit">바꾸기</button></form></section>' +
      '<section class="card"><h2>' + ico('i-logout') + '로그아웃과 탈퇴</h2><p class="row-btns"><button type="button" class="btn btn-line" data-logout>로그아웃</button></p>' +
      '<details style="margin-top:12px"><summary class="small muted">탈퇴하기</summary><form class="auth-form" data-del style="padding:12px 0 0"><p class="small">탈퇴하면 아이디, 비밀번호, 지역, 소개를 바로 지워요. 남긴 기록과 글은 ‘탈퇴한 회원’으로 남아요. 지우고 싶다면 탈퇴 전에 직접 지워 주세요.</p><label class="field"><span>비밀번호 확인</span><input type="password" name="password" required></label><p class="form-msg" role="status"></p><button class="btn btn-ghost" type="submit">탈퇴하기</button></form></details></section>';
    var pf = $('[data-prof]', box);
    pf.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('.form-msg', pf);
      api('auth/profile', { method: 'POST', body: { nick: pf.nick.value.trim(), region: pf.region.value, bio: pf.bio.value, tie: pf.tie.value, badge: pf.badge.value } }).then(function (j) {
        msg.className = 'form-msg ' + (j.ok ? 'ok' : 'err'); msg.textContent = j.ok ? '저장했어요.' : j.message;
        if (j.ok) { MM.setMe(j.user); me.nick = j.user.nick; me.region = j.user.region; me.bio = j.user.bio; g.tie = j.user.tie; g.badge = j.user.badge || pf.badge.value; }
      });
    });
    var pw = $('[data-pw]', box);
    pw.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('.form-msg', pw);
      api('auth/password', { method: 'POST', body: { current: pw.current.value, next: pw.next.value } }).then(function (j) { msg.className = 'form-msg ' + (j.ok ? 'ok' : 'err'); msg.textContent = j.ok ? '비밀번호를 바꿨어요.' : j.message; if (j.ok) pw.reset(); });
    });
    $('[data-logout]', box).addEventListener('click', function () {
      api('auth/logout', { method: 'POST' }).then(function () { MM.setMe(null); try { sessionStorage.removeItem('mm-synced'); } catch (e) { /* 넘어가요 */ } location.href = '/'; });
    });
    var df = $('[data-del]', box);
    df.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!confirm('정말 탈퇴할까요? 되돌릴 수 없어요.')) return;
      var msg = $('.form-msg', df);
      api('auth/delete', { method: 'POST', body: { password: df.password.value } }).then(function (j) {
        if (!j.ok) { msg.className = 'form-msg err'; msg.textContent = j.message; return; }
        MM.setMe(null); MM.setSaved([]); location.href = '/';
      });
    });
  }

  MM.getMe().then(function (u) {
    if (!u) { auth(); return; }
    if (next) { location.href = next; return; }
    dash(u);
  });
})();
