/* 후루룩클럽: 클럽 홈, 게시판, 글, 글쓰기, 한 그릇 피드, 시식회·번개, 사람 랭킹, 회원 도감 */
(function () {
  'use strict';
  var MM = window.MM;
  var root = MM && MM.$('[data-cm]');
  if (!root) return;
  var $ = MM.$, $$ = MM.$$, esc = MM.esc, ico = MM.ico, D = MM.D, api = MM.api;
  var CATS = D.POST_CATS, USER_CATS = D.USER_CATS, REGIONS = D.REGIONS;
  var KIND = { tasting: '시식회', flash: '번개' };
  var params = new URLSearchParams(location.search);
  var page = root.dataset.cm;
  var me = null;

  var render = function (h) { root.innerHTML = h; };
  var setTitle = function (t) { document.title = t + ' | 후루룩클럽 - ' + (D.SITE || '면면'); var h = $('[data-cm-title]'); if (h) h.textContent = t; };
  var loginLink = function () { return '/me/?next=' + encodeURIComponent(location.pathname + location.search); };
  function needLogin(text) { return '<div class="card" style="text-align:center;display:grid;gap:10px;justify-items:center"><p>' + esc(text) + '</p><p class="row-btns"><a class="btn btn-main" href="' + loginLink() + '">로그인</a><a class="btn btn-line" href="/me/?tab=signup&next=' + encodeURIComponent(location.pathname + location.search) + '">가입하기</a></p></div>'; }
  function notFound(text) { render('<div class="empty"><p>' + esc(text || '찾는 내용이 없어요.') + '</p><p><a class="btn btn-sub" href="/club/">클럽 홈으로</a></p></div>'); }
  var catBadge = function (c) { return '<span class="badge-cat c-' + c + '">' + esc(CATS[c] || '') + '</span>'; };
  var ramenPill = function (s) { var r = MM.BY[s]; return r ? '<a class="pill pill-sm" href="/ramen/' + s + '/">' + esc(r.n) + '</a>' : ''; };
  function whenText(stamp) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(stamp || '');
    if (!m) return '';
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return Number(m[2]) + '월 ' + Number(m[3]) + '일 (' + '일월화수목금토'[d.getUTCDay()] + ') ' + m[4] + ':' + m[5];
  }
  function dday(stamp) {
    var a = Date.parse(stamp.slice(0, 10) + 'T00:00:00Z'), b = Date.parse(MM.kstToday() + 'T00:00:00Z');
    var n = Math.round((a - b) / 86400e3);
    return n <= 0 ? '오늘' : n === 1 ? '내일' : 'D-' + n;
  }
  function pager(cur, per, total) {
    var pages = Math.ceil(total / per);
    if (pages <= 1) return '';
    var h = '<nav class="pager" aria-label="쪽">';
    var from = Math.max(1, cur - 4), to = Math.min(pages, from + 9);
    for (var p = from; p <= to; p++) h += '<button type="button" data-page="' + p + '"' + (p === cur ? ' aria-current="page"' : '') + '>' + p + '</button>';
    return h + '</nav>';
  }
  function bindPager(el, go) { $$('[data-page]', el).forEach(function (b) { b.addEventListener('click', function () { go(Number(b.dataset.page)); window.scrollTo({ top: 0 }); }); }); }
  function flag(target, id) {
    var reason = prompt('신고하는 까닭을 짧게 적어 주세요. (예: 광고, 욕설, 개인 정보)');
    if (reason === null) return;
    api('flag', { method: 'POST', body: { target: target, id: id, reason: reason } }).then(function (j) { MM.toast(j.ok ? '신고를 받았어요. 확인할게요.' : j.message); });
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-flag]');
    if (b) { e.preventDefault(); flag(b.dataset.flag, Number(b.dataset.id)); }
  });

  function postRow(p) {
    return '<a class="prow' + (p.pinned ? ' prow-pin' : '') + '" href="/club/post/?id=' + p.id + '">' + catBadge(p.cat) + '<span class="prow-t">' + esc(p.title) + (p.comments ? ' <span class="muted small">[' + p.comments + ']</span>' : '') + '</span>' +
      '<span class="prow-meta">' + (p.gone ? '탈퇴한 회원' : esc(p.nick) + (p.sys ? '' : ' ' + MM.lvChip(p.xp))) + '<span>' + MM.ago(p.created_at) + '</span>' + (p.likes ? '<span>좋아요 ' + p.likes + '</span>' : '') + (p.cat === 'qna' && p.adopted ? '<span style="color:#2F7D6D">답변 채택</span>' : '') + (p.game && MM.BY[p.game] ? '<span>' + esc(MM.BY[p.game].n) + '</span>' : '') + '</span></a>';
  }
  function eventCard(e) {
    return '<a class="ecard" href="/club/event/?id=' + e.id + '"><span class="ecard-top"><span class="k-' + e.kind + '">' + (KIND[e.kind] || '모임') + '</span><span class="dday">' + dday(e.starts_at) + '</span><span class="muted">' + esc(e.region) + '</span></span>' +
      '<span class="ecard-t">' + esc(e.title) + '</span><span class="ecard-meta">' + whenText(e.starts_at) + ' · ' + esc(e.place) + '</span><span class="ecard-meta">' + e.attendee_count + ' / ' + e.max_people + '명 · 여는 사람 ' + (e.gone ? '탈퇴한 회원' : esc(e.nick)) + '</span></a>';
  }
  function feedItem(b) {
    var r = MM.BY[b.slug];
    if (!r) return '';
    return '<a class="feed-item" href="/ramen/' + b.slug + '/#bowls"><img src="' + MM.imgOf(r) + '" alt="" width="56" height="56" loading="lazy"><div><p><b>' + esc(r.n) + '</b> ' + MM.starsSVG(b.rating / 2) + (b.again ? ' <span class="again ' + b.again + '">' + esc(D.AGAIN[b.again]) + '</span>' : '') + (b.demo ? ' <span class="tag-demo">시험</span>' : '') + '</p>' +
      (b.body ? '<p class="small">' + esc(b.body) + '</p>' : '') + '<p class="mini-meta">' + (b.gone ? '탈퇴한 회원' : esc(b.nick) + ' ' + MM.lvChip(b.xp)) + ' · ' + MM.ago(b.updated_at) + (b.times > 1 ? ' · ' + b.times + '번째 그릇' : '') + '</p></div></a>';
  }

  // ---------- 투표 ----------
  function pollHTML(poll) {
    var voted = poll.mine > -1 || poll.closed || !me;
    return '<div class="poll" data-poll>' + poll.options.map(function (o) {
      var p = poll.total ? Math.round(o.votes / poll.total * 100) : 0;
      return '<button type="button" class="poll-opt' + (poll.mine === o.idx ? ' mine' : '') + '" data-idx="' + o.idx + '"' + (voted ? ' disabled' : '') + '>' + (voted ? '<i style="width:' + p + '%"></i>' : '') + '<span>' + esc(o.label) + (poll.mine === o.idx ? ' ✓' : '') + '</span><span>' + (voted ? p + '% · ' + o.votes : '') + '</span></button>';
    }).join('') + '<p class="small muted">' + poll.total + '명 참여' + (poll.ends ? ' · ' + (poll.closed ? '마감됐어요' : poll.ends.replace(/-/g, '.') + '까지') : '') + (me ? '' : ' · 로그인하면 투표할 수 있어요') + '</p></div>';
  }
  function bindPoll(box, poll, id, repaint) {
    $$('[data-idx]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        api('posts/' + id + '/vote', { method: 'POST', body: { idx: Number(b.dataset.idx) } }).then(function (j) {
          if (!j.ok) { MM.toast(j.message); return; }
          if (j.gain) MM.gain(j.gain);
          repaint(j.poll);
        });
      });
    });
  }

  // ---------- 댓글 ----------
  function commentsHTML(list, target, id, label, adoptable) {
    label = label || '댓글';
    return '<section class="card"><h2>' + ico('i-chat') + label + ' <span class="muted">' + list.length + '</span></h2><ul class="cmt-list">' + list.map(function (c) {
      return '<li class="cmt' + (c.adopted ? ' adopted' : '') + '"><div class="cmt-top">' + (c.gone ? '<span class="muted">탈퇴한 회원</span>' : MM.who(c)) + '<span class="muted">' + MM.ago(c.created_at) + '</span>' + (c.adopted ? '<b style="color:#2F7D6D">채택된 답변</b>' : '') +
        (c.mine ? '<button type="button" class="link-btn small" data-cdel="' + c.id + '">지우기</button>' : me && !c.hidden ? '<button type="button" class="link-btn small" data-flag="comment" data-id="' + c.id + '">신고</button>' : '') +
        (adoptable && !c.mine && !c.hidden ? '<button type="button" class="btn btn-sub btn-sm" data-adopt="' + c.id + '">이 답변 채택하기</button>' : '') + '</div>' +
        '<p class="cmt-body">' + (c.hidden ? '<span class="muted">가려진 ' + label + '이에요.</span>' : esc(c.body)) + '</p></li>';
    }).join('') + '</ul>' +
      (me ? '<form class="cmt-form" data-cform><label class="sr" for="cbody">' + label + ' 쓰기</label><textarea id="cbody" class="input" name="body" rows="3" maxlength="1000" required placeholder="' + label + '을 남겨 주세요"></textarea><div class="row-btns" style="margin:0;justify-content:flex-end"><button class="btn btn-main btn-sm" type="submit">' + label + ' 쓰기</button></div></form>' : '<p class="small muted" style="margin-top:10px"><a href="' + loginLink() + '">로그인</a>하면 ' + label + '을 남길 수 있어요.</p>') + '</section>';
  }
  function bindComments(el, target, id, reload) {
    var f = $('[data-cform]', el);
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button[type=submit]', f); btn.disabled = true;
      api('comments', { method: 'POST', body: { target: target, id: id, body: f.body.value } }).then(function (j) {
        btn.disabled = false;
        if (!j.ok) { MM.toast(j.message); return; }
        if (j.gain) MM.gain(j.gain);
        reload();
      });
    });
    $$('[data-cdel]', el).forEach(function (b) {
      b.addEventListener('click', function () { if (confirm('댓글을 지울까요?')) api('comments/' + b.dataset.cdel, { method: 'DELETE' }).then(function (j) { if (j.ok) reload(); else MM.toast(j.message); }); });
    });
  }

  // ---------- 클럽 홈 ----------
  function hub() {
    Promise.all([api('community/home'), api('bowls'), MM.loadRamen()]).then(function (r) {
      var j = r[0], f = r[1];
      if (!j.ok) { notFound(j.message); return; }
      var lv = me && MM.G ? MM.G.level(me.xp) : null;
      render(
        (me ? '<div class="card checkin-card">' + MM.G.emblem(lv, 52) + '<div><b>' + esc(me.nick) + '님, 오늘도 한 그릇 하셨나요?</b><p class="small muted">Lv.' + lv.lv + ' ' + esc(lv.name) + (lv.next ? ' · 다음 등급까지 ' + lv.need + '점' : '') + (me.streak ? ' · ' + me.streak + '일 연속 출석' : '') + '</p></div><button type="button" class="btn ' + (me.checked ? 'btn-sub' : 'btn-main') + '" data-checkin' + (me.checked ? ' disabled' : '') + '>' + ico('i-check') + (me.checked ? '오늘 출석 완료' : '출석 체크 +2점') + '</button></div>'
          : '<div class="card checkin-card"><div><b>후루룩클럽에 오신 걸 반가워요</b><p class="small muted">가입하면 기록과 글로 점수를 모아 ‘첫 봉지’부터 ‘면면 명예의 전당’까지 올라갈 수 있어요.</p></div><a class="btn btn-main" href="/me/?tab=signup&next=/club/">가입하기</a></div>') +
        '<div class="row-btns" style="margin:0"><a class="btn btn-main" href="/club/write/">' + ico('i-pen') + '글쓰기</a><a class="btn btn-line" href="/club/write/?t=event">' + ico('i-cal') + '시식회·번개 열기</a><a class="btn btn-line" href="/record/">' + ico('i-plus') + '한 그릇 기록</a></div>' +
        '<div class="cm-grid">' +
        '<section class="card"><h2>' + ico('i-vote') + '지금 투표 중</h2><div data-hub-poll>' + (j.poll ? '<p><a href="/club/post/?id=' + j.poll.id + '"><b>' + esc(j.poll.title) + '</b></a></p>' : '<p class="muted">진행 중인 투표가 없어요.</p>') + '</div></section>' +
        '<section class="card"><h2>' + ico('i-trophy') + '이달의 활동왕</h2>' + ((j.top || []).length ? '<ol class="rank-list">' + j.top.map(function (x, i) { return '<li><span class="rank-n">' + (i + 1) + '</span>' + MM.who(x) + '<span class="rank-s">' + x.s + '점</span></li>'; }).join('') + '</ol>' : '<p class="muted">이달의 첫 활동왕이 되어 보세요.</p>') + '<p style="margin-top:8px"><a class="more-link" href="/club/people/">사람 랭킹' + ico('i-chev') + '</a></p></section>' +
        '</div>' +
        '<section><div class="sec-head"><h2><span>게시판 새 글</span></h2><a class="more-link" href="/club/board/">모두 보기' + ico('i-chev') + '</a></div><div class="card" style="padding:4px 14px">' + (j.posts.length ? j.posts.map(postRow).join('') : '<p class="muted" style="padding:12px 0">아직 글이 없어요.</p>') + '</div></section>' +
        '<section><div class="sec-head"><h2><span>방금 남긴 한 그릇</span></h2><a class="more-link" href="/club/feed/">모두 보기' + ico('i-chev') + '</a></div><div class="feed-list">' + ((f.bowls || []).slice(0, 6).map(feedItem).join('') || '<p class="muted">아직 기록이 없어요.</p>') + '</div></section>' +
        '<section><div class="sec-head"><h2><span>다가오는 시식회·번개</span></h2><a class="more-link" href="/club/events/">모두 보기' + ico('i-chev') + '</a></div>' + (j.events.length ? '<div class="ecards">' + j.events.map(eventCard).join('') + '</div>' : '<div class="card"><p class="muted">잡힌 모임이 아직 없어요. 같이 신상을 맛볼 사람을 모아 보세요.</p></div>') + '</section>'
      );
      var pb = $('[data-hub-poll]', root);
      if (pb && j.poll) {
        var paint = function (poll) { pb.innerHTML = '<p style="margin-bottom:6px"><a href="/club/post/?id=' + j.poll.id + '"><b>' + esc(j.poll.title) + '</b></a></p>' + pollHTML(poll); bindPoll(pb, poll, j.poll.id, paint); };
        paint(j.poll);
      }
      var ci = $('[data-checkin]', root);
      if (ci) ci.addEventListener('click', function () {
        ci.disabled = true;
        api('checkin', { method: 'POST' }).then(function (x) {
          if (!x.ok) { ci.disabled = false; MM.toast(x.message); return; }
          if (x.gain) MM.gain(x.gain); else MM.toast('오늘은 이미 출석했어요.');
          ci.innerHTML = ico('i-check') + '오늘 출석 완료'; ci.className = 'btn btn-sub';
          MM.getMe(true);
        });
      });
    });
  }

  // ---------- 게시판 ----------
  function board() {
    var state = { cat: params.get('cat') || '', game: params.get('ramen') || '', q: params.get('q') || '', page: 1 };
    var g = MM.BY[state.game];
    render('<div class="cm-bar"><div class="chips" role="radiogroup" aria-label="말머리">' + [['', '전체']].concat(Object.keys(CATS).map(function (k) { return [k, CATS[k]]; })).map(function (k) { return '<button type="button" class="chip" role="radio" aria-checked="' + (state.cat === k[0]) + '" data-cat="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div>' +
      '<a class="btn btn-main btn-sm" href="/club/write/' + (state.cat && USER_CATS.indexOf(state.cat) > -1 ? '?cat=' + state.cat : '') + '">' + ico('i-pen') + '글쓰기</a></div>' +
      '<form class="search-box" data-search>' + ico('i-search') + '<input type="search" name="q" placeholder="제목, 내용으로 찾기" maxlength="30" value="' + esc(state.q) + '" aria-label="글 찾기"></form>' +
      (g ? '<p class="small">' + ramenPill(state.game) + ' 이야기만 보고 있어요. <a href="/club/board/">전체 보기</a></p>' : '') +
      '<div class="card" style="padding:4px 14px" data-list><p class="muted loading">불러오는 중이에요</p></div>');
    var list = $('[data-list]', root);
    function load() {
      api('posts?page=' + state.page + (state.cat ? '&cat=' + state.cat : '') + (state.game ? '&game=' + state.game : '') + (state.q ? '&q=' + encodeURIComponent(state.q) : '')).then(function (j) {
        if (!j.ok) { list.innerHTML = '<p class="notice">' + esc(j.message) + '</p>'; return; }
        list.innerHTML = j.posts.length ? j.posts.map(postRow).join('') + pager(j.page, j.per, j.total) : '<p class="muted" style="padding:16px 0">조건에 맞는 글이 없어요. 첫 글을 남겨 보세요.</p>';
        bindPager(list, function (p) { state.page = p; load(); });
      });
    }
    $$('[data-cat]', root).forEach(function (c) { c.addEventListener('click', function () { state.cat = c.dataset.cat; state.page = 1; $$('[data-cat]', root).forEach(function (x) { x.setAttribute('aria-checked', String(x === c)); }); load(); }); });
    $('[data-search]', root).addEventListener('submit', function (e) { e.preventDefault(); state.q = e.target.q.value.trim(); state.page = 1; load(); });
    load();
  }

  // ---------- 글 하나 ----------
  function post() {
    var id = Number(params.get('id'));
    if (!id) { notFound('글 주소가 잘못됐어요.'); return; }
    function load() {
      api('posts/' + id).then(function (j) {
        if (!j.ok) { notFound(j.message); return; }
        var p = j.post;
        setTitle(p.title);
        render('<article class="card post-view"><p class="post-meta"><a href="/club/board/?cat=' + p.cat + '">' + catBadge(p.cat) + '</a>' + (p.game ? ramenPill(p.game) : '') + '</p>' +
          '<h1>' + esc(p.title) + '</h1><p class="post-meta">' + (p.gone ? '탈퇴한 회원' : MM.who(p)) + '<span>' + MM.ago(p.created_at) + (p.updated_at !== p.created_at ? ' (고침)' : '') + '</span><span>조회 ' + p.views + '</span></p>' +
          (p.hidden ? '<p class="notice">운영 규칙에 따라 다른 사람에게는 가려진 글이에요.</p>' : '') +
          (p.body ? '<div class="post-body">' + esc(p.body).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="nofollow noopener ugc">$1</a>') + '</div>' : '') +
          (j.poll ? '<div data-post-poll></div>' : '') +
          (p.cat === 'qna' ? (p.adopted ? '<p class="small" style="color:#2F7D6D;font-weight:800">' + ico('i-check') + ' 답변이 채택된 질문이에요.</p>' : '<p class="small muted">' + (p.mine ? '도움이 된 댓글에 ‘이 답변 채택하기’를 누르면 답한 사람이 점수와 별 3개를 받아요.' : '좋은 답을 달아 채택되면 +' + MM.G.RULES.adopted[0] + '점과 별 3개를 받아요.') + '</p>') : '') +
          '<div class="row-btns"><button type="button" class="btn ' + (p.liked ? 'btn-main' : 'btn-line') + '" data-like aria-pressed="' + p.liked + '">' + ico('i-heart') + '좋아요 ' + p.likes + '</button><button type="button" class="btn btn-ghost" data-share>' + ico('i-share') + '링크 보내기</button>' +
          (p.mine ? '<a class="btn btn-ghost" href="/club/write/?id=' + p.id + '">' + ico('i-pen') + '고치기</a><button type="button" class="btn btn-ghost" data-del>' + ico('i-trash') + '지우기</button>' : (me ? '<button type="button" class="link-btn" data-flag="post" data-id="' + p.id + '">신고</button>' : '')) + '</div></article>' +
          commentsHTML(j.comments, 'post', id, p.cat === 'qna' ? '답변' : '댓글', p.cat === 'qna' && p.mine && !p.adopted) +
          '<p style="text-align:center"><a class="btn btn-sub" href="/club/board/">목록으로</a></p>');
        var pp = $('[data-post-poll]', root);
        if (pp) { var paint = function (poll) { pp.innerHTML = pollHTML(poll); bindPoll(pp, poll, id, paint); }; paint(j.poll); }
        $('[data-like]', root).addEventListener('click', function () {
          if (!me) { location.href = loginLink(); return; }
          api('posts/' + id + '/like', { method: 'POST' }).then(function (x) {
            if (!x.ok) { MM.toast(x.message); return; }
            var b = $('[data-like]', root);
            b.className = 'btn ' + (x.liked ? 'btn-main' : 'btn-line'); b.setAttribute('aria-pressed', String(x.liked)); b.innerHTML = ico('i-heart') + '좋아요 ' + x.likes;
          });
        });
        $$('[data-adopt]', root).forEach(function (a) {
          a.addEventListener('click', function () {
            if (!confirm('이 댓글을 답변으로 채택할까요? 한 번 채택하면 바꿀 수 없어요.')) return;
            api('posts/' + id + '/adopt', { method: 'POST', body: { comment: Number(a.dataset.adopt) } }).then(function (x) { if (!x.ok) { MM.toast(x.message); return; } if (x.gain) MM.gain(x.gain); load(); });
          });
        });
        var del = $('[data-del]', root);
        if (del) del.addEventListener('click', function () { if (confirm('이 글을 지울까요? 댓글도 함께 지워져요.')) api('posts/' + id, { method: 'DELETE' }).then(function (x) { if (x.ok) location.href = '/club/board/'; else MM.toast(x.message); }); });
        bindComments(root, 'post', id, load);
      });
    }
    load();
  }

  // ---------- 글쓰기 (글, 시식회·번개) ----------
  function ramenSelect(name, cur) {
    return '<select name="' + name + '"><option value="">어떤 라면 이야기인가요? (선택)</option>' + Object.keys(MM.BY).map(function (s) { return MM.BY[s]; }).sort(function (a, b) { return a.n.localeCompare(b.n, 'ko'); }).map(function (r) { return '<option value="' + r.s + '"' + (r.s === cur ? ' selected' : '') + '>' + esc(r.n) + ' (' + esc(r.mn) + ')</option>'; }).join('') + '</select>';
  }
  function write() {
    var t = params.get('t') === 'event' ? 'event' : 'post', id = Number(params.get('id')) || 0;
    var title = id ? (t === 'event' ? '모임 고치기' : '글 고치기') : (t === 'event' ? '시식회·번개 열기' : '글쓰기');
    setTitle(title);
    if (!me) { render(needLogin('로그인한 회원만 ' + (t === 'event' ? '모임을 열' : '글을 쓸') + ' 수 있어요.')); return; }
    (id ? api((t === 'event' ? 'events/' : 'posts/') + id) : Promise.resolve(null)).then(function (j) {
      var old = j ? (j.post || j.event) : null;
      if (id && (!old || !old.mine)) { notFound('내가 쓴 ' + (t === 'event' ? '모임' : '글') + '만 고칠 수 있어요.'); return; }
      old = old || {};
      var form = '';
      if (t === 'post') {
        var cat = old.cat || params.get('cat') || 'talk';
        if (USER_CATS.indexOf(cat) < 0) cat = 'talk';
        var keys = id ? USER_CATS.filter(function (k) { return (k === 'poll') === (cat === 'poll'); }) : USER_CATS;
        form = '<label class="field"><span>말머리</span><select name="cat" data-catsel>' + keys.map(function (k) { return '<option value="' + k + '"' + (k === cat ? ' selected' : '') + '>' + CATS[k] + '</option>'; }).join('') + '</select></label>' +
          '<label class="field"><span>제목</span><input name="title" maxlength="60" required value="' + esc(old.title || '') + '"></label>' +
          '<label class="field"><span>라면 (선택)</span>' + ramenSelect('game', old.game || params.get('ramen') || '') + '</label>' +
          (id ? '' : '<div class="field" data-pollf' + (cat === 'poll' ? '' : ' hidden') + '><span>투표 보기 (2~6개)</span>' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<input class="input" data-opt maxlength="40" placeholder="보기 ' + (i + 1) + (i < 2 ? '' : ' (선택)') + '">'; }).join('') +
            '<label class="field"><span>투표 기간</span><select name="days"><option value="3">3일</option><option value="7" selected>7일</option><option value="14">14일</option></select></label></div>') +
          '<label class="field"><span data-blabel>' + (cat === 'poll' ? '설명 (선택)' : '내용') + '</span><textarea name="body" rows="10" maxlength="5000" placeholder="조합이나 레시피라면 넣은 재료와 순서, 물 양을 적어 주면 따라 하기 쉬워요.">' + esc(old.body || '') + '</textarea></label>';
      } else {
        var tomorrow = new Date(Date.now() + 9 * 3600e3 + 86400e3).toISOString().slice(0, 10) + 'T19:00';
        var kind = old.kind || 'flash';
        form = '<fieldset class="field"><legend>종류</legend><div class="chips" role="radiogroup" data-kindpick>' + [['flash', '번개 (같이 한 끼)'], ['tasting', '시식회 (여러 라면 나눠 먹기)']].map(function (k) { return '<button type="button" class="chip" role="radio" aria-checked="' + (kind === k[0]) + '" data-k="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div><input type="hidden" name="kind" value="' + kind + '"></fieldset>' +
          '<label class="field"><span>제목</span><input name="title" maxlength="40" required value="' + esc(old.title || '') + '" placeholder="예: 신상 볶음면 셋 나눠 먹어요"></label>' +
          '<div class="field-row"><label class="field"><span>지역</span><select name="region" required><option value="">골라 주세요</option>' + REGIONS.map(function (r) { return '<option' + (r === (old.region || me.region) ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></label>' +
          '<label class="field"><span>만날 곳</span><input name="place" maxlength="60" required value="' + esc(old.place || '') + '" placeholder="예: 망원역 근처 공유주방"></label></div>' +
          '<div class="field-row"><label class="field"><span>날짜와 시각</span><input type="datetime-local" name="starts_at" required value="' + esc(old.starts_at || tomorrow) + '"></label>' +
          '<label class="field"><span>최대 인원 (나 포함)</span><input type="number" name="max_people" min="2" max="50" required value="' + (old.max_people || 4) + '"></label></div>' +
          '<label class="field"><span>회비 (선택)</span><input name="fee" maxlength="30" value="' + esc(old.fee || '') + '" placeholder="예: 라면값 나눠 내기, 없음"></label>' +
          '<label class="field"><span>함께 맛볼 라면 (선택)</span>' + ramenSelect('games', String(old.games || '').split(',')[0] || '') + '</label>' +
          '<label class="field"><span>소개</span><textarea name="body" rows="7" maxlength="2000" placeholder="무엇을 먹고, 무엇을 가져오면 되는지 적어 주세요.">' + esc(old.body || '') + '</textarea></label>' +
          '<p class="small muted">처음 만나는 사람과는 사람 많은 곳에서 만나요. 돈을 미리 보내라는 요구에는 응하지 마세요.</p>';
      }
      render('<form class="card write-form" data-wform>' + form + '<label class="hp" aria-hidden="true">비워 두세요<input name="website" tabindex="-1" autocomplete="off"></label><p class="form-msg" role="status" aria-live="polite"></p><div class="row-btns"><button class="btn btn-main btn-lg" type="submit">' + (id ? '고친 내용 저장' : t === 'event' ? '모임 열기' : '올리기') + '</button><a class="btn btn-sub btn-lg" href="' + (t === 'event' ? '/club/events/' : '/club/board/') + '">취소</a></div></form>');
      var f = $('[data-wform]', root);
      var cs = $('[data-catsel]', f);
      if (cs) cs.addEventListener('change', function () { var poll = cs.value === 'poll'; var pf = $('[data-pollf]', f); if (pf) pf.hidden = !poll; $('[data-blabel]', f).textContent = poll ? '설명 (선택)' : '내용'; });
      var kp = $('[data-kindpick]', f);
      if (kp) kp.addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (!b) return; $$('[data-k]', kp).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); }); f.kind.value = b.dataset.k; });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = $('.form-msg', f), btn = $('button[type=submit]', f), body = {};
        $$('input[name], select[name], textarea[name]', f).forEach(function (el) { body[el.name] = el.value; });
        if (t === 'post' && body.cat === 'poll') body.options = $$('[data-opt]', f).map(function (x) { return x.value.trim(); }).filter(Boolean);
        if (t === 'event') { body.games = body.games ? [body.games] : []; body.max_people = Number(body.max_people); }
        btn.disabled = true;
        api((t === 'event' ? 'events' : 'posts') + (id ? '/' + id : ''), { method: 'POST', body: body }).then(function (x) {
          btn.disabled = false;
          if (!x.ok) { msg.className = 'form-msg err'; msg.textContent = x.message || '저장하지 못했어요.'; return; }
          if (x.gain) MM.gainLater(x.gain);
          location.href = (t === 'event' ? '/club/event/?id=' : '/club/post/?id=') + x.id;
        });
      });
    });
  }

  // ---------- 한 그릇 피드 ----------
  function feed() {
    var state = { page: 1, memo: params.get('memo') === '1' };
    render('<div class="chips" role="radiogroup">' + [['0', '모든 기록'], ['1', '메모가 있는 기록']].map(function (k) { return '<button type="button" class="chip" role="radio" aria-checked="' + ((state.memo ? '1' : '0') === k[0]) + '" data-m="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div><div class="feed-list" data-list></div><p style="text-align:center"><button type="button" class="btn btn-line" data-more hidden>더 보기</button></p>');
    var list = $('[data-list]', root), more = $('[data-more]', root);
    function load(append) {
      api('bowls?page=' + state.page + (state.memo ? '&memo=1' : '')).then(function (j) {
        var h = (j.bowls || []).map(feedItem).join('');
        if (append) list.insertAdjacentHTML('beforeend', h); else list.innerHTML = h || '<div class="card"><p class="muted">아직 기록이 없어요. <a href="/record/">첫 그릇을 남겨 주세요.</a></p></div>';
        more.hidden = !j.bowls || j.bowls.length < 20;
      });
    }
    $$('[data-m]', root).forEach(function (b) { b.addEventListener('click', function () { state.memo = b.dataset.m === '1'; state.page = 1; $$('[data-m]', root).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); }); load(false); }); });
    more.addEventListener('click', function () { state.page++; load(true); });
    load(false);
  }

  // ---------- 시식회·번개 ----------
  function events() {
    var state = { region: '', kind: '', page: 1 };
    render('<div class="cm-bar"><div class="chips" role="radiogroup">' + [['', '전체'], ['tasting', '시식회'], ['flash', '번개']].map(function (k) { return '<button type="button" class="chip" role="radio" aria-checked="' + (state.kind === k[0]) + '" data-kind="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div>' +
      '<label class="sel"><span class="sr">지역</span><select data-region><option value="">지역 전체</option>' + REGIONS.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></label>' +
      '<a class="btn btn-main btn-sm" href="/club/write/?t=event">' + ico('i-cal') + '모임 열기</a></div><div data-list><p class="muted loading">불러오는 중이에요</p></div>');
    var list = $('[data-list]', root);
    function load() {
      api('events?page=' + state.page + (state.region ? '&region=' + encodeURIComponent(state.region) : '') + (state.kind ? '&kind=' + state.kind : '')).then(function (j) {
        if (!j.ok) { list.innerHTML = '<p class="notice">' + esc(j.message) + '</p>'; return; }
        list.innerHTML = j.events.length ? '<div class="ecards">' + j.events.map(eventCard).join('') + '</div>' + pager(j.page, j.per, j.total) : '<div class="card" style="text-align:center"><p class="muted">조건에 맞는 모임이 아직 없어요.</p><p style="margin-top:10px"><a class="btn btn-main" href="/club/write/?t=event">첫 모임 열기</a></p></div>';
        bindPager(list, function (p) { state.page = p; load(); });
      });
    }
    $$('[data-kind]', root).forEach(function (c) { c.addEventListener('click', function () { state.kind = c.dataset.kind; state.page = 1; $$('[data-kind]', root).forEach(function (x) { x.setAttribute('aria-checked', String(x === c)); }); load(); }); });
    $('[data-region]', root).addEventListener('change', function (e) { state.region = e.target.value; state.page = 1; load(); });
    load();
  }
  function event() {
    var id = Number(params.get('id'));
    if (!id) { notFound('모임 주소가 잘못됐어요.'); return; }
    function load() {
      api('events/' + id).then(function (j) {
        if (!j.ok) { notFound(j.message); return; }
        var e = j.event;
        setTitle(e.title);
        var full = e.attendee_count >= e.max_people;
        render('<article class="card post-view"><p class="post-meta"><span class="k-' + e.kind + '">' + (KIND[e.kind] || '모임') + '</span>' + (e.past ? '<span>지난 모임</span>' : '<span class="dday">' + dday(e.starts_at) + '</span>') + '<span>' + esc(e.region) + '</span></p>' +
          '<h1>' + esc(e.title) + '</h1>' +
          '<dl class="facts"><div><dt>언제</dt><dd>' + whenText(e.starts_at) + '</dd></div><div><dt>어디서</dt><dd>' + esc(e.place) + '</dd></div><div><dt>인원</dt><dd>' + e.attendee_count + ' / ' + e.max_people + '명</dd></div>' + (e.fee ? '<div><dt>회비</dt><dd>' + esc(e.fee) + '</dd></div>' : '') + (e.games ? '<div><dt>라면</dt><dd>' + String(e.games).split(',').map(ramenPill).join(' ') + '</dd></div>' : '') + '<div><dt>여는 사람</dt><dd>' + (e.gone ? '탈퇴한 회원' : MM.who(e)) + '</dd></div></dl>' +
          (e.body ? '<div class="post-body">' + esc(e.body) + '</div>' : '') +
          '<div class="row-btns">' + (e.past ? '' : e.joined ? (e.mine ? '' : '<button type="button" class="btn btn-line" data-leave>참여 취소</button>') : (me ? '<button type="button" class="btn btn-main" data-join' + (full ? ' disabled' : '') + '>' + (full ? '정원이 찼어요' : '참여 신청') + '</button>' : '<a class="btn btn-main" href="' + loginLink() + '">로그인하고 참여하기</a>')) +
          '<button type="button" class="btn btn-ghost" data-share>' + ico('i-share') + '링크 보내기</button>' +
          (e.mine ? '<a class="btn btn-ghost" href="/club/write/?t=event&id=' + e.id + '">고치기</a><button type="button" class="btn btn-ghost" data-del>지우기</button>' : me ? '<button type="button" class="link-btn" data-flag="event" data-id="' + e.id + '">신고</button>' : '') + '</div></article>' +
          '<section class="card"><h2>' + ico('i-people') + '참여하는 사람 <span class="muted">' + j.people.length + '</span></h2><p class="people">' + j.people.map(function (p) { return '<span>' + esc(p.nick) + '</span>'; }).join('') + '</p></section>' +
          (j.manner && j.manner.people.length ? '<section class="card" data-manner><h2>' + ico('i-heart') + '함께한 사람들, 매너는 어땠나요?</h2><p class="small muted">모임이 끝나고 14일 안에 남길 수 있어요. 점수는 이름 없이 평균으로만 보여요.</p>' +
            j.manner.people.map(function (p) { return '<div class="manner-row" data-mnick="' + esc(p.nick) + '"' + (p.score ? ' data-score="' + p.score + '"' : '') + '><b>' + esc(p.nick) + '</b><span class="star-pick">' + [1, 2, 3, 4, 5].map(function (k) { return '<button type="button" aria-label="' + k + '점" data-ms="' + k + '" class="' + (k <= p.score ? 'on' : '') + '"' + (p.score ? ' disabled' : '') + '><svg aria-hidden="true"><use href="#i-star"/></svg></button>'; }).join('') + '</span></div>'; }).join('') +
            (j.manner.people.every(function (p) { return p.score; }) ? '<p class="small"><b>모두 평가했어요. 고마워요!</b></p>' : '<p class="row-btns"><button type="button" class="btn btn-main btn-sm" data-msave>매너 별점 남기기</button></p>') + '</section>' : '') +
          commentsHTML(j.comments, 'event', id, '댓글', false));
        var on = function (sel, fn) { var el = $(sel, root); if (el) el.addEventListener('click', fn); };
        on('[data-join]', function () { api('events/' + id + '/join', { method: 'POST' }).then(function (x) { if (!x.ok) { MM.toast(x.message); return; } if (x.gain) MM.gain(x.gain); else MM.toast('참여 신청했어요.'); load(); }); });
        on('[data-leave]', function () { if (confirm('참여를 취소할까요?')) api('events/' + id + '/leave', { method: 'POST' }).then(function (x) { if (x.ok) load(); else MM.toast(x.message); }); });
        on('[data-del]', function () { if (confirm('이 모임을 지울까요? 참여 신청과 댓글도 함께 지워져요.')) api('events/' + id, { method: 'DELETE' }).then(function (x) { if (x.ok) location.href = '/club/events/'; else MM.toast(x.message); }); });
        var mb = $('[data-manner]', root);
        if (mb) {
          $$('.manner-row', mb).forEach(function (row) {
            $$('[data-ms]', row).forEach(function (s) { s.addEventListener('click', function () { var v = Number(s.dataset.ms); row.dataset.score = v; $$('[data-ms]', row).forEach(function (x) { x.classList.toggle('on', Number(x.dataset.ms) <= v); }); }); });
          });
          on('[data-msave]', function () {
            var scores = {};
            $$('.manner-row', mb).forEach(function (row) { if (row.dataset.score) scores[row.dataset.mnick] = Number(row.dataset.score); });
            api('events/' + id + '/manner', { method: 'POST', body: { scores: scores } }).then(function (x) { if (!x.ok) { MM.toast(x.message); return; } if (x.gain) MM.gain(x.gain); else MM.toast('매너 별점을 남겼어요.'); load(); });
          });
        }
        bindComments(root, 'event', id, load);
      });
    }
    load();
  }

  // ---------- 사람 랭킹 ----------
  function people() {
    api('rank/people').then(function (j) {
      if (!j.ok) { notFound(j.message); return; }
      var box = function (title, icon, list, unit, emptyText) {
        return '<section class="card"><h2>' + ico(icon) + title + '</h2>' + (list.length ? '<ol class="rank-list">' + list.map(function (x, i) { return '<li><span class="rank-n">' + (i + 1) + '</span>' + MM.who(x) + '<span class="rank-s">' + x.s.toLocaleString('ko-KR') + unit + '</span></li>'; }).join('') + '</ol>' : '<p class="muted">' + emptyText + '</p>') + '</section>';
      };
      render('<div class="cm-grid">' + box(j.month.replace('-', '년 ') + '월 활동왕', 'i-trophy', j.monthly, '점', '이달의 첫 활동왕이 되어 보세요.') + box('기록왕 (기록한 라면 수)', 'i-bowl', j.eaters, '그릇', '아직 기록이 없어요.') +
        box('전체 점수', 'i-star', j.all, '점', '아직 점수를 받은 사람이 없어요.') + box('인기쟁이 (받은 별)', 'i-heart', j.stars, '개', '아직 별을 받은 사람이 없어요.') +
        box('친절한 답변 (채택)', 'i-check', j.solvers, '번', '아직 채택된 답변이 없어요.') + '</div><p class="small muted">점수는 활동으로만 쌓여요. 받는 방법은 <a href="/club/levels/">등급 안내</a>에 있어요.</p>');
    });
  }

  // ---------- 회원 도감 ----------
  function profile() {
    var nick = params.get('n') || '';
    if (!nick) { notFound('회원 이름이 없어요.'); return; }
    api('users/' + encodeURIComponent(nick)).then(function (j) {
      if (!j.ok) { notFound(j.message); return; }
      var u = j.user, lv = u.level;
      setTitle(u.nick + '님의 라면 도감');
      var BADGE = {}; MM.G.BADGES.forEach(function (b) { BADGE[b.key] = b; });
      render('<section class="me-card"><div class="me-top">' + MM.G.emblem(lv, 64) + '<div><h1>' + esc(u.nick) + '</h1><p>Lv.' + lv.lv + ' ' + esc(lv.name) + (u.tie ? ' · ' + esc(u.tie) : '') + (u.region ? ' · ' + esc(u.region) : '') + (u.rank ? ' · 전체 ' + u.rank + '위' : '') + '</p></div></div>' +
        (u.bio ? '<p>' + esc(u.bio) + '</p>' : '') +
        '<div class="me-stats"><div><b>' + j.bowls.length + '</b><span>기록한 라면</span></div><div><b>' + u.xp.toLocaleString('ko-KR') + '</b><span>점수</span></div><div><b>' + u.stars + '</b><span>받은 별</span></div><div><b>' + (u.manner ? u.manner.avg : '–') + '</b><span>매너</span></div></div></section>' +
        (j.badges.length ? '<section class="card"><h2>' + ico('i-star') + '배지</h2><ul class="badge-list">' + j.badges.map(function (b) { var d = BADGE[b.badge]; return d ? '<li>' + MM.G.badge(d, 40) + '<div><b>' + esc(d.name) + '</b><span>' + esc(d.desc) + '</span></div></li>' : ''; }).join('') + '</ul></section>' : '') +
        '<section class="card"><h2>' + ico('i-bowl') + '먹은 라면</h2>' + (j.bowls.length ? '<div class="feed-list">' + j.bowls.slice(0, 30).map(function (b) { var r = MM.BY[b.slug]; return r ? '<a class="feed-item" href="/ramen/' + b.slug + '/"><img src="' + MM.imgOf(r) + '" alt="" width="56" height="56" loading="lazy"><div><p><b>' + esc(r.n) + '</b> ' + MM.starsSVG(b.rating / 2) + (b.again ? ' <span class="again ' + b.again + '">' + esc(D.AGAIN[b.again]) + '</span>' : '') + '</p>' + (b.body ? '<p class="small">' + esc(b.body) + '</p>' : '') + '<p class="mini-meta">' + MM.ago(b.updated_at) + '</p></div></a>' : ''; }).join('') + '</div>' : '<p class="muted">아직 기록이 없어요.</p>') + '</section>' +
        (j.posts.length ? '<section class="card" style="padding:4px 14px"><h2 style="padding-top:12px">' + ico('i-chat') + '쓴 글</h2>' + j.posts.map(function (p) { p.nick = u.nick; p.xp = u.xp; return postRow(p); }).join('') + '</section>' : ''));
    });
  }

  var PAGES = { hub: hub, board: board, post: post, write: write, feed: feed, events: events, event: event, people: people, profile: profile };
  Promise.all([MM.getMe(), MM.loadRamen()]).then(function (r) { me = r[0]; (PAGES[page] || hub)(); });
})();
