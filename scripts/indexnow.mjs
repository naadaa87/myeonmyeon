// GitHub Actions에서 돌아요 (.github/workflows/indexnow.yml)
// 이번 커밋에서 lastmod가 바뀐 페이지를 IndexNow로 알려요. 내 컴퓨터에서 돌릴 일은 없어요.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const cfg = JSON.parse(fs.readFileSync('site.config.json', 'utf8'));
const SITE = cfg.siteUrl.replace(/\/$/, '');
const KEY = cfg.indexNowKey;
if (!KEY) { console.log('indexNowKey가 없어 건너뛰어요.'); process.exit(0); }

const now = JSON.parse(fs.readFileSync('scripts/lastmod.json', 'utf8'));
let before = {};
try { before = JSON.parse(execSync('git show HEAD~1:scripts/lastmod.json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch (_) { before = {}; }
const all = String(process.env.ALL || '').trim().toLowerCase() === 'yes';
const paths = Object.keys(now).filter((u) => all || !before[u] || before[u][0] !== now[u][0]);
console.log(`알릴 페이지 ${paths.length}쪽 (전체 ${Object.keys(now).length}쪽)`);
if (!paths.length) process.exit(0);

// 새 배포가 열릴 때까지 기다리기: 바뀐 페이지의 본문 값이 운영 서버와 같아질 때까지 (최대 15분)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const want = Object.fromEntries(paths.map((u) => [u, now[u][0]]));
let ready = false;
for (let i = 0; i < 60 && !all; i++) {
  try {
    const res = await fetch(`${SITE}/data/pagehash.json?t=${Date.now()}`, { headers: { 'cache-control': 'no-cache' } });
    if (res.ok) {
      const live = (await res.json()).pages || {};
      const left = paths.filter((u) => live[u] !== want[u]).length;
      if (!left) { ready = true; break; }
      if (i % 4 === 0) console.log(`배포 기다리는 중 (아직 ${left}쪽 다름)`);
    }
  } catch (_) { /* 다시 */ }
  await sleep(15000);
}
if (!all && !ready) console.log('15분 안에 새 배포를 확인하지 못했지만 그대로 알려요.');

// 열쇠 파일이 열리는지 먼저 봐요
const keyRes = await fetch(`${SITE}/${KEY}.txt`).catch(() => null);
if (!keyRes || !keyRes.ok) { console.log('열쇠 파일이 아직 열리지 않아요. 다음 배포 때 다시 알려요.'); process.exit(0); }

const host = new URL(SITE).host;
const urls = paths.map((u) => SITE + u);
const ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://searchadvisor.naver.com/indexnow'];
for (const ep of ENDPOINTS) {
  for (let i = 0; i < urls.length; i += 10000) {
    const body = JSON.stringify({ host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls.slice(i, i + 10000) });
    try {
      const res = await fetch(ep, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body });
      console.log(`${ep} → ${res.status} (${Math.min(10000, urls.length - i)}쪽)`);
    } catch (e) {
      console.log(`${ep} → 실패 ${e.message}`);
    }
  }
}
