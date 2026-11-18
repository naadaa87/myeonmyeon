/* 취향실험실: 맛 지도, 라면 비교, 라면 월드컵, 조리 타이머, 물 양 계산기 */
(function () {
  'use strict';
  var MM = window.MM;
  var root = MM && MM.$('[data-lab]');
  if (!root) return;
  var $ = MM.$, $$ = MM.$$, esc = MM.esc, ico = MM.ico, D = MM.D;
  var kind = root.dataset.lab;
  var params = new URLSearchParams(location.search);
  var AXK = D.AXES.map(function (a) { return a.k; });
  var groupOf = function (r) { return r.c === 'soup' || r.c === 'jjamppong' || r.c === 'udon' ? 'soup' : r.c === 'bibim' || r.c === 'cold' ? 'bibim' : r.c === 'jjajang' ? 'jjajang' : r.c === 'fried' ? 'fried' : 'other'; };
  var GL = { soup: '국물', bibim: '비빔·냉면', jjajang: '짜장', fried: '볶음', other: '그 밖' };

  // ---------- 맛 지도 ----------
  function map() {
    var MIN = 3;
    var sx = params.get('x') || 'hot', sy = params.get('y') || 'rich';
    root.innerHTML = '<div class="map-ctl"><label class="sel"><span class="sr">가로</span><select data-x>' + D.AXES.map(function (a) { return '<option value="' + a.k + '"' + (a.k === sx ? ' selected' : '') + '>가로: ' + esc(a.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="sel"><span class="sr">세로</span><select data-y>' + D.AXES.map(function (a) { return '<option value="' + a.k + '"' + (a.k === sy ? ' selected' : '') + '>세로: ' + esc(a.name) + '</option>'; }).join('') + '</select></label></div>' +
      '<div data-map></div><p class="legend">' + Object.keys(GL).map(function (k) { return '<span><i class="lg-' + k + '"></i>' + GL[k] + '</span>'; }).join('') + '</p><p class="small muted" data-map-note></p>';
    $$('.legend i', root).forEach(function (i) { var k = i.className.replace('lg-', ''); i.style.background = { soup: '#D93A26', bibim: '#E06A2C', jjajang: '#26221F', fried: '#B52E1F', other: '#F2B33D' }[k]; });
    var box = $('[data-map]', root);
    function draw() {
      Promise.all([MM.loadRamen(), MM.loadStats()]).then(function (res) {
        var d = res[0], S = res[1];
        var xi = AXK.indexOf(sx), yi = AXK.indexOf(sy);
        var ax = D.AXES[xi], ay = D.AXES[yi];
        var pts = d.ramen.filter(function (r) { var s = S[r.s]; return s && s.xn[xi] >= MIN && s.xn[yi] >= MIN; }).map(function (r) { return { r: r, x: S[r.s].x[xi], y: S[r.s].x[yi] }; });
        $('[data-map-note]', root).textContent = '두 칸 모두 ' + MIN + '명 넘게 기록한 라면만 그렸어요. 지금 ' + pts.length + '가지가 지도에 있고, ' + (d.ramen.length - pts.length) + '가지는 기록을 모으는 중이에요.';
        if (!pts.length) {
          box.innerHTML = '<div class="pending"><h3>아직 지도를 그릴 만큼 기록이 모이지 않았어요</h3><p class="small muted">한 그릇 기록에서 ‘맛 지도’ 칸을 채워 주시면 라면들이 여기 점으로 나타나요.</p><p><a class="btn btn-main" href="/record/">' + ico('i-plus') + '맛 지도 채우기</a></p></div>';
          return;
        }
        var W = 680, H = 520, L = 58, T = 30, RR = 24, B = 54;
        var px = function (v) { return L + (v - 1) / 4 * (W - L - RR); };
        var py = function (v) { return T + (5 - v) / 4 * (H - T - B); };
        var g = '';
        for (var v = 1; v <= 5; v++) {
          g += '<line class="' + (v === 3 ? 'gm' : 'gl') + '" x1="' + px(v) + '" y1="' + T + '" x2="' + px(v) + '" y2="' + (H - B) + '"/>';
          g += '<line class="' + (v === 3 ? 'gm' : 'gl') + '" x1="' + L + '" y1="' + py(v) + '" x2="' + (W - RR) + '" y2="' + py(v) + '"/>';
          g += '<text class="lbl" x="' + px(v) + '" y="' + (H - B + 18) + '" text-anchor="middle">' + v + '</text><text class="lbl" x="' + (L - 12) + '" y="' + (py(v) + 4) + '" text-anchor="end">' + v + '</text>';
        }
        g += '<text class="lbl" x="' + L + '" y="' + (H - 12) + '">← ' + esc(ax.lo) + '</text><text class="lbl" x="' + (W - RR) + '" y="' + (H - 12) + '" text-anchor="end">' + esc(ax.hi) + ' →</text>';
        g += '<text class="lbl" x="' + (W / 2) + '" y="' + (H - 12) + '" text-anchor="middle" style="fill:#26221F">' + esc(ax.name) + '</text>';
        g += '<text class="lbl" x="14" y="' + (T + 4) + '" style="fill:#26221F">' + esc(ay.name) + ' ↑ ' + esc(ay.hi) + '</text><text class="lbl" x="14" y="' + (H - B - 6) + '">' + esc(ay.lo) + '</text>';
        pts.forEach(function (p) {
          var cx = px(p.x), cy = py(p.y);
          g += '<a href="/ramen/' + p.r.s + '/" class="dot-g g-' + groupOf(p.r) + '"><title>' + esc(p.r.n) + ' · ' + ax.name + ' ' + p.x + ', ' + ay.name + ' ' + p.y + '</title><circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="7"/><text x="' + (cx + 10).toFixed(1) + '" y="' + (cy + 4).toFixed(1) + '">' + esc(p.r.n) + '</text></a>';
        });
        box.innerHTML = '<svg class="map-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(ax.name + '와 ' + ay.name + ' 맛 지도') + '">' + g + '</svg>';
      });
    }
    $('[data-x]', root).addEventListener('change', function (e) { sx = e.target.value; history.replaceState(null, '', '?x=' + sx + '&y=' + sy); draw(); });
    $('[data-y]', root).addEventListener('change', function (e) { sy = e.target.value; history.replaceState(null, '', '?x=' + sx + '&y=' + sy); draw(); });
    draw();
    MM.track('map', '');
  }

  // ---------- 라면 비교 ----------
  function compare() {
    var COLORS = ['#D93A26', '#D99A1E', '#26221F'];
    var picks = [params.get('r') || '', params.get('r2') || '', params.get('r3') || ''];
    MM.loadRamen().then(function (d) {
      var opts = d.ramen.slice().sort(function (a, b) { return a.n.localeCompare(b.n, 'ko'); });
      root.innerHTML = '<div class="cmp-pick">' + [0, 1, 2].map(function (i) {
        return '<label class="field cmp-slot"><span>' + (i + 1) + '번 라면' + (i === 2 ? ' (선택)' : '') + '</span><i class="s-mark" style="background:' + COLORS[i] + ';top:auto;bottom:18px;transform:none"></i><select data-slot="' + i + '"><option value="">골라 주세요</option>' +
          opts.map(function (r) { return '<option value="' + r.s + '"' + (picks[i] === r.s ? ' selected' : '') + '>' + esc(r.n) + ' (' + esc(r.mn) + ')</option>'; }).join('') + '</select></label>';
      }).join('') + '</div><div data-cmp></div>';
      $$('[data-slot]', root).forEach(function (s) {
        s.addEventListener('change', function () {
          picks[Number(s.dataset.slot)] = s.value;
          var p = new URLSearchParams();
          if (picks[0]) p.set('r', picks[0]); if (picks[1]) p.set('r2', picks[1]); if (picks[2]) p.set('r3', picks[2]);
          history.replaceState(null, '', '?' + p);
          draw();
        });
      });
      draw();
    });
    function draw() {
      var box = $('[data-cmp]', root);
      var sel = picks.map(function (s, i) { return s && MM.BY[s] ? { r: MM.BY[s], i: i } : null; }).filter(Boolean);
      if (sel.length < 2) { box.innerHTML = '<p class="muted">라면을 두 개 넘게 고르면 나란히 비교해 드려요.</p>'; return; }
      MM.track('compare', sel[0].r.s);
      MM.loadStats().then(function (S) {
        var series = sel.map(function (x) { var s = S[x.r.s]; return { v: s ? s.x.map(function (v, k) { return s.xn[k] ? v : null; }) : AXK.map(function () { return null; }), cls: 's' + x.i }; });
        var anyTaste = series.some(function (s) { return s.v.some(function (v) { return v != null; }); });
        var row = function (label, fn) { return '<tr><th>' + label + '</th>' + sel.map(function (x) { return '<td>' + fn(x.r, S[x.r.s]) + '</td>'; }).join('') + '</tr>'; };
        var tbl = '<div class="tbl-wrap"><table class="cmp-table"><thead><tr><th></th>' + sel.map(function (x) { return '<td><b style="color:' + COLORS[x.i] + '">●</b> <a href="/ramen/' + x.r.s + '/"><b>' + esc(x.r.n) + '</b></a></td>'; }).join('') + '</tr></thead><tbody>' +
          row('회사', function (r) { return esc(r.mn); }) +
          row('형태', function (r) { return r.f ? esc(D.FORMS[r.f]) : '<span class="muted">확인 중</span>'; }) +
          row('조리 방식', function (r) { return esc(D.STYLES[r.c]); }) +
          row('맵기 분류', function (r) { return r.hot == null ? '<span class="muted">미분류</span>' : esc(D.HOTS[r.hot]) + ' <small class="muted">(편집부)</small>'; }) +
          row('스코빌', function (r) { return r.shu ? r.shu.v.toLocaleString('ko-KR') + ' SHU' : '<span class="muted">공개 값 없음</span>'; }) +
          row('출시', function (r) { return r.y ? esc(r.y.replace('-', '년 ').replace(/^(\d{4})$/, '$1년')) + (r.y.length === 7 ? '월' : '') : '<span class="muted">–</span>'; }) +
          row('평균 별점', function (r, s) { return s && s.n ? MM.scoreHTML(s.a) + ' <small class="muted">기록 ' + s.n + '개</small>' : '<span class="muted">기록 없음</span>'; }) +
          row('또 먹을래요', function (r, s) { return s && s.yn ? s.y + '% <small class="muted">' + s.yn + '명</small>' : '<span class="muted">–</span>'; }) +
          D.AXES.map(function (a, k) { return row(esc(a.name), function (r, s) { return s && s.xn[k] ? s.x[k].toFixed(1) + ' <small class="muted">' + s.xn[k] + '명</small>' : '<span class="muted">–</span>'; }); }).join('') +
          '</tbody></table></div>';
        box.innerHTML = '<div class="cmp-grid"><div class="panel">' + (anyTaste ? MM.radar(series, 340) : '<p class="muted">고른 라면에 아직 맛 지도 기록이 없어요. 기본 정보만 비교해 드려요.</p>') + '</div><div class="panel">' + tbl + '</div></div>';
      });
    }
  }

  // ---------- 라면 월드컵 ----------
  function worldcup() {
    var ROUND = { 32: '32강', 16: '16강', 8: '8강', 4: '4강', 2: '결승' };
    var shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    var st = null;
    MM.loadRamen().then(function (d) { setup(d); });
    function setup(d) {
      var groups = [['', '모든 라면']].concat(D.GROUPS.map(function (g) { return [g.id, g.name]; }));
      root.innerHTML = '<div class="panel" style="display:grid;gap:16px;max-width:640px">' +
        '<fieldset class="field"><legend>어떤 라면으로 할까요?</legend><div class="chips" role="radiogroup" data-wg>' + groups.map(function (g, i) { return '<button type="button" class="chip" role="radio" aria-checked="' + (i === 0) + '" data-v="' + g[0] + '">' + esc(g[1]) + '</button>'; }).join('') + '</div></fieldset>' +
        '<fieldset class="field"><legend>몇 강으로 할까요?</legend><div class="chips" role="radiogroup" data-ws></div></fieldset>' +
        '<button type="button" class="btn btn-main btn-lg" data-wstart>' + ico('i-trophy') + '시작하기</button>' +
        '<p class="small muted">고를 때마다 무작위로 짝을 지어요. 끝까지 고르면 결과가 모두의 월드컵 기록에 더해져요.</p></div><div data-wstats></div>';
      var gBox = $('[data-wg]', root), sBox = $('[data-ws]', root);
      var pool = function () { var g = ($('[aria-checked="true"]', gBox) || {}).dataset; var gid = g ? g.v : ''; return d.ramen.filter(function (r) { return !gid || r.g.indexOf(gid) > -1; }); };
      function sizes() {
        var n = pool().length;
        var ok = [8, 16, 32].filter(function (s) { return s <= n; });
        sBox.innerHTML = ok.length ? ok.map(function (s, i) { return '<button type="button" class="chip" role="radio" aria-checked="' + (i === Math.min(1, ok.length - 1)) + '" data-v="' + s + '">' + ROUND[s] + '</button>'; }).join('') : '<p class="small muted">이 종류는 라면이 ' + n + '가지라 월드컵을 하기에 적어요. 다른 종류를 골라 주세요.</p>';
        $('[data-wstart]', root).disabled = !ok.length;
      }
      var radio = function (box, cb) { box.addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; $$('.chip', box).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); }); if (cb) cb(); }); };
      radio(gBox, sizes); radio(sBox);
      sizes();
      $('[data-wstart]', root).addEventListener('click', function () {
        var size = Number(($('[aria-checked="true"]', sBox) || {}).dataset.v || 16);
        st = { cur: shuffle(pool().slice()).slice(0, size), next: [], i: 0, size: size, matches: [] };
        play();
      });
      stats($('[data-wstats]', root));
    }
    function play() {
      var round = st.cur.length;
      if (round === 1) { done(st.cur[0]); return; }
      var a = st.cur[st.i], b = st.cur[st.i + 1];
      var opt = function (r) { return '<button type="button" class="wc-opt" data-w="' + r.s + '"><img src="' + MM.imgOf(r) + '" alt="" width="800" height="800"><b>' + esc(r.n) + '</b><span>' + esc(r.mn) + ' · ' + esc(D.STYLES[r.c]) + '</span></button>'; };
      root.innerHTML = '<div class="wc-stage"><div class="wc-meta"><span class="wc-round">' + (ROUND[round] || round + '강') + '</span><span class="muted">' + (st.i / 2 + 1) + ' / ' + (round / 2) + '</span></div>' +
        '<div class="wc-bar"><i style="width:' + ((st.i / 2) / (round / 2) * 100) + '%"></i></div><div class="wc-pair">' + opt(a) + opt(b) + '</div><p class="small muted" style="text-align:center">더 끌리는 쪽을 누르세요</p></div>';
      $$('[data-w]', root).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var w = btn.dataset.w, l = w === a.s ? b.s : a.s;
          st.matches.push([w, l]);
          st.next.push(w === a.s ? a : b);
          st.i += 2;
          if (st.i >= st.cur.length) { st.cur = st.next; st.next = []; st.i = 0; }
          play();
          window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
        });
      });
    }
    function done(w) {
      MM.track('worldcup', w.s);
      root.innerHTML = '<div class="panel wc-win"><p class="kicker">나의 ' + (ROUND[st.size] || '') + ' 우승 라면</p><img src="' + MM.imgOf(w) + '" alt="" width="200" height="200"><h2>' + esc(w.n) + '</h2><p class="muted">' + esc(w.mn) + ' · ' + esc(D.STYLES[w.c]) + '</p>' +
        '<p class="row-btns" style="justify-content:center"><a class="btn btn-main" href="/ramen/' + w.s + '/">라면 보러 가기</a><button type="button" class="btn btn-line" data-wshare>' + ico('i-share') + '결과 공유</button><button type="button" class="btn btn-sub" data-wagain>' + ico('i-reset') + '한 번 더</button></p></div><div data-wstats></div>';
      $('[data-wshare]', root).addEventListener('click', function () { MM.share({ title: '나의 라면 월드컵 우승: ' + w.n, text: '면면 라면 월드컵에서 ' + MM.josa(w.n, '이', '가') + ' 우승했어요.', url: location.origin + '/lab/worldcup/' }); });
      $('[data-wagain]', root).addEventListener('click', function () { MM.loadRamen().then(function (d) { root.innerHTML = ''; setup(d); }); });
      MM.api('worldcup', { method: 'POST', body: { champ: w.s, matches: st.matches } }).then(function (j) {
        if (j.gain) MM.gain(j.gain);
        stats($('[data-wstats]', root), w.s);
      });
    }
    function stats(box, mine) {
      MM.api('worldcup').then(function (j) {
        if (!j.ok || !j.list.length) { box.innerHTML = ''; return; }
        var top = j.list.filter(function (x) { return x.champs > 0; }).slice(0, 10);
        var total = j.total || 1;
        box.innerHTML = '<section class="sec">' + '<div class="sec-head"><h2>모두의 우승 기록</h2></div><p class="sec-lead">월드컵을 끝까지 한 ' + j.total + '번의 결과예요.</p><div class="rank-rows">' + top.map(function (x, i) {
          var r = MM.BY[x.slug];
          return r ? '<a class="rrow" href="/ramen/' + x.slug + '/"' + (x.slug === mine ? ' style="border-color:#D93A26"' : '') + '><span class="rnum' + (i < 3 ? ' n' + (i + 1) : '') + '">' + (i + 1) + '</span><img src="' + MM.imgOf(r) + '" alt="" width="56" height="56" loading="lazy"><span><span class="rrow-name">' + esc(r.n) + '</span><span class="rrow-meta"> 맞대결 승률 ' + (x.games ? Math.round(x.wins / x.games * 100) : 0) + '%</span></span><span class="rrow-right"><b>' + Math.round(x.champs / total * 1000) / 10 + '%</b><span class="rrow-meta">우승 ' + x.champs + '번</span></span></a>' : '';
        }).join('') + '</div></section>';
      });
    }
  }

  // ---------- 조리 타이머 ----------
  function timer() {
    var box = $('[data-timer]', root);
    var ring = $('[data-ring]', box), out = $('[data-time]', box), stateEl = $('[data-state]', box), startBtn = $('[data-start]', box);
    var C = 2 * Math.PI * 88;
    ring.style.strokeDasharray = C;
    var total = Number(MM.store.get('mm-timer', 240)) || 240, left = total, endAt = 0, tick = 0, egged = false, lock = null, audio = null;
    var fmt = function (s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
    function paint() {
      out.textContent = fmt(left);
      ring.style.strokeDashoffset = C * (1 - left / total);
      $$('[data-preset]', box).forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.preset) === total)); });
    }
    function beep(times) {
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        for (var i = 0; i < times; i++) {
          var o = audio.createOscillator(), g = audio.createGain();
          o.frequency.value = 880; o.type = 'sine';
          g.gain.setValueAtTime(0.0001, audio.currentTime + i * 0.45);
          g.gain.exponentialRampToValueAtTime(0.4, audio.currentTime + i * 0.45 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + i * 0.45 + 0.35);
          o.connect(g); g.connect(audio.destination);
          o.start(audio.currentTime + i * 0.45); o.stop(audio.currentTime + i * 0.45 + 0.4);
        }
      } catch (e) { /* 소리를 못 내는 기기 */ }
      if (navigator.vibrate) navigator.vibrate(times > 1 ? [300, 150, 300, 150, 300] : [200]);
    }
    function stop(reason) {
      clearInterval(tick); tick = 0;
      box.classList.remove('run');
      startBtn.innerHTML = ico('i-play') + (reason === 'pause' ? '이어서' : '시작');
      if (lock) { lock.release().catch(function () { /* 무시 */ }); lock = null; }
      document.title = document.title.replace(/^\(\d+:\d+\) /, '');
    }
    function start() {
      if (left <= 0) left = total;
      endAt = Date.now() + left * 1000;
      box.classList.add('run'); box.classList.remove('done');
      stateEl.textContent = '끓는 중';
      startBtn.innerHTML = ico('i-pause') + '잠시 멈춤';
      if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () { /* 무시 */ });
      try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) { /* 무시 */ }
      MM.track('timer', '', { n: total });
      tick = setInterval(function () {
        left = (endAt - Date.now()) / 1000;
        if ($('[data-egg]', box).checked && !egged && total > 70 && left <= 60) { egged = true; stateEl.textContent = '지금 계란 넣을 때'; beep(1); MM.toast('지금 계란을 넣어요'); }
        if (left <= 0) {
          left = 0; stop('done'); box.classList.add('done'); stateEl.textContent = '불을 끌 시간'; beep(3); MM.toast('다 됐어요! 불을 꺼 주세요.');
        }
        document.title = '(' + fmt(left) + ') ' + document.title.replace(/^\(\d+:\d+\) /, '');
        paint();
      }, 250);
    }
    startBtn.addEventListener('click', function () { if (tick) { stop('pause'); stateEl.textContent = '멈춤'; } else start(); });
    $('[data-reset]', box).addEventListener('click', function () { stop(); left = total; egged = false; box.classList.remove('done'); stateEl.textContent = '준비'; paint(); });
    $$('[data-preset]', box).forEach(function (b) { b.addEventListener('click', function () { stop(); total = left = Number(b.dataset.preset); egged = false; MM.store.set('mm-timer', total); stateEl.textContent = '준비'; paint(); }); });
    $$('[data-adj]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        var dlt = Number(b.dataset.adj);
        if (tick) { endAt += dlt * 1000; left = (endAt - Date.now()) / 1000; total = Math.max(total + dlt, 10); }
        else { total = Math.min(Math.max(total + dlt, 30), 900); left = total; MM.store.set('mm-timer', total); }
        paint();
      });
    });
    paint();
  }

  // ---------- 물 양 계산기 ----------
  function water() {
    var f = $('[data-water]', root), out = $('[data-out]', f);
    function calc() {
      var per = Number(f.per.value), n = Number(f.n.value), adj = Number((f.querySelector('[name=adj]:checked') || {}).value || 0);
      if (!(per >= 100 && per <= 1500) || !(n >= 1 && n <= 10)) { out.innerHTML = '<p class="muted">한 봉지 물 양(100~1500ml)과 봉지 수(1~10)를 넣어 주세요.</p>'; return; }
      var total = Math.round(per * n * (1 + adj / 100) / 10) * 10;
      var cups = total / 180, mcup = total / 200;
      var icons = '';
      for (var i = 0; i < Math.floor(cups); i++) icons += '<i></i>';
      if (cups - Math.floor(cups) >= 0.25) icons += '<i class="half"></i>';
      out.innerHTML = '<span class="small muted">' + n + '봉지 · ' + (adj ? (adj < 0 ? '진하게' : '연하게') : '봉지대로') + '</span><b>' + total.toLocaleString('ko-KR') + 'ml</b>' +
        '<span>종이컵 약 ' + (Math.round(cups * 10) / 10) + '컵 · 계량컵 약 ' + (Math.round(mcup * 10) / 10) + '컵</span><span class="water-cups" aria-hidden="true">' + icons + '</span>';
      MM.store.set('mm-water', { per: per, n: n });
    }
    var saved = MM.store.get('mm-water', null);
    if (saved) { f.per.value = saved.per; f.n.value = saved.n; }
    f.addEventListener('input', calc);
    f.addEventListener('change', calc);
    calc();
  }

  ({ map: map, compare: compare, worldcup: worldcup, timer: timer, water: water }[kind] || function () {})();
})();
