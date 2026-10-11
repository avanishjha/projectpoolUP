# CONQR Explainer — Visual System Specification

> 120 s · 1920×1080 · 30 fps · 3,600 frames · rendered with Remotion from pure SVG.
> Every frame is a pure function of time: `frame(t) = Film(t)`. Nothing animates on its own.

This document is the blueprint for `apps/explainer`. Three of its tables are **machine-checked**
against the code (`test/spec-sync.test.ts`): the beat table (§4.2), the stage table (§4.4) and the
copy deck (§4.7). If you edit a number here, the test tells you which constant to change, and the
reverse. Everything else here describes intent and is enforced by the layout and motion tests (§8).

Product facts come from the canonical specs in `docs/*.docx`. Where the film states a number about
money, that number is **computed** by `src/data/settlement.ts` (LLD §3.1), not typed in.

---

## 1. Creative brief

| | |
|---|---|
| Audience | Fitness people who have made a gym pact with friends and watched it die. |
| Single-minded message | Your pact fails because nothing enforces it. CONQR enforces it: daily proof, automatic fines, a pot the finishers split. |
| Voice | English. Direct, a bit savage, never cruel. ("He missed. You just got richer.") No Hinglish (ruled out 2026-10-06). |
| Feel | Linear/Revolut restraint × Apple material depth. **Subtle and professional, never neon or gradient-AI.** |
| Arc | Chaos (State A) → mechanism (State B) → resolution (State C). |

### 1.1 Truth rules (non-negotiable)

1. **No outcome claims.** The specs' North Star numbers (`> 75%` daily check-in, `> 80%` completion)
   are *targets*, not measurements. The film never presents them as results.
2. The "Measured Impact" beat shows the **ledger of one illustrative pool**, labelled as illustrative
   on screen, with every figure derived from the payout formula in LLD §3.1.
3. Mechanics shown must match the build: camera-only check-in (F3.1), server clock authoritative
   (F3.3), shield → grace → fine cascade, exactly-once per member-day (F6.1), pot = SUM of the ledger
   (never an increment), and the default deadline `check_in_deadline_utc = 18`, which is **23:30 IST**.
4. No URLs, store badges or third-party logos (UPI is named in text only, never as a logo). The specs
   name no domain, so the CTA is a button, not a link.

---

## 2. Visual system

### 2.1 Palette

The brief's five colours are used exactly. Three derived tokens are added, each for a stated reason.

| Token | Value | Role | Source |
|---|---|---|---|
| `canvas` | `#0B0F19` | Page ground (Deep Obsidian Slate) | Brief |
| `primary` | `#6366F1` | Brand, active state, rails, CTA (Electric Indigo) | Brief |
| `accent` | `#10B981` | Success, money gained, "checked in" (Emerald Glow) | Brief |
| `ink` | `#F9FAFB` | Primary text (Crisp White) | Brief |
| `muted` | `#9CA3AF` | Secondary text (Cool Muted Gray), 7.2:1 on canvas | Brief |
| `danger` | `#E0626E` | Missed day, fine, error, Wall of Shame | **Derived.** The story needs a failure colour and the brief has none. Desaturated crimson in line with the app's `blood`. It differs from `accent` in lightness as well as hue, so red/green colour-blind viewers can still tell them apart. |
| `faint` | `#5B6474` | Decorative rules, inactive icons. **Never for content.** | Derived |
| elevation ladder | see 2.2 | Surfaces | Derived from `canvas` |

Glows are allowed only on `primary`, at ≤ 0.22 opacity and a 24–32 px blur. No gradient text and no
multi-hue gradients. The one ambient wash is a single `primary` radial at 0.10 opacity.

### 2.2 Elevation ladder (from the 2026-10-06 design audit)

| Step | Fill | Shadow | Use |
|---|---|---|---|
| 00 canvas | `#0B0F19` | none | Ground |
| 01 sunken | `#0F1421` | none | Wells, tracks, inputs, viewfinders |
| 02 card | `#141A28` | `0 8 24 rgba(0,0,0,.45)` | Silos, nodes, tiles, console |
| 03 hero | `#1A2132` | `0 16 40 rgba(0,0,0,.55)` | Pot card, phone screen hero, payout card |

Every raised surface has a 1 px border at `ink` 0.07 plus a **brighter top edge** at `ink` 0.14. This
reads as light catching the top of a real material.

### 2.3 Typography (locked: Space Grotesk display/money + Inter UI)

Tracking is size-specific (design audit §Typography). All sizes are on the 1080p canvas.

| Role | Face | Size / line | Tracking | Min on-screen | Use |
|---|---|---|---|---|---|
| `wordmark` | Space Grotesk 700 | 96 / 96 | −0.03em | — | Outro wordmark |
| `tagline` | Space Grotesk 600 | 84 / 88 | −0.03em | — | Outro line |
| `headline` | Space Grotesk 600 | 60 / 66 | −0.025em | 52 | Caption headline |
| `money` | Space Grotesk 600, `tnum` | 22–52 | −0.03em ≥ 40px, else −0.01em | 16 | Every ₹ value |
| `sub` | Inter 400 | 28 / 40 | 0 | 26 | Caption sub-line |
| `title` | Inter 600 | 17–22 | −0.012em | 15 | Card titles |
| `ui` | Inter 400/500 | 13–17 | 0 | 12 | Mock UI body |
| `eyebrow` | Inter 600, uppercase | 11–22 | +0.12em | 11 | Labels |
| `footnote` | Inter 400 | 22 / 30 | 0 | 22 | Illustrative-data disclosure |

Figures that change over time use `tabular-nums` so count-ups never jitter. Both faces carry `₹`
(verified with opentype). **Space Grotesk has no ✓ ▲ ▼ glyphs**, so state marks are always SVG
icons, never characters. Emoji are banned: their rendering depends on the host font stack, and a
Linux render box would show tofu.

### 2.4 Iconography

24×24 grid, 1.75 stroke, round caps and joins, drawn by hand in `src/ui/icons.ts`. Icons always
travel with text. State is never colour-only.

| Icon | Used by |
|---|---|
| `check` | Checked-in, debited, settled |
| `x` | Missed, declined, broken link |
| `alert` | Error chip, Wall of Shame |
| `clock` | Deadline, pending |
| `camera` | Check-in node, live card |
| `lock` | Camera-only chip, mandate |
| `users` | Pool node, group chat |
| `rupee` | Payment silo, fine node, pot |
| `flame` | Streaks |
| `shield` | Engine "Shield" row |
| `bolt` | Engine "Deadline reached" |
| `ledger` | Engine "Pot recomputed", chart |
| `chat` | Chat silo |
| `grid` | Spreadsheet silo |
| `dumbbell` | Pool identity |
| `arrow-up` | Pot delta |
| `chevron-left` | Phone header |
| `home` `compass` `wallet` `user` | Floating dock |
| `flag` | CONQR provisional mark |

### 2.5 Brand mark

The repo has **no CONQR logo yet** (`apps/mobile/assets/icon.png` is Expo's template icon). The film
uses a provisional mark: an indigo rounded square (radius 26%) with a white flag planted on a rising
line ("conquer"). It is one component, `ui/BrandMark.tsx`, so it can be swapped in one place.

---

## 3. Visual Asset Manifest

### 3.1 Atoms (`src/ui/`)

| Atom | Props (essentials) | Notes |
|---|---|---|
| `Surface` | `rect, tone, elevation, accentBar?, borderTone?` | Rounded-rect path + top-edge highlight + optional left accent bar. Geometry is continuous in every parameter, so it morphs. |
| `Label` | `x, y, role, size?, maxW, anchor?, tnum?, color?` | **`maxW` is required.** Emits `data-face/size/ls/max-w` for the text-fit harness. |
| `WordLine` | `x, y, text, at, stagger, …Label` | Per-word spring reveal inside one `<text>` via cumulative `dy` on `<tspan>`s. No DOM measurement needed. |
| `Icon` | `name, x, y, size, color` | Path lookup from `icons.ts`. |
| `Avatar` | `cx, cy, r, name, ring?: 'none'|'done'|'pending'|'shame'|'primary'` | Initials in Inter 600. Ring states carry dash patterns as well as colour. |
| `Chip` | `x, y, text, tone, icon?` | **Width is computed** from font metrics (`theme/measure.ts`). |
| `Ring` | `cx, cy, r, progress, color` | Progress ring with track. |
| `Money` | `value, x, y, size, anchor` | Formats INR with Indian grouping (`₹1,18,800`), `tnum`. |
| `BrandMark` | `x, y, size` | Provisional mark (2.5). |

### 3.2 Mock UIs: one actor, three states

Four persistent **actors** carry the story. Each keeps one surface for the whole film. The surface
morphs (geometry + tone) while the content inside cross-fades between state components. This is how
State A becomes State B becomes State C without a cut.

| Actor | State A: Chaos / Silo (0–20 s) | State B: Processing (20–80 s) | State C: Resolved (80–120 s) |
|---|---|---|---|
| **pact** | `ChatSilo`: a 6-person group chat. The pact on day 1, excuses by day 6, "Hello?" on day 14 with *Seen by 5* and a typing indicator that gives up. Unread badge climbs. | `PoolNode` (01): Morning Lift Club, a 2×2 rules grid (₹499 / ₹99 / 30 days / grace off), 8 avatars joining, ₹3,992 locked. *Exits at 50 s.* | `PoolTile`: "8 × ₹499", ₹3,992 in buy-ins. |
| **tracker** | `SheetSilo`: a "Fines tracker" spreadsheet. ✓ cells fill to day 4, then `?`, then blanks; the OWED column shows `#REF!`. "Last edited 9 days ago". | `CheckInNode` (02): viewfinder, shutter, 8/8 check badges, then day 3 at 7/8. → `LiveCheckIn` (deep dive): liveness prompt, capture, upload size, server timestamp. | `CheckInTile`: 228/240 with a 95% ring. |
| **money** | `PaySilo`: payment requests. Declined, Pending · 12d, Reminded ×4, one Paid. ₹500 of ₹2,500 collected. | `FineNode` (03): Rahul missed day 3 → fine ₹99 → UPI Autopay processing → debited → added to pot. → `DeadlineEngine` (deep dive): 8-row settlement log. | `FinesTile`: ₹1,188, 12 misses × ₹99, auto-debited. |
| **pot** | absent: nothing is at stake | `PotNode` (04): ₹3,992 → ₹4,091, composition bar, "finishers split it". → `PhoneDashboard` (deep dive): the full pool screen. | `PotTile`: net pot ₹4,921 → `PayoutScreen` (final phone): ₹647.50 paid out. |

### 3.3 Mock internals (component-local coordinates)

All internal layouts are authored in the component's own box (`w × h` from §4.4). Phone screens are
authored in **iOS points (390 × 836)** and scaled by `s = 412 / 390 = 1.0564`.

**ChatSilo 480×640.** Header 0–72 (group avatar, "Gym pact", "6 members", unread badge). Message
viewport 84–584, clipped and scrolled by a spring sum (§5.4). Composer 596–628. Bubbles: Inter 400
16/22, padding 12×10, radius 16, max width 320; others left on `sunken`, you right on `primary`
0.18. Day dividers are centred eyebrow pills.

**SheetSilo 520×460.** Header 0–64. Grid at x 20–500, y 80–380: NAME 120 | D1…D7 at 40 each | OWED 80.
Header row 36, six data rows of 44. Footer 412–448 ("3 comments · unresolved").

**PaySilo 480×560.** Header 0–72. Four request rows (sunken, h 76, gap 12) from y 88. Footer 460–540:
"Collected", ₹500 of ₹2,500, 20% bar.

**Nodes 360×540** (`NodeHeader` 0–72: index pill, title, icon). Content 84–470. Footer 488–516.

**LiveCheckIn 460×600.** Header 0–80. Viewfinder 24,92 412×380 (barbell scene, corner brackets,
liveness chip, server timestamp overlay). Shutter row 488–560. Status line baseline 584.

**DeadlineEngine 704×600.** Header 0–88 (title, sub, status chip Idle → Running → Settled). Rows from
y 112, eight rows of 56: icon x 32, label x 64 (Inter 600 17), value right-aligned at x 672.
Footer baseline 586: "Exactly once per member, per day."

**PhoneDashboard 390×836 pt.** Status bar 0–44 · header 52–100 · pot hero card 16,112 358×150
(eyebrow, countdown chip, ₹ value 46pt, delta line) · section label 278 · 8 leaderboard rows of 46
from 302 · latest-event card 16,682 358×80 · floating dock 230×54 centred at 774. Bottom 828 ≤ 836.

**Tiles 402×220.** Eyebrow baseline 44 · value 52px baseline 120 · sub baseline 160 · optional right
visual (ring r 36).

**PayoutScreen 390×836 pt.** Status · header · success mark r 36 at y 170 · "Pool complete" · payout
hero card 16,300 358×196 · breakdown card 16,512 358×168 · CTA 16,704 358×52.

### 3.4 Scene-level elements

| Element | Plane | Description |
|---|---|---|
| `Background` | bg (camera depth 1.0) | Canvas fill, 32 px dot grid at 0.05, one `primary` radial wash at 0.10. The grid scales with the camera; that scaling sells the push-ins. |
| `Links` | world (depth 0.03) | Connectors between actor anchor points. State A: dashed, `danger`, snapped in the middle with an `x` marker. State B: solid `primary` rails with travelling pulses and micro-labels (`daily`, `miss`, `₹99`). |
| `Captions` | HUD (depth 0) | Eyebrow + headline + sub. Regions `top` and `left` (§6.3). |
| `LedgerChart` | world | Put-in vs paid-out per member. Stacked buy-in/fine bars, paid-out bar, dashed ₹499 reference line, signed deltas. |
| `Footnote` | HUD | Illustrative-data disclosure, 80–100 s. |
| `Outro` | HUD | Brand mark, wordmark, tagline, sub, CTA button with a single sheen pass. |
| `Phone` | world | Device body (radius 68, `#06080D`), 10 px bezel, dynamic island, screen clip. Rendered by the **pot** actor's surface when its tone is `device`. |

---

## 4. State Machine Blueprint

### 4.1 Global states

```
        t=0          t=20                 t=50           t=80              t=100        t=120
  ──●──────────●─────────────────────●──────────────●─────────────────●────────────●──
   S0 ─fade─▶ A ──silo-collapse──▶ B ──push-in──▶ B′ ──pull-back──▶ C ──converge──▶ C′ (hold)
          (1.2s)      (2.4s)              (3.0s)         (2.6s)            (3.0s)
```

| From → To | Trigger (t) | Duration | Interpolator | What morphs |
|---|---|---|---|---|
| S0 → A | 0.0 | 1.2 s | smootherstep | Canvas, wash, grid fade up |
| A → B | 20.0 | 2.4 s | smootherstep (C²) | 3 silos → 3 nodes: rotation to 0, rect, tone (danger edge → neutral). Content cross-fade 20.4–21.8. Links broken → solid 22.4–23.4. |
| B → B′ | 50.0 | 3.0 s | smootherstep + camera push | pot node → phone; money node → engine; tracker node → live card; pact exits. Background zoom 1.0 → 1.8. |
| B′ → C | 80.0 | 2.6 s | smootherstep + camera pull | Phone/engine/live → tiles; pact returns as tile 1. Background zoom 1.8 → 1.0. |
| C → C′ | 100.0 | 3.0 s | smootherstep | Pot tile → final phone; tiles 1–3 and chart exit; brand block enters. |
| C′ hold | 118.0 | — | — | Ambient amplitude reaches 0. The last 2 s are a static poster frame. |

### 4.2 Beats `sync`

<!-- beats:begin -->
| id | start | end | state | name |
|---|---|---|---|---|
| friction | 0 | 20 | A | The Friction |
| solution | 20 | 50 | B | The Structural Solution |
| deep-dive | 50 | 80 | B | Deep Dive |
| impact | 80 | 100 | C | Measured Impact |
| resolution | 100 | 120 | C | Resolution & CTA |
<!-- beats:end -->

### 4.3 Actor phase matrix

Each cell is the content component on screen and its window. Cross-fades last 0.8 s, centred on the
boundary; the outgoing content finishes fading before the incoming content reaches 50%.

| Actor | 0–20 | 20–50 | 50–80 | 80–100 | 100–120 |
|---|---|---|---|---|---|
| pact | ChatSilo (in 0.9) | PoolNode | — (out 50.0–50.8) | PoolTile (in 81.6) | — (out 100.0–100.7) |
| tracker | SheetSilo (in 6.4) | CheckInNode | LiveCheckIn | CheckInTile | — (out 100.1–100.8) |
| money | PaySilo (in 11.0) | FineNode | DeadlineEngine | FinesTile | — (out 100.2–100.9) |
| pot | — | PotNode (in 22.2) | PhoneDashboard | PotTile | PayoutScreen |

### 4.4 Stage (settled geometry, screen px) `sync`

`rot` is in degrees about the rect centre. A settled rect is where an actor rests between morphs.

<!-- stage:begin -->
| key | x | y | w | h | r | rot |
|---|---|---|---|---|---|---|
| A0.pact | 720 | 335 | 480 | 640 | 28 | -1.5 |
| A.pact | 140 | 335 | 480 | 640 | 28 | -2.5 |
| A.tracker | 700 | 370 | 520 | 460 | 24 | 1.8 |
| A.money | 1300 | 360 | 480 | 560 | 28 | -1.6 |
| B.pact | 96 | 360 | 360 | 540 | 28 | 0 |
| B.tracker | 552 | 360 | 360 | 540 | 28 | 0 |
| B.money | 1008 | 360 | 360 | 540 | 28 | 0 |
| B.pot | 1464 | 360 | 360 | 540 | 28 | 0 |
| D.tracker | 96 | 380 | 460 | 600 | 28 | 0 |
| D.money | 588 | 380 | 704 | 600 | 28 | 0 |
| D.pot | 1340 | 88 | 432 | 904 | 68 | 0 |
| C.pact | 96 | 300 | 402 | 220 | 24 | 0 |
| C.tracker | 538 | 300 | 402 | 220 | 24 | 0 |
| C.money | 980 | 300 | 402 | 220 | 24 | 0 |
| C.pot | 1422 | 300 | 402 | 220 | 24 | 0 |
| C.chart | 96 | 560 | 1728 | 376 | 24 | 0 |
| E.pot | 1300 | 88 | 432 | 904 | 68 | 0 |
| E.brand | 96 | 338 | 1000 | 404 | 0 | 0 |
<!-- stage:end -->

(`A0` = the chat's opening position, `D` = deep dive B′, `E` = end state C′.)

### 4.5 Camera

The camera has `{zoom, panX, panY}` keyframes. Each plane applies them with a **depth** factor:
`zoom_l = 1 + (zoom − 1)·depth`. Background depth 1.0, world 0.03, HUD 0. Large camera moves are
felt through the background while the foreground stays inside the safe area.

| t | zoom | note |
|---|---|---|
| 0 → 20 | 1.00 → 1.08 | Slow push, tension |
| 20 → 22.4 | 1.08 → 1.00 | Order restored |
| 50 → 53 | 1.00 → 1.80 | Push into the pot |
| 80 → 82.6 | 1.80 → 1.00 | Pull back to the ledger |
| 100 → 118 | 1.00 → 1.03 | Final drift, then still |

Ambient drift: `panX = 6·sin(2πt/11)·a(t)`, `panY = 4·sin(2πt/13 + 1)·a(t)`, where `a(t)` ramps
1 → 0 over 116–118 s.

### 4.6 Cue sheet (key events; the full list is in `src/timeline/cues.ts`)

| t (s) | Event |
|---|---|
| 0.9 | Chat silo springs in, centred (`A0.pact`) |
| 5.6–6.8 | Chat glides left to `A.pact`, making room |
| 1.6–5.6 | Day 1 pact → day 6 excuses |
| 6.4 | Sheet silo in; columns fill 7.0–8.5; `#REF!` 9.0 |
| 11.0 | Payment silo in; rows 11.6–12.8; collected 13.4 |
| 14.0–17.0 | Day 14: "Hello?", *Seen by 5*, typing indicator gives up |
| 15.8–17.0 | Links draw, then snap; chaos ramps 15–19 |
| 20.0 | **A → B** silo collapse |
| 22.2 | Pot node in · 22.4 rails solidify |
| 24.8–27.6 | 8 members join, ₹3,992 locks |
| 29.4 / 35.4 / 41.0 | Pulses on rails 1 / 2 / 3 |
| 31.6 | Shutter · 32.2–34.6 eight check badges · 35.0 day 3, 7/8 |
| 37.4 / 38.4 / 39.4 | Fine ₹99 / Autopay processing / debited |
| 41.8 | Pot ₹3,992 → ₹4,091 |
| 50.0 | **B → B′** push-in |
| 54.6 / 54.8 / 55.2 / 56.4 | Shutter / flash / upload 412 KB / checked in 23:13:04 |
| 56.6 | Ishaan's row flips ✓ (7/8) |
| 56.8–58.2 | Story clock fast-forwards 23:13 → 23:29 |
| 58.4–66.0 | Final minute; other rows dim, Kabir spotlit |
| 66.4–70.6 | Engine rows 1–8 (0.6 s apart) |
| 69.4 | Kabir row → "Missed · −₹99", shame ring (with engine row 6, *Fine*) |
| 70.8 | Pot ₹5,081 → ₹5,180 (after engine row 8, *Pot recomputed*) |
| 72.4 | Leaderboard re-sorts (Kabir 6th → 8th), streaks roll |
| 74.0 | Feed card → Wall of Shame |
| 80.0 | **B′ → C** pull-back |
| 82.0–86.0 | Tile count-ups |
| 84.0 / 85.4–90.0 | Chart in / bars grow |
| 100.0 | **C → C′** converge |
| 101.0–104.2 | Brand block (mark 101.0, wordmark 101.2, tagline 101.8, sub 103.4, CTA 104.2) |
| 102.6–105.6 | Payout counts to ₹647.50 (102.6–104.6); delta 104.8; settled 105.6 |
| 112.0 | CTA sheen |
| 118.0 | Poster frame |

### 4.7 Copy deck `sync`

Headline line breaks are explicit (`/`). No caption window overlaps another in the same region.

<!-- copy:begin -->
| id | in | out | region | eyebrow | headline | sub |
|---|---|---|---|---|---|---|
| c1 | 0.6 | 6 | top | DAY 1 | Every fitness pact starts in a group chat. | ₹500 fine if you skip. Everyone's in. |
| c2 | 6.4 | 11 | top | DAY 6 | Nobody tracks it. | The spreadsheet died on day four. |
| c3 | 11.4 | 15.4 | top | DAY 11 | Nobody pays up. | Four reminders. One payment. |
| c4 | 15.8 | 19.8 | top | DAY 14 | So nobody shows up. | Two of six still going. For now. |
| c5 | 20.4 | 24 | top | CONQR | CONQR puts the pact on rails. | Same friends. Same goal. Now it enforces itself. |
| c6 | 24.4 | 30 | top | 01 · POOL UP | Friends, one challenge, real money in. | 8 friends. ₹499 each. 30 days of Morning Lift. |
| c7 | 30.4 | 36 | top | 02 · CHECK IN | One live photo a day. Camera only. | No gallery uploads. No recycled gym selfies. |
| c8 | 36.4 | 42 | top | 03 · MISS = FINE | Miss the deadline and it's settled. | ₹99, auto-debited through UPI Autopay. Nobody chases anybody. |
| c9 | 42.4 | 49.6 | top | 04 · THE POT | Every fine lands in the pot. | At day 30, the people who showed up split it. |
| c10 | 50.8 | 57.8 | left | DAY 24 · 23:12 IST | Check-ins land live. | Camera only. Timestamped by the server, not the phone. |
| c11 | 58.2 | 65.8 | left | 23:29 IST | Seven of eight are in. | Kabir has one minute. |
| c12 | 66.2 | 73.6 | left | 23:30 IST · DEADLINE | The deadline engine runs. | Shields and grace days first. Then the fine. |
| c13 | 74 | 79.6 | left | WALL OF SHAME | He missed. / You just got richer. | ₹99 just landed in the pot. |
| c14 | 80.6 | 90.4 | top | DAY 30 · THE LEDGER CLOSES | Thirty days. Every rupee accounted for. | 228 check-ins. 12 misses. Zero IOUs. |
| c15 | 90.8 | 99.6 | top | THE PAYOUT | The ones who showed up got paid. | By the ones who didn't. |
<!-- copy:end -->

Outro (HUD, 101.0 → end): wordmark **CONQR** · tagline **Show up. Or pay up.** · sub *Start a pool
with your gym crew.* · button **Start a pool**.

Footnote (80.6–100.0, two lines, region x 96, y 962–1022):
*Illustrative pool: 8 members, ₹499 buy-in, ₹99 per miss, 30 days, grace days off.* /
*Payout per CONQR spec: net pot = gross pot − 5% platform fee, split by check-ins made.*

### 4.8 Story clock (deep dive)

The phone's status bar and countdown read a story clock `c(t)` (seconds after 23:00 IST). It is
monotonic and continuous:

| t | c(t) | |
|---|---|---|
| 50.0 → 56.8 | 23:12:30 → 23:13:10.8 | ×6 real time |
| 56.8 → 58.2 | 23:13:10.8 → 23:29:00 | smootherstep fast-forward; lands as caption c11 ("23:29 IST") enters |
| 58.2 → 66.0 | 23:29:00 → 23:30:00 | ×7.7, lands on the deadline exactly at 66.0 |
| 66.0 → 80.0 | 23:30:00 → 23:30:14 | real time |

Displayed timestamps are read from `c(t)` at their cue (the live card's capture stamp is
`c(54.6)`), so the clock, the countdown and the stamps can never disagree.

---

## 5. Motion system (`src/motion/`)

Every animated property is `p(t) = f(t − t₀)` with `f` in closed form. There are no integrators, no
per-frame state and no randomness: frame 1,234 renders identically on every machine and in any
order. That is what makes Remotion's parallel rendering correct.

### 5.1 Interpolators

| Function | Formula | Continuity | Use |
|---|---|---|---|
| `smoothstep` | `3u² − 2u³` | C¹ | Fades |
| `smootherstep` | `6u⁵ − 15u⁴ + 10u³` | **C²** | All geometry morphs: zero velocity *and* acceleration at both ends, so chained morphs never kink |
| `easeOutCubic` | `1 − (1 − u)³` | C¹ inside | Exits |
| `easeInOutSine` | `−(cos πu − 1)/2` | C^∞ | Ambient loops |

### 5.2 Spring (closed-form damped oscillator)

Parameterised Apple-style by damping ratio ζ and response R (period, seconds). `ω₀ = 2π/R`. Step
response from 0 → 1 with zero initial velocity:

- ζ < 1: `x(t) = 1 − e^(−ζω₀t)·(cos ω_d t + (ζω₀/ω_d)·sin ω_d t)`, where `ω_d = ω₀√(1−ζ²)`
- ζ = 1: `x(t) = 1 − e^(−ω₀t)·(1 + ω₀t)`
- ζ > 1: `x(t) = 1 − e^(−ζω₀t)·(cosh ω_h t + (ζω₀/ω_h)·sinh ω_h t)`, where `ω_h = ω₀√(ζ²−1)`

Settle time (|x − 1| < ε) is solved analytically from the envelope. When a spring drives a bounded
keyframe segment of length D, it is endpoint-corrected:
`s*(u) = x(uD) + (1 − x(D))·smootherstep(u)`. This hits 1 exactly at u = 1 with C² ends. Tests
assert D ≥ settle(1e-3) for every spring segment, so the correction stays below 0.1%.

| Preset | ζ | R | Use |
|---|---|---|---|
| `ui` | 1.0 | 0.45 | Chips, rows, counters: no overshoot |
| `enter` | 0.82 | 0.60 | Actor and card entrances |
| `word` | 0.90 | 0.50 | Caption word reveal |
| `snap` | 0.70 | 0.35 | Shutter, check badges: one small overshoot |

### 5.3 Morph contract

An actor's state is `{x, y, w, h, r, rot, opacity, tone}`. Numeric fields interpolate component-wise;
`tone` (fill, border, accent) interpolates in **OKLab**, so mid-points never go muddy or grey.
Content is authored at its phase's native size and **scaled uniformly to fit, never enlarged** (`min(1, w/W, h/H)`), centred in the live rect and
clipped to the surface. A morph therefore never reflows text: outgoing content shrinks and fades,
incoming content appears at its final size while the surface closes around it.

### 5.4 Derived continuous motion

- **Count-ups:** `v(t) = a + (b − a)·spring_ui(t − t₀)`, formatted with `tnum`.
- **Chat scroll:** `offset(t) = Σ_k Δ_k·spring_ui(t − t_k)`, where message *k* adds overflow Δ_k at t_k.
  It is a sum of continuous functions, so the scroll is continuous even as messages stack.
- **Chaos jitter (State A):** `j(t) = c(t)·Σ_i a_i·sin(f_i t + φ_i)` with incommensurate f_i (0.43,
  0.71, 1.13 Hz: unease, not vibration) and `c(t)` ramping 0 → 1 over 15–19 s, then to 0 by 21.4 s. Maximum ±2 px, ±0.4°.
- **Pulses:** position along a rail is `smootherstep((t − t₀)/0.8)`. The trail is 3 circles at −0.04
  and −0.08 lag with decaying opacity.
- **Rank re-sort:** row y = `lerp(y_old, y_new, smootherstep)` over 1.0 s.

---

## 6. Content Layout Rules

### 6.1 Frame

| | |
|---|---|
| Canvas | 1920 × 1080, one SVG `viewBox="0 0 1920 1080"` |
| Title-safe (authoring bounds) | x 96–1824, y 54–1026 (5%) |
| Action-safe (hard limit after camera) | x 67–1853, y 38–1042 (3.5%) |
| Grid | 12 columns of 122 px, 24 px gutters, starting x 96 |
| Spacing scale | 4, 8, 12, 16, 24, 32, 48, 64, 96 |

**Scale invariance.** The whole film is a single `viewBox`. Rendering at 720p, 1080p or 4K
(`--scale`) is a uniform transform: nothing reflows, so a layout that passes at 1920×1080 passes at
every scale. Preview containers of another aspect ratio letterbox (`xMidYMid meet`); they never crop.

### 6.2 Planes and z-order (back → front)

`bg` (canvas, grid, wash) → `links` → `chart` → `actors` (pact, tracker, money, pot) → `HUD`
(captions, footnote, outro). HUD never moves with the camera.

### 6.3 Caption regions

| Region | Origin | Max width | Used in |
|---|---|---|---|
| `top` | 96, 96 | 1728 | Beats 1, 2, 4 |
| `left` | 96, 104 | 1196 | Beat 3 (phone on the right) |

Block = eyebrow (22/28) + 12 + headline lines (60/66 each) + 14 + sub (28/40). One-line block = 160
px. Two-line block = 226 px. Captions enter word by word (`word` spring, 45 ms stagger, 0.35·size
rise) and exit over 0.35 s (fade + 12 px lift). Exit always finishes before the next caption in
the same region starts.

### 6.4 Hard rules (all tested)

1. **Containment:** every settled element (opacity ≥ 0.98, outside a morph window) lies inside
   title-safe at camera identity and inside action-safe with the camera applied. Rotated rects are
   tested by their rotated bounding box.
2. **No overlap:** settled actors in the same plane keep ≥ 24 px clearance from each other and from
   the active caption block.
3. **Text fits:** every `<text>` carries `data-max-w`. Its width, measured from the real TTF advance
   tables (Inter / Space Grotesk, tracking included, tabular digits at the face's real GSUB `tnum` advance),
   must be ≤ `max-w`. Line breaks are authored, never automatic.
4. **Glyph coverage:** every character in every rendered string exists in the face it is set in. No
   emoji, no fallback fonts.
5. **Minimum sizes:** on-screen size (`font-size × content scale`) ≥ the role minimum in §2.3.
6. **Intentional clips only:** content may be clipped by exactly three masks: an actor's own surface,
   the chat message viewport, and the phone screen. Nothing is clipped by the frame.
7. **State is never colour-only:** every success/failure carries an icon and a word.
8. **Contrast:** content text ≥ 4.5:1 against its surface. `faint` is decoration only.

---

## 7. Data integrity: the illustrative pool

One pool, numbers fixed in `src/data/pool.ts`. Everything downstream is computed.

| | |
|---|---|
| Pool | Morning Lift Club · 8 members · ₹499 buy-in · ₹99 per miss · 30 days · grace days 0 · payout rule `proportional` · platform fee 5% |
| Misses (by day) | Sneha 6, 9 · Rahul 3, 12, 20 · Arjun 4, 11, 17 · Kabir 5, 8, 14, **24** · You, Priya, Meera, Ishaan: none |
| Day-24 leaderboard (pre-deadline, streaks as of day-23 CRON) | You/Priya/Meera/Ishaan 23 · Sneha 14 · Kabir 9 · Arjun 6 · Rahul 3 |
| Day-24 after CRON | 24 ×4 · Sneha 15 · Arjun 7 · Rahul 4 · Kabir 0 |
| Pot on day 24 | ₹3,992 + 11 × ₹99 = ₹5,081 → Kabir's miss → **₹5,180** |
| Gross pot, day 30 | ₹3,992 buy-ins + 12 × ₹99 = **₹5,180** |
| Platform fee 5% | **₹259.00** (above the ₹50 minimum) |
| Net pot | **₹4,921.00** |
| Check-ins | 228 of 240 (95%) |
| Proportional share | `compliance_i / Σ compliance × net_pot` (LLD §3.1) |
| Each 30/30 finisher | 30/228 × 4,921 = **₹647.50** (+₹148.50 on ₹499) |
| Sneha 28 · Arjun/Rahul 27 · Kabir 26 | ₹604.33 · ₹582.75 · ₹561.17 |

Paise rounding: floor each share to the paisa, then hand out the leftover paise by largest
remainder, so payouts sum to the net pot **exactly**. Kabir gets the one spare paisa (₹561.17).
Tested.

GST is not shown. LLD §3.1 computes `gst = fee × 0.18` but subtracts only the fee from the pot, so
whether GST sits inside or on top of the 5% is unresolved in the spec (§9).

---

## 8. Verification

| Layer | Command | Proves |
|---|---|---|
| Types | `pnpm --filter @conqr/explainer typecheck` | strict TS |
| Lint | `pnpm lint` (root) | repo rules |
| Motion | `test/motion.test.ts` | Easing endpoints and C² ends, spring closed forms vs a numerical ODE solution, settle-time bound, keyframe continuity, OKLab round-trip |
| Money | `test/settlement.test.ts` | Every ₹ figure in §7 recomputed from the LLD formula; payouts sum to the paisa |
| Timeline | `test/timeline.test.ts` | Beats contiguous over 0–120; captions don't collide; story clock monotonic; spring segments long enough to settle |
| Spec sync | `test/spec-sync.test.ts` | §4.2, §4.4, §4.7 equal the code |
| Layout | `test/layout.test.ts` | §6.4 rules 1–2, sampled every 1/30 s across all 3,600 frames |
| Text | `test/text.test.ts` | §6.4 rules 3–5 on server-rendered SVG of the real components at every 0.5 s |
| Visual | `pnpm --filter @conqr/explainer stills` | PNG at each state's settled frame, reviewed by eye |
| Film | `pnpm --filter @conqr/explainer render` | 3,600-frame H.264 MP4 |

---

## 9. Deviations and open questions

1. **Palette vs the app.** The brief's indigo/emerald differs from the shipping app's ember/brass/sage
   theme (`apps/mobile/src/ui/theme/themes.ts`). The phone mock in this film therefore will not match
   real screenshots. All colour lives in `src/theme/tokens.ts`; switching the film to the app palette
   is a one-file change.
2. **`danger`** is an addition to the brief's palette (§2.1).
3. **Brand mark** is provisional; the repo has no logo (§2.5).
4. **GST presentation** is ambiguous in LLD §3.1; the film omits it rather than guess.
5. **Engine depiction.** In the build today the CRON writes the fine as `pending` and a separate
   Razorpay worker (F5.4, not yet built) charges it. The film shows both steps as rows 6 and 7. That
   is the specified behaviour, not something you can run yet.
