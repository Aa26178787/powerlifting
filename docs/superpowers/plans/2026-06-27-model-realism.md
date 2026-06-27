# Plan — Three Model-Realism Fixes (2026-06-27)

Spec: `docs/superpowers/specs/2026-06-27-model-realism-design.md`. TDD, branch `feat/model-realism-fixes`.

## Step 1 — `e1rm.js`: high-rep correction + RPE-derived load
- Add `highRepCorrection(reps)` and `loadForRpe(e1rm, reps, rpe, inc)`.
- Tests (`e1rm.test.js`): correction = 1.0 at ≤5 reps; >1 and ≤1.06 above 5; `loadForRpe(e1rm,3,8.5) === workingWeight(e1rm,3,8.5)` (strength unchanged); `loadForRpe(200,9,8.5) > workingWeight(200,9,8.5)` (hypertrophy heavier, consistent with label).

## Step 2 — `volume.js`: caps + load ramp
- Add `PER_SESSION_CAP = { squat:6, bench:8, deadlift:4 }` and `loadRamp(weekIndex, totalWeeks)`.
- Tests (`volume.test.js`): caps present & deadlift lowest; `loadRamp(0,N)===1`, last working week `=== 1.04`, monotonic, `1` for single week, bounded ≤1.04.

## Step 3 — `quality.js`: weightFor uses loadForRpe
- rpe branch → `loadForRpe`. Tests: `weightFor('strength',200)===175` still; `weightFor('hypertrophy',200)` now `> workingWeight(200,9,8.5)` and consistent with 9@8.5.

## Step 4 — `setSchemes.js`: strengthHypertrophy backoff RPE-derived
- backoff = `loadForRpe(e1rm, hZ.repAnchor, hZ.rpeTarget)`. Tests: backoff weight `> e1rm*0.67` rounded and still `< top`.

## Step 5 — `tuner.js` + `generate.js`: apply per-session caps
- tuner clamps `setsPerSession` by `PER_SESSION_CAP`. generate clamps `cappedSetsPerSession` + priority bump by cap. Tests (`tuner.test.js`/`generate.test.js`): deadlift freq-1 session ≤ 4 working sets; squat ≤ 6; bench ≤ 8.

## Step 6 — `periodization.js`: load ramp + ceiling + cap in weekly ramp + drop rpe creep
- `buildExercise`: `base`, `eff = base*loadRamp`, ceiling clamp `base*0.975`, `rpeTarget = cap(z.rpeTarget)`, drop `rpeOffset` param.
- weekly ramp: add `PER_SESSION_CAP` to the `cap`.
- Tests (`periodization.test.js`): week-N top-set weight `>` week-1 for a strength lift; no working set `> base*0.975`; deadlift session sets ≤ 4 across weeks.

## Step 7 — `deload.js`: loadForRpe for consistency. Keep finite-weight tests green.

## Step 8 — Golden churn cleanup
- Run `npx vitest run`; fix any structural expectations shifted by the caps/loads. Expect: strength exact-value tests unchanged; hypertrophy/endurance loads up; deadlift set counts down.

## Step 9 — Numeric validation (extend `demo.js` ad-hoc script)
Print: week1 vs last-working-week top-set weight per lift (must rise, bounded); deadlift sets/session (≤4); hypertrophy/strengthHypertrophy backoff load vs its RPE-8.5 label (must match chart×correction).

## Step 10 — Honesty + build
- LimitsPanel + PROJECT_STATUS §3: three new bullets. `npx vitest run` + `npm run build` green. Commit, push, PR (no merge).
