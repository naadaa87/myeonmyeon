/* 라면 한 개: 기록 요약, 맛 지도, 이렇게 먹었어요, 한 그릇 기록 목록, 먹어 봤어요·먹고 싶어요 */
(function () {
  'use strict';
  var MM = window.MM;
  var head = MM && MM.$('[data-ramen]');
  if (!head) return;
  var $ = MM.$, $$ = MM.$$, esc = MM.esc, ico = MM.ico, D = MM.D;
  var slug = head.dataset.ramen, name = head.dataset.name;
  var state = { sort: 'helpful', page: 1 };
  var me = null, data = null;
  MM.track('view', slug);

  var pct = function (a, b) { return b ? Math.round(a / b * 100) : 0; };
  function distRows(rows, total, labels, cls) {
    return '<div class="dist">' + rows.map(function (r) {
      return '<div class="dist-row ' + (cls || '') + '"><span>' + esc(labels ? (labels[r[0]] || r[0]) : r[0]) + '</span><span class="bar"><i style="width:' + pct(r[1], total) + '%"></i></span><span>' + r[1] + '</span></div>';
    }).join('') + '</div>';
  }

  function paintScore(s) {
    var box = $('[data-score]');
    var again = s.again.yes + s.again.maybe + s.again.no;
    if (!s.n) {
      box.innerHTML = '<div class="stat-box wait"><b>아직 기록이 없어요</b><span>첫 한 그릇을 남겨 주세요. 기록 ' + s.need + '개가 모이면 랭킹에 올라요.</span></div>';
      return;
    }
    box.innerHTML =
      '<div class="stat-box"><b>' + ico('i-star') + s.avg.toFixed(1) + '</b><span>평균 별점 · 기록 ' + s.n + '개</span></div>' +
      (s.rank ? '<div class="stat-box"><b>' + s.rank.pos + '위</b><span>종합 랭킹 (' + s.rank.of + '개 중)</span></div>'
        : '<div class="stat-box wait"><b>' + s.n + ' / ' + s.need + '</b><span>랭킹까지 기록 ' + Math.max(0, s.need - s.n) + '개 남았어요</span></div>') +
      (again ? '<div class="stat-box"><b>' + pct(s.again.yes, again) + '%</b><span>또 먹을래요 (' + again + '명 답함)</span></div>' : '');
  }

  function paintTaste(s) {
    var box = $('[data-taste]');
    var any = s.axes.some(function (a) { return a.n > 0; });
    if (!any) {
      box.innerHTML = '<p class="muted">아직 맛 지도를 채운 기록이 없어요. 기록할 때 맵기, 진하기 같은 칸을 채우면 여기에 그려져요.</p><p><a class="btn btn-line btn-sm" href="/record/?r=' + slug + '">맛 지도 채우러 가기</a></p>';
      return;
    }
    var vals = s.axes.map(function (a) { return a.n >= 1 ? a.v : null; });
    box.innerHTML = MM.radar([{ v: vals, cls: '' }], 320) +
      '<div class="axes">' + D.AXES.map(function (a, i) {
        var x = s.axes[i];
        return '<div><div class="axrow"><b>' + esc(a.name) + '</b><span class="axbar">' + (x.v != null ? '<i style="width:' + (x.v / 5 * 100) + '%"></i>' : '') + '</span><small>' + (x.v != null ? x.v.toFixed(1) : '–') + '</small></div>' +
          '<div class="axrow"><span></span><span class="axends"><span>' + esc(a.lo) + '</span><span>' + (x.n ? x.n + '명 기록' : '기록 없음') + '</span><span>' + esc(a.hi) + '</span></span><span></span></div></div>';
      }).join('') + '</div>';
  }

  function paintHow(s) {
    var box = $('[data-how]');
    if (!s.n) { box.innerHTML = '<p class="muted">기록이 모이면 별점 분포, 끓인 방법, 함께 넣은 재료를 보여 드려요.</p>'; return; }
    var stars = [5, 4, 3, 2, 1].map(function (k) { return [k + '점', s.dist[k] || 0]; });
    var again = s.again.yes + s.again.maybe + s.again.no;
    var html = '<div class="how-box"><h3>별점 분포</h3>' + distRows(stars, s.n) + '</div>';
    if (again) html += '<div class="how-box"><h3>또 먹을래요?</h3>' + distRows([['yes', s.again.yes], ['maybe', s.again.maybe], ['no', s.again.no]], again, D.AGAIN, 'y') + '</div>';
    var cookN = s.cook.reduce(function (a, r) { return a + r[1]; }, 0);
    if (cookN) html += '<div class="how-box"><h3>면 익힘</h3>' + distRows(s.cook, cookN, D.COOKS) + '</div>';
    var waterN = s.water.reduce(function (a, r) { return a + r[1]; }, 0);
    if (waterN) html += '<div class="how-box"><h3>물 양</h3>' + distRows(s.water, waterN, D.WATERS) + '</div>';
    if (s.adds.length) html += '<div class="how-box"><h3>함께 넣은 재료</h3><p class="tag-cloud">' + s.adds.map(function (r) { return '<span>' + esc(r[0]) + '<em>' + r[1] + '</em></span>'; }).join('') + '</p></div>';
    if (s.tags.length) html += '<div class="how-box"><h3>한 줄 느낌</h3><p class="tag-cloud">' + s.tags.map(function (r) { return '<span>' + esc(r[0]) + '<em>' + r[1] + '</em></span>'; }).join('') + '</p></div>';
    box.innerHTML = html;
  }

  function bowlHTML(b, mine) {
    var tags = (b.tags ? b.tags.split(',') : []).concat(b.adds ? b.adds.split(',').map(function (x) { return '+' + x; }) : []);
    var how = [b.cook && D.COOKS[b.cook], b.water && D.WATERS[b.water], b.place && D.PLACES[b.place]].filter(Boolean).join(' · ');
    return '<article class="bowl" id="b' + b.id + '">' +
      '<div class="bowl-top">' + (mine ? '<b>내 기록</b>' : MM.who(b)) + MM.starsSVG(b.rating / 2) +
      (b.again ? '<span class="again ' + b.again + '">' + esc(D.AGAIN[b.again]) + '</span>' : '') +
      (b.times > 1 ? '<span class="pill pill-sm">' + b.times + '번째 그릇</span>' : '') +
      (b.gifted ? '<span class="tag-gift" title="제조사·판매처에서 받은 제품이라 랭킹에서 빠져요">제품 받음</span>' : '') +
      (b.demo ? '<span class="tag-demo">시험 데이터</span>' : '') +
      '<span class="bowl-when">' + MM.ago(b.updated_at) + (b.updated_at !== b.created_at ? ' 고침' : '') + '</span></div>' +
      (b.body ? '<p class="bowl-body">' + esc(b.body) + '</p>' : '') +
      (how ? '<p class="small muted">' + esc(how) + '</p>' : '') +
      (tags.length ? '<p class="bowl-tags">' + tags.map(function (t) { return '<span class="pill pill-sm">' + esc(t) + '</span>'; }).join('') + '</p>' : '') +
      (mine ? '' : '<div class="bowl-foot"><button type="button" class="helpful-btn" data-helpful="' + b.id + '" aria-pressed="' + !!b.helped + '">' + ico('i-heart') + '도움돼요 <span>' + b.helpful + '</span></button>' + (me ? '<button type="button" class="link-btn small" data-flag="bowl" data-id="' + b.id + '">신고</button>' : '') + '</div>') +
      '</article>';
  }

  function paintBowls(j) {
    var box = $('[data-bowls]');
    var my = j.my && j.my.bowl;
    var h = '';
    if (my) {
      h += '<div class="my-bowl"><div class="bowl-top"><b>내 기록</b>' + MM.starsSVG(my.rating / 2) + (my.again ? '<span class="again ' + my.again + '">' + esc(D.AGAIN[my.again]) + '</span>' : '') + '<span class="bowl-when">' + MM.ago(my.updated_at) + '</span></div>' +
        (my.body ? '<p class="bowl-body">' + esc(my.body) + '</p>' : '') +
        '<p class="row-btns"><a class="btn btn-sub btn-sm" href="/record/?r=' + slug + '">' + ico('i-pen') + '고치기 · 한 번 더 먹었어요</a><button type="button" class="btn btn-ghost btn-sm" data-del-bowl>' + ico('i-trash') + '지우기</button></p></div>';
    } else {
      h += '<p class="row-btns" style="margin:0 0 12px"><a class="btn btn-main" href="/record/?r=' + slug + '">' + ico('i-plus') + (j.total ? '나도 기록하기' : '첫 기록 남기기') + '</a></p>';
    }
    var others = j.bowls.filter(function (b) { return !b.mine; });
    if (j.total) {
      h += '<div class="sort-row"><span class="small muted">기록 ' + j.total + '개</span><span style="flex:1"></span>' +
        [['helpful', '도움돼요 순'], ['new', '최신 순']].map(function (o) { return '<button type="button" class="chip" aria-pressed="' + (state.sort === o[0]) + '" data-sort="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
      h += '<div class="bowl-list">' + (others.length ? others.map(function (b) { return bowlHTML(b, false); }).join('') : '<p class="muted">다른 사람의 기록은 아직 없어요.</p>') + '</div>';
      var pages = Math.ceil(j.total / j.per);
      if (pages > 1) {
        h += '<nav class="pager" aria-label="기록 쪽">';
        for (var p = 1; p <= Math.min(pages, 20); p++) h += '<button type="button" data-page="' + p + '"' + (p === j.page ? ' aria-current="page"' : '') + '>' + p + '</button>';
        h += '</nav>';
      }
    } else if (!my) {
      h += '<p class="muted">아직 아무도 기록하지 않았어요. 먹어 봤다면 첫 기록을 남겨 주세요.</p>';
    }
    box.innerHTML = h;
  }

  function paintMarks(counts, mine) {
    $$('[data-mark]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(mine.indexOf(b.dataset.mark) > -1));
      var c = $('[data-mc="' + b.dataset.mark + '"]');
      if (c) c.textContent = counts[b.dataset.mark] ? counts[b.dataset.mark] : '';
    });
  }

  function paintPosts(posts) {
    var sec = $('[data-posts-sec]');
    if (!posts || !posts.length) return;
    sec.hidden = false;
    $('[data-posts]').innerHTML = posts.map(function (p) {
      return '<li><a href="/club/post/?id=' + p.id + '"><span class="badge-cat c-' + p.cat + '">' + esc(D.POST_CATS[p.cat] || '') + '</span><b>' + esc(p.title) + '</b><span class="small muted">' + MM.ago(p.created_at) + (p.comments ? ' · 댓글 ' + p.comments : '') + '</span></a></li>';
    }).join('');
  }

  function load() {
    return Promise.all([MM.api('ramen/' + slug + '?sort=' + state.sort + '&page=' + state.page), MM.getMe()]).then(function (r) {
      var j = r[0]; me = r[1];
      if (!j.ok) { $('[data-score]').innerHTML = '<p class="muted">' + esc(j.message || '기록을 불러오지 못했어요.') + '</p>'; ['[data-taste]', '[data-how]', '[data-bowls]'].forEach(function (s) { $(s).innerHTML = '<p class="muted">잠시 뒤 다시 열어 주세요.</p>'; }); return; }
      data = j;
      paintScore(j.summary);
      paintTaste(j.summary);
      paintHow(j.summary);
      paintBowls(j);
      paintMarks(j.counts, j.my ? j.my.marks : []);
      paintPosts(j.posts);
      var rb = $('[data-rec-btn]');
      if (rb && j.my && j.my.bowl) rb.innerHTML = ico('i-pen') + '내 기록 고치기';
    });
  }

  // 먹어 봤어요, 먹고 싶어요
  $$('[data-mark]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!me) { location.href = '/me/?next=' + encodeURIComponent(location.pathname); return; }
      var on = b.getAttribute('aria-pressed') !== 'true';
      MM.api('ramen/' + slug + '/mark', { method: 'POST', body: { kind: b.dataset.mark, on: on } }).then(function (j) {
        if (!j.ok) { MM.toast(j.message); return; }
        paintMarks(j.counts, j.mine);
        if (j.gain) MM.gain(j.gain);
        else MM.toast(on ? (b.dataset.mark === 'tried' ? '먹어 본 라면에 넣었어요.' : '먹고 싶은 라면에 넣었어요.') : '표시를 지웠어요.');
      });
    });
  });

  // 기록 목록의 버튼들
  $('[data-bowls]').addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.sort) { state.sort = t.dataset.sort; state.page = 1; load(); return; }
    if (t.dataset.page) { state.page = Number(t.dataset.page); load().then(function () { $('#bowls').scrollIntoView({ behavior: 'smooth' }); }); return; }
    if (t.dataset.helpful) {
      if (!me) { MM.toast('로그인하면 누를 수 있어요.'); return; }
      MM.api('bowls/' + t.dataset.helpful + '/helpful', { method: 'POST' }).then(function (j) {
        if (!j.ok) { MM.toast(j.message); return; }
        t.setAttribute('aria-pressed', String(j.helped));
        $('span', t).textContent = j.helpful;
      });
      return;
    }
    if (t.dataset.flag) { openFlag(t.dataset.flag, Number(t.dataset.id)); return; }
    if (t.hasAttribute('data-del-bowl')) {
      if (!confirm('내 기록을 지울까요? 받은 점수도 되돌려요.')) return;
      MM.api('ramen/' + slug + '/bowl', { method: 'DELETE' }).then(function (j) { if (j.ok) { MM.toast('기록을 지웠어요.'); MM.loadStats(true); load(); } else MM.toast(j.message); });
    }
  });

  // 신고
  function openFlag(target, id) {
    var reason = prompt('신고하는 까닭을 짧게 적어 주세요. (예: 광고, 먹지 않은 기록, 욕설)');
    if (reason === null) return;
    MM.api('flag', { method: 'POST', body: { target: target, id: id, reason: reason } }).then(function (j) { MM.toast(j.ok ? '신고를 받았어요. 확인할게요.' : j.message); });
  }

  load();
  void name; void data;
})();
