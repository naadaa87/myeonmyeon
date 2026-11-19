/* 취향실험실: 오늘의 라면 뽑기, 라면 퀴즈 */
(function () {
  'use strict';
  var MM = window.MM;
  if (!MM) return;
  var $ = MM.$, $$ = MM.$$, esc = MM.esc, ico = MM.ico;
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  // ---------- 오늘의 라면 뽑기 ----------
  var pick = $('[data-pick]');
  if (pick) {
    var state = { co: '', hot: '', c: '' };
    var C = { soup: ['soup'], dry: ['fried', 'bibim', 'cold'], jj: ['jjajang', 'jjamppong'], udon: ['udon'] };
    var all = [], slot = $('[data-slot]', pick), poolEl = $('[data-pool]', pick), result = $('[data-result]', pick), go = $('[data-go]', pick), sale = $('[data-pick-new]', pick);
    var pool = function () {
      return all.filter(function (r) {
        if (state.co === 'kr' && r.co !== 'kr') return false;
        if (state.co === 'xx' && r.co === 'kr') return false;
        if (state.hot !== '' && String(r.hot) !== state.hot) return false;
        if (state.c && C[state.c].indexOf(r.c) < 0) return false;
        if (sale.checked && r.st === 'off') return false;
        return true;
      });
    };
    var paint = function () {
      var n = pool().length;
      poolEl.textContent = all.length ? '조건에 맞는 라면 ' + n + '가지 가운데서 골라요' : '';
      go.disabled = !n;
    };
    pick.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pk]');
      if (!b) return;
      state[b.dataset.pk] = b.dataset.v;
      $$('[data-pk="' + b.dataset.pk + '"]', pick).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      paint();
    });
    sale.addEventListener('change', paint);
    var show = function (r) {
      slot.innerHTML = '<span class="rpick-hit">' + esc(r.n) + '</span>';
      result.innerHTML = '<div class="rpick-card">' + MM.cardHTML(r) + '</div>' +
        '<p class="row-btns"><button type="button" class="btn btn-sub" data-again>' + ico('i-reset') + '다시 뽑기</button>' +
        '<a class="btn btn-line" href="/record/?s=' + r.s + '">' + ico('i-pen') + '먹고 기록하기</a>' +
        '<button type="button" class="btn btn-line" data-share>' + ico('i-share') + '공유</button></p>';
      $('[data-again]', result).addEventListener('click', roll);
      $('[data-share]', result).addEventListener('click', function () {
        MM.share({ title: '오늘의 라면', text: '면면 라면 뽑기에서 오늘의 라면으로 ‘' + r.n + '’이(가) 나왔어요.', url: location.origin + '/ramen/' + r.s + '/' });
      });
      MM.track('pick', r.s);
    };
    var roll = function () {
      var list = pool();
      if (!list.length) return;
      var hit = list[Math.floor(Math.random() * list.length)];
      result.innerHTML = '';
      if (calm || list.length < 3) { show(hit); return; }
      go.disabled = true;
      var t = 0, wait = 50;
      var tick = function () {
        slot.innerHTML = '<span>' + esc(list[Math.floor(Math.random() * list.length)].n) + '</span>';
        t += wait;
        wait = Math.min(220, wait * 1.12);
        if (t < 1500) setTimeout(tick, wait);
        else { show(hit); go.disabled = false; }
      };
      tick();
    };
    go.addEventListener('click', roll);
    MM.loadRamen().then(function (d) { all = d.ramen; paint(); });
  }

  // ---------- 라면 퀴즈 ----------
  var quiz = $('[data-quiz]');
  if (quiz) {
    var bank = [];
    try { bank = JSON.parse($('#quiz-data').textContent); } catch (e) { bank = []; }
    var N = Math.min(10, bank.length), qs = [], i = 0, score = 0, wrong = [];
    var start = function () {
      qs = shuffle(bank.slice()).slice(0, N).map(function (x) {
        var opts = x.o.map(function (o, k) { return { t: o, ok: k === x.a }; });
        return { q: x.q, o: shuffle(opts), why: x.why, link: x.link };
      });
      i = 0; score = 0; wrong = [];
      ask();
    };
    var ask = function () {
      var x = qs[i];
      quiz.innerHTML = '<div class="quiz-top"><span>' + (i + 1) + ' / ' + N + '</span><span>맞힌 문제 ' + score + '</span></div>' +
        '<div class="quiz-bar"><i style="width:' + (i / N * 100) + '%"></i></div>' +
        '<h2 class="quiz-q">' + esc(x.q) + '</h2>' +
        '<div class="quiz-opts">' + x.o.map(function (o, k) { return '<button type="button" class="quiz-opt" data-k="' + k + '"><b>' + 'ABCD'[k] + '</b>' + esc(o.t) + '</button>'; }).join('') + '</div>' +
        '<div class="quiz-why" data-why hidden></div>';
      var first = $('.quiz-opt', quiz);
      if (first && i > 0) first.focus();
    };
    quiz.addEventListener('click', function (e) {
      var b = e.target.closest('.quiz-opt');
      if (b && !b.disabled) {
        var x = qs[i], pickd = x.o[+b.dataset.k];
        $$('.quiz-opt', quiz).forEach(function (o, k) {
          o.disabled = true;
          if (x.o[k].ok) o.classList.add('ok');
        });
        if (pickd.ok) score++;
        else { b.classList.add('no'); wrong.push(x); }
        var why = $('[data-why]', quiz);
        why.hidden = false;
        why.innerHTML = '<p><b>' + (pickd.ok ? '정답이에요.' : '아쉬워요.') + '</b> ' + esc(x.why) + '</p>' +
          '<p class="row-btns"><button type="button" class="btn btn-main" data-next>' + (i + 1 < N ? '다음 문제' : '결과 보기') + ico('i-chev') + '</button><a class="btn btn-line" href="' + esc(x.link) + '" target="_blank" rel="noopener">더 읽어 보기</a></p>';
        $('[data-next]', quiz).focus();
        return;
      }
      if (e.target.closest('[data-next]')) { i++; if (i < N) ask(); else end(); return; }
      if (e.target.closest('[data-retry]')) { start(); return; }
      if (e.target.closest('[data-qshare]')) MM.share({ title: '면면 라면 퀴즈', text: '면면 라면 퀴즈에서 ' + N + '문제 중 ' + score + '개를 맞혔어요. 당신은 몇 개?', url: location.origin + '/lab/quiz/' });
    });
    var end = function () {
      var best = 0;
      try { best = +(localStorage.getItem('mm-quiz-best') || 0); if (score > best) localStorage.setItem('mm-quiz-best', String(score)); } catch (e) { /* 저장 못 해도 괜찮아요 */ }
      var tier = score === N ? '라면 박사예요. 다 맞혔어요!' : score >= N * 0.7 ? '라면 매니아 인정이에요.' : score >= N * 0.4 ? '라면 좀 아시는군요.' : '이제부터 알아 가면 돼요.';
      quiz.innerHTML = '<div class="quiz-end"><p class="quiz-score"><b>' + score + '</b> / ' + N + '</p><h2>' + tier + '</h2>' +
        (best && best > score ? '<p class="small muted">이 기기에서 가장 잘한 기록은 ' + best + '개예요.</p>' : '') +
        (wrong.length ? '<h3>틀린 문제 다시 보기</h3><ul class="quiz-wrong">' + wrong.map(function (x) { return '<li><a href="' + esc(x.link) + '">' + esc(x.q) + '</a><span>' + esc(x.why) + '</span></li>'; }).join('') + '</ul>' : '') +
        '<p class="row-btns"><button type="button" class="btn btn-main" data-retry>' + ico('i-reset') + '다시 풀기</button><button type="button" class="btn btn-line" data-qshare>' + ico('i-share') + '결과 공유</button></p></div>';
      MM.track('quiz', '', { n: score });
    };
    if (N) start(); else quiz.innerHTML = '<p class="muted">문제를 불러오지 못했어요.</p>';
  }
})();
