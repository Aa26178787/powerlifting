const COMP = {
  squat: (s) => (s.bar === 'high' ? 'Back Squat (High Bar)' : 'Back Squat (Low Bar)'),
  deadlift: (s) => (s.stance === 'sumo' ? 'Sumo Deadlift' : 'Conventional Deadlift'),
  bench: () => 'Bench Press (Competition Grip)',
}

const EMPHASIS = {
  'squat:low': { posterior: 1.3, quad: 0.8, hamstrings: 1.2, glutes: 1.2 },
  'squat:high': { quad: 1.3, posterior: 0.8 },
  'deadlift:conventional': { hamstrings: 1.3, posterior: 1.2 },
  'deadlift:sumo': { quad: 1.3, glutes: 1.2, adductors: 1.2, hamstrings: 0.9 },
  'bench:close': { triceps: 1.4, chest: 0.9 },
  'bench:wide': { chest: 1.3, triceps: 0.9 },
  'bench:medium': {},
}

export function compVariant(lift, style) {
  return COMP[lift](style)
}

export function emphasis(lift, style) {
  const key =
    lift === 'squat' ? `squat:${style.bar}` :
    lift === 'deadlift' ? `deadlift:${style.stance}` :
    `bench:${style.grip}`
  return EMPHASIS[key] ?? {}
}
