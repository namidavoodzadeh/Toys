# Toys — single-file learning toys, deployed on GitHub Pages

## What this is
Self-contained HTML learning toys served at
`https://namidavoodzadeh.github.io/Toys/<file>.html` and used on an iPhone
(Safari → share → Add to Home Screen). Two-part curriculum:
**little-learner.html** (complete, maintain) — a real neural network
(MLP + a real one-head attention layer) that trains live on the phone —
and **little-llm.html** (active) — the build-a-language-model arc.
Nami finished little-learner in Aug 2026; his verdict: chapters 1–7
landed, the neuron→attention jump did not. Attention must be re-taught
INSIDE a language model, after a felt failure, which is little-llm's job.

Every toy is ONE html file: inline CSS + JS, no external dependencies,
no build step, no network calls. iOS Files/Quick Look does NOT execute
JS — a file only runs when served (GitHub Pages) or opened in a desktop
browser. Repo name is `Toys` with a capital T; the URL is case-sensitive.

Other toys in this repo (particle-life, tipping-points, body-politic,
signal-noise) share the visual identity and the verification discipline
but are separate subjects. Do not modify them unless asked.

## Who this is for — and why the rules exist
The user (Nami) has a mechanical engineering PhD, no ML background, and
ADHD. Every rule below was written after a specific failure that cost him
hours and nearly ended the project. Treat them as constraints, not
suggestions.

## Non-negotiable design rules
1. **One symbol, one meaning — everywhere.** little-learner's cast:
   `x₁, x₂` (the inputs) · `w₁, w₂, b` (the dials) ·
   `score = w₁x₁ + w₂x₂ + b` · `guess = σ(score)` ·
   `truth` (1 = spam, 0 = legit) · `error = guess − truth` ·
   `vote = error × input`. The letter **y is banned from all UI text**
   (it once meant both an axis and the truth label; the collision cost
   an evening and nearly killed his motivation). Textbook notation that
   collides with the cast gets translated, never imported. The harness
   greps for forbidden strings — extend that list whenever a new
   collision risk appears.
   little-llm's cast: `the book` (the on-screen text, the machine's
   whole world) · `next` (the letter to guess) · `context` (letters
   already seen) · `count` · `share = count ÷ row total` · `temp` ·
   `babble` (generated text). Jargon is banned until a chapter earns
   it: probability, distribution, token, n-gram, corpus, stochastic
   must not appear anywhere in the file (harness-llm greps).
2. **Word budget.** Any instruction text: main sentence ≤ 22 words,
   total ≤ 45 including the `.sub` line. Enforced by the harness.
3. **Type scale.** Goal text 14px, inspector panel 13px, caption 12px,
   pill labels 11px, canvas annotations ≥ 10px. Never smaller. Prefer
   HTML panels over canvas text for anything longer than one line.
4. **Concrete before abstract.** A real story (the spam filter, the
   thermostat) and explicitly stated conventions — which color is which
   class, what the axes are, what the goal is — BEFORE any machinery
   appears. Progressive disclosure: chapter 1 unlocks in 5 steps
   (data → score → squish → paint → fit); nothing appears before its
   step.
5. **He learns by driving, not listening.** Prefer tap-to-inspect (full
   arithmetic with the actual numbers of that one example),
   predict-then-check, and visible consequences over explanatory prose.
   When he's confused, the fix is usually a missing stated convention or
   an overloaded symbol — not a longer explanation.
6. **Everything real.** No simulated or faked ML. Real forward and
   backward passes, real loss, real gradients, real attention. The
   "Honesty" notes in the in-app manual must stay literally true.
7. **Never ship an untested claim.** If the app or manual asserts a
   behavior ("push the rate past ~12 in ch. 4 and it destroys itself"),
   the harness must demonstrate it. When a claim fails testing, fix the
   claim, not the test. Precedent: "overshoot at lr 3" in ch. 2 was
   false — single-neuron BCE is convex (a bowl) — so that demo moved to
   ch. 4, where it is true.

## Verification workflow — required before every ship
1. Edit the toy's html file.
2. Syntax: extract the `<script>` body and `node --check` it.
3. Behavior: `node harness9.js` for little-learner (22 checks),
   `node harness-llm.js` for little-llm (21 checks) → **all must
   pass**. Run BOTH before any push that touches either file.
   harness9 stubs the DOM, boots little-learner headlessly, and tests:
   forbidden-notation grep, the cast + thermostat present, type scale,
   word budgets, inspector arithmetic exact vs the network, thermostat
   semantics per email, ▲/▼ arrow direction vs actual dial movement
   after `trainEpoch`, all draw paths across chapters/steps, hand
   solvability ≥ 97%, solved-toast path, crawl-vs-snap learning-rate
   contrast, depth regression (rings H=3 → 100%), attention still
   training.
4. When you add a feature, add a check for it in the same commit.
5. Commit with a message stating what was verified; push. GitHub Pages
   redeploys automatically; the phone URL stays the same (re-add to home
   screen if iOS caches an old version).

harness-llm tests: jargon grep, cast, type scale, word budgets, book
purity (28 glyphs only), bigram counts vs an independent recount,
share arithmetic + temperature monotonicity, seeded draws vs shares,
deterministic generation, cell-inspector exactness, game scoring +
unlock at 12 guesses, the wall (28ⁿ exact, coverage <0.1% at n=4,
one-way steps 4%→71%, quote length ≤14 → ≥20 across seeds), verdict
tones at endpoints, draw paths.

little-learner exposes internals for testing via `window.LAB`: makeModel,
forward, trainEpoch, evalSet, makeData, run, the attention suite
(atInit/atForward/atBackward/atTrainStep), and the ch-1/2 layer (NB,
NB_STEPS, nbSetStep, inspectData, renderInspect, gradNow, setCh,
getData, getModel, drawAll). little-llm exposes `window.LM`: BOOK,
VOCAB, getTable, shares, pickIdx, generate, longestCopy, wallStats,
verdict, cellInfo, renderCell, buildNow, babble, game (state/tap/
newSentence), setCh, setTemp, setN, drawAll, CH_GOALS, unlocked.
Keep LAB and LM current when refactoring.

## Current verified state (do not re-derive; extend)
- 9 chapters: 1 Neuron (5-step guided spam-filter story, hand-fit,
  solved-toast at ≥97%) · 2 Learning (thermostat framing, per-email
  error/votes/loss panel, live dial arrows) · 3 The Limit (single
  neuron jams on rings) · 4 Depth (hidden 1–8, per-neuron tiles; rings
  fall at H=3; spiral wants 8; lr ≥ ~12–15 self-destructs) · 5 Black Box
  (tap-to-ablate) · 6 Overfit (30% hollow-dot test split, U-curve) ·
  7 Serve (frozen weights, tap = forward pass) · 8 Context (hat game by
  hand) · 9 Attention (real one-head layer: d=16, dk=8, ~1.1k params,
  minibatch 16).
- Attention gradient-checked vs central differences: max rel err
  ~6e-7. Trains to ~90% batch acc in ~240–270 steps at lr 0.15 across
  seeds; holdout ≥ 0.9.
- Ch-2 facts: lr 0.05 → ~673 epochs to loss 0.15; lr 2 → ~17; lr 20
  stays finite and fits (convex). Hand-solvable at 100% within slider
  range.
- Chapters 1–2 are exactly logistic regression; the manual says so.
- little-llm ch 1–3 shipped 2026-08-29: 1 The Game (he taps the next
  letter of book sentences, scored, 12 guesses unlock) · 2 The Counter
  (bigram counts of the 849-letter book, animated heatmap, tap-a-cell
  arithmetic, temp slider, live babble) · 3 The Wall (context 1–4:
  rows 24→111→226→329 of 28ⁿ, one-way steps 4%→27%→53%→71%, longest
  verbatim quote ~8–10 → 22–37 letters; verdict text tied to measured
  thresholds). All model math is a count table — no fake ML, and no
  neural net yet, by design.
- little-llm planned arc (promising, unbuilt): dials replace the table
  (tiny neural bigram, generalization vs memorization shown on the
  same wall stats) → letters as learned vectors → fixed-window model
  and its felt failure → attention as the rescue, visualized on real
  text → stack + train a tiny transformer live on the phone → serve
  with temp. Attention must NOT appear before the window model fails.

## Visual identity (all toys)
Background `#06070b`, ink `#e9e4d8`, lamp gold `#f0b85a` (primary
accent), teal `#3fd1a5` = class 0 / positive weights, rose `#ff6e6e` =
class 1 / negative weights, blue `#4fc1ff`, violet `#c98bff`. Monospace
uppercase micro-labels, rounded 10–14px panels, hairline borders,
`apple-mobile-web-app` meta tags, safe-area padding, 44px+ touch
targets.

## Working with Nami
Direct, peer-level, no filler. Chunk information with bold lead-ins.
One clear next action at the end of a work session, phrased for the
phone ("open chapter 2, tap a rose dot, press Step once"). When he
reports confusion, first suspect the app: an unstated convention, an
overloaded symbol, or too many words on screen. Distinguish what is
proven (harness-verified) from what is promising (untested) in every
status you give him.
