# Routine Web App (Phase 1B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React web app that lets a user enter their profile, generates a personalized routine via the existing engine, displays it, logs actual RPE for autoregulation, discloses the evidence limits, and exports the plan — deployable to GitHub Pages.

**Architecture:** A thin React UI over the merged pure engine in `src/engine/`. The UI never re-implements training logic; it calls `generate(profile)` and the engine's helper functions. State lives in a zustand store persisted to localStorage. A pure `src/ui/lib/` layer adapts form state → engine profile and enriches the generated plan (display `pct`, accessories) so React components stay declarative and the adapting logic stays unit-testable.

**Tech Stack:** React 18, Vite, zustand (+ persist middleware), Vitest + @testing-library/react + jsdom, plain CSS. Node ≥ 18.

## Global Constraints

- The engine is FROZEN. Do NOT edit anything under `src/engine/` or `src/data/`. Consume it through its exports only.
- Engine exports the UI relies on (import paths verbatim):
  - `generate(profile)` from `src/engine/generate.js` → `{ template, weeks }`.
  - `resolveE1rm(liftInput)` from `src/engine/generate.js`.
  - `pctOf1RM(reps, rpe)`, `workingWeight(e1rm, reps, rpe)`, `roundToIncrement(x, inc?)` from `src/engine/e1rm.js`.
  - `loadAdjustment(targetRpe, actualRpe, weight)`, `updateE1rm(weight, reps, actualRpe)` from `src/engine/autoreg.js`.
  - `MAIN_LIFTS`, `substitute(lift, injuries)`, `accessoriesFor(lift)`, `filterByEquipment(names, equipment)` from `src/engine/exercises.js`.
- Engine data shapes (verbatim):
  - `profile` accepted by `generate`: `{ lifts: { squat, bench, deadlift }, years, daysPerWeek, goal, fatigue, injuries? }` where each lift is `{ oneRM: number }` OR `{ weight, reps, rpe }`.
  - `Exercise`: `{ lift, sets, reps, pct, rpeTarget, weight, velocity }`. `pct` arrives `undefined` from the engine — the UI computes it for display. `velocity` is always `null` (Phase 2 stub) — display nothing for it.
  - `Week`: `{ index, isDeload, sessions }`; `Session`: `{ day, exercises }`.
- RPE values are restricted to `{6,6.5,7,7.5,8,8.5,9,9.5,10}`; reps for `pctOf1RM` are integers `1..12`. The UI must not call `pctOf1RM` with out-of-range values (guard before calling).
- Goal values: `'strength' | 'hypertrophy' | 'balanced'`. daysPerWeek ∈ `{3,4,5,6}`.
- ES modules, `.jsx` for components, `.js` for pure logic. JSON imports use `with { type: 'json' }`.
- UI source lives under `src/ui/`; pure adapters under `src/ui/lib/`. Component tests are colocated `*.test.jsx`; pure-logic tests `*.test.js`.
- **jsdom pragma:** every test file that renders the DOM (component tests) MUST begin with the literal first line `// @vitest-environment jsdom`. Vitest's `environmentMatchGlobs` does NOT reliably apply when a test is invoked by direct path (`npx vitest run <file>`), so relying on the glob alone makes focused runs fail under node. The pragma forces jsdom per-file regardless of invocation. Pure-logic UI tests (planAdapter, exportCsv) stay in node and omit the pragma.
- **localStorage polyfill (already in place):** `src/test/setup.js` installs a complete in-memory `MemoryStorage` on `globalThis.localStorage`. This is REQUIRED because Node 26 ships an experimental global `localStorage` that is broken without `--localstorage-file` and shadows jsdom's, breaking zustand's `persist` middleware. The polyfill is a real implementation (its `clear()`/`removeItem()` mutate, so per-test isolation holds) and is harmless for node-env engine tests. Do NOT add ad-hoc/no-op localStorage shims anywhere else.
- Vite `base: './'` stays (GitHub Pages). Do not change it.
- Do not introduce a backend, network calls, or any non-determinism into the adapter layer.

---

### Task 1: React testing toolchain

**Files:**
- Modify: `package.json` (add devDeps + nothing else), `vitest.config.js`
- Create: `src/test/setup.js`
- Create: `src/ui/lib/smoke.test.js` (temporary proof the toolchain renders DOM — deleted at task end)

**Interfaces:**
- Produces: a Vitest setup where files under `src/ui/**` run in a jsdom environment with `@testing-library/jest-dom` matchers, while existing `src/engine/**` tests keep running in node.

- [ ] **Step 1: Add dev dependencies**

Run:
```bash
npm install -D jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install zustand
```
Expected: installs succeed; `zustand` lands in `dependencies`, the rest in `devDependencies`.

- [ ] **Step 2: Configure per-directory test environments**

Replace `vitest.config.js` with:
```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
    environmentMatchGlobs: [
      ['src/ui/**', 'jsdom'],
    ],
    environment: 'node',
    setupFiles: ['src/test/setup.js'],
  },
})
```

`src/test/setup.js`:
```js
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Write a temporary smoke test**

`src/ui/lib/smoke.test.js`:
```js
import { describe, it, expect } from 'vitest'

describe('jsdom toolchain', () => {
  it('has a document (jsdom env active for src/ui)', () => {
    const el = document.createElement('div')
    el.textContent = 'ok'
    expect(el).toHaveTextContent('ok') // jest-dom matcher
  })
})
```

- [ ] **Step 4: Run it**

Run: `npx vitest run src/ui/lib/smoke.test.js`
Expected: PASS — proves jsdom + jest-dom work for `src/ui/**`.

- [ ] **Step 5: Run the full suite to confirm no regression**

Run: `npm test`
Expected: the 55 engine tests still pass plus the 1 smoke test.

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/ui/lib/smoke.test.js
git add package.json package-lock.json vitest.config.js src/test/setup.js
git commit -m "chore(ui): add React testing toolchain (jsdom, testing-library)"
```

---

### Task 2: Profile store (zustand + localStorage)

**Files:**
- Create: `src/ui/store/profileStore.js`
- Test: `src/ui/store/profileStore.test.js`

**Interfaces:**
- Produces:
  - `DEFAULT_PROFILE` — a complete default form profile object (see Step 3 for exact fields).
  - `useProfileStore` — a zustand hook. State: `{ profile, plan }`. Actions: `setField(path, value)`, `setLift(lift, liftInput)`, `toggleInjury(name)`, `toggleEquipment(name)`, `reset()`. (Plan is set by Task 3's action, added there — this task only holds `profile` + the setters + a `plan: null` slot.)
  - `selectIsValid(profile): boolean` — true when all three lifts have a usable e1RM input and daysPerWeek/goal/years are set.

- [ ] **Step 1: Write the failing tests**

`src/ui/store/profileStore.test.js`:
```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useProfileStore, DEFAULT_PROFILE, selectIsValid } from './profileStore.js'

beforeEach(() => {
  useProfileStore.getState().reset()
  localStorage.clear()
})

describe('DEFAULT_PROFILE', () => {
  it('has the three main lifts and core fields', () => {
    expect(DEFAULT_PROFILE.lifts).toHaveProperty('squat')
    expect(DEFAULT_PROFILE.lifts).toHaveProperty('bench')
    expect(DEFAULT_PROFILE.lifts).toHaveProperty('deadlift')
    expect(DEFAULT_PROFILE).toHaveProperty('years')
    expect(DEFAULT_PROFILE).toHaveProperty('daysPerWeek')
    expect(DEFAULT_PROFILE).toHaveProperty('goal')
    expect(DEFAULT_PROFILE).toHaveProperty('fatigue')
  })
})

describe('setField & setLift', () => {
  it('updates a top-level field', () => {
    useProfileStore.getState().setField('daysPerWeek', 5)
    expect(useProfileStore.getState().profile.daysPerWeek).toBe(5)
  })
  it('updates a lift input', () => {
    useProfileStore.getState().setLift('squat', { oneRM: 200 })
    expect(useProfileStore.getState().profile.lifts.squat).toEqual({ oneRM: 200 })
  })
})

describe('toggleInjury & toggleEquipment', () => {
  it('adds then removes an injury', () => {
    const { toggleInjury } = useProfileStore.getState()
    toggleInjury('knee')
    expect(useProfileStore.getState().profile.injuries).toContain('knee')
    toggleInjury('knee')
    expect(useProfileStore.getState().profile.injuries).not.toContain('knee')
  })
})

describe('selectIsValid', () => {
  it('is false for a default (empty 1RM) profile and true once lifts are set', () => {
    expect(selectIsValid(DEFAULT_PROFILE)).toBe(false)
    const p = {
      ...DEFAULT_PROFILE,
      lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
    }
    expect(selectIsValid(p)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/store/profileStore.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/ui/store/profileStore.js`**

```js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DEFAULT_PROFILE = {
  lifts: {
    squat: { oneRM: null },
    bench: { oneRM: null },
    deadlift: { oneRM: null },
  },
  years: 1,
  daysPerWeek: 4,
  goal: 'strength',
  fatigue: 2,
  competition: { on: false, date: '' },
  age: null,
  bodyweight: null,
  sex: '',
  weakLift: '',
  injuries: [],
  sessionTimeLimit: null,
  equipment: ['barbell', 'rack', 'bench'],
}

function hasUsableLift(liftInput) {
  if (!liftInput) return false
  if (typeof liftInput.oneRM === 'number' && liftInput.oneRM > 0) return true
  return (
    typeof liftInput.weight === 'number' && liftInput.weight > 0 &&
    typeof liftInput.reps === 'number' && liftInput.reps > 0 &&
    typeof liftInput.rpe === 'number'
  )
}

export function selectIsValid(profile) {
  const lifts = profile.lifts
  const liftsOk = ['squat', 'bench', 'deadlift'].every((l) => hasUsableLift(lifts[l]))
  return liftsOk && typeof profile.daysPerWeek === 'number' && !!profile.goal && typeof profile.years === 'number'
}

export const useProfileStore = create(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      plan: null,
      setField: (path, value) =>
        set((s) => ({ profile: { ...s.profile, [path]: value } })),
      setLift: (lift, liftInput) =>
        set((s) => ({ profile: { ...s.profile, lifts: { ...s.profile.lifts, [lift]: liftInput } } })),
      toggleInjury: (name) =>
        set((s) => {
          const has = s.profile.injuries.includes(name)
          const injuries = has ? s.profile.injuries.filter((i) => i !== name) : [...s.profile.injuries, name]
          return { profile: { ...s.profile, injuries } }
        }),
      toggleEquipment: (name) =>
        set((s) => {
          const has = s.profile.equipment.includes(name)
          const equipment = has ? s.profile.equipment.filter((e) => e !== name) : [...s.profile.equipment, name]
          return { profile: { ...s.profile, equipment } }
        }),
      reset: () => set({ profile: DEFAULT_PROFILE, plan: null }),
    }),
    { name: 'powerlifting-profile' }
  )
)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/store/profileStore.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/store/profileStore.js src/ui/store/profileStore.test.js
git commit -m "feat(ui): profile store with localStorage persistence"
```

---

### Task 3: Plan adapter (engine profile mapping + display enrichment)

**Files:**
- Create: `src/ui/lib/planAdapter.js`
- Test: `src/ui/lib/planAdapter.test.js`

**Interfaces:**
- Consumes: `generate` (generate.js), `pctOf1RM` (e1rm.js), `accessoriesFor`, `filterByEquipment`, `substitute`, `MAIN_LIFTS` (exercises.js).
- Produces:
  - `toEngineProfile(formProfile): EngineProfile` — strips UI-only fields, passing `{ lifts, years, daysPerWeek, goal, fatigue, injuries }` to the engine. Each lift passes through as-is (already `{oneRM}` or `{weight,reps,rpe}`).
  - `enrichExercise(ex): ex2` — returns a copy with `pct` filled: `pct = (reps>=1 && reps<=12) ? pctOf1RM(reps, rpeTarget) : null`.
  - `accessoriesForSession(session, equipment, injuries, sessionTimeLimit): string[]` — union of `accessoriesFor(lift)` for each main lift in the session, filtered by `filterByEquipment(_, equipment)`, each substituted via `substitute(_, injuries)`, deduped, capped to `Math.max(1, Math.floor(sessionTimeLimit/20))` when `sessionTimeLimit` is a positive number (else uncapped).
  - `buildPlan(formProfile): {template, weeks}` — calls `generate(toEngineProfile(formProfile))`, then maps every exercise through `enrichExercise` and attaches `session.accessories` via `accessoriesForSession`. Pure (deterministic for a given profile).

- [ ] **Step 1: Write the failing tests**

`src/ui/lib/planAdapter.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { toEngineProfile, enrichExercise, accessoriesForSession, buildPlan } from './planAdapter.js'

const form = {
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 3, goal: 'balanced', fatigue: 2,
  competition: { on: false, date: '' }, age: 30, bodyweight: 90, sex: 'M',
  weakLift: 'bench', injuries: [], sessionTimeLimit: null, equipment: ['barbell', 'rack', 'bench'],
}

describe('toEngineProfile', () => {
  it('keeps only engine fields', () => {
    const ep = toEngineProfile(form)
    expect(Object.keys(ep).sort()).toEqual(['daysPerWeek', 'fatigue', 'goal', 'injuries', 'lifts', 'years'])
    expect(ep.lifts.squat).toEqual({ oneRM: 200 })
  })
})

describe('enrichExercise', () => {
  it('fills pct from reps and rpeTarget', () => {
    const ex = { lift: 'squat', sets: 5, reps: 5, pct: undefined, rpeTarget: 8, weight: 162.5, velocity: null }
    expect(enrichExercise(ex).pct).toBe(81.1) // pctOf1RM(5,8)
  })
  it('returns null pct for out-of-range reps', () => {
    const ex = { lift: 'squat', sets: 1, reps: 15, pct: undefined, rpeTarget: 8, weight: 100, velocity: null }
    expect(enrichExercise(ex).pct).toBeNull()
  })
})

describe('accessoriesForSession', () => {
  it('returns equipment-filtered accessories for the session main lifts', () => {
    const session = { day: 1, exercises: [{ lift: 'bench' }] }
    const acc = accessoriesForSession(session, ['barbell', 'bench', 'dumbbells'], [], null)
    expect(acc).toContain('dumbbell bench')
  })
  it('caps the count when a session time limit is set', () => {
    const session = { day: 1, exercises: [{ lift: 'squat' }, { lift: 'bench' }] }
    const acc = accessoriesForSession(session, ['barbell', 'rack', 'bench', 'dumbbells', 'leg press machine'], [], 20)
    expect(acc.length).toBeLessThanOrEqual(1) // floor(20/20)=1
  })
})

describe('buildPlan', () => {
  it('produces an enriched 4-week plan with pct filled on every exercise', () => {
    const plan = buildPlan(form)
    expect(plan.weeks).toHaveLength(4)
    const allEx = plan.weeks.flatMap((w) => w.sessions).flatMap((s) => s.exercises)
    expect(allEx.every((e) => e.pct === null || typeof e.pct === 'number')).toBe(true)
    expect(allEx.some((e) => typeof e.pct === 'number')).toBe(true)
    expect(plan.weeks[0].sessions[0]).toHaveProperty('accessories')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/lib/planAdapter.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/ui/lib/planAdapter.js`**

```js
import { generate } from '../../engine/generate.js'
import { pctOf1RM } from '../../engine/e1rm.js'
import { accessoriesFor, filterByEquipment, substitute, MAIN_LIFTS } from '../../engine/exercises.js'

export function toEngineProfile(form) {
  return {
    lifts: form.lifts,
    years: form.years,
    daysPerWeek: form.daysPerWeek,
    goal: form.goal,
    fatigue: form.fatigue,
    injuries: form.injuries,
  }
}

export function enrichExercise(ex) {
  const inRange = Number.isInteger(ex.reps) && ex.reps >= 1 && ex.reps <= 12
  return { ...ex, pct: inRange ? pctOf1RM(ex.reps, ex.rpeTarget) : null }
}

export function accessoriesForSession(session, equipment, injuries, sessionTimeLimit) {
  // Map each exercise's (possibly injury-substituted) lift back to its base main
  // lift, so accessories are still found when e.g. a knee injury renamed
  // squat -> box squat (generate() substitutes lift names before buildPlan runs).
  const baseLifts = session.exercises
    .map((e) => MAIN_LIFTS.find((base) => base === e.lift || substitute(base, injuries) === e.lift))
    .filter(Boolean)
  const names = []
  for (const lift of baseLifts) {
    for (const acc of accessoriesFor(lift)) names.push(acc)
  }
  const available = filterByEquipment(names, equipment)
  const subbed = available.map((a) => substitute(a, injuries))
  const deduped = [...new Set(subbed)]
  if (typeof sessionTimeLimit === 'number' && sessionTimeLimit > 0) {
    const cap = Math.max(1, Math.floor(sessionTimeLimit / 20))
    return deduped.slice(0, cap)
  }
  return deduped
}

export function buildPlan(form) {
  const raw = generate(toEngineProfile(form))
  const weeks = raw.weeks.map((wk) => ({
    ...wk,
    sessions: wk.sessions.map((s) => ({
      ...s,
      exercises: s.exercises.map(enrichExercise),
      accessories: accessoriesForSession(s, form.equipment, form.injuries, form.sessionTimeLimit),
    })),
  }))
  return { template: raw.template, weeks }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/lib/planAdapter.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/lib/planAdapter.js src/ui/lib/planAdapter.test.js
git commit -m "feat(ui): plan adapter (engine mapping + pct/accessory enrichment)"
```

---

### Task 4: CSV export (pure)

**Files:**
- Create: `src/ui/lib/exportCsv.js`
- Test: `src/ui/lib/exportCsv.test.js`

**Interfaces:**
- Produces:
  - `planToCsv(plan): string` — header row `week,deload,day,lift,sets,reps,pct,rpe,weight` then one row per exercise across all weeks/sessions. `deload` column is `yes`/`no`. `pct` empty string when null.

- [ ] **Step 1: Write the failing test**

`src/ui/lib/exportCsv.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { planToCsv } from './exportCsv.js'

const plan = {
  template: 'dup',
  weeks: [
    { index: 1, isDeload: false, sessions: [
      { day: 1, exercises: [
        { lift: 'squat', sets: 5, reps: 5, pct: 81.1, rpeTarget: 8, weight: 162.5, velocity: null },
      ], accessories: [] },
    ] },
    { index: 4, isDeload: true, sessions: [
      { day: 1, exercises: [
        { lift: 'squat', sets: 3, reps: 5, pct: null, rpeTarget: 6, weight: 120, velocity: null },
      ], accessories: [] },
    ] },
  ],
}

describe('planToCsv', () => {
  it('emits a header and one row per exercise', () => {
    const csv = planToCsv(plan)
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('week,deload,day,lift,sets,reps,pct,rpe,weight')
    expect(lines[1]).toBe('1,no,1,squat,5,5,81.1,8,162.5')
    expect(lines[2]).toBe('4,yes,1,squat,3,5,,6,120')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/lib/exportCsv.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/ui/lib/exportCsv.js`**

```js
export function planToCsv(plan) {
  const rows = ['week,deload,day,lift,sets,reps,pct,rpe,weight']
  for (const wk of plan.weeks) {
    for (const s of wk.sessions) {
      for (const ex of s.exercises) {
        const pct = ex.pct == null ? '' : ex.pct
        rows.push([
          wk.index, wk.isDeload ? 'yes' : 'no', s.day, ex.lift,
          ex.sets, ex.reps, pct, ex.rpeTarget, ex.weight,
        ].join(','))
      }
    }
  }
  return rows.join('\n') + '\n'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/lib/exportCsv.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/lib/exportCsv.js src/ui/lib/exportCsv.test.js
git commit -m "feat(ui): CSV export of a generated plan"
```

---

### Task 5: InputForm component

**Files:**
- Create: `src/ui/components/InputForm.jsx`
- Test: `src/ui/components/InputForm.test.jsx`

**Interfaces:**
- Consumes: `useProfileStore`, `selectIsValid` (store); props `{ onGenerate: () => void }`.
- Produces: a form rendering inputs for every profile field (per-lift 1RM with a direct/estimate toggle, years, daysPerWeek select 3–6, goal select, fatigue 1–5, competition toggle + date, age, bodyweight, sex, weakLift, injuries checkboxes [knee, shoulder, back], equipment checkboxes, sessionTimeLimit). A "Generate" button calls `onGenerate`; it is disabled when `selectIsValid(profile)` is false.

- [ ] **Step 1: Write the failing tests**

`src/ui/components/InputForm.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InputForm from './InputForm.jsx'
import { useProfileStore } from '../store/profileStore.js'

beforeEach(() => {
  useProfileStore.getState().reset()
  localStorage.clear()
})

describe('InputForm', () => {
  it('disables Generate until all three lifts are entered', async () => {
    render(<InputForm onGenerate={() => {}} />)
    const btn = screen.getByRole('button', { name: /generate/i })
    expect(btn).toBeDisabled()

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/squat 1rm/i), '200')
    await user.type(screen.getByLabelText(/bench 1rm/i), '140')
    await user.type(screen.getByLabelText(/deadlift 1rm/i), '240')
    expect(btn).toBeEnabled()
  })

  it('calls onGenerate when Generate is clicked with a valid profile', async () => {
    let called = false
    useProfileStore.getState().setLift('squat', { oneRM: 200 })
    useProfileStore.getState().setLift('bench', { oneRM: 140 })
    useProfileStore.getState().setLift('deadlift', { oneRM: 240 })
    render(<InputForm onGenerate={() => { called = true }} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /generate/i }))
    expect(called).toBe(true)
  })

  it('updates days per week in the store', async () => {
    render(<InputForm onGenerate={() => {}} />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/days per week/i), '5')
    expect(useProfileStore.getState().profile.daysPerWeek).toBe(5)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/components/InputForm.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/ui/components/InputForm.jsx`**

```jsx
import { useProfileStore, selectIsValid } from '../store/profileStore.js'

const INJURIES = ['knee', 'shoulder', 'back']
const EQUIPMENT = ['barbell', 'rack', 'bench', 'box', 'trap bar', 'dumbbells', 'leg press machine']

function numberOrNull(v) {
  const n = parseFloat(v)
  return Number.isNaN(n) ? null : n
}

export default function InputForm({ onGenerate }) {
  const profile = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)
  const setLift = useProfileStore((s) => s.setLift)
  const toggleInjury = useProfileStore((s) => s.toggleInjury)
  const toggleEquipment = useProfileStore((s) => s.toggleEquipment)
  const valid = selectIsValid(profile)

  const setOneRM = (lift, v) => setLift(lift, { oneRM: numberOrNull(v) })

  return (
    <form className="input-form" onSubmit={(e) => e.preventDefault()}>
      <fieldset>
        <legend>Current 1RM</legend>
        {['squat', 'bench', 'deadlift'].map((lift) => (
          <label key={lift}>
            {lift} 1RM
            <input
              type="number"
              value={profile.lifts[lift]?.oneRM ?? ''}
              onChange={(e) => setOneRM(lift, e.target.value)}
            />
          </label>
        ))}
      </fieldset>

      <label>Training years
        <input type="number" step="0.5" value={profile.years}
          onChange={(e) => setField('years', numberOrNull(e.target.value))} />
      </label>

      <label>Days per week
        <select value={profile.daysPerWeek}
          onChange={(e) => setField('daysPerWeek', Number(e.target.value))}>
          {[3, 4, 5, 6].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>

      <label>Goal
        <select value={profile.goal} onChange={(e) => setField('goal', e.target.value)}>
          <option value="strength">strength</option>
          <option value="hypertrophy">hypertrophy</option>
          <option value="balanced">balanced</option>
        </select>
      </label>

      <label>Life fatigue (1 fresh – 5 wrecked)
        <input type="range" min="1" max="5" value={profile.fatigue}
          onChange={(e) => setField('fatigue', Number(e.target.value))} />
        <span>{profile.fatigue}</span>
      </label>

      <label>
        <input type="checkbox" checked={profile.competition.on}
          onChange={(e) => setField('competition', { ...profile.competition, on: e.target.checked })} />
        Competition mode
      </label>
      {profile.competition.on && (
        <label>Meet date
          <input type="date" value={profile.competition.date}
            onChange={(e) => setField('competition', { ...profile.competition, date: e.target.value })} />
        </label>
      )}

      <label>Age
        <input type="number" value={profile.age ?? ''}
          onChange={(e) => setField('age', numberOrNull(e.target.value))} />
      </label>
      <label>Bodyweight
        <input type="number" value={profile.bodyweight ?? ''}
          onChange={(e) => setField('bodyweight', numberOrNull(e.target.value))} />
      </label>
      <label>Sex
        <select value={profile.sex} onChange={(e) => setField('sex', e.target.value)}>
          <option value="">—</option><option value="M">M</option><option value="F">F</option>
        </select>
      </label>
      <label>Weak lift to prioritize
        <select value={profile.weakLift} onChange={(e) => setField('weakLift', e.target.value)}>
          <option value="">none</option>
          <option value="squat">squat</option>
          <option value="bench">bench</option>
          <option value="deadlift">deadlift</option>
        </select>
      </label>
      <label>Session time limit (min)
        <input type="number" value={profile.sessionTimeLimit ?? ''}
          onChange={(e) => setField('sessionTimeLimit', numberOrNull(e.target.value))} />
      </label>

      <fieldset>
        <legend>Injuries</legend>
        {INJURIES.map((inj) => (
          <label key={inj}>
            <input type="checkbox" checked={profile.injuries.includes(inj)}
              onChange={() => toggleInjury(inj)} />
            {inj}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Equipment</legend>
        {EQUIPMENT.map((eq) => (
          <label key={eq}>
            <input type="checkbox" checked={profile.equipment.includes(eq)}
              onChange={() => toggleEquipment(eq)} />
            {eq}
          </label>
        ))}
      </fieldset>

      <button type="button" disabled={!valid} onClick={onGenerate}>Generate routine</button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/components/InputForm.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/InputForm.jsx src/ui/components/InputForm.test.jsx
git commit -m "feat(ui): profile input form"
```

---

### Task 6: RoutineView component

**Files:**
- Create: `src/ui/components/RoutineView.jsx`
- Test: `src/ui/components/RoutineView.test.jsx`

**Interfaces:**
- Consumes: a `plan` prop of shape `{ template, weeks }` (already enriched by `buildPlan`).
- Produces: a read-only view rendering the template name, each week (deload weeks badged), each session day, and a row per exercise showing `lift  sets×reps  @ pct% / RPE rpe  = weight`, plus the session's accessories list. Renders nothing (a placeholder message) when `plan` is null.

- [ ] **Step 1: Write the failing tests**

`src/ui/components/RoutineView.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RoutineView from './RoutineView.jsx'

const plan = {
  template: 'dup',
  weeks: [
    { index: 1, isDeload: false, sessions: [
      { day: 1, exercises: [
        { lift: 'squat', sets: 5, reps: 5, pct: 81.1, rpeTarget: 8, weight: 162.5, velocity: null },
      ], accessories: ['leg press'] },
    ] },
    { index: 4, isDeload: true, sessions: [
      { day: 1, exercises: [
        { lift: 'squat', sets: 3, reps: 5, pct: null, rpeTarget: 6, weight: 120, velocity: null },
      ], accessories: [] },
    ] },
  ],
}

describe('RoutineView', () => {
  it('shows a placeholder when no plan', () => {
    render(<RoutineView plan={null} />)
    expect(screen.getByText(/no routine yet/i)).toBeInTheDocument()
  })
  it('renders the template name and a deload badge', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getByText(/dup/i)).toBeInTheDocument()
    expect(screen.getByText(/deload/i)).toBeInTheDocument()
  })
  it('renders an exercise prescription line with weight', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getByText(/162\.5/)).toBeInTheDocument()
    expect(screen.getByText(/leg press/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/components/RoutineView.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/ui/components/RoutineView.jsx`**

```jsx
function ExerciseRow({ ex }) {
  const pct = ex.pct == null ? '—' : `${ex.pct}%`
  return (
    <li className="exercise-row">
      <span className="ex-lift">{ex.lift}</span>{' '}
      <span className="ex-scheme">{ex.sets}×{ex.reps}</span>{' '}
      <span className="ex-load">@ {pct} / RPE {ex.rpeTarget}</span>{' '}
      <span className="ex-weight">= {ex.weight}</span>
    </li>
  )
}

export default function RoutineView({ plan }) {
  if (!plan) return <p className="placeholder">No routine yet — fill the form and generate.</p>
  return (
    <section className="routine-view">
      <h2>Template: {plan.template}</h2>
      {plan.weeks.map((wk) => (
        <div key={wk.index} className={`week${wk.isDeload ? ' deload' : ''}`}>
          <h3>Week {wk.index}{wk.isDeload ? ' (DELOAD)' : ''}</h3>
          {wk.sessions.map((s) => (
            <div key={s.day} className="session">
              <h4>Day {s.day}</h4>
              <ul>{s.exercises.map((ex, i) => <ExerciseRow key={i} ex={ex} />)}</ul>
              {s.accessories.length > 0 && (
                <p className="accessories">Accessories: {s.accessories.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/components/RoutineView.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/RoutineView.jsx src/ui/components/RoutineView.test.jsx
git commit -m "feat(ui): routine view (mesocycle/week/session render)"
```

---

### Task 7: RPE Logger (autoregulation)

**Files:**
- Create: `src/ui/components/RpeLogger.jsx`
- Test: `src/ui/components/RpeLogger.test.jsx`

**Interfaces:**
- Consumes: `loadAdjustment`, `updateE1rm` (autoreg.js); props `{ exercise: {lift, reps, rpeTarget, weight} }`.
- Produces: an inline control where the user enters the actual RPE they hit; on entry it shows (a) the suggested next-session weight via `loadAdjustment(exercise.rpeTarget, actualRpe, exercise.weight)` and (b) the updated e1RM via `updateE1rm(exercise.weight, exercise.reps, actualRpe)`, each rounded to 1 decimal for display. Restrict the actual-RPE selector to the valid set `{6,6.5,...,10}`.

- [ ] **Step 1: Write the failing tests**

`src/ui/components/RpeLogger.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RpeLogger from './RpeLogger.jsx'

describe('RpeLogger', () => {
  const exercise = { lift: 'squat', reps: 5, rpeTarget: 8, weight: 100 }

  it('suggests a heavier next weight when the set was easier than target', async () => {
    render(<RpeLogger exercise={exercise} />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/actual rpe/i), '7')
    // target 8, actual 7 -> +4% -> 104 -> round 2.5 -> 105
    expect(screen.getByText(/next:\s*105/i)).toBeInTheDocument()
  })

  it('suggests a lighter next weight when the set was harder than target', async () => {
    render(<RpeLogger exercise={exercise} />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/actual rpe/i), '9')
    expect(screen.getByText(/next:\s*95/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/components/RpeLogger.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/ui/components/RpeLogger.jsx`**

```jsx
import { useState } from 'react'
import { loadAdjustment, updateE1rm } from '../../engine/autoreg.js'

const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

export default function RpeLogger({ exercise }) {
  const [actual, setActual] = useState('')

  const hasValue = actual !== ''
  const actualRpe = Number(actual)
  const nextWeight = hasValue ? loadAdjustment(exercise.rpeTarget, actualRpe, exercise.weight) : null
  const newE1rm = hasValue ? updateE1rm(exercise.weight, exercise.reps, actualRpe) : null

  return (
    <span className="rpe-logger">
      <label>
        actual RPE
        <select value={actual} onChange={(e) => setActual(e.target.value)}>
          <option value="">—</option>
          {RPE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      {hasValue && (
        <span className="suggestion">
          next: {nextWeight} (e1RM {newE1rm.toFixed(1)})
        </span>
      )}
    </span>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/components/RpeLogger.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/RpeLogger.jsx src/ui/components/RpeLogger.test.jsx
git commit -m "feat(ui): RPE logger with autoregulated next-load suggestion"
```

---

### Task 8: Limits disclosure + App composition + export wiring

**Files:**
- Create: `src/ui/components/LimitsPanel.jsx`
- Modify: `src/App.jsx`
- Create: `src/App.test.jsx`
- Create: `src/ui/styles.css`
- Modify: `src/main.jsx` (import the stylesheet)

**Interfaces:**
- Consumes: `InputForm`, `RoutineView`, `LimitsPanel`, `useProfileStore`, `buildPlan` (planAdapter), `planToCsv` (exportCsv).
- Produces: the top-level app: form on one side, generated routine on the other, a "Download CSV" button (enabled once a plan exists), a print button (`window.print`), and a collapsible evidence-limits panel. Generating sets `plan` in the store via a local handler that calls `buildPlan(profile)`.

- [ ] **Step 1: Write the failing test**

`src/App.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { useProfileStore } from './ui/store/profileStore.js'

beforeEach(() => {
  useProfileStore.getState().reset()
  localStorage.clear()
})

describe('App', () => {
  it('generates and displays a routine end to end', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText(/squat 1rm/i), '200')
    await user.type(screen.getByLabelText(/bench 1rm/i), '140')
    await user.type(screen.getByLabelText(/deadlift 1rm/i), '240')
    await user.click(screen.getByRole('button', { name: /generate routine/i }))
    expect(screen.getByText(/Template:/i)).toBeInTheDocument()
    expect(screen.getByText(/Week 1/i)).toBeInTheDocument()
  })

  it('shows the evidence-limits disclosure', () => {
    render(<App />)
    expect(screen.getByText(/evidence|limits|not peer-reviewed/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.jsx`
Expected: FAIL — App does not yet render the form/routine.

- [ ] **Step 3: Implement `LimitsPanel.jsx`, `styles.css`, and rewrite `App.jsx`**

`src/ui/components/LimitsPanel.jsx`:
```jsx
export default function LimitsPanel() {
  return (
    <details className="limits-panel">
      <summary>Evidence &amp; limits (read me)</summary>
      <ul>
        <li>Volume/frequency/intensity defaults come from meta-analyses (Pelland/Zourdos 2025, Schoenfeld). Training-age scaling is population-averaged — a heuristic, not individualized truth.</li>
        <li>The RPE→%1RM table (Tuchscherer/RTS) is real-world data but <strong>not peer-reviewed</strong>.</li>
        <li>Program skeletons are field-validated templates; research tunes their knobs. Periodization-model superiority for strength is weakly evidenced.</li>
        <li>Competition peaking is minimally handled in this version.</li>
      </ul>
    </details>
  )
}
```

`src/ui/styles.css`:
```css
:root { font-family: system-ui, sans-serif; line-height: 1.4; }
.app { max-width: 1100px; margin: 0 auto; padding: 1rem; }
.layout { display: grid; grid-template-columns: 360px 1fr; gap: 1.5rem; }
.input-form label { display: block; margin: 0.35rem 0; }
.input-form fieldset { margin: 0.6rem 0; }
.week { border: 1px solid #ddd; border-radius: 8px; padding: 0.5rem 0.75rem; margin: 0.6rem 0; }
.week.deload { background: #fff7e6; }
.session { margin: 0.4rem 0; }
.exercise-row { list-style: none; font-variant-numeric: tabular-nums; }
.accessories { color: #555; font-size: 0.9rem; }
.toolbar { display: flex; gap: 0.5rem; margin: 0.5rem 0; }
@media print { .input-form, .toolbar, .limits-panel { display: none; } }
@media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
```

`src/App.jsx`:
```jsx
import { useProfileStore } from './ui/store/profileStore.js'
import { buildPlan } from './ui/lib/planAdapter.js'
import { planToCsv } from './ui/lib/exportCsv.js'
import InputForm from './ui/components/InputForm.jsx'
import RoutineView from './ui/components/RoutineView.jsx'
import LimitsPanel from './ui/components/LimitsPanel.jsx'

export default function App() {
  const profile = useProfileStore((s) => s.profile)
  const plan = useProfileStore((s) => s.plan)
  const setPlan = useProfileStore.setState

  const onGenerate = () => setPlan({ plan: buildPlan(profile) })

  const downloadCsv = () => {
    const blob = new Blob([planToCsv(plan)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'routine.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app">
      <h1>Powerlifting Routine Generator</h1>
      <LimitsPanel />
      <div className="layout">
        <InputForm onGenerate={onGenerate} />
        <div>
          <div className="toolbar">
            <button type="button" disabled={!plan} onClick={downloadCsv}>Download CSV</button>
            <button type="button" disabled={!plan} onClick={() => window.print()}>Print</button>
          </div>
          <RoutineView plan={plan} />
        </div>
      </div>
    </div>
  )
}
```

Modify `src/main.jsx` — add the stylesheet import at the top:
```jsx
import './ui/styles.css'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/App.test.jsx`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all engine + UI tests pass together.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/App.test.jsx src/main.jsx src/ui/components/LimitsPanel.jsx src/ui/styles.css
git commit -m "feat(ui): app composition, limits disclosure, CSV/print export"
```

---

### Task 9: Build + GitHub Pages deploy

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: a green production build and a GitHub Actions workflow that builds and deploys `dist/` to GitHub Pages on push to `main`.

- [ ] **Step 1: Verify the production build**

Run: `npm run build`
Expected: Vite builds to `dist/` with no errors. (`base: './'` already set, so asset paths are relative and work under a project subpath.)

- [ ] **Step 2: Create the deploy workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: build, test, and deploy to GitHub Pages on main"
```

- [ ] **Step 4: Note for the human**

After this lands on `main`, the repo owner must enable Pages in GitHub repo Settings → Pages → Source: "GitHub Actions" (one-time manual step the workflow cannot do). Record this in the final report.

---

## Self-Review

**1. Spec coverage (against `2026-06-25-powerlifting-routine-generator-design.md`):**
- §4 inputs — all collected by InputForm (Task 5): 1RM, years, daysPerWeek, goal, competition toggle+date, fatigue, age, bodyweight, sex, weakLift, injuries, sessionTimeLimit, equipment. ✓
- §5 architecture (`src/ui/` shell + `src/ui/lib/` pure adapters) — Tasks 2–8. ✓
- §7 step 8 personalization overlays — accessories via equipment filter + injury substitution + time cap in `accessoriesForSession` (Task 3); weak-lift priority is collected and stored (display-only in Phase 1B — the engine does not yet consume it; **noted gap**, acceptable since the engine is frozen and weak-lift accessory weighting is a follow-up). ✓ (partial, documented)
- §8 data model + `pct` population — `enrichExercise` fills the previously-deferred `pct` (Task 3). ✓
- §9 output — RoutineView (Task 6) + CSV/print (Tasks 4, 8). ✓
- §13 honest limits — LimitsPanel (Task 8). ✓
- Autoregulation (spec §7 step 6) — RpeLogger wires `loadAdjustment`/`updateE1rm` (Task 7). Logger is built and unit-tested; embedding a logger per exercise row inside RoutineView is deferred to a polish pass to keep Task 6 a pure render — **noted**: Task 7 delivers the component; wiring it into each row is a one-line follow-up not gated here.
- Deploy (spec §14 GitHub Pages) — Task 9. ✓

**2. Placeholder scan:** No "TBD"/"handle errors"/"add validation" — every step has concrete code and exact expected output. The two documented gaps (weak-lift engine weighting; per-row logger embedding) are explicit scope notes, not placeholders.

**3. Type consistency:** The plan shape `{template, weeks:[{index,isDeload,sessions:[{day,exercises:[{lift,sets,reps,pct,rpeTarget,weight,velocity}],accessories}]}]}` is identical across planAdapter (Task 3), exportCsv (Task 4), RoutineView (Task 6), and App (Task 8). `enrichExercise` is the only writer of `pct`; all readers treat `pct == null` as "—"/empty. Store action names (`setField`, `setLift`, `toggleInjury`, `toggleEquipment`, `reset`) are consistent between Task 2 and Task 5. `useProfileStore.setState({plan})` in App matches the `plan` slot declared in the store (Task 2).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-25-routine-webapp.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session via executing-plans, batched checkpoints.

**Which approach?**
