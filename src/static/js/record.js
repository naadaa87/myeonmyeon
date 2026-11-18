/* 한 그릇 기록: 라면 고르기 → 별점과 ‘또 먹을래요’(필수) → 맛 지도, 끓인 방법, 한 줄 느낌(선택) */
(function () {
  'use strict';
  var MM = window.MM;
  var root = MM && MM.$('[data-record]');
  if (!root) return;
  var $ = MM.$, $$ = MM.$$, esc = MM.esc, ico = MM.ico, D = MM.D;
  var params = new URLSearchParams(location.search);
  var slug = params.get('r') || '';

  function loginBox() {
    var next = encodeURIComponent(location.pathname + location.search);
    root.innerHTML = '<div class="card" style="text-align:center;display:grid;gap:12px;justify-items:center;padding:28px 18px">' +
      '<h2 style="justify-content:center">로그인하고 기록해 주세요</h2>' +
      '<p class="muted">한 사람이 라면 하나에 기록 하나만 남길 수 있게 하려고 로그인이 필요해요. 가입은 아이디와 닉네임만 있으면 1분이면 끝나요.</p>' +
      '<p class="row-btns" style="justify-content:center"><a class="btn btn-main btn-lg" href="/me/?tab=signup&next=' + next + '">가입하기</a><a class="btn btn-line btn-lg" href="/me/?next=' + next + '">로그인</a></p></div>';
  }

  // ---------- 라면 고르기 ----------
  function picker(mine) {
    root.innerHTML = '<section class="rec-step"><h2><span class="step-n">1</span>어떤 라면을 먹었나요?</h2>' +
      '<label class="search-box">' + ico('i-search') + '<input type="search" placeholder="라면 이름, 회사, 초성" aria-label="라면 찾기" data-pq autocomplete="off"></label>' +
      '<div class="pick-list" data-plist><p class="muted">불러오는 중이에요</p></div></section>';
    var inp = $('[data-pq]', root), box = $('[data-plist]', root);
    MM.loadRamen().then(function (d) {
      var all = d.ramen.slice().sort(function (a, b) { return a.n.localeCompare(b.n, 'ko'); });
      function draw() {
        var q = inp.value.trim();
        var list = all.filter(function (r) { return MM.matches(q, r.q); });
        box.innerHTML = list.length ? list.map(function (r) {
          var m = mine[r.s];
          return '<a class="pick' + (m ? ' done' : '') + '" href="/record/?r=' + r.s + '" data-pick="' + r.s + '"><img src="' + MM.imgOf(r) + '" alt="" width="48" height="48" loading="lazy"><span><b>' + esc(r.n) + '</b><span>' + esc(r.mn) + ' · ' + esc(D.STYLES[r.c]) + (m ? ' · 내 별점 ' + (m / 2).toFixed(1) : '') + '</span></span>' + (m ? '<span class="pill pill-sm">기록함</span>' : ico('i-chev')) + '</a>';
        }).join('') : '<div class="empty"><p>찾는 라면이 도감에 없어요.</p><p><button type="button" class="btn btn-line" data-report="" data-kind="newramen">새 라면 제보하기</button></p></div>';
      }
      inp.addEventListener('input', draw);
      draw();
      inp.focus();
    });
    box.addEventListener('click', function (e) {
      var a = e.target.closest('[data-pick]');
      if (!a) return;
      e.preventDefault();
      slug = a.dataset.pick;
      history.pushState(null, '', '/record/?r=' + slug);
      start();
    });
  }

  // ---------- 기록 쓰기 ----------
  function starRow(v) {
    var h = '';
    for (var i = 1; i <= 5; i++) {
      var f = v / 2 >= i ? 100 : v / 2 >= i - 0.5 ? 50 : 0;
      h += '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="rs' + i + '"><stop offset="' + f + '%" stop-color="#F2B33D"/><stop offset="' + f + '%" stop-color="#E8E0D6"/></linearGradient></defs><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z" fill="url(#rs' + i + ')"/></svg>';
    }
    return h;
  }
  var STAR_WORD = { 1: '별로였어요', 2: '별로였어요', 3: '아쉬워요', 4: '아쉬워요', 5: '보통이에요', 6: '괜찮아요', 7: '맛있어요', 8: '맛있어요', 9: '아주 맛있어요', 10: '인생 라면이에요' };
  var chipsHTML = function (name, obj, cur, multi) {
    var keys = Array.isArray(obj) ? obj : Object.keys(obj);
    var sel = multi ? String(cur || '').split(',') : [cur];
    return '<div class="chips" role="' + (multi ? 'group' : 'radiogroup') + '" data-group="' + name + '"' + (multi ? ' data-multi' : '') + '>' + keys.map(function (k) {
      var label = Array.isArray(obj) ? k : obj[k];
      var on = sel.indexOf(k) > -1;
      return '<button type="button" class="chip" ' + (multi ? 'aria-pressed' : 'role="radio" aria-checked') + '="' + on + '" data-v="' + esc(k) + '">' + esc(label) + '</button>';
    }).join('') + '</div>';
  };

  function form(r, my) {
    var b = my || {};
    var ax = D.AXES.map(function (a) { return b['a_' + a.k] || 0; });
    root.innerHTML = '<form class="rec-form" data-form novalidate>' +
      '<div class="rec-step"><div class="rec-target"><img src="' + MM.imgOf(r) + '" alt="" width="64" height="64"><div><b>' + esc(r.n) + '</b><span class="small muted">' + esc(r.mn) + ' · ' + esc(D.STYLES[r.c]) + '</span></div><a class="btn btn-ghost btn-sm" href="/record/" data-change style="margin-left:auto">다른 라면</a></div>' +
      (my ? '<p class="notice" style="margin:0">이 라면은 ' + MM.ago(my.updated_at) + '에 기록했어요. 고치면 새 내용으로 바뀌어요.</p>' : '') + '</div>' +
      '<section class="rec-step"><h2><span class="step-n">1</span>별점</h2>' +
      '<div class="star-row"><div class="star-input" data-stars>' + starRow(b.rating || 0) + '<input type="range" min="0" max="10" step="1" value="' + (b.rating || 0) + '" aria-label="별점 (반 개 단위)" data-rating></div><span class="star-val" data-star-val></span></div>' +
      '<p class="small muted" data-star-word>별을 눌러 골라 주세요. 반 개 단위로 고를 수 있어요.</p></section>' +
      '<section class="rec-step"><h2><span class="step-n">2</span>또 먹을래요?</h2>' + chipsHTML('again', D.AGAIN, b.again) + '</section>' +
      '<section class="rec-step"><h2><span class="step-n opt">3</span>맛 지도 <small>아는 칸만 채워요</small></h2>' +
      D.AXES.map(function (a, i) {
        return '<div class="axin" data-ax="' + a.k + '"><div class="axin-top"><b>' + esc(a.name) + '</b><button type="button" class="link-btn" data-ax-clear' + (ax[i] ? '' : ' hidden') + '>비우기</button></div>' +
          '<div class="seg5" role="radiogroup" aria-label="' + esc(a.name) + '">' + [1, 2, 3, 4, 5].map(function (v) { return '<button type="button" role="radio" aria-checked="' + (ax[i] === v) + '" data-v="' + v + '">' + v + '</button>'; }).join('') + '</div>' +
          '<div class="axin-ends"><span>' + esc(a.lo) + '</span><span>' + esc(a.hi) + '</span></div></div>';
      }).join('') + '</section>' +
      '<section class="rec-step"><h2><span class="step-n opt">4</span>이렇게 먹었어요 <small>선택</small></h2>' +
      '<p class="field"><span>면 익힘</span></p>' + chipsHTML('cook', D.COOKS, b.cook) +
      '<p class="field"><span>물 양</span></p>' + chipsHTML('water', D.WATERS, b.water) +
      '<p class="field"><span>넣은 재료 (여러 개)</span></p>' + chipsHTML('adds', D.ADDS, b.adds, true) +
      '<p class="field"><span>어디서 먹었나요</span></p>' + chipsHTML('place', D.PLACES, b.place) + '</section>' +
      '<section class="rec-step"><h2><span class="step-n opt">5</span>한 줄 느낌 <small>선택</small></h2>' + chipsHTML('tags', D.TAGS, b.tags, true) +
      '<label class="field"><span>메모 (20자 넘게 쓰면 점수를 더 드려요)</span><textarea name="body" maxlength="1000" rows="4" placeholder="예: 물을 50ml 덜 넣고 대파를 듬뿍 넣었더니 국물이 훨씬 진했어요.">' + esc(b.body || '') + '</textarea></label>' +
      (my ? '<label class="check"><input type="checkbox" name="again_ate"><span>한 번 더 먹었어요 (먹은 횟수 +1, 지금 ' + (my.times || 1) + '번)</span></label>' : '') +
      '<label class="check"><input type="checkbox" name="gifted"' + (b.gifted ? ' checked' : '') + '><span>제조사나 판매처에서 제품을 받았어요 (랭킹에서 빠지고 기록에 표시가 붙어요)</span></label>' +
      '</section>' +
      '<label class="hp" aria-hidden="true">비워 두세요<input name="website" tabindex="-1" autocomplete="off"></label>' +
      '<div class="save-bar"><button type="submit" class="btn btn-main btn-lg">' + ico('i-check') + (my ? '기록 고치기' : '기록 남기기') + '</button><a class="btn btn-sub btn-lg" href="/ramen/' + r.s + '/">취소</a></div>' +
      '<p class="form-msg" role="status" aria-live="polite"></p></form>';
    bind(r, my);
  }

  function bind(r, my) {
    var f = $('[data-form]', root);
    var range = $('[data-rating]', f), starsBox = $('[data-stars]', f);
    function paintStars() {
      var v = Number(range.value);
      $$('svg', starsBox).forEach(function (s) { s.remove(); });
      starsBox.insertAdjacentHTML('afterbegin', starRow(v));
      $('[data-star-val]', f).textContent = v ? (v / 2).toFixed(1) : '';
      $('[data-star-word]', f).textContent = v ? STAR_WORD[v] : '별을 눌러 골라 주세요. 반 개 단위로 고를 수 있어요.';
      range.setAttribute('aria-valuetext', v ? '별 ' + (v / 2) + '개' : '고르지 않음');
    }
    range.addEventListener('input', paintStars);
    // 별을 누른 위치로 값 정하기 (손가락으로 누를 때 더 정확하게)
    starsBox.addEventListener('click', function (e) {
      var rect = starsBox.getBoundingClientRect();
      var v = Math.max(1, Math.min(10, Math.ceil((e.clientX - rect.left) / rect.width * 10)));
      range.value = v; paintStars();
    });
    paintStars();
    // 고르기 칩
    f.addEventListener('click', function (e) {
      var c = e.target.closest('[data-group] .chip');
      if (c) {
        var g = c.parentNode;
        if (g.hasAttribute('data-multi')) {
          var on = c.getAttribute('aria-pressed') !== 'true';
          if (on && g.dataset.group === 'tags' && $$('[aria-pressed="true"]', g).length >= 6) { MM.toast('한 줄 느낌은 여섯 개까지 고를 수 있어요.'); return; }
          c.setAttribute('aria-pressed', String(on));
        } else {
          var was = c.getAttribute('aria-checked') === 'true';
          $$('.chip', g).forEach(function (x) { x.setAttribute('aria-checked', 'false'); });
          if (!was) c.setAttribute('aria-checked', 'true');
        }
        return;
      }
      var s = e.target.closest('.seg5 button');
      if (s) {
        var row = s.closest('.axin');
        $$('.seg5 button', row).forEach(function (x) { x.setAttribute('aria-checked', String(x === s)); });
        $('[data-ax-clear]', row).hidden = false;
        return;
      }
      var cl = e.target.closest('[data-ax-clear]');
      if (cl) {
        var row2 = cl.closest('.axin');
        $$('.seg5 button', row2).forEach(function (x) { x.setAttribute('aria-checked', 'false'); });
        cl.hidden = true;
      }
    });
    var pick = function (name) { var x = $('[data-group="' + name + '"] [aria-checked="true"]', f); return x ? x.dataset.v : ''; };
    var picks = function (name) { return $$('[data-group="' + name + '"] [aria-pressed="true"]', f).map(function (x) { return x.dataset.v; }); };
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('.form-msg', f), btn = $('button[type=submit]', f);
      var rating = Number(range.value);
      if (!rating) { msg.className = 'form-msg err'; msg.textContent = '별점을 골라 주세요.'; starsBox.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      var x = {};
      $$('.axin', f).forEach(function (row) { var on = $('[aria-checked="true"]', row); x[row.dataset.ax] = on ? Number(on.dataset.v) : 0; });
      var body = { rating: rating, again: pick('again'), x: x, cook: pick('cook'), water: pick('water'), place: pick('place'), adds: picks('adds'), tags: picks('tags'), body: f.body.value, gifted: f.gifted.checked, again_ate: f.again_ate ? f.again_ate.checked : false, website: f.website.value };
      btn.disabled = true; msg.className = 'form-msg'; msg.textContent = '저장하는 중이에요';
      MM.api('ramen/' + r.s + '/bowl', { method: 'POST', body: body }).then(function (j) {
        btn.disabled = false;
        if (!j.ok) { msg.className = 'form-msg err'; msg.textContent = j.message || '저장하지 못했어요.'; if (j._status === 401) loginBox(); return; }
        if (j.gain) MM.gainLater(j.gain);
        else MM.toastLater(j.edited ? '기록을 고쳤어요.' : '기록을 남겼어요.');
        location.href = '/ramen/' + r.s + '/#bowls';
      });
    });
    void my;
  }

  function start() {
    MM.getMe().then(function (me) {
      if (!me) { loginBox(); return; }
      if (!slug) {
        MM.api('growth').then(function (g) {
          var mine = {};
          (g.bowls || []).forEach(function (b) { mine[b.s] = b.r; });
          picker(mine);
        });
        return;
      }
      Promise.all([MM.loadRamen(), MM.api('ramen/' + slug)]).then(function (res) {
        var r = MM.BY[slug];
        if (!r) { slug = ''; start(); return; }
        var j = res[1];
        form(r, j.ok && j.my ? j.my.bowl : null);
        document.title = r.n + ' 기록하기 | ' + (D.SITE || '면면');
      });
    });
  }
  window.addEventListener('popstate', function () { slug = new URLSearchParams(location.search).get('r') || ''; start(); });
  start();
})();
