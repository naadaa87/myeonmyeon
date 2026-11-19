/* 라면 도감: 종류 탭, 나라·맵기·맛·조리 방식·형태·면 필터(여러 개 고르기), 회사·판매, 초성 검색, 정렬
   고른 조건은 주소에 남아서 그대로 공유할 수 있어요. */
(function () {
  'use strict';
  var MM = window.MM;
  var root = MM && MM.$('[data-dogam]');
  if (!root) return;
  var $ = MM.$, $$ = MM.$$, esc = MM.esc;
  var form = $('[data-filter]', root), list = $('[data-list]', root), count = $('[data-count]', root), empty = $('[data-empty]', root);
  var panel = $('[data-fpanel]', root), toggle = $('[data-ftoggle]', root), badge = $('[data-fcount]', root), active = $('[data-factive]', root);
  var cards = $$('.rcard', list);
  var MULTI = ['co', 'hot', 'ta', 'c', 'f', 'nd'];
  var LABEL = { co: '나라', hot: '맵기', ta: '맛', c: '종류', f: '형태', nd: '면' };
  var params = new URLSearchParams(location.search);
  var GN = {};
  (MM.D.GROUPS || []).forEach(function (g) { GN[g.id] = g.name; });
  function fresh() {
    var s = { g: '', q: '', m: '', st: '', sort: 'name' };
    MULTI.forEach(function (k) { s[k] = []; });
    return s;
  }
  var state = fresh();
  ['g', 'q', 'm', 'st', 'sort'].forEach(function (k) { if (params.get(k)) state[k] = params.get(k); });
  MULTI.forEach(function (k) { if (params.get(k)) state[k] = params.get(k).split(',').filter(Boolean); });
  ['q', 'm', 'st', 'sort'].forEach(function (k) { if (form.elements[k]) form.elements[k].value = state[k]; });
  var order = cards.slice();
  var STEP = 36, limit = STEP;
  var more = $('[data-more]', root);
  var chips = $$('[data-k]', form);
  var chipLabel = {};
  chips.forEach(function (b) { chipLabel[b.dataset.k + ':' + b.dataset.v] = b.dataset.label || b.textContent.trim(); });

  // 카드 한 장이 한 가지 조건에 맞는지
  function hit(d, k, vals) {
    if (!vals.length) return true;
    if (k === 'co') return vals.some(function (v) { return v === 'xx' ? d.co !== 'kr' : d.co === v; });
    if (k === 'hot') return vals.indexOf(d.hot === '' ? 'u' : d.hot) > -1;
    if (k === 'ta') { var t = ' ' + d.ta + ' '; return vals.some(function (v) { return t.indexOf(' ' + v + ' ') > -1; }); }
    return vals.indexOf(d[k]) > -1;
  }
  function base(d, q, saved, skip) {
    if (state.g && (' ' + d.g + ' ').indexOf(' ' + state.g + ' ') < 0) return false;
    if (state.m && d.m !== state.m) return false;
    if (state.st && d.st !== state.st) return false;
    if (state.sort === 'saved' && saved.indexOf(d.s) < 0) return false;
    if (q && !MM.matches(q, d.q)) return false;
    for (var i = 0; i < MULTI.length; i++) { var k = MULTI[i]; if (k !== skip && !hit(d, k, state[k])) return false; }
    return true;
  }
  function paintChips(q, saved) {
    MULTI.forEach(function (k) {
      var pool = cards.filter(function (c) { return base(c.dataset, q, saved, k); });
      chips.filter(function (b) { return b.dataset.k === k; }).forEach(function (b) {
        var n = pool.filter(function (c) { return hit(c.dataset, k, [b.dataset.v]); }).length;
        var on = state[k].indexOf(b.dataset.v) > -1;
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('zero', !n && !on);
        var s = $('.fchip-n', b);
        if (s) s.textContent = n;
      });
    });
  }
  function paintActive() {
    var items = [];
    MULTI.forEach(function (k) { state[k].forEach(function (v) { items.push([k, v, chipLabel[k + ':' + v] || v]); }); });
    if (state.m) { var o = form.elements.m.selectedOptions[0]; items.push(['m', state.m, o ? o.textContent : state.m]); }
    if (state.st) { var p = form.elements.st.selectedOptions[0]; items.push(['st', state.st, p ? p.textContent : state.st]); }
    badge.hidden = !items.length;
    badge.textContent = items.length;
    active.hidden = !items.length;
    active.innerHTML = items.map(function (x) {
      return '<button type="button" class="fact" data-rm="' + x[0] + '" data-v="' + esc(x[1]) + '">' + esc(x[2]) + MM.ico('i-close') + '<span class="sr"> 조건 빼기</span></button>';
    }).join('') + (items.length ? '<button type="button" class="link-btn small" data-clear>모두 지우기</button>' : '');
  }
  function paintTiles() {
    $$('.gtile', root).forEach(function (a) {
      if ((a.dataset.g || '') === state.g) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $$('select', form).forEach(function (s) { s.classList.toggle('on', !!s.value && s.name !== 'sort'); });
  }
  function apply(push) {
    var q = state.q.trim().toLowerCase();
    var saved = MM.getSaved();
    var shown = 0, visible = 0;
    var sorted = order.slice();
    if (state.sort === 'new') sorted.sort(function (a, b) { return Number(b.dataset.y) - Number(a.dataset.y); });
    else if (state.sort === 'n') sorted.sort(function (a, b) { return Number(b.dataset.n || 0) - Number(a.dataset.n || 0); });
    else if (state.sort === 'a') sorted.sort(function (a, b) { return Number(b.dataset.a || 0) - Number(a.dataset.a || 0) || Number(b.dataset.n || 0) - Number(a.dataset.n || 0); });
    sorted.forEach(function (c) {
      var ok = base(c.dataset, q, saved, '');
      if (ok) shown++;
      c.hidden = !ok || shown > limit;
      if (!c.hidden) visible++;
      list.appendChild(c);
    });
    if (more) {
      more.hidden = shown <= limit;
      more.textContent = Math.min(STEP, shown - visible) + '가지 더 보기 (' + visible + '/' + shown + ')';
    }
    var co = state.co.length === 1 ? (state.co[0] === 'xx' ? '해외 라면 ' : (chipLabel['co:' + state.co[0]] || '') + ' 라면 ') : '';
    count.textContent = co + (state.g ? GN[state.g] + ' ' : '') + shown + '가지' + (shown < cards.length ? ' (전체 ' + cards.length + '가지 가운데)' : '');
    empty.hidden = shown > 0;
    paintTiles();
    paintChips(q, saved);
    paintActive();
    if (push !== false) {
      var p = new URLSearchParams();
      ['g', 'q', 'm', 'st'].forEach(function (k) { if (state[k]) p.set(k, state[k]); });
      MULTI.forEach(function (k) { if (state[k].length) p.set(k, state[k].join(',')); });
      if (state.sort !== 'name') p.set('sort', state.sort);
      var qs = p.toString().replace(/%2C/g, ',');
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    }
  }
  var timer = 0;
  form.addEventListener('input', function (e) {
    var t = e.target;
    if (!t.name || !(t.name in state) || MULTI.indexOf(t.name) > -1) return;
    state[t.name] = t.value;
    limit = STEP;
    clearTimeout(timer);
    timer = setTimeout(function () {
      apply();
      if (t.name === 'q' && t.value.trim()) MM.track('search', '', { k: t.value.trim().slice(0, 40), n: cards.filter(function (c) { return !c.hidden; }).length });
    }, t.name === 'q' ? 200 : 0);
  });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('[data-k]');
    if (b) {
      var k = b.dataset.k, v = b.dataset.v, arr = state[k], i = arr.indexOf(v);
      if (i > -1) arr.splice(i, 1); else arr.push(v);
      if (k === 'co' && v === 'xx' && i < 0) state.co = ['xx'];
      else if (k === 'co' && v !== 'xx') state.co = state.co.filter(function (x) { return x !== 'xx'; });
      limit = STEP;
      apply();
      return;
    }
    var rm = e.target.closest('[data-rm]');
    if (rm) {
      var key = rm.dataset.rm;
      if (MULTI.indexOf(key) > -1) state[key] = state[key].filter(function (x) { return x !== rm.dataset.v; });
      else { state[key] = ''; form.elements[key].value = ''; }
      limit = STEP;
      apply();
      return;
    }
    if (e.target.closest('[data-clear]')) reset();
  });
  function reset() {
    var keep = state.sort;
    state = fresh();
    state.sort = keep;
    limit = STEP;
    ['q', 'm', 'st'].forEach(function (k) { form.elements[k].value = ''; });
    apply();
  }
  $$('.gtile', root).forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      state.g = a.dataset.g || '';
      limit = STEP;
      apply();
    });
  });
  $('[data-reset]', root).addEventListener('click', reset);
  // 필터 열고 닫기: 넓은 화면은 처음부터 열어 둬요
  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }
  setOpen(window.matchMedia('(min-width: 960px)').matches);
  toggle.addEventListener('click', function () { setOpen(panel.hidden); });
  if (more) more.addEventListener('click', function () { limit += STEP; apply(false); });
  // 숫자를 받은 뒤 다시 정렬 (기록 많은 순, 별점 순)
  MM.paintCards(list).then(function () { apply(false); });
  apply(false);
})();
