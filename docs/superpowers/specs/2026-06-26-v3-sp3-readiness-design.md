# v3 SP3 — Daily Check-in Readiness Autoregulation (Design Spec, 2026-06-26)

Layered on the live v3 app. Delivers the original-vision daily autoregulation: enter today's condition → that session's loads/volume adjust and painful regions are handled, plus an overreaching monitor that flags when to deload.

**Decisions (user, 2026-06-26):** session-level **inline panel** in RoutineView; v1 scope = **adjustment + overreaching monitor**; levers = **load + volume + region swap/drop**.

Research basis (verified, from the v3 deep-research): autoregulation ≥ fixed loading; sleep loss hits **power most (−6.26%)** then strength (−2.85%) → low readiness cuts power/lower-body load hardest. ACWR injury-prediction refuted (not used). Engine stays pure/deterministic. Reuses `regionStatus.js`, `variations.pick`, `roundToIncrement`.

## Global Constraints

- Pure deterministic engine (no Date.now/Math.random/I/O). The check-in log stores caller-supplied `week`/`day` indices, never timestamps.
- Korean display via i18n maps; engine values English. Weights via `roundToIncrement`.
- Component tests: first line `// @vitest-environment jsdom`.
- Persist `merge` deep-fills the new `checkinLog`; no version bump.
- Weight remains an autoregulation **suggestion** ("자동조절").

## Data shapes

```js
checkin = {
  sleepHours: number,        // e.g. 7.5
  stress: 1..5,              // 1 best, 5 worst
  systemicFatigue: 1..5,     // 1 best, 5 worst
  regionStatus: { [region]: 0..3 },   // today's per-region pain/fatigue (defaults from profile)
}
checkinLogEntry = { week: number, day: number, readiness: 0..1 }
```

## Engine: `src/engine/readiness.js` (pure)

- `readinessScore(checkin) -> 0..1` — average of three sub-scores, each clamped to [0,1]:
  - sleep: `(sleepHours - 4) / 4` (4h→0, 8h→1)
  - stress: `(5 - stress) / 4` (5→0, 1→1)
  - fatigue: `(5 - systemicFatigue) / 4`
  - return rounded to 2 decimals.
- `QUALITY_SENSITIVITY = { power: 1.5, strength: 1.0, hypertrophy: 0.7, endurance: 0.5 }`.
- `loadFactor(readiness, quality) -> number` — `round2(1 - (1 - readiness) * 0.10 * (QUALITY_SENSITIVITY[quality] ?? 1))`. At readiness 0: power 0.85, strength 0.90, hypertrophy 0.93, endurance 0.95. At readiness 1: 1.00 for all.
- `setsToDrop(readiness) -> 0|1|2` — `<0.3 → 2`, `<0.5 → 1`, else 0.

## Engine: `src/engine/applyReadiness.js` (pure)

`applyReadiness(session, checkin) -> { session, readiness, notes }`. Reuses `byName`, `regionMaxStatus`/`shouldAvoid`/`shouldSwap` (regionStatus.js), `pick` (variations.js). Does NOT need raw e1RM — it scales existing set weights by ratios.

For each working exercise (has `scheme.sets` with numeric `weight`):
1. **Region status 3** on any stressed region (`regionMaxStatus(byName(ex.lift), checkin.regionStatus) === 3`): drop the exercise; push note `"<baseLift> 오늘 <region> 통증으로 제외"`.
2. **Region status 2** (`shouldSwap`): try `pick(baseLift, stickingPoint?, style?, allEquipment-ish, advanced)` for a sparing variation that does NOT stress a status-≥2 region; if found and different, swap `ex.lift` to it and rescale every set weight by `newMod/oldMod` (`byName(name)?.e1rmModifier ?? 1`); push note `"<region> 보호: <new> 로 교체"`. If none found, keep the lift but apply the load cut only.
   - The pick context (stickingPoint/style/advanced) is carried on `session`/exercises only loosely; v1 may call `pick(baseLift, 'none', {}, broadEquip, true)` — a sparing swap need not honor style. Keep simple; deterministic.
3. **Load**: multiply each `scheme.sets[].weight` by `loadFactor(readiness, ex.quality)` (after any swap rescale), `roundToIncrement`.
4. **Volume**: drop the last `setsToDrop(readiness)` sets but never below 1 and never drop the labelled top set (drop from the tail); update `ex.sets = scheme.sets.length`.

For each accessory (scheme sets have no `weight`):
- Region status 3 → drop (note). Otherwise trim `setsToDrop` trailing sets (≥1). No weight change (load by feel).

Return the adjusted session (same shape: `{ day, exercises, accessories, notes }` with notes appended) plus `readiness` (for logging) and the collected `notes`.

## Engine: `src/engine/overreaching.js` (pure)

`detectOverreaching(log) -> { flag: boolean, reason?: string }`:
- `log.length < 3` → `{ flag: false }`.
- last 3 readiness strictly declining AND all `< 0.5` → `{ flag: true, reason: 'readiness 3회 연속 하락 (과피로 의심)' }`.
- last 3 all `< 0.35` → `{ flag: true, reason: 'readiness 지속 매우 낮음 — 디로드 권장' }`.
- else `{ flag: false }`.

## Store (`profileStore.js`)

- Top-level state `checkinLog: []` (sibling of `profile`/`plan`). Action `logCheckin(entry)` appends. `clearCheckinLog()` resets to `[]`.
- Persist `merge` keeps `checkinLog` (`persisted.checkinLog ?? []`).

## i18n

`readinessLabel` not needed; add field labels inline in the component. Reuse `regionLabel`, `liftLabel`, `qualityLabel`.

## UI: `src/ui/components/CheckinPanel.jsx`

`CheckinPanel({ session, weekIndex, onApply })`:
- Local state seeded from defaults: `sleepHours` (number, default 7), `stress` (1-5, default 2), `systemicFatigue` (default 2), `regionStatus` (compact 0-3 grid over the 10 regions, default 0).
- A "컨디션 반영" button → builds `checkin`, calls `applyReadiness(session, checkin)`, then `onApply({ adjusted, readiness, weekIndex, day: session.day })`.
- Shows the computed readiness as a 0-100% badge after applying.

## UI: RoutineView integration

- RoutineView becomes stateful: `const [adjusted, setAdjusted] = useState({})` keyed by `\`${weekIndex}-${day}\``. Each session renders a collapsible `CheckinPanel`; `onApply` stores the adjusted session and calls `useProfileStore.getState().logCheckin({ week, day, readiness })`.
- When a session has an adjusted entry, render the **adjusted** session (loads/sets/notes) with a `오늘 readiness NN%` badge; otherwise the base session.
- Top of the routine: if `detectOverreaching(checkinLog).flag`, show a warning banner with the reason + "디로드를 고려하세요".
- Pass `checkinLog` from the store into RoutineView (or read it inside).

## App

`App.jsx` passes nothing new structurally; RoutineView reads `checkinLog` from the store via a selector.

## LimitsPanel (append)

- 일일 컨디션 입력은 그날 부하·볼륨을 자동 조절하고 통증 부위 운동을 줄이거나 교체합니다. 수면·스트레스·피로의 readiness 환산은 합리적 기본식이며 개인 보정이 필요합니다.
- 과피로 경보는 readiness 추세에 기반한 단순 신호로, 의학적 진단이 아닙니다. ACWR 부상 예측 지표는 신뢰성 문제로 쓰지 않습니다.

## Testing

Per-task TDD; full suite green at the final task. Golden tests: readinessScore/loadFactor/setsToDrop math; applyReadiness load-scaling + set-trim + status-3 drop + status-2 swap-rescale; detectOverreaching trend cases; store log + merge; CheckinPanel applies + reports readiness; RoutineView shows adjusted session + overreaching banner.

## Out of scope (deferred, honest)

Per-set logged-RPE → next-session feedback (RpeLogger wiring); HRV/objective readiness; progress-driven periodization-model auto-switch; cross-device check-in history; style/sticking-aware sparing swaps (v1 swap ignores style).
