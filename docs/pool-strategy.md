# World Cup 2026 Pool — GTO Strategy Analysis
**Not served by the site. Lives in repo only.**

---

## 1. Pool Parameters

| Parameter | Value |
|---|---|
| Total entries | 21 (19 rivals + 2 mine) |
| Entry fee | $10 each |
| Pot | $210 |
| 1st prize | $157.50 (75%) |
| 2nd prize | $52.50 (25%) |
| 3rd prize | Free entry ($10 value) |
| Group stage games | 72 (12 groups × 6 games) — **max 72 pts** |
| Bracket games | 31 (R32 through Final) — **max 80 pts** (see §8) |
| My entries | 2 — barbell: Anchor (chalk) + Dagger (selective high-leverage deviations). See §6.4. |

**Scoring-weight headline (decoded from the leaderboard MAX column, Jun 14):** the bracket is worth up to **80 points** vs **72** for the entire group stage. With ~64 group points remaining mid-stage, **the bracket is the larger half of the whole tournament.** Group-stage deviations are ±0.5-pt decisions; the bracket decides the pool. See §8.

⚠️ **An unsubmitted bracket caps your ceiling.** The leaderboard MAX column = current pts + best-case remaining. Entries with no bracket picks show MAX ≈ current + remaining-groups only (e.g. my entries: MAX 67 = 3 + 64), while bracketed rivals show MAX ≈ 140–150. **Until a bracket is submitted you mathematically cannot win.** Submitting the bracket before group stage ends is priority #1, ahead of any single group pick.

---

## 2. Confirmed Scoring Rule

This is the most important section. The scoring rule was confirmed empirically after the Canada 1-1 Draw (June 12).

| Your pick | Game result | Your score |
|---|---|---|
| Home or Away | That side wins outright | **+1** |
| Home or Away | Other side wins outright | **−1** |
| Home or Away | Draw | **0** |
| Draw | Draw | **+1** |
| Draw | Either side wins outright | **−1** |

**Key insight:** A draw result is a "free pass" for side pickers — no penalty. Draw pickers only gain when draws actually happen, and lose −1 on any decisive result.

---

## 3. Single-Game Mathematics

### 3.1 Notation

For any match, define:
- **p** = true probability the favorite wins outright
- **d** = true probability of a draw
- **q** = true probability the underdog wins outright
- p + d + q = 1

All probabilities sourced from Polymarket at lock time.

### 3.2 Expected Score Per Pick

**Picking the favorite:**

```
E[pick fav] = p(+1) + d(0) + q(−1) = p − q
```

**Picking draw:**

```
E[pick draw] = d(+1) + p(−1) + q(−1) = d − p − q = 2d − 1
```

Since d < 0.5 in every soccer game, **2d − 1 < 0 always**.
Picking draw has strictly negative expected score. Never the optimal pick.

**Picking the underdog:**

```
E[pick dog] = q(+1) + d(0) + p(−1) = q − p
```

### 3.3 Optimal Individual Pick

Compare E[fav] vs E[dog]:

```
E[fav] > E[dog]  ⟺  p − q > q − p  ⟺  p > q
```

**Rule: always pick the side with the higher outright win probability.**
In practice this is the chalk favorite unless you have reason to believe Polymarket misprices a team.

Draw is never the correct individual pick (2d − 1 < 0 for all d < 0.5).

### 3.4 Expected Scores by Game Class

| Class | Typical odds (p/d/q) | E[fav pick] | E[draw pick] | E[dog pick] |
|---|---|---|---|---|
| A (p > 0.60) | 0.65/0.22/0.13 | **+0.52** | −0.56 | −0.52 |
| B (0.50–0.60) | 0.55/0.27/0.18 | **+0.37** | −0.46 | −0.37 |
| C (0.40–0.50) | 0.47/0.29/0.24 | **+0.23** | −0.42 | −0.23 |
| D (< 0.40) | 0.38/0.31/0.31 | **+0.07** | −0.38 | −0.07 |

Note: Under old scoring (draw = −1 for all wrong picks), Class D chalk EV was 2(0.38)−1 = −0.24.
Under **new scoring**, Class D chalk EV is +0.07. The "free draw" rule is a significant gift to chalk pickers.

---

## 4. Pool-Relative Analysis

In a winner-take-all pool, what matters is not absolute expected score but **relative position vs rivals**.

### 4.1 Chalk vs Chalk: Zero Relative Variance

If you and a rival both pick chalk on every game, your relative score never changes regardless of outcomes. Every game produces 0 relative swing. You can never gain or lose ground.

### 4.2 Dog Deviation vs Chalk Rivals

If you pick dog, rival picks chalk:

| Result | Your score | Rival score | Relative |
|---|---|---|---|
| Fav wins (p) | −1 | +1 | **−2** |
| Draw (d) | 0 | 0 | **0** |
| Dog wins (q) | +1 | −1 | **+2** |

```
E[relative per game] = p(−2) + d(0) + q(+2) = 2(q − p)
```

Positive only when q > p. For all games where the favorite has higher outright probability, this is negative.

**Cost of deviating to dog vs chalk rival:**

| Class | p | q | Cost per game |
|---|---|---|---|
| A | 0.65 | 0.13 | −1.04 |
| B | 0.55 | 0.18 | −0.74 |
| C | 0.47 | 0.24 | −0.46 |
| D | 0.38 | 0.31 | **−0.14** |

Class D dog deviations are the cheapest variance purchase: you pay 0.14 pts in EV to get a ±2 swing with probability 38%/31%.

### 4.3 Draw Deviation vs Chalk Rivals

If you pick draw, rival picks chalk:

| Result | Your score | Rival score | Relative |
|---|---|---|---|
| Fav wins (p) | −1 | +1 | **−2** |
| Draw (d) | +1 | 0 | **+1** ← only +1, not +2 |
| Dog wins (q) | −1 | −1 | **0** |

```
E[relative per game] = p(−2) + d(+1) + q(0) = d − 2p
```

For E > 0: **d > 2p**. Requires draw probability > twice the favorite win probability. Impossible in practice.

**Cost of deviating to draw vs chalk rival:**

| Class | p | d | Cost per game |
|---|---|---|---|
| A | 0.65 | 0.22 | −1.08 |
| B | 0.55 | 0.27 | −0.83 |
| C | 0.47 | 0.29 | −0.65 |
| D | 0.38 | 0.31 | **−0.45** |

Draw deviations cost 3x more than dog deviations in Class D. This is because when draw hits, chalk pickers score 0 (not −1), so you only gain +1 relative (not +2) when your draw bet lands.

**Conclusion (per-game EV): every deviation has negative expected score.** The cheapest is a Class D dog. This is the right lens for maximizing your *mean* — but the pool does not pay out on the mean. See §4.4.

---

## 4.4 EV-Max vs Prize-Max: The Tournament Correction

Sections 3–4.3 maximize **expected score**. That is the wrong objective for a top-heavy pool, and the live results prove it.

**The payout is the max-order-statistic, not the mean.** Prizes go to 1st (75%), 2nd (25%), and 3rd (free entry) of 21 entries. You are not paid for being above average — you are paid for being at the **top** of 21 noisy scores. The maximum of 21 random walks is drawn from the high-variance tail, never from the dense low-variance middle.

**Pure chalk lands you in the middle, by construction.** If ~half the field takes some variance and you take none:

- In the worlds where favorites mostly hold, the ~10+ chalk players finish **tied** and split 1st. Your share of that outcome is ~1/(number of chalk players) — a few percent.
- In the worlds where even one deviator catches an upset, that deviator separates and takes 1st clean. The entire chalk pack — you included — cashes nothing.

**Empirical confirmation (after 8 games):** the pool lead has changed hands twice, both times to a deviator who hit (a Draw pick on Canada → +4; an Australia pick vs 86%-Turkey → +5). A pure-chalk entry going 8/8 on GTO picks sits at +3, behind both — in the dense middle, exactly as the order-statistic predicts.

### 4.4.1 Why higher chalk concentration *increases* deviation value

The field is more chalk-heavy than the §5 model assumed (Class B running ~85%, not 75%; Class A 95–100%). Counterintuitively this makes correct deviations **more** valuable, not less:

```
Separation when a faded favorite loses = +2 × (number of chalk rivals)
```

At 86% concentration that is +2 against ~18 rivals in a single game. The tighter the pack clusters on chalk, the further a correct fade vaults you past it. Concentration is leverage.

### 4.4.2 Reinstating the draw

Per-game, a draw pick is −EV (§3.2). But as a **tournament leverage play** it is live:

- When a heavy favorite (field ≥ 80%) is held to a draw, draw-pickers gain **+1 on the entire field** at once.
- Empirical draw rate is **37.5%** (3 of 8 games) vs a field allocation of 0–10%. Draws are both over-performing the model and badly under-bet by rivals.
- Lower ceiling than catching an upset (+1 vs +2) but a much higher hit rate (~27–37% vs ~17%). It is the best **risk-adjusted** separation play currently available.

The §4.3 "never pick draw" rule was EV-correct and prize-wrong. Draws return to the toolkit — **but on the bracket, not the group stage (§4.4.3).**

### 4.4.3 Where the variance should come from: the bracket, not the groups

§4.4 says you must take variance to win. §8 says the bracket is 80 of ~152 total points and swings ±16 on a single pick. Put those together:

**The bracket alone supplies more than enough separation variance to escape the chalk cluster.** You do not need to manufacture variance in the group stage — and doing so is actively wrong, because:

1. **Group deviations are −EV (§4.1–4.3) and their variance is dominated by the bracket's.** A ±2 group swing is noise next to a ±16 Final pick. You'd be paying EV for redundant variance in the *cheap* half of the tournament.
2. **It lowers your floor.** Two entries on pure chalk arrive at the bracket with the maximum group score and the smallest gap to the leaders (group leads are fragile — see point 3).
3. **It burns optionality.** Identical chalk entries reach the bracket from a common base, from which you can build two *maximally different* brackets — one to win if favorites hold, one for chaos. If you'd diverged in the groups, a buried entry can't serve as a clean ceiling line.
4. **Group standings barely survive the bracket.** A −3 group deficit is erased by one correct SF pick (+8). The reshuffle at the bracket makes group-stage rank close to irrelevant.

**Resolution: run ONE pure-chalk line through the entire group stage on both entries. Concentrate 100% of the divergence in the bracket, where leverage is 16–20× and the points actually live.** The barbell (§6.4) is therefore a *bracket-stage* structure, not a group-stage one.

---

## 5. Rival Behavior Model (Calibrated)

Based on 4 games observed, calibrated crowd pick rates:

| Class | Chalk % | Draw % | Dog % | Avg EV cost vs chalk |
|---|---|---|---|---|
| A | 100% | 0% | 0% | 0.00 |
| B | 81% | 10% | 10% (Canada obs.) | −0.157 |
| C | ~60% | ~15% | ~25% (est.) | −0.213 |
| D | 48% | 24% | 28% (S. Korea obs.) | −0.147 |

**Rival cost per game:**
```
0.10(−0.83) + 0.10(−0.74)  = −0.157   [Class B, per rival]
0.15(−0.65) + 0.25(−0.46)  = −0.213   [Class C, per rival]
0.24(−0.45) + 0.28(−0.14)  = −0.147   [Class D, per rival]
```

**Total expected rival deviation over 72 group stage games:**

Approximate game class distribution (72 games):
- Class A: 18 games
- Class B: 20 games  
- Class C: 20 games
- Class D: 14 games

```
18(0) + 20(−0.157) + 20(−0.213) + 14(−0.147)
= 0 − 3.14 − 4.26 − 2.06
= −9.46 pts vs chalk
```

**τ ≈ −9.5 pts: the average rival scores approximately 9.5 points worse than pure chalk over the group stage.**

### 5.1 Rival Score Distribution

Under CLT approximation (72 games, independent deviations):

Variance per game (weighted by class, per rival):
- Class B: E[(diff²)] ≈ 0.10×1.63 + 0.10×2.74 = 0.437
- Class C: E[(diff²)] ≈ 0.15×1.83 + 0.25×2.76 = 0.964  
- Class D: E[(diff²)] ≈ 0.24×1.63 + 0.28×2.74 = 1.158

Total per game (weighted by class frequency):
```
σ²_per_game ≈ (20×0.437 + 20×0.964 + 14×1.158) / 72 ≈ 0.626
σ²_total = 72 × 0.626 = 45.1
σ_total ≈ 6.7 pts
```

**A typical rival's group-stage score vs chalk is approximately N(−9.5, 6.7²).**

P(a single rival outscores chalk) = P(Z > 9.5/6.7) = P(Z > 1.42) ≈ **7.8%**

---

## 6. Entry Count Optimization

### 6.1 P(Winning 1st) — Single Chalk Entry

With 19 rivals each independently distributed as N(−9.5, 6.7²) relative to chalk:

Rough approximation (independence — rivals are actually positively correlated, so this understates chalk's win probability):

```
P(chalk beats all 19) ≈ (1 − 0.078)^19 ≈ 0.92^19 ≈ 0.21
```

The earlier draft inflated this to ~52% via a hand-waved correlation adjustment. **That was wrong, and the live results expose it.** The independence figure (~21%) is closer to the truth:

```
P(at least one rival beats a chalk entry) ≈ 1 − 0.922^19 ≈ 79%
P(a chalk entry is the outright max of 21) ≈ 21%
```

And even that 21% overstates **my** chalk entry's value, because when chalk "wins" it is usually a multi-way tie of all the chalk players splitting 1st — my share is ~1/(chalk-pack size). Realistic P(my pure-chalk entry takes clean 1st) is low single digits. Confirmed in the field: 8 games in, no chalk entry has led since Game 2.

### 6.2 Two-Entry EV Table (Revised)

With 19 rivals (pot grows with each entry):

| Entries | Pot | 1st prize | P(≥1 wins 1st) | E[gross] | Cost | E[net] | Marginal E[net] |
|---|---|---|---|---|---|---|---|
| 1 | $200 | $150 | ~52% | ~$93 | $10 | **~$83** | $83 |
| 2 | $210 | $157.50 | ~78% | ~$136 | $20 | **~$116** | $33 |
| 3 | $220 | $165 | ~85% | ~$152 | $30 | **~$122** | $6 |

Notes on the 2-entry calculation:
- Two **identical** entries cover the same point in outcome-space. They share a finishing position and only help on tie-splits.
- Two **differentiated** entries cover different outcome-space. P(≥1 wins) ≈ 1 − P(neither), which is materially higher.
- **But where you differentiate matters.** Per §4.4.3, the divergence should happen at the *bracket*, not the groups. Two entries running identical pure chalk through the groups are not "wasted" — they reach the bracket from a shared maximal-floor base and then split into two maximally-different brackets, which is where the ±16-point swings make P(≥1 wins) jump. Diverging in the groups instead would spend −EV variance in the cheap half and burn that optionality.

### 6.3 Entry 3 Assessment

Marginal E[net] ≈ $6 on a $10 cost. Below break-even.

**Recommendation: 2 entries is correct for this pool size. 3rd entry is negative EV.**

---

## 6.4 The Barbell — A Bracket-Stage Structure

Given §4.4.3 (the bracket supplies all the separation variance you need, at 16–20× the leverage), the two entries run **identically through the group stage** and split **only at the bracket**:

| Phase | Both entries | Why |
|---|---|---|
| **Group stage** | One pure-chalk line, identical on both entries | Max floor, smallest gap to leaders, full optionality preserved into the bracket (§4.4.3) |
| **Bracket** | Split into Anchor + Dagger (below) | This is where the 80 points and ±16 swings live |

**At the bracket, split into:**

| Entry | Role | Policy | Wins in the world where… |
|---|---|---|---|
| **Anchor** | Floor | Chalk bracket — favorite to advance every slot | Favorites hold; the chalk pack ties and splits — Anchor is in the split |
| **Dagger** | Ceiling | Chalk most slots + 1–2 targeted late-round upsets | A bracket upset separates someone — Dagger is that someone |

Between them they cover both branches: the Anchor cashes the "chalk holds" world; the Dagger is the only line with a shot at clean 1st in the "chaos" world. See §8 for Dagger bracket-slot selection.

---

## 7. Group Stage Pick Strategy

### 7.1 The Rule

**Both entries, every game: pick the team with the higher outright win probability per Polymarket at lock.** Pure chalk, identical lines. This maximizes absolute EV, holds the highest floor, and preserves the optionality you cash in at the bracket (§4.4.3). No group-stage deviations on either entry.

### 7.2 The One Exception (and why it almost never fires)

The *only* time group deviation is rational is a true late-stage emergency: you are buried so deep that even a perfect bracket cannot recover the gap. With the bracket worth 80 points, that threshold is enormous — realistically it never happens. A −3, −5, even −10 group deficit is fully recoverable in the bracket, so the answer in every realistic group spot is **chalk**.

For completeness, the mechanics of a forced catch-up deviation (should it ever apply): a dog win gives you +2 vs a chalk-picking rival, a fav win −2, a draw 0 — you need the ±2 swings, taken in the nearest-to-even games against a concentrated field.

**How many dog picks to close a gap of N points:**

To close N points on a rival picking chalk, in a Class D game (p_dog=0.31, p_chalk=0.38):

```
E[gap change per dog pick] = 0.31(+2) + 0.38(−2) + 0.31(0) = 0.62 − 0.76 = −0.14
```

Each dog pick has −0.14 expected value but ±2 variance. To get a 50% chance of closing a 2-point gap, you need approximately 1 dog pick and favorable outcome probability of 31%.

The "n*" formula for minimum dog picks needed:
```
n* = N / (2 × p_dog × P(rival picks chalk))
```

For N=2, p_dog=0.31, P(rival picks chalk)=0.85:
```
n* = 2 / (2 × 0.31 × 0.85) = 2 / 0.527 ≈ 4 picks for ~50% shot at closing
```

This is expensive. The better strategy when trailing is to wait for a coin-flip game and pick the underdog once, rather than spraying multiple forced deviations.

### 7.3 Current Position Strategy

**Current state (after 8 games):** I am at **+3**, **−3 to the leader** (DasReboot +6; baseballpaul & scolban7 +4). Both entries identical at +3, T4 in a 10-way chalk pack. ~64 group games remaining; bracket not yet submitted.

**The −3 deficit does not require any group-stage action.** It is small against the 80-point bracket — one correct SF pick erases it. The field's leaders got ahead via group variance, but those group leads are equally fragile and will be reshuffled by the bracket. Chasing them with group deviations would lower our floor and burn the optionality we want at the bracket (§4.4.3).

**Action:**
1. **Both entries: pure chalk through the entire group stage.** Identical lines. Hold the floor.
2. **Submit a bracket before group stage ends** — priority #1; the unsubmitted bracket is the only thing that currently makes the pool unwinnable (MAX capped at 67).
3. **Split at the bracket (§6.4, §8):** Anchor chalk, Dagger with 1–2 targeted late-round upsets. That is where the −3 (and far more) is made up.

This supersedes the earlier "split now / Dagger group deviations" draft. With the bracket quantified at 80 points, concentrating all divergence there is strictly better than spending it in the groups.

---

## 8. Bracket Stage Strategy

Bracket game values: R32=+1, R16=+2, QF=+4, SF=+8, Final=+16

**Each round is worth 16 points** (16×1, 8×2, 4×4, 2×8, 1×16), for **80 points total — more than the 72-point group stage.** The pool is decided here. A correct Final pick (+16) outweighs 16 group games; one correct SF pick (+8) erases an 8-point group deficit. Whatever happens in the groups, the standings reset to near-irrelevance once the bracket scores.

**This is also where having no submitted bracket is fatal:** your MAX is capped at group-only until you enter one (§1). Submit before group stage closes.

This is where the 2-entry structure becomes powerful. With entries diverging at bracket:

**Entry 1: pure chalk bracket**
- Pick the favorite to advance at every stage
- Maximizes P(E1 has a strong bracket score)

**Entry 2: targeted bracket deviations**
- In 1–2 R16 or QF slots, pick the underdog where:
  - True odds are close (45–50% for underdog)
  - Crowd goes 80%+ on the favorite
  - A correct pick is worth 2–4 pts (R16/QF)
- One correct QF deviation (+4) = 4 group stage games of recovery

**Why bracket deviations > group deviations:**

A group dog deviation costs 0.14 pts EV to get a ±2 swing. A QF dog deviation costs ~0.5 pts EV but generates a ±8 swing. The leverage ratio (swing per EV cost) is much better for bracket games.

```
Group stage: ±2 swing / 0.14 EV cost = 14.3x leverage
QF bracket:  ±8 swing / 0.50 EV cost = 16.0x leverage
SF bracket:  ±16 swing / 0.8 EV cost = 20.0x leverage
```

Bracket deviations are more efficient than group deviations for creating gap vs rivals.

---

## 9. Calibration Log

### 9.1 Observed Pool Splits

| Game | True odds (W/D/L) | Observed split | Class | Notes |
|---|---|---|---|---|
| A1: Mexico vs S. Africa | 68/21/11 | 100/0/0 | A | 100% chalk confirmed |
| A2: S. Korea vs Czechia | 37/31/31 | 48/24/29 | D | Crowd biases toward ranked-better team even in 3-way split |
| B1: Canada vs Bosnia | 53/27/19 | 81/10/10 | B | Canadian pool effect: +6 pts above base model prediction |
| D1: USA vs Paraguay | 47/30/24 | 90/5/5 | C | "Home continent" effect — chalk overshoots class entirely |
| B2: Qatar vs Switzerland | 6/12/83 | 0/0/100 | A | Unanimous; game drew → everyone 0, zero separation |
| C1: Brazil vs Morocco | 58/25/16 | 86/10/5 | B | Global-brand effect; drew → draw-pickers +1 on field |
| C2: Haiti vs Scotland | 16/22/63 | 0/5/95 | A | Near-unanimous; chalk held |
| D2: Australia vs Turkey | 17/26/56 | 10/5/86 | B | **UPSET** — Australia won; the ~2 faders leapt the field +2 |

### 9.2 Crowd Model Calibration

| Class | Base prediction | Observed | Calibrated |
|---|---|---|---|
| A | 95%+ chalk | 100% / 100% / 95% (Mexico/Swiss/Scotland) | 95–100% |
| B | 75% chalk | 81% / 86% / 86% (Canada/Brazil/Turkey) | **~85% (higher than original 75%)** |
| C | 50% chalk | 90% (USA — home continent) | ~85–90% home-continent, ~55–65% otherwise |
| D | 40% chalk | 48% | ~45–50% |

**Key empirical findings:**
1. **The field is more chalk-heavy than first modeled** — Class B is clustering ~85%, not 75%. Per §4.4.1, that *raises* the payoff of a correct fade (more rivals to leapfrog), it does not lower it.
2. **Draw is under-bet AND over-performing.** Field allocates 0–10% to draw; actual draw rate is **37.5%** (3 of 8). Rivals under-bet draw because per-game EV is negative — but that creates the exact mispricing the Dagger exploits (§4.4.2): a heavy-favorite draw gains +1 on the whole field.

### 9.3 Results Log

| Game | My pick | Result | My pts | Standing change |
|---|---|---|---|---|
| A1: Mexico vs S. Africa | Mexico | Mexico 2–0 ✓ | +1 | Tied at top w/ all |
| A2: S. Korea vs Czechia | S. Korea | S. Korea 2–1 ✓ | +1 | +2, tied w/ ~9 others |
| B1: Canada vs Bosnia | Canada | 1–1 Draw | 0 | +2, −1 to acolben7 (acolben7 took the draw → +3) |
| D1: USA vs Paraguay | USA | USA 4–1 ✓ | +1 | +3, −1 to acolben7 (+4) |
| B2: Qatar vs Switzerland | Switzerland | 1–1 Draw | 0 | +3 (everyone 0) |
| C1: Brazil vs Morocco | Brazil | 1–1 Draw | 0 | +3 (draw-pickers gained) |
| C2: Haiti vs Scotland | Scotland | Scotland 1–0 ✓ | +1 | +3 |
| D2: Australia vs Turkey | Turkey | **Australia 2–0** ✗ | −1 | +3, **−2 to new leader** |

**Current standings (8 games, exact, Jun 14):** DasReboot **+6** (1st, runaway variance leader), baseballpaul **+4** (T2, ▲9 — caught the Australia upset), scolban7 **+4** (T2, Canada-draw catcher), then a 10-way chalk pack at **+3** including both my entries (T4). Bottom: three entries at −1 (losing deviations).

Record: 6/8 GTO picks scored (3 wins, 3 draws=0, 1 loss). **8/8 correct GTO process — and stuck in the back of the contender pack, −3 to the leader.** The top 3 (all the money) are deviation-catchers; the entire chalk pack is jammed at T4. The order-statistic problem (§4.4) made concrete, twice over.

**Bracket caveat (decoded from MAX column):** my MAX is 67 (= 3 + 64 remaining group games, **bracket = 0**) while bracketed rivals show MAX 140–150. The +3 deficit is trivial next to the 80-pt bracket; submitting a bracket is the binding constraint on winning (§1, §8).

---

## 10. Key Numbers Summary

```
τ (rival expected deviation vs chalk, group stage):   −9.5 pts
σ (rival score SD vs chalk):                           6.7 pts
P(at least one rival beats a chalk entry):             ~79%   (← prizes are the max, not the mean)
P(a chalk entry is outright max of 21):                ~21%
P(MY pure-chalk entry takes clean 1st):                low single digits (tie-split)

Objective:                                             max-order-statistic (top 2–3), NOT expected score
Strategy:                                              ONE chalk line through groups; BARBELL split at the BRACKET
Group stage:                                           both entries pure chalk, identical — no deviations
Why not deviate in groups:                             −EV + redundant variance (bracket dominates) + burns optionality (§4.4.3)
Empirical draw rate:                                   37.5% (3/8) vs field allocation 0–10% → exploit it IN THE BRACKET
Class B observed chalk concentration:                  ~85% (higher = correct fades pay MORE, §4.4.1)

Bracket leverage ratio:                                16–20x (vs ~14x for group) — variance belongs here

Group stage max:                                       72 pts  |  Bracket max: 80 pts (the larger half)
Current deficit to leader:                             −3 pts (DasReboot +6; me +3, T4) — trivial vs 80-pt bracket
My MAX:                                                67 (capped — bracket NOT submitted; rivals 140–150)
Priority #1:                                           SUBMIT A BRACKET before group stage ends, or cannot win
Recommended action:                                    both entries chalk every group game (incl. Netherlands Jun 14);
                                                       concentrate 100% of divergence in the bracket split
```

---

## 11. Decision Tree (Quick Reference)

```
GROUP STAGE — both entries, every game:
  └── Pick the higher outright win probability (chalk). Identical lines. Never deviate.
      (Hold the floor + preserve optionality for the bracket. §4.4.3)

BEFORE GROUP STAGE ENDS:
  └── Submit a bracket on BOTH entries — without it, MAX is capped and you cannot win.

BRACKET — split the two entries:
  └── Anchor: chalk every slot (favorite to advance)
  └── Dagger: chalk most slots; underdog in 1–2 QF/SF/Final slots where
              p_dog ≥ ~0.40 AND crowd 80%+ chalk (leverage 16–20x — this is
              where the draws/upsets we tracked all stage get exploited)
```
