/* 처음 화면: 이번 주 랭킹, 후루룩클럽 새 소식 */
(function () {
  'use strict';
  var MM = window.MM;
  if (!MM) return;
  var $ = MM.$, esc = MM.esc, ico = MM.ico, D = MM.D;

  function move(x, pos) {
    if (x.prev == null) return '<span class="move new">새로</span>';
    if (x.prev > pos) return '<span class="move up">' + ico('i-up') + (x.prev - pos) + '</span>';
    if (x.prev < pos) return '<span class="move down">' + ico('i-down') + (pos - x.prev) + '</span>';
    return '<span class="move">–</span>';
  }
  function pending(list, need, total) {
    if (!list.length) {
      return '<div class="pending"><h3>아직 랭킹을 매길 기록이 없어요</h3><p class="small muted">라면마다 기록이 ' + need + '개 모이면 순위에 올라요. 오늘 먹은 라면부터 남겨 주세요.</p><p><a class="btn btn-main" href="/record/">' + ico('i-plus') + '첫 기록 남기기</a></p></div>';
    }
    return '<div class="pending"><h3>기록 모으는 중</h3><p class="small muted">라면마다 기록이 ' + need + '개 모이면 순위에 올라요.' + (total ? '' : ' 지금은 아직 순위에 오른 라면이 없어요.') + '</p>' +
      list.map(function (x) {
        var r = MM.BY[x.s];
        if (!r) return '';
        return '<a class="pend-row" href="/ramen/' + x.s + '/"><b>' + esc(r.n) + '</b><span class="bar"><i style="width:' + Math.min(100, x.n / need * 100) + '%"></i></span><span class="small muted">' + x.n + ' / ' + need + '</span></a>';
      }).join('') + '</div>';
  }
  function rankBox(j) {
    var box = $('[data-home-rank]');
    var need = j.rule.minN;
    if (!j.rank.length) { box.innerHTML = pending(j.pending, need, 0); return; }
    var top = j.rank.slice(0, 3), rest = j.rank.slice(3, 6);
    var h = '<div class="podium">' + top.map(function (x, i) {
      var r = MM.BY[x.s];
      return '<a class="pod" href="/ramen/' + x.s + '/"><span class="rnum n' + (i + 1) + '">' + (i + 1) + '</span><img src="' + MM.imgOf(r) + '" alt="" width="800" height="800" loading="lazy"><div><p class="pod-meta">' + esc(r.mn) + ' · ' + esc(D.STYLES[r.c]) + '</p><p class="pod-name">' + esc(r.n) + '</p><p>' + MM.scoreHTML(x.score) + ' <span class="pod-meta">기록 ' + x.n + '개</span> ' + move(x, i + 1) + '</p></div></a>';
    }).join('') + '</div>';
    if (rest.length) {
      h += '<div class="rank-rows">' + rest.map(function (x, k) {
        var r = MM.BY[x.s], pos = k + 4;
        return '<a class="rrow" href="/ramen/' + x.s + '/"><span class="rnum">' + pos + '</span><img src="' + MM.imgOf(r) + '" alt="" width="56" height="56" loading="lazy"><span><span class="rrow-name">' + esc(r.n) + ' ' + move(x, pos) + '</span><span class="rrow-meta">' + esc(r.mn) + ' · 기록 ' + x.n + '개</span></span><span class="rrow-right">' + MM.scoreHTML(x.score) + '</span></a>';
      }).join('') + '</div>';
    }
    if (j.rank.length < 3 && j.pending.length) h += pending(j.pending.slice(0, 4), need, j.rank.length);
    box.innerHTML = h;
  }
  function feed(home, cm) {
    var box = $('[data-home-feed]');
    var posts = (cm.posts || []).slice(0, 5), bowls = (home.recent || []).slice(0, 5), events = (cm.events || []).slice(0, 4);
    var col = function (title, icon, href, inner, emptyText) {
      return '<div class="feed-col"><h3>' + ico(icon) + title + '</h3>' + (inner || '<p class="small muted">' + emptyText + '</p>') + '<p style="margin-top:8px"><a class="more-link" href="' + href + '">더 보기' + ico('i-chev') + '</a></p></div>';
    };
    box.innerHTML =
      col('게시판 새 글', 'i-chat', '/club/board/', posts.length ? '<ul class="mini-list">' + posts.map(function (p) {
        return '<li><a href="/club/post/?id=' + p.id + '"><span class="badge-cat c-' + p.cat + '">' + esc(D.POST_CATS[p.cat] || '') + '</span> <b>' + esc(p.title) + '</b><span class="mini-meta">' + (p.gone ? '탈퇴한 회원' : esc(p.nick)) + ' · ' + MM.ago(p.created_at) + (p.comments ? ' · 댓글 ' + p.comments : '') + '</span></a></li>';
      }).join('') + '</ul>' : '', '첫 글을 기다리고 있어요.') +
      col('방금 남긴 한 그릇', 'i-bowl', '/club/feed/', bowls.length ? '<ul class="mini-list">' + bowls.map(function (b) {
        var r = MM.BY[b.slug];
        return r ? '<li><a href="/ramen/' + b.slug + '/#bowls"><b>' + esc(r.n) + '</b> ' + MM.starsSVG(b.rating / 2) + (b.demo ? ' <span class="tag-demo">시험</span>' : '') + '<span class="mini-meta">' + (b.gone ? '탈퇴한 회원' : esc(b.nick)) + ' · ' + MM.ago(b.updated_at) + '</span></a></li>' : '';
      }).join('') + '</ul>' : '', '아직 기록이 없어요. 첫 그릇을 남겨 주세요.') +
      col('다가오는 시식회·번개', 'i-cal', '/club/events/', events.length ? '<ul class="mini-list">' + events.map(function (e) {
        return '<li><a href="/club/event/?id=' + e.id + '"><b>' + esc(e.title) + '</b><span class="mini-meta">' + esc(e.region) + ' · ' + esc(e.starts_at.replace('T', ' ')) + ' · ' + e.attendee_count + '/' + e.max_people + '명</span></a></li>';
      }).join('') + '</ul>' : '', '잡힌 모임이 아직 없어요. 같이 먹을 사람을 모아 보세요.');
  }
  Promise.all([MM.loadRamen(), MM.api('home'), MM.api('community/home')]).then(function (r) {
    var home = r[1], cm = r[2];
    if (home.ok) rankBox(home);
    else $('[data-home-rank]').innerHTML = '<p class="muted">' + esc(home.message || '랭킹을 불러오지 못했어요.') + '</p>';
    feed(home.ok ? home : {}, cm.ok ? cm : {});
    if (home.ok && home.demo) { var bar = $('[data-demo-bar]'); if (bar) bar.hidden = false; }
  });
})();
