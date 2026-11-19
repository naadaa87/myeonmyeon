// 면면 성장 규칙: 등급, 활동 점수, 배지
// 서버(점수 주기)와 빌드(안내 페이지, 화면용 growth.js)가 함께 써요.
// 아래 함수들은 바깥 변수를 쓰지 않아야 해요. 빌드가 함수 글자 그대로 화면용 파일에 옮겨 적어요.

export const LEVELS = [
  { lv: 1, name: '첫 봉지', min: 0, color: '#B9AFA4', icon: 'bag', line: '면면에 처음 왔어요. 오늘은 뭘 끓여 볼까요?' },
  { lv: 2, name: '물 맞추는 사람', min: 30, color: '#E7C27A', icon: 'cup', line: '물 양이 손에 익기 시작했어요.' },
  { lv: 3, name: '스프 조절러', min: 90, color: '#F2B33D', icon: 'spoon', line: '스프를 얼마나 넣을지 내가 정해요.' },
  { lv: 4, name: '꼬들파 입문', min: 200, color: '#E9902F', icon: 'timer', line: '면 익힘을 초 단위로 따지기 시작했어요.' },
  { lv: 5, name: '라면 탐험가', min: 380, color: '#E06A2C', icon: 'compass', line: '처음 보는 라면이 보이면 일단 장바구니에 담아요.' },
  { lv: 6, name: '조합 연구가', min: 650, color: '#D93A26', icon: 'flask', line: '남들이 모르는 조합을 몇 개쯤 알고 있어요.' },
  { lv: 7, name: '국물 감별사', min: 1000, color: '#B52E1F', icon: 'bowl', line: '한 숟갈이면 어느 회사 라면인지 알아요.' },
  { lv: 8, name: '면발 장인', min: 1500, color: '#8C3A2B', icon: 'noodle', line: '이 사람 기록은 믿고 봐요.' },
  { lv: 9, name: '라면 큐레이터', min: 2200, color: '#26221F', icon: 'book', line: '면면 도감을 함께 채워 가는 사람이에요.' },
  { lv: 10, name: '면면 명예의 전당', min: 3200, color: '#C99A1E', icon: 'crown', line: '면면의 이름으로 기억할게요.' },
];

// act: [점수, 하루에 점수를 받는 최대 횟수(0이면 제한 없음), 설명]
export const RULES = {
  welcome: [10, 0, '회원가입'],
  checkin: [2, 1, '출석 체크'],
  streak7: [10, 1, '7일 연속 출석 보너스'],
  bowl: [5, 10, '한 그릇 기록 남기기 (라면마다 한 번)'],
  taste: [3, 10, '맛 지도 4칸 이상 채우기 (라면마다 한 번)'],
  memo: [3, 10, '기록에 20자 이상 메모 쓰기 (라면마다 한 번)'],
  tried: [1, 10, '먹어 봤어요 체크 (라면마다 한 번)'],
  post: [5, 4, '후루룩클럽에 글쓰기'],
  comment: [2, 10, '댓글 쓰기'],
  vote: [1, 10, '투표 참여'],
  worldcup: [2, 3, '라면 월드컵 끝까지 하기'],
  liked: [2, 20, '내 글이 좋아요를 받음'],
  helpful: [2, 20, '내 기록이 도움돼요를 받음'],
  adopted: [15, 0, '내 댓글이 답변으로 채택됨'],
  adopt: [2, 5, '질문에 답변 채택하기'],
  event: [5, 2, '시식회·번개 열기'],
  join: [3, 3, '시식회·번개 참여 신청'],
  manner: [1, 10, '함께한 사람 매너 평가하기'],
  tip: [10, 3, '신상·정보 제보가 반영됨'],
  recipe: [10, 2, '레시피 자랑 올리기'],
  rreview: [4, 5, '레시피를 따라 해 보고 후기 남기기 (레시피마다 한 번)'],
  followed: [3, 20, '누군가 내 레시피를 따라 해 보고 후기를 남김'],
};

// 배지: key, 이름, 받는 조건, 아이콘, 색
export const BADGES = [
  { key: 'welcome', name: '첫 젓가락', desc: '면면에 가입했어요', icon: 'chopsticks', color: '#F2B33D' },
  { key: 'bowl1', name: '첫 한 그릇', desc: '한 그릇 기록을 처음 남겼어요', icon: 'bowl', color: '#D93A26' },
  { key: 'bowl10', name: '도감 10칸', desc: '기록한 라면이 10가지가 됐어요', icon: 'book', color: '#E9902F' },
  { key: 'bowl30', name: '도감 30칸', desc: '기록한 라면이 30가지가 됐어요', icon: 'book', color: '#B52E1F' },
  { key: 'bowl50', name: '라면 매니아', desc: '기록한 라면이 50가지가 됐어요', icon: 'crown', color: '#C99A1E' },
  { key: 'maker4', name: '회사별 섭렵', desc: '네 곳 이상 회사의 라면을 기록했어요', icon: 'compass', color: '#3E8E7E' },
  { key: 'style5', name: '종류별 섭렵', desc: '국물·볶음·비빔·짜장·짬뽕을 모두 기록했어요', icon: 'noodle', color: '#E06A2C' },
  { key: 'fire3', name: '맵부심', desc: '아주 매운 편 라면을 3가지 기록했어요', icon: 'fire', color: '#D93A26' },
  { key: 'mild5', name: '순한맛 지킴이', desc: '순한 편 라면을 5가지 기록했어요', icon: 'leaf', color: '#7FA65A' },
  { key: 'taste10', name: '맛 지도 제작자', desc: '맛 지도를 10번 채웠어요', icon: 'map', color: '#7A5AC8' },
  { key: 'checkin7', name: '일주일 개근', desc: '7일 연속 출석했어요', icon: 'cal', color: '#E9902F' },
  { key: 'checkin30', name: '단골손님', desc: '출석을 30번 했어요', icon: 'cal', color: '#8C3A2B' },
  { key: 'cook1', name: '첫 레시피', desc: '레시피 자랑을 처음 올렸어요', icon: 'spoon', color: '#E06A2C' },
  { key: 'recipe3', name: '조합 공유왕', desc: '레시피 자랑과 조합 글을 합쳐 3개 올렸어요', icon: 'flask', color: '#3E8E7E' },
  { key: 'followed5', name: '따라 하고 싶은 레시피', desc: '내 레시피를 따라 해 본 후기가 5개 모였어요', icon: 'people', color: '#D93A26' },
  { key: 'solver1', name: '친절한 답변', desc: '답변이 처음 채택됐어요', icon: 'check', color: '#3E8E7E' },
  { key: 'vote1', name: '한 표', desc: '투표에 처음 참여했어요', icon: 'vote', color: '#F2B33D' },
  { key: 'worldcup1', name: '월드컵 우승 결정', desc: '라면 월드컵을 끝까지 했어요', icon: 'trophy', color: '#C99A1E' },
  { key: 'post10', name: '이야기꾼', desc: '후루룩클럽에 글을 10개 썼어요', icon: 'chat', color: '#E06A2C' },
  { key: 'star50', name: '인기쟁이', desc: '받은 별이 50개가 됐어요', icon: 'star', color: '#D93A26' },
  { key: 'meet3', name: '시식회 단골', desc: '시식회·번개에 3번 참여했어요', icon: 'people', color: '#26221F' },
  { key: 'manner', name: '매너 식객', desc: '매너 별점 4.5 이상 (평가 5개 이상)', icon: 'heart', color: '#D93A26' },
];

export function levelOf(xp, LEVELS) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.min) cur = l;
  const next = LEVELS.find((l) => l.min > xp) || null;
  const pct = next ? Math.max(0, Math.min(100, Math.round(((xp - cur.min) / (next.min - cur.min)) * 100))) : 100;
  return { lv: cur.lv, name: cur.name, color: cur.color, icon: cur.icon, line: cur.line, min: cur.min, next: next ? next.min : null, nextName: next ? next.name : '', pct, need: next ? next.min - xp : 0 };
}

// 그림 조각 (24×24 안에 그리는 간단한 선 그림)
export function glyph(name) {
  const s = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const f = 'fill="currentColor"';
  const G = {
    bag: `<path d="M6 4.5h12l-1 3 1 3-1 3 1 3-1 3H7l1-3-1-3 1-3-1-3 1-3z" ${s}/><path d="M9.5 10.5c1 .8 2 .8 3 0s2-.8 3 0" ${s}/>`,
    cup: `<path d="M5 7h14l-1.6 12.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8z" ${s}/><path d="M4 7h16" ${s}/><path d="M9 11c1 .7 2 .7 3 0s2-.7 3 0" ${s}/>`,
    spoon: `<ellipse cx="12" cy="7.5" rx="4" ry="4.5" ${s}/><path d="M12 12v8.5" ${s}/>`,
    timer: `<circle cx="12" cy="13.5" r="7" ${s}/><path d="M12 13.5V10M10 3.5h4M18 7l1.3-1.3" ${s}/>`,
    compass: `<circle cx="12" cy="12" r="8.5" ${s}/><path d="m15.5 8.5-2 5-5 2 2-5z" ${s}/>`,
    flask: `<path d="M9.5 3.5h5M10.5 3.5v5.5L5.5 18a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3l-5-9V3.5" ${s}/><path d="M8 15h8" ${s}/>`,
    bowl: `<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z" ${s}/><path d="M8 20.5h8" ${s}/><path d="M8 8c0-1.5 1-1.5 1-3M12 8c0-1.5 1-1.5 1-3M16 8c0-1.5 1-1.5 1-3" ${s}/>`,
    noodle: `<path d="M4 6c2.7 0 2.7 3 5.3 3s2.7-3 5.4-3S17.3 9 20 9M4 11c2.7 0 2.7 3 5.3 3s2.7-3 5.4-3 2.6 3 5.3 3M4 16c2.7 0 2.7 3 5.3 3s2.7-3 5.4-3 2.6 3 5.3 3" ${s}/>`,
    book: `<path d="M4 5.5C6.5 4.3 9.5 4.3 12 6c2.5-1.7 5.5-1.7 8-.5v13c-2.5-1.2-5.5-1.2-8 .5-2.5-1.7-5.5-1.7-8-.5z" ${s}/><path d="M12 6v13" ${s}/>`,
    crown: `<path d="M4 8l4 4 4-6 4 6 4-4-1.5 10.5h-13z" ${s}/><path d="M5.5 20.5h13" ${s}/>`,
    chopsticks: `<path d="M6 21 15 3M10 21l9-15" ${s}/>`,
    fire: `<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.2 3.6-7.6.4 1.5 1.2 2.6 2.4 3.2C11.6 7.4 13 5 15 3.5c-.3 3 1.3 4.5 2.4 6.2.8 1.3 1.1 2.6 1.1 4.1 0 4-2.7 7.2-6.5 7.2z" ${s}/>`,
    leaf: `<path d="M5 19C5 10 10 5 19.5 4.5 19 14 14 19 5 19z" ${s}/><path d="M5 19 13 11" ${s}/>`,
    map: `<path d="m3.5 6.5 5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" ${s}/><path d="M9 4.5v13M15 6.5v13" ${s}/>`,
    cal: `<rect x="3.5" y="5" width="17" height="15.5" rx="2.5" ${s}/><path d="M3.5 10h17M8 3v4M16 3v4" ${s}/><path d="m9 15 2 2 4-4" ${s}/>`,
    check: `<circle cx="12" cy="12" r="8.5" ${s}/><path d="m8 12.5 2.7 2.7L16.5 9" ${s}/>`,
    vote: `<path d="M4 13h16v7H4z" ${s}/><path d="M8 13V6.5A1.5 1.5 0 0 1 9.5 5h5A1.5 1.5 0 0 1 16 6.5V13" ${s}/><path d="m9.8 9 1.6 1.6L14.4 7.6" ${s}/>`,
    trophy: `<path d="M8 4h8v5a4 4 0 0 1-8 0z" ${s}/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4" ${s}/>`,
    chat: `<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5z" ${s}/>`,
    star: `<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" ${s}/>`,
    people: `<circle cx="9" cy="8" r="3.2" ${s}/><path d="M3 19.5c.5-3.4 2.9-5.5 6-5.5s5.5 2.1 6 5.5" ${s}/><circle cx="16.5" cy="9" r="2.6" ${s}/><path d="M16 14c2.6.1 4.4 1.9 5 5" ${s}/>`,
    heart: `<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" ${s}/>`,
    lock: `<rect x="5" y="10.5" width="14" height="10" rx="2.5" ${s}/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" ${s}/>`,
    dot: `<circle cx="12" cy="12" r="3" ${f}/>`,
  };
  return G[name] || G.star;
}

// 등급 엠블럼: 둥근 사각 그릇 모양 안에 그림과 숫자
export function emblemSVG(info, size, glyphFn) {
  const c = info.color;
  const sh = 'M8 4h32a5 5 0 0 1 5 5v26a13 13 0 0 1-13 13H16A13 13 0 0 1 3 35V9a5 5 0 0 1 5-5z';
  return `<svg class="emblem" width="${size}" height="${size}" viewBox="0 0 48 52" aria-hidden="true"><path d="${sh}" transform="translate(0 2)" fill="#26221F" opacity=".16"/><path d="${sh}" fill="${c}"/><path d="${sh}" fill="none" stroke="#26221F" stroke-width="2.4"/><g transform="translate(12 8)" color="#fff">${glyphFn(info.icon)}</g><rect x="14" y="34" width="20" height="11" rx="5.5" fill="#fff" stroke="#26221F" stroke-width="1.8"/><text x="24" y="42.6" text-anchor="middle" font-size="9" font-weight="800" fill="#26221F" font-family="Pretendard, sans-serif">${info.lv}</text></svg>`;
}

// 배지 그림: 동그란 메달
export function badgeSVG(b, size, locked, glyphFn) {
  const c = locked ? '#CFC8C0' : b.color;
  return `<svg class="badge-ico${locked ? ' locked' : ''}" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="26" r="20" fill="#26221F" opacity="${locked ? 0.06 : 0.14}"/><circle cx="24" cy="24" r="20" fill="${locked ? '#F3EFEA' : '#FFF8EC'}" stroke="${locked ? '#CFC8C0' : '#26221F'}" stroke-width="2.2"/><circle cx="24" cy="24" r="14.5" fill="${c}"/><g transform="translate(12 12)" color="#fff">${glyphFn(locked ? 'lock' : b.icon)}</g></svg>`;
}
