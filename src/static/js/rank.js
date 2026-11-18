/* 라면 랭킹: 종합, 종류별, 급상승, 신상, 맛 기준, 매니아 픽, 또 먹을래요 */
(function () {
  'use strict';
  var MM = window.MM;
  var root = MM && MM.$('[data-rank]');
  if (!root) return;
  var $ = MM.$, $$ = MM.$$, esc = MM.esc, ico = MM.ico, D = MM.D;
  var params = new URLSearchParams(location.search);
  var state = { type: params.get('type') || 'total', sub: params.get('sub') || '' };
  var R = D.RANK_RULE;
  var DESC = {
    total: '기록이 ' + R.minN + '개 넘게 모인 라면을 같은 기준으로 줄 세웠어요. 화살표는 이번 주가 시작될 때와 비교한 거예요.',
    group: '종류 안에서 같은 점수로 줄 세웠어요.',
    rising: '최근 ' + R.risingDays + '일 동안 기록이 갑자기 늘어난 라면이에요. 별점과 상관없이 ‘요즘 많이 먹는’ 순서예요.',
    new: '출시한 지 ' + R.newMonths + '개월이 안 된 라면이에요. 기록 ' + R.newMinN + '개부터 올라요.',
    axis: '한 칸의 평균으로 줄 세웠어요. 그 칸을 적은 기록이 ' + R.axisMinN + '개 넘는 라면만 보여요.',
    mania: '기록을 ' + R.maniaBowls + '개 넘게 남긴 회원들의 기록만 모았어요.',
    again: '‘또 먹을래요’를 고른 비율이에요. 이 칸에 답한 기록 ' + R.againMinN + '개부터 올라요.',
  };
  var tabs = $$('.tabs [data-type]', root), subBox = $('[data-sub]', root), list = $('[data-list]', root), desc = $('[data-desc]', root);

  function paintTabs() {
    tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.type === state.type)); });
    if (state.type === 'group') {
      if (!state.sub) state.sub = D.GROUPS[0].id;
      subBox.innerHTML = D.GROUPS.map(function (g) { return '<button type="button" class="chip" aria-pressed="' + (state.sub === g.id) + '" data-sub="' + g.id + '">' + esc(g.name) + '</button>'; }).join('');
      subBox.hidden = false;
    } else if (state.type === 'axis') {
      if (!state.sub) state.sub = 'hot';
      subBox.innerHTML = D.AXES.map(function (a) { return '<button type="button" class="chip" aria-pressed="' + (state.sub === a.k) + '" data-sub="' + a.k + '">' + esc(a.name) + '</button>'; }).join('');
      subBox.hidden = false;
    } else { subBox.hidden = true; state.sub = ''; }
    desc.textContent = DESC[state.type] || '';
  }
  function move(x, pos) {
    if (state.type !== 'total') return '';
    if (x.prev == null) return '<span class="move new">새로</span>';
    if (x.prev > pos) return '<span class="move up">' + ico('i-up') + (x.prev - pos) + '</span>';
    if (x.prev < pos) return '<span class="move down">' + ico('i-down') + (pos - x.prev) + '</span>';
    return '<span class="move">–</span>';
  }
  function right(x) {
    if (state.type === 'rising') return '<b>×' + x.ratio.toFixed(1) + '</b><span class="rrow-meta">최근 ' + x.n + '개 · 이전 ' + x.before + '개</span>';
    if (state.type === 'axis') { var a = D.AXES.find(function (y) { return y.k === state.sub; }); return '<b>' + x.v.toFixed(2) + '</b><span class="rrow-meta">' + esc(a.name) + ' · ' + x.n + '명</span>'; }
    if (state.type === 'again') return '<b>' + x.pct + '%</b><span class="rrow-meta">답한 기록 ' + x.n + '개</span>';
    return MM.scoreHTML(x.score);
  }
  function need() {
    return { total: R.minN, group: R.minN, new: R.newMinN, mania: R.maniaMinN, again: R.againMinN, axis: R.axisMinN, rising: R.risingMinRecent }[state.type];
  }
  function draw(j) {
    var h = '';
    if (j.ranked.length) {
      h += '<div class="rank-rows">' + j.ranked.map(function (x, i) {
        var r = MM.BY[x.s];
        if (!r) return '';
        var pos = i + 1;
        var meta = esc(r.mn) + ' · ' + esc(D.STYLES[r.c]) + (x.avg != null && x.score != null ? ' · 평균 ' + x.avg.toFixed(1) + ' · 기록 ' + x.n + '개' : '');
        return '<a class="rrow" href="/ramen/' + x.s + '/"><span class="rnum' + (pos <= 3 ? ' n' + pos : '') + '">' + pos + '</span><img src="' + MM.imgOf(r) + '" alt="" width="56" height="56" loading="lazy"><span><span class="rrow-name">' + esc(r.n) + ' ' + move(x, pos) + '</span><span class="rrow-meta">' + meta + '</span></span><span class="rrow-right">' + right(x) + '</span></a>';
      }).join('') + '</div>';
    } else {
      h += '<div class="pending"><h3>아직 이 랭킹에 오른 라면이 없어요</h3><p class="small muted">기록이 ' + need() + '개 모이면 순위에 올라요. 랭킹은 기록이 쌓이는 만큼 정확해져요.</p>' +
        (j.pending && j.pending.length ? '' : '<p><a class="btn btn-main" href="/record/">' + ico('i-plus') + '한 그릇 기록하기</a></p>') + '</div>';
    }
    if (j.pending && j.pending.length) {
      h += '<div class="pending" style="margin-top:14px"><h3>기록 모으는 중</h3>' + j.pending.map(function (x) {
        var r = MM.BY[x.s];
        return r ? '<a class="pend-row" href="/ramen/' + x.s + '/"><b>' + esc(r.n) + '</b><span class="bar"><i style="width:' + Math.min(100, x.n / need() * 100) + '%"></i></span><span class="small muted">' + x.n + ' / ' + need() + '</span></a>' : '';
      }).join('') + '<p><a class="btn btn-line btn-sm" href="/record/">' + ico('i-plus') + '기록 보태기</a></p></div>';
    }
    if (j.demo) h = '<p class="notice">지금 랭킹에는 화면 점검용 시험 데이터가 섞여 있어요.</p>' + h;
    list.innerHTML = h;
  }
  function load(push) {
    paintTabs();
    list.innerHTML = '<p class="muted loading">불러오는 중이에요</p>';
    if (push) {
      var p = new URLSearchParams();
      if (state.type !== 'total') p.set('type', state.type);
      if (state.sub) p.set('sub', state.sub);
      history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
    }
    Promise.all([MM.loadRamen(), MM.api('rank?type=' + state.type + (state.sub ? '&sub=' + state.sub : ''))]).then(function (r) {
      var j = r[1];
      if (!j.ok) { list.innerHTML = '<p class="muted">' + esc(j.message || '랭킹을 불러오지 못했어요.') + '</p>'; return; }
      draw(j);
    });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { state.type = t.dataset.type; state.sub = ''; load(true); }); });
  subBox.addEventListener('click', function (e) { var b = e.target.closest('[data-sub]'); if (!b) return; state.sub = b.dataset.sub; load(true); });
  load(false);
})();
