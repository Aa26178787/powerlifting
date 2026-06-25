# v3 Program-Structure Sub-Project — Design Spec (2026-06-26)

Layered on the live v3 app. Three user-requested features, built together because they all reshape the generated mesocycle and its display:

1. **Configurable mesocycle length** — user inputs working-week count + deload on/off (no longer fixed 3+1).
2. **Variation control** — exclude unavailable/disliked tools (bands, boards, box, …) + per-lift manual variation override.
3. **Set-structure engine** — the generator assigns an evidence-grounded *set scheme* per exercise (straight, top-set+back-off, cluster, pyramid, …) and renders each set concretely (`100kg × 3회 @RPE8`) instead of a bare rep range.

Research basis: `docs/research/2026-06-26-set-schemes-catalog.md` (verified deep-research run). Engine stays pure/deterministic. Korean UI, English engine values. Reuses all existing v3 modules.

## Global Constraints

- Pure deterministic engine (no Date.now/Math.random/I/O). JSON imports use `with { type: 'json' }`.
- Korean display via i18n label maps; engine-facing values stay English.
- Weights rounded via existing `roundToIncrement` (2.5 kg). Weight is an **autoregulation suggestion**, never a fixed prescription — keep the "자동조절" framing.
- Node 26 test setup unchanged (MemoryStorage polyfill + `// @vitest-environment jsdom` pragma on component tests).
- Backward-compatible persist: extend the store `merge` to deep-fill new fields; **no version bump** (would discard saved profiles).
- 8-step wizard count unchanged — new controls fold into existing steps.
- Honest-limits: schemes lacking RCT support are labelled 근거 약함; specialty-scheme marginal benefit (g=0.159) disclosed.

---

## Feature 1 — Configurable mesocycle length

**Profile fields (new):** `mesoWeeks` (int working weeks, default 4, clamp 3–8), `deloadEnabled` (bool, default true).

**Engine:**
- `generate.js` reads `mesoWeeks`/`deloadEnabled`. Working weeks = `buildWorkingWeeks(..., mesoWeeks)`; append `buildDeloadWeek` only if `deloadEnabled`. `plan.weeks.length === mesoWeeks + (deloadEnabled ? 1 : 0)`.
- `buildWorkingWeeks(templateKey, daysPerWeek, ctx, totalWeeks)` loops `w < totalWeeks` (was hard-coded 3). `weekPlan` gains `totalWeeks` so the intensity wave + adaptive concentration scale to any N:
  - `rpeOffset(w, N) = (N <= 1 ? 0 : w/(N-1)) * 1.0` (linear 0→1 ramp).
  - adaptive `weekProg = (N <= 1 ? 0 : w/(N-1)) * 0.75`.
- `periodizationModel.js`: replace the fixed `WAVE = [0,0.5,1.0]` lookup with the computed ramp; `MODELS[*].weekOffsets` becomes a function of `(w, N)` (keep a `weekOffset(model, w, N)` helper; preserve existing exported behaviour for N=3 so current tests pass: w=0→0, w=1→0.5, w=2→1.0).
- Phase derivation for scheme picking: `phaseFor(w, N, peaking)` → `'accumulation'` (first third), `'intensification'` (middle), `'peak'` (last working week when peaking, else still intensification).

**UI:** `StepPeriodization` gains a number input 운동 주차 (3–8) bound to `mesoWeeks` and a 디로드 포함 checkbox bound to `deloadEnabled`.

---

## Feature 2 — Variation control

**Profile fields (new):** `excludedTools` (string[] of tool-group keys, default `[]`), `variationOverride` (`{squat,bench,deadlift}` of exercise-name|null, default all null).

**Tool-group → equipment-tag map** (engine `excludableTools.js`): user-facing groups expand to DB equipment tags so exclusion subtracts from the available set:
- `band` → `['band','bands','cables/band']`, `chain` → `['chains']`, `board` → `['1 board','2 boards','3 boards','4–5 boards']`, `box` → `['box']`, `deficit` → `['deficit']`, `pin` → `['pins','rack pins','rack uprights']`, `swissBar` → `['swiss bar','cambered bar','duffalo bar']`, `chao` (sled/specialty) optional. Export `excludeTags(excludedTools)` → flat tag array, and `groupLabel`/list for the UI.

**Engine wiring:**
- `planAdapter.toEngineProfile`: `equipment: allEquipment().filter(t => !excludeTags(form.excludedTools).includes(t))`. (Replaces the unconditional full set.) An exercise needing an excluded tag is then filtered out by the existing `query` `every()` rule.
- `variationOverride`: in `periodization.js resolveName` and `generate.js sparingSwap`, for a variation slot of lift `L`, if `ctx.variationOverride[L]` is a valid exercise name present in the (post-exclusion) pool, use it; else fall back to the engine `pick`. Comp slots ignore override.

**UI:** `StepStyle` gains:
- 제외할 도구 — checkbox list of tool groups (label via i18n) toggling `excludedTools`.
- per-lift 변형 선택 — a dropdown per lift listing `자동` + candidate variation names (`query({category:'variation', targetLift:L, equipmentAvailable: post-exclusion set})`), bound to `variationOverride[L]`.

---

## Feature 3 — Set-structure engine

New module `src/engine/setSchemes.js`. Each exercise produced by `buildExercise` gains a `scheme` object; `RoutineView` renders its `sets` line-by-line.

### Exercise shape (extended)

```js
ex = {
  lift, baseLift, quality, rpeTarget, pct, weight,   // kept (weight = headline suggestion)
  scheme: {
    type,                       // scheme key, e.g. 'topSetBackoff'
    evidenceTier,               // 'rct' | 'consensus'
    sets: [                     // concrete per-set rows
      { weight, reps, rpe, label, note }   // reps may be a number or a string ('AMRAP','2+2+2')
    ],
    note,                       // scheme-level note (e.g. '밴드 적용', '폭발 종목과 교대 180s')
    group                       // optional: id linking multi-exercise schemes (superset/contrast)
  },
  sets: scheme.sets.length,     // back-compat count
  reps,                          // kept = zone reps range (for CSV/legacy)
}
```

### Scheme registry

`SCHEMES[key] = { key, labelKey, qualities:[...], roles:[...], phases:[...], fatigue:1-5, evidenceTier, advancedOnly?, expand(ctx) }`.

`expand(ctx)` is pure; `ctx = { e1rm, zone, baseSets, weekIndex }` where `e1rm` is the effective (modifier-applied) e1RM and `zone = ZONES[quality]`. Returns `{ sets:[...], note? }`. All weights via `roundToIncrement`.

**Single-exercise schemes (build all):**

| key | labelKey (KO) | expand summary | qualities | roles | phases | tier | fatigue |
|-----|------|------|------|------|------|------|------|
| straight | 스트레이트 | `baseSets ×` {reps: zone.repAnchor, w: weightFor, rpe: zone.rpeTarget} | str/hyp/end | all | all | rct | 2 |
| topSetBackoff | 탑세트+백오프 | top {reps zone.reps[0], w e1rm·zone.pct[1], rpe zone.rpeTarget} + (baseSets-1)×{reps zone.reps[1], w top·0.88, rpe -1} | strength | comp/var | intens | consensus | 3 |
| topSingleBackoff | 탑싱글+백오프 | top {reps 1, w e1rm·0.90, rpe 8.5} + (baseSets-1)×{reps 3, w top·0.85} | power/str | comp | peak | consensus | 4 |
| ascendingPyramid | 어센딩 피라미드 | baseSets sets, w `pct[0]→pct[1]`, reps `reps[1]→reps[0]` | strength | comp/var | accum/intens | consensus | 3 |
| reversePyramid | 역피라미드 | top first (pct[1], reps[0]) then w↓ reps↑ | str/hyp | var/acc | accum | consensus | 3 |
| wave | 웨이브(3-2-1) | one/two waves of {reps 3,2,1} ascending w; 2nd wave heavier | str/power | comp/var | intens/peak | consensus | 3 |
| amrapTop | AMRAP/PR세트 | (baseSets-1)×{reps zone.reps[1]} + final {reps 'AMRAP', note 한계까지} | str/hyp | comp/var | accum | consensus | 3 |
| ramping | 램핑(데일리맥스) | ascending singles (3-5) to top {reps 1, rpe 9} | strength | comp | peak | consensus | 4 |
| cluster | 클러스터 | baseSets ×{reps '2+2+2' note '세트내 20-30s 휴식', w e1rm·0.85} | power | comp/var | intens/peak | rct | 3 advancedOnly |
| restPause | 레스트포즈 | one {reps `a+b+c`, note '15-20s 후 재개', w pct mid, rpe 9} | hypertrophy | acc | accum | rct | 4 |
| dropSet | 드롭세트 | top + 2 drops (-20% each, reps↑), note 연속 | hypertrophy | accessory | accum/intens | rct | 4 |
| myoReps | 마이오렙 | activation {rpe 9} + 3×{reps 3-5 note '3-5호흡'} | hypertrophy | accessory | accum | consensus | 4 |
| widowmaker | 위도우메이커(20rep) | single {reps 20, w e1rm·0.50, rpe 9.5} | hyp/end | accessory | accum | consensus | 5 |

**Multi-exercise / modifier schemes (v1 = represent, don't fully orchestrate):**
- `contrastPAP` (rct, power+strength): on a power comp/variation slot when advanced — keep the heavy sets but add `note: '폭발 종목과 세트 교대 (180s, ≥48h 회복)'` and `group` id. Full plyo pairing deferred (honest note).
- `superset`/`giant` (consensus): for accessories, tag pairs/triples with a shared `group` id; RoutineView shows them묶음. v1 groups *accessories only*.
- **Modifiers** (flags on an existing scheme, not standalone): `accommodating` (bands/chains) — only when `advanced && topSet load ≥0.80 e1rm` on a main lift in intensification → `scheme.note += ' · 밴드/체인 가능'`; `tempo`/`paused` — on variations → note. These set notes only; no separate set math in v1.

### Picker

`pickScheme({ quality, role, phase, advanced, peaking, weekIndex })` → scheme key, deterministic:
1. Build candidate list from `quality`+`role`+`phase` (table above).
2. Drop `advancedOnly` schemes when `!advanced` (fallback retained: straight for accessory, topSetBackoff for comp/var strength, etc.).
3. Pick `candidates[weekIndex % candidates.length]` (deterministic variety across weeks).
4. Accessories: hypertrophy → cycle [straight, restPause, dropSet, myoReps]; endurance → [straight, widowmaker]; else straight.

Default-heavy bias per research: when in doubt → `straight`. The candidate tables keep straight as the first entry for most accumulation cases.

### Wiring

`periodization.js buildExercise`: after computing name/quality/effective-e1rm, call `pickScheme` (role from `slotTypeForRole`/category; phase from `phaseFor(weekIndex, totalWeeks, peaking)`; advanced from ctx) then `SCHEMES[key].expand(...)`; attach `ex.scheme`. Region-status volume scale still multiplies `baseSets` before expansion. `buildDeloadWeek`: force `straight` at reduced load (deloads aren't the place for specialty schemes).

`RoutineView`: render `ex.scheme.sets` as one line each — `{i}세트: {weight}kg × {reps}{rpe? @RPE rpe} {note}`. Header keeps lift + quality + 자동조절 note. Grouped schemes render under a 묶음 label. `exportCsv.planToCsv`: one CSV row per set (columns: 주차, 일차, 운동, 세트, kg, 반복, RPE, 비고).

---

## Store

New fields + actions: `mesoWeeks`(4)/`deloadEnabled`(true) via `setField`; `excludedTools`([]) via `toggleExcludedTool(tool)`; `variationOverride`({squat:null,bench:null,deadlift:null}) via `setVariationOverride(lift,name)`. Extend persist `merge` to deep-fill all four (objects spread over defaults; `excludedTools` array fallback `?? current`).

## i18n

`schemeLabel(key)`, `toolGroupLabel(key)`, `phaseLabel(key)`, `evidenceLabel('rct'|'consensus')` → ('검증','근거 약함'). Step labels unchanged.

## LimitsPanel (append)

- 세트 구조는 자질·주차에 맞춰 자동 배정됩니다. 특수 구조는 스트레이트 세트 대비 효과 차이가 작다는 연구(g=0.159)가 있어, 다양성·시간효율·피로관리 목적이 큽니다.
- '근거 약함' 표시 구조(피라미드·웨이브·AMRAP 등)는 RCT보다 코칭 컨센서스에 기반합니다.
- 콘트라스트/슈퍼세트 등 다종목 묶음은 v1에서 표시만 제공하며 완전 자동 구성은 후속입니다.

## Testing

Per-task TDD, focused green per task, full suite green at the final task. Golden tests for each `expand` (deterministic set rows), `pickScheme` mapping, week-count scaling, exclusion filtering, override forcing, RoutineView per-set render, CSV per-set rows, store + persist merge.

## Out of scope (honest, deferred)

Full plyometric pairing for contrast/PAP; main-lift supersets; EMOM/density timing; user-pickable set scheme (engine auto-assigns); per-set user editing (display only, per the user's choice).
