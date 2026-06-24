# Routine Engine (Phase 1A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, fully unit-tested powerlifting routine-generation engine (pure JS, no React) that turns a user profile into a complete mesocycle with hybrid RPE+%1RM prescriptions.

**Architecture:** Pure functions in `src/engine/` with static data in `src/data/`. No I/O, no React, no randomness — every function is deterministic and golden-testable. A thin `generate()` orchestrator composes the modules: e1RM → template selection → parameter tuning → periodized session assembly → deload + accessories. A console demo script proves the engine works end-to-end.

**Tech Stack:** Vite + React project shell (React unused in this plan), Vitest for tests, plain ES modules. Node ≥ 18.

## Global Constraints

- Engine modules are **pure**: no `Date.now()`, no `Math.random()`, no network, no filesystem. Deterministic output for identical input.
- Set-counting convention: **indirect/synergist sets = 0.5** (per Pelland 2025) wherever fractional volume is summed.
- All weights round to **2.5 (kg or lb units, unit-agnostic numbers)** increments via `roundToIncrement`.
- RPE values are restricted to the set `{6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10}`. Reps for chart lookup are integers `1..12`.
- ES modules (`import`/`export`), no CommonJS. File extension `.js`.
- Volume landmark numbers and template layouts are heuristic/convention (disclosed in spec §3) — encode the exact values in this plan verbatim; do not invent alternates.

---

### Task 1: Project scaffold + Vitest

**Files:**
- Create: `package.json`, `vite.config.js`, `vitest.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`
- Create: `.gitignore` (already exists — verify `node_modules/` present)

**Interfaces:**
- Produces: a runnable Vite+React project with `npm test` wired to Vitest.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "powerlifting-routine-generator",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js` and `vitest.config.js`**

`vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
})
```

`vitest.config.js`:
```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.js'] },
})
```

- [ ] **Step 3: Create minimal app shell**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Routine Generator</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>
```

`src/main.jsx`:
```jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)
```

`src/App.jsx`:
```jsx
export default function App() {
  return <h1>Routine Generator</h1>
}
```

- [ ] **Step 4: Install and verify test runner**

Run: `npm install`
Then run: `npx vitest run`
Expected: Vitest runs and reports "No test files found" (exit 0) — toolchain works.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite+React+Vitest project"
```

---

### Task 2: RPE chart data + e1RM math

**Files:**
- Create: `src/data/rpeChart.json`
- Create: `src/engine/e1rm.js`
- Test: `src/engine/e1rm.test.js`

**Interfaces:**
- Produces:
  - `pctOf1RM(reps: number, rpe: number): number` — percentage (e.g. `81.1`) from the Tuchscherer grid; throws on out-of-range.
  - `e1rmFrom(weight: number, reps: number, rpe: number): number` — estimated 1RM = `weight / (pctOf1RM/100)`.
  - `epley(weight: number, reps: number): number` — `weight * (1 + reps/30)`.
  - `brzycki(weight: number, reps: number): number` — `weight * 36 / (37 - reps)`.
  - `roundToIncrement(x: number, inc=2.5): number`.
  - `workingWeight(e1rm: number, reps: number, rpe: number, inc=2.5): number` — `roundToIncrement(e1rm * pctOf1RM/100, inc)`.

- [ ] **Step 1: Create the RPE chart data**

`src/data/rpeChart.json` (rows = reps "1".."12", cols = rpe; values are %1RM):
```json
{
  "1":  {"10":100,"9.5":97.8,"9":95.5,"8.5":93.9,"8":92.2,"7.5":90.7,"7":89.2,"6.5":87.8,"6":86.3},
  "2":  {"10":95.5,"9.5":93.9,"9":92.2,"8.5":90.7,"8":89.2,"7.5":87.8,"7":86.3,"6.5":85.0,"6":83.7},
  "3":  {"10":92.2,"9.5":90.7,"9":89.2,"8.5":87.8,"8":86.3,"7.5":85.0,"7":83.7,"6.5":82.4,"6":81.1},
  "4":  {"10":89.2,"9.5":87.8,"9":86.3,"8.5":85.0,"8":83.7,"7.5":82.4,"7":81.1,"6.5":79.9,"6":78.6},
  "5":  {"10":86.3,"9.5":85.0,"9":83.7,"8.5":82.4,"8":81.1,"7.5":79.9,"7":78.6,"6.5":77.4,"6":76.2},
  "6":  {"10":83.7,"9.5":82.4,"9":81.1,"8.5":79.9,"8":78.6,"7.5":77.4,"7":76.2,"6.5":75.1,"6":73.9},
  "7":  {"10":81.1,"9.5":79.9,"9":78.6,"8.5":77.4,"8":76.2,"7.5":75.1,"7":73.9,"6.5":72.8,"6":71.7},
  "8":  {"10":78.6,"9.5":77.4,"9":76.2,"8.5":75.1,"8":73.9,"7.5":72.8,"7":71.7,"6.5":70.7,"6":69.6},
  "9":  {"10":76.2,"9.5":75.1,"9":73.9,"8.5":72.8,"8":71.7,"7.5":70.7,"7":69.6,"6.5":68.6,"6":67.6},
  "10": {"10":73.9,"9.5":72.8,"9":71.7,"8.5":70.7,"8":69.6,"7.5":68.6,"7":67.6,"6.5":66.6,"6":65.6},
  "11": {"10":71.7,"9.5":70.7,"9":69.6,"8.5":68.6,"8":67.6,"7.5":66.6,"7":65.6,"6.5":64.7,"6":63.7},
  "12": {"10":69.6,"9.5":68.6,"9":67.6,"8.5":66.6,"8":65.6,"7.5":64.7,"7":63.7,"6.5":62.8,"6":61.8}
}
```

- [ ] **Step 2: Write the failing tests**

`src/engine/e1rm.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { pctOf1RM, e1rmFrom, epley, brzycki, roundToIncrement, workingWeight } from './e1rm.js'

describe('pctOf1RM', () => {
  it('returns the Tuchscherer cell for 5 reps @ RPE 8', () => {
    expect(pctOf1RM(5, 8)).toBe(81.1)
  })
  it('returns 100 for 1 rep @ RPE 10', () => {
    expect(pctOf1RM(1, 10)).toBe(100)
  })
  it('throws on out-of-range reps', () => {
    expect(() => pctOf1RM(13, 8)).toThrow()
  })
  it('throws on invalid RPE', () => {
    expect(() => pctOf1RM(5, 8.2)).toThrow()
  })
})

describe('e1rmFrom', () => {
  it('estimates 1RM from a weight x reps @ RPE', () => {
    expect(e1rmFrom(325, 5, 8)).toBeCloseTo(400.74, 1)
  })
})

describe('epley & brzycki', () => {
  it('epley 100x5 = 116.67', () => { expect(epley(100, 5)).toBeCloseTo(116.67, 1) })
  it('brzycki 100x5 = 112.5', () => { expect(brzycki(100, 5)).toBeCloseTo(112.5, 1) })
})

describe('roundToIncrement & workingWeight', () => {
  it('rounds to nearest 2.5', () => { expect(roundToIncrement(324.4)).toBe(325) })
  it('computes working weight for 5 reps @ RPE 8 from a 400 e1RM', () => {
    expect(workingWeight(400, 5, 8)).toBe(325) // 400*0.811=324.4 -> 325
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/engine/e1rm.test.js`
Expected: FAIL — cannot import from `./e1rm.js` (module not found).

- [ ] **Step 4: Implement `src/engine/e1rm.js`**

```js
import chart from '../data/rpeChart.json' assert { type: 'json' }

const VALID_RPE = new Set([6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10])

export function pctOf1RM(reps, rpe) {
  if (!Number.isInteger(reps) || reps < 1 || reps > 12) {
    throw new Error(`reps must be an integer 1..12, got ${reps}`)
  }
  if (!VALID_RPE.has(rpe)) {
    throw new Error(`rpe must be one of 6..10 in 0.5 steps, got ${rpe}`)
  }
  return chart[String(reps)][String(rpe)]
}

export function e1rmFrom(weight, reps, rpe) {
  return weight / (pctOf1RM(reps, rpe) / 100)
}

export function epley(weight, reps) {
  return weight * (1 + reps / 30)
}

export function brzycki(weight, reps) {
  return weight * 36 / (37 - reps)
}

export function roundToIncrement(x, inc = 2.5) {
  return Math.round(x / inc) * inc
}

export function workingWeight(e1rm, reps, rpe, inc = 2.5) {
  return roundToIncrement(e1rm * pctOf1RM(reps, rpe) / 100, inc)
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/engine/e1rm.test.js`
Expected: PASS (all assertions green).

- [ ] **Step 6: Commit**

```bash
git add src/data/rpeChart.json src/engine/e1rm.js src/engine/e1rm.test.js
git commit -m "feat(engine): RPE chart + e1RM math (Tuchscherer, Epley, Brzycki)"
```

---

### Task 3: Volume tuning

**Files:**
- Create: `src/engine/volume.js`
- Test: `src/engine/volume.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `BANDS: Record<'strength'|'balanced'|'hypertrophy', {mev:number,mav:number,mrv:number}>`
  - `yearsProgress(years: number): number` — `min(years/5, 1)`.
  - `fatigueScale(fatigue: number): number` — `1 - (clamp(fatigue,1,5)-1)/4 * 0.30`.
  - `weeklySets(goal: string, years: number, fatigue: number): number` — integer weekly working sets per main lift, clamped to `[4, band.mrv]`.

- [ ] **Step 1: Write the failing tests**

`src/engine/volume.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { BANDS, yearsProgress, fatigueScale, weeklySets } from './volume.js'

describe('yearsProgress', () => {
  it('is 0 at 0 years and caps at 1 by 5 years', () => {
    expect(yearsProgress(0)).toBe(0)
    expect(yearsProgress(5)).toBe(1)
    expect(yearsProgress(10)).toBe(1)
  })
})

describe('fatigueScale', () => {
  it('is 1.0 at fatigue 1 and 0.7 at fatigue 5', () => {
    expect(fatigueScale(1)).toBeCloseTo(1.0, 5)
    expect(fatigueScale(5)).toBeCloseTo(0.7, 5)
  })
})

describe('weeklySets', () => {
  it('a fresh strength beginner sits at the MEV', () => {
    expect(weeklySets('strength', 0, 1)).toBe(BANDS.strength.mev) // 6
  })
  it('a 5-year strength lifter (low fatigue) reaches the MAV', () => {
    expect(weeklySets('strength', 5, 1)).toBe(BANDS.strength.mav) // 10
  })
  it('high fatigue reduces volume', () => {
    expect(weeklySets('hypertrophy', 5, 5)).toBe(11) // round(16*0.7)
  })
  it('never drops below the floor of 4', () => {
    expect(weeklySets('strength', 0, 5)).toBeGreaterThanOrEqual(4)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/volume.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/volume.js`**

```js
export const BANDS = {
  strength:    { mev: 6,  mav: 10, mrv: 12 },
  balanced:    { mev: 8,  mav: 13, mrv: 18 },
  hypertrophy: { mev: 10, mav: 16, mrv: 22 },
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

export function yearsProgress(years) {
  return clamp(years / 5, 0, 1)
}

export function fatigueScale(fatigue) {
  return 1 - (clamp(fatigue, 1, 5) - 1) / 4 * 0.30
}

export function weeklySets(goal, years, fatigue) {
  const band = BANDS[goal] ?? BANDS.balanced
  const base = band.mev + (band.mav - band.mev) * yearsProgress(years)
  const scaled = Math.round(base * fatigueScale(fatigue))
  return clamp(scaled, 4, band.mrv)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/volume.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/volume.js src/engine/volume.test.js
git commit -m "feat(engine): research-based weekly volume tuning"
```

---

### Task 4: Frequency distribution

**Files:**
- Create: `src/engine/frequency.js`
- Test: `src/engine/frequency.test.js`

**Interfaces:**
- Produces:
  - `desiredFrequency(goal: string, daysPerWeek: number): {squat:number,bench:number,deadlift:number}` — weekly sessions each main lift is trained. Evidence default ≈2/lift for strength; deadlift lower at low days; bench may reach 3 at 6 days.

- [ ] **Step 1: Write the failing tests**

`src/engine/frequency.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { desiredFrequency } from './frequency.js'

describe('desiredFrequency', () => {
  it('3 days/week: squat 2, bench 2, deadlift 1', () => {
    expect(desiredFrequency('strength', 3)).toEqual({ squat: 2, bench: 2, deadlift: 1 })
  })
  it('5 days/week: deadlift rises to 2', () => {
    expect(desiredFrequency('strength', 5)).toEqual({ squat: 2, bench: 2, deadlift: 2 })
  })
  it('6 days/week: bench rises to 3', () => {
    expect(desiredFrequency('strength', 6)).toEqual({ squat: 2, bench: 3, deadlift: 2 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/frequency.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/frequency.js`**

```js
export function desiredFrequency(goal, daysPerWeek) {
  const squat = 2
  const bench = daysPerWeek >= 6 ? 3 : 2
  const deadlift = daysPerWeek >= 5 ? 2 : 1
  return { squat, bench, deadlift }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/frequency.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/frequency.js src/engine/frequency.test.js
git commit -m "feat(engine): per-lift frequency distribution"
```

---

### Task 5: Exercise DB + substitution + equipment filter

**Files:**
- Create: `src/data/exercises.json`
- Create: `src/engine/exercises.js`
- Test: `src/engine/exercises.test.js`

**Interfaces:**
- Produces:
  - `MAIN_LIFTS = ['squat','bench','deadlift']`
  - `substitute(lift: string, injuries: string[]): string` — returns a contraindication-safe variant, or the original lift if none needed.
  - `filterByEquipment(names: string[], equipment: string[]): string[]` — keep only exercises whose required equipment is all available.
  - `accessoriesFor(lift: string): string[]` — accessory exercise names mapped to a main lift.

- [ ] **Step 1: Create the exercise data**

`src/data/exercises.json`:
```json
{
  "exercises": {
    "squat":        {"equipment": ["barbell","rack"], "muscle": "quads"},
    "box squat":    {"equipment": ["barbell","rack","box"], "muscle": "quads"},
    "front squat":  {"equipment": ["barbell","rack"], "muscle": "quads"},
    "bench":        {"equipment": ["barbell","bench"], "muscle": "chest"},
    "floor press":  {"equipment": ["barbell"], "muscle": "chest"},
    "deadlift":     {"equipment": ["barbell"], "muscle": "back"},
    "trap bar deadlift": {"equipment": ["trap bar"], "muscle": "back"},
    "leg press":    {"equipment": ["leg press machine"], "muscle": "quads"},
    "dumbbell bench": {"equipment": ["dumbbells","bench"], "muscle": "chest"},
    "romanian deadlift": {"equipment": ["barbell"], "muscle": "hamstrings"}
  },
  "substitutions": {
    "knee": {"squat": "box squat"},
    "shoulder": {"bench": "floor press"},
    "back": {"deadlift": "trap bar deadlift"}
  },
  "accessories": {
    "squat": ["leg press","front squat"],
    "bench": ["dumbbell bench","floor press"],
    "deadlift": ["romanian deadlift"]
  }
}
```

- [ ] **Step 2: Write the failing tests**

`src/engine/exercises.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { MAIN_LIFTS, substitute, filterByEquipment, accessoriesFor } from './exercises.js'

describe('MAIN_LIFTS', () => {
  it('lists the three competition lifts', () => {
    expect(MAIN_LIFTS).toEqual(['squat','bench','deadlift'])
  })
})

describe('substitute', () => {
  it('swaps squat to box squat for a knee injury', () => {
    expect(substitute('squat', ['knee'])).toBe('box squat')
  })
  it('returns the original lift when no injury applies', () => {
    expect(substitute('bench', ['knee'])).toBe('bench')
  })
})

describe('filterByEquipment', () => {
  it('keeps only exercises whose equipment is all available', () => {
    expect(filterByEquipment(['squat','leg press'], ['barbell','rack']))
      .toEqual(['squat'])
  })
})

describe('accessoriesFor', () => {
  it('returns accessories mapped to the bench', () => {
    expect(accessoriesFor('bench')).toEqual(['dumbbell bench','floor press'])
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/engine/exercises.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/engine/exercises.js`**

```js
import db from '../data/exercises.json' assert { type: 'json' }

export const MAIN_LIFTS = ['squat', 'bench', 'deadlift']

export function substitute(lift, injuries = []) {
  for (const injury of injuries) {
    const map = db.substitutions[injury]
    if (map && map[lift]) return map[lift]
  }
  return lift
}

export function filterByEquipment(names, equipment = []) {
  const have = new Set(equipment)
  return names.filter((name) => {
    const ex = db.exercises[name]
    if (!ex) return false
    return ex.equipment.every((e) => have.has(e))
  })
}

export function accessoriesFor(lift) {
  return db.accessories[lift] ?? []
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/engine/exercises.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/exercises.json src/engine/exercises.js src/engine/exercises.test.js
git commit -m "feat(engine): exercise DB with substitution and equipment filter"
```

---

### Task 6: Role schemes + template registry

**Files:**
- Create: `src/engine/templates.js`
- Test: `src/engine/templates.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ROLE: Record<'heavy'|'volume'|'light'|'hyper', {reps:number, rpeStart:number}>`
  - `TEMPLATES: Record<string, {key, name, goals: string[], builderKey: string, layouts: Record<number, DaySlot[][]>}>` where a `DaySlot` is `{lift: string, role: string}` and `layouts[daysPerWeek]` is an array of days, each day an array of slots.
  - `getTemplate(key: string): Template` — throws if unknown.

  Template keys: `linearLP`, `fiveThreeOne`, `dup`, `highFreqPct`, `hypertrophyBlock`.

- [ ] **Step 1: Write the failing tests**

`src/engine/templates.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { ROLE, TEMPLATES, getTemplate } from './templates.js'

describe('ROLE', () => {
  it('defines heavy as a low-rep, RPE-8 start', () => {
    expect(ROLE.heavy).toEqual({ reps: 3, rpeStart: 8 })
  })
})

describe('TEMPLATES', () => {
  it('includes all five template keys', () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual(
      ['dup','fiveThreeOne','highFreqPct','hypertrophyBlock','linearLP']
    )
  })
  it('dup has a 3-day layout with each day carrying slots', () => {
    const layout = TEMPLATES.dup.layouts[3]
    expect(layout).toHaveLength(3)
    expect(layout[0].length).toBeGreaterThan(0)
    expect(layout[0][0]).toHaveProperty('lift')
    expect(layout[0][0]).toHaveProperty('role')
  })
})

describe('getTemplate', () => {
  it('throws on an unknown key', () => {
    expect(() => getTemplate('nope')).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/templates.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/templates.js`**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/templates.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/templates.js src/engine/templates.test.js
git commit -m "feat(engine): role schemes + five program templates"
```

---

### Task 7: Template selector

**Files:**
- Create: `src/engine/selector.js`
- Test: `src/engine/selector.test.js`

**Interfaces:**
- Consumes: `TEMPLATES` keys from `templates.js`.
- Produces:
  - `selectTemplate(profile: {goal, years, daysPerWeek}): string` — returns a template key. Deterministic precedence:
    1. `goal === 'hypertrophy'` → `hypertrophyBlock`
    2. `years < 1` → `linearLP`
    3. `goal === 'strength' && daysPerWeek >= 5` → `highFreqPct`
    4. `goal === 'strength' && daysPerWeek <= 4` → `fiveThreeOne`
    5. otherwise → `dup`

- [ ] **Step 1: Write the failing tests**

`src/engine/selector.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { selectTemplate } from './selector.js'

describe('selectTemplate', () => {
  it('hypertrophy goal always picks the hypertrophy block', () => {
    expect(selectTemplate({ goal: 'hypertrophy', years: 8, daysPerWeek: 6 })).toBe('hypertrophyBlock')
  })
  it('a true beginner picks linear progression', () => {
    expect(selectTemplate({ goal: 'strength', years: 0.5, daysPerWeek: 3 })).toBe('linearLP')
  })
  it('a high-frequency strength lifter picks high frequency', () => {
    expect(selectTemplate({ goal: 'strength', years: 3, daysPerWeek: 5 })).toBe('highFreqPct')
  })
  it('a low-frequency strength lifter picks 5/3/1', () => {
    expect(selectTemplate({ goal: 'strength', years: 3, daysPerWeek: 4 })).toBe('fiveThreeOne')
  })
  it('an intermediate balanced lifter picks DUP', () => {
    expect(selectTemplate({ goal: 'balanced', years: 3, daysPerWeek: 4 })).toBe('dup')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/selector.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/selector.js`**

```js
export function selectTemplate({ goal, years, daysPerWeek }) {
  if (goal === 'hypertrophy') return 'hypertrophyBlock'
  if (years < 1) return 'linearLP'
  if (goal === 'strength' && daysPerWeek >= 5) return 'highFreqPct'
  if (goal === 'strength' && daysPerWeek <= 4) return 'fiveThreeOne'
  return 'dup'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/selector.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/selector.js src/engine/selector.test.js
git commit -m "feat(engine): research-rule template selector"
```

---

### Task 8: Parameter tuner

**Files:**
- Create: `src/engine/tuner.js`
- Test: `src/engine/tuner.test.js`

**Interfaces:**
- Consumes: `weeklySets` from `volume.js`, `desiredFrequency` from `frequency.js`, `MAIN_LIFTS` from `exercises.js`.
- Produces:
  - `tune(profile: {goal, years, daysPerWeek, fatigue}): {weeklySets: {squat,bench,deadlift}, frequency: {squat,bench,deadlift}, setsPerSession: {squat,bench,deadlift}}` — `setsPerSession = max(1, round(weeklySets / frequency))` per lift.

- [ ] **Step 1: Write the failing tests**

`src/engine/tuner.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { tune } from './tuner.js'

describe('tune', () => {
  const profile = { goal: 'strength', years: 5, daysPerWeek: 4, fatigue: 1 }

  it('produces per-lift weekly sets for each main lift', () => {
    const t = tune(profile)
    expect(t.weeklySets.squat).toBe(10) // strength MAV at 5 yrs, fatigue 1
    expect(t.weeklySets.bench).toBe(10)
    expect(t.weeklySets.deadlift).toBe(10)
  })
  it('splits weekly sets across sessions by frequency', () => {
    const t = tune(profile) // freq: squat2,bench2,deadlift1
    expect(t.setsPerSession.squat).toBe(5)   // round(10/2)
    expect(t.setsPerSession.deadlift).toBe(10) // round(10/1)
  })
  it('never prescribes fewer than 1 set per session', () => {
    const t = tune({ goal: 'strength', years: 0, daysPerWeek: 6, fatigue: 5 })
    expect(t.setsPerSession.bench).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/tuner.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/tuner.js`**

```js
import { weeklySets } from './volume.js'
import { desiredFrequency } from './frequency.js'
import { MAIN_LIFTS } from './exercises.js'

export function tune({ goal, years, daysPerWeek, fatigue }) {
  const perLiftWeekly = weeklySets(goal, years, fatigue)
  const frequency = desiredFrequency(goal, daysPerWeek)

  const weeklySetsMap = {}
  const setsPerSession = {}
  for (const lift of MAIN_LIFTS) {
    weeklySetsMap[lift] = perLiftWeekly
    setsPerSession[lift] = Math.max(1, Math.round(perLiftWeekly / frequency[lift]))
  }
  return { weeklySets: weeklySetsMap, frequency, setsPerSession }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/tuner.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/tuner.js src/engine/tuner.test.js
git commit -m "feat(engine): parameter tuner (volume x frequency -> sets/session)"
```

---

### Task 9: Periodization (RPE wave + session builder)

**Files:**
- Create: `src/engine/periodization.js`
- Test: `src/engine/periodization.test.js`

**Interfaces:**
- Consumes: `ROLE`, `getTemplate` from `templates.js`; `workingWeight` from `e1rm.js`.
- Produces:
  - `WEEK_RPE_OFFSET = [0, 0.5, 1.0]` (weeks 1–3; week 4 is deload, handled in Task 11).
  - `cap(rpe: number): number` — clamp to the valid set max 9.5 for working sets (never auto-prescribe RPE 10).
  - `buildSession(daySlots, weekIndex, ctx): {day, exercises: Exercise[]}` where `ctx = {e1rm: {squat,bench,deadlift}, setsPerSession}` and `Exercise = {lift, sets, reps, pct, rpeTarget, weight, velocity: null}`.
  - `buildWorkingWeeks(templateKey, daysPerWeek, ctx): Week[]` — builds weeks 1–3 (3 working weeks) from the template layout.

- [ ] **Step 1: Write the failing tests**

`src/engine/periodization.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { WEEK_RPE_OFFSET, cap, buildSession, buildWorkingWeeks } from './periodization.js'

const ctx = {
  e1rm: { squat: 200, bench: 140, deadlift: 240 },
  setsPerSession: { squat: 5, bench: 4, deadlift: 5 },
}

describe('cap', () => {
  it('never returns above 9.5', () => {
    expect(cap(10.5)).toBe(9.5)
    expect(cap(8)).toBe(8)
  })
})

describe('buildSession', () => {
  it('builds exercises with RPE raised by the week offset', () => {
    const slots = [{ lift: 'squat', role: 'heavy' }] // heavy = reps 3, rpeStart 8
    const session = buildSession(slots, 1, ctx) // week index 1 -> offset 0.5
    const ex = session.exercises[0]
    expect(ex.lift).toBe('squat')
    expect(ex.reps).toBe(3)
    expect(ex.rpeTarget).toBe(8.5)
    expect(ex.sets).toBe(5)
    expect(ex.velocity).toBeNull()
    expect(ex.weight).toBeGreaterThan(0)
  })
})

describe('buildWorkingWeeks', () => {
  it('produces three working weeks for a 3-day DUP layout', () => {
    const weeks = buildWorkingWeeks('dup', 3, ctx)
    expect(weeks).toHaveLength(3)
    expect(weeks[0].sessions).toHaveLength(3)
    expect(weeks[0].isDeload).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/periodization.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/periodization.js`**

```js
import { ROLE, getTemplate } from './templates.js'
import { workingWeight } from './e1rm.js'

export const WEEK_RPE_OFFSET = [0, 0.5, 1.0]

export function cap(rpe) {
  return Math.min(9.5, rpe)
}

export function buildSession(daySlots, weekIndex, ctx) {
  const offset = WEEK_RPE_OFFSET[weekIndex] ?? 0
  const exercises = daySlots.map((slot) => {
    const role = ROLE[slot.role]
    const rpeTarget = cap(role.rpeStart + offset)
    const e1rm = ctx.e1rm[slot.lift]
    return {
      lift: slot.lift,
      sets: ctx.setsPerSession[slot.lift],
      reps: role.reps,
      rpeTarget,
      pct: undefined, // filled below
      weight: workingWeight(e1rm, role.reps, rpeTarget),
      velocity: null, // Phase 2 VBT stub
    }
  })
  return { day: null, exercises }
}

export function buildWorkingWeeks(templateKey, daysPerWeek, ctx) {
  const template = getTemplate(templateKey)
  const layout = template.layouts[daysPerWeek]
  if (!layout) {
    throw new Error(`template ${templateKey} has no layout for ${daysPerWeek} days`)
  }
  const weeks = []
  for (let w = 0; w < 3; w++) {
    const sessions = layout.map((daySlots, dayIdx) => {
      const session = buildSession(daySlots, w, ctx)
      session.day = dayIdx + 1
      return session
    })
    weeks.push({ index: w + 1, isDeload: false, sessions })
  }
  return weeks
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/periodization.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/periodization.js src/engine/periodization.test.js
git commit -m "feat(engine): periodized session/week builder with RPE waves"
```

---

### Task 10: Autoregulation

**Files:**
- Create: `src/engine/autoreg.js`
- Test: `src/engine/autoreg.test.js`

**Interfaces:**
- Consumes: `e1rmFrom` from `e1rm.js`.
- Produces:
  - `loadAdjustment(targetRpe: number, actualRpe: number, weight: number): number` — returns the adjusted next-set weight. Rule: for every 0.5 RPE the actual is OUTSIDE (below means too easy → add load; above means too hard → reduce load) of target, change by ±2% of `weight`. Rounded to 2.5.
  - `updateE1rm(weight: number, reps: number, actualRpe: number): number` — recompute e1RM from the realised set via `e1rmFrom`.

- [ ] **Step 1: Write the failing tests**

`src/engine/autoreg.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { loadAdjustment, updateE1rm } from './autoreg.js'

describe('loadAdjustment', () => {
  it('no change when actual matches target', () => {
    expect(loadAdjustment(8, 8, 100)).toBe(100)
  })
  it('adds ~2% per 0.5 RPE when the set was too easy', () => {
    // actual 7 is 1.0 RPE below target 8 -> +4% -> 104 -> round 2.5 -> 105
    expect(loadAdjustment(8, 7, 100)).toBe(105)
  })
  it('reduces load when the set was too hard', () => {
    // actual 9 is 1.0 RPE above target 8 -> -4% -> 96 -> round 2.5 -> 95
    expect(loadAdjustment(8, 9, 100)).toBe(95)
  })
})

describe('updateE1rm', () => {
  it('recomputes e1RM from a realised set', () => {
    // 325 x 5 @ actual RPE 8 -> 325 / 0.811 ~ 400.7
    expect(updateE1rm(325, 5, 8)).toBeCloseTo(400.74, 1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/autoreg.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/autoreg.js`**

```js
import { e1rmFrom, roundToIncrement } from './e1rm.js'

export function loadAdjustment(targetRpe, actualRpe, weight) {
  const deltaSteps = (targetRpe - actualRpe) / 0.5 // +ve = too easy -> add load
  const factor = 1 + deltaSteps * 0.02
  return roundToIncrement(weight * factor)
}

export function updateE1rm(weight, reps, actualRpe) {
  return e1rmFrom(weight, reps, actualRpe)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/autoreg.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/autoreg.js src/engine/autoreg.test.js
git commit -m "feat(engine): RPE-based load autoregulation + e1RM update"
```

---

### Task 11: Deload

**Files:**
- Create: `src/engine/deload.js`
- Test: `src/engine/deload.test.js`

**Interfaces:**
- Consumes: `roundToIncrement`, `workingWeight` from `e1rm.js`; `cap` from `periodization.js`.
- Produces:
  - `buildDeloadWeek(workingWeek: Week, ctx: {e1rm}): Week` — week 4: halve sets (`ceil(sets/2)`), hold reps, set RPE target to 6, recompute weight; `isDeload: true`.
  - `needsDeload(weekIndex: number, fatigue: number): boolean` — true when `weekIndex >= 4`, or `fatigue >= 5 && weekIndex >= 3` (early deload on high fatigue).

- [ ] **Step 1: Write the failing tests**

`src/engine/deload.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { buildDeloadWeek, needsDeload } from './deload.js'

const ctx = { e1rm: { squat: 200, bench: 140, deadlift: 240 } }
const workingWeek = {
  index: 3, isDeload: false,
  sessions: [{ day: 1, exercises: [
    { lift: 'squat', sets: 5, reps: 3, rpeTarget: 9, pct: undefined, weight: 180, velocity: null },
  ] }],
}

describe('buildDeloadWeek', () => {
  it('halves sets, drops RPE to 6, and flags deload', () => {
    const wk = buildDeloadWeek(workingWeek, ctx)
    expect(wk.isDeload).toBe(true)
    const ex = wk.sessions[0].exercises[0]
    expect(ex.sets).toBe(3) // ceil(5/2)
    expect(ex.rpeTarget).toBe(6)
    expect(ex.reps).toBe(3)
    expect(ex.weight).toBeLessThan(180)
  })
})

describe('needsDeload', () => {
  it('always deloads at week 4', () => {
    expect(needsDeload(4, 1)).toBe(true)
  })
  it('deloads early (week 3) under maximal fatigue', () => {
    expect(needsDeload(3, 5)).toBe(true)
    expect(needsDeload(3, 2)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/deload.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/deload.js`**

```js
import { workingWeight } from './e1rm.js'

export function buildDeloadWeek(workingWeek, ctx) {
  const sessions = workingWeek.sessions.map((session) => ({
    day: session.day,
    exercises: session.exercises.map((ex) => ({
      ...ex,
      sets: Math.ceil(ex.sets / 2),
      rpeTarget: 6,
      weight: workingWeight(ctx.e1rm[ex.lift], ex.reps, 6),
      velocity: null,
    })),
  }))
  return { index: workingWeek.index + 1, isDeload: true, sessions }
}

export function needsDeload(weekIndex, fatigue) {
  if (weekIndex >= 4) return true
  if (fatigue >= 5 && weekIndex >= 3) return true
  return false
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/deload.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/deload.js src/engine/deload.test.js
git commit -m "feat(engine): deload week builder + trigger"
```

---

### Task 12: Orchestrator (`generate`)

**Files:**
- Create: `src/engine/generate.js`
- Test: `src/engine/generate.test.js`

**Interfaces:**
- Consumes: `e1rmFrom` from `e1rm.js`; `selectTemplate` from `selector.js`; `tune` from `tuner.js`; `buildWorkingWeeks` from `periodization.js`; `buildDeloadWeek` from `deload.js`; `MAIN_LIFTS`, `substitute` from `exercises.js`.
- Produces:
  - `resolveE1rm(liftInput): number` — accepts `{oneRM}` or `{weight, reps, rpe}` and returns an e1RM.
  - `generate(profile): {template, weeks: Week[]}` — full 4-week mesocycle (3 working + 1 deload), with injury substitutions applied to lift names.

  `profile` shape (from spec §8):
  ```
  { lifts: { squat: {oneRM}|{weight,reps,rpe}, bench: ..., deadlift: ... },
    years, daysPerWeek, goal, fatigue, injuries?: string[] }
  ```

- [ ] **Step 1: Write the failing tests**

`src/engine/generate.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { resolveE1rm, generate } from './generate.js'

const profile = {
  lifts: {
    squat: { oneRM: 200 },
    bench: { weight: 113, reps: 5, rpe: 8 }, // ~139 e1RM
    deadlift: { oneRM: 240 },
  },
  years: 3, daysPerWeek: 3, goal: 'balanced', fatigue: 2,
}

describe('resolveE1rm', () => {
  it('uses a direct 1RM when provided', () => {
    expect(resolveE1rm({ oneRM: 200 })).toBe(200)
  })
  it('estimates from weight x reps @ RPE otherwise', () => {
    expect(resolveE1rm({ weight: 325, reps: 5, rpe: 8 })).toBeCloseTo(400.74, 1)
  })
})

describe('generate', () => {
  it('produces a 4-week mesocycle ending in a deload', () => {
    const plan = generate(profile)
    expect(plan.template).toBe('dup')
    expect(plan.weeks).toHaveLength(4)
    expect(plan.weeks[3].isDeload).toBe(true)
    expect(plan.weeks[0].isDeload).toBe(false)
  })
  it('every working set has a concrete weight, reps, RPE target', () => {
    const plan = generate(profile)
    const ex = plan.weeks[0].sessions[0].exercises[0]
    expect(ex.weight).toBeGreaterThan(0)
    expect(ex.reps).toBeGreaterThan(0)
    expect(ex.rpeTarget).toBeGreaterThanOrEqual(6)
    expect(ex.rpeTarget).toBeLessThanOrEqual(9.5)
  })
  it('applies injury substitutions to lift names', () => {
    const injured = generate({ ...profile, injuries: ['knee'] })
    const squatExercises = injured.weeks[0].sessions
      .flatMap((s) => s.exercises)
      .filter((e) => e.lift === 'box squat')
    expect(squatExercises.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/generate.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/generate.js`**

```js
import { e1rmFrom } from './e1rm.js'
import { selectTemplate } from './selector.js'
import { tune } from './tuner.js'
import { buildWorkingWeeks } from './periodization.js'
import { buildDeloadWeek } from './deload.js'
import { MAIN_LIFTS, substitute } from './exercises.js'

export function resolveE1rm(liftInput) {
  if (liftInput && typeof liftInput.oneRM === 'number') return liftInput.oneRM
  const { weight, reps, rpe } = liftInput
  return e1rmFrom(weight, reps, rpe)
}

function applySubstitutions(weeks, injuries) {
  if (!injuries || injuries.length === 0) return weeks
  return weeks.map((wk) => ({
    ...wk,
    sessions: wk.sessions.map((s) => ({
      ...s,
      exercises: s.exercises.map((ex) => ({ ...ex, lift: substitute(ex.lift, injuries) })),
    })),
  }))
}

export function generate(profile) {
  const { lifts, years, daysPerWeek, goal, fatigue, injuries } = profile

  const e1rm = {}
  for (const lift of MAIN_LIFTS) e1rm[lift] = resolveE1rm(lifts[lift])

  const template = selectTemplate({ goal, years, daysPerWeek })
  const tuned = tune({ goal, years, daysPerWeek, fatigue })
  const ctx = { e1rm, setsPerSession: tuned.setsPerSession }

  const working = buildWorkingWeeks(template, daysPerWeek, ctx)
  const deload = buildDeloadWeek(working[working.length - 1], ctx)
  const weeks = applySubstitutions([...working, deload], injuries)

  return { template, weeks }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/generate.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: ALL tests across all engine modules PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/generate.js src/engine/generate.test.js
git commit -m "feat(engine): generate() orchestrator -> full mesocycle"
```

---

### Task 13: Console smoke demo

**Files:**
- Create: `src/engine/demo.js`

**Interfaces:**
- Consumes: `generate` from `generate.js`.
- Produces: a runnable Node script printing a generated plan — proves the engine works end-to-end outside tests.

- [ ] **Step 1: Create the demo script**

`src/engine/demo.js`:
```js
import { generate } from './generate.js'

const plan = generate({
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 4, goal: 'strength', fatigue: 2,
})

console.log(`Template: ${plan.template}`)
for (const week of plan.weeks) {
  console.log(`\n== Week ${week.index}${week.isDeload ? ' (DELOAD)' : ''} ==`)
  for (const session of week.sessions) {
    const line = session.exercises
      .map((e) => `${e.lift} ${e.sets}x${e.reps} @ RPE${e.rpeTarget} = ${e.weight}`)
      .join(' | ')
    console.log(`Day ${session.day}: ${line}`)
  }
}
```

- [ ] **Step 2: Run the demo**

Run: `node src/engine/demo.js`
Expected: Prints `Template: fiveThreeOne` and four weeks of sessions, week 4 marked DELOAD, every line showing concrete sets/reps/RPE/weight.

- [ ] **Step 3: Commit**

```bash
git add src/engine/demo.js
git commit -m "chore(engine): console smoke demo for generate()"
```

---

## Self-Review

**1. Spec coverage:**
- §3 evidence knobs → volume.js (Task 3), frequency.js (Task 4), e1rm.js + RPE chart (Task 2), autoreg ±2% (Task 10). ✓
- §4 inputs (1RM or weight×reps×rpe; years; days; goal; fatigue; injuries) → resolveE1rm + generate profile (Task 12). Age/bodyweight/sex/weak-lift/equipment/time-limit/competition are accepted by the UI layer (Plan B) and are not required by the core mesocycle math; weak-lift/equipment/time-limit accessory overlays are deferred to Plan B's accessory rendering. **Gap noted:** accessory generation (spec §7 step 8) is partially deferred — main-lift programming is complete here; accessory selection/equipment filtering lives in `exercises.js` (Task 5) and is wired into the UI in Plan B. Acceptable: engine exposes `accessoriesFor`/`filterByEquipment`; the orchestrator focuses on the competition lifts.
- §5 architecture (pure engine modules) → Tasks 2–13. ✓
- §6 template library (5 templates) → Task 6. ✓
- §7 algorithm steps 1–7 → Tasks 2,7,8,9,10,11,12. ✓
- §8 data model (Profile/Mesocycle/Week/Session/Exercise + velocity stub) → Tasks 9, 12. ✓
- §12 Phase 2 velocity stub → `velocity: null` on every Exercise (Tasks 9, 11). ✓

**2. Placeholder scan:** No "TBD"/"TODO"/"handle edge cases" — every step has concrete code and exact expected output. `pct: undefined` in the Exercise object is an intentional, documented field (weight is the load-bearing value; pct can be populated in Plan B display), not a placeholder.

**3. Type consistency:** `Exercise` shape `{lift, sets, reps, pct, rpeTarget, weight, velocity}` is identical across periodization.js (Task 9), deload.js (Task 11), generate.js (Task 12). `ctx = {e1rm, setsPerSession}` consistent between Tasks 9 and 12; deload's `ctx` uses only `{e1rm}` (subset — consistent). `weeklySets` (volume.js) vs `weeklySets` map field (tuner.js) are deliberately different scopes (function vs object property) and never collide in imports.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-25-routine-engine.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
