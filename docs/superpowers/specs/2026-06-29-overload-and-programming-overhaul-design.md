# Master Design — Overload Mode & Programming Overhaul (2026-06-29)

Evidence base: `docs/research/2026-06-29-overload-and-programming-evidence.md` (findings A–E).

This is the umbrella design for a large body of work that emerged from a "gamble mode" idea (deliberate short-term overreaching for fast gains). Research showed the feature only becomes more than a "spreadsheet recombiner" if the engine **models, individualizes, and predicts** — things a static program (Smolov, Sheiko) cannot. The same research surfaced several engine-wide programming-fundamentals corrections worth landing first.

The engine stays **pure, deterministic, kg-internal**. Every change is **bounded** and tier-honest (강/중/약 flagged in UI + PROJECT_STATUS §3). **Bit-identical guard:** with the new features OFF and `mesoWeeks ≤ 8`, output is byte-for-byte identical to the current engine. (Exception: the proximity-to-failure RPE-target differentiation in Spec 1 intentionally changes hypertrophy-zone loads — golden tests update with documented rationale.)

---

## 1. Why (the design tension)

- Current routines progress steadily over a capped 3–8 week mesocycle. Two user asks:
  1. Extend normal plans to **24 weeks** (block periodization territory).
  2. Add an **overload mode**: pick 1–3 lifts, set a target % gain, deliberately overreach 2–8 weeks → forced realization → test.
- The user's own critique: a naive overload mode is "just mixing existing routines." The differentiator is the **individualization / feedback / prediction layer** (L3 below). Named programs (Smolov etc.) become *emergent special cases* of the generic blend-driven engine, available as presets.
- Honesty constraint (project ethos): overload is a **gamble**. We disclose expected value as qualitative risk tiers (no fabricated probabilities), force a recovery taper, gate on recovery resources, and label every heuristic coefficient.

---

## 2. Master architecture (5 layers)

### L1 — Prescription primitives (engine-wide, blend-driven)
Volume (dose-response, diminishing returns, strength diminishes faster — B1) · MEV/MAV/MRV landmarks (existing) · intensity zones (existing) · **proximity-to-failure (RIR) differentiated by quality** (B3 — hypertrophy closer to failure than strength) · frequency (B2 — independent strength driver; for hypertrophy = volume distribution) · rep-range spans (B5) · exercise selection [SFR · free-weight specificity for strength / machines OK for hyp (B8) · systematic-not-random variation (B7) · **priority/lagging-first ordering** (B6) · **lengthened-position emphasis** for hypertrophy (B4)].

### L2 — Periodization structure
**Phase-potentiation sequencing** accumulation→transmutation→realization (C2) · adaptive hybrid model, **superiority claim softened** (C1) · **24-week extension + auto-deload cadence** (block periodization) · **realization taper = Bosquet** (A2 — exp volume −41–60%, hold intensity & frequency, ~2 wk).

### L3 — Individualization & feedback (the engine's real differentiator)
Data-driven dose from logs (A5) + **e1RM uncertainty band ±~20%** (A5) · closed-loop monitoring [readiness/RPE trend + **monotony/strain** (A4) + ACWR illustrative-only (A3)] · **Fitness-Fatigue model → realization-peak-day prediction** · autoregulation honest caveat (benefit mixed).

### L4 — Overload mode (the gamble)
target% → aggressiveness `a` → dose levers (volume / frequency / intensity-to-zone-ceiling / RPE) · **blend-following** (strength → Smolov/Russian/Bulgarian concepts; hyp → GVT/Super Squats + lengthened partials) · forced realization taper + dominant-quality test (SAID: strength→1RM single, hyp→rep PR) · **AEL / eccentric-overload lever** (C3) · **wave-loaded progression** (PAP) · **MRV intentional-exceedance handling** + absolute safety ceiling · closed-loop **dynamic deload / early bail** + abort circuit · **consecutive-overload cooldown** (+ repeated-bout consideration) · **presets** (Smolov Jr / Russian faithful; others seeds; override blend).

### L5 — Safety & honesty (project ethos)
Non-blocking risk gating · **EV qualitative tiers only** (no fake %) · **recovery-resource gating with concrete thresholds** (C4 — sleep ≥7 h, protein 1.6–2.2 g/kg + pre-sleep 30–40 g, low stress) · evidence-tier labels (강/중/약) everywhere · **non-functional-overreaching guard** (escalates with weeks / target / lift count).

---

## 3. Resolved contradictions (corrections vs the original sketch)

1. **Deload cut intensity −18%** → **hold intensity & frequency, drop volume exp −41–60%** (Bosquet, A2).
2. **Strength & hypertrophy both `rpeTarget 8.5`** → **proximity differentiated** (hyp closer to failure, B3).
3. **Periodization model superiority implied** → **softened** (LP≈DUP volume-equated, C1).
4. **"Mixing routines" critique** → resolved by L3 (individualization / prediction is the differentiator); named programs are emergent special cases / presets.

---

## 4. Decomposition into four specs (build order)

Each sub-project gets its own design → plan → implementation cycle. Order chosen so foundations land before the overload feature that builds on them.

### Spec 1 — Programming fundamentals refresh (L1 + parts of L2) — **first**
`docs/superpowers/specs/2026-06-29-programming-fundamentals-refresh-design.md`
Proximity-to-failure RIR differentiation (B3) · frequency strength/hyp differential (B2) · volume diminishing-returns/strength-faster verification (B1) · priority/lagging-first ordering (B6) · lengthened-position hypertrophy option (B4) · systematic-variation + free-weight-specificity guards (B7/B8) · phase-potentiation phase parameters made explicit (C2) · model-superiority honesty (C1). Engine-wide — improves normal routines too. **Only spec that intentionally breaks bit-identity** (proximity change), documented.

### Spec 2 — 24-week extension + block auto-deload + Bosquet taper (L2)
mesoWeeks cap 8→24 (`StepPeriodization.jsx` input/onBlur + `generate.js:91`) · auto-deload insertion every 5–6 weeks **only when mesoWeeks > 8** (≤8 stays bit-identical) · ramp resets per block (sawtooth) · realization taper holds intensity/frequency, drops volume exponentially (replaces the flat appended deload for long plans). Long named programs (Smolov base / Sheiko / Coan / nSuns) map here as concepts: high-volume block emphasis + a new speed/dynamic-effort set scheme (Coan).

### Spec 3 — Individualization, feedback & prediction layer (L3)
e1RM uncertainty band ±20% · data-driven dose from existing log→feedback loop · monotony/strain computation from session-RPE×sets · Fitness-Fatigue model → predicted realization-peak day · ACWR illustrative input. Reuses the existing `loadFeedback` / readiness / `detectOverreaching` machinery. Honesty caveats throughout.

### Spec 4 — Overload mode + presets (L4 + L5)
`overload.js` engine module + `planLayout`/builder · target% → dose mapping · blend-following overreach · AEL lever · wave-loaded progression · MRV intentional-exceedance + absolute ceiling · dynamic-deload/early-bail + abort circuit · consecutive-overload cooldown · presets (Smolov Jr/Russian faithful, others seeds) · risk gating + EV tiers + recovery-resource gate · store `overload:{}` with deep-fill merge · UI (mode toggle, lift+target+weeks inputs, preset dropdown, risk/EV/abort banners, block-phase labels in RoutineView).

---

## 5. Cross-cutting invariants (all specs)

- **Determinism & purity:** no `Date`/random; helpers are pure functions of args. Same inputs → same plan. (Fitness-Fatigue and feedback use logged data passed in, not wall-clock.)
- **Bit-identical guard:** features OFF + `mesoWeeks ≤ 8` → byte-identical, except the Spec 1 proximity change (golden tests updated, rationale documented).
- **Tier honesty:** every new coefficient labeled 강/중/약; 약 items surfaced in LimitsPanel + PROJECT_STATUS §3.
- **Store migration:** new fields added via the existing custom deep-fill merge (no version bump), defaulting to OFF/legacy behavior.
- **TDD:** unit tests per engine helper (monotonicity, bounds, forced-taper presence, bit-identity goldens) + jsdom component tests for new UI.

---

## 6. Honest limits (to add to PROJECT_STATUS §3 as specs land)
- Overload is a gamble; outcomes are not promised. Target % shapes aggressiveness, not a guaranteed result. Success-probability framing is qualitative (no validated outcome dataset).
- Fitness-Fatigue peak prediction uses literature default parameters (Banister/Busso); individual fitting from sparse logs is approximate (`근거 약함`).
- Dose-mapping coefficients, deload cadence, cooldown length, AEL/wave parameters, recovery thresholds = coaching consensus directions with heuristic exact values (`근거 약함`).
- ACWR is contested; used only as an illustrative risk input, never a gate.
- Presets other than Smolov Jr / Russian Squat are parameter seeds, not faithful reproductions of the original spreadsheets (`근거 약함`).
- Autoregulation benefit over a good fixed program is mixed in the literature.
