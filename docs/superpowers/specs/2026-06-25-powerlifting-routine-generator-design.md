# Powerlifting Routine Generator — Phase 1 Design Spec

**Date:** 2026-06-25
**Status:** Approved design (brainstorming complete) — pending implementation plan
**Phase:** 1 of 2 (Phase 2 = VBT-from-video module, out of scope here)

---

## 1. Overview

A web app that generates an **evidence-based, personalized powerlifting routine**. The user enters their profile (current strength, training years, days/week, goal, recovery state, etc.); a deterministic rule engine selects a proven program template and tunes its parameters using research-derived rules, then emits a full mesocycle with hybrid RPE+%1RM prescriptions and session-by-session autoregulation.

**Approach C (Hybrid):** the generator does NOT clone a single named program, nor build structure purely from first principles. It ships a **library of proven program templates** (battle-tested skeletons) and uses **research-derived rules** to (a) *select* the right template for the user and (b) *tune* its volume, intensity, frequency, and RPE parameters to the individual.

Rationale: the research (see §3) shows the quantitative knobs — volume, frequency, intensity, proximity to failure — are the real drivers of adaptation, while the periodization *model* (linear vs undulating) matters little once volume is equated. So proven templates supply field-validated structure; research supplies the personalized knobs.

## 2. Goals / Non-Goals

**Goals (Phase 1):**
- Deterministic, offline, free rule engine (no LLM, no backend).
- Personalized routine from a profile, grounded in cited research for all quantitative parameters.
- Hybrid RPE+%1RM prescription with session-level autoregulation from logged RPE.
- Library of ≥3–5 proven templates; research-driven selection + tuning.
- Exportable output (on-screen + printable/CSV) usable in the gym.
- Engine fully unit-tested (TDD).

**Non-Goals (Phase 1):**
- VBT / velocity-based training from video (Phase 2 — leave a `velocity?` data stub only).
- Account system, cloud sync, multi-user (localStorage only).
- Nutrition, conditioning, mobility programming.
- LLM-generated content of any kind.

## 3. Evidence Base

All quantitative knobs trace to the deep-research synthesis (run 2026-06-25). Source-tagged so reviewers can see what is research-derived vs convention.

**Research-derived (peer-reviewed):**
- **Volume** — Pelland/Zourdos et al. 2025 (Sports Med, Bayesian meta-regression, 67 studies / 2,058 subjects): positive but diminishing-returns dose-response for both hypertrophy and strength; strength plateaus far earlier (reciprocal model) than hypertrophy (square-root). Hypertrophy MED ≈ 4 fractional weekly sets/muscle, accruing to ~25+; indirect/synergist sets count as **0.5**. Schoenfeld/Ogborn/Krieger 2017 corroborates graded volume→hypertrophy.
- **Frequency** — Pelland 2025: frequency is an *independent* strength driver (best ≈2 sessions/wk/lift, steep diminishing returns beyond) but negligible for hypertrophy when volume is equated. Schoenfeld/Grgic/Krieger 2019 + RCTs (Hamarsland 2022; Johnsen & van den Tillaar 2021) confirm 2–4x/wk equivalent for strength under equated volume → frequency by recovery/schedule.
- **Intensity** — Schoenfeld et al. 2021: hypertrophy is load-independent (~30–85% 1RM to near failure); maximal **strength remains load-specific (heavy loads for the competition lifts)**.
- **Periodization** — Schoenfeld et al. 2017 (LP vs DUP, d = −0.02, NS); Rhea & Alderman 2004 (variation-only ES 0.25). Volume/intensity/frequency are the drivers, not the model.
- **RPE/RIR** — RIR-anchored RPE scale (RPE 10 = 0 RIR, 9 = 1, 8 = 2, 7 = 3, 6 = 4), validated and accurate at high intensity / low reps; less accurate at high reps. (MASS / Zourdos line of work.)

**Semi-empirical standard (not peer-reviewed, de facto):**
- **RPE→%1RM table** — Tuchscherer/RTS chart (full grid reps 1–12 × RPE 6–10), e.g. 1 rep @ RPE10 = 100%, 5 reps @ RPE8 = 81.1%. Built from real lifter data; widely used but not peer-reviewed. The full grid is embedded in `data/rpeChart.json`.

**Convention / heuristic (necessary; research says structure matters less):**
- Weekly DUP arrangement, 4-week RPE waves, template skeletons, ±2%-per-0.5-RPE load nudge (MASS practitioner guidance), deload every 4–6 weeks ~7 days reducing volume while holding intensity (narrative review). Flagged as convention, not proven-optimal.

**Acknowledged limits (surface in UI):** training-age scaling of landmarks is population-averaged (heuristic); strength-specific periodization-model superiority is weakly evidenced; Tuchscherer table is non-peer-reviewed.

## 4. Inputs (Profile)

**Required:** 1RM per lift (squat/bench/deadlift — direct, or weight×reps×RPE for estimation); training **years** (numeric); days/week (3–6); goal (strength / hypertrophy / balanced).

**Competition toggle:** ON → meet date → peaking/taper computed by back-calculation. (Peaking logic scoped minimally in Phase 1; full peaking can be a follow-up.)

**Personalization:** life fatigue 1–5 (sleep/stress/job composite); age; bodyweight + sex; weak-lift priority; injuries → substitutions; session time limit; available equipment.

## 5. Architecture

Pure engine (React-agnostic, deterministic) + React UI. Engine is the heart and is fully unit-testable.

```
src/
  engine/
    e1rm.js          # Tuchscherer lookup + Epley/Brzycki; e1RM = weight ÷ %1RM(reps,RPE)
    volume.js        # volume landmarks; goal × years × fatigue scaling (fractional sets, 0.5 indirect)
    frequency.js     # days/week → per-lift frequency distribution
    templates/       # proven template definitions (data + per-template builder hooks)
      index.js       # template registry + metadata
      linearLP.js
      fiveThreeOne.js
      dup.js
      highFreqPct.js
      hypertrophyBlock.js
    selector.js      # research rules: profile → chosen template
    tuner.js         # research rules: adjust template params (volume/intensity/RPE/freq) to profile
    periodization.js # mesocycle/week/session assembly + RPE waves
    autoreg.js       # logged actual RPE → e1RM update + next-load adjust (±2% per 0.5 RPE)
    deload.js        # triggers + volume-cut logic
    exercises.js     # lift DB, substitution map, equipment tags
    generate.js      # orchestrator: profile → selector → tuner → periodization → full plan
  data/
    rpeChart.json    # full Tuchscherer grid
    exercises.json   # lift/accessory DB with equipment + substitution metadata
  ui/
    InputForm/       # profile entry + validation
    RoutineView/     # mesocycle → week tables → session cards
    Logger/          # enter actual RPE per set → triggers autoreg
    Limits/          # honest evidence-strength disclosures
  store/             # zustand + localStorage persistence
```

**Why this split:** `engine/` is pure functions with no React or I/O → deterministic, golden-testable. UI is a thin shell over engine output. Each engine module has one purpose, a clear interface, and is independently testable.

## 6. Template Library (Approach C)

Each template is a field-validated skeleton with metadata used by the selector and tuneable parameters used by the tuner.

| Template | Skeleton | Best fit (selector) |
|---|---|---|
| **Linear LP** | Session-to-session load increase, 3 full-body days | years < ~1, days 3, goal strength/balanced |
| **5/3/1-style** | %-based monthly waves, low frequency, AMRAP top sets | intermediate, days 3–4, goal strength |
| **DUP** | Heavy/light/volume undulation within week | intermediate–adv, days 3–5, strength/balanced |
| **High-Freq %** | High frequency, submaximal %, frequent exposure to comp lifts | advanced, days 5–6, goal strength |
| **Hypertrophy Block** | Volume-progression block, 6–12 reps, MEV→MRV ramp | goal hypertrophy, any days |

Each template exposes parameter slots: `setsPerLift`, `repScheme`, `intensityZone (% / RPE)`, `freqPerLift`, `progression`, `accessoryVolume`. The tuner fills/overrides these.

**Template definitions are data + small builder hooks**, so new templates are added without touching the selector/tuner.

## 7. Engine Algorithm (profile → routine)

1. **e1RM** — per lift, from direct 1RM or weight×reps×RPE via Tuchscherer reverse lookup (e1RM = weight ÷ %1RM). Epley/Brzycki as cross-check/fallback.
2. **Selector** — research rules map (years, days/week, goal, fatigue) → one template (§6 table), with deterministic tie-breaks.
3. **Tuner** — research rules adjust the template's slots:
   - **Volume**: place weekly sets/lift within an MEV→MRV band; strength caps low (reciprocal/early plateau), hypertrophy scales higher (square-root); years nudges up modestly; **fatigue 1–5 scales volume down** as it rises.
   - **Frequency**: distribute days/week toward ~2x/wk per main lift for strength goals, constrained by days available.
   - **Intensity**: strength → heavy zone (1–5 reps, RPE 8–9); hypertrophy → 6–12 reps, RPE 7–9; balanced → mixed.
   - **RPE caps** per set type.
4. **Periodization** — assemble mesocycle (default 4-week wave: RPE 7.5 → 8 → 8.5 → deload) using the template's progression; DUP templates undulate within week.
5. **Prescription** — each set emitted as `sets × reps @ %1RM + RPE target + computed weight`, weight = e1RM × %1RM(reps, RPE) from the chart.
6. **Autoregulation** — Logger captures actual RPE → recompute e1RM → adjust next session's load by ±2% per 0.5 RPE outside target; weekly volume nudged by updated fatigue.
7. **Deload** — every 4–6 weeks or on fatigue trigger → volume ~50% down, intensity held; configurable by years/fatigue.
8. **Personalization overlays** — weak-lift priority → extra accessory volume on that lift; injuries → substitution map; equipment → filter accessories; session time limit → cap accessory count.

## 8. Data Model

```
Profile { lifts{squat,bench,deadlift:{oneRM|{weight,reps,rpe}}}, years, daysPerWeek,
          goal, competition{on,date?}, fatigue, age, bodyweight, sex,
          weakLift?, injuries[], sessionTimeLimit?, equipment[] }

Mesocycle { template, weeks: Week[] }
Week      { index, isDeload, sessions: Session[] }
Session   { day, exercises: Exercise[] }
Exercise  { lift, sets, reps, pct, rpeTarget, weight, velocity? }   // velocity? = Phase 2 VBT stub
LogEntry  { exerciseRef, actualRpe, actualReps, weight }            // feeds autoreg
```

## 9. Output

On-screen: mesocycle → week tables → session cards. Export: **printable view + CSV** for gym use. (Spreadsheet/PDF deferred unless requested.)

## 10. Error Handling

Input validation (positive numbers, sane ranges); graceful e1RM when only weight×reps×RPE provided; extreme-input warnings (e.g., 6 days/week + high volume + high fatigue → overtraining warning); never silently clamp without surfacing it.

## 11. Testing Strategy (TDD)

Engine pure functions first, golden tests:
- Tuchscherer lookups (exact grid cells) and e1RM math (known inputs → known e1RM).
- Volume tuner (profile → expected fractional sets within MEV→MRV band).
- Selector (profile → expected template, including tie-breaks).
- Autoreg (target vs actual RPE → expected ±% load delta).
- Deload trigger + volume cut.
- `generate()` integration: a fixed profile → a fully-specified, internally-consistent mesocycle.
UI tested after engine is green.

## 12. Phase 2 Stub

`Exercise.velocity?` left empty in Phase 1. Phase 2 adds the VBT-from-video module (upload lift video → click bar/plate markers on ≥2 frames → plate-diameter scale + fps → bar velocity → autoreg input). No Phase 1 code should assume velocity exists.

## 13. Open Questions / Honest Limits

- Training-age scaling of volume landmarks is population-averaged → heuristic, disclosed in UI.
- Strength-specific periodization-model superiority weakly evidenced → templates chosen for field-validation, not proven model superiority.
- Tuchscherer RPE table is non-peer-reviewed (de facto standard) → disclosed.
- Competition peaking is minimally scoped in Phase 1; full meet peaking may warrant its own spec.

## 14. Tech Stack

Vite + React, zustand + localStorage, deploy to GitHub Pages. No backend.
