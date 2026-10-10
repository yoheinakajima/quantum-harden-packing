# Notes for AI agents working in this repository

Mirror of when-hardening-helps house rules, adapted for the quantum project.

- **Never edit results.** `campaigns/*/runs*.jsonl` are append-only; `ledger/` is written only by `packing/ledger.py`.
- **Plan before running.** A new experiment is a new folder `campaigns/Qxx-name/plan.json` (question, hypothesis, instances, methods, budgets, seeds, decision rule), committed before its first run. Amendments go in the plan's `amendments` list; do not rewrite.
- **Record:** `.venv/bin/python -m packing.ledger ingest <Q>`, findings with `.venv/bin/python -m packing.ledger finding "<text>" --campaign <Q>`, close with `.venv/bin/python -m packing.ledger close <Q> "<decision>"`.
- **No QPU without credentials.** Q03 (QA hardware) is blocked until the user provides D-Wave Leap access. Do not fake quantum results with a classical solver and label them quantum.
- **Classical-first.** Q01/Q02 need no quantum hardware. Validate the QUBO formulation classically before any QPU work.
- **No personal email.** Before the first commit in a clone, set `git config user.email "<noreply>"` (name `Yohei Nakajima`).
