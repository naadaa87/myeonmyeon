// 서버와 빌드가 함께 쓰는 라면 분류와 한 그릇 기록 보기
// (빌드가 이 파일을 화면용 자료로도 옮겨 적어요)

// 조리 방식(c)
export const STYLES = {
  soup: '국물', fried: '볶음', bibim: '비빔', jjajang: '짜장', jjamppong: '짬뽕', udon: '우동·칼국수', cold: '냉면·막국수', etc: '기타',
};
// 형태(f)
export const FORMS = { bag: '봉지', cup: '컵', bigcup: '큰컵' };
// 판매 상태(st)
export const STATUS = { sale: '판매 중', limited: '한정판', exclusive: '단독 판매', off: '단종' };
// 편집부 맵기 분류(hot)
export const HOTS = { 0: '순한 편', 1: '매콤', 2: '아주 매운 편' };

// 무드보드의 카테고리 탭: 조리 방식과 형태를 묶어서 보여 줘요
export const GROUPS = [
  { id: 'soup', name: '국물면', img: 'broth-spicy', test: { c: ['soup', 'jjamppong', 'udon'] } },
  { id: 'bibim', name: '비빔면', img: 'mixed-bibim', test: { c: ['bibim', 'cold'] } },
  { id: 'jjajang', name: '짜장면', img: 'black-bean', test: { c: ['jjajang'] } },
  { id: 'fried', name: '볶음면', img: 'stir-fried', test: { c: ['fried'] } },
  { id: 'cup', name: '컵라면', img: 'cup', test: { f: ['cup', 'bigcup'] } },
  { id: 'bag', name: '봉지라면', img: 'broth-clear', test: { f: ['bag'] } },
];
export function inGroup(r, g) {
  if (g.test.c && !g.test.c.includes(r.c)) return false;
  if (g.test.f && !g.test.f.includes(r.f)) return false;
  return true;
}

// 카드에 쓰는 그릇 그림: 조리 방식과 맵기로 골라요 (실제 제품 사진이 아니에요)
export function bowlImage(r) {
  if (r.f === 'cup' || r.f === 'bigcup') return r.c === 'fried' ? 'stir-fried' : 'cup';
  if (r.c === 'fried') return 'stir-fried';
  if (r.c === 'jjajang') return 'black-bean';
  if (r.c === 'bibim' || r.c === 'cold') return 'mixed-bibim';
  if (r.c === 'jjamppong') return 'broth-spicy';
  if (r.hot === 0 || r.c === 'udon') return 'broth-clear';
  return 'broth-spicy';
}

// 맛 지도 여덟 칸 (1~5, 0은 안 적음)
export const AXES = [
  { k: 'hot', name: '맵기', lo: '안 매움', hi: '아주 매움' },
  { k: 'salt', name: '짠맛', lo: '싱거운 편', hi: '짠 편' },
  { k: 'sweet', name: '단맛', lo: '거의 없음', hi: '달달함' },
  { k: 'rich', name: '진하기', lo: '가벼움', hi: '진함' },
  { k: 'oil', name: '기름짐', lo: '깔끔함', hi: '기름짐' },
  { k: 'thick', name: '면 굵기', lo: '가는 면', hi: '굵은 면' },
  { k: 'chew', name: '면 탄력', lo: '부드러움', hi: '쫄깃함' },
  { k: 'unique', name: '개성', lo: '익숙한 맛', hi: '독특한 맛' },
];

export const AGAIN = { yes: '또 먹을래요', maybe: '가끔은', no: '한 번이면 충분' };
export const COOKS = { firm: '꼬들하게', normal: '봉지 안내대로', soft: '푹 익혀서' };
export const WATERS = { less: '물 적게', normal: '안내대로', more: '물 넉넉히' };
export const PLACES = { home: '집', office: '회사·학교', store: '편의점', camp: '캠핑·여행', etc: '그 밖' };
export const ADDS = ['계란', '대파', '치즈', '김치', '만두', '떡', '햄·소시지', '콩나물', '해물', '고춧가루', '마늘', '청양고추', '참기름', '김가루', '밥'];
export const TAGS = ['국물이 좋아요', '면이 좋아요', '스프 맛이 진해요', '건더기가 실해요', '양이 넉넉해요', '양이 적어요', '해장으로 좋아요', '야식으로 좋아요', '아이도 먹어요', '값이 착해요', '자꾸 생각나요', '조금 아쉬워요'];

// 랭킹 계산 기준 (평가 기준 페이지와 서버 계산이 같은 값을 써요)
export const RANK_RULE = {
  m: 20, // 베이지안 평균의 기준 표본 수
  minN: 10, // 종합·종류별 순위에 오르는 최소 기록 수
  newMonths: 12, // 신상 랭킹: 출시 뒤 12개월 안
  newMinN: 5,
  axisMinN: 15, // 맛 축 랭킹: 그 칸을 적은 기록 15개 이상
  maniaBowls: 50, // 매니아 랭킹: 기록 50개 이상인 회원의 기록만
  maniaM: 10,
  maniaMinN: 5,
  againMinN: 20, // 또 먹을래요 비율: 답한 기록 20개 이상
  risingDays: 14,
  risingMinRecent: 5,
  risingFloor: 5, // 이전 기간 기록이 적어도 5개인 것으로 쳐요
};
