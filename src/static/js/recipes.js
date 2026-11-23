/* 레시피 자랑: 목록, 쓰기(사진 올리기), 레시피 보기(좋아요·저장·공유·따라 해 봤어요·댓글) */
(function () {
  'use strict';
  var MM = window.MM;
  var root = MM && MM.$('[data-rcp]');
  if (!root) return;
  var $ = MM.$, $$ = MM.$$, esc = MM.esc, ico = MM.ico, api = MM.api;
  var params = new URLSearchParams(location.search);
  var page = root.dataset.rcp;
  var me = null;
  var LEVELS = { easy: '누구나 쉽게', normal: '조금 손이 가요', hard: '도전 레시피' };
  var MAX_PHOTOS = 5;

  var render = function (h) { root.innerHTML = h; };
  var loginLink = function () { return '/me/?next=' + encodeURIComponent(location.pathname + location.search); };
  function needLogin(text) { return '<div class="card rcp-login"><p>' + esc(text) + '</p><p class="row-btns"><a class="btn btn-main" href="' + loginLink() + '">로그인</a><a class="btn btn-line" href="/me/?tab=signup&next=' + encodeURIComponent(location.pathname + location.search) + '">가입하기</a></p></div>'; }
  function notFound(text) { render('<div class="empty"><p>' + esc(text || '찾는 레시피가 없어요.') + '</p><p><a class="btn btn-sub" href="/recipes/">레시피 자랑 목록으로</a></p></div>'); }
  var nl2br = function (t) { return esc(t).replace(/\n/g, '<br>'); };
  var ramenName = function (s) { return MM.BY[s] ? MM.BY[s].n : ''; };
  function ramenOptions(cur) {
    return Object.keys(MM.BY).map(function (s) { return MM.BY[s]; }).sort(function (a, b) { return a.n.localeCompare(b.n, 'ko'); })
      .map(function (r) { return '<option value="' + r.s + '"' + (r.s === cur ? ' selected' : '') + '>' + esc(r.n) + ' (' + esc(r.mn) + ')</option>'; }).join('');
  }
  function flag(target, id) {
    var reason = prompt('신고하는 까닭을 짧게 적어 주세요. (예: 다른 사람 사진, 광고, 욕설)');
    if (reason === null) return;
    api('flag', { method: 'POST', body: { target: target, id: id, reason: reason } }).then(function (j) { MM.toast(j.ok ? '신고를 받았어요. 확인할게요.' : j.message); });
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-flag]');
    if (b) { e.preventDefault(); flag(b.dataset.flag, Number(b.dataset.id)); }
  });

  // ---------- 사진 줄이기 + 올리기 ----------
  function loadImage(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return createImageBitmap(file); }).catch(function () { return viaImg(file); });
    }
    return viaImg(file);
  }
  function viaImg(file) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { ok(im); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); };
      im.onerror = function () { URL.revokeObjectURL(url); no(new Error('decode')); };
      im.src = url;
    });
  }
  function toBlob(canvas, q) {
    return new Promise(function (ok) {
      canvas.toBlob(function (b) {
        if (b && b.type === 'image/webp') { ok(b); return; }
        canvas.toBlob(function (j) { ok(j); }, 'image/jpeg', q);
      }, 'image/webp', q);
    });
  }
  function shrink(src, side, q) {
    var w = src.width, h = src.height, k = Math.min(1, side / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    var g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(src, 0, 0, c.width, c.height);
    return toBlob(c, q).then(function (b) { return { blob: b, w: c.width, h: c.height }; });
  }
  function uploadPhoto(file) {
    if (!/^image\//.test(file.type || 'image/')) return Promise.reject(new Error('사진 파일만 올릴 수 있어요.'));
    if (file.size > 30 * 1024 * 1024) return Promise.reject(new Error('30MB보다 큰 사진은 올릴 수 없어요.'));
    return loadImage(file).catch(function () { throw new Error('이 사진은 열 수 없어요. JPG나 PNG로 바꿔서 올려 주세요.'); }).then(function (src) {
      // 사진이 너무 크면 화질과 크기를 조금씩 낮춰 다시 만들어요 (서버 한도: 큰 사진 1.2MB, 작은 사진 260KB)
      var fit = function (side, q, max, tries) {
        return shrink(src, side, q).then(function (r) {
          if (!r.blob || r.blob.size <= max || tries <= 0) return r;
          return fit(Math.round(side * 0.85), Math.max(0.5, q - 0.1), max, tries - 1);
        });
      };
      return Promise.all([fit(1280, 0.82, 1100 * 1024, 4), fit(480, 0.76, 240 * 1024, 4)]);
    }).then(function (r) {
      var full = r[0], thumb = r[1];
      if (!full.blob || !thumb.blob) throw new Error('사진을 줄이지 못했어요.');
      var fd = new FormData();
      var ext = full.blob.type === 'image/webp' ? 'webp' : 'jpg';
      fd.append('full', full.blob, 'photo.' + ext);
      fd.append('thumb', thumb.blob, 'thumb.' + ext);
      fd.append('w', full.w); fd.append('h', full.h);
      return fetch('/api/recipes/upload', { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (res) {
        return res.json().catch(function () { return { ok: false, message: '서버 응답을 읽지 못했어요.' }; });
      }, function () { return { ok: false, message: '인터넷 연결을 확인해 주세요.' }; }).then(function (j) {
        if (!j.ok) throw new Error(j.message || '사진을 올리지 못했어요.');
        return { id: j.id, w: full.w, h: full.h, local: URL.createObjectURL(thumb.blob) };
      });
    });
  }

  // ---------- 목록 ----------
  var SORTS = [['new', '최신순'], ['hot', '요즘 인기'], ['likes', '좋아요 많은'], ['reviews', '따라 해 본 사람 많은']];
  function list() {
    var state = { sort: params.get('sort') || 'new', ramen: params.get('ramen') || '', q: params.get('q') || '', who: params.get('saved') === '1' ? 'saved' : params.get('mine') === '1' ? 'mine' : '', page: 1 };
    render('<div class="rcp-bar"><div class="chips" role="radiogroup" aria-label="정렬">' + SORTS.map(function (s) { return '<button type="button" class="chip" role="radio" data-sort="' + s[0] + '" aria-checked="' + (state.sort === s[0] && !state.who) + '">' + s[1] + '</button>'; }).join('') +
      '<button type="button" class="chip" role="radio" data-who="saved" aria-checked="' + (state.who === 'saved') + '">' + ico('i-bookmark') + '저장한 레시피</button><button type="button" class="chip" role="radio" data-who="mine" aria-checked="' + (state.who === 'mine') + '">' + ico('i-user') + '내가 올린</button></div></div>' +
      '<div class="rcp-filter"><form class="search-box" data-search role="search">' + ico('i-search') + '<input type="search" name="q" maxlength="30" placeholder="레시피 이름, 재료로 찾기 (예: 치즈, 달걀)" value="' + esc(state.q) + '" aria-label="레시피 찾기"></form>' +
      '<label class="sel"><span class="sr">라면</span><select data-ramen><option value="">모든 라면</option>' + ramenOptions(state.ramen) + '</select></label></div>' +
      '<p class="filter-count" data-count aria-live="polite"></p><div class="rcp-grid" data-list><p class="muted loading">불러오는 중이에요</p></div>' +
      '<p class="more-wrap"><button type="button" class="btn btn-line" data-more hidden>더 보기</button></p>');
    var listEl = $('[data-list]', root), more = $('[data-more]', root), count = $('[data-count]', root);
    function syncUrl() {
      var u = new URLSearchParams();
      if (state.sort !== 'new') u.set('sort', state.sort);
      if (state.ramen) u.set('ramen', state.ramen);
      if (state.q) u.set('q', state.q);
      if (state.who) u.set(state.who, '1');
      history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : ''));
    }
    function load(append) {
      if ((state.who) && !me) { listEl.innerHTML = needLogin(state.who === 'saved' ? '로그인하면 저장한 레시피를 모아 볼 수 있어요.' : '로그인하면 내가 올린 레시피를 볼 수 있어요.'); more.hidden = true; count.textContent = ''; return; }
      var q = 'recipes?page=' + state.page + '&sort=' + state.sort + (state.ramen ? '&ramen=' + state.ramen : '') + (state.q ? '&q=' + encodeURIComponent(state.q) : '') + (state.who ? '&' + state.who + '=1' : '');
      api(q).then(function (j) {
        if (!j.ok) { listEl.innerHTML = '<p class="notice">' + esc(j.message) + '</p>'; return; }
        var h = j.recipes.map(MM.recipeCard).join('');
        if (append) listEl.insertAdjacentHTML('beforeend', h);
        else listEl.innerHTML = h || '<div class="rcp-empty"><p>' + (state.who === 'saved' ? '아직 저장한 레시피가 없어요. 마음에 드는 레시피에서 ‘저장’을 눌러 두세요.' : state.who === 'mine' ? '아직 올린 레시피가 없어요.' : state.q || state.ramen ? '조건에 맞는 레시피가 없어요.' : '아직 올라온 레시피가 없어요. 첫 레시피의 주인공이 되어 주세요.') + '</p><a class="btn btn-main btn-sm" href="/recipes/write/' + (state.ramen ? '?ramen=' + state.ramen : '') + '">' + ico('i-pen') + '레시피 자랑하기</a></div>';
        count.textContent = j.total ? '레시피 ' + j.total.toLocaleString('ko-KR') + '개' : '';
        more.hidden = j.page * j.per >= j.total;
      });
    }
    function reset() { state.page = 1; syncUrl(); load(false); }
    $$('[data-sort]', root).forEach(function (c) { c.addEventListener('click', function () { state.sort = c.dataset.sort; state.who = ''; paintChips(); reset(); }); });
    $$('[data-who]', root).forEach(function (c) { c.addEventListener('click', function () { state.who = state.who === c.dataset.who ? '' : c.dataset.who; paintChips(); reset(); }); });
    function paintChips() {
      $$('[data-sort]', root).forEach(function (x) { x.setAttribute('aria-checked', String(!state.who && x.dataset.sort === state.sort)); });
      $$('[data-who]', root).forEach(function (x) { x.setAttribute('aria-checked', String(state.who === x.dataset.who)); });
    }
    $('[data-ramen]', root).addEventListener('change', function (e) { state.ramen = e.target.value; reset(); });
    $('[data-search]', root).addEventListener('submit', function (e) { e.preventDefault(); state.q = e.target.q.value.trim(); reset(); });
    more.addEventListener('click', function () { state.page++; load(true); });
    load(false);
  }

  // ---------- 쓰기 ----------
  var DRAFT = 'mm-recipe-draft';
  function write() {
    var id = Number(params.get('id')) || 0;
    var title = id ? '레시피 고치기' : '레시피 자랑하기';
    document.title = title + ' | 면면';
    var h1 = $('[data-rcp-title]'); if (h1) h1.textContent = title;
    if (!me) { render(needLogin('로그인한 회원만 레시피를 올릴 수 있어요. 가입은 아이디와 비밀번호만 있으면 돼요.')); return; }
    (id ? api('recipes/' + id) : Promise.resolve(null)).then(function (j) {
      var old = j && j.ok ? j.recipe : null;
      if (id && (!old || !old.mine)) { notFound('내가 올린 레시피만 고칠 수 있어요.'); return; }
      var draft = !id ? MM.store.get(DRAFT, null) : null;
      var d = old || draft || {};
      var photos = (old ? old.photos : []).map(function (p) { return { id: p.id, w: p.w, h: p.h, src: MM.recipeImg(p.id, true) }; });
      var ramen = (d.ramen || []).filter(function (s) { return MM.BY[s]; });
      if (!id && !ramen.length && params.get('ramen') && MM.BY[params.get('ramen')]) ramen = [params.get('ramen')];
      var items = (d.items && d.items.length ? d.items : ['', '', '']);
      var steps = (d.steps && d.steps.length ? d.steps : ['', '', '']);
      var level = d.level || '';
      render((draft && !id ? '<p class="notice rcp-draft">쓰다 만 내용을 불러왔어요. (사진은 다시 골라 주세요) <button type="button" class="link-btn" data-clear-draft>새로 쓰기</button></p>' : '') +
        '<form class="card write-form rcp-form" data-wform novalidate>' +
        '<section class="rcp-sec"><h2>' + ico('i-plus') + '사진 <span class="muted small">최대 ' + MAX_PHOTOS + '장 · 첫 사진이 대표 사진이에요</span></h2>' +
        '<div class="rcp-photos" data-photos></div><p class="small muted">직접 만든 라면 사진을 올려 주세요. 사진은 올리기 전에 크기를 줄이고, 찍은 위치 같은 정보는 지워서 보내요.</p></section>' +
        '<label class="field"><span>레시피 이름</span><input name="title" maxlength="50" required value="' + esc(d.title || '') + '" placeholder="예: 우유 한 컵 넣은 크림 짬뽕"></label>' +
        '<div class="field"><span>사용한 라면 (최대 3개)</span><div class="rcp-picked" data-picked></div><select data-ramen-add aria-label="라면 고르기"><option value="">라면을 골라 넣어 주세요</option>' + ramenOptions('') + '</select></div>' +
        '<label class="field"><span>소개 (선택)</span><textarea name="intro" rows="3" maxlength="600" placeholder="어떻게 만들게 됐는지, 어떤 맛인지 짧게 적어 주세요.">' + esc(d.intro || '') + '</textarea></label>' +
        '<div class="field"><span>재료</span><div class="rcp-lines" data-items></div><button type="button" class="btn btn-ghost btn-sm" data-add-item>' + ico('i-plus') + '재료 더하기</button></div>' +
        '<div class="field"><span>만드는 순서</span><ol class="rcp-steps-edit" data-steps></ol><button type="button" class="btn btn-ghost btn-sm" data-add-step>' + ico('i-plus') + '순서 더하기</button></div>' +
        '<div class="field-row"><label class="field"><span>조리 시간 (분, 선택)</span><input type="number" name="mins" min="0" max="240" inputmode="numeric" value="' + (d.mins || '') + '" placeholder="예: 10"></label>' +
        '<label class="field"><span>몇 인분</span><select name="serves">' + [1, 2, 3, 4].map(function (n) { return '<option value="' + n + '"' + (Number(d.serves || 1) === n ? ' selected' : '') + '>' + n + '인분</option>'; }).join('') + '</select></label></div>' +
        '<fieldset class="field"><legend>난이도 (선택)</legend><div class="chips" role="radiogroup" data-level>' + Object.keys(LEVELS).map(function (k) { return '<button type="button" class="chip" role="radio" data-lv="' + k + '" aria-checked="' + (level === k) + '">' + LEVELS[k] + '</button>'; }).join('') + '</div></fieldset>' +
        '<label class="field"><span>꿀팁 (선택)</span><textarea name="tip" rows="3" maxlength="400" placeholder="예: 우유는 불을 끄기 직전에 넣어야 덜 분리돼요.">' + esc(d.tip || '') + '</textarea></label>' +
        '<label class="hp" aria-hidden="true">비워 두세요<input name="website" tabindex="-1" autocomplete="off"></label>' +
        '<p class="small muted">다른 사람이 찍은 사진이나 인터넷에서 가져온 사진은 올리지 말아 주세요. <a href="/club/rules/">이용 규칙</a></p>' +
        '<p class="form-msg" role="status" aria-live="polite"></p>' +
        '<div class="row-btns"><button class="btn btn-main btn-lg" type="submit">' + (id ? '고친 내용 저장' : '레시피 올리기') + '</button><a class="btn btn-line btn-lg" href="' + (id ? '/recipes/' + id : '/recipes/') + '">취소</a></div></form>');
      var f = $('[data-wform]', root);
      var busy = 0;
      var cd = $('[data-clear-draft]', root);
      if (cd) cd.addEventListener('click', function () { MM.store.set(DRAFT, null); location.reload(); });

      // 사진
      var box = $('[data-photos]', f);
      function paintPhotos() {
        box.innerHTML = photos.map(function (p, i) {
          return '<div class="rcp-ph' + (p.busy ? ' busy' : '') + '"><img src="' + esc(p.src) + '" alt="올린 사진 ' + (i + 1) + '">' + (i === 0 ? '<span class="rcp-ph-main">대표</span>' : '') +
            (p.busy ? '<span class="rcp-ph-busy">올리는 중</span>' : '<button type="button" class="rcp-ph-x" data-px="' + i + '" aria-label="사진 ' + (i + 1) + ' 빼기">' + ico('i-close') + '</button>' + (i > 0 ? '<button type="button" class="rcp-ph-up" data-pm="' + i + '">대표로</button>' : '')) + '</div>';
        }).join('') + (photos.length < MAX_PHOTOS ? '<label class="rcp-ph rcp-ph-add"><input type="file" accept="image/*" multiple data-file hidden>' + ico('i-plus') + '<span>사진 넣기</span><span class="small muted">' + photos.length + ' / ' + MAX_PHOTOS + '</span></label>' : '');
        var fi = $('[data-file]', box);
        if (fi) fi.addEventListener('change', function () { addFiles([].slice.call(fi.files || [])); });
      }
      function addFiles(files) {
        var room = MAX_PHOTOS - photos.length;
        if (files.length > room) MM.toast('사진은 ' + MAX_PHOTOS + '장까지 올릴 수 있어요.');
        files.slice(0, room).forEach(function (file) {
          var p = { busy: true, src: URL.createObjectURL(file) };
          photos.push(p); busy++;
          uploadPhoto(file).then(function (r) { p.id = r.id; p.w = r.w; p.h = r.h; p.busy = false; }, function (err) {
            photos.splice(photos.indexOf(p), 1); MM.toast(err.message || '사진을 올리지 못했어요.');
          }).then(function () { busy--; paintPhotos(); });
        });
        paintPhotos();
      }
      box.addEventListener('click', function (e) {
        var x = e.target.closest('[data-px]'), mv = e.target.closest('[data-pm]');
        if (x) { photos.splice(Number(x.dataset.px), 1); paintPhotos(); }
        if (mv) { var i = Number(mv.dataset.pm); photos.unshift(photos.splice(i, 1)[0]); paintPhotos(); }
      });
      paintPhotos();

      // 라면 고르기
      var picked = $('[data-picked]', f), addSel = $('[data-ramen-add]', f);
      function paintRamen() {
        picked.innerHTML = ramen.map(function (s, i) { return '<span class="pill">' + esc(ramenName(s)) + '<button type="button" data-rx="' + i + '" aria-label="' + esc(ramenName(s)) + ' 빼기">' + ico('i-close') + '</button></span>'; }).join('') || '<span class="small muted">고르지 않아도 올릴 수 있어요. 고르면 그 라면 페이지에도 레시피가 보여요.</span>';
        addSel.disabled = ramen.length >= 3;
      }
      addSel.addEventListener('change', function () { var v = addSel.value; if (v && ramen.indexOf(v) < 0 && ramen.length < 3) ramen.push(v); addSel.value = ''; paintRamen(); saveDraft(); });
      picked.addEventListener('click', function (e) { var b = e.target.closest('[data-rx]'); if (b) { ramen.splice(Number(b.dataset.rx), 1); paintRamen(); saveDraft(); } });
      paintRamen();

      // 재료, 순서
      var itemsEl = $('[data-items]', f), stepsEl = $('[data-steps]', f);
      var EX_ITEMS = ['예: 라면 1봉', '예: 달걀 1개', '예: 슬라이스 치즈 1장'];
      function itemRow(v, i) { return '<div class="rcp-line"><input class="input" data-item maxlength="50" value="' + esc(v) + '" placeholder="' + (EX_ITEMS[i] || '재료와 양') + '" aria-label="재료 ' + (i + 1) + '"><button type="button" class="icon-btn" data-del-item aria-label="재료 빼기">' + ico('i-close') + '</button></div>'; }
      function stepRow(v, i) { return '<li class="rcp-line"><textarea class="input" data-step rows="2" maxlength="400" placeholder="' + (i === 0 ? '예: 물 500ml를 끓이고 면과 스프를 넣어요.' : '다음 순서') + '" aria-label="순서 ' + (i + 1) + '">' + esc(v) + '</textarea><button type="button" class="icon-btn" data-del-step aria-label="순서 빼기">' + ico('i-close') + '</button></li>'; }
      itemsEl.innerHTML = items.map(itemRow).join('');
      stepsEl.innerHTML = steps.map(stepRow).join('');
      $('[data-add-item]', f).addEventListener('click', function () { if ($$('[data-item]', f).length >= 25) return; itemsEl.insertAdjacentHTML('beforeend', itemRow('', $$('[data-item]', f).length)); $$('[data-item]', f).pop().focus(); });
      $('[data-add-step]', f).addEventListener('click', function () { if ($$('[data-step]', f).length >= 15) return; stepsEl.insertAdjacentHTML('beforeend', stepRow('', $$('[data-step]', f).length)); $$('[data-step]', f).pop().focus(); });
      f.addEventListener('click', function (e) {
        var di = e.target.closest('[data-del-item]'), ds = e.target.closest('[data-del-step]');
        if (di && $$('[data-item]', f).length > 1) di.parentNode.remove();
        if (ds && $$('[data-step]', f).length > 1) ds.parentNode.remove();
      });
      var lv = $('[data-level]', f);
      lv.addEventListener('click', function (e) { var b = e.target.closest('[data-lv]'); if (!b) return; level = level === b.dataset.lv ? '' : b.dataset.lv; $$('[data-lv]', lv).forEach(function (x) { x.setAttribute('aria-checked', String(x.dataset.lv === level)); }); saveDraft(); });

      function collect() {
        return {
          title: f.elements.title.value.trim(), intro: f.elements.intro.value, tip: f.elements.tip.value, mins: Number(f.elements.mins.value) || 0, serves: Number(f.elements.serves.value) || 1, level: level, ramen: ramen.slice(),
          items: $$('[data-item]', f).map(function (x) { return x.value.trim(); }).filter(Boolean),
          steps: $$('[data-step]', f).map(function (x) { return x.value.trim(); }).filter(Boolean),
        };
      }
      var dt;
      function saveDraft() { if (id) return; clearTimeout(dt); dt = setTimeout(function () { MM.store.set(DRAFT, collect()); }, 400); }
      f.addEventListener('input', saveDraft);

      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = $('.form-msg', f), btn = $('button[type=submit]', f);
        if (busy) { msg.className = 'form-msg err'; msg.textContent = '사진을 올리는 중이에요. 잠시만 기다려 주세요.'; return; }
        var body = collect();
        body.photos = photos.filter(function (p) { return p.id; }).map(function (p) { return p.id; });
        body.website = f.elements.website.value;
        if (body.title.length < 2) { msg.className = 'form-msg err'; msg.textContent = '레시피 이름을 2자 이상 적어 주세요.'; f.elements.title.focus(); return; }
        if (!body.steps.length) { msg.className = 'form-msg err'; msg.textContent = '만드는 순서를 한 단계 이상 적어 주세요.'; var s0 = $('[data-step]', f); if (s0) s0.focus(); return; }
        btn.disabled = true; msg.className = 'form-msg'; msg.textContent = '올리는 중이에요';
        api('recipes' + (id ? '/' + id : ''), { method: 'POST', body: body }).then(function (x) {
          btn.disabled = false;
          if (!x.ok) { msg.className = 'form-msg err'; msg.textContent = x.message || '저장하지 못했어요.'; return; }
          if (!id) MM.store.set(DRAFT, null);
          if (x.gain) MM.gainLater(x.gain);
          location.href = '/recipes/' + x.id;
        });
      });
    });
  }

  // ---------- 보기 ----------
  function recipeId() {
    var m = /\/recipes\/(\d+)/.exec(location.pathname);
    return Number(root.dataset.id || (m && m[1]) || params.get('id')) || 0;
  }
  function commentsHTML(list) {
    return '<section class="card" id="comments"><h2>' + ico('i-chat') + '댓글 <span class="muted">' + list.length + '</span></h2><ul class="cmt-list">' + list.map(function (c) {
      return '<li class="cmt"><div class="cmt-top">' + (c.gone ? '<span class="muted">탈퇴한 회원</span>' : MM.who(c)) + '<span class="muted">' + MM.ago(c.created_at) + '</span>' +
        (c.mine ? '<button type="button" class="link-btn small" data-cdel="' + c.id + '">지우기</button>' : me && !c.hidden ? '<button type="button" class="link-btn small" data-flag="comment" data-id="' + c.id + '">신고</button>' : '') + '</div>' +
        '<p class="cmt-body">' + (c.hidden ? '<span class="muted">가려진 댓글이에요.</span>' : esc(c.body)) + '</p></li>';
    }).join('') + '</ul>' +
      (me ? '<form class="cmt-form" data-cform><label class="sr" for="cbody">댓글 쓰기</label><textarea id="cbody" class="input" name="body" rows="3" maxlength="1000" required placeholder="궁금한 점이나 응원을 남겨 주세요"></textarea><div class="row-btns" style="margin:0;justify-content:flex-end"><button class="btn btn-main btn-sm" type="submit">댓글 쓰기</button></div></form>' : '<p class="small muted" style="margin-top:10px"><a href="' + loginLink() + '">로그인</a>하면 댓글을 남길 수 있어요.</p>') + '</section>';
  }
  function starPick(name, cur) {
    return '<span class="star-pick" role="radiogroup" aria-label="별점" data-stars>' + [1, 2, 3, 4, 5].map(function (k) { return '<button type="button" role="radio" aria-checked="' + (k === cur) + '" aria-label="' + k + '점" data-st="' + k + '" class="' + (k <= cur ? 'on' : '') + '">' + ico('i-star') + '</button>'; }).join('') + '</span><input type="hidden" name="' + name + '" value="' + (cur || '') + '">';
  }
  function view() {
    var id = recipeId();
    if (!id) { notFound('레시피 주소가 잘못됐어요.'); return; }
    var url = location.origin + '/recipes/' + id;
    function load(keep) {
      api('recipes/' + id).then(function (j) {
        if (!j.ok) { notFound(j.message); return; }
        var r = j.recipe;
        document.title = r.title + ' - 라면 레시피 자랑 | 면면';
        var avg = r.reviews ? Math.round(r.rsum / r.reviews * 10) / 10 : 0;
        var gal = r.photos.length ? '<div class="rcp-gal"><div class="rcp-track" data-track>' + r.photos.map(function (p, i) {
          return '<a class="rcp-slide" href="' + MM.recipeImg(p.id) + '" target="_blank" rel="noopener"><img src="' + MM.recipeImg(p.id) + '" alt="' + esc(r.title) + ' 사진 ' + (i + 1) + '"' + (p.w && p.h ? ' width="' + p.w + '" height="' + p.h + '"' : '') + (i ? ' loading="lazy"' : '') + '></a>';
        }).join('') + '</div>' + (r.photos.length > 1 ? '<span class="rcp-count" data-count>1 / ' + r.photos.length + '</span><div class="rcp-dots">' + r.photos.map(function (p, i) { return '<button type="button" data-dot="' + i + '" aria-label="사진 ' + (i + 1) + '"' + (i === 0 ? ' aria-current="true"' : '') + '></button>'; }).join('') + '</div>' : '') + '</div>' : '';
        var facts = [];
        if (r.mins) facts.push(['조리 시간', r.mins + '분']);
        if (r.level) facts.push(['난이도', LEVELS[r.level] || '']);
        facts.push(['양', r.serves + '인분']);
        facts.push(['후기', r.reviews ? r.reviews + '명 · ' + MM.starsSVG(Math.round(avg * 2) / 2) + ' ' + avg.toFixed(1) : '아직 없어요']);
        var buy = r.ramen.filter(function (s) { return MM.BY[s]; });
        var my = j.my;
        render('<article class="rcp-view">' + (r.hidden ? '<p class="notice">운영 규칙에 따라 다른 사람에게는 가려진 레시피예요.</p>' : '') +
          '<div class="rcp-head">' + (gal || '<div class="rcp-gal rcp-gal-none"><img src="' + (buy[0] ? MM.imgOf(MM.BY[buy[0]], true) : '/assets/img/club-recipe.webp') + '" alt=""><span>사진 없이 올린 레시피예요</span></div>') +
          '<div class="rcp-info"><p class="rcp-ramens">' + (buy.length ? buy.map(function (s) { return '<a class="pill pill-sm" href="/ramen/' + s + '/">' + esc(ramenName(s)) + '</a>'; }).join('') : '<span class="pill pill-sm">라면 레시피</span>') + '</p>' +
          '<h1>' + esc(r.title) + '</h1><p class="post-meta">' + (r.gone ? '탈퇴한 회원' : MM.who(r)) + '<span>' + MM.ago(r.created_at) + (r.updated_at !== r.created_at ? ' (고침)' : '') + '</span><span>조회 ' + r.views + '</span></p>' +
          (r.intro ? '<p class="rcp-intro">' + nl2br(r.intro) + '</p>' : '') +
          '<dl class="facts rcp-facts">' + facts.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('') + '</dl>' +
          '<div class="rcp-actions"><button type="button" class="btn ' + (r.liked ? 'btn-main' : 'btn-line') + '" data-like aria-pressed="' + r.liked + '"' + (r.mine ? ' disabled title="내 레시피에는 누를 수 없어요"' : '') + '>' + ico('i-heart') + '좋아요 <b data-n>' + r.likes + '</b></button>' +
          '<button type="button" class="btn ' + (r.saved ? 'btn-main' : 'btn-line') + '" data-savebtn aria-pressed="' + r.saved + '">' + ico('i-bookmark') + '저장 <b data-n>' + r.saves + '</b></button>' +
          '<button type="button" class="btn btn-line" data-share-open aria-expanded="false">' + ico('i-share') + '공유</button>' +
          (r.mine ? '' : '<a class="btn btn-sub" href="#reviews">' + ico('i-check') + '따라 해 봤어요</a>') + '</div>' +
          '<div class="rcp-share" data-share-box hidden><button type="button" class="btn btn-ghost btn-sm" data-sh="native" hidden>' + ico('i-share') + '카카오톡·앱으로 보내기</button><button type="button" class="btn btn-ghost btn-sm" data-sh="copy">' + ico('i-check') + '링크 복사</button>' +
          '<a class="btn btn-ghost btn-sm" data-sh="x" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(r.title + ' - 면면 레시피 자랑') + '&url=' + encodeURIComponent(url) + '">X에 올리기</a>' +
          '<a class="btn btn-ghost btn-sm" data-sh="fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '">페이스북</a>' +
          '<a class="btn btn-ghost btn-sm" data-sh="band" target="_blank" rel="noopener" href="https://band.us/plugin/share?body=' + encodeURIComponent(r.title + '\n' + url) + '&route=' + encodeURIComponent(location.origin) + '">밴드</a></div>' +
          '<p class="rcp-owner">' + (r.mine ? '<a class="btn btn-ghost btn-sm" href="/recipes/write/?id=' + r.id + '">' + ico('i-pen') + '고치기</a><button type="button" class="btn btn-ghost btn-sm" data-del>' + ico('i-trash') + '지우기</button>' : me ? '<button type="button" class="link-btn small" data-flag="recipe" data-id="' + r.id + '">' + ico('i-flag') + '신고</button>' : '') + '</p>' +
          '</div></div>' +
          '<div class="rcp-cols"><section class="card rcp-items"><h2>' + ico('i-list') + '재료 <span class="muted small">' + r.serves + '인분</span></h2>' +
          (r.items.length ? '<ul class="rcp-check">' + r.items.map(function (t, i) { return '<li><label><input type="checkbox" data-ck="' + i + '"><span>' + esc(t) + '</span></label></li>'; }).join('') + '</ul><p class="small muted">챙긴 재료를 눌러 표시해 두세요.</p>' : '<p class="muted">적어 둔 재료가 없어요.</p>') + '</section>' +
          '<section class="card rcp-how"><h2>' + ico('i-noodle') + '만드는 순서</h2><ol class="rcp-steps">' + r.steps.map(function (t, i) { return '<li><span class="rcp-n">' + (i + 1) + '</span><p>' + nl2br(t) + '</p></li>'; }).join('') + '</ol>' +
          (r.tip ? '<div class="rcp-tip"><b>' + ico('i-star') + '꿀팁</b><p>' + nl2br(r.tip) + '</p></div>' : '') +
          (r.mins ? '<p class="small"><a href="/lab/timer/">' + ico('i-timer') + '조리 타이머로 시간 재기</a></p>' : '') + '</section></div>' +
          (buy.length ? '<section class="card rcp-buy"><h2>' + ico('i-cart') + '이 레시피에 쓴 라면</h2><p class="disclosure">이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p><div class="rcp-buy-list">' + buy.map(function (s) {
            var x = MM.BY[s]; return '<div class="rcp-buy-item"><a href="/ramen/' + s + '/"><img src="' + MM.imgOf(x) + '" alt="" width="56" height="56" loading="lazy"><span><b>' + esc(x.n) + '</b><span class="small muted">' + esc(x.mn) + '</span></span></a><a class="btn btn-buy btn-sm" href="/go/' + s + '?from=recipe" rel="sponsored nofollow noopener" target="_blank" data-kpi="쿠팡 이동" data-buy="' + s + '">' + ico('i-cart') + '쿠팡에서 보기</a></div>';
          }).join('') + '</div></section>' : '') +
          reviewsHTML(r, j.reviews, my) + commentsHTML(j.comments) +
          (buy[0] ? '<section class="sec" data-recipe-sec><div class="sec-head"><h2><span>' + esc(ramenName(buy[0])) + '로 만든 다른 레시피</span></h2><a class="more-link" href="/recipes/?ramen=' + buy[0] + '">모두 보기' + ico('i-chev') + '</a></div><div class="rcp-grid rcp-grid-sm" data-recipe-strip data-hide-empty="1" data-skip="' + r.id + '" data-max="4" data-q="ramen=' + buy[0] + '&amp;sort=hot&amp;per=5"></div></section>' : '') +
          '<p style="text-align:center"><a class="btn btn-sub" href="/recipes/">레시피 자랑 목록으로</a></p></article>');
        bind(r, my);
        if (keep && location.hash) { var t = $(location.hash); if (t) t.scrollIntoView(); }
      });
    }
    function reviewsHTML(r, list, my) {
      var avg = r.reviews ? Math.round(r.rsum / r.reviews * 10) / 10 : 0;
      var form = '';
      if (r.mine) form = '<p class="small muted">내 레시피에는 후기를 남길 수 없어요. 따라 해 본 사람들의 후기를 기다려 봐요.</p>';
      else if (!me) form = '<p class="small muted"><a href="' + loginLink() + '">로그인</a>하면 따라 해 본 후기를 남길 수 있어요.</p>';
      else form = '<form class="rcp-rform" data-rform><p class="rcp-rform-t"><b>' + (my ? '내 후기 고치기' : '따라 해 봤다면 후기를 남겨 주세요') + '</b></p>' + starPick('rating', my ? my.rating : 0) +
        '<label class="sr" for="rbody">후기</label><textarea id="rbody" class="input" name="body" rows="3" maxlength="500" placeholder="예: 우유를 조금 덜 넣었더니 딱 좋았어요.">' + esc(my ? my.body : '') + '</textarea>' +
        '<div class="rcp-rphoto" data-rphoto></div>' +
        '<div class="row-btns" style="margin:0;justify-content:flex-end">' + (my ? '<button type="button" class="btn btn-ghost btn-sm" data-rdel="' + my.id + '">후기 지우기</button>' : '') + '<button class="btn btn-main btn-sm" type="submit">' + (my ? '고친 후기 저장' : '후기 남기기') + '</button></div><p class="form-msg" role="status" aria-live="polite"></p></form>';
      return '<section class="card" id="reviews"><h2>' + ico('i-check') + '따라 해 봤어요 <span class="muted">' + r.reviews + '</span></h2>' +
        (r.reviews ? '<p class="rcp-avg">' + MM.starsSVG(Math.round(avg * 2) / 2) + ' <b>' + avg.toFixed(1) + '</b> <span class="muted small">' + r.reviews + '명이 따라 해 봤어요</span></p>' : '<p class="muted">아직 따라 해 본 사람이 없어요. 첫 후기를 남겨 주세요.</p>') +
        (list.length ? '<ul class="rcp-reviews">' + list.map(function (v) {
          return '<li class="rcp-review">' + (v.photo ? '<a class="rcp-rpic" href="' + MM.recipeImg(v.photo) + '" target="_blank" rel="noopener"><img src="' + MM.recipeImg(v.photo, true) + '" alt="후기 사진" loading="lazy" width="96" height="96"></a>' : '') +
            '<div><div class="cmt-top">' + (v.gone ? '<span class="muted">탈퇴한 회원</span>' : MM.who(v)) + MM.starsSVG(v.rating) + '<span class="muted small">' + MM.ago(v.updated_at || v.created_at) + '</span>' + (v.mine ? '' : me ? '<button type="button" class="link-btn small" data-flag="rreview" data-id="' + v.id + '">신고</button>' : '') + '</div>' +
            '<p class="cmt-body">' + (v.hidden ? '<span class="muted">가려진 후기예요.</span>' : esc(v.body)) + '</p></div></li>';
        }).join('') + '</ul>' : '') + form + '</section>';
    }
    function bind(r, my) {
      // 사진 넘기기
      var track = $('[data-track]', root), cnt = $('[data-count]', root);
      if (track && cnt) {
        var paint = function () { var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); cnt.textContent = (i + 1) + ' / ' + r.photos.length; $$('[data-dot]', root).forEach(function (d) { if (Number(d.dataset.dot) === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); }); };
        track.addEventListener('scroll', function () { window.requestAnimationFrame(paint); }, { passive: true });
        $$('[data-dot]', root).forEach(function (d) { d.addEventListener('click', function () { track.scrollTo({ left: track.clientWidth * Number(d.dataset.dot), behavior: 'smooth' }); }); });
      }
      // 재료 체크 (이 기기에만 기억)
      var CK = 'mm-rck-' + r.id, ck = MM.store.get(CK, []);
      $$('[data-ck]', root).forEach(function (c) { if (ck.indexOf(Number(c.dataset.ck)) > -1) c.checked = true; c.addEventListener('change', function () { var now = $$('[data-ck]', root).filter(function (x) { return x.checked; }).map(function (x) { return Number(x.dataset.ck); }); MM.store.set(CK, now); }); });
      // 좋아요, 저장
      function toggleBtn(sel, path) {
        var b = $(sel, root);
        if (!b) return;
        b.addEventListener('click', function () {
          if (!me) { location.href = loginLink(); return; }
          b.disabled = true;
          api('recipes/' + r.id + '/' + path, { method: 'POST' }).then(function (x) {
            b.disabled = false;
            if (!x.ok) { MM.toast(x.message); return; }
            b.className = 'btn ' + (x.on ? 'btn-main' : 'btn-line'); b.setAttribute('aria-pressed', String(x.on)); $('[data-n]', b).textContent = x.n;
            if (path === 'save') MM.toast(x.on ? '저장했어요. ‘저장한 레시피’에서 다시 볼 수 있어요.' : '저장을 풀었어요.');
          });
        });
      }
      toggleBtn('[data-like]', 'like');
      toggleBtn('[data-savebtn]', 'save');
      // 공유
      var so = $('[data-share-open]', root), sb = $('[data-share-box]', root);
      var counted = false;
      var countShare = function () { if (counted) return; counted = true; api('recipes/' + r.id + '/share', { method: 'POST' }); MM.track('share', ''); };
      so.addEventListener('click', function () {
        sb.hidden = !sb.hidden; so.setAttribute('aria-expanded', String(!sb.hidden));
      });
      var nat = $('[data-sh="native"]', sb);
      if (navigator.share) nat.hidden = false;
      sb.addEventListener('click', function (e) {
        var b = e.target.closest('[data-sh]');
        if (!b) return;
        countShare();
        if (b.dataset.sh === 'native') { e.preventDefault(); navigator.share({ title: r.title, text: r.title + ' - 면면 레시피 자랑', url: url }).catch(function () { /* 닫음 */ }); }
        if (b.dataset.sh === 'copy') { e.preventDefault(); MM.copyText(url, '링크를 복사했어요'); }
      });
      // 지우기
      var del = $('[data-del]', root);
      if (del) del.addEventListener('click', function () {
        if (!confirm('이 레시피를 지울까요? 사진과 후기, 댓글도 함께 지워져요.')) return;
        api('recipes/' + r.id, { method: 'DELETE' }).then(function (x) { if (x.ok) location.href = '/recipes/?mine=1'; else MM.toast(x.message); });
      });
      // 후기
      var rf = $('[data-rform]', root);
      if (rf) {
        var stars = $('[data-stars]', rf);
        stars.addEventListener('click', function (e) {
          var b = e.target.closest('[data-st]'); if (!b) return;
          var v = Number(b.dataset.st); rf.elements.rating.value = v;
          $$('[data-st]', stars).forEach(function (x) { var k = Number(x.dataset.st); x.classList.toggle('on', k <= v); x.setAttribute('aria-checked', String(k === v)); });
        });
        var photo = my && my.photo ? { id: my.photo, src: MM.recipeImg(my.photo, true) } : null, rbusy = false;
        var pbox = $('[data-rphoto]', rf);
        var paintP = function () {
          pbox.innerHTML = photo ? '<div class="rcp-ph rcp-ph-sm' + (rbusy ? ' busy' : '') + '"><img src="' + esc(photo.src) + '" alt="후기 사진">' + (rbusy ? '<span class="rcp-ph-busy">올리는 중</span>' : '<button type="button" class="rcp-ph-x" data-rpx aria-label="사진 빼기">' + ico('i-close') + '</button>') + '</div>'
            : '<label class="btn btn-ghost btn-sm"><input type="file" accept="image/*" data-rfile hidden>' + ico('i-plus') + '완성 사진 넣기 (선택)</label>';
          var fi = $('[data-rfile]', pbox);
          if (fi) fi.addEventListener('change', function () {
            var file = fi.files && fi.files[0]; if (!file) return;
            photo = { src: URL.createObjectURL(file) }; rbusy = true; paintP();
            uploadPhoto(file).then(function (x) { photo.id = x.id; }, function (err) { photo = null; MM.toast(err.message); }).then(function () { rbusy = false; paintP(); });
          });
          var px = $('[data-rpx]', pbox); if (px) px.addEventListener('click', function () { photo = null; paintP(); });
        };
        paintP();
        rf.addEventListener('submit', function (e) {
          e.preventDefault();
          var msg = $('.form-msg', rf), btn = $('button[type=submit]', rf);
          if (rbusy) { msg.className = 'form-msg err'; msg.textContent = '사진을 올리는 중이에요.'; return; }
          if (!rf.elements.rating.value) { msg.className = 'form-msg err'; msg.textContent = '별점을 골라 주세요.'; return; }
          btn.disabled = true;
          api('recipes/' + r.id + '/reviews', { method: 'POST', body: { rating: Number(rf.elements.rating.value), body: rf.elements.body.value, photo: photo && photo.id ? photo.id : '' } }).then(function (x) {
            btn.disabled = false;
            if (!x.ok) { msg.className = 'form-msg err'; msg.textContent = x.message; return; }
            if (x.gain) MM.gain(x.gain); else MM.toast('후기를 저장했어요.');
            location.hash = 'reviews'; load(true);
          });
        });
        var rd = $('[data-rdel]', rf);
        if (rd) rd.addEventListener('click', function () { if (confirm('후기를 지울까요?')) api('recipes/' + r.id + '/reviews/' + rd.dataset.rdel, { method: 'DELETE' }).then(function (x) { if (x.ok) load(true); else MM.toast(x.message); }); });
      }
      // 댓글
      var cf = $('[data-cform]', root);
      if (cf) cf.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = $('button[type=submit]', cf); btn.disabled = true;
        api('comments', { method: 'POST', body: { target: 'recipe', id: r.id, body: cf.elements.body.value } }).then(function (x) {
          btn.disabled = false;
          if (!x.ok) { MM.toast(x.message); return; }
          if (x.gain) MM.gain(x.gain);
          location.hash = 'comments'; load(true);
        });
      });
      $$('[data-cdel]', root).forEach(function (b) {
        b.addEventListener('click', function () { if (confirm('댓글을 지울까요?')) api('comments/' + b.dataset.cdel, { method: 'DELETE' }).then(function (x) { if (x.ok) load(true); else MM.toast(x.message); }); });
      });
      // 다른 레시피 줄
      var strip = $('[data-recipe-strip]', root);
      if (strip) {
        api('recipes?' + strip.dataset.q).then(function (x) {
          var l = (x.recipes || []).filter(function (y) { return y.id !== r.id; }).slice(0, 4);
          if (!l.length) { strip.closest('[data-recipe-sec]').hidden = true; return; }
          strip.innerHTML = l.map(MM.recipeCard).join('');
        });
      }
    }
    load(true);
  }

  var PAGES = { list: list, write: write, view: view };
  Promise.all([MM.getMe(), MM.loadRamen()]).then(function (r) { me = r[0]; (PAGES[page] || list)(); });
})();
