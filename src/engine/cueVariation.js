// Motor-cue ("feel") deficits → a teaching variation that drills that feel.
// E.g. a lifter who can't feel leg drive / pushing the floor on the deadlift is
// prescribed the Tempo-to-Knees deadlift to groove that cue.
// NOTE: a cue (like a variation override) only takes effect on a lift's VARIATION
// slots. At low frequencies some lifts (e.g. deadlift at 3 days/week) have no
// variation slot, so their cue won't surface until frequency rises.
export const CUE_VARIATIONS = {
  squat: {
    floorDrive: 'Tempo Squat',
    upright: 'Front Squat',
    hipShoot: 'Anderson Squat',
    balance: 'Heel-Elevated Squat',
  },
  bench: {
    chestTouch: 'Paused Bench Press',
    offChest: 'Spoto Press',
    backUsage: 'Larsen Press',
    lockout: 'Close Grip Bench Press',
  },
  deadlift: {
    legDrive: 'Tempo to Knees Deadlift (T2K)',
    hipHinge: 'Halting Deadlift',
    hipShoot: 'Pause Deadlift (below knee)',
    offFloor: 'Deficit Deadlift (conventional)',
    lockout: 'Block Pull (above knee)',
  },
}

export const CUE_KEYS = {
  squat: ['floorDrive', 'upright', 'hipShoot', 'balance'],
  bench: ['chestTouch', 'offChest', 'backUsage', 'lockout'],
  deadlift: ['legDrive', 'hipHinge', 'hipShoot', 'offFloor', 'lockout'],
}

export function cueVariation(lift, cueKey) {
  if (!cueKey) return null
  return (CUE_VARIATIONS[lift] ?? {})[cueKey] ?? null
}
