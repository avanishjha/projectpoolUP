# CONQR — Design Audit & Direction

**Date:** 2026-10-06 · **Scope:** the shipped UI through F4 · **Mockups:** Design canvas (link in chat)

Basis: the sign-in screen was captured live in the browser preview; the remaining findings come
from the theme tokens, the component source, and screen content captured during F3/F4 E2E runs.
Where a finding is a measurement (contrast ratios, luminance deltas) the number is computed from
the tokens in `apps/mobile/src/ui/theme/themes.ts`, not estimated by eye.

The typography and the overall restraint are working. Nothing here asks to restyle the app —
the direction Avanish approved at F0.6 is correct. These are the specific places where the
execution is under-delivering on that direction.

---

## The five findings that matter

### 1. Cards do not separate from the canvas — the single biggest issue

Dark theme sets `cardShadow: {}` with the comment *"dark depth comes from luminous layering,
not shadows."* The intent is right, but the layering is too faint to do the job alone:

| | Value | Effective |
|---|---|---|
| canvas | `#0C0C10` | — |
| `glassSurface` | `rgba(255,255,255,0.045)` | ≈ `#17171B` |
| delta | | **~4% luminance** |

A 4% step is below the threshold at which a surface reads as a separate plane, especially on
phone screens at outdoor brightness. Everything — pool cards, feed cards, rules grid, event
cards — sits on that one step, so the whole UI reads as a single flat sheet with lines on it.
This is almost certainly what Avanish was describing at F0.6 as *"no component has proper depth."*
That feedback was partly addressed with borders, but the fill never changed.

Light theme has the same problem inverted: `#FFFFFF` cards on an `#F1F0EC` canvas is a ~6%
delta with no shadow and `glassSheen` set to fully transparent.

**Fix — a real four-step elevation ladder:**

| Step | Dark | Use |
|---|---|---|
| 00 canvas | `#0A0B0F` | page ground |
| 01 sunken | `#12141A` | inputs, progress tracks, segmented control well |
| 02 card | `#16181F` + `0 6px 18px rgba(0,0,0,0.45)` | pool cards, feed items |
| 03 hero | `#1C1F28` + `0 14px 34px rgba(0,0,0,0.6)` | pot, dock, sheets, modals |

Two rules that come with it:
- **Keep shadows on dark.** A shadow you cannot consciously see still separates the card from
  the canvas. Removing it entirely was an over-correction.
- **Brighten the top border only** (`border-top-color` ~2× the other sides). That reads as light
  catching the top edge of a real material, and it is most of what makes Apple's surfaces feel
  physical. Cheap to implement, disproportionate payoff.

### 2. `textMuted` fails accessibility, and it is used for real content

`rgba(228,228,240,0.38)` on `#0C0C10` computes to **≈2.4:1** — below the WCAG AA floor of 4.5:1
for body text. It is currently used for timestamps, helper copy, captions and empty-state
sub-copy: information, not decoration.

`textSecondary` at 60% lands at ≈5.3:1, which passes but is tight once it sits on a *card*
rather than the canvas.

**Fix:** muted → 52%, secondary → 68%. Keep 38% strictly for dividers, inactive icons and
decorative rules. This is the one finding I would not ship without.

### 3. The pot is the product's hero and is styled like a stat

CONQR's whole premise is money on the line, but `₹2,095` currently renders at body-adjacent
size in a row of equal-weight stats. Nothing on Home says *this is what you stand to win or
lose.*

**Fix:** on the primary pool card, the pot gets display size (~42px), the money accent, and the
full card width. Pair it with a live delta — "▲ ₹99 today · Kabir missed" — which is the single
line that makes the CRON's work visible and converts an accounting number into a story. The
data for it already exists in `pool_events`.

### 4. Home's pool card hides the one thing the user opened the app to do

The check-in CTA lives only on pool detail, so Home — the launch screen — cannot answer "have I
checked in today?" without a tap into each pool. This is the open half of scope item F2.4.

**Fix:** the card carries its own state — a full-width ember CTA with the live deadline
countdown when pending, and a quiet mint "Done today" chip when complete. The countdown is what
makes the stakes feel real; a static "Check In" button does not.

### 5. The palette is all one temperature

ember `#D95B3F`, gold `#CFA85C`, blood `#C95762` are all warm and close in chroma; violet
`#8B87AE` is the only cool note and it is desaturated nearly to grey. With nothing cool to push
against, the warm accents stop reading as deliberate and start reading as a tint over everything.

---

## Accent proposal

Ember stays the hero — it is correct for a discipline product and it is the brand. The changes
are surgical:

| Token | Now | Proposed | Why |
|---|---|---|---|
| `ember` | `#D95B3F` | `#E0624A` | Muddies at small sizes on near-black; slightly lifted holds up in 12–13px chips and icons |
| `gold` | `#CFA85C` | `#E8B04B` | The current value reads olive-brown. Money should look like money |
| `mint` | `#5FA98C` | `#4FB286` | ~8% lift for contrast on cards |
| `blood` | `#C95762` | `#D85F6B` | Same, and it keeps a lightness gap from ember so the two are distinguishable by more than hue |
| `violet` | `#8B87AE` | — | Replaced |
| **`signal`** | — | **`#4C7DF0`** | **New.** One disciplined cool accent: info, spectator state, links, "under review". Gives the warms something to be warm *against* |
| `canvas` | `#0C0C10` | `#0A0B0F` | Marginally deeper and cooler, which makes ember read warmer at no cost |

Red/green is deliberately avoided as the only signal for a pass/fail distinction (mint vs blood
differ in lightness too), since that pairing is the most common colour-vision failure case.

---

## Typography — one change only

The type system is approved and stays: Space Grotesk for display and money, Inter for UI. The
single fix is that **tracking must be size-specific**. A letter-spacing value that is right for
14px body is wrong for a 42px pot — large text needs negative tracking as it grows, or the
letters drift apart.

```
money / display 40px+   letter-spacing: -0.03em,  line-height: 1.10
titles 20–28px          letter-spacing: -0.012em, line-height: 1.28
body 14–16px            letter-spacing: 0,        line-height: 1.5
caption / label 10–12px letter-spacing: +0.01em (uppercase labels: +0.12em)
```

The existing rule in `Text.tsx` — any override that changes `fontSize` must also set a
`lineHeight` ≥ it — stays and should be extended to tracking.

---

## Smaller craft items

- **Sign-in has ~60% dead vertical space** (confirmed in the live capture). The form sits in the
  top third and nothing occupies the rest. Either centre the block optically or give the space a
  job — a single line of social proof, or the three-step "how it works".
- **The legal line at the bottom of sign-in is clipped** — "Privacy Policy" is cut off below the
  fold. A real layout bug, visible in the capture.
- **The disabled "Send OTP" button is near-invisible** on the dark canvas and reads as broken
  rather than as waiting for input. Give the disabled state a visible outline.
- **The ambient ember wash is effectively invisible** at 8% on dark. Either take it to ~18–20%
  where it actually shapes the screen, or remove it — at current strength it costs a gradient
  layer and delivers nothing.
- **Wall of Shame deserves more than a tinted card.** It is the product's teeth. Give it a left
  accent bar, a shame-ringed avatar and the money delta on the right, so it is scannable as a
  distinct event type rather than another row.
- **Scroll-edge fades, not hard dividers** under floating chrome — mask the content where the
  dock and sticky CTA overlap it rather than drawing a 1px line.

---

## Motion (deferred, but worth recording)

CONQR currently has haptics and transitions but no spring system. When motion gets its pass, the
default should be spring-based rather than duration-based, because springs are interruptible —
a user can grab a sheet mid-animation and reverse it, which fixed-duration curves cannot do.

Starting values: damping `1.0` / response `0.35` for ordinary UI (no overshoot), damping `0.8` /
response `0.3` for anything that follows a gesture with momentum (sheets, card dismiss, the
check-in capture transition). Reserve bounce for motion the user's own gesture started.

---

## Suggested order

1. Elevation ladder + top-edge borders *(biggest visible gain per line changed; theme-only)*
2. Text contrast fix *(accessibility; theme-only)*
3. Accent token swap *(theme-only — all three above are one file)*
4. Pot hero + check-in state on the Home card *(closes F2.4)*
5. Tracking scale in the type system
6. Sign-in layout, clipped legal line, disabled button
7. Wall of Shame treatment

Items 1–3 are a single edit to `themes.ts` with no screen changes, because every component
already consumes semantic roles. That is the payoff of the theme system built in F0.6 — the
whole visual direction can shift from one file.
