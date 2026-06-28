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
  custom: '맞춤 빈도 (Custom)',
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

const SCHEME = { straight:'스트레이트', topSetBackoff:'탑세트+백오프', topSingleBackoff:'탑싱글+백오프', ascendingPyramid:'어센딩 피라미드', reversePyramid:'역피라미드', wave:'웨이브(3-2-1)', amrapTop:'AMRAP·PR세트', ramping:'램핑(데일리맥스)', cluster:'클러스터', restPause:'레스트포즈', dropSet:'드롭세트', myoReps:'마이오렙', widowmaker:'위도우메이커(20회)', contrastPAP:'콘트라스트(PAP)', strengthHypertrophy:'근력+근비대' }
const EVIDENCE = { rct:'검증', consensus:'근거 약함', heuristic:'근거 약함' }

// ── Volume override UI labels (§5.4, §6)
export const VOL = {
  title: '볼륨 직접 설정 (선택 — 비우면 자동)',
  disclaimer: '직접 입력은 본인 책임. 경고는 차단이 아닌 안내입니다.',
  mainEnable: '볼륨 직접 설정 사용',
  mode_rampFromFloor: '시작주 기준(권장, 주기화 유지)',
  mode_fixed: '고정(매주 동일)',
  setsPerSession: '세션당',
  weekly: '주간',
  autoRecommend: '자동추천 채우기',
  clearAuto: '지우기(자동)',
  freqZeroHint: '빈도 0',
  accessoryEnable: '보조 개수 직접 설정',
  accessoryLabel: '세션당 보조 운동 수',
  timeWarning: '시간 제한 설정 시 실제 보조 개수는 더 적을 수 있음',
}

export function volumeWarningLabel(code, values = {}) {
  switch (code) {
    case 'underMev':    return `시작주 주간 ${values.weekly ?? ''}세트 < MEV(${values.mev ?? ''})`
    case 'overMrv':     return `피크주 주간 ${values.peakWeekly ?? ''}세트 > MRV(${values.mrv ?? ''})`
    case 'overCap':     return '세션당 세트가 상한을 초과'
    case 'taperDefeat': return '고정 볼륨이 대회 테이퍼를 무력화 — 시작주기준(ramp) 모드 권장'
    case 'deadInfo':    return '데드리프트 직접 입력: 0.6× 감쇄 미적용 (입력값 literal)'
    case 'freqZero':    return '종목 빈도=0이므로 볼륨 override가 적용되지 않음'
    case 'regionTrim':  return 'regionStatus에 의해 일부 운동이 볼륨 감소 가능'
    case 'accZero':     return '보조 운동 없음 (accessory=0)'
    case 'accHigh':     return `세션당 보조 ${values.count ?? ''}개 > 권장 상한(5)`
    default:            return code
  }
}
const PHASE = { accumulation:'축적', intensification:'강화', peak:'피킹' }
// 스티킹포인트 원인(제한 근육) 라벨
const CAUSE = {
  quads:   '대퇴사두(무릎 폄)',
  hip:     '고관절·둔근(엉덩이 폄)',
  back:    '척추기립근·상부등(상체 각도)',
  chest:   '가슴(대흉근)',
  shoulder:'어깨(전면 삼각근)',
  triceps: '삼두(락아웃)',
  lats:    '광배(바 붙이기)',
}

// 모터 큐(느낌) 약점 → 교정 변형
const CUE = {
  floorDrive: '지면 미는 힘', upright: '상체 세우기', hipShoot: '힙 슈팅(엉덩이 먼저 솟음)', balance: '무게중심·균형',
  chestTouch: '가슴 터치·정지', offChest: '가슴에서 멈춤', backUsage: '등·광배 사용', lockout: '락아웃(마무리)',
  legDrive: '지면 누르는 느낌(레그 드라이브)', hipHinge: '히프 힌지', offFloor: '바닥에서 약함',
}

// Rest-time display strings — matches restRange() in quality.js (NSCA/ACSM consensus).
// Kept as a simple map here so i18n.js stays free of engine imports.
const REST = {
  power:       '3–5분',
  strength:    '3–5분',
  hypertrophy: '1–2분',
  endurance:   '1분',
}
export const restLabel = (k) => REST[k] ?? ''

// ── Full exercise-name localisation map (205 DB entries) ──────────────────────
// Keys = exact exercises.json "name" values; values = natural Korean labels.
// Parenthetical qualifiers are translated; proper names & abbreviations are
// transliterated. SSB / GHD / RDL / T2K left as-is (recognised abbreviations).
const EXERCISE_NAME = {
  // ── Squat variations ─────────────────────────────────────────────────────
  'Back Squat (Low Bar)':                    '백 스쿼트 (로우바)',
  'Back Squat (High Bar)':                   '백 스쿼트 (하이바)',
  'Pause Squat (bottom)':                    '포즈 스쿼트 (바닥)',
  'Pause Squat (above parallel)':            '포즈 스쿼트 (평행 위)',
  'Tempo Squat':                             '템포 스쿼트',
  'Pin Squat (below parallel)':              '핀 스쿼트 (평행 아래)',
  'Pin Squat (above parallel)':              '핀 스쿼트 (평행 위)',
  'Box Squat (below parallel)':              '박스 스쿼트 (평행 아래)',
  'Box Squat (parallel)':                    '박스 스쿼트 (평행)',
  'Box Squat (above parallel)':              '박스 스쿼트 (평행 위)',
  'Front Squat':                             '프론트 스쿼트',
  'Safety Squat Bar (SSB) Squat':            'SSB 스쿼트',
  'SSB Box Squat':                           'SSB 박스 스쿼트',
  'SSB Good Morning':                        'SSB 굿모닝',
  'SSB Front Squat':                         'SSB 프론트 스쿼트',
  'Duffalo / Buffalo Bar Squat':             '더팔로바 스쿼트',
  'Cambered Bar Squat':                      '캠버드바 스쿼트',
  'Banded Squat':                            '밴드 스쿼트',
  'Chain Squat':                             '체인 스쿼트',
  'Heel-Elevated Squat':                     '힐 엘리베이티드 스쿼트',
  'Heel-Elevated Goblet Squat':              '힐 엘리베이티드 고블릿 스쿼트',
  'Zombie Squat (arms forward)':             '좀비 스쿼트 (팔 앞으로)',
  'Belt Squat':                              '벨트 스쿼트',
  'Hatfield Squat':                          '햇필드 스쿼트',
  'Anderson Squat':                          '앤더슨 스쿼트',
  'Narrow Stance Squat':                     '내로우 스탠스 스쿼트',
  'Wide Stance Squat':                       '와이드 스탠스 스쿼트',
  'Zercher Squat':                           '저처 스쿼트',
  // ── Bench Press variations ────────────────────────────────────────────────
  'Bench Press (Competition Grip)':          '벤치프레스 (경기 그립)',
  'Paused Bench Press':                      '포즈 벤치프레스',
  '2-Second Pause Bench':                    '2초 포즈 벤치',
  'Wide Grip Bench Press':                   '와이드 그립 벤치프레스',
  'Close Grip Bench Press':                  '클로즈 그립 벤치프레스',
  'Spoto Press':                             '스포토 프레스',
  'Floor Press':                             '플로어 프레스',
  'Board Press (1-Board)':                   '보드 프레스 (1보드)',
  'Board Press (2-Board)':                   '보드 프레스 (2보드)',
  'Board Press (3-Board)':                   '보드 프레스 (3보드)',
  'Board Press (4–5 Board)':            '보드 프레스 (4–5보드)',
  'Pin Press (off chest)':                   '핀 프레스 (가슴에서)',
  'Pin Press (midrange)':                    '핀 프레스 (중간)',
  'Rack Press (lockout)':                    '랙 프레스 (락아웃)',
  'Incline Bench Press':                     '인클라인 벤치프레스',
  'Decline Bench Press':                     '디클라인 벤치프레스',
  'Larsen Press':                            '라르센 프레스',
  'Feet-Up Bench Press':                     '풋업 벤치프레스',
  'Slingshot Bench Press':                   '슬링샷 벤치프레스',
  'Dead Bench':                              '데드 벤치',
  'Cambered Bar Bench Press':                '캠버드바 벤치프레스',
  'Dumbbell Bench Press':                    '덤벨 벤치프레스',
  'Dumbbell Incline Press':                  '덤벨 인클라인 프레스',
  'Banded Bench Press':                      '밴드 벤치프레스',
  'Chain Bench Press':                       '체인 벤치프레스',
  'Swiss Bar / Football Bar Press':          '스위스바 프레스',
  'Axle Bar Bench Press':                    '액슬바 벤치프레스',
  'JM Press':                                'JM 프레스',
  'Overhead Press (Barbell)':                '오버헤드 프레스 (바벨)',
  'Push Press':                              '푸시 프레스',
  'Seated Overhead Press':                   '시티드 오버헤드 프레스',
  'Z Press':                                 'Z 프레스',
  'Dips (weighted)':                         '딥스 (가중)',
  // ── Deadlift variations ───────────────────────────────────────────────────
  'Conventional Deadlift':                   '컨벤셔널 데드리프트',
  'Sumo Deadlift':                           '스모 데드리프트',
  'Deficit Deadlift (conventional)':         '디피싯 데드리프트 (컨벤셔널)',
  'Deficit Sumo Deadlift':                   '디피싯 스모 데드리프트',
  'Pause Deadlift (off floor)':              '포즈 데드리프트 (바닥 위)',
  'Pause Deadlift (below knee)':             '포즈 데드리프트 (무릎 아래)',
  'Pause Deadlift (above knee)':             '포즈 데드리프트 (무릎 위)',
  'Halting Deadlift':                        '홀팅 데드리프트',
  'Block Pull (below knee)':                 '블록 풀 (무릎 아래)',
  'Block Pull (above knee)':                 '블록 풀 (무릎 위)',
  'Rack Pull (above knee)':                  '랙 풀 (무릎 위)',
  'Rack Pull (mid-shin)':                    '랙 풀 (정강이 중간)',
  'Snatch Grip Deadlift':                    '스내치 그립 데드리프트',
  'Clean Grip Deadlift':                     '클린 그립 데드리프트',
  'Romanian Deadlift (RDL)':                 '루마니안 데드리프트 (RDL)',
  'Stiff-Leg Deadlift':                      '스티프 레그 데드리프트',
  'Trap Bar Deadlift (high handles)':        '트랩바 데드리프트 (높은 핸들)',
  'Trap Bar Deadlift (low handles)':         '트랩바 데드리프트 (낮은 핸들)',
  'Banded Deadlift':                         '밴드 데드리프트',
  'Chain Deadlift':                          '체인 데드리프트',
  'Sumo Block Pull':                         '스모 블록 풀',
  'Tempo Deadlift':                          '템포 데드리프트',
  'Tempo to Knees Deadlift (T2K)':           '무릎까지 템포 데드리프트 (T2K)',
  'Axle Bar Deadlift':                       '액슬바 데드리프트',
  'Single-Leg RDL':                          '싱글레그 RDL',
  'Landmine Single-Leg RDL':                 '랜드마인 싱글레그 RDL',
  // ── Rows & pull variants ──────────────────────────────────────────────────
  'Pendlay Row':                             '펜들레이 로우',
  'Barbell Bent-Over Row (overhand)':        '바벨 벤트오버 로우 (오버핸드)',
  'Barbell Row (underhand)':                 '바벨 로우 (언더핸드)',
  'Dumbbell Row (single-arm)':               '덤벨 로우 (한팔)',
  'Kroc Row':                                '크록 로우',
  'Seal Row':                                '씰 로우',
  'Chest-Supported Row':                     '체스트 서포트 로우',
  'T-Bar Row':                               'T바 로우',
  'Meadows Row':                             '메도우스 로우',
  'Helms Row':                               '헬름스 로우',
  'Seated Cable Row (close)':                '시티드 케이블 로우 (클로즈)',
  'Seated Cable Row (wide)':                 '시티드 케이블 로우 (와이드)',
  'Single-Arm Cable Row':                    '한팔 케이블 로우',
  'Lat Pulldown (wide)':                     '랫 풀다운 (와이드)',
  'Lat Pulldown (close neutral)':            '랫 풀다운 (클로즈 뉴트럴)',
  'Lat Pulldown (single-arm)':               '랫 풀다운 (한팔)',
  'Pull-Up (wide)':                          '풀업 (와이드)',
  'Pull-Up (neutral)':                       '풀업 (뉴트럴)',
  'Chin-Up (underhand)':                     '친업 (언더핸드)',
  'Weighted Pull-Up/Chin-Up':               '가중 풀업/친업',
  'Face Pull':                               '페이스 풀',
  'Band Pull-Apart':                         '밴드 풀어파트',
  'Rear Delt Fly':                           '리어 델트 플라이',
  'Barbell Shrug':                           '바벨 슈러그',
  'Dumbbell Shrug':                          '덤벨 슈러그',
  'Trap Bar Shrug':                          '트랩바 슈러그',
  'Cable Shrug':                             '케이블 슈러그',
  'Landmine Row (bilateral)':                '랜드마인 로우 (양팔)',
  'Inverted Row':                            '인버티드 로우',
  'Cable Pullover':                          '케이블 풀오버',
  'Dumbbell Pullover':                       '덤벨 풀오버',
  // ── Triceps accessories ───────────────────────────────────────────────────
  'Skull Crusher (EZ)':                      '스컬 크러셔 (EZ바)',
  'Skull Crusher (barbell)':                 '스컬 크러셔 (바벨)',
  'Skull Crusher (dumbbell)':                '스컬 크러셔 (덤벨)',
  'Tate Press':                              '테이트 프레스',
  'Rolling DB Extension':                    '롤링 덤벨 익스텐션',
  'Triceps Pushdown (rope)':                 '삼두 푸시다운 (로프)',
  'Triceps Pushdown (bar)':                  '삼두 푸시다운 (바)',
  'Overhead Triceps Ext (cable)':            '오버헤드 삼두 익스텐션 (케이블)',
  'Overhead Triceps Ext (DB)':               '오버헤드 삼두 익스텐션 (덤벨)',
  'Close-Grip Push-Up':                      '클로즈 그립 푸시업',
  // ── Chest accessories ─────────────────────────────────────────────────────
  'Dumbbell Floor Press':                    '덤벨 플로어 프레스',
  'Cable Fly':                               '케이블 플라이',
  'Dumbbell Fly':                            '덤벨 플라이',
  'Incline Dumbbell Fly':                    '인클라인 덤벨 플라이',
  'Pec Deck':                                '펙덱 머신',
  // ── Shoulder accessories ──────────────────────────────────────────────────
  'Lateral Raise (DB)':                      '레터럴 레이즈 (덤벨)',
  'Cable Lateral Raise':                     '케이블 레터럴 레이즈',
  'Military Press':                          '밀리터리 프레스',
  'Seated DB Overhead Press':                '시티드 덤벨 오버헤드 프레스',
  'Arnold Press':                            '아놀드 프레스',
  'Landmine Press':                          '랜드마인 프레스',
  // ── Good Morning variants ─────────────────────────────────────────────────
  'Good Morning (standing)':                 '굿모닝 (스탠딩)',
  'Good Morning (wide)':                     '굿모닝 (와이드)',
  'Good Morning (narrow)':                   '굿모닝 (내로우)',
  'Good Morning (cambered)':                 '굿모닝 (캠버드)',
  'Good Morning (seated)':                   '굿모닝 (시티드)',
  // ── Posterior chain ───────────────────────────────────────────────────────
  'Glute-Ham Raise (GHR)':                   '글루트 햄 레이즈 (GHR)',
  'Nordic Hamstring Curl':                   '노르딕 햄스트링 컬',
  'Hip Thrust (barbell)':                    '힙 스러스트 (바벨)',
  'Hip Thrust (banded)':                     '힙 스러스트 (밴드)',
  'Single-Leg Hip Thrust':                   '싱글레그 힙 스러스트',
  'Back Extension (45°)':               '백 익스텐션 (45도)',
  'Back Extension (GHD)':                    '백 익스텐션 (GHD)',
  'Reverse Hyperextension':                  '리버스 하이퍼익스텐션',
  'Banded Good Morning':                     '밴드 굿모닝',
  'Kettlebell Swing':                        '케틀벨 스윙',
  'Cable Pull-Through':                      '케이블 풀스루',
  'Seated Leg Curl':                         '시티드 레그 컬',
  'Lying Leg Curl':                          '라잉 레그 컬',
  'Nordic-Leg Curl Machine':                 '노르딕 레그 컬 머신',
  // ── Leg accessories & sleds ───────────────────────────────────────────────
  'Sled Drag (forward)':                     '슬레드 드래그 (전진)',
  'Sled Drag (backward)':                    '슬레드 드래그 (후진)',
  'Leg Press':                               '레그 프레스',
  'Hack Squat (machine)':                    '핵 스쿼트 (머신)',
  'Bulgarian Split Squat':                   '불가리안 스플릿 스쿼트',
  'SSB Split Squat':                         'SSB 스플릿 스쿼트',
  'Front-Foot Elevated Split Squat':         '앞발 거상 스플릿 스쿼트',
  'Walking Lunge':                           '워킹 런지',
  'Reverse Lunge':                           '리버스 런지',
  'Step-Up':                                 '스텝업',
  'Sissy Squat':                             '시시 스쿼트',
  'Leg Extension':                           '레그 익스텐션',
  'Goblet Squat':                            '고블릿 스쿼트',
  'Box Step-Up':                             '박스 스텝업',
  'Cyclist Squat':                           '사이클리스트 스쿼트',
  'Single-Leg Leg Press':                    '싱글레그 레그 프레스',
  'Hack Squat (narrow)':                     '핵 스쿼트 (내로우)',
  // ── Biceps accessories ────────────────────────────────────────────────────
  'Barbell Curl':                            '바벨 컬',
  'EZ Bar Curl':                             'EZ바 컬',
  'Dumbbell Curl':                           '덤벨 컬',
  'Hammer Curl':                             '해머 컬',
  'Incline DB Curl':                         '인클라인 덤벨 컬',
  'Preacher Curl (EZ/BB)':                   '프리처 컬 (EZ/바벨)',
  'Preacher Curl (DB)':                      '프리처 컬 (덤벨)',
  'Cable Curl':                              '케이블 컬',
  'Spider Curl':                             '스파이더 컬',
  'Zottman Curl':                            '조트만 컬',
  'Concentration Curl':                      '컨센트레이션 컬',
  'Reverse Curl':                            '리버스 컬',
  // ── Core ─────────────────────────────────────────────────────────────────
  'Plank':                                   '플랭크',
  'Side Plank':                              '사이드 플랭크',
  'Ab Wheel Rollout':                        'AB휠 롤아웃',
  'Cable Crunch':                            '케이블 크런치',
  'Decline Sit-Up (weighted)':               '디클라인 싯업 (가중)',
  'Pallof Press':                            '팔로프 프레스',
  'Pallof Press (overhead)':                 '팔로프 프레스 (오버헤드)',
  'Hanging Leg Raise':                       '행잉 레그 레이즈',
  'Lying Leg Raise':                         '라잉 레그 레이즈',
  'Dragon Flag':                             '드래곤 플래그',
  'Landmine Twist':                          '랜드마인 트위스트',
  'GHD Sit-Up':                              'GHD 싯업',
  'Russian Twist':                           '러시안 트위스트',
  'Dead Bug':                                '데드 버그',
  'Bird Dog':                                '버드 독',
  'Farmer\'s Walk':                          '파머스 워크',
  'Yoke Walk':                               '요크 워크',
  'Belt Squat March':                        '벨트 스쿼트 마치',
}

// exerciseName: DB exercise name (or comp lift enum) → Korean label.
// Fallback chain: EXERCISE_NAME → LIFT (comp enums 'squat'/'bench'/'deadlift'
// and legacy lowercase keys like 'leg press') → raw key.
export const exerciseName = (k) => EXERCISE_NAME[k] ?? LIFT[k] ?? k

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
export const stickingLabel = (k, lift) =>
  (lift === 'deadlift' && k === 'bottom') ? '바닥에서 떼기 (off-floor)' : (STICKING[k] ?? k)
export const causeLabel = (k) => CAUSE[k] ?? k
export const stepLabel = (n) => STEP[n] ?? String(n)
export const assessLabel = (k) => ASSESS[k] ?? k
export const schemeLabel = (k) => SCHEME[k] ?? k
export const evidenceLabel = (k) => EVIDENCE[k] ?? k
export const phaseLabel = (k) => PHASE[k] ?? k
export const cueLabel = (k) => CUE[k] ?? k

// ── Lift-logger UI labels (§7 B6) ─────────────────────────────────────────────
// Used by LiftLogRow and App toolbar. Korean strings for the logging→feedback loop.
export const LOG = {
  summary:        '수행 기록',           // <details> summary label
  weightLabel:    '실제 무게',           // weight input label
  repsLabel:      '반복 수',             // reps input label
  rpeLabel:       '실제 RPE',           // RPE select label
  flagLabel:      '통증·중단',           // pain/abort flag checkbox
  logBtn:         '기록',               // submit button
  advisoryPrefix: '다음 세션 권장 탑',   // Tier A advisory prefix
  e1rmBadge:      '추정 1RM',           // Tier B badge prefix
  e1rmSuffix:     '재생성 시 반영',      // Tier B badge suffix
  regenerate:     '기록 반영 재생성',    // toolbar regenerate button
  // Tier B disclosure — shown next to the e1RM badge and in LimitsPanel.
  disclosure:
    '자동조절은 보조 지표입니다. 통증·컨디션은 본인 판단이 우선입니다. ' +
    '1회 기록만으로 부하가 급변하지 않도록 평활(EWMA)·클램프되며, ' +
    '변경은 다음 사이클에만 반영됩니다.',
}
