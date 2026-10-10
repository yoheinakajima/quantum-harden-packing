# Quantum-Assisted Soft-to-Rigid Packing

A separate parallel research project building on [soft-to-rigid](https://yoheinakajima.github.io/soft-to-rigid/)
and [when-hardening-helps](https://yoheinakajima.github.io/when-hardening-helps/).

## Core idea

The when-hardening-helps project established that **the disk scaffold determines
the hardening outcome** (scaffold fidelity → harden gap, rho=-0.56, replicated
at rho=-0.80 on held-out data; good-scaffold transplant succeeds 8/8). The
scaffold is the causal bottleneck.

This project asks: **can quantum annealing (or quantum-inspired classical
methods) sample better scaffolds than classical random initialization?**

## Hybrid pipeline

1. **QUBO scaffold sampler**: discretize an intermediate soft stage (disk
   positions on a coarse grid, discretized contact graph) into a QUBO; sample
   with quantum annealing or a classical QUBO solver.
2. **Classical hardening**: feed the best samples as warm starts (`init_from`)
   into the gradient-based hardening optimizer (compress + morph + settle).
3. **Compare** against: pure classical hardening (random inits), rigid starts,
   classical SA — on the instances where hardening uniquely wins.

## Research phases (preregistered)

- **Q00**: literature review — QA/QUBO packing formulations, hybrid pipelines,
  quantum-inspired optimizers.
- **Q01**: QUBO formulation design — discretize the scaffold; validate that
  good QUBO solutions decode to good scaffolds (classical QUBO solver first,
  no QPU needed).
- **Q02**: quantum-inspired classical — embed a soft-to-rigid schedule inside
  SA/quantum-inspired optimizers; needs no quantum hardware.
- **Q03**: QA hardware — requires D-Wave Leap (or equivalent) access; **blocked
  until credentials are provided.**
- **Q04**: ablation — does the quantum step help via better inits, barrier
  escape during the morph, or both?

## Tracking

Same standards as when-hardening-helps: preregistered campaigns, ActiveGraph
event ledger (`packing/ledger.py`), null results preserved, GitHub + Pages.

## Status

See `JOURNAL.md` (generated) and the site.
