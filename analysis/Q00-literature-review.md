# Q00 Literature Review: Quantum Annealing for Packing and the Scaffold-Sampler Gap

**Project:** Quantum-assisted soft-to-rigid packing (`~/workspace/research/quantum-harden-packing`)
**Date:** 2026-10-10
**Question:** What QUBO/Ising formulations exist for packing, and what is the gap to QA-assisted scaffold sampling?
**Working hypothesis:** The literature contains QUBO formulations for discrete packing variants and hybrid QA pipelines whose scaffold-sampling ideas transfer to the soft stage of hardening; the review identifies the closest prior art and the formulation gap for continuous congruent-shape packing.

**Background (prior project).** In `yoheinakajima/when-hardening-helps`, 2D congruent-shape packing was attacked with a "hardening" method: pieces start as soft inscribed disks, gradually morph to rigid shapes while the container compresses. The key finding (A12, replicated in C13): hardening wins exactly when its disk-phase "scaffold" arrangement matches the optimal packing's relative arrangement (scaffold fidelity: Spearman ρ=−0.56 vs harden's gap to optimum, p<0.0001; replication ρ=−0.795, p=0.003, including a predicted first-ever cross-pentomino win). The new project asks whether quantum annealing can sample better scaffolds than random initialization, as warm starts for classical hardening.

---

## 1. Quantum annealing QUBO/Ising formulations for packing

### 1.1 Bin packing (1D)

**QAL-BP — Cellini, Macaluso, Lombardi (2024).** "QAL-BP: an augmented Lagrangian quantum approach for bin packing." *Scientific Reports* 14:5142. https://doi.org/10.1038/s41598-023-50540-3 · arXiv: http://arxiv.org/pdf/2309.12678v1 · code: https://github.com/lorenz92/qal-bp

The most careful QUBO formulation of 1D bin packing to date. Uses the Augmented Lagrangian method to fold bin-capacity constraints into the objective, with **analytically estimated penalty multipliers** — eliminating the usual empirical per-instance penalty tuning that plagues QUBO packing work. Variable count is independent of bin capacity (no slack variables). Tested on a real D-Wave QPU against simulated annealing and Gurobi. Results, honestly reported: QA does not beat Gurobi; QA finds feasible (sometimes suboptimal) solutions on small instances (>7 items degrades; some infeasible returns on larger instances attributed to hardware noise and chain-break effects). Time-to-solution scaling looks favorable vs SA as size grows, but the authors stress this needs better hardware to confirm. Takeaway for us: the analytical-penalty idea transfers directly — our scaffold QUBO will live or die on penalty calibration, and QAL-BP is the only packing paper that solved it analytically rather than empirically.

### 1.2 3D bin packing with orientations and real-world constraints

**Osaba et al. (2023).** "Hybrid approach for solving real-world bin packing problem instances using quantum annealers." *Scientific Reports*. arXiv: http://arxiv.org/pdf/2303.01977

The closest existing work to our problem shape. Formulates 3D BPP with **six orientation variables per item** (binary r_{i,k} selecting among non-redundant orientations, with symmetry reduction — cubic items fix r_{i,1}=1), relative-position binaries b_{i,k,q} (item i left/behind/below/right/front/above item k), and bin-assignment variables. Solved via D-Wave's **LeapCQMHybrid** (constrained quadratic model — hard constraints, no penalty tuning by the user). Instances: 38–53 items, 4,400–9,000 variables, 7,400–17,500 constraints, including real-world restrictions (overweight, affinities, incompatibilities, load bearing, center of mass). This is the paper that proves CQM can express geometric packing with orientations at industrially relevant variable counts — but note it never runs on the bare QPU; it's hybrid-only, and solution quality vs pure classical is not the headline.

**Related:** arXiv 2408.15365 ("Application of hybrid classical-quantum annealing technology to the 3D Bin-Packing Problem") extends the hybrid line. de Andoin et al., GECCO 2022 ("Hybrid quantum-classical heuristic for the bin packing problem") is the earlier hybrid BPP pipeline.

### 1.3 Set packing / cutting stock (geometric, 2D)

**Sánchez-Beato, Martinez, Osa, Parra, Calonge (2026).** "Set-Packing and Sequence-Pair QUBOs for the 2D Cutting Stock Problem on Quantum Annealing Hardware." arXiv: https://arxiv.org/abs/2609.20853v1 (Aug 2026)

The single most relevant paper for our scaffold sampler. Compares two QUBO paradigms for 2D geometric packing head-to-head:
- **Coordinate-based set-packing:** one binary variable per (piece, candidate placement). Non-overlap becomes pairwise exclusion between intersecting placements → maximum-weight independent-set QUBO (the Lucas 2014 canonical form). Variable count grows with plate area × resolution, but the ground state is **geometrically feasible by construction**.
- **Sequence-pair (coordinate-free):** compact, resolution-independent — but the paper **proves an impossibility result**: no coordinate-free QUBO of bounded interaction degree whose penalties vanish on feasible layouts can have a geometrically feasible ground state for 2D containment, because containment is a longest-path constraint. Compactness has a structural ceiling.

Evaluated under simulated annealing, simulated quantum annealing, exact IP, plus D-Wave minor embedding, calibrated direct-QPU sweeps, and Leap hybrid solvers (penalty and constraint-native) across a six-instance campaign. They claim no quantum speedup; the contribution is the impossibility result and a practical rule for choosing formulations. For us: this paper **settles the encoding question** — use coordinate-based set-packing for the scaffold sampler, accept the resolution scaling, and don't chase compact coordinate-free encodings (they can't work).

### 1.4 Sphere packing (QAOA, grid discretization)

**"Sphere Packing on a Quantum Computer for Chromatography Modeling"** (arXiv: https://arxiv.org/html/2412.00601v2). Uses QAOA (gate model, not annealing) for homogeneous sphere packing. Explicitly compares the two discretization options: (a) bit-encoding continuous coordinates (qubits scale exponentially with precision), vs (b) **grid discretization with one qubit per grid point indicating sphere presence** (polynomial scaling). Chooses (b) for QAOA amenability. Direct precedent for our disk-scaffold discretization — and note the scaling argument favors grids, consistent with §1.3.

### 1.5 Qubit-scale reality check

- D-Wave Advantage: 5,000+ qubits, Pegasus topology (15-way connectivity). A dense problem embeds as a clique of at most ~177 logical variables (fewer with broken qubits/links); sparse problems do better.
- Advantage2 (2026): 4,400+ qubits, used in recent benchmarks (Ohal & Boulanger 2026).
- Leap hybrid solvers (BQM/CQM/DQM): up to ~1M variables — but the quantum contribution inside the hybrid loop is heuristic-guided, not a direct ground-state solve.
- All published QA packing results are small on bare QPU (QAL-BP: ~10 items; 2609.20853: six small instances) or hybrid-only (Osaba: 40–50 items via CQM).

---

## 2. Hybrid quantum-classical packing pipelines

D-Wave's Leap service offers three hybrid solvers relevant here:
- **BQM hybrid:** native QUBO; best raw QUBO performance; the quantum module issues queries to guide a classical heuristic portfolio ("hybrid acceleration").
- **CQM hybrid:** hard constraints without manual penalty tuning; **supports integer variables and (since 2022) continuous variables** — but with a sharp limitation: it does not support quadratic *products* of two continuous variables. Our scaffold sampler is binary anyway, so this doesn't bite, but any future "soft potential" formulation with continuous×continuous terms would.
- **DQM hybrid:** discrete (non-binary) variables.

**What worked:** Osaba et al.'s 3D BPP with rich constraints solves at 40–50 items via CQM hybrid — the formulation expressiveness story is proven. The LeapCQMHybrid workflow (classical heuristic module + quantum module proposing guiding queries) is itself a warm-start architecture, though D-Wave doesn't frame it that way.

**What didn't:** No published hybrid packing result beats a tuned classical solver on solution quality. QAL-BP is explicit: QA < Gurobi on small instances. The 2609.20853 authors claim no speedup. The honest reading: hybrid QA is a *sampling* technology for packing today, not an optimization winner — which is exactly the framing our project needs (we don't need QA to solve packing; we need it to *sample good scaffolds*).

---

## 3. Quantum-inspired classical optimizers

These matter as both baselines and as a possible "no-QPU-needed" fallback:

- **SimCIM** (simulated Coherent Ising Machine) and **Simulated Bifurcation** variants — aSB (adiabatic), bSB (ballistic, inelastic walls), dSB (discrete) — plus CAC/CFC/SFC error-corrected CIM variants. Benchmarked comprehensively in *Communications Physics* 7:249 (2024) (https://www.nature.com/articles/s42005-024-01705-7): SimCIM was the most robust across QUBO and small-TSP benchmarks; SB variants converge faster with better accuracy than naive aSB. These relax discrete spins to continuous variables with an annealing schedule — philosophically adjacent to our soft-to-rigid morph.
- **Simulated quantum annealing (SQA):** path-integral Monte Carlo of the transverse-field Ising model; used as the classical control in 2609.20853.
- **QTML 2024 benchmark** (indico.qtml2024.org): SimCIM best on QUBO/small-TSP vs SA, vanilla quantum-inspired annealing, and gradient-based QIA.

Strategic note: any scaffold-sampling result we get from a D-Wave QPU must be benchmarked against SimCIM/SB/SQA on the same QUBO. If a classical quantum-inspired sampler matches QA sample quality, the "quantum" in the pipeline is decorative — the honest version of this project runs that control from day one.

---

## 4. Discretizing continuous geometric packing into binary variables

This is the crux. The literature offers three live options:

| Encoding | Variables | Feasibility | Verdict for scaffold sampler |
|---|---|---|---|
| **Coordinate-based set-packing** (one binary per piece×candidate placement; pairwise exclusion) | n_pieces × n_grid_points | Ground state feasible by construction | **Use this.** 2609.20853 proves the alternative can't work; 2412.00601 independently chooses grids for quantum amenability |
| **Sequence-pair / relative-placement** (binaries for i-left-of-j etc.; cf. Osaba b_{i,k,q}) | O(n²) pairs × 6 relations | Needs penalty/constraints; bounded-degree QUBO provably insufficient for containment | Rejected by the 2609.20853 impossibility result |
| **Bit-encoded coordinates** | n_pieces × bits_per_coordinate | Exponential in precision | Rejected; grid dominates on scaling |

**Sizing for our instances.** A scaffold is a *disk* packing (the τ=1 soft stage), which is good news: disks need coarser grids than polygons to capture relative arrangement, and the fidelity rule only needs *relative* positions right (rank correlation), not absolute precision. Rough budget for squares-in-square n=11 on a 16×16 grid: 11×256 = 2,816 binaries with sparse-ish exclusion structure (each placement excludes only overlapping placements). That's beyond bare-QPU clique embedding but plausible for Leap hybrid or SimCIM. A 24×24 grid (6,336 vars) is hybrid-only territory. **Coarse-to-fine is the obvious play:** sample scaffolds on a coarse grid via QA, then let classical hardening refine — which is precisely the warm-start architecture.

**Penalty design.** Pairwise exclusion (x_p · x_q = 0 for overlapping placements) plus a density reward (maximize placed disks / minimize container estimate). QAL-BP's analytical penalty estimation is the template for setting the exclusion-vs-density tradeoff without per-instance tuning.

---

## 5. The gap: warm-starting *continuous* optimizers from QA samples

This is where the literature thins to nearly nothing — and it's our opening.

**What exists (discrete → discrete warm starts):**
- **Čepaitė, Vaishnav, Zhou, Montanaro (Phasecraft, Aug 2026).** "Quantum-Enhanced Optimization by Warm Starts." http://arxiv.org/html/2508.16309v1 — the theoretical and empirical foundation for our framing. QAOA samples warm-start classical heuristics (tabu search et al.) on Max-Cut/MIS; up to ~1000× runtime improvement (Q-factor metric) on hardware up to 40 qubits. Key properties they prove/observe: (1) the quantum step only needs to beat *uniform random* bitstrings; (2) graceful degradation under noise (worst case = random init, which is the classical default anyway); (3) quantum used once, samples stored offline; (4) sampling (not observable estimation) is the classically-hard part. Every one of these transfers to scaffold sampling.
- **DCQO + memetic tabu search on LABS** (2026): digitized counterdiabatic optimization as a *biased sampler* feeding a classical population — same philosophy, explicitly framed as "not trying to solve the problem, just biasing the initial population."
- **D-Wave reverse annealing** (Pelofske et al.; D-Wave whitepaper 14-1018A): start from a *classical* solution, anneal backward to a mid-point, forward again — quantum local refinement of a known state. Complementary direction (classical→quantum→classical) and a natural second-stage refinement for our pipeline: classical scaffold → reverse-anneal polish → hardening.

**What does NOT exist:** no published work warm-starts a *continuous* geometric optimizer from QA samples. Every warm-start result is discrete→discrete (bitstring in, bitstring out). The continuous relaxation step — decoding a discrete scaffold sample into a continuous initialization for gradient-based hardening — is uncharted. That's the gap, and it's exactly our project: QA samples a discrete disk scaffold → decode to continuous disk positions → classical hardening morphs to the rigid optimum.

**Why the gap matters for our mechanism.** The prior project's finding is that hardening wins iff the *discrete-combinatorial* part (which scaffold) is right; the continuous morph then does local refinement deterministically (C15: good scaffold → good basin 8/8). So the quantum computer is being asked to do exactly the part it's for — combinatorial selection among scaffolds — while the classical optimizer does what it's for — continuous refinement. The division of labor matches the hardware division of labor. No prior QA-packing paper has this structure; they all ask QA to solve the whole problem.

---

## Ranked transferable ideas (for the scaffold sampler)

1. **Coordinate-based set-packing QUBO for disk scaffolds** (Sánchez-Beato et al. 2609.20853). One binary per (piece, grid cell); pairwise exclusion for overlapping disk placements; maximize placed density. Ground state is a feasible scaffold by construction; the impossibility result rules out the compact alternatives, so this is the encoding. Coarse grid suffices because the fidelity rule only needs relative arrangement.
2. **Analytical penalty estimation via augmented Lagrangian** (QAL-BP, Cellini et al. 2024). The scaffold QUBO's exclusion-vs-density tradeoff must not require per-instance empirical tuning — QAL-BP is the only packing precedent that solved this analytically.
3. **The warm-start experimental protocol** (Čepaitė et al. 2026): quantum-as-biased-sampler framing, graceful-degradation expectation, Q-factor (time-to-quality) metric, and the "only needs to beat uniform random" bar. Our Q0 experiment should be: QA-sampled scaffolds vs random scaffolds as hardening inits, measured by scaffold fidelity and final L — with SimCIM/SQA as the classical-sampler control from day one.

## Biggest open risks

1. **Qubit/embedding scaling kills the bare-QPU story.** A 16×16-grid scaffold QUBO (~3k variables, dense exclusions) won't embed on Advantage2 directly; we're in Leap-hybrid or SimCIM territory from the start. The "quantum" contribution then needs to be isolated from the hybrid's classical heuristics — a subtle experimental design problem the literature has not solved cleanly for packing.
2. **No demonstrated quantum edge in warm-start quality for this domain.** Every QA packing paper reports parity-or-worse vs classical solvers. Our bet — that scaffold *sampling* (not optimization) is the sweet spot — is theoretically motivated (Čepaitė's sampling-hardness argument) but empirically unproven. If SimCIM matches QA scaffold quality, the pipeline works but the quantum hardware is optional.
3. **Resolution vs fidelity tension.** The fidelity rule needs *correct relative arrangement*; too coarse a grid collapses distinct scaffolds into one, too fine explodes variables. The grid resolution at which sampled scaffolds actually beat random inits is unknown and instance-dependent — this is the first experiment to run (Q01), and it can fail.

## Suggested Q01 (next step)

Build the coordinate-based disk-scaffold QUBO for squares-in-square n=11 (the signature instance), sample scaffolds with (a) D-Wave hybrid, (b) SimCIM, (c) uniform random; decode to continuous inits; run classical hardening; compare scaffold fidelity distributions and final-L hit rates. Success criterion (preregister): QA/SimCIM-sampled inits achieve higher mean scaffold fidelity than random inits at fixed sample budget.
