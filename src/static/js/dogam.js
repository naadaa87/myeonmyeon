/* 라면 도감: 종류 탭, 회사·형태·맵기 거르기, 초성 검색, 정렬 (주소에 조건을 남겨 공유할 수 있어요) */
(function () {
  'use strict';
  var MM = window.MM;
  var root = MM && MM.$('[data-dogam]');
  if (!root) return;
  var $ = MM.$, $$ = MM.$$;
  var form = $('[data-filter]', root), list = $('[data-list]', root), count = $('[data-count]', root), empty = $('[data-empty]', root);
  var cards = $$('.rcard', list);
  var params = new URLSearchParams(location.search);
  var state = { g: params.get('g') || '', q: params.get('q') || '', m: params.get('m') || '', f: params.get('f') || '', hot: params.get('hot') || '', st: params.get('st') || '', sort: params.get('sort') || 'name' };
  var GN = {};
  (MM.D.GROUPS || []).forEach(function (g) { GN[g.id] = g.name; });
  ['q', 'm', 'f', 'hot', 'st', 'sort'].forEach(function (k) { if (form[k]) form[k].value = state[k]; });
  var order = cards.slice();

  function paintTiles() {
    $$('.gtile', root).forEach(function (a) {
      var g = a.dataset.g || '';
      if (g === state.g) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $$('select', form).forEach(function (s) { s.classList.toggle('on', !!s.value && s.name !== 'sort'); });
  }
  function apply(push) {
    var q = state.q.trim().toLowerCase();
    var saved = MM.getSaved();
    var shown = 0;
    var sorted = order.slice();
    if (state.sort === 'new') sorted.sort(function (a, b) { return Number(b.dataset.y) - Number(a.dataset.y); });
    else if (state.sort === 'n') sorted.sort(function (a, b) { return Number(b.dataset.n || 0) - Number(a.dataset.n || 0); });
    else if (state.sort === 'a') sorted.sort(function (a, b) { return Number(b.dataset.a || 0) - Number(a.dataset.a || 0) || Number(b.dataset.n || 0) - Number(a.dataset.n || 0); });
    sorted.forEach(function (c) {
      var d = c.dataset;
      var ok = (!state.g || (' ' + d.g + ' ').indexOf(' ' + state.g + ' ') > -1) &&
        (!state.m || d.m === state.m) && (!state.f || d.f === state.f) && (!state.hot || d.hot === state.hot) && (!state.st || d.st === state.st) &&
        (state.sort !== 'saved' || saved.indexOf(d.s) > -1) && (!q || MM.matches(q, d.q));
      c.hidden = !ok;
      if (ok) shown++;
      list.appendChild(c);
    });
    count.textContent = (state.g ? GN[state.g] + ' ' : '') + shown + '가지' + (shown < cards.length ? ' (전체 ' + cards.length + '가지 가운데)' : '');
    empty.hidden = shown > 0;
    paintTiles();
    if (push !== false) {
      var p = new URLSearchParams();
      Object.keys(state).forEach(function (k) { if (state[k] && !(k === 'sort' && state[k] === 'name')) p.set(k, state[k]); });
      var qs = p.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    }
  }
  var timer = 0;
  form.addEventListener('input', function (e) {
    var t = e.target;
    if (!t.name) return;
    state[t.name] = t.value;
    clearTimeout(timer);
    timer = setTimeout(function () {
      apply();
      if (t.name === 'q' && t.value.trim()) MM.track('search', '', { k: t.value.trim().slice(0, 40), n: cards.filter(function (c) { return !c.hidden; }).length });
    }, t.name === 'q' ? 200 : 0);
  });
  $$('.gtile', root).forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      state.g = a.dataset.g || '';
      apply();
    });
  });
  $('[data-reset]', root).addEventListener('click', function () {
    state = { g: '', q: '', m: '', f: '', hot: '', st: '', sort: 'name' };
    ['q', 'm', 'f', 'hot', 'st', 'sort'].forEach(function (k) { form[k].value = state[k]; });
    apply();
  });
  // 숫자를 받은 뒤 다시 정렬 (기록 많은 순, 별점 순)
  MM.paintCards(list).then(function () { apply(false); });
  apply(false);
})();
