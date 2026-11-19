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

  // ---------- 나에게 맞는 라면 찾기 ----------
  var mt = $('[data-match]');
  if (mt) {
    var qs2 = $$('[data-mq]', mt), step = 0, ans = {}, data = [];
    var TASTE = { meat: ['beef', 'chicken', 'pork'], seafood: ['seafood'], kimchi: ['kimchi', 'gochujang'], soy: ['jjajang', 'soy'], cream: ['cream'], curry: ['curry'], sour: ['sour'] };
    var TL = { meat: '고기 국물', seafood: '해물 맛', kimchi: '김치·고추장 맛', soy: '짜장·간장 맛', cream: '크림·코코넛 맛', curry: '카레·향신료 맛', sour: '새콤한 맛' };
    var DRY = ['fried', 'bibim', 'cold', 'jjajang'];
    var showQ = function () {
      qs2.forEach(function (q, i) { q.hidden = i !== step; });
      $('[data-mstep]', mt).textContent = (step + 1) + ' / ' + qs2.length;
      $('[data-mbar]', mt).style.width = (step / qs2.length * 100) + '%';
      $('[data-mback]', mt).hidden = step === 0;
    };
    var score = function (r) {
      var sc = 0, why = [];
      if (r.st === 'off') return null;
      if (ans.hot !== '') {
        var h = r.hot == null ? -9 : r.hot - +ans.hot;
        if (h === 0) { sc += 3; why.push(['순한 편', '적당히 매콤', '아주 매운 편'][+ans.hot]); } else if (Math.abs(h) === 1) sc += 1; else sc -= 2;
      }
      if (ans.style === 'soup') { if (DRY.indexOf(r.c) < 0) { sc += 3; why.push('국물 라면'); } else sc -= 3; }
      if (ans.style === 'dry') { if (DRY.indexOf(r.c) > -1) { sc += 3; why.push('국물 없이 비비는 라면'); } else sc -= 3; }
      if (ans.taste) {
        var ta = r.ta || [];
        if (TASTE[ans.taste].some(function (x) { return ta.indexOf(x) > -1; })) { sc += 4; why.push(TL[ans.taste]); }
      }
      if (ans.co === 'kr') { if (r.co === 'kr') sc += 2; else return null; }
      if (ans.co === 'xx') { if (r.co !== 'kr') { sc += 2; why.push(r.cn + ' 라면'); } else return null; }
      if (ans.co === 'mix' && r.co !== 'kr') { sc += 1.5; why.push(r.cn + ' 라면'); }
      if (ans.nd === 'oil') { if (r.nd === 'oil') sc += 1.5; }
      if (ans.nd === 'light') { if (['dry', 'rice', 'fresh', 'cooked', 'glass'].indexOf(r.nd) > -1) { sc += 2.5; why.push('튀기지 않은 면'); } else sc -= 1; }
      return { r: r, sc: sc + Math.random() * 0.8, why: why };
    };
    var result = function () {
      var list = data.map(score).filter(Boolean).sort(function (a, b) { return b.sc - a.sc; });
      var pick = [], seen = {};
      var lim = ans.co === 'mix' ? 2 : 3;
      for (var i = 0; i < list.length && pick.length < lim; i++) { if (!seen[list[i].r.m]) { seen[list[i].r.m] = 1; pick.push(list[i]); } }
      if (ans.co === 'mix') {
        // 한국 라면과 해외 라면이 섞이도록 세 번째는 아직 없는 쪽에서 골라요
        var hasKr = pick.some(function (x) { return x.r.co === 'kr'; }), hasXx = pick.some(function (x) { return x.r.co !== 'kr'; });
        for (var j = 0; j < list.length && pick.length < 3; j++) {
          var x = list[j];
          if (seen[x.r.m]) continue;
          if ((!hasKr && x.r.co === 'kr') || (!hasXx && x.r.co !== 'kr') || (hasKr && hasXx)) { seen[x.r.m] = 1; pick.push(x); }
        }
      }
      var box = $('[data-mresult]', mt);
      qs2.forEach(function (q) { q.hidden = true; });
      $('[data-mbar]', mt).style.width = '100%';
      $('[data-mstep]', mt).textContent = '결과';
      $('[data-mback]', mt).hidden = true;
      box.hidden = false;
      box.innerHTML = '<h2 class="quiz-q">이런 라면은 어때요?</h2>' + (pick.length ? '<div class="mres">' + pick.map(function (x, k) {
        return '<div class="mres-item"><p class="mres-why"><b>' + (k + 1) + '</b>' + (x.why.length ? x.why.map(esc).join(' · ') : '고른 조건과 가장 가까워요') + '</p>' + MM.cardHTML(x.r) + '</div>';
      }).join('') + '</div>' : '<p class="muted">조건에 맞는 라면을 찾지 못했어요. 조건을 조금 넓혀 보세요.</p>') +
        '<p class="row-btns"><button type="button" class="btn btn-main" data-mretry>' + ico('i-reset') + '다시 하기</button>' +
        (pick.length ? '<button type="button" class="btn btn-line" data-mshare>' + ico('i-share') + '결과 공유</button>' : '') + '</p>';
      MM.track('match', pick.length ? pick[0].r.s : '');
      var sh = $('[data-mshare]', box);
      if (sh) sh.addEventListener('click', function () { MM.share({ title: '나에게 맞는 라면', text: '면면이 골라 준 내 라면: ' + pick.map(function (x) { return x.r.n; }).join(', '), url: location.origin + '/lab/match/' }); });
      $('[data-mretry]', box).addEventListener('click', function () { step = 0; ans = {}; box.hidden = true; box.innerHTML = ''; showQ(); });
    };
    mt.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mv]');
      if (b) {
        ans[b.closest('[data-mq]').dataset.mq] = b.dataset.mv;
        step++;
        if (step < qs2.length) showQ(); else if (data.length) result(); else MM.loadRamen().then(function (d) { data = d.ramen; result(); });
        return;
      }
      if (e.target.closest('[data-mback]') && step > 0) { step--; showQ(); }
    });
    MM.loadRamen().then(function (d) { data = d.ramen; });
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

  // ---------- 라면 도전 과제 ----------
  var quests = $('[data-quests]');
  if (quests) {
    var local = MM.store.get('mm-quest', {}) || {}, rec = {}, logged = false;
    var sum = $('[data-quest-sum]', quests);
    var paintQ = function () {
      var done = 0, all = $$('[data-quest]', quests);
      all.forEach(function (q) {
        var btns = $$('[data-qs]', q), n = 0;
        btns.forEach(function (b) {
          var s = b.getAttribute('data-qs'), on = !!(rec[s] || local[s]);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.classList.toggle('is-rec', !!rec[s]);
          if (on) n++;
        });
        $('[data-qn]', q).textContent = n + ' / ' + btns.length;
        $('[data-qbar]', q).style.width = (btns.length ? n / btns.length * 100 : 0) + '%';
        var full = btns.length > 0 && n === btns.length;
        q.classList.toggle('is-done', full);
        if (full) done++;
      });
      sum.innerHTML = (done ? '도전 과제 ' + all.length + '개 가운데 <b>' + done + '개</b>를 완주했어요.' : '먹어 본 라면에 표시해 보세요. 한 줄을 다 채우면 완주예요.') +
        (logged ? ' 빨간 표시는 한 그릇 기록으로 확인된 라면이에요.' : ' <a href="/me/">로그인</a>하면 기록한 라면이 자동으로 표시돼요.');
    };
    quests.addEventListener('click', function (e) {
      var b = e.target.closest('[data-qs]');
      if (!b) return;
      var s = b.getAttribute('data-qs');
      if (rec[s]) { MM.toast('한 그릇 기록으로 확인된 라면이에요'); return; }
      if (local[s]) delete local[s]; else local[s] = 1;
      MM.store.set('mm-quest', local);
      paintQ();
      var q = b.closest('[data-quest]');
      if (local[s] && q.classList.contains('is-done')) MM.toast($('h2', q).textContent + ' 완주! 축하해요');
    });
    paintQ();
    MM.getMe().then(function (u) {
      if (!u) return;
      logged = true;
      MM.api('growth').then(function (g) {
        if (g && g.ok && g.bowls) g.bowls.forEach(function (x) { rec[x.s] = 1; });
        paintQ();
      });
    });
  }

  // ---------- 라면 초성 퀴즈 ----------
  var choEl = $('[data-cho]');
  if (choEl) {
    var cbox = $('[data-cho-box]', choEl), scope = 'kr', bank2 = [], round = [], ci = 0, cscore = 0, hint = 0, answered = false, missed = [];
    var CN = 10;
    var same = function (a, b) { return MM.matches(a, b) && MM.matches(b, a); };
    var hangul = function (s) { return (s.match(/[가-힣]/g) || []).length; };
    var usable = function (r) { return hangul(r.n) >= 2 && r.n.length <= 11 && !/[×()]/.test(r.n); };
    var poolC = function () {
      return bank2.filter(function (r) { return scope === '' || (scope === 'kr' ? r.co === 'kr' : r.co !== 'kr'); });
    };
    var meta = function (r) { return (r.cn ? r.cn + ' · ' : '') + r.mn + ' · ' + ((MM.D.STYLES || {})[r.c] || '라면'); };
    var startC = function () {
      round = shuffle(poolC().slice()).slice(0, CN); ci = 0; cscore = 0; missed = [];
      if (!round.length) { cbox.innerHTML = '<p class="muted">문제를 만들 라면이 없어요.</p>'; return; }
      showC();
    };
    var showC = function () {
      var r = round[ci]; hint = 0; answered = false;
      cbox.innerHTML = '<div class="quiz-top"><span>' + (ci + 1) + ' / ' + round.length + '</span><span>맞힌 문제 ' + cscore + '</span></div>' +
        '<div class="quiz-bar"><i style="width:' + (ci / round.length * 100) + '%"></i></div>' +
        '<p class="cho-word' + (r.n.length > 7 ? ' cho-long' : '') + '" aria-label="초성">' + esc(MM.cho(r.n)) + '</p>' +
        '<p class="cho-hint" data-cho-hint aria-live="polite"></p>' +
        '<form class="cho-form" data-cho-form autocomplete="off"><label class="sr" for="cho-in">라면 이름</label><input class="input" id="cho-in" name="a" type="text" placeholder="라면 이름을 적어 주세요" autocapitalize="off" spellcheck="false">' +
        '<button type="submit" class="btn btn-main">확인</button></form>' +
        '<p class="row-btns cho-btns"><button type="button" class="btn btn-line btn-sm" data-cho-h>힌트 보기</button><button type="button" class="btn btn-ghost btn-sm" data-cho-skip>모르겠어요</button></p>' +
        '<div class="quiz-why" data-cho-why hidden></div>';
      var inp = $('#cho-in', cbox);
      if (inp && ci > 0) inp.focus();
    };
    var reveal = function (ok) {
      var r = round[ci]; answered = true;
      if (ok) cscore++; else missed.push(r);
      var why = $('[data-cho-why]', cbox);
      why.hidden = false;
      why.innerHTML = '<p><b>' + (ok ? '정답이에요.' : '정답은 ' + esc(r.n) + '예요.') + '</b> ' + esc(meta(r)) + '</p>' +
        '<p class="row-btns"><a class="btn btn-line btn-sm" href="/ramen/' + r.s + '/">도감에서 보기</a><button type="button" class="btn btn-main btn-sm" data-cho-next>' + (ci + 1 < round.length ? '다음 문제' : '결과 보기') + '</button></p>';
      $$('input, [data-cho-h], [data-cho-skip], .cho-form button', cbox).forEach(function (x) { x.disabled = true; });
      $('[data-cho-next]', cbox).focus();
    };
    var endC = function () {
      var best = 0;
      try { best = +(localStorage.getItem('mm-cho-best') || 0); if (cscore > best) localStorage.setItem('mm-cho-best', String(cscore)); } catch (e) { /* 저장 못 해도 괜찮아요 */ }
      var n = round.length, tier = cscore === n ? '초성만 봐도 라면이 보이는 분' : cscore >= n * 0.7 ? '라면 이름에 밝은 분' : cscore >= n * 0.4 ? '조금만 더 하면 돼요' : '도감을 한 번 훑어보면 금방 늘어요';
      cbox.innerHTML = '<div class="quiz-end"><p class="quiz-score"><b>' + cscore + '</b> / ' + n + '</p><h2>' + tier + '</h2>' +
        (best && best > cscore ? '<p class="small muted">이 기기에서 가장 잘한 기록은 ' + best + '개예요.</p>' : '') +
        (missed.length ? '<h3>놓친 라면</h3><ul class="quiz-wrong">' + missed.map(function (r) { return '<li><a href="/ramen/' + r.s + '/">' + esc(r.n) + '</a><span>' + esc(MM.cho(r.n)) + ' · ' + esc(meta(r)) + '</span></li>'; }).join('') + '</ul>' : '') +
        '<p class="row-btns"><button type="button" class="btn btn-main" data-cho-retry>' + ico('i-reset') + '다시 하기</button><button type="button" class="btn btn-line" data-cho-share>' + ico('i-share') + '결과 알리기</button></p></div>';
    };
    choEl.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-cho-form]');
      if (!f) return;
      e.preventDefault();
      if (answered) return;
      var v = f.a.value.trim();
      if (!v) return;
      if (same(v, round[ci].n)) reveal(true);
      else { f.a.value = ''; f.a.focus(); $('[data-cho-hint]', cbox).textContent = '아쉽지만 ‘' + v + '’ 말고 다른 이름이에요.'; }
    });
    choEl.addEventListener('click', function (e) {
      var sc = e.target.closest('[data-cho-co]');
      if (sc) {
        scope = sc.getAttribute('data-cho-co');
        $$('[data-cho-co]', choEl).forEach(function (x) { x.setAttribute('aria-pressed', x === sc ? 'true' : 'false'); });
        startC(); return;
      }
      if (e.target.closest('[data-cho-h]')) {
        var r = round[ci]; hint++;
        $('[data-cho-hint]', cbox).textContent = hint === 1 ? '힌트: ' + meta(r) : '힌트: ‘' + r.n.charAt(0) + '’로 시작하고 ' + r.n.replace(/\s/g, '').length + '글자예요. (' + meta(r) + ')';
        if (hint >= 2) e.target.closest('[data-cho-h]').disabled = true;
        return;
      }
      if (e.target.closest('[data-cho-skip]')) { reveal(false); return; }
      if (e.target.closest('[data-cho-next]')) { ci++; if (ci < round.length) showC(); else endC(); return; }
      if (e.target.closest('[data-cho-retry]')) { startC(); return; }
      if (e.target.closest('[data-cho-share]')) MM.share({ title: '면면 라면 초성 퀴즈', text: '면면 라면 초성 퀴즈에서 ' + round.length + '문제 중 ' + cscore + '개를 맞혔어요. ㅅㄹㅁ은 뭘까요?', url: location.origin + '/lab/chosung/' });
    });
    MM.loadRamen().then(function (d) { bank2 = d.ramen.filter(usable); startC(); }).catch(function () { cbox.innerHTML = '<p class="muted">문제를 불러오지 못했어요.</p>'; });
  }
})();
