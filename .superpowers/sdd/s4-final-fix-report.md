# s4 Final Fix Report — OverloadPanel.jsx (feat/overload-mode)

Date: 2026-06-29

---

## Fix 1 — Clamp targetPct input

**File:** `src/ui/components/OverloadPanel.jsx` line 25–27

**Change:** `handleTargetPct` previously stored raw `Number(e.target.value)` (could be 0, negative, or >10). Now clamps:

```js
const v = Math.max(1, Math.min(10, Number(e.target.value) || 1))
setOverload({ targetPct: v })
```

Input element already had `min={1}` / `max={10}` attrs — kept consistent.

**New test:** `'clamps targetPct: 0 → 1, 99 → 10'` in `OverloadPanel.test.jsx` line 97–107.
- `fireEvent.change(input, { target: { value: '0' } })` → store value is `1` ✓
- `fireEvent.change(input, { target: { value: '99' } })` → store value is `10` ✓

---

## Fix 2 — Compute dose/risk/ev only when enabled

**File:** `src/ui/components/OverloadPanel.jsx` lines 42–48 (before → after)

**Change:** Replaced three unconditional top-level `const` calls with a guarded `if (o.enabled)` block:

```js
let dose, risk, ev
if (o.enabled) {
  dose = overloadDose(...)
  risk = overloadRisk(...)
  ev   = overloadEV(dose, risk)
}
```

Pure-function semantics unchanged when enabled. No new test needed (efficiency/clarity fix only — covered implicitly by all enable-path tests passing).

---

## Fix 3 — Min-1-lift validation hint

**File:** `src/ui/components/OverloadPanel.jsx` lines 71–75 (inside the fieldset, after lift checkboxes)

**Change:** Added conditional paragraph after the lift checkbox list:

```jsx
{o.lifts.length === 0 && (
  <p style={{ color: '#c00', fontSize: '0.85em', margin: '4px 0 0' }}>
    공략할 종목을 1개 이상 선택하세요
  </p>
)}
```

Non-blocking — generation is not prevented. Hint appears only when `o.enabled && o.lifts.length === 0`.

**New test:** `'shows min-1-lift hint when enabled with no lifts; hint disappears after checking a lift'` in `OverloadPanel.test.jsx` lines 109–120.
- After enabling toggle (no lifts selected) → hint text visible ✓
- After clicking 스쿼트 checkbox → hint absent ✓

---

## Test counts

| Phase | Files | Tests |
|-------|-------|-------|
| Before (baseline) | 53 | 745 |
| After (this wave) | 53 | 747 |

OverloadPanel.test.jsx: 10 existing → 12 (added 2 new, none weakened).

Full suite after: **53 files / 747 tests — all passed**.

---

## No existing assertions weakened

All 10 original OverloadPanel tests confirmed passing. Full suite 745→747 increase is the 2 new tests only. No assertion removed or relaxed.
