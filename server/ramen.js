// 라면 참여 기능: 한 그릇 기록, 먹어 봤어요·먹고 싶어요·저장, 라면 랭킹, 라면 월드컵, 출석, 프로필, 알림, 내 성장
import { json, fail, readBody, clip, oneLine, nowIso, kstDay, assetJSON, tooMany, logAction, ipHashOf } from './util.js';
import { grow, revoke, addStars, checkin, levelInfo, BADGE_BY, note } from './growth.js';
import { BADGES } from './growth-data.js';
import { AXES, AGAIN, COOKS, WATERS, PLACES, ADDS, TAGS, GROUPS, inGroup, RANK_RULE } from './catalog-data.js';
export { RANK_RULE };

const MARK_KINDS = ['saved', 'tried', 'want'];
const PER = 10;
const AX = AXES.map((a) => a.k);
const AXCOLS = AX.map((k) => `a_${k}`);

export const userCols = "u.nick AS nick, u.xp AS xp, u.badge AS fb, CASE WHEN u.status = 'deleted' THEN 1 ELSE 0 END AS gone, CASE WHEN u.status = 'system' THEN 1 ELSE 0 END AS sys";

async function catalog(env, request) {
  const d = await assetJSON(env, request, '/data/ramen.json');
  return d ? Object.fromEntries(d.ramen.map((r) => [r.s, r])) : null;
}

export function mergeGains(list) {
  const g = list.filter(Boolean);
  if (!g.length) return null;
  return { pts: g.reduce((a, x) => a + (x.pts || 0), 0), label: g.filter((x) => x.pts).map((x) => x.label).join(', '), up: g.map((x) => x.up).filter(Boolean).pop() || null, badges: g.flatMap((x) => x.badges || []) };
}

// 랭킹과 카드 숫자는 1분 동안 같은 값을 써요. 기록이 바뀌면 바로 비워요.
const cache = new Map();
const cached = async (key, ms, fn) => {
  const c = cache.get(key);
  if (c && Date.now() - c.at < ms) return c.v;
  const v = await fn();
  cache.set(key, { at: Date.now(), v });
  return v;
};
export const clearCache = () => cache.clear();

// ---------- 모든 라면의 숫자 (카드, 비교, 맛 지도에 써요) ----------
async function allStats(env) {
  return cached('stats', 60e3, async () => {
    const sums = AXCOLS.map((c) => `SUM(CASE WHEN ${c} > 0 THEN ${c} END) AS s_${c}, COUNT(CASE WHEN ${c} > 0 THEN 1 END) AS n_${c}`).join(', ');
    const [r, m, d] = await env.DB.batch([
      env.DB.prepare(`SELECT slug, COUNT(*) AS n, AVG(rating) AS a, COUNT(CASE WHEN again = 'yes' THEN 1 END) AS y, COUNT(CASE WHEN again != '' THEN 1 END) AS yn, ${sums} FROM bowls WHERE hidden = 0 GROUP BY slug`),
      env.DB.prepare("SELECT slug, kind, COUNT(*) AS n FROM marks WHERE kind IN ('tried', 'want') GROUP BY slug, kind"),
      env.DB.prepare('SELECT COUNT(*) AS n FROM bowls WHERE demo = 1'),
    ]);
    const out = {};
    for (const x of r.results) {
      const axes = AXCOLS.map((c) => (x[`n_${c}`] ? Math.round((x[`s_${c}`] / x[`n_${c}`]) * 10) / 10 : null));
      const an = AXCOLS.map((c) => x[`n_${c}`] || 0);
      out[x.slug] = { n: x.n, a: Math.round((x.a / 2) * 10) / 10, y: x.yn ? Math.round((x.y / x.yn) * 100) : null, yn: x.yn, x: axes, xn: an, t: 0, w: 0 };
    }
    for (const x of m.results) {
      const o = (out[x.slug] = out[x.slug] || { n: 0, a: 0, y: null, yn: 0, x: AX.map(() => null), xn: AX.map(() => 0), t: 0, w: 0 });
      if (x.kind === 'tried') o.t = x.n; else o.w = x.n;
    }
    return { stats: out, demo: d.results[0].n > 0 };
  });
}

// ---------- 랭킹 ----------
// 기록 하나의 무게: 가입 7일 안 0.5 × 확인 방법(사진 1.1, 바코드 1.2) × 12개월이 지난 기록 0.7
const weightSql = (since) => `(CASE WHEN julianday(b.created_at) - julianday(u.created_at) < 7 THEN 0.5 ELSE 1.0 END) * (CASE b.verified WHEN 'photo' THEN 1.1 WHEN 'barcode' THEN 1.2 ELSE 1.0 END) * (CASE WHEN b.updated_at >= '${since}' THEN 1.0 ELSE 0.7 END)`;
const yearAgo = () => new Date(Date.now() - 365 * 86400e3).toISOString();

async function aggregate(env, { mania = false } = {}) {
  const since = yearAgo();
  const w = weightSql(since);
  const maniaWhere = mania ? `AND b.user_id IN (SELECT user_id FROM bowls WHERE hidden = 0 AND gifted = 0 GROUP BY user_id HAVING COUNT(*) >= ${RANK_RULE.maniaBowls})` : '';
  const axisSums = AXCOLS.map((c) => `SUM(CASE WHEN b.${c} > 0 THEN b.${c} END) AS s_${c}, COUNT(CASE WHEN b.${c} > 0 THEN 1 END) AS n_${c}`).join(', ');
  const { results } = await env.DB.prepare(`SELECT b.slug, COUNT(*) AS n, SUM(${w}) AS w, SUM(${w} * b.rating) AS wr,
      COUNT(CASE WHEN b.again = 'yes' THEN 1 END) AS y, COUNT(CASE WHEN b.again != '' THEN 1 END) AS yn, ${axisSums}
    FROM bowls b JOIN users u ON u.id = b.user_id WHERE b.hidden = 0 AND b.gifted = 0 AND u.status IN ('ok', 'deleted') ${maniaWhere} GROUP BY b.slug`).all();
  return results;
}

function bayes(rows, m, minN) {
  const W = rows.reduce((a, r) => a + r.w, 0);
  const C = W ? rows.reduce((a, r) => a + r.wr, 0) / W : 0;
  const list = rows.map((r) => {
    const R = r.w ? r.wr / r.w : 0;
    const S = (r.w / (r.w + m)) * R + (m / (r.w + m)) * C;
    return { s: r.slug, n: r.n, avg: Math.round((R / 2) * 100) / 100, score: Math.round((S / 2) * 100) / 100 };
  });
  const ranked = list.filter((x) => x.n >= minN).sort((a, b) => b.score - a.score || b.n - a.n);
  const pending = list.filter((x) => x.n < minN).sort((a, b) => b.n - a.n).slice(0, 12);
  return { ranked, pending, C: Math.round((C / 2) * 100) / 100 };
}

// 출시 연월: '2026-01' 또는 '2026' (연도만 있으면 1월로 쳐요)
const releaseOf = (y) => {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(String(y || ''));
  return m ? Date.UTC(Number(m[1]), m[2] ? Number(m[2]) - 1 : 0, 1) : 0;
};
const mondayOf = (offsetWeeks = 0) => {
  const d = new Date(Date.now() + 9 * 3600e3);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow - offsetWeeks * 7);
  return d.toISOString().slice(0, 10);
};
const monthKey = (offset = 0) => {
  const d = new Date(Date.now() + 9 * 3600e3);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - offset);
  return d.toISOString().slice(0, 7);
};
async function kvGet(env, k) {
  const r = await env.DB.prepare('SELECT v FROM kv WHERE k = ?').bind(k).first();
  if (!r) return null;
  try { return JSON.parse(r.v); } catch (e) { return null; }
}
const kvSet = (env, k, v) => env.DB.prepare('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v').bind(k, JSON.stringify(v)).run();

// 종합 랭킹 기록: 주가 바뀌고 처음 계산할 때 그 주의 시작 순위를, 달마다 마지막 순위를 남겨요
async function snapshot(env, ranked) {
  const top = ranked.slice(0, 50).map((x) => [x.s, x.score, x.n]);
  const wk = `snapw:${mondayOf(0)}`;
  const have = await env.DB.prepare('SELECT 1 FROM kv WHERE k = ?').bind(wk).first();
  if (!have) await env.DB.prepare('INSERT OR IGNORE INTO kv (k, v) VALUES (?, ?)').bind(wk, JSON.stringify({ at: nowIso(), top })).run();
  await kvSet(env, `snapm:${monthKey(0)}`, { at: nowIso(), top });
}

export async function computeRank(env, request, type, sub) {
  return cached(`rank:${type}:${sub || ''}`, 60e3, async () => {
    const cat = await catalog(env, request) || {};
    const R = RANK_RULE;
    if (type === 'total' || type === 'group') {
      const g = type === 'group' ? GROUPS.find((x) => x.id === sub) : null;
      if (type === 'group' && !g) return null;
      const rows = (await aggregate(env)).filter((r) => cat[r.slug] && (!g || inGroup(cat[r.slug], g)));
      const out = bayes(rows, R.m, R.minN);
      if (type === 'total') {
        await snapshot(env, out.ranked);
        // 이번 주가 시작될 때의 순위와 비교해요
        const wk = await kvGet(env, `snapw:${mondayOf(0)}`);
        const before = wk ? Object.fromEntries(wk.top.map((t, i) => [t[0], i + 1])) : {};
        out.ranked.forEach((x) => { x.prev = before[x.s] || null; });
        out.weekOf = mondayOf(0);
      }
      return { type, sub: sub || '', ...out };
    }
    if (type === 'new') {
      const from = new Date(Date.now() + 9 * 3600e3);
      from.setUTCMonth(from.getUTCMonth() - R.newMonths);
      const rows = (await aggregate(env)).filter((r) => cat[r.slug] && releaseOf(cat[r.slug].y) >= Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
      return { type, ...bayes(rows, R.m, R.newMinN) };
    }
    if (type === 'mania') {
      const rows = (await aggregate(env, { mania: true })).filter((r) => cat[r.slug]);
      return { type, ...bayes(rows, R.maniaM, R.maniaMinN) };
    }
    if (type === 'again') {
      const rows = (await aggregate(env)).filter((r) => cat[r.slug]);
      const list = rows.map((r) => ({ s: r.slug, n: r.yn, pct: r.yn ? Math.round((r.y / r.yn) * 1000) / 10 : 0 }));
      return { type, ranked: list.filter((x) => x.n >= R.againMinN).sort((a, b) => b.pct - a.pct || b.n - a.n), pending: list.filter((x) => x.n < R.againMinN && x.n > 0).sort((a, b) => b.n - a.n).slice(0, 12) };
    }
    if (type === 'axis') {
      const i = AX.indexOf(sub);
      if (i < 0) return null;
      const c = AXCOLS[i];
      const rows = (await aggregate(env)).filter((r) => cat[r.slug]);
      const list = rows.map((r) => ({ s: r.slug, n: r[`n_${c}`] || 0, v: r[`n_${c}`] ? Math.round((r[`s_${c}`] / r[`n_${c}`]) * 100) / 100 : 0 }));
      return { type, sub, ranked: list.filter((x) => x.n >= R.axisMinN).sort((a, b) => b.v - a.v || b.n - a.n), pending: list.filter((x) => x.n < R.axisMinN && x.n > 0).sort((a, b) => b.n - a.n).slice(0, 12) };
    }
    if (type === 'rising') {
      const d = R.risingDays;
      const t1 = new Date(Date.now() - d * 86400e3).toISOString(), t2 = new Date(Date.now() - 2 * d * 86400e3).toISOString();
      const { results } = await env.DB.prepare(`SELECT slug, COUNT(CASE WHEN updated_at >= ?1 THEN 1 END) AS a, COUNT(CASE WHEN updated_at >= ?2 AND updated_at < ?1 THEN 1 END) AS b FROM bowls WHERE hidden = 0 AND gifted = 0 AND updated_at >= ?2 GROUP BY slug`).bind(t1, t2).all();
      const list = results.filter((r) => cat[r.slug]).map((r) => ({ s: r.slug, n: r.a, before: r.b, ratio: Math.round((r.a / Math.max(r.b, R.risingFloor)) * 100) / 100 }));
      return { type, ranked: list.filter((x) => x.n >= R.risingMinRecent).sort((a, b) => b.ratio - a.ratio || b.n - a.n), pending: list.filter((x) => x.n < R.risingMinRecent && x.n > 0).sort((a, b) => b.n - a.n).slice(0, 12) };
    }
    return null;
  });
}

async function rankRoute(env, request, url) {
  const type = url.searchParams.get('type') || 'total';
  const sub = url.searchParams.get('sub') || '';
  const r = await computeRank(env, request, type, sub);
  if (!r) return fail('없는 랭킹이에요.', 404);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 100);
  const { demo } = await allStats(env);
  return json({ ok: true, rule: RANK_RULE, demo, ...r, ranked: r.ranked.slice(0, limit) }, 200, { 'cache-control': 'public, max-age=60' });
}

// 지난달 마지막 종합 순위 (라면몰 진열대). 없으면 지금 순위.
async function monthlyTop(env, request) {
  const last = await kvGet(env, `snapm:${monthKey(1)}`);
  if (last && last.top.length) return { month: monthKey(1), list: last.top.slice(0, 10).map((t) => t[0]), live: false };
  const r = await computeRank(env, request, 'total', '');
  return { month: monthKey(0), list: r.ranked.slice(0, 10).map((x) => x.s), live: true };
}

// ---------- 라면 하나 ----------
async function ramenOne(env, request, slug, me, url) {
  const db = env.DB;
  const sort = url.searchParams.get('sort') === 'new' ? 'b.updated_at DESC' : 'b.helpful DESC, b.updated_at DESC';
  const page = Math.min(Math.max(Number(url.searchParams.get('page')) || 1, 1), 200);
  const sums = AXCOLS.map((c) => `SUM(CASE WHEN ${c} > 0 THEN ${c} END) AS s_${c}, COUNT(CASE WHEN ${c} > 0 THEN 1 END) AS n_${c}`).join(', ');
  const [dist, agg, extra, marks, list, cnt, posts] = await db.batch([
    db.prepare('SELECT (rating + 1) / 2 AS star, COUNT(*) AS n FROM bowls WHERE slug = ? AND hidden = 0 GROUP BY star').bind(slug),
    db.prepare(`SELECT COUNT(*) AS n, AVG(rating) AS a, COUNT(CASE WHEN again = 'yes' THEN 1 END) AS yes, COUNT(CASE WHEN again = 'maybe' THEN 1 END) AS maybe, COUNT(CASE WHEN again = 'no' THEN 1 END) AS no, SUM(times) AS times, ${sums} FROM bowls WHERE slug = ? AND hidden = 0`).bind(slug),
    db.prepare('SELECT tags, cook, water, adds, place FROM bowls WHERE slug = ? AND hidden = 0 ORDER BY id DESC LIMIT 3000').bind(slug),
    db.prepare('SELECT kind, COUNT(*) AS n FROM marks WHERE slug = ? GROUP BY kind').bind(slug),
    db.prepare(`SELECT b.id, b.rating, b.again, ${AXCOLS.map((c) => 'b.' + c).join(', ')}, b.tags, b.cook, b.water, b.adds, b.place, b.body, b.helpful, b.times, b.demo, b.gifted, b.created_at, b.updated_at, b.user_id, ${userCols} FROM bowls b JOIN users u ON u.id = b.user_id WHERE b.slug = ? AND b.hidden = 0 ORDER BY ${sort} LIMIT ? OFFSET ?`).bind(slug, PER, (page - 1) * PER),
    db.prepare('SELECT COUNT(*) AS n FROM bowls WHERE slug = ? AND hidden = 0').bind(slug),
    db.prepare(`SELECT p.id, p.cat, p.title, p.created_at, p.comments, p.likes, ${userCols} FROM posts p JOIN users u ON u.id = p.user_id WHERE p.game = ? AND p.hidden = 0 ORDER BY p.id DESC LIMIT 5`).bind(slug),
  ]);
  const a = agg.results[0] || {};
  const d = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const x of dist.results) if (d[x.star] !== undefined) d[x.star] = x.n;
  const count = (field, multi) => {
    const o = {};
    for (const r of extra.results) {
      const vals = multi ? String(r[field] || '').split(',') : [r[field]];
      for (const v of vals) if (v) o[v] = (o[v] || 0) + 1;
    }
    return Object.entries(o).sort((x, y) => y[1] - x[1]);
  };
  const counts = { saved: 0, tried: 0, want: 0 };
  for (const x of marks.results) counts[x.kind] = x.n;
  // 종합 순위
  const total = await computeRank(env, request, 'total', '');
  const pos = total.ranked.findIndex((x) => x.s === slug);
  let my = null, helped = new Set();
  if (me) {
    const [mm, mb, mh] = await db.batch([
      db.prepare('SELECT kind FROM marks WHERE user_id = ? AND slug = ?').bind(me.id, slug),
      db.prepare(`SELECT id, rating, again, ${AXCOLS.join(', ')}, tags, cook, water, adds, place, body, gifted, times, updated_at FROM bowls WHERE user_id = ? AND slug = ?`).bind(me.id, slug),
      db.prepare('SELECT h.bowl_id FROM bowl_helpful h JOIN bowls b ON b.id = h.bowl_id WHERE h.user_id = ? AND b.slug = ?').bind(me.id, slug),
    ]);
    my = { marks: mm.results.map((x) => x.kind), bowl: mb.results[0] || null };
    helped = new Set(mh.results.map((x) => x.bowl_id));
  }
  const bowls = list.results.map((b) => ({
    id: b.id, rating: b.rating, again: b.again, x: AXCOLS.map((c) => b[c]), tags: b.tags, cook: b.cook, water: b.water, adds: b.adds, place: b.place, body: b.body,
    helpful: b.helpful, times: b.times, demo: b.demo, gifted: b.gifted, created_at: b.created_at, updated_at: b.updated_at, nick: b.nick, xp: b.xp, fb: b.fb, gone: b.gone,
    mine: !!me && me.id === b.user_id, helped: helped.has(b.id),
  }));
  return json({
    ok: true,
    summary: {
      n: a.n || 0, avg: a.n ? Math.round((a.a / 2) * 10) / 10 : 0, dist: d, times: a.times || 0,
      again: { yes: a.yes || 0, maybe: a.maybe || 0, no: a.no || 0 },
      axes: AXCOLS.map((c) => ({ v: a[`n_${c}`] ? Math.round((a[`s_${c}`] / a[`n_${c}`]) * 10) / 10 : null, n: a[`n_${c}`] || 0 })),
      tags: count('tags', true).slice(0, 8), cook: count('cook'), water: count('water'), adds: count('adds', true).slice(0, 8), place: count('place'),
      rank: pos >= 0 ? { pos: pos + 1, score: total.ranked[pos].score, of: total.ranked.length } : null,
      need: RANK_RULE.minN,
    },
    counts, my, bowls, page, per: PER, total: cnt.results[0].n, posts: posts.results,
  });
}

async function mark(env, request, slug, me) {
  const b = await readBody(request, 300);
  if (!b || !MARK_KINDS.includes(b.kind)) return fail('무엇을 표시할지 알 수 없어요.');
  const db = env.DB;
  let gain = null;
  if (b.on) {
    const r = await db.prepare('INSERT OR IGNORE INTO marks (user_id, slug, kind, created_at) VALUES (?, ?, ?, ?)').bind(me.id, slug, b.kind, nowIso()).run();
    if (r.meta.changes && b.kind === 'tried') gain = await grow(env, request, me.id, 'tried', slug, []);
    if (b.kind === 'tried') await db.prepare("DELETE FROM marks WHERE user_id = ? AND slug = ? AND kind = 'want'").bind(me.id, slug).run();
  } else {
    await db.prepare('DELETE FROM marks WHERE user_id = ? AND slug = ? AND kind = ?').bind(me.id, slug, b.kind).run();
  }
  clearCache();
  const { results } = await db.prepare('SELECT kind, COUNT(*) AS n FROM marks WHERE slug = ? GROUP BY kind').bind(slug).all();
  const counts = { saved: 0, tried: 0, want: 0 };
  for (const x of results) counts[x.kind] = x.n;
  const mine = (await db.prepare('SELECT kind FROM marks WHERE user_id = ? AND slug = ?').bind(me.id, slug).all()).results.map((x) => x.kind);
  return json({ ok: true, counts, mine, gain });
}

// 로그인할 때 이 기기에 저장해 둔 라면을 계정으로 옮겨요
async function syncSaved(env, request, me) {
  const cat = await catalog(env, request) || {};
  const b = await readBody(request, 4000);
  const list = (b && Array.isArray(b.slugs) ? b.slugs : []).filter((s) => cat[s]).slice(0, 100);
  if (list.length) {
    await env.DB.batch(list.map((s) => env.DB.prepare("INSERT OR IGNORE INTO marks (user_id, slug, kind, created_at) VALUES (?, ?, 'saved', ?)").bind(me.id, s, nowIso())));
  }
  const { results } = await env.DB.prepare('SELECT slug, kind FROM marks WHERE user_id = ? ORDER BY created_at DESC').bind(me.id).all();
  return json({ ok: true, marks: results });
}

const pick = (v, obj) => (Object.prototype.hasOwnProperty.call(obj, v) ? v : '');
const pickList = (v, list, max) => [...new Set((Array.isArray(v) ? v : String(v || '').split(',')).map((x) => String(x).trim()).filter((x) => list.includes(x)))].slice(0, max).join(',');

// 한 그릇 기록 남기기·고치기
async function saveBowl(env, request, slug, me) {
  const b = await readBody(request, 8000);
  if (!b) return fail('보낸 내용을 읽지 못했어요.');
  if (b.website) return json({ ok: true });
  const rating = Math.round(Number(b.rating));
  if (!(rating >= 1 && rating <= 10)) return fail('별점을 반 개부터 다섯 개 사이로 골라 주세요.');
  const axes = AX.map((k) => { const v = Math.round(Number((b.x || {})[k])); return v >= 1 && v <= 5 ? v : 0; });
  const again = pick(b.again, AGAIN);
  const tags = pickList(b.tags, TAGS, 6);
  const adds = pickList(b.adds, ADDS, 8);
  const cook = pick(b.cook, COOKS), water = pick(b.water, WATERS), place = pick(b.place, PLACES);
  const body = clip(b.body, 1000);
  const gifted = b.gifted ? 1 : 0;
  if ((body.match(/https?:\/\//g) || []).length > 1) return fail('기록에는 링크를 하나까지만 넣을 수 있어요.');
  const db = env.DB;
  if (await tooMany(db, 'm:' + me.id, 'bowl', 30, 10)) return fail('짧은 시간에 기록을 너무 많이 남겼어요. 잠시 뒤에 다시 해 주세요.', 429);
  await logAction(db, 'm:' + me.id, 'bowl');
  const old = await db.prepare('SELECT id, times FROM bowls WHERE user_id = ? AND slug = ?').bind(me.id, slug).first();
  const now = nowIso();
  if (old) {
    const times = Math.min((old.times || 1) + (b.again_ate ? 1 : 0), 999);
    await db.prepare(`UPDATE bowls SET rating = ?, again = ?, ${AXCOLS.map((c) => c + ' = ?').join(', ')}, tags = ?, cook = ?, water = ?, adds = ?, place = ?, body = ?, gifted = ?, times = ?, updated_at = ? WHERE id = ?`)
      .bind(rating, again, ...axes, tags, cook, water, adds, place, body, gifted, times, now, old.id).run();
  } else {
    await db.prepare(`INSERT INTO bowls (slug, user_id, rating, again, ${AXCOLS.join(', ')}, tags, cook, water, adds, place, body, gifted, created_at, updated_at) VALUES (?, ?, ?, ?, ${AXCOLS.map(() => '?').join(', ')}, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(slug, me.id, rating, again, ...axes, tags, cook, water, adds, place, body, gifted, now, now).run();
  }
  // 기록을 남기면 먹어 본 라면으로 쳐요
  const pm = await db.prepare("INSERT OR IGNORE INTO marks (user_id, slug, kind, created_at) VALUES (?, ?, 'tried', ?)").bind(me.id, slug, now).run();
  await db.prepare("DELETE FROM marks WHERE user_id = ? AND slug = ? AND kind = 'want'").bind(me.id, slug).run();
  const gains = [];
  gains.push(await grow(env, request, me.id, 'bowl', slug, []));
  if (axes.filter(Boolean).length >= 4) gains.push(await grow(env, request, me.id, 'taste', slug, []));
  if (body.length >= 20) gains.push(await grow(env, request, me.id, 'memo', slug, []));
  if (pm.meta.changes) gains.push(await grow(env, request, me.id, 'tried', slug, []));
  gains.push(await grow(env, request, me.id, null, null, ['bowl1', 'bowl10', 'bowl30', 'bowl50', 'maker4', 'style5', 'fire3', 'mild5', 'taste10']));
  clearCache();
  return json({ ok: true, edited: !!old, gain: mergeGains(gains) });
}

async function deleteBowl(env, slug, me) {
  const r = await env.DB.prepare('SELECT id FROM bowls WHERE user_id = ? AND slug = ?').bind(me.id, slug).first();
  if (!r) return fail('지울 기록이 없어요.', 404);
  await removeBowl(env, r.id);
  return json({ ok: true });
}
export async function removeBowl(env, id) {
  const db = env.DB;
  const r = await db.prepare('SELECT id, slug, user_id, helpful FROM bowls WHERE id = ?').bind(id).first();
  if (!r) return;
  await db.batch([
    db.prepare('DELETE FROM bowl_helpful WHERE bowl_id = ?').bind(id),
    db.prepare('DELETE FROM bowls WHERE id = ?').bind(id),
  ]);
  await addStars(env, r.user_id, -r.helpful);
  for (const act of ['bowl', 'taste', 'memo']) await revoke(env, r.user_id, act, r.slug);
  clearCache();
}

async function helpful(env, request, id, me) {
  const db = env.DB;
  const r = await db.prepare('SELECT id, user_id, hidden FROM bowls WHERE id = ?').bind(id).first();
  if (!r || r.hidden) return fail('없는 기록이에요.', 404);
  if (r.user_id === me.id) return fail('내 기록에는 누를 수 없어요.');
  const had = await db.prepare('SELECT 1 FROM bowl_helpful WHERE bowl_id = ? AND user_id = ?').bind(id, me.id).first();
  if (had) {
    await db.batch([db.prepare('DELETE FROM bowl_helpful WHERE bowl_id = ? AND user_id = ?').bind(id, me.id), db.prepare('UPDATE bowls SET helpful = helpful - 1 WHERE id = ?').bind(id)]);
    await addStars(env, r.user_id, -1);
  } else {
    await db.batch([db.prepare('INSERT INTO bowl_helpful (bowl_id, user_id) VALUES (?, ?)').bind(id, me.id), db.prepare('UPDATE bowls SET helpful = helpful + 1 WHERE id = ?').bind(id)]);
    await addStars(env, r.user_id, 1);
    await grow(env, request, r.user_id, 'helpful', `${id}:${me.id}`, ['star50']);
  }
  const row = await db.prepare('SELECT helpful FROM bowls WHERE id = ?').bind(id).first();
  return json({ ok: true, helped: !had, helpful: row.helpful });
}

// 사이트 전체의 새 기록 (후루룩클럽 ‘한 그릇 피드’)
async function feed(env, url) {
  const page = Math.min(Math.max(Number(url.searchParams.get('page')) || 1, 1), 200);
  const memo = url.searchParams.get('memo') === '1';
  const { results } = await env.DB.prepare(`SELECT b.id, b.slug, b.rating, b.again, b.tags, b.adds, substr(b.body, 1, 200) AS body, b.helpful, b.times, b.demo, b.updated_at, ${userCols} FROM bowls b JOIN users u ON u.id = b.user_id WHERE b.hidden = 0 ${memo ? "AND b.body != ''" : ''} ORDER BY b.updated_at DESC LIMIT ? OFFSET ?`).bind(20, (page - 1) * 20).all();
  return json({ ok: true, page, bowls: results });
}

// ---------- 처음 화면 요약 ----------
async function home(env, request) {
  const db = env.DB;
  const [total, { demo }] = await Promise.all([computeRank(env, request, 'total', ''), allStats(env)]);
  const [counts, recent] = await db.batch([
    db.prepare("SELECT (SELECT COUNT(*) FROM bowls WHERE hidden = 0) AS bowls, (SELECT COUNT(DISTINCT slug) FROM bowls WHERE hidden = 0) AS ramen, (SELECT COUNT(*) FROM users WHERE status = 'ok') AS users"),
    db.prepare(`SELECT b.id, b.slug, b.rating, b.again, substr(b.body, 1, 120) AS body, b.demo, b.updated_at, ${userCols} FROM bowls b JOIN users u ON u.id = b.user_id WHERE b.hidden = 0 ORDER BY b.updated_at DESC LIMIT 8`),
  ]);
  return json({ ok: true, demo, rule: RANK_RULE, weekOf: total.weekOf, rank: total.ranked.slice(0, 6), pending: total.pending.slice(0, 6), counts: counts.results[0], recent: recent.results });
}

// ---------- 라면 월드컵 ----------
async function worldcupGet(env) {
  const { results } = await env.DB.prepare('SELECT slug, wins, games, champs, finals FROM wc_stats WHERE games > 0 ORDER BY champs DESC, wins DESC LIMIT 60').all();
  const t = await env.DB.prepare('SELECT SUM(champs) AS n FROM wc_stats').first();
  return json({ ok: true, list: results, total: (t && t.n) || 0 });
}
async function worldcupPost(env, request, me) {
  const b = await readBody(request, 6000);
  if (!b) return fail('보낸 내용을 읽지 못했어요.');
  const cat = await catalog(env, request) || {};
  const matches = (Array.isArray(b.matches) ? b.matches : []).filter((m) => Array.isArray(m) && cat[m[0]] && cat[m[1]] && m[0] !== m[1]).slice(0, 63);
  const champ = String(b.champ || '');
  if (!cat[champ] || matches.length < 7) return fail('월드컵 결과를 읽지 못했어요.');
  const ipk = await ipHashOf(request);
  if (await tooMany(env.DB, ipk || 'm:' + (me ? me.id : 0), 'wc', 12, 60)) return json({ ok: true, saved: false });
  await logAction(env.DB, ipk || 'm:' + (me ? me.id : 0), 'wc');
  const up = (s, w, g, c, f) => env.DB.prepare('INSERT INTO wc_stats (slug, wins, games, champs, finals) VALUES (?, ?, ?, ?, ?) ON CONFLICT (slug) DO UPDATE SET wins = wins + excluded.wins, games = games + excluded.games, champs = champs + excluded.champs, finals = finals + excluded.finals').bind(s, w, g, c, f);
  const fin = matches[matches.length - 1];
  const stm = [];
  for (const [w, l] of matches) { stm.push(up(w, 1, 1, 0, 0)); stm.push(up(l, 0, 1, 0, 0)); }
  stm.push(up(champ, 0, 0, 1, 1));
  stm.push(up(fin[0] === champ ? fin[1] : fin[0], 0, 0, 0, 1));
  await env.DB.batch(stm);
  const gain = me ? await grow(env, request, me.id, 'worldcup', nowIso(), ['worldcup1']) : null;
  return json({ ok: true, saved: true, gain });
}

// ---------- 내 성장, 내 도감 ----------
async function myGrowth(env, me) {
  const db = env.DB;
  const [u, badges, recent, marks, bowls, np, nc] = await db.batch([
    db.prepare('SELECT xp, stars, badge, streak, checkins, last_checkin, manner_sum, manner_n, created_at, tie FROM users WHERE id = ?').bind(me.id),
    db.prepare('SELECT badge, created_at FROM user_badges WHERE user_id = ?').bind(me.id),
    db.prepare('SELECT act, pts, created_at FROM points WHERE user_id = ? ORDER BY id DESC LIMIT 12').bind(me.id),
    db.prepare('SELECT slug, kind, created_at FROM marks WHERE user_id = ? ORDER BY created_at DESC').bind(me.id),
    db.prepare(`SELECT slug, rating, again, ${AXCOLS.join(', ')}, tags, adds, body, times, helpful, created_at, updated_at FROM bowls WHERE user_id = ? ORDER BY updated_at DESC`).bind(me.id),
    db.prepare('SELECT COUNT(*) AS n FROM posts WHERE user_id = ?').bind(me.id),
    db.prepare("SELECT COUNT(*) AS n FROM points WHERE user_id = ? AND act = 'adopted'").bind(me.id),
  ]);
  const x = u.results[0];
  return json({
    ok: true,
    xp: x.xp, level: levelInfo(x.xp), stars: x.stars, badge: x.badge, tie: x.tie, streak: x.streak, checkins: x.checkins, created_at: x.created_at,
    checked: x.last_checkin === kstDay(), manner: x.manner_n >= 3 ? { avg: Math.round((x.manner_sum / x.manner_n) * 10) / 10, n: x.manner_n } : null,
    badges: badges.results, recent: recent.results, marks: marks.results,
    bowls: bowls.results.map((b) => ({ s: b.slug, r: b.rating, again: b.again, x: AXCOLS.map((c) => b[c]), tags: b.tags, adds: b.adds, body: b.body, times: b.times, helpful: b.helpful, at: b.updated_at, first: b.created_at })),
    counts: { posts: np.results[0].n, adopted: nc.results[0].n },
  });
}

// ---------- 공개 프로필 ----------
async function profile(env, nick) {
  const db = env.DB;
  const u = await db.prepare("SELECT id, nick, region, bio, tie, xp, stars, badge, manner_sum, manner_n, created_at, status FROM users WHERE nick = ? AND status IN ('ok', 'system')").bind(nick).first();
  if (!u) return fail('없는 회원이에요.', 404);
  const [badges, bowls, posts, rank] = await db.batch([
    db.prepare('SELECT badge, created_at FROM user_badges WHERE user_id = ? ORDER BY created_at').bind(u.id),
    db.prepare('SELECT slug, rating, again, substr(body, 1, 160) AS body, helpful, times, updated_at FROM bowls WHERE user_id = ? AND hidden = 0 ORDER BY updated_at DESC LIMIT 200').bind(u.id),
    db.prepare('SELECT id, cat, title, created_at, comments, likes FROM posts WHERE user_id = ? AND hidden = 0 ORDER BY id DESC LIMIT 6').bind(u.id),
    db.prepare("SELECT COUNT(*) + 1 AS r FROM users WHERE status = 'ok' AND xp > ?").bind(u.xp),
  ]);
  return json({
    ok: true,
    user: { nick: u.nick, region: u.region, bio: u.bio, tie: u.tie, xp: u.xp, level: levelInfo(u.xp), stars: u.stars, fb: u.badge, created_at: u.created_at, sys: u.status === 'system', rank: u.status === 'ok' ? rank.results[0].r : null, manner: u.manner_n >= 3 ? { avg: Math.round((u.manner_sum / u.manner_n) * 10) / 10, n: u.manner_n } : null },
    badges: badges.results, bowls: bowls.results, posts: posts.results,
  });
}

// ---------- 사람 랭킹 ----------
async function people(env) {
  const db = env.DB;
  const month = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7);
  const monthStart = new Date(`${month}-01T00:00:00+09:00`).toISOString();
  const [m, all, stars, eaters, sol] = await db.batch([
    db.prepare(`SELECT u.nick, u.xp, u.badge AS fb, SUM(p.pts) AS s FROM points p JOIN users u ON u.id = p.user_id WHERE p.created_at >= ? AND u.status = 'ok' GROUP BY p.user_id ORDER BY s DESC LIMIT 20`).bind(monthStart),
    db.prepare("SELECT nick, xp, badge AS fb, xp AS s FROM users WHERE status = 'ok' AND xp > 0 ORDER BY xp DESC LIMIT 20"),
    db.prepare("SELECT nick, xp, badge AS fb, stars AS s FROM users WHERE status = 'ok' AND stars > 0 ORDER BY stars DESC LIMIT 10"),
    db.prepare("SELECT u.nick, u.xp, u.badge AS fb, COUNT(*) AS s FROM bowls b JOIN users u ON u.id = b.user_id WHERE u.status = 'ok' AND b.hidden = 0 GROUP BY b.user_id ORDER BY s DESC LIMIT 10"),
    db.prepare("SELECT u.nick, u.xp, u.badge AS fb, COUNT(*) AS s FROM points p JOIN users u ON u.id = p.user_id WHERE p.act = 'adopted' AND u.status = 'ok' GROUP BY p.user_id ORDER BY s DESC LIMIT 10"),
  ]);
  return json({ ok: true, month, monthly: m.results, all: all.results, stars: stars.results, eaters: eaters.results, solvers: sol.results });
}

async function notes(env, me) {
  const { results } = await env.DB.prepare('SELECT id, kind, text, link, created_at, read FROM notes WHERE user_id = ? ORDER BY id DESC LIMIT 40').bind(me.id).all();
  return json({ ok: true, notes: results });
}

export async function ramenRoutes(request, env, route, parts, me) {
  const url = new URL(request.url);
  const m = request.method;
  const needMe = () => (me ? null : fail('로그인이 필요해요.', 401));
  if (route === 'home' && m === 'GET') return home(env, request);
  if (route === 'ramen') {
    if (parts[0] === 'stats' && m === 'GET') return json({ ok: true, ...(await allStats(env)) }, 200, { 'cache-control': 'public, max-age=60' });
    if (parts[0] === 'shelf' && m === 'GET') return json({ ok: true, ...(await monthlyTop(env, request)) }, 200, { 'cache-control': 'public, max-age=300' });
    const slug = parts[0];
    const cat = await catalog(env, request);
    if (!slug || !/^[a-z0-9-]{1,60}$/.test(slug) || (cat && !cat[slug])) return fail('없는 라면이에요.', 404);
    const sub = parts[1];
    if (!sub && m === 'GET') return ramenOne(env, request, slug, me, url);
    if (sub === 'mark' && m === 'POST') return needMe() || mark(env, request, slug, me);
    if (sub === 'bowl' && m === 'POST') return needMe() || saveBowl(env, request, slug, me);
    if (sub === 'bowl' && m === 'DELETE') return needMe() || deleteBowl(env, slug, me);
  }
  if (route === 'bowls') {
    if (!parts[0] && m === 'GET') return feed(env, url);
    if (/^\d+$/.test(parts[0] || '') && parts[1] === 'helpful' && m === 'POST') return needMe() || helpful(env, request, Number(parts[0]), me);
  }
  if (route === 'rank' && m === 'GET') return parts[0] === 'people' ? people(env) : rankRoute(env, request, url);
  if (route === 'worldcup') {
    if (m === 'GET') return worldcupGet(env);
    if (m === 'POST') return worldcupPost(env, request, me);
  }
  if (route === 'checkin' && m === 'POST') {
    if (!me) return needMe();
    return json(await checkin(env, request, me.id));
  }
  if (route === 'growth' && m === 'GET') return needMe() || myGrowth(env, me);
  if (route === 'sync' && m === 'POST') return needMe() || syncSaved(env, request, me);
  if (route === 'users' && parts[0] && m === 'GET') return profile(env, oneLine(decodeURIComponent(parts[0]), 20));
  if (route === 'notes') {
    if (!me) return needMe();
    if (m === 'GET') return notes(env, me);
    if (m === 'POST') {
      await env.DB.prepare('UPDATE notes SET read = 1 WHERE user_id = ? AND read = 0').bind(me.id).run();
      return json({ ok: true });
    }
  }
  return fail('없는 주소예요.', 404);
}

export { BADGES, BADGE_BY, note };
