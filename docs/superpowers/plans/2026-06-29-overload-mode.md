# Overload Mode & Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Checkbox steps.

**Goal:** Add an opt-in "overload mode" — deliberately overreach 1–3 chosen lifts for N weeks → forced realization → test — with honest risk/EV, presets, cooldown, and intentional MRV exceedance, implemented as a thin wrapper over the existing `generate()`.

**Architecture:** `overload.js` maps overload inputs to a transformed profile (frequency bump, fixed volume override = released caps/MRV exceedance, peaking = realization+intensity ramp, mesoWeeks=overreachWeeks) and delegates to `generate()`, attaching risk/EV/cooldown metadata. `generate.js` is untouched (byte-identical). UI to configure + display.

**Tech Stack:** JavaScript (ES modules), Vitest, React/jsdom.

## Global Constraints
- Pure & deterministic: no `Date`, no `Math.random`. `competition.date` is set to the fixed sentinel `'overload'` (engine only checks truthiness — confirmed: generate.js:94, periodizationModel.js:38,48 — never parses it).
- **Bit-identity:** `generate.js` and all existing generation MUST stay byte-identical. Overload reached only when `profile.overload.enabled` (default false). Store deep-fill defaults OFF.
- Dose/risk/cooldown/EV coefficients = heuristics (`근거 약함`); realization taper = Bosquet `근거 강` (reused). Outcome NOT promised.
- `volumeOverride.main = { enabled, mode:'fixed', setsPerSession }` (existing shape, generate.js:120-135) — `fixed` releases per-session caps.
- Note: generate clamps `mesoWeeks` to ≥3, so effective overreach min is 3 weeks (UI uses 3–8).
- Spec: `docs/superpowers/specs/2026-06-29-overload-mode-design.md`.
- `npm test` (full) green before each commit.

---

### Task 1: overload.js (dose, risk, EV, presets, cooldown, generateOverload) + tests

**Files:** Create `src/engine/overload.js`, `src/engine/overload.test.js`.

**Interfaces — Produces:** `overloadDose(targetPct,{lifts})`, `overloadRisk({targetPct,lifts,overreachWeeks,years,readiness})→{tier,score,reasons}`, `overloadEV(dose,risk)`, `PRESETS`, `applyPreset(key)`, `overloadCooldownWeeks(dose,overreachWeeks)`, `generateOverload(profile)→plan+{overload}`.

- [ ] **Step 1: Write failing tests** — `src/engine/overload.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { overloadDose, overloadRisk, applyPreset, PRESETS, overloadCooldownWeeks, generateOverload } from './overload.js'

const baseProfile = {
  lifts: { squat:{oneRM:200}, bench:{oneRM:140}, deadlift:{oneRM:240} },
  years: 3, daysPerWeek: 5, fatigue: 1,
  qualities: { power:0.1, strength:0.7, hypertrophy:0.2, endurance:0 },
}

describe('overloadDose', () => {
  it('aggressiveness clamps 0..1.5; volMult/freqBump rise with targetPct', () => {
    const lo = overloadDose(2, { lifts:['squat'] }), hi = overloadDose(8, { lifts:['squat'] })
    expect(hi.a).toBe(1.5)                 // 8/4 clamped
    expect(hi.volMult).toBeGreaterThan(lo.volMult)
    expect(hi.freqBump).toBeGreaterThanOrEqual(lo.freqBump)
    expect(hi.selectedSets).toBeGreaterThan(lo.selectedSets)
  })
})

describe('overloadRisk', () => {
  it('tier escalates with lifts, weeks, low years, low readiness, unrealistic target', () => {
    const low  = overloadRisk({ targetPct:3, lifts:['squat'], overreachWeeks:3, years:3, readiness:0.7 })
    const high = overloadRisk({ targetPct:8, lifts:['squat','bench','deadlift'], overreachWeeks:8, years:0.5, readiness:0.3 })
    expect(['low','moderate']).toContain(low.tier)
    expect(['high','extreme']).toContain(high.tier)
    expect(high.reasons.length).toBeGreaterThan(low.reasons.length)
  })
})

describe('applyPreset', () => {
  it('returns a config for known presets, null otherwise', () => {
    expect(applyPreset('smolovJr').lifts).toEqual(['squat'])
    expect(applyPreset('nope')).toBeNull()
    expect(Object.keys(PRESETS).length).toBeGreaterThanOrEqual(5)
  })
})

describe('overloadCooldownWeeks', () => {
  it('scales with aggressiveness and weeks', () => {
    const d = overloadDose(4, { lifts:['squat'] })
    expect(overloadCooldownWeeks(d, 6)).toBeGreaterThanOrEqual(6)
  })
})

describe('generateOverload', () => {
  const prof = { ...baseProfile, overload: { enabled:true, lifts:['squat'], targetPct:5, overreachWeeks:4 } }
  it('selected lift gets more weekly working sets than a non-selected lift', () => {
    const plan = generateOverload(prof)
    const wk1 = plan.weeks[0]
    const sets = (lift) => wk1.sessions.flatMap(s => s.exercises).filter(e => e.baseLift === lift).reduce((n,e)=>n+e.sets,0)
    expect(sets('squat')).toBeGreaterThan(sets('bench'))
  })
  it('honors overreachWeeks and ends with a realization deload (intensity held, not RPE 6)', () => {
    const plan = generateOverload(prof)
    const last = plan.weeks[plan.weeks.length - 1]
    expect(last.isDeload).toBe(true)
    const anyMain = last.sessions.flatMap(s => s.exercises).find(e => ['squat','bench','deadlift'].includes(e.baseLift))
    expect(anyMain.rpeTarget).not.toBe(6)        // realization holds intensity
  })
  it('attaches overload metadata (risk, ev, dose, cooldown)', () => {
    const plan = generateOverload(prof)
    expect(plan.overload.risk.tier).toBeDefined()
    expect(plan.overload.dose.a).toBeCloseTo(1.25, 5)   // 5/4
    expect(plan.overload.cooldownWeeks).toBeGreaterThan(0)
  })
  it('is deterministic (two calls equal)', () => {
    expect(JSON.stringify(generateOverload(prof))).toBe(JSON.stringify(generateOverload(prof)))
  })
})
```

- [ ] **Step 2: Run → FAIL** `npm test -- src/engine/overload.test.js` (module missing).

- [ ] **Step 3: Implement `src/engine/overload.js`** — transcribe the spec's Fix 1 blocks (`overloadDose`, `PRESETS`/`applyPreset`, `overloadCooldownWeeks`, `generateOverload` wrapper) and use these concrete bodies for risk/EV:
```js
import { generate } from './generate.js'
import { MAIN_LIFTS } from './exercises.js'
import { defaultFrequency } from './frequency.js'

export const REALISTIC_MAX = 4
export const BASE_SETS = 5
export const MAINT_SETS = 3

export function overloadDose(targetPct, { lifts } = {}) {
  const a = Math.max(0, Math.min(1.5, (Number(targetPct) || 0) / REALISTIC_MAX))
  return { a, volMult: 1 + a * 0.6, freqBump: Math.round(a * 2),
    selectedSets: Math.max(1, Math.round(BASE_SETS * (1 + a * 0.6))), maintSets: MAINT_SETS }
}

export function overloadRisk({ targetPct, lifts = [], overreachWeeks = 3, years, readiness } = {}) {
  let score = 0; const reasons = []
  const a = Math.max(0, Math.min(1.5, (Number(targetPct) || 0) / REALISTIC_MAX)); score += a
  if (lifts.length >= 3) { score += 1; reasons.push('3종목 동시 과부하') }
  else if (lifts.length === 2) score += 0.5
  if (overreachWeeks >= 6) { score += 1; reasons.push('과부하 기간 김(≥6주, NFOR 위험)') }
  else if (overreachWeeks >= 4) score += 0.5
  if (years != null && years < 1) { score += 1; reasons.push('경력 1년 미만') }
  if (readiness != null && readiness < 0.4) { score += 1; reasons.push('readiness 낮음') }
  if ((Number(targetPct) || 0) > REALISTIC_MAX) { score += 1; reasons.push(`목표 ${targetPct}% 비현실적(>${REALISTIC_MAX}%)`) }
  const tier = score >= 3.5 ? 'extreme' : score >= 2.5 ? 'high' : score >= 1.5 ? 'moderate' : 'low'
  return { tier, score: Math.round(score * 100) / 100, reasons }
}

export function overloadEV(dose, risk) {
  const maxGain = Math.max(1, Math.round(dose.a * REALISTIC_MAX))
  return { upside: `성공 시 단기 +1~${maxGain}% 가능 (보장 아님)`,
    downside: '실패 시 정체·부상·번아웃 (non-functional overreaching)',
    note: `성공 확률은 목표·기간이 클수록 하락. 현재 위험도: ${risk.tier}.` }
}

export const PRESETS = {
  smolovJr:    { label: 'Smolov Jr (스쿼트)',    lifts: ['squat'],          targetPct: 5, overreachWeeks: 3, faithful: true },
  russianSquat:{ label: 'Russian Squat Routine', lifts: ['squat'],          targetPct: 4, overreachWeeks: 6, faithful: true },
  superSquats: { label: 'Super Squats (20렙)',    lifts: ['squat'],          targetPct: 4, overreachWeeks: 6 },
  gvt:         { label: 'German Volume Training',  lifts: ['squat'],          targetPct: 3, overreachWeeks: 5 },
  magOrt:      { label: 'Mag/Ort (데드)',          lifts: ['deadlift'],       targetPct: 5, overreachWeeks: 6 },
  bulgarian:   { label: 'Bulgarian (쇼크)',        lifts: ['squat', 'bench'], targetPct: 6, overreachWeeks: 3 },
}
export function applyPreset(key) { return PRESETS[key] ? { ...PRESETS[key] } : null }
export function overloadCooldownWeeks(dose, overreachWeeks) { return Math.round(overreachWeeks * (1 + dose.a)) }

export function generateOverload(profile) {
  const o = profile.overload ?? {}
  const preset = o.preset ? applyPreset(o.preset) : null
  const cfg = {
    lifts: (o.lifts && o.lifts.length ? o.lifts : preset?.lifts ?? []).filter((l) => MAIN_LIFTS.includes(l)),
    targetPct: o.targetPct ?? preset?.targetPct ?? REALISTIC_MAX,
    overreachWeeks: o.overreachWeeks ?? preset?.overreachWeeks ?? 3,
  }
  const dose = overloadDose(cfg.targetPct, { lifts: cfg.lifts })
  const frequency = { ...defaultFrequency(profile.daysPerWeek), ...(profile.frequency ?? {}) }
  for (const l of cfg.lifts) frequency[l] = Math.min(profile.daysPerWeek, (frequency[l] ?? 0) + dose.freqBump)
  const setsPerSession = {}
  for (const l of MAIN_LIFTS) setsPerSession[l] = cfg.lifts.includes(l) ? dose.selectedSets : dose.maintSets
  const transformed = {
    ...profile,
    mesoWeeks: cfg.overreachWeeks,
    deloadEnabled: true,
    frequency,
    volumeOverride: { main: { enabled: true, mode: 'fixed', setsPerSession }, accessory: profile.volumeOverride?.accessory },
    competition: { on: true, date: 'overload' },     // sentinel → peaking realization + intensity ramp (engine never parses the string)
  }
  const plan = generate(transformed)
  const risk = overloadRisk({ targetPct: cfg.targetPct, lifts: cfg.lifts, overreachWeeks: cfg.overreachWeeks, years: profile.years, readiness: o.readiness })
  return { ...plan, overload: { ...cfg, dose, risk, ev: overloadEV(dose, risk), cooldownWeeks: overloadCooldownWeeks(dose, cfg.overreachWeeks), preset: o.preset ?? null } }
}
```

- [ ] **Step 4: Run → PASS** the overload test file; then `npm test` (full — generate.js untouched, all existing goldens unchanged).

- [ ] **Step 5: Commit** `git add src/engine/overload.js src/engine/overload.test.js && git commit -m "feat(engine): overload mode wrapper (dose, risk/EV, presets, cooldown)"`

---

### Task 2: store + app routing

**Files:** `src/ui/store/profileStore.js` (DEFAULT_PROFILE.overload + deep-fill merge + a `setOverload` action mirroring existing setters), the call site that invokes `generate` (find via grep — likely `src/App.jsx` or `planAdapter`), `src/ui/lib/planAdapter.js`. Test: `profileStore.test.js`.

- [ ] **Step 1: Failing test** — in `profileStore.test.js`, assert defaults include `overload: { enabled:false, lifts:[], targetPct:4, overreachWeeks:3, preset:null }` and that merge deep-fills a missing `overload` for an old persisted profile. Match the file's existing default/merge test patterns (read first).
- [ ] **Step 2: Run → FAIL**.
- [ ] **Step 3: Implement** — add the `overload` default; extend the custom merge to deep-fill `overload` (mirror how `frequency`/`volumeOverride` are deep-filled); add `setOverload(partial)` action. Route generation: where the app builds the plan, `const plan = profile.overload?.enabled ? generateOverload(engineProfile) : generate(engineProfile)`. Ensure `planAdapter.toEngineProfile` carries `overload` through.
- [ ] **Step 4: Run → PASS**; `npm test` (full). Existing default/merge tests must still pass (additive field).
- [ ] **Step 5: Commit** `git commit -am "feat(store): overload profile field + app routing to generateOverload"`

---

### Task 3: OverloadPanel UI (configure)

**Files:** Create `src/ui/components/OverloadPanel.jsx` + `OverloadPanel.test.jsx`. Surface it in the wizard or summary (read where panels mount).

- [ ] **Step 1: Failing test** — toggle "오버로딩" reveals lift checkboxes + target%/weeks inputs + preset `<select>`; choosing a preset fills inputs; the computed risk tier text renders. (Use store + render; match existing wizard-step test patterns.)
- [ ] **Step 2: Run → FAIL**.
- [ ] **Step 3: Implement** — a checkbox `오버로딩 모드(도박수)` bound to `profile.overload.enabled` via `setOverload`. When enabled: S/B/D checkboxes (1–3, write `overload.lifts`), a target% number input (write `overload.targetPct`), overreach weeks input (3–8), and a preset `<select>` (options from `PRESETS`; on change call `applyPreset` and fill lifts/targetPct/overreachWeeks). Render `overloadRisk(...)`-derived tier + `overloadEV` inline. Pure-ish; writes via `setOverload`.
- [ ] **Step 4: Run → PASS**; `npm test` (full).
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(ui): OverloadPanel configure (lifts/target/weeks/preset + live risk)"`

---

### Task 4: RoutineView risk/EV/abort/cooldown banner + block display

**Files:** `src/ui/components/RoutineView.jsx` (+ maybe a small `OverloadBanner.jsx`) + test.

- [ ] **Step 1: Failing test** — when the plan has `overload` metadata, RoutineView renders a ⚠ banner with the risk tier + EV upside/downside + cooldown note; when absent, no banner. (Pass a plan with `overload` in props/store; match RoutineView test patterns.)
- [ ] **Step 2: Run → FAIL**.
- [ ] **Step 3: Implement** — when `plan.overload` present, render a prominent banner: "⚠ 오버로딩 = 도박수", tier, EV upside/downside/note, cooldown ("이후 약 N주 정상 훈련 권장"), an intentional-MRV-exceedance note (the existing VolumeWarnings already shows overage — add a one-line "의도적 초과(오버리칭)"), and an abort note tied to `detectOverreaching(liftLog)` → "abort 권고" when flagged. Additive; renders nothing when no overload metadata.
- [ ] **Step 4: Run → PASS**; `npm test` (full). If a RoutineView test changes, update minimally (additive).
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(ui): overload risk/EV/abort/cooldown banner in RoutineView"`

---

### Task 5: Honest disclosure + roadmap

**Files:** `src/ui/components/LimitsPanel.jsx`, `docs/PROJECT_STATUS.md` (§3 + §4 mark overload mode done). Test: LimitsPanel.test.jsx if counts asserted.

- [ ] **Step 1: Add bullets** —
```jsx
<li><strong>오버로딩 모드</strong>는 의도적 과부하 <strong>도박수</strong>입니다 — 결과는 보장되지 않으며 목표 상승폭은 공격성 조절 입력일 뿐입니다(실패 시 정체·부상·번아웃). 선택 종목은 <strong>의도적으로 MRV를 초과</strong>하고, 마지막 주에 realization 테이퍼(강도 유지·볼륨 감소) 후 테스트합니다.</li>
<li>오버로딩 dose·위험도·쿨다운·기대값 계수는 코칭 컨센서스 방향의 <strong>휴리스틱(근거 약함)</strong>이며, 프리셋 중 Smolov Jr·Russian Squat 외에는 원 프로그램의 정확 세트/렙 표가 아닌 파라미터 시드입니다. ACWR은 게이트로 쓰지 않습니다.</li>
```
- [ ] **Step 2: PROJECT_STATUS** — §3 matching bullets; §4 mark "다종목 묶음 오케스트레이션"/overload-related items + add overload mode done.
- [ ] **Step 3: Run** `npm test`; update LimitsPanel.test.jsx if needed.
- [ ] **Step 4: Commit** `git commit -am "docs: honest disclosure for overload mode"`

---

## Self-Review
- overload.js engine → Task 1; store+routing → Task 2; configure UI → Task 3; display/banner → Task 4; disclosure → Task 5. ✓
- No placeholders: overload.js full code provided; tests concrete. UI tasks give contracts + reuse existing patterns (implementer reads live files).
- Types: `generateOverload(profile)`, `overloadDose`, `overloadRisk`, `applyPreset`, `overloadCooldownWeeks`, `setOverload` consistent across tasks.

## Bit-identity
`generate.js` untouched. Overload reached only when `overload.enabled`. Store deep-fill defaults OFF → existing users byte-identical. Tasks 3-5 additive UI/docs.
