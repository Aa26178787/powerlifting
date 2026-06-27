# Powerlifting vs Powerbuilding — Evidence Basis for Three Model-Realism Fixes (2026-06-27)

Evidence doc for three planned engine fixes. Each fix below states the **finding**, a **concrete number/range**, the **evidence tier** (meta-analysis / RCT vs coaching consensus), and the **engine hook** (which file the implementation cites). Authors/years given where confident; uncertainty flagged honestly.

Tier legend:
- **META** — pooled effect from a systematic review / meta-analysis.
- **RCT** — one or more controlled trials, not yet meta-analyzed for this exact question.
- **CONSENSUS** — coaching heuristic / expert agreement; not established by RCT. Surface as `근거 약함` in UI.

The three fixes map to the lettered findings as:
- **Fix 1 (absolute per-session working-set cap, deadlift lowest)** ← B (per-session diminishing returns) + D (deadlift fatigue).
- **Fix 2 (RPE-derived backoff load + high-rep RPE-chart correction)** ← A (load specificity) + C (high-rep RIR underestimation).
- **Fix 3 (bounded week-to-week load progression)** ← E (progressive overload steps).
- **F (MEV/MAV/MRV unvalidated)** is a cross-cutting honesty caveat that bounds the credibility of `volume.js BANDS`.

---

## A) LOAD SPECIFICITY — strength is load-specific, hypertrophy is load-independent near failure

**Finding.** When sets are taken close to failure, muscle hypertrophy is essentially equivalent across a wide load spectrum (roughly ~30–85% 1RM); but maximal **strength** (1RM) gains are **load-specific** — heavier loads produce larger 1RM gains, because 1RM testing is itself a high-load skill. So a strength-biased plan must keep genuinely heavy working sets; a hypertrophy block can earn growth with much lighter loads if proximity to failure is matched.

**Number/range.**
- Hypertrophy: trivial difference between low-load (<60% 1RM) and high-load (>60%) — pooled effect near zero (Schoenfeld, Grgic, Ogborn & Krieger 2017, *J Strength Cond Res*; SMD ≈ 0.03, n.s.). Low-load works from ~30% upward when near failure.
- Strength: high-load clearly superior for 1RM — pooled advantage on the order of SMD ≈ 0.5–0.6 favoring heavy (same 2017 meta-analysis; high-load 1RM advantage robust).
- Practical heavy floor for 1RM specificity: regular exposure to **≥80–85% 1RM** (powerlifting/strength literature; Prilepin-band consensus for low-rep heavy work).

**Tier.** META (hypertrophy load-independence and strength load-specificity are both meta-analytically supported, Schoenfeld et al. 2017; reinforced by Lopez et al. 2021 *Med Sci Sports Exerc* dose/intensity meta-analysis).

**Engine hook.** Justifies the divergent `ZONES` in `quality.js` — `strength.pct [0.82, 0.92]` (heavy, RPE 8.5) vs `hypertrophy.pct [0.67, 0.78]`. Backs **Fix 2**: a backoff set in a strength scheme should be derived to remain a *real strength stimulus* (load tied to a target RPE), not an arbitrary −12%/−15% drop. The current fixed multipliers (`topSetBackoff` ×0.88, `topSingleBackoff` ×0.85 in `setSchemes.js`) are coaching-convenient but not load-anchored to an intended RIR.

---

## B) VOLUME DOSE-RESPONSE — hypertrophy rises with weekly sets; strength dose-response is flatter

**Finding.** Hypertrophy shows a **graded** dose-response with weekly set volume (more sets → more growth, up to a practical ceiling). Strength shows a **much flatter** dose-response: a modest number of weekly sets captures most of the 1RM benefit, with diminishing returns appearing sooner. Beyond the strength plateau, additional same-session sets are largely "junk volume" for 1RM — they add fatigue without proportional strength return. Per-session, this argues for an **absolute working-set cap** rather than letting `weeklySets / frequency` pile sets onto one session.

**Number/range.**
- Hypertrophy: **≥10 sets/muscle/week** clearly beats <5; dose-response continues upward (Schoenfeld, Ogborn & Krieger 2017 *J Sports Sci*, ~+0.37% muscle per additional weekly set across the studied range). Higher-volume meta-analyses (Schoenfeld 2019; Baz-Valle 2022) extend the trend, with returns flattening at high volumes (commonly ~12–20+ sets, individual-dependent).
- Strength: Ralston et al. 2017 (*Sports Med*) — multiple sets > single set, but the **medium weekly volume (~5–9 sets/exercise/week) captured most of the 1RM benefit**, with the high-volume band (≥10 sets) showing only a small additional, non-robust increment. Strength gains plateau in weekly sets far sooner than hypertrophy.
- Per-session diminishing returns: practical "junk volume" framing (Israetel/Renaissance Periodization; Nuckols/Stronger By Science) — beyond roughly the **first several hard sets** of a lift in one session, marginal strength return falls off sharply.

**Tier.** META for the *shape* (hypertrophy graded vs strength flatter): Schoenfeld 2017 + Ralston 2017. CONSENSUS for the specific per-session cap number and the "junk volume" label — no RCT defines an exact per-session set ceiling.

**Engine hook.** `volume.js BANDS` (strength mav 10 / mrv 12 vs hypertrophy mav 16 / mrv 22) already encodes the flatter strength curve at the *weekly* level. **Fix 1** adds the missing *per-session* cap: `tuner.js` computes `setsPerSession = round(perLiftWeekly / freq)` with **no absolute ceiling**, so a low-frequency lift can stack many sets in one session. A per-session working-set cap (consensus-tier) prevents that.

---

## C) RPE→%1RM CHART LIMITATIONS — high-rep RIR is underestimated, so true RPE is reached at a HIGHER %1RM than the chart says

**Finding.** RPE/RIR-to-%1RM charts (Zourdos/RTS-Tuchscherer lineage) were validated mostly on **low-rep** sets. At **higher rep ranges** lifters systematically **under-predict** how many reps they have left (they call a set RPE 8–9 when more reps remained). Consequently a chart-prescribed "RPE 8.5 at 9–12 reps" tends to be **lighter than intended** — the lifter's *actual* RPE-8.5 load at high reps is a **higher %1RM** than the chart cell. For a hypertrophy zone driven at `repAnchor 9, RPE 8.5`, this means the engine's prescribed load can undershoot the intended proximity-to-failure.

**Number/range.**
- Rep-prediction accuracy degrades with reps. Hackett et al. 2012/2017 (*J Strength Cond Res*) — trained lifters predicted reps-to-failure with reasonable accuracy near failure at low reps, but **under-predicted by ~2–3+ reps** in higher-rep sets and further from failure. Accuracy is better at higher loads / closer to failure.
- Zourdos et al. 2016 (*J Strength Cond Res*, the RPE-RIR validation) — RIR-based RPE most accurate at **1–4 reps**; error grows as reps increase and as RIR increases.
- Practical correction: at ~8–12 reps, treat the chart cell as **roughly +2 to +4 percentage-points of 1RM too low** (i.e., a "feels-like RPE 8.5" high-rep set is closer to a chart RPE 9–9.5 / a few % heavier). This magnitude is an **estimate**, not a meta-analytic point value — flag as uncertain.

**Tier.** RCT/observational (Hackett, Zourdos) for *direction and growth of error*. CONSENSUS/estimate for the *exact* %-correction to apply to the chart — no published meta-analysis gives a per-cell correction factor.

**Engine hook.** `rpeChart.json` is used unmodified up to 12 reps by `e1rm.js pctOf1RM`, and `quality.js weightFor` caps at `min(12, repAnchor)`. **Fix 2** should apply a small high-rep correction (nudge effective %1RM **up** for reps ≳8) so RPE-driven hypertrophy loads aren't systematically too light. Keep the correction conservative and labelled — the chart itself is honestly only well-validated at low reps. (The engine's `risingRpe` ramp partly compensates by landing the *last* set on target, but does not fix the per-cell undershoot.)

---

## D) DEADLIFT FATIGUE / RECOVERY — higher systemic/axial fatigue, lower frequency & per-session tolerance

**Finding.** The conventional deadlift imposes disproportionately high **systemic, axial (spinal/erector), and neuromuscular** fatigue relative to squat and bench at matched intensity, and recovers more slowly. This justifies **lower training frequency and a lower per-session working-set tolerance for deadlift specifically** — the per-session cap (Fix 1) should be **strictest for the deadlift**.

**Number/range.**
- Recovery: heavy deadlift sessions commonly show **24–72 h** of impaired performance/elevated soreness, with axial/erector and grip recovery trailing knee-extensor recovery (Belcher 2019 and recovery-kinetics literature; Barnes / coaching-consensus syntheses).
- Frequency: powerlifting practice and programming consensus run deadlift at **~1–2×/week**, typically **lower** than squat, with **fewer heavy working sets per session** (commonly ~1–4 heavy sets vs more for squat). Sheiko/Russian-school and Western coaching (Nuckols, Helms) converge here.
- Note in current build: deadlift already appears at low frequency (comp-only at 3 days/week per `PROJECT_STATUS.md` §3), but **no absolute per-session set cap** enforces the lower tolerance.

**Tier.** CONSENSUS primarily (frequency/per-session tolerance is coaching consensus, not RCT-derived). Some RCT/observational support for the slower **recovery kinetics** of high-axial-load pulls, but no RCT establishes an optimal deadlift per-session set number.

**Engine hook.** **Fix 1** — give `tuner.js` / `volume.js` a per-lift absolute session cap, with deadlift's cap set **below** squat/bench. Honest disclosure: the *direction* (deadlift tolerates less) is well-accepted; the *exact* cap number is a heuristic.

---

## E) PROGRESSIVE OVERLOAD — bounded weekly intensity steps across a mesocycle

**Finding.** Progressive overload (rising load/intensity and/or volume across a mesocycle) is the core driver of continued adaptation. In linear and block periodization, intensity is stepped up **week to week within bounded increments** — large enough to drive overload, small enough to stay recoverable and avoid premature failure. The week-to-week **load** jump should be **bounded**, not open-ended.

**Number/range.**
- Typical weekly intensity step: **~2–5% 1RM per week** in linear/block accumulation→intensification (textbook periodization — Bompa & Buzzichelli; Zatsiorsky & Kraemer; ACSM progression position stand 2009, which recommends progressive increases of roughly **2–10%** when a target rep count is exceeded, with smaller steps for upper-body and advanced lifters).
- Block intensification commonly raises average intensity by single-digit %1RM per week while volume tapers.
- Progressive overload's necessity is near-universally supported; the **specific** percentage step is convention, individual- and lift-dependent.

**Tier.** CONSENSUS / textbook for the specific ~2–5%/week step (with ACSM position-stand backing for the 2–10% progression principle). The **necessity** of progressive overload is META-level (broadly supported across resistance-training meta-analyses), but the exact weekly increment is not a meta-analytic point estimate.

**Engine hook.** **Fix 3** — bound week-to-week **load** progression. Currently `periodizationModel.weekOffset` ramps RPE linearly (0→1 across weeks) and `volume.js volumeRamp` adds up to +35% **volume** by the last week, but there is **no explicit cap on the week-to-week load increase** itself. A bounded step (e.g. cap the implied %1RM jump to ~a few % per week) keeps progression realistic and recoverable.

---

## F) MEV / MAV / MRV — explicitly UNVALIDATED landmarks

**Finding.** Minimum Effective Volume, Maximum Adaptive Volume, and Maximum Recoverable Volume are **coaching heuristics** (Israetel / Renaissance Periodization) for organizing volume progression. They are intuitive and useful for periodizing sets, but they are **not validated landmarks** — no RCT establishes that these thresholds exist as discrete, measurable points, and the numbers are individual-, lift-, and context-dependent. They should be presented as a planning scaffold, not as measured physiology.

**Number/range.** The `volume.js BANDS` values (strength 6/10/12, balanced 8/13/18, hypertrophy 10/16/22 sets/week) sit in the *range* coaching sources cite, and are **consistent** with the dose-response evidence in (B) (e.g. hypertrophy MEV ≈ the ~10-set threshold). But the specific MAV/MRV ceilings are **assigned, not measured**.

**Tier.** CONSENSUS (explicitly unvalidated). The *underlying dose-response shape* they approximate is META-backed (see B), which is the honest caveat: "the curve is real; the named landmarks are a heuristic discretization of it."

**Engine hook.** `volume.js BANDS`. Already disclosed in spirit in `PROJECT_STATUS.md` §3; this doc makes the tier explicit. Surface MEV/MAV/MRV in UI as a planning scaffold (`근거 약함` for the exact thresholds), while the broad strength-vs-hypertrophy volume *difference* can claim META support.

---

## Summary table — claim vs tier (what each fix may honestly assert)

| # | Claim | Number | Tier | Fix |
|---|-------|--------|------|-----|
| A | Hypertrophy load-independent ~30–85% near failure; strength load-specific | hyp SMD≈0 ; strength heavy SMD≈0.5–0.6 ; heavy floor ≥80–85% | META | 2 |
| B | Hypertrophy graded dose-response; strength flatter, earlier plateau | hyp ≥10 sets/wk, +~0.37%/set ; strength most benefit ~5–9 sets/wk | META (shape) / CONSENSUS (per-session cap #) | 1 |
| C | High-rep RIR under-predicted → chart load too light | error grows; ~2–3+ reps under-predicted high-rep; ~+2–4 %1RM correction | RCT (direction) / CONSENSUS (exact %) | 2 |
| D | Deadlift highest systemic/axial fatigue, lower tolerance | recovery ~24–72 h; ~1–2×/wk, fewer heavy sets/session | CONSENSUS (mostly) / some RCT on recovery | 1 |
| E | Progressive overload via bounded weekly intensity steps | ~2–5%/wk (ACSM principle 2–10%) | CONSENSUS / textbook (necessity META) | 3 |
| F | MEV/MAV/MRV are unvalidated heuristics | bands 6/10/12 · 8/13/18 · 10/16/22 sets/wk | CONSENSUS (curve shape META) | — |

## Honest-limits to surface in UI / cite alongside the fixes

- The **directions** are solid (heavy needed for strength; deadlift recovers slowest; high-rep RIR is under-predicted; progression must be bounded; volume curves differ by goal). The **exact numbers** for the per-session cap, the high-rep %-correction, and the weekly load step are **heuristics / estimates**, not meta-analytic point values — label `근거 약함`.
- The RPE chart (`rpeChart.json`) is honestly well-validated only at **low reps**; the high-rep correction in Fix 2 is a deliberate, conservative adjustment, not a re-validation.
- MEV/MAV/MRV remain coaching scaffolds; only the **strength-vs-hypertrophy volume difference** they encode can claim meta-analytic support.

### Primary citations
- Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW (2017). Strength and hypertrophy adaptations between low- vs high-load resistance training: meta-analysis. *J Strength Cond Res*.
- Schoenfeld BJ, Ogborn D, Krieger JW (2017). Dose-response relationship between weekly resistance training volume and muscle hypertrophy: meta-analysis. *J Sports Sci*.
- Ralston GW, Kilgore L, Wyatt FB, Baker JS (2017). The effect of weekly set volume on strength gain: meta-analysis. *Sports Med*.
- Lopez P et al. (2021). Resistance training load effects on muscle hypertrophy and strength: meta-analysis. *Med Sci Sports Exerc*.
- Zourdos MC et al. (2016). Novel resistance training-specific RPE scale measuring RIR. *J Strength Cond Res*.
- Hackett DA et al. (2012/2017). Estimation of repetitions to failure / RIR accuracy. *J Strength Cond Res*.
- ACSM (2009). Progression models in resistance training for healthy adults (position stand). *Med Sci Sports Exerc*.
- Bompa & Buzzichelli, *Periodization*; Zatsiorsky & Kraemer, *Science and Practice of Strength Training* (periodization step conventions).
- Israetel M et al. / Renaissance Periodization (MEV/MAV/MRV heuristics — consensus, unvalidated).
