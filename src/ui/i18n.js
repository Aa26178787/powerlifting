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

export const liftLabel = (k) => LIFT[k] ?? k
export const goalLabel = (k) => GOAL[k] ?? k
export const injuryLabel = (k) => INJURY[k] ?? k
export const equipmentLabel = (k) => EQUIPMENT[k] ?? k
export const templateLabel = (k) => TEMPLATE[k] ?? k
