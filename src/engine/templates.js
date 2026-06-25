export const ROLE = {
  heavy:  { reps: 3, rpeStart: 8 },
  volume: { reps: 6, rpeStart: 7.5 },
  light:  { reps: 5, rpeStart: 7 },
  hyper:  { reps: 10, rpeStart: 7.5 },
}

// A DaySlot = { lift, role }. layouts[daysPerWeek] = Day[]; Day = DaySlot[].
const dupLayouts = {
  3: [
    [{ lift: 'squat', role: 'heavy' }, { lift: 'bench', role: 'heavy' }],
    [{ lift: 'deadlift', role: 'heavy' }, { lift: 'bench', role: 'volume' }],
    [{ lift: 'squat', role: 'volume' }, { lift: 'bench', role: 'light' }],
  ],
  4: [
    [{ lift: 'squat', role: 'heavy' }, { lift: 'bench', role: 'heavy' }],
    [{ lift: 'deadlift', role: 'heavy' }, { lift: 'bench', role: 'volume' }],
    [{ lift: 'squat', role: 'volume' }, { lift: 'bench', role: 'light' }],
    [{ lift: 'deadlift', role: 'volume' }, { lift: 'bench', role: 'heavy' }],
  ],
  5: [
    [{ lift: 'squat', role: 'heavy' }, { lift: 'bench', role: 'heavy' }],
    [{ lift: 'deadlift', role: 'heavy' }],
    [{ lift: 'squat', role: 'volume' }, { lift: 'bench', role: 'volume' }],
    [{ lift: 'deadlift', role: 'volume' }, { lift: 'bench', role: 'light' }],
    [{ lift: 'squat', role: 'light' }, { lift: 'bench', role: 'heavy' }],
  ],
  6: [
    [{ lift: 'squat', role: 'heavy' }, { lift: 'bench', role: 'heavy' }],
    [{ lift: 'deadlift', role: 'heavy' }, { lift: 'bench', role: 'volume' }],
    [{ lift: 'squat', role: 'volume' }],
    [{ lift: 'bench', role: 'light' }, { lift: 'deadlift', role: 'volume' }],
    [{ lift: 'squat', role: 'light' }],
    [{ lift: 'bench', role: 'heavy' }],
  ],
}

const linearLayouts = {
  3: [
    [{ lift: 'squat', role: 'heavy' }, { lift: 'bench', role: 'heavy' }],
    [{ lift: 'squat', role: 'light' }, { lift: 'bench', role: 'heavy' }, { lift: 'deadlift', role: 'heavy' }],
    [{ lift: 'squat', role: 'heavy' }, { lift: 'bench', role: 'heavy' }],
  ],
  4: [
    [{ lift: 'squat', role: 'heavy' }, { lift: 'bench', role: 'heavy' }],
    [{ lift: 'squat', role: 'light' }, { lift: 'bench', role: 'heavy' }, { lift: 'deadlift', role: 'heavy' }],
    [{ lift: 'squat', role: 'heavy' }, { lift: 'bench', role: 'heavy' }],
    [{ lift: 'squat', role: 'light' }, { lift: 'bench', role: 'heavy' }, { lift: 'deadlift', role: 'volume' }],
  ],
  5: [
    [{ lift: 'squat', role: 'heavy' }, { lift: 'bench', role: 'heavy' }],
    [{ lift: 'bench', role: 'heavy' }, { lift: 'deadlift', role: 'heavy' }],
    [{ lift: 'squat', role: 'light' }, { lift: 'bench', role: 'heavy' }],
    [{ lift: 'squat', role: 'heavy' }, { lift: 'bench', role: 'heavy' }, { lift: 'deadlift', role: 'volume' }],
    [{ lift: 'bench', role: 'heavy' }],
  ],
  6: [
    [{ lift: 'squat', role: 'heavy' }, { lift: 'bench', role: 'heavy' }],
    [{ lift: 'bench', role: 'heavy' }, { lift: 'deadlift', role: 'heavy' }],
    [{ lift: 'squat', role: 'light' }, { lift: 'bench', role: 'heavy' }],
    [{ lift: 'squat', role: 'heavy' }, { lift: 'bench', role: 'heavy' }],
    [{ lift: 'bench', role: 'heavy' }, { lift: 'deadlift', role: 'volume' }],
    [{ lift: 'squat', role: 'light' }, { lift: 'bench', role: 'heavy' }],
  ],
}

const fiveThreeOneLayouts = {
  3: [
    [{ lift: 'squat', role: 'heavy' }, { lift: 'bench', role: 'volume' }],
    [{ lift: 'deadlift', role: 'heavy' }, { lift: 'bench', role: 'heavy' }],
    [{ lift: 'squat', role: 'volume' }, { lift: 'bench', role: 'heavy' }],
  ],
  4: [
    [{ lift: 'squat', role: 'heavy' }],
    [{ lift: 'bench', role: 'heavy' }],
    [{ lift: 'deadlift', role: 'heavy' }],
    [{ lift: 'bench', role: 'volume' }],
  ],
}

const highFreqLayouts = {
  5: dupLayouts[5],
  6: dupLayouts[6],
}

const hyperLayouts = {
  3: [
    [{ lift: 'squat', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'deadlift', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'squat', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
  ],
  4: [
    [{ lift: 'squat', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'deadlift', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'squat', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'deadlift', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
  ],
  5: [
    [{ lift: 'squat', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'deadlift', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'squat', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'deadlift', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'squat', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
  ],
  6: [
    [{ lift: 'squat', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'deadlift', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'squat', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'deadlift', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'squat', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
    [{ lift: 'deadlift', role: 'hyper' }, { lift: 'bench', role: 'hyper' }],
  ],
}

export const TEMPLATES = {
  linearLP: { key: 'linearLP', name: 'Linear Progression', goals: ['strength', 'balanced'], layouts: linearLayouts },
  fiveThreeOne: { key: 'fiveThreeOne', name: '5/3/1-style', goals: ['strength'], layouts: fiveThreeOneLayouts },
  dup: { key: 'dup', name: 'Daily Undulating', goals: ['strength', 'balanced'], layouts: dupLayouts },
  highFreqPct: { key: 'highFreqPct', name: 'High Frequency', goals: ['strength'], layouts: highFreqLayouts },
  hypertrophyBlock: { key: 'hypertrophyBlock', name: 'Hypertrophy Block', goals: ['hypertrophy'], layouts: hyperLayouts },
}

export function getTemplate(key) {
  const t = TEMPLATES[key]
  if (!t) throw new Error(`unknown template: ${key}`)
  return t
}

export function slotTypeForRole(role) {
  return role === 'heavy' ? 'comp' : 'variation'
}
