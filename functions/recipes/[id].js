// /recipes/{번호} : 레시피 한 개. 화면은 정적 페이지(/recipes/view/)를 쓰고,
// 카카오톡·SNS 공유 미리보기를 위해 제목·사진·설명만 서버에서 채워 넣어요.
import { ensureSchema } from '../../server/util.js';
import { recipePage } from '../../server/recipes.js';

export async function onRequest(context) {
  const id = String(context.params.id || '');
  if (!/^\d{1,10}$/.test(id)) return context.next();
  if (context.env.DB) {
    try { await ensureSchema(context.env.DB); } catch (e) { /* 그래도 화면은 보여요 */ }
  }
  return recipePage(context, Number(id));
}
