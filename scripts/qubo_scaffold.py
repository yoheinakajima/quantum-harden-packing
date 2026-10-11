#!/usr/bin/env python3
"""Q01 scaffold sampler: coordinate-based disk-packing QUBO, solved with
CLASSICAL simulated annealing (dimod). NEVER label this output as quantum.

Builds a BQM for placing 11 disks (r=0.5) on a 10x10 grid, samples 16
independent SA runs (seeds 1..16), decodes the best sample of each run to
continuous disk positions, writes scaffolds.json.
"""
import json
import math
import os
import sys

import dimod
import numpy as np

# ---- config (mirrors plan.json) ----
N_DISKS = 11
RHO = 0.5
GRID = 10
BOX = 2.0            # half-side; cells span [-BOX, BOX]
P_CARD = 5.0         # (sum y - N)^2 penalty
P_OVER = 10.0        # overlapping cell pairs
C_TIGHT = 2.0        # center pull coefficient
SA_READS = 10
SEEDS = list(range(1, 17))

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CAMP = os.path.join(ROOT, "campaigns", "Q01-classical-scaffold-sampling")


def cell_centers():
    step = 2 * BOX / GRID
    return [(-BOX + step * (i + 0.5), -BOX + step * (j + 0.5))
            for j in range(GRID) for i in range(GRID)]


def build_bqm(cells):
    n = len(cells)
    # linear: cardinality expansion + center pull
    # (sum y - N)^2 = sum y^2 - 2N sum y + N^2 = sum y - 2N sum y + N^2  (y^2=y)
    #   linear coef per var: P_CARD * (1 - 2*N)
    lin = {}
    for g, (x, y) in enumerate(cells):
        r2 = x * x + y * y
        rmax2 = 2 * BOX * BOX
        pull = -C_TIGHT * (1.0 - r2 / rmax2)
        lin[g] = P_CARD * (1 - 2 * N_DISKS) + pull
    # quadratic: cardinality pairs + overlap pairs
    quad = {}
    for g in range(n):
        for h in range(g + 1, n):
            q = 2 * P_CARD  # from (sum y - N)^2 cross terms: 2*P_CARD*y_g*y_h
            dx = cells[g][0] - cells[h][0]
            dy = cells[g][1] - cells[h][1]
            if math.hypot(dx, dy) < 2 * RHO - 1e-9:
                q += P_OVER
            if q:
                quad[(g, h)] = q
    bqm = dimod.BQM.from_qubo(
        {(g, g): lin[g] for g in range(n)} | quad
    )
    return bqm


def main():
    cells = cell_centers()
    bqm = build_bqm(cells)
    print(f"BQM: {bqm.num_variables} vars, {len(bqm.quadratic)} couplings",
          file=sys.stderr, flush=True)
    sampler = dimod.SimulatedAnnealingSampler()
    scaffolds = []
    for s in SEEDS:
        np.random.seed(s)  # dimod SA draws from numpy global RNG
        ss = sampler.sample(bqm, num_reads=SA_READS)
        best = ss.first
        occ = [g for g, v in best.sample.items() if v == 1]
        pos = [cells[g] for g in occ]
        # sanity: pairwise min distance
        md = min((math.hypot(a[0] - b[0], a[1] - b[1])
                  for i, a in enumerate(pos) for b in pos[i + 1:]),
                 default=float("inf"))
        scaffolds.append({
            "seed": s,
            "energy": float(best.energy),
            "n_placed": len(occ),
            "min_pair_dist": md,
            "positions": [[round(x, 5), round(y, 5)] for x, y in pos],
        })
        print(f"seed {s}: energy={best.energy:.2f} placed={len(occ)} "
              f"min_dist={md:.3f}", flush=True)
    out = os.path.join(CAMP, "scaffolds.json")
    with open(out, "w") as f:
        json.dump({"solver": "dimod.SimulatedAnnealingSampler (CLASSICAL)",
                   "scaffolds": scaffolds}, f)
    print(f"wrote {out}", flush=True)


if __name__ == "__main__":
    main()
