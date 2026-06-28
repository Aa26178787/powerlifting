# S2 Final-Review Fix Wave — Report

Branch: `feat/long-mesocycle-block-periodization`

## Full-Suite Summary

| State | Files | Tests |
|---|---|---|
| Before (baseline) | 48 passed | 695 passed |
| After (all 4 fixes) | 48 passed | **699 passed** |

No existing assertion weakened. 4 new tests added (Fix 1: 1, Fix 3: 3; Fix 4 added assertions within an existing test).

---

## Fix 1 — Realization must not resurrect region-dropped lifts

**File:** `src/engine/deload.js` (realization branch, lines 8–17)

**Change:**
```js
// Before:
const sets = Math.max(1, Math.round(ex.sets * 0.4))
...
scheme: { ..., sets: Array.from({ length: sets }, () => ({ ...sampleSet })) }

// After:
const sets = ex.sets < 1 ? 0 : Math.max(1, Math.round(ex.sets * 0.4))
...
scheme: { ..., sets: sets === 0 ? [] : Array.from({ length: sets }, () => ({ ...sampleSet })) }
```

**TDD (RED→GREEN):**
- Added test `'realization of 0-set exercise (region-dropped) produces 0 sets and empty scheme (Fix 1)'` in `src/engine/deload.test.js`
- Confirmed RED (`expected 1 to be +0`) before fix, GREEN after fix
- Recovery branch was already correct: `Math.ceil(0/2) = 0`, so only realization needed patching

---

## Fix 2 — Strip `phaseWeekIndex` from engine output

**File:** `src/engine/generate.js` (final `weeks.map` return, after line 354)

**Change:**
```js
// Before:
return { ...wk, sessions, muscleVolume: summarize(weekLedger) }

// After:
// Fix 2: strip internal phaseWeekIndex from output (restore strict ≤8 byte-identity).
// The accessory pass above reads wk.phaseWeekIndex before this return — still intact.
const { phaseWeekIndex: _pwi, ...wkRest } = wk
return { ...wkRest, sessions, muscleVolume: summarize(weekLedger) }
```

**Rationale:** `wk.phaseWeekIndex` is stamped by the work-week loop (line 163) for the accessory phase pass at line 198. Destructuring it out of the returned object prevents the internal bookkeeping field from leaking into consumer-visible plan weeks, restoring the same output shape as ≤8-week single-block plans had before multi-block support was added.

---

## Fix 3 — Generate-level realization integration test

**File:** `src/engine/generate.test.js` (new `describe` block at end of file)

**Tests added (all GREEN on first run — existing behavior confirmed):**

1. `'PEAKING plan trailing deload holds intensity (rpeTarget !== 6) — realization'`
   - 4-week peaking plan + deloadEnabled: true → trailing deload is realization
   - Asserts all main-lift exercises in trailing deload have `rpeTarget !== 6`

2. `'NON-PEAKING plan trailing deload drops to rpeTarget 6 — recovery'`
   - Same profile with `competition: { on: false }` → trailing deload is recovery
   - Asserts all main-lift exercises in trailing deload have `rpeTarget === 6`

3. `'>8-week peaking plan: mid-plan deload is recovery (rpeTarget 6), final deload is realization (rpeTarget !== 6)'`
   - 12-week peaking plan (planLayout → 6 work + deload + 6 work + deload = 14 weeks, 2 deloads)
   - Confirms mid-plan deload (block-1 trailing, not lastEntry) → recovery (`rpeTarget === 6`)
   - Confirms final deload (block-2 trailing = lastEntry in peaking plan) → realization (`rpeTarget !== 6`)

Annotated `// realization isolation integration (S2 final-review)`.

---

## Fix 4 — Strengthen realization unit test

**File:** `src/engine/deload.test.js` (existing `'realization holds intensity and cuts volume ~0.4'` test)

**Assertions added (GREEN from the start — code was already correct):**
```js
expect(ex.scheme.sets.length).toBe(2)        // round(5*0.4)=2 scheme sets
expect(ex.scheme.sets[0].rpe).toBe(8.5)      // held rpe from sampleSet
expect(ex.scheme.sets[0].weight).toBe(200)   // held weight from sampleSet
```

These verify that `buildDeloadWeek`'s realization branch correctly propagates the sample-set content (not just the count and top-level fields) into `scheme.sets`.

---

## No Weakened Assertions

All 695 prior tests pass unchanged. No existing assertion was relaxed, narrowed, or removed.
