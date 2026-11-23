/* 라면몰: ‘이달의 랭킹’ 진열대를 지난달 마지막 순위로 채워요 */
(function () {
  'use strict';
  var MM = window.MM;
  var sec = MM && MM.$('[data-shelf-rank]');
  if (!sec) return;
  var $ = MM.$, esc = MM.esc, ico = MM.ico, D = MM.D;
  var box = $('[data-shelf-list]', sec);
  Promise.all([MM.loadRamen(), MM.api('ramen/shelf')]).then(function (r) {
    var j = r[1];
    if (!j.ok || !j.list.length) {
      box.innerHTML = '<div class="pending" style="grid-column:1/-1"><h3>랭킹이 모이면 채워져요</h3><p class="small muted">라면마다 기록이 ' + D.RANK_RULE.minN + '개 넘게 모여야 순위가 생겨요. 그때까지는 아래 진열대를 둘러봐 주세요.</p></div>';
      return;
    }
    var lead = $('.sec-lead', sec);
    if (lead) lead.textContent = j.live ? '아직 지난달 순위가 없어서 지금 종합 랭킹 순서대로 진열했어요.' : j.month.replace('-', '년 ') + '월 마지막 날 종합 랭킹 순서 그대로 진열했어요.';
    box.innerHTML = j.list.map(function (s, i) {
      var x = MM.BY[s];
      if (!x) return '';
      return '<article class="pcard" data-s="' + s + '" style="position:relative"><span class="rnum' + (i < 3 ? ' n' + (i + 1) : '') + '">' + (i + 1) + '</span><a class="pcard-img" href="/ramen/' + s + '/"><img src="' + MM.imgOf(x) + '" alt="" width="480" height="480" loading="lazy">' + (x.pi && x.pi[0] === 1 ? '<span class="pic-ai">AI 조리 예시</span>' : '') + '</a>' +
        '<div class="pcard-body"><p class="rcard-maker">' + esc(x.mn) + (x.f ? ' · ' + esc(D.FORMS[x.f]) : '') + '</p><h3><a href="/ramen/' + s + '/">' + esc(x.n) + '</a></h3><p class="rcard-stat" data-stat>기록 모으는 중</p>' +
        '<a class="btn btn-buy btn-sm" href="/go/' + s + '?from=shop-monthly" rel="sponsored nofollow noopener" target="_blank" data-kpi="쿠팡 이동" data-buy="' + s + '">' + ico('i-cart') + '쿠팡에서 보기</a></div></article>';
    }).join('');
    MM.paintCards(box);
  });
})();
