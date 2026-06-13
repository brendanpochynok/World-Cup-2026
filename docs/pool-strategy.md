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
| Group stage games | 72 (12 groups × 6 games) |
| Bracket games | 31 (R32 through Final) |
| My entries | 2 (running identical through group stage; split at bracket) |

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

**Conclusion: Draw deviations are never correct. Dog deviations in Class D are the only deviation with manageable cost.**

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

Independence assumption understates this because rivals' errors are correlated (they all deviate similarly on the same games). A more realistic estimate accounting for correlation (ρ ≈ 0.5 between rivals):

```
P(chalk wins 1st) ≈ 50–55%
```

This matches the original pre-tournament estimate.

### 6.2 Two-Entry EV Table (Revised)

With 19 rivals (pot grows with each entry):

| Entries | Pot | 1st prize | P(≥1 wins 1st) | E[gross] | Cost | E[net] | Marginal E[net] |
|---|---|---|---|---|---|---|---|
| 1 | $200 | $150 | ~52% | ~$93 | $10 | **~$83** | $83 |
| 2 | $210 | $157.50 | ~78% | ~$136 | $20 | **~$116** | $33 |
| 3 | $220 | $165 | ~85% | ~$152 | $30 | **~$122** | $6 |

Notes on the 2-entry calculation:
- Entry 1 = pure chalk (maximizes P(E1 wins))
- Entry 2 = same as Entry 1 for group stage; differentiated at bracket
- P(at least one entry wins) ≈ 1 − P(neither wins) ≈ 1 − (0.48)² = 0.77 if entries are independent

However, since both entries are currently identical (group stage), P(≥1 wins) = P(either entry wins) ≈ P(chalk wins 1st) ≈ 52%. No benefit from running two identical entries until they diverge at bracket.

**Key: the 2-entry advantage only materializes when the entries are differentiated.** Bracket picks are where this happens.

### 6.3 Entry 3 Assessment

Marginal E[net] ≈ $6 on a $10 cost. Below break-even.

**Recommendation: 2 entries is correct for this pool size. 3rd entry is negative EV.**

---

## 7. Group Stage Pick Strategy

### 7.1 The Rule

**Every game: pick the team with the higher outright win probability per Polymarket at lock.**

This is not just a heuristic — it is mathematically optimal for both absolute EV and for pool-relative position when you are near the lead.

### 7.2 When Deviation Is Rational

Deviation from chalk is only rational when:

1. **You are trailing by N ≥ 2 points** with few games remaining, AND
2. **The game is near-even** (p_dog ≥ 40%), AND
3. **The crowd concentrates heavily on chalk** (meaning your rival likely picks chalk)

The mechanism: a dog win gives you +2 vs a chalk-picking rival. A fav win gives −2. Draw gives 0. For a trailing player, variance is your friend — you need the ±2 swings to close the gap.

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

**Current state:** +2 pts, −1 to leader (acolben7 at +3). 68 group games remaining.

The gap of 1 point resolves naturally. With 68 games left, acolben7 will have bad games. Required action: stay chalk. Any forced deviation now has negative EV without the trailing justification.

**P(gap closes naturally without any deviation):**

acolben7 needs to score 2 points worse than you on a decisive game where he picks one side and you pick the other. If both pick chalk (same teams), gap never closes.

If acolben7 occasionally picks non-chalk (as he did with the Canada Draw): he will lose ground to pure chalk. Expected: his deviation costs him ~0.5 pts per game relative to you.

Over 68 remaining games: **E[acolben7 falls back below you] is high. Stay chalk and collect.**

---

## 8. Bracket Stage Strategy

Bracket game values: R32=+1, R16=+2, QF=+4, SF=+8, Final=+16

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
| D1: USA vs Paraguay | 47/30/24 | TBD | C | — |

### 9.2 Crowd Model Calibration

| Class | Base prediction | Observed | Calibrated |
|---|---|---|---|
| A | 95%+ chalk | 100% | 100% |
| B | 75% chalk | 81% (Canada game) | ~80–85%, higher for Canada |
| C | 50% chalk | TBD | ~55–65% (est.) |
| D | 40% chalk | 48% | ~45–50% |

**Key empirical finding:** Draw is systematically under-bet in ALL classes. This is consistent with the scoring rule — rational pool players should under-bet draw (negative EV), and the crowd intuitively does so even without knowing the math.

### 9.3 Results Log

| Game | My pick | Result | My pts | Standing change |
|---|---|---|---|---|
| A1: Mexico vs S. Africa | Mexico | Mexico 2–0 ✓ | +1 | Tied at top w/ all |
| A2: S. Korea vs Czechia | S. Korea | S. Korea 2–1 ✓ | +1 | +2, tied w/ ~9 others |
| B1: Canada vs Bosnia | Canada | 1–1 Draw | 0 | +2, −1 to acolben7 |
| D1: USA vs Paraguay | USA | TBD | — | — |

**Current standings:** acolben7 +3 (1st), poch ×2 at +2 (T2), ~8 others at +2, vboeber +1, ~10 at 0.

---

## 10. Key Numbers Summary

```
τ (rival expected deviation vs chalk, group stage):   −9.5 pts
σ (rival score SD vs chalk):                           6.7 pts
P(chalk beats single rival):                           ~92%
P(chalk wins 1st, 19 rivals):                          ~52%
P(2 differentiated entries cover 1st, 19 rivals):      ~78%

Cost of dog deviation (Class D):                       −0.14 pts/game
Cost of draw deviation (Class D):                      −0.45 pts/game
Draw deviation vs chalk relative EV:                   always negative
Dog deviation threshold:                               p_dog > p_chalk (never in practice)

Deviation justified only when:                         trailing ≥2 pts, near-even game, few games left
Bracket leverage ratio:                                14–20x (vs 14x for group)

Current deficit to leader:                             −1 pt
Recommended action:                                    chalk everything, wait for leader errors
```

---

## 11. Decision Tree (Quick Reference)

```
Each game:
  └── Who has higher outright win probability? → pick that team
      └── Is it a draw? → always 0 pts, no penalty, not picked
      └── Are we trailing by 2+ pts with <20 games left?
          └── Yes: find nearest-to-even decisive game, pick dog
          └── No: chalk

Bracket:
  └── Entry 1: chalk every slot
  └── Entry 2: chalk most slots; pick dog in 1-2 QF/SF slots where:
              p_dog ≥ 0.40 AND crowd goes 80%+ chalk AND we need variance
```
