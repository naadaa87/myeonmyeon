// 레시피 자랑 (후루룩클럽 게시판): 목록, 쓰기, 레시피 한 개 보기 화면
// 레시피 내용은 화면에서 서버(/api/recipes)에 물어 채워요. /recipes/{번호} 주소는 functions/recipes/[id].js가 받아요.
import { esc, SITE_NAME, layout, icon, img, crumbs, crumbLd } from './lib.mjs';
import { cmTabs } from './pages-more.mjs';

const NOJS = '<noscript><p class="notice">레시피 자랑은 자바스크립트를 켜야 쓸 수 있어요.</p></noscript>';
const base = [['/', SITE_NAME], ['/club/', '후루룩클럽']];

export function recipeListPage() {
  const body = `<div class="wrap">
${crumbs([...base, ['/recipes/', '레시피 자랑']])}
${cmTabs('/recipes/')}
<section class="rcp-hero">
<div class="rcp-hero-text">
<p class="kicker">후루룩클럽 게시판</p>
<h1>라면 레시피 자랑</h1>
<p>내가 끓인 라면을 사진으로 보여 주고, 넣은 재료와 순서를 나눠요. 마음에 드는 레시피는 저장해 두고, 따라 해 봤다면 후기로 알려 주세요.</p>
<div class="row-btns"><a class="btn btn-main btn-lg" href="/recipes/write/">${icon('i-pen')}내 레시피 자랑하기</a><a class="btn btn-line btn-lg" href="/recipes/?saved=1">${icon('i-bookmark')}저장한 레시피</a></div>
</div>
<div class="rcp-hero-pic">${img('club-recipe', '냄비에 끓인 라면에 치즈를 올리는 장면', '', true)}</div>
</section>
<ol class="rcp-how3">
<li><b>${icon('i-plus')}사진 올리기</b><span>완성 사진을 다섯 장까지 올려요.</span></li>
<li><b>${icon('i-list')}재료와 순서</b><span>넣은 재료와 끓이는 순서를 적어요.</span></li>
<li><b>${icon('i-check')}따라 해 봤어요</b><span>따라 한 사람의 별점과 후기가 모여요.</span></li>
</ol>
${NOJS}
<div class="rcp" data-rcp="list"><p class="muted loading">불러오는 중이에요</p></div>
<p class="note">레시피를 올리면 +10점, 다른 사람의 레시피를 따라 해 보고 후기를 남기면 +4점을 받아요. 내 레시피에 후기가 달리면 별을 받아요. 다른 사람이 찍은 사진이나 광고 글은 <a href="/club/rules/">이용 규칙</a>에 따라 가려요.</p>
</div>`;
  return layout({
    title: `라면 레시피 자랑 - 사진으로 보는 라면 조합 | ${SITE_NAME}`,
    description: '라면 좋아하는 사람들이 직접 끓인 라면 사진과 재료, 만드는 순서를 올리는 레시피 게시판. 좋아요, 저장, 공유하고 따라 해 본 후기를 남겨요.',
    path: '/recipes/', body, scripts: ['recipes.js'],
    jsonld: crumbLd([...base, ['/recipes/', '레시피 자랑']]),
  });
}

export function recipeWritePage() {
  const body = `<div class="wrap wrap-narrow">
${crumbs([...base, ['/recipes/', '레시피 자랑'], ['/recipes/write/', '레시피 자랑하기']])}
<section class="page-head page-head-sm"><h1 data-rcp-title>레시피 자랑하기</h1><p>사진, 재료, 만드는 순서만 있으면 돼요. 쓰다가 나가도 글은 이 기기에 남아 있어요.</p></section>
${NOJS}
<div class="rcp" data-rcp="write"><p class="muted loading">불러오는 중이에요</p></div>
</div>`;
  return layout({ title: `레시피 자랑하기 | ${SITE_NAME}`, description: '라면 레시피 올리기', path: '/recipes/write/', body, scripts: ['recipes.js'], noindex: true });
}

export function recipeViewPage() {
  const body = `<div class="wrap">
${crumbs([...base, ['/recipes/', '레시피 자랑'], ['/recipes/', '레시피']])}
${cmTabs('/recipes/')}
${NOJS}
<div class="rcp" data-rcp="view"><p class="muted loading">레시피를 불러오는 중이에요</p></div>
</div>`;
  return layout({ title: `라면 레시피 | ${SITE_NAME}`, description: '후루룩클럽 회원이 올린 라면 레시피', path: '/recipes/view/', body, scripts: ['recipes.js'], ogType: 'article', noindex: true });
}
