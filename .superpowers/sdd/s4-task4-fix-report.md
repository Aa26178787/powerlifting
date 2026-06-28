# S4 Task 4 Fix Report — OverloadBanner abort circuit (prop rename)

## Bug Summary

`OverloadBanner`'s abort circuit called `detectOverreaching(liftLog ?? [])` where `liftLog` holds
performance log entries (`{lift, weight, reps, rpe, …}`) that carry **no** `.readiness` field.
`detectOverreaching` reads `.readiness` from each entry; without it every entry evaluates to
`undefined`, all comparisons return `false`, and the abort flag is always `false`.
The correct source is `checkinLog` (`{week, day, readiness}` check-in entries), which RoutineView
already had in scope for the existing (separate) overreaching banner.

---

## Changes Made

### 1. `src/ui/components/OverloadBanner.jsx`
- JSDoc: renamed `liftLog` description → `checkinLog`.
- Destructuring parameter: `{ overload, liftLog }` → `{ overload, checkinLog }`.
- Abort call: `detectOverreaching(liftLog ?? [])` → `detectOverreaching(checkinLog ?? [])`.

### 2. `src/ui/components/RoutineView.jsx` (line 134)
- `<OverloadBanner overload={plan.overload} liftLog={liftLog} />`
  → `<OverloadBanner overload={plan.overload} checkinLog={checkinLog} />`
- `checkinLog` was already in scope (used on line 125 by the existing overreaching banner
  `detectOverreaching(checkinLog)`). No new variables needed.
- `liftLog` remains in scope for `InsightsPanel` and `e1rmMap` — untouched.

### 3. `src/ui/components/OverloadBanner.test.jsx`
- All `liftLog={…}` prop references in render calls renamed to `checkinLog={…}` (8 occurrences).
- Three test description strings updated to say `checkinLog` instead of `liftLog`.
- Test data entries already carried `.readiness` fields — the abort-positive test
  (`{readiness: 0.48}, {readiness: 0.38}, {readiness: 0.28}`) now exercises the **real** production
  path (strict monotonic decline + all < 0.5 → Rule 1 of `detectOverreaching`).
- Negative cases present: empty checkinLog and healthy readiness ([0.8, 0.75, 0.85]) both confirm
  no abort banner rendered.

---

## Abort Circuit Verification

| Test case | checkinLog data | Expected | Result |
|-----------|-----------------|----------|--------|
| Declining, all < 0.5 | [0.48, 0.38, 0.28] | abort shown | PASS |
| Empty log | [] | no abort | PASS |
| Healthy (stable/high) | [0.80, 0.75, 0.85] | no abort | PASS |

`detectOverreaching` Rule 1 fires: strict monotonic decline + all < 0.5.
Before the fix the rule never fired because `.readiness` was always `undefined` on liftLog entries.

---

## Pre-existing RoutineView Overreaching Banner

Unchanged. Line 125: `const over = detectOverreaching(checkinLog)` and line 130–132
(`over.flag` renders `.overreaching-banner`) use `checkinLog` directly and were not touched.
The RoutineView test suite (24 tests) still passes in full.

---

## Test Results

- `OverloadBanner.test.jsx`: **11/11 passed** (abort-positive + two negative cases confirmed)
- Full suite: **745 tests, 53 test files — all passed**
- No assertions weakened; no tests removed.
