# Research — Overload Mode & Programming Fundamentals (2026-06-29)

Evidence base for the four-spec overhaul (`docs/superpowers/specs/2026-06-29-overload-and-programming-overhaul-design.md`).
Three web-research rounds: (1) overreaching / taper / load-management, (2) construction fundamentals (volume / intensity / failure-proximity / selection), (3) periodization efficacy / phase potentiation / eccentric / recovery.

Evidence tier convention used throughout: **강** (meta-analysis / strong consensus), **중** (RCT-direction / coaching consensus), **약** (`근거 약함` — heuristic / contested / unmeasured exact value).

---

## A. Overreaching, taper, load management (round 1)

### A1. Functional overreaching → supercompensation (토대) — 중
Deliberate short-term overload beyond normal recoverable load, followed by a recovery period, produces a rebound ("supercompensation"). The classic shock-cycle rationale behind Smolov etc. Distinct from **non-functional overreaching (NFOR)** / overtraining, which is overload *without* adequate recovery → performance decline. Direction is well-accepted; the magnitude and individual timing are not precisely predictable (→ honest EV, not promises).

### A2. Optimal taper / realization (Bosquet meta) — 강
Bosquet et al. 2007 meta-analysis: the most effective taper is **~2 weeks**, training **volume exponentially reduced 41–60%**, with **intensity and frequency UNCHANGED**. Reducing intensity hurts the realization. A powerlifting-specific taper/peaking review (Travis et al. 2020, PMC7552788) agrees: hold intensity, cut volume.
- **Design correction:** our earlier deload sketch cut intensity −18%. That contradicts the evidence. The realization/deload must **hold intensity & frequency, drop volume (exp −41–60%)**.
- Sources: [Bosquet meta](https://pubmed.ncbi.nlm.nih.gov/17762369/), [PL taper review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7552788/), [SBS tapering](https://www.strongerbyscience.com/tapering/).

### A3. Acute:Chronic Workload Ratio (ACWR) — 약 (contested)
Originally: ratio ~0.8–1.3 = lower injury risk, ≥1.5 = higher. **Recent meta + critique** (PMC12487117; Global Performance Insights) find it inconsistent across contexts, mathematically unstable at low chronic load, and an oversimplification.
- **Design use:** concept only — overload deliberately spikes acute:chronic → frames the gamble. Use as an *illustrative* risk input to qualitative tiers, **never a hard gate**, with explicit caveat.

### A4. Training monotony & strain (Foster) — 중
Monotony = weekly mean load / SD of daily load; strain = weekly load × monotony. High monotony (>2) combined with high load is associated with overtraining / illness / poor performance. For resistance training, session load ≈ session-RPE × sets (McGuigan & Foster 2004).
- **Design use:** during overload, vary daily load (heavy/light) to keep monotony low even as total load spikes; expose strain as a closed-loop safety signal.
- Sources: [Foster overtraining](https://pubmed.ncbi.nlm.nih.gov/9662690/), [session-RPE validity](https://pmc.ncbi.nlm.nih.gov/articles/PMC5673663/).

### A5. Individual variability / autoregulation — 중 (mixed)
Daily strength can vary up to ~20%; fixed prescription ignores individual response. Autoregulation can individualize load — but a 2024 study found no added benefit over a well-designed fixed program, so the benefit is **mixed, not guaranteed**.
- **Design use:** justify (a) e1RM as a **band ±~20%**, not a point; (b) data-driven dose from logs — with an honest "autoregulation benefit is mixed" caveat.
- Sources: [autoregulation meta](https://sportsmedicine-open.springeropen.com/articles/10.1186/s40798-021-00404-9).

---

## B. Construction fundamentals (round 2)

### B1. Volume dose-response (Pelland/Zourdos 2025 meta, 67 studies) — 강
Volume↑ → hypertrophy & strength↑ (posterior prob 100%), but with **diminishing returns; strength diminishes faster** than hypertrophy (~0.24%/set hypertrophy at the 12.25-set average). "High volume" > 20 sets/muscle/wk; moderate 12–20.
- Already partly encoded (engine cites Pelland/Zourdos; MEV/MAV/MRV ledger exists). Verify the curve shape + strength-faster-diminishing differential.
- Source: [dose-response meta](https://link.springer.com/article/10.1007/s40279-025-02344-w).

### B2. Frequency — 강
Same meta: **strength** gains↑ with frequency (prob 100%, diminishing); **hypertrophy** frequency effect is negligible when volume is equated (frequency = a way to *distribute* volume). 2016 frequency meta: 2×/wk > 1×/wk when volume matched.
- **Design use:** frequency is an independent driver for **strength**, but for hypertrophy it only matters as volume distribution. Sharpen the strength/hyp differential.
- Sources: [frequency/volume meta](https://pmc.ncbi.nlm.nih.gov/articles/PMC8884877/).

### B3. Proximity to failure / RIR (Robinson 2024, Refalo 2024) — 강
Hypertrophy increases as sets get **closer to failure** (best ~0–3 RIR; diminishing/plateau at 0–1 RIR). **Strength improves across a wide RIR range** — failure not required. 1–3 RIR ≈ failure for hypertrophy in trained lifters.
- **Design correction:** ZONES currently set both `strength` and `hypertrophy` to `rpeTarget 8.5` (identical proximity). Evidence says hypertrophy should sit **closer to failure** than strength. Differentiate proximity by quality.
- Sources: [Robinson proximity meta](https://sportrxiv.org/index.php/server/preprint/view/295), [Refalo RIR RCT](https://www.tandfonline.com/doi/full/10.1080/02640414.2024.2321021).

### B4. Lengthened-position training / lengthened partials — 중-강
Recent trend (Wolf 2025 PeerJ; longitudinal-growth review 2025): including the **lengthened (stretched) range** is the primary ROM consideration for hypertrophy; lengthened partials ≈ or > full ROM. Passive + active tension at long muscle length drives growth.
- **Design use (NEW):** a **long-muscle-length / lengthened-partial emphasis** option for hypertrophy accessories (esp. hyp-dominant overload blocks). Engine has tempo but no ROM concept.
- Sources: [Wolf 2025](https://peerj.com/articles/18904/), [longitudinal growth review](https://www.sciencedirect.com/science/article/pii/S2666337625000332).

### B5. Rep ranges — 강
No magic hypertrophy rep range; growth occurs 5–30 reps if effort is high and overload progresses. Practical: 5–8 heavy compounds, 8–15 main hypertrophy, 15–30 isolation. Engine ZONES already span this; minor widening of accessory upper bound only.

### B6. Exercise order — 중
The exercise performed **first in a session gets the greatest adaptation**; when hypertrophy is the goal, order by lagging/priority body part rather than by muscle size.
- **Design use (NEW):** priority/weakness-first ordering when hypertrophy or weakness-correction is the goal. Engine already has weakness / sticking-point data.

### B7. Exercise variation — 중
**Systematic** variation enhances regional hypertrophy + dynamic strength; **excessive/random** variation compromises gains. Validates rotating variations on a block schedule, not randomly or too often.

### B8. Free weight vs machine — 강
Equivalent for hypertrophy; **strength is specific** (free-weight tests improve most with free-weight training). For SBD/strength, bias free weights; machines fine for hypertrophy accessories. Matches existing project philosophy.
- Source: [free-weight vs machine meta](https://pmc.ncbi.nlm.nih.gov/articles/PMC10426227/).

---

## C. Periodization, sequencing, eccentric, recovery (round 3)

### C1. Periodization model efficacy — 강
LP ≈ DUP for hypertrophy when volume is equated (SMD ≈ −0.02); both effective for strength, slight possible undulating edge but no consistent winner.
- **Design correction:** do **not** claim model superiority. Volume / intensity / proximity are the real drivers; model choice is secondary. Soften the adaptive-hybrid framing accordingly.
- Sources: [LP vs DUP meta](https://pmc.ncbi.nlm.nih.gov/articles/PMC5571788/), [SBS periodization data](https://www.strongerbyscience.com/periodization-data/).

### C2. Phase potentiation / block sequencing — 중 (consensus)
Block sequence: **accumulation** (hypertrophy, ~60–75%, higher volume) → **transmutation/intensification** (strength, 75–90%) → **realization/peak** (90%+, low volume, ~2–3 wk). "Bigger base → bigger peak" — the hypertrophy base potentiates the strength phase, which potentiates the peak. Organizing principle for the long (24-wk) model and the overload block's internal order.
- Note: phase *potentiation* (one phase amplifying the next) is coaching theory/consensus, not hard RCT — label 약 for the potentiation claim specifically; the phase structure itself is well-accepted.
- Sources: [Revive phase potentiation](https://revivestronger.com/the-bigger-the-base-the-bigger-the-peak-phase-potentiation/), [JTS periodization](https://www.jtsstrength.com/periodization-powerlifting-definitive-guide/).

### C3. Accentuated eccentric loading (AEL) / eccentric overload — 중
Eccentric-emphasis / supramaximal eccentric is effective for strength (novel high-tension stimulus); hypertrophy comparable to traditional when volume-matched; high-intensity eccentric > moderate; flywheel eccentric overload shows some superiority. A legitimate intensification lever.
- **Design use (NEW):** AEL / eccentric-emphasis as an optional overload intensification technique (ties to existing tempo field). Equipment/safety gated.
- Sources: [AEL lower-body review 2025](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12900726/), [eccentric phase-duration meta 2025](https://www.tandfonline.com/doi/full/10.1080/02640414.2025.2535198).

### C4. Sleep & protein recovery quantitatives — 중-강
Sleep **<7 h** raises injury risk and amplifies overreaching, especially during high-volume/intensity blocks (≥7 h recommended). Pre-sleep protein **27–40 g** (≥40 g for robust overnight MPS) augments mass/strength gains over a training period; daily protein ~1.6–2.2 g/kg is the broader consensus.
- **Design use:** makes the recovery-resource gate concrete (sleep ≥7 h, daily protein 1.6–2.2 g/kg + pre-sleep 30–40 g, low life stress) before green-lighting an overload block.
- Sources: [pre-sleep protein MPS](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5188418/), [protein mass/strength RCT](https://pubmed.ncbi.nlm.nih.gov/25926415/).

---

## D. Named programs (preset / long-plan mapping) — reference

| Program | Lift(s) | Weeks | Fits | Notes |
|---|---|---|---|---|
| Smolov Jr | squat or bench | 3 | overload preset (faithful) | 6×6→7×5→8×4→10×3, freq 4 |
| Russian Squat Routine | squat | 6 | overload preset (faithful) | 3×/wk, 6×2 base + ramp |
| Super Squats | squat | 6 | overload preset (seed) | 1×20 + milk-volume |
| German Volume Training | any | 4–6 | overload preset (seed) | 10×10 @~60% |
| Mag/Ort (shortened) | deadlift | 6–8 | overload preset (seed) | deadlift-only brutal ramp |
| Bulgarian (shock) | any | 2–4 | overload preset (seed) | daily-max, highest risk |
| Smolov Base (full) | squat | 13 | long-plan concept | full cycle |
| Sheiko 29/32/37 | SBD | 16 | long-plan concept | high volume + meet peak |
| Coan/Phillipi | deadlift | 10 | long-plan concept | heavy triple + speed work |
| nSuns 5/3/1 | SBD | weekly | long-plan concept | AMRAP weekly LP |

Sources: [PowerliftingToWin Smolov](https://www.powerliftingtowin.com/smolov/), [Sheiko](https://www.powerliftingtowin.com/sheiko/), [Bulgarian](https://www.powerliftingtowin.com/the-bulgarian-method-for-powerlifting/), [Lift Vault deadlift programs](https://liftvault.com/programs/lift-specific/deadlift/), [Russian vs Smolov](https://breakingmuscle.com/get-a-big-squat-the-russian-squat-routine-vs-the-smolov-squat-routine/), [SBS single-lift specialization](https://www.strongerbyscience.com/the-rest-of-your-program-what-to-do-when-primarily-focusing-on-a-single-lift/).

---

## E. VBT — held (consistent with existing project decision)
VBT ≈ PBT for strength outcomes; advantage is monitoring/autoregulation only. Velocity-loss thresholds are a future autoregulation input. Project already holds VBT (`근거 약함`) — keep held; note velocity-loss as a future C-layer input only.
