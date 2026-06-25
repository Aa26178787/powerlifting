// Korean display labels. Engine-facing VALUES stay English (the engine in
// src/engine consumes 'squat'/'strength'/'knee'/'barbell' etc.) — these maps
// translate only what the user SEES. Unknown keys fall back to the raw value.

const LIFT = {
  squat: '스쿼트',
  bench: '벤치프레스',
  deadlift: '데드리프트',
  'box squat': '박스 스쿼트',
  'front squat': '프론트 스쿼트',
  'floor press': '플로어 프레스',
  'trap bar deadlift': '트랩바 데드리프트',
  'leg press': '레그 프레스',
  'dumbbell bench': '덤벨 벤치프레스',
  'romanian deadlift': '루마니안 데드리프트',
}

const GOAL = {
  strength: '근력',
  hypertrophy: '근비대',
  balanced: '균형',
}

const INJURY = {
  knee: '무릎',
  shoulder: '어깨',
  back: '허리',
}

const EQUIPMENT = {
  barbell: '바벨',
  rack: '랙',
  bench: '벤치',
  box: '박스',
  'trap bar': '트랩바',
  dumbbells: '덤벨',
  'leg press machine': '레그프레스 머신',
}

const TEMPLATE = {
  linearLP: '선형 점진 (Linear)',
  fiveThreeOne: '5/3/1 스타일',
  dup: '일일 비선형 주기화 (DUP)',
  highFreqPct: '고빈도 (High Frequency)',
  hypertrophyBlock: '근비대 블록 (Hypertrophy)',
}

const REGION = { lowerBack: '허리', knee: '무릎', shoulder: '어깨', elbow: '팔꿈치', wrist: '손목', hip: '고관절', hamstring: '햄스트링', pec: '가슴', bicepsTendon: '이두건', ankle: '발목' }
const STATUS = { 0: '정상', 1: '뻐근', 2: '가벼운 통증', 3: '심한 통증/부상' }
const STYLE = { bar: { low: '로우바', high: '하이바' }, stance: { narrow: '좁게', medium: '보통', wide: '넓게', conventional: '컨벤셔널', sumo: '스모' }, grip: { close: '클로즈', medium: '보통', wide: '넓게' } }

const QUALITY = { power: '파워', strength: '근력', hypertrophy: '근비대', endurance: '근지구력' }
const PRESET = { powerlifting: '파워리프팅', powerbuilding: '파워빌딩', bodybuilding: '보디빌딩', athletic: '파워·운동선수', general: '일반·균형' }
const MODEL = { auto: '자동 추천', adaptive: '하이브리드 (자동 설계)', linear: '선형', undulating: '비선형(DUP)', block: '블록' }

// 스티킹포인트: 가장 안 올라가는 구간을 평소 표현으로 풀이
const STICKING = {
  none: '특별히 없음',
  bottom: '바닥 구간 — 가장 낮은 지점에서 멈칫',
  midrange: '중간 구간 — 중간에서 정체',
  lockout: '마무리(락아웃) 구간 — 끝에서 안 펴짐',
}

const STEP = { 1:'기본', 2:'현재 1RM', 3:'경력', 4:'목표', 5:'주기화', 6:'스타일·약점', 7:'일정·컨디션', 8:'요약' }
const ASSESS = { weakLift:'약점 종목', level:'강도 수준', gl:'GL 점수', standard:'표준 대비' }

const SCHEME = { straight:'스트레이트', topSetBackoff:'탑세트+백오프', topSingleBackoff:'탑싱글+백오프', ascendingPyramid:'어센딩 피라미드', reversePyramid:'역피라미드', wave:'웨이브(3-2-1)', amrapTop:'AMRAP·PR세트', ramping:'램핑(데일리맥스)', cluster:'클러스터', restPause:'레스트포즈', dropSet:'드롭세트', myoReps:'마이오렙', widowmaker:'위도우메이커(20회)', contrastPAP:'콘트라스트(PAP)' }
const EVIDENCE = { rct:'검증', consensus:'근거 약함' }
const PHASE = { accumulation:'축적', intensification:'강화', peak:'피킹' }
// 모터 큐(느낌) 약점 → 교정 변형
const CUE = {
  floorDrive: '지면 미는 힘', upright: '상체 세우기', hipShoot: '힙 슈팅(엉덩이 먼저 솟음)', balance: '무게중심·균형',
  chestTouch: '가슴 터치·정지', offChest: '가슴에서 멈춤', backUsage: '등·광배 사용', lockout: '락아웃(마무리)',
  legDrive: '지면 누르는 느낌(레그 드라이브)', hipHinge: '히프 힌지', offFloor: '바닥에서 약함',
}

export const liftLabel = (k) => LIFT[k] ?? k
export const goalLabel = (k) => GOAL[k] ?? k
export const injuryLabel = (k) => INJURY[k] ?? k
export const equipmentLabel = (k) => EQUIPMENT[k] ?? k
export const templateLabel = (k) => TEMPLATE[k] ?? k
export const regionLabel = (k) => REGION[k] ?? k
export const statusLabel = (n) => STATUS[n] ?? String(n)
export const styleLabel = (group, v) => (STYLE[group] && STYLE[group][v]) ?? v
export const qualityLabel = (k) => QUALITY[k] ?? k
export const presetLabel = (k) => PRESET[k] ?? k
export const modelLabel = (k) => MODEL[k] ?? k
export const stickingLabel = (k) => STICKING[k] ?? k
export const stepLabel = (n) => STEP[n] ?? String(n)
export const assessLabel = (k) => ASSESS[k] ?? k
export const schemeLabel = (k) => SCHEME[k] ?? k
export const evidenceLabel = (k) => EVIDENCE[k] ?? k
export const phaseLabel = (k) => PHASE[k] ?? k
export const cueLabel = (k) => CUE[k] ?? k
