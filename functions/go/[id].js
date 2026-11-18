// /go/{라면 주소} : 라면몰 구매 버튼. 쿠팡 파트너스 링크(또는 쿠팡 검색)로 보내요.
import { ensureSchema } from '../../server/util.js';
import { go } from '../../server/shop.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  if (env.DB) {
    try { await ensureSchema(env.DB); } catch (e) { /* 표를 못 만들어도 이동은 해요 */ }
  }
  return go(request, env, String(params.id || ''));
}
