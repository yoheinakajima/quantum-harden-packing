#!/usr/bin/env node
// Q01 runner: harden-qubo (QUBO-warm-started) vs harden (random init) on
// squ-in-squ n=11, 16 seeds each. Uses engine/engine2d.js (copied from
// when-hardening-helps; original untouched). All sampling is CLASSICAL.
'use strict';
const fs = require('fs'), path = require('path');
const E2 = require('../engine/engine2d.js');

const ROOT = path.join(__dirname, '..');
const CAMP = path.join(ROOT, 'campaigns', 'Q01-classical-scaffold-sampling');
const scaffolds = JSON.parse(fs.readFileSync(path.join(CAMP, 'scaffolds.json'), 'utf8')).scaffolds;

const N = 11, RHO = 0.5;
const P = E2.makePiece('square');
const C = E2.makeContainer('square');

// mulberry32 for seeded rotations
function rng32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quboInit(scaf, seed) {
  let pos = scaf.positions;
  if (pos.length !== N) {
    // graceful fallback: trim or pad (should not happen with good penalties)
    console.error(`[warn] seed ${seed}: QUBO placed ${pos.length}, adjusting to ${N}`);
    const cx = pos.map(p => p[0]), cy = pos.map(p => p[1]);
    while (pos.length < N) pos.push([(Math.random() - 0.5), (Math.random() - 0.5)]);
    pos = pos.slice(0, N);
  }
  // tight half-side to contain disks
  let hs = 0;
  for (const [x, y] of pos) hs = Math.max(hs, Math.abs(x) + RHO, Math.abs(y) + RHO);
  const rng = rng32(seed * 7919 + 13);
  const p = [];
  for (const [x, y] of pos) p.push(x, y, rng() * 2 * Math.PI);
  return { p, L: 2 * hs, pad: 1.1 };
}

const METHODS = ['harden-qubo', 'harden'];
const SEEDS = Array.from({ length: 16 }, (_, i) => i + 1);
const done = new Set();
const outPath = path.join(CAMP, 'runs-w0.jsonl');
if (fs.existsSync(outPath)) {
  for (const line of fs.readFileSync(outPath, 'utf8').split('\n')) {
    if (line.trim()) { try { done.add(JSON.parse(line).id); } catch (e) {} }
  }
}
const repDir = path.join(CAMP, 'replays');
fs.mkdirSync(repDir, { recursive: true });

let ran = 0;
for (const method of METHODS) {
  for (const seed of SEEDS) {
    const id = `squ-in-squ/n11/${method}/B1/default/s${seed}`;
    if (done.has(id)) continue;
    const cfg = { n: N, piece: 'square', container: 'square', method: 'harden',
                  seed, budget: 1, mu: 0.08, noiseScale: 8 };
    if (method === 'harden-qubo') {
      const scaf = scaffolds.find(s => s.seed === seed);
      if (!scaf) throw new Error('missing scaffold for seed ' + seed);
      cfg.init_from = quboInit(scaf, seed);
    }
    let res, err = null;
    try { res = E2.run(cfg); } catch (e) { err = String(e && e.stack || e); }
    const row = { id, campaign: 'Q01-classical-scaffold-sampling', family: 'squ-in-squ',
                  n: N, method, budget: 1, config: 'default', seed,
                  solver_note: 'CLASSICAL only; no QPU',
                  t: new Date().toISOString() };
    if (err) { row.error = err; }
    else {
      row.L = +res.L.toFixed(6);
      row.ms = res.ms; row.evals = res.evals; row.steps = res.steps;
      row.poses = res.poses.map(p => p.map(v => +v.toFixed(6)));
      const bf = path.join(repDir, `squ-in-squ_n11_${method}_B1_default.json`);
      let prev = null;
      try { prev = JSON.parse(fs.readFileSync(bf, 'utf8')); } catch (e) {}
      const replay = { id, family: 'squ-in-squ', n: N, method, seed, L: res.L,
                       frames: res.frames };
      if (!prev || res.L < prev.L) fs.writeFileSync(bf, JSON.stringify(replay));
    }
    fs.appendFileSync(outPath, JSON.stringify(row) + '\n');
    ran++;
    console.error(`[${method} s${seed}] ${err ? 'ERROR' : 'L=' + row.L}`);
  }
}
console.error(`finished ${ran} runs`);
