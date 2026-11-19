// 레시피 자랑: 사진 올리기, 레시피 쓰기, 좋아요·저장·공유, ‘따라 해 봤어요’ 후기
// 사진은 Cloudflare R2(바인딩 이름 PHOTOS)가 연결돼 있으면 R2에, 없으면 D1에 저장해요.
import { json, fail, readBody, clip, oneLine, nowIso, tooMany, logAction, randomToken, assetJSON, ipHashOf } from './util.js';
import { grow, revoke, addStars, note } from './growth.js';
import { userCols } from './ramen.js';

const PER = 24;
const MAX_PHOTOS = 5;
const IMG_MAX = 1200 * 1024; // 큰 사진 한 장 (브라우저에서 줄여서 보내요)
const THUMB_MAX = 260 * 1024; // 목록용 작은 사진
const idOf = (s) => (/^\d{1,10}$/.test(String(s || '')) ? Number(s) : 0);
const IMG_ID = /^[A-Za-z0-9_-]{20,40}$/;
export const LEVELS = { easy: '누구나 쉽게', normal: '조금 손이 가요', hard: '도전 레시피' };

async function writeLimit(env, me, act, limit, minutes) {
  if (await tooMany(env.DB, 'm:' + me.id, act, limit, minutes)) return fail('짧은 시간에 너무 많이 올렸어요. 잠시 뒤에 다시 해 주세요.', 429);
  await logAction(env.DB, 'm:' + me.id, act);
  return null;
}

// ---------- 사진 ----------
function sniff(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return '';
}
// 사진 속 위치·기기 정보(EXIF, XMP)를 지워요. 브라우저에서 다시 그려 보내면 원래 없지만 한 번 더 확인해요.
function stripMeta(b, mime) {
  try {
    if (mime === 'image/jpeg') {
      const out = [b.subarray(0, 2)];
      let i = 2;
      while (i + 4 <= b.length) {
        if (b[i] !== 0xff) return b;
        const m = b[i + 1];
        if (m === 0xda) { out.push(b.subarray(i)); break; }
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { out.push(b.subarray(i, i + 2)); i += 2; continue; }
        const len = (b[i + 2] << 8) | b[i + 3];
        if (len < 2 || i + 2 + len > b.length) return b;
        if (m !== 0xe1 && m !== 0xed && m !== 0xfe) out.push(b.subarray(i, i + 2 + len));
        i += 2 + len;
      }
      const n = out.reduce((a, x) => a + x.length, 0);
      const r = new Uint8Array(n);
      let o = 0;
      for (const x of out) { r.set(x, o); o += x.length; }
      return r;
    }
    if (mime === 'image/webp') {
      const chunks = [];
      let i = 12;
      while (i + 8 <= b.length) {
        const tag = String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
        const size = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24);
        const end = i + 8 + size + (size & 1);
        if (size < 0 || end > b.length + 1) return b;
        if (tag !== 'EXIF' && tag !== 'XMP ') {
          const c = b.slice(i, Math.min(end, b.length));
          if (tag === 'VP8X' && c.length > 8) c[8] &= ~0x0c; // EXIF·XMP 표시 끄기
          chunks.push(c);
        }
        i = end;
      }
      const n = 12 + chunks.reduce((a, x) => a + x.length, 0);
      const r = new Uint8Array(n);
      r.set(b.subarray(0, 12), 0);
      const sz = n - 8;
      r[4] = sz & 255; r[5] = (sz >> 8) & 255; r[6] = (sz >> 16) & 255; r[7] = (sz >> 24) & 255;
      let o = 12;
      for (const x of chunks) { r.set(x, o); o += x.length; }
      return r;
    }
  } catch (e) { /* 그대로 둬요 */ }
  return b;
}
const toBytes = (v) => (v == null ? null : v instanceof ArrayBuffer ? new Uint8Array(v) : ArrayBuffer.isView(v) ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength) : Array.isArray(v) ? new Uint8Array(v) : null);

async function upload(env, request, me) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > IMG_MAX + THUMB_MAX + 20000) return fail('사진이 너무 커요. 다른 사진으로 다시 올려 주세요.', 413);
  const lim = await writeLimit(env, me, 'upload', 40, 60);
  if (lim) return lim;
  let form;
  try { form = await request.formData(); } catch (e) { return fail('사진을 읽지 못했어요.'); }
  const full = form.get('full'), thumb = form.get('thumb');
  if (!full || typeof full === 'string' || !thumb || typeof thumb === 'string') return fail('사진을 골라 주세요.');
  if (full.size > IMG_MAX || thumb.size > THUMB_MAX) return fail('사진이 너무 커요. 다른 사진으로 다시 올려 주세요.', 413);
  let a = new Uint8Array(await full.arrayBuffer()), t = new Uint8Array(await thumb.arrayBuffer());
  const mime = sniff(a), tmime = sniff(t);
  if (!mime || !tmime) return fail('JPG나 WEBP 사진만 올릴 수 있어요.');
  a = stripMeta(a, mime); t = stripMeta(t, tmime);
  const w = Math.min(Math.max(Math.round(Number(form.get('w')) || 0), 0), 6000);
  const h = Math.min(Math.max(Math.round(Number(form.get('h')) || 0), 0), 6000);
  const own = await env.DB.prepare('SELECT COUNT(*) AS n FROM images WHERE user_id = ?').bind(me.id).first();
  if (own && own.n >= 400) return fail('한 사람이 올릴 수 있는 사진(400장)을 다 썼어요. 지운 레시피의 사진은 자동으로 정리돼요.');
  const id = randomToken(18);
  if (env.PHOTOS) {
    await env.PHOTOS.put(`img/${id}`, a, { httpMetadata: { contentType: mime } });
    await env.PHOTOS.put(`img/${id}_s`, t, { httpMetadata: { contentType: tmime } });
    await env.DB.prepare("INSERT INTO images (id, user_id, mime, tmime, w, h, bytes, store, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'r2', ?)").bind(id, me.id, mime, tmime, w, h, a.length + t.length, nowIso()).run();
  } else {
    await env.DB.prepare("INSERT INTO images (id, user_id, mime, tmime, w, h, bytes, store, data, thumb, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'd1', ?, ?, ?)").bind(id, me.id, mime, tmime, w, h, a.length + t.length, a, t, nowIso()).run();
  }
  if (Math.random() < 0.05) await sweepImages(env);
  return json({ ok: true, id, w, h });
}

// 올렸지만 레시피에 쓰지 않은 사진은 하루 뒤 지워요
async function sweepImages(env) {
  const since = new Date(Date.now() - 86400e3).toISOString();
  const { results } = await env.DB.prepare("SELECT id, store FROM images WHERE ref = '' AND created_at < ? LIMIT 50").bind(since).all();
  await dropImages(env, results);
}
async function dropImages(env, rows) {
  if (!rows || !rows.length) return;
  const r2 = rows.filter((r) => r.store === 'r2');
  if (r2.length && env.PHOTOS) {
    try { await env.PHOTOS.delete(r2.flatMap((r) => [`img/${r.id}`, `img/${r.id}_s`])); } catch (e) { /* 넘어가요 */ }
  }
  await env.DB.batch(rows.map((r) => env.DB.prepare('DELETE FROM images WHERE id = ?').bind(r.id)));
  try {
    const cache = caches.default;
    await Promise.all(rows.flatMap((r) => [cache.delete(`https://img.local/${r.id}`), cache.delete(`https://img.local/${r.id}_s`)]));
  } catch (e) { /* 넘어가요 */ }
}
async function dropImagesByRef(env, refs) {
  if (!refs.length) return;
  const { results } = await env.DB.prepare(`SELECT id, store FROM images WHERE ref IN (${refs.map(() => '?').join(',')})`).bind(...refs).all();
  await dropImages(env, results);
}
export async function setImagesHidden(env, target, id, hidden) {
  const db = env.DB;
  if (target === 'recipe') {
    await db.prepare("UPDATE images SET hidden = ? WHERE ref = ?").bind(hidden ? 1 : 0, `r:${id}`).run();
  } else if (target === 'rreview') {
    await db.prepare("UPDATE images SET hidden = ? WHERE ref = ?").bind(hidden ? 1 : 0, `v:${id}`).run();
  } else return;
  try {
    const { results } = await db.prepare('SELECT id FROM images WHERE ref = ?').bind(target === 'recipe' ? `r:${id}` : `v:${id}`).all();
    const cache = caches.default;
    await Promise.all(results.flatMap((r) => [cache.delete(`https://img.local/${r.id}`), cache.delete(`https://img.local/${r.id}_s`)]));
  } catch (e) { /* 넘어가요 */ }
}

// GET /api/img/{id} (큰 사진), /api/img/{id}/s (작은 사진)
export async function serveImage(env, id, small) {
  if (!IMG_ID.test(id)) return new Response('', { status: 404 });
  const key = `https://img.local/${id}${small ? '_s' : ''}`;
  let cache = null;
  try { cache = caches.default; const hit = await cache.match(key); if (hit) return hit; } catch (e) { cache = null; }
  const row = await env.DB.prepare(`SELECT mime, tmime, store, hidden, ref${small ? ', thumb AS b' : ', data AS b'} FROM images WHERE id = ?`).bind(id).first();
  if (!row || row.hidden || !row.ref) return new Response('', { status: 404, headers: { 'cache-control': 'no-store' } });
  let body = null;
  if (row.store === 'r2') {
    if (!env.PHOTOS) return new Response('', { status: 404 });
    const obj = await env.PHOTOS.get(`img/${id}${small ? '_s' : ''}`);
    if (!obj) return new Response('', { status: 404 });
    body = new Uint8Array(await obj.arrayBuffer());
  } else body = toBytes(row.b);
  if (!body) return new Response('', { status: 404 });
  const res = new Response(body, { headers: { 'content-type': small ? row.tmime : row.mime, 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'" } });
  if (cache) { try { await cache.put(key, res.clone()); } catch (e) { /* 넘어가요 */ } }
  return res;
}

// ---------- 레시피 ----------
const LIST_COLS = `r.id, r.title, substr(r.intro, 1, 90) AS intro, r.ramen, r.photos, r.mins, r.level, r.likes, r.saves, r.comments, r.reviews, r.rsum, r.created_at, ${userCols}`;
function cover(photos) { return String(photos || '').split(',').filter(Boolean)[0] || ''; }
function shape(r) {
  const out = { ...r, cover: cover(r.photos), ramen: r.ramen ? r.ramen.split(',') : [] };
  delete out.photos;
  return out;
}
async function knownSlugs(env, request) {
  const d = await assetJSON(env, request, '/data/ramen.json');
  return d ? new Set(d.ramen.map((g) => g.s)) : null;
}

async function listRecipes(env, request, url, me) {
  const page = Math.min(Math.max(Number(url.searchParams.get('page')) || 1, 1), 300);
  const per = Math.min(Math.max(Number(url.searchParams.get('per')) || PER, 1), PER);
  const sort = url.searchParams.get('sort') || 'new';
  const ramen = url.searchParams.get('ramen') || '';
  const q = oneLine(url.searchParams.get('q'), 30);
  const where = ['r.hidden = 0'];
  const args = [];
  if (/^[a-z0-9-]{1,40}$/.test(ramen)) { where.push("(',' || r.ramen || ',') LIKE ?"); args.push(`%,${ramen},%`); }
  if (q) { where.push('(r.title LIKE ? OR r.intro LIKE ? OR r.items LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const nick = oneLine(url.searchParams.get('user'), 20);
  if (nick) { where.push('u.nick = ?'); args.push(nick); }
  if (url.searchParams.get('mine') === '1') {
    if (!me) return fail('로그인이 필요해요.', 401);
    where[0] = '(r.hidden = 0 OR r.user_id = ?)'; args.unshift(me.id);
    where.push('r.user_id = ?'); args.push(me.id);
  }
  if (url.searchParams.get('saved') === '1') {
    if (!me) return fail('로그인이 필요해요.', 401);
    where.push('r.id IN (SELECT recipe_id FROM recipe_saves WHERE user_id = ?)'); args.push(me.id);
  }
  const ORDER = {
    new: 'r.id DESC',
    hot: "(r.likes * 3 + r.saves * 2 + r.reviews * 4 + r.comments + 1) / ((julianday('now') - julianday(r.created_at)) + 2) DESC, r.id DESC",
    likes: 'r.likes DESC, r.id DESC',
    reviews: 'r.reviews DESC, r.likes DESC, r.id DESC',
  };
  const w = where.join(' AND ');
  const [rows, cnt] = await env.DB.batch([
    env.DB.prepare(`SELECT ${LIST_COLS}, r.hidden FROM recipes r JOIN users u ON u.id = r.user_id WHERE ${w} ORDER BY ${ORDER[sort] || ORDER.new} LIMIT ? OFFSET ?`).bind(...args, per, (page - 1) * per),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM recipes r JOIN users u ON u.id = r.user_id WHERE ${w}`).bind(...args),
  ]);
  return json({ ok: true, page, per, total: cnt.results[0].n, recipes: rows.results.map(shape) });
}

async function photoMeta(env, ids) {
  if (!ids.length) return [];
  const { results } = await env.DB.prepare(`SELECT id, w, h FROM images WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all();
  const by = Object.fromEntries(results.map((x) => [x.id, x]));
  return ids.map((i) => by[i]).filter(Boolean);
}
const parseList = (s) => { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };

async function getRecipe(env, id, me, listComments) {
  const db = env.DB;
  const r = await db.prepare(`SELECT r.*, ${userCols} FROM recipes r JOIN users u ON u.id = r.user_id WHERE r.id = ?`).bind(id).first();
  if (!r || (r.hidden && (!me || me.id !== r.user_id))) return fail('없거나 가려진 레시피예요.', 404);
  const mine = !!me && me.id === r.user_id;
  if (!mine) await db.prepare('UPDATE recipes SET views = views + 1 WHERE id = ?').bind(id).run();
  const [liked, saved, my, revs] = await db.batch([
    db.prepare('SELECT 1 AS x FROM recipe_likes WHERE recipe_id = ? AND user_id = ?').bind(id, me ? me.id : 0),
    db.prepare('SELECT 1 AS x FROM recipe_saves WHERE recipe_id = ? AND user_id = ?').bind(id, me ? me.id : 0),
    db.prepare('SELECT id, rating, body, photo, created_at, updated_at FROM recipe_reviews WHERE recipe_id = ? AND user_id = ?').bind(id, me ? me.id : 0),
    db.prepare(`SELECT v.id, v.rating, v.body, v.photo, v.hidden, v.created_at, v.updated_at, v.user_id, ${userCols} FROM recipe_reviews v JOIN users u ON u.id = v.user_id WHERE v.recipe_id = ? ORDER BY v.id DESC LIMIT 100`).bind(id),
  ]);
  const photos = await photoMeta(env, String(r.photos || '').split(',').filter(Boolean));
  const comments = await listComments(env, 'recipe', id, me, 0);
  const reviews = revs.results.filter((v) => !v.hidden || (me && me.id === v.user_id)).map((v) => ({ id: v.id, rating: v.rating, body: v.body, photo: v.hidden ? '' : v.photo, hidden: !!v.hidden, created_at: v.created_at, nick: v.nick, xp: v.xp, fb: v.fb, gone: v.gone, mine: !!me && me.id === v.user_id }));
  const out = {
    id: r.id, title: r.title, intro: r.intro, tip: r.tip, mins: r.mins, level: r.level, serves: r.serves,
    ramen: r.ramen ? r.ramen.split(',') : [], items: parseList(r.items), steps: parseList(r.steps), photos,
    views: r.views + (mine ? 0 : 1), likes: r.likes, saves: r.saves, shares: r.shares, comments: r.comments, reviews: r.reviews, rsum: r.rsum,
    created_at: r.created_at, updated_at: r.updated_at, hidden: !!r.hidden,
    nick: r.nick, xp: r.xp, fb: r.fb, gone: r.gone, sys: r.sys, mine, liked: !!liked.results.length, saved: !!saved.results.length,
  };
  return json({ ok: true, recipe: out, my: my.results[0] || null, reviews, comments });
}

function cleanLines(list, maxN, maxLen) {
  return (Array.isArray(list) ? list : []).map((x) => oneLine(x, maxLen)).filter(Boolean).slice(0, maxN);
}
async function claimPhotos(env, me, ids, ref, max) {
  const list = [...new Set((Array.isArray(ids) ? ids : []).map(String).filter((x) => IMG_ID.test(x)))].slice(0, max);
  if (!list.length) return { ok: true, list };
  const { results } = await env.DB.prepare(`SELECT id, user_id, ref FROM images WHERE id IN (${list.map(() => '?').join(',')})`).bind(...list).all();
  const by = Object.fromEntries(results.map((x) => [x.id, x]));
  const good = list.filter((i) => by[i] && by[i].user_id === me.id && (by[i].ref === '' || by[i].ref === ref));
  if (good.length !== list.length) return { ok: false, message: '올린 사진 가운데 쓸 수 없는 사진이 있어요. 사진을 다시 올려 주세요.' };
  return { ok: true, list };
}

async function saveRecipe(env, request, me, id) {
  const b = await readBody(request, 40000);
  if (!b) return fail('보낸 내용을 읽지 못했어요.');
  if (b.website) return json({ ok: true });
  const title = oneLine(b.title, 50);
  const intro = clip(b.intro, 600);
  const tip = clip(b.tip, 400);
  const items = cleanLines(b.items, 25, 50);
  const steps = (Array.isArray(b.steps) ? b.steps : []).map((x) => clip(x, 400)).filter(Boolean).slice(0, 15);
  const mins = Math.min(Math.max(Math.round(Number(b.mins) || 0), 0), 240);
  const level = LEVELS[b.level] ? b.level : '';
  const serves = Math.min(Math.max(Math.round(Number(b.serves) || 1), 1), 10);
  if (title.length < 2) return fail('레시피 이름을 2자 이상 적어 주세요.');
  if (!steps.length) return fail('만드는 순서를 한 단계 이상 적어 주세요.');
  if (((intro + tip + steps.join(' ')).match(/https?:\/\//g) || []).length > 2) return fail('링크는 두 개까지만 넣을 수 있어요.');
  const known = await knownSlugs(env, request);
  const ramen = [...new Set((Array.isArray(b.ramen) ? b.ramen : []).map(String).filter((s) => /^[a-z0-9-]{1,40}$/.test(s) && (!known || known.has(s))))].slice(0, 3).join(',');
  const db = env.DB;
  if (id) {
    const cur = await db.prepare('SELECT user_id, photos FROM recipes WHERE id = ?').bind(id).first();
    if (!cur || cur.user_id !== me.id) return fail('내가 올린 레시피만 고칠 수 있어요.', 403);
    const ph = await claimPhotos(env, me, b.photos, `r:${id}`, MAX_PHOTOS);
    if (!ph.ok) return fail(ph.message);
    const gone = String(cur.photos || '').split(',').filter((x) => x && !ph.list.includes(x));
    await db.prepare('UPDATE recipes SET title = ?, intro = ?, tip = ?, items = ?, steps = ?, mins = ?, level = ?, serves = ?, ramen = ?, photos = ?, updated_at = ? WHERE id = ?')
      .bind(title, intro, tip, JSON.stringify(items), JSON.stringify(steps), mins, level, serves, ramen, ph.list.join(','), nowIso(), id).run();
    if (ph.list.length) await db.batch(ph.list.map((p) => db.prepare('UPDATE images SET ref = ? WHERE id = ?').bind(`r:${id}`, p)));
    if (gone.length) {
      const { results } = await db.prepare(`SELECT id, store FROM images WHERE id IN (${gone.map(() => '?').join(',')}) AND ref = ?`).bind(...gone, `r:${id}`).all();
      await dropImages(env, results);
    }
    return json({ ok: true, id });
  }
  const ph = await claimPhotos(env, me, b.photos, '__new__', MAX_PHOTOS);
  if (!ph.ok) return fail(ph.message);
  const lim = await writeLimit(env, me, 'recipe', 5, 60);
  if (lim) return lim;
  const now = nowIso();
  const r = await db.prepare('INSERT INTO recipes (user_id, title, intro, tip, items, steps, mins, level, serves, ramen, photos, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(me.id, title, intro, tip, JSON.stringify(items), JSON.stringify(steps), mins, level, serves, ramen, ph.list.join(','), now, now).run();
  const rid = r.meta.last_row_id;
  if (ph.list.length) await db.batch(ph.list.map((p) => db.prepare('UPDATE images SET ref = ? WHERE id = ?').bind(`r:${rid}`, p)));
  const gain = await grow(env, request, me.id, 'recipe', rid, ['cook1', 'recipe3']);
  return json({ ok: true, id: rid, gain });
}

export async function deleteRecipe(env, id) {
  const db = env.DB;
  const { results: revs } = await db.prepare('SELECT id, user_id FROM recipe_reviews WHERE recipe_id = ?').bind(id).all();
  await dropImagesByRef(env, [`r:${id}`, ...revs.map((v) => `v:${v.id}`)]);
  await db.batch([
    db.prepare("DELETE FROM comments WHERE target = 'recipe' AND target_id = ?").bind(id),
    db.prepare('DELETE FROM recipe_likes WHERE recipe_id = ?').bind(id),
    db.prepare('DELETE FROM recipe_saves WHERE recipe_id = ?').bind(id),
    db.prepare('DELETE FROM recipe_reviews WHERE recipe_id = ?').bind(id),
    db.prepare('DELETE FROM recipes WHERE id = ?').bind(id),
  ]);
}

async function toggle(env, request, id, me, kind) {
  const db = env.DB;
  const r = await db.prepare('SELECT id, user_id, title FROM recipes WHERE id = ? AND hidden = 0').bind(id).first();
  if (!r) return fail('없는 레시피예요.', 404);
  const T = kind === 'like' ? 'recipe_likes' : 'recipe_saves';
  const C = kind === 'like' ? 'likes' : 'saves';
  if (kind === 'like' && r.user_id === me.id) return fail('내 레시피에는 좋아요를 누를 수 없어요.');
  const had = await db.prepare(`SELECT 1 AS x FROM ${T} WHERE recipe_id = ? AND user_id = ?`).bind(id, me.id).first();
  if (had) {
    await db.batch([db.prepare(`DELETE FROM ${T} WHERE recipe_id = ? AND user_id = ?`).bind(id, me.id), db.prepare(`UPDATE recipes SET ${C} = MAX(0, ${C} - 1) WHERE id = ?`).bind(id)]);
    if (kind === 'like') await addStars(env, r.user_id, -1);
  } else {
    await db.batch([
      kind === 'like' ? db.prepare(`INSERT OR IGNORE INTO ${T} (recipe_id, user_id) VALUES (?, ?)`).bind(id, me.id) : db.prepare(`INSERT OR IGNORE INTO ${T} (recipe_id, user_id, created_at) VALUES (?, ?, ?)`).bind(id, me.id, nowIso()),
      db.prepare(`UPDATE recipes SET ${C} = ${C} + 1 WHERE id = ?`).bind(id),
    ]);
    if (kind === 'like') {
      await addStars(env, r.user_id, 1);
      await grow(env, request, r.user_id, 'liked', `r${id}:${me.id}`, ['star50']);
    }
  }
  const row = await db.prepare(`SELECT ${C} AS n FROM recipes WHERE id = ?`).bind(id).first();
  return json({ ok: true, on: !had, n: row ? row.n : 0 });
}

async function countShare(env, request, id) {
  const ip = await ipHashOf(request);
  if (await tooMany(env.DB, 'ip:' + ip, 'rshare', 30, 60)) return json({ ok: true });
  await logAction(env.DB, 'ip:' + ip, 'rshare');
  await env.DB.prepare('UPDATE recipes SET shares = shares + 1 WHERE id = ? AND hidden = 0').bind(id).run();
  return json({ ok: true });
}

// ---------- 따라 해 봤어요 (후기) ----------
async function saveReview(env, request, id, me) {
  const b = await readBody(request, 6000);
  if (!b) return fail('보낸 내용을 읽지 못했어요.');
  const db = env.DB;
  const r = await db.prepare('SELECT id, user_id, title FROM recipes WHERE id = ? AND hidden = 0').bind(id).first();
  if (!r) return fail('없는 레시피예요.', 404);
  if (r.user_id === me.id) return fail('내 레시피에는 후기를 남길 수 없어요. 고칠 점은 레시피를 고쳐서 알려 주세요.');
  const rating = Math.round(Number(b.rating));
  const body = clip(b.body, 500);
  if (!(rating >= 1 && rating <= 5)) return fail('별점을 골라 주세요.');
  if (body.length < 5) return fail('따라 해 본 느낌을 5자 이상 적어 주세요.');
  const cur = await db.prepare('SELECT id, rating, photo FROM recipe_reviews WHERE recipe_id = ? AND user_id = ?').bind(id, me.id).first();
  const ref = cur ? `v:${cur.id}` : '__new__';
  const ph = await claimPhotos(env, me, b.photo ? [b.photo] : [], ref, 1);
  if (!ph.ok) return fail(ph.message);
  const photo = ph.list[0] || '';
  if (cur) {
    await db.batch([
      db.prepare('UPDATE recipe_reviews SET rating = ?, body = ?, photo = ?, updated_at = ? WHERE id = ?').bind(rating, body, photo, nowIso(), cur.id),
      db.prepare('UPDATE recipes SET rsum = rsum - ? + ? WHERE id = ?').bind(cur.rating, rating, id),
    ]);
    if (photo) await db.prepare('UPDATE images SET ref = ? WHERE id = ?').bind(`v:${cur.id}`, photo).run();
    if (cur.photo && cur.photo !== photo) {
      const { results } = await db.prepare('SELECT id, store FROM images WHERE id = ?').bind(cur.photo).all();
      await dropImages(env, results);
    }
    return json({ ok: true, id: cur.id });
  }
  const lim = await writeLimit(env, me, 'rreview', 10, 60);
  if (lim) return lim;
  const now = nowIso();
  const ins = await db.prepare('INSERT INTO recipe_reviews (recipe_id, user_id, rating, body, photo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, me.id, rating, body, photo, now, now).run();
  const vid = ins.meta.last_row_id;
  await db.prepare('UPDATE recipes SET reviews = reviews + 1, rsum = rsum + ? WHERE id = ?').bind(rating, id).run();
  if (photo) await db.prepare('UPDATE images SET ref = ? WHERE id = ?').bind(`v:${vid}`, photo).run();
  await addStars(env, r.user_id, 1);
  await grow(env, request, r.user_id, 'followed', `${id}:${me.id}`, ['followed5', 'star50']);
  await note(env, r.user_id, 'recipe', `${me.nick}님이 ‘${r.title}’ 레시피를 따라 해 보고 후기를 남겼어요.`, `/recipes/${id}#reviews`);
  const gain = await grow(env, request, me.id, 'rreview', id, []);
  return json({ ok: true, id: vid, gain });
}
export async function removeReview(env, vid, me, isAdmin) {
  const db = env.DB;
  const v = await db.prepare('SELECT id, recipe_id, user_id, rating FROM recipe_reviews WHERE id = ?').bind(vid).first();
  if (!v) return fail('없는 후기예요.', 404);
  if (!isAdmin && (!me || me.id !== v.user_id)) return fail('내가 쓴 후기만 지울 수 있어요.', 403);
  await dropImagesByRef(env, [`v:${vid}`]);
  await db.batch([
    db.prepare('DELETE FROM recipe_reviews WHERE id = ?').bind(vid),
    db.prepare('UPDATE recipes SET reviews = MAX(0, reviews - 1), rsum = MAX(0, rsum - ?) WHERE id = ?').bind(v.rating, v.recipe_id),
  ]);
  await revoke(env, v.user_id, 'rreview', v.recipe_id);
  return json({ ok: true });
}

// 탈퇴한 회원: 레시피와 사진, 후기를 지우고 누른 좋아요·저장을 거둬요
export async function deleteUserRecipes(env, uid) {
  const db = env.DB;
  const { results: mineR } = await db.prepare('SELECT id FROM recipes WHERE user_id = ?').bind(uid).all();
  for (const r of mineR) await deleteRecipe(env, r.id);
  const { results: mineV } = await db.prepare('SELECT id FROM recipe_reviews WHERE user_id = ?').bind(uid).all();
  for (const v of mineV) await removeReview(env, v.id, null, true);
  await db.batch([
    db.prepare('UPDATE recipes SET likes = MAX(0, likes - 1) WHERE id IN (SELECT recipe_id FROM recipe_likes WHERE user_id = ?)').bind(uid),
    db.prepare('DELETE FROM recipe_likes WHERE user_id = ?').bind(uid),
    db.prepare('UPDATE recipes SET saves = MAX(0, saves - 1) WHERE id IN (SELECT recipe_id FROM recipe_saves WHERE user_id = ?)').bind(uid),
    db.prepare('DELETE FROM recipe_saves WHERE user_id = ?').bind(uid),
  ]);
  const { results: left } = await db.prepare('SELECT id, store FROM images WHERE user_id = ?').bind(uid).all();
  await dropImages(env, left);
}

// ---------- 주소 나누기 ----------
export async function recipes(request, env, parts, me, listComments) {
  const url = new URL(request.url);
  const m = request.method;
  const [a, b, c] = parts;
  const id = idOf(a);
  const needMe = () => (me ? null : fail('로그인이 필요해요.', 401));
  if (a === 'upload' && m === 'POST') return needMe() || upload(env, request, me);
  if (!a && m === 'GET') return listRecipes(env, request, url, me);
  if (!a && m === 'POST') return needMe() || saveRecipe(env, request, me, 0);
  if (id && !b && m === 'GET') return getRecipe(env, id, me, listComments);
  if (id && !b && m === 'POST') return needMe() || saveRecipe(env, request, me, id);
  if (id && !b && m === 'DELETE') {
    if (!me) return needMe();
    const r = await env.DB.prepare('SELECT user_id FROM recipes WHERE id = ?').bind(id).first();
    if (!r || r.user_id !== me.id) return fail('내가 올린 레시피만 지울 수 있어요.', 403);
    await deleteRecipe(env, id);
    await revoke(env, me.id, 'recipe', id);
    return json({ ok: true });
  }
  if (id && (b === 'like' || b === 'save') && m === 'POST') return needMe() || toggle(env, request, id, me, b);
  if (id && b === 'share' && m === 'POST') return countShare(env, request, id);
  if (id && b === 'reviews' && !c && m === 'POST') return needMe() || saveReview(env, request, id, me);
  if (id && b === 'reviews' && idOf(c) && m === 'DELETE') return needMe() || removeReview(env, idOf(c), me, false);
  return fail('없는 주소예요.', 404);
}

// ---------- 공유 미리보기: /recipes/{번호} ----------
export async function recipePage(context, id) {
  const { request, env } = context;
  const url = new URL(request.url);
  const shell = await env.ASSETS.fetch(new URL('/recipes/view/', url.origin));
  if (!env.DB) return shell;
  let r = null;
  try {
    r = await env.DB.prepare(`SELECT r.id, r.title, r.intro, r.ramen, r.photos, r.items, r.steps, r.mins, r.reviews, r.rsum, r.created_at, r.hidden, ${userCols} FROM recipes r JOIN users u ON u.id = r.user_id WHERE r.id = ?`).bind(id).first();
  } catch (e) { r = null; }
  const canon = `${url.origin}/recipes/${id}`;
  if (!r || r.hidden) {
    return new HTMLRewriter().on('head', { element(el) { el.append('<meta name="robots" content="noindex">', { html: true }); } })
      .transform(new Response(shell.body, { status: 404, headers: shell.headers }));
  }
  const title = `${r.title} - 라면 레시피 자랑 | 면면`;
  const desc = (r.intro || '').replace(/\s+/g, ' ').slice(0, 120) || `${r.gone ? '면면 회원' : r.nick}님이 올린 라면 레시피예요. 재료와 만드는 순서, 따라 해 본 사람들의 후기를 볼 수 있어요.`;
  const cov = cover(r.photos);
  const img = cov ? `${url.origin}/api/img/${cov}` : `${url.origin}/assets/img/og.png`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'Recipe', name: r.title, description: desc, datePublished: String(r.created_at).slice(0, 10),
    author: { '@type': 'Person', name: r.gone ? '탈퇴한 회원' : r.nick }, recipeCategory: '라면 레시피', recipeCuisine: 'Korean',
    recipeIngredient: parseList(r.items).slice(0, 25), recipeInstructions: parseList(r.steps).slice(0, 15).map((t) => ({ '@type': 'HowToStep', text: t })),
  };
  if (cov) ld.image = [img];
  if (r.mins) ld.totalTime = `PT${r.mins}M`;
  if (r.reviews) ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: Math.round((r.rsum / r.reviews) * 10) / 10, ratingCount: r.reviews };
  const set = (sel, attr, val) => [sel, { element(el) { el.setAttribute(attr, val); } }];
  const rules = [
    ['title', { element(el) { el.setInnerContent(title); } }],
    set('meta[name="description"]', 'content', desc),
    set('link[rel="canonical"]', 'href', canon),
    set('meta[property="og:title"]', 'content', title),
    set('meta[property="og:description"]', 'content', desc),
    set('meta[property="og:url"]', 'content', canon),
    set('meta[property="og:image"]', 'content', img),
    set('meta[property="og:type"]', 'content', 'article'),
    ['head', { element(el) { el.append(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`, { html: true }); } }],
    ['[data-rcp]', { element(el) { el.setAttribute('data-id', String(id)); } }],
    ['meta[name="robots"]', { element(el) { el.remove(); } }],
  ];
  if (cov) {
    rules.push(['meta[property="og:image:width"]', { element(el) { el.remove(); } }]);
    rules.push(['meta[property="og:image:height"]', { element(el) { el.remove(); } }]);
  }
  let rw = new HTMLRewriter();
  for (const [sel, h] of rules) rw = rw.on(sel, h);
  const headers = new Headers(shell.headers);
  headers.set('cache-control', 'no-cache');
  return rw.transform(new Response(shell.body, { status: 200, headers }));
}
