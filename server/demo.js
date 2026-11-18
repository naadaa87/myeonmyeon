// 시험 데이터: 문을 열기 전에 랭킹·맛 지도·도감 화면이 어떻게 보이는지 확인하려고 넣는 가짜 기록이에요.
// 시험 데이터가 있는 동안에는 모든 페이지 위에 ‘시험 데이터가 섞여 있어요’ 띠가 떠요. 문 열기 전에 꼭 지워 주세요.
import { json, fail, nowIso, assetJSON, systemUserId } from './util.js';
import { clearCache } from './ramen.js';

const USERS = 30;

// 늘 같은 결과가 나오는 난수
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export async function demoData(request, env, parts) {
  const db = env.DB;
  const [action] = parts;
  const m = request.method;
  if (!action && m === 'GET') {
    const [u, b] = await db.batch([
      db.prepare('SELECT COUNT(*) AS n FROM users WHERE demo = 1'),
      db.prepare('SELECT COUNT(*) AS n FROM bowls WHERE demo = 1'),
    ]);
    return json({ ok: true, users: u.results[0].n, bowls: b.results[0].n });
  }
  if (action === 'fill' && m === 'POST') {
    const have = await db.prepare('SELECT COUNT(*) AS n FROM users WHERE demo = 1').first();
    if (have && have.n) return fail('시험 데이터가 이미 들어 있어요. 지운 뒤 다시 넣어 주세요.', 409);
    const d = await assetJSON(env, request, '/data/ramen.json');
    if (!d) return fail('라면 목록을 읽지 못했어요.', 500);
    await systemUserId(db);
    const rand = rng(20261118);
    const now = Date.now();
    const iso = (daysAgo) => new Date(now - daysAgo * 86400e3 - Math.floor(rand() * 20 * 3600e3)).toISOString();
    // 시험 회원 (로그인할 수 없는 계정)
    const stm = [];
    for (let i = 1; i <= USERS; i++) {
      const n = String(i).padStart(2, '0');
      stm.push(db.prepare("INSERT OR IGNORE INTO users (login, nick, pw, status, created_at, last_at, demo) VALUES (?, ?, '', 'ok', ?, ?, 1)").bind(`demo_${n}`, `시험회원${n}`, iso(150), iso(1)));
    }
    await db.batch(stm);
    const { results: users } = await db.prepare('SELECT id, login FROM users WHERE demo = 1 ORDER BY id').all();
    // 라면마다 기본 별점과 인기를 정해 두고, 회원마다 조금씩 흔들어요
    const base = d.ramen.map((r) => ({
      r,
      pop: 0.15 + rand() * 0.75,
      rate: 5.5 + rand() * 3.5,
      hot: r.hot === 2 ? 4.6 : r.hot === 1 ? 3.2 : r.hot === 0 ? 1.4 : 2.5,
      rich: 2 + rand() * 2.5,
      thick: r.c === 'udon' || r.c === 'jjamppong' ? 4.2 : r.c === 'cold' ? 2.5 : 3,
      sweet: r.c === 'jjajang' || r.c === 'bibim' ? 3.6 : 1.8,
    }));
    const rows = [];
    users.forEach((u, ui) => {
      const heavy = ui < 2; // 두 명은 거의 모든 라면을 먹어 본 매니아로
      base.forEach((b, bi) => {
        if (!heavy && rand() > b.pop) return;
        const rating = clamp(Math.round(b.rate + (rand() - 0.5) * 3), 1, 10);
        const ax = (v, spread = 1.2) => clamp(Math.round(v + (rand() - 0.5) * spread * 2), 1, 5);
        const fill = rand() < 0.7;
        const x = fill ? [ax(b.hot, 0.8), ax(3), ax(b.sweet), ax(b.rich), ax(2.8), ax(b.thick, 0.7), ax(3.2), ax(2.6)] : [0, 0, 0, 0, 0, 0, 0, 0];
        const again = rating >= 8 ? 'yes' : rating >= 5 ? (rand() < 0.5 ? 'maybe' : 'yes') : 'no';
        const days = Math.floor(rand() * 70) + (bi % 7 === 0 ? 0 : 3);
        const at = iso(days);
        rows.push(db.prepare(`INSERT OR IGNORE INTO bowls (slug, user_id, rating, again, a_hot, a_salt, a_sweet, a_rich, a_oil, a_thick, a_chew, a_unique, body, demo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
          .bind(b.r.s, u.id, rating, rand() < 0.85 ? again : '', ...x, rand() < 0.08 ? '화면 시험용 기록이에요.' : '', at, at));
      });
    });
    for (let i = 0; i < rows.length; i += 80) await db.batch(rows.slice(i, i + 80));
    await db.prepare("INSERT INTO kv (k, v) VALUES ('demo_at', ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v").bind(nowIso()).run();
    // 시험 데이터를 넣기 전에 저장한 주간·월간 순위는 비교 기준으로 맞지 않아 지워요
    await db.prepare("DELETE FROM kv WHERE k LIKE 'snapw:%' OR k LIKE 'snapm:%'").run();
    clearCache();
    return json({ ok: true, users: users.length, bowls: rows.length });
  }
  if (action === 'clear' && m === 'POST') {
    const ids = "(SELECT id FROM users WHERE demo = 1)";
    await db.batch([
      db.prepare(`DELETE FROM bowl_helpful WHERE user_id IN ${ids} OR bowl_id IN (SELECT id FROM bowls WHERE demo = 1)`),
      db.prepare('DELETE FROM bowls WHERE demo = 1'),
      db.prepare(`DELETE FROM marks WHERE user_id IN ${ids}`),
      db.prepare(`DELETE FROM points WHERE user_id IN ${ids}`),
      db.prepare(`DELETE FROM user_badges WHERE user_id IN ${ids}`),
      db.prepare(`DELETE FROM notes WHERE user_id IN ${ids}`),
      db.prepare(`DELETE FROM sessions WHERE user_id IN ${ids}`),
      db.prepare('DELETE FROM users WHERE demo = 1'),
      // 시험 데이터로 만든 랭킹 기록도 지워요
      db.prepare("DELETE FROM kv WHERE k LIKE 'snapw:%' OR k LIKE 'snapm:%' OR k = 'demo_at'"),
    ]);
    clearCache();
    return json({ ok: true });
  }
  return fail('없는 주소예요.', 404);
}
