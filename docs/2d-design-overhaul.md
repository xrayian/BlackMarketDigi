# Sheriff of Nottingham — 2D Design Overhaul

This document is the visual and interaction spec for the client after the 3D → 2D
pivot. It supersedes `docs/architecture.md` §5's original 3D staging notes wherever
the two disagree on *presentation*. It does not change any rule, timing value, or
validation behavior already specified elsewhere — those still come from
`docs/architecture.md` and `docs/consultation-rulebook.md`.

Read this alongside `init.md` §7–§9, §11 (Phases 3, 4, 5, 7), which implement it.

---

## 1. Why 2D, and What This Buys You

A 3D tabletop scene has to fight two things a board game UI actively wants: occlusion
(cards and coins hidden behind each other from certain angles) and camera friction
(re-orienting to see a stat that's "behind" something). A 2D board reads everything at
once — every stand's coin count, every bag's card count, the whole market — without a
single camera move. That's the design opportunity here, not a downgrade: the game
should feel like a beautifully illustrated board you're looking straight down at, with
all the tactile "toy" feeling coming from *animation*, not geometry.

---

## 2. Visual Direction

**Overall style:** illustrated flat tabletop — warm, painterly, medieval marketplace.
Closer to a storybook illustration than a corporate flat-UI look; more Balatro's
confident chunky warmth than Board Game Arena's utilitarian grid.

**Palette (define as CSS custom properties in `/theme`):**
- Base surface: aged parchment cream (`#f2e6ce`-ish) and warm walnut brown for panel
  chrome.
- Accent: wax-seal red for primary actions and the Sheriff's role badge.
- Ambient: lantern amber for glows/highlights, deep tavern green for secondary panels.
- Contraband: a distinct desaturated violet-black family, deliberately *outside* the
  four legal-good hues so it reads as "other" even in grayscale.

**Good-type color coding (fixed, reused everywhere — cards, stand bins, market
icons):** pick one hue family per legal good (e.g. apples → red/green, cheese →
gold/yellow, bread → tan/brown, chickens → cream/white) and never reuse a hue for two
goods. Pair every color with a distinct icon silhouette — color is a reinforcement,
never the only signal (see §7).

**Typography:** a display serif or light blackletter-inspired face for headers and
flavor text only (evokes old-world signage); a clean humanist sans for every number
that matters gameplay-wise (gold amounts, counts, timers). Never put a number a player
has to read quickly in a decorative face.

---

## 3. Camera / Layout Metaphor

There's no literal camera anymore, but you still need a consistent "vantage point" per
screen so the two main views feel intentionally different rather than inconsistent:

- **Table View (main gameplay screen):** flat, top-down, all-information-visible
  layout. This is the *functional* view — clarity and responsiveness win over drama
  here, since it's on-screen the whole game.
- **Examination Desk (inspection/bribe):** a more intimate, character-forward
  full-screen overlay — portraits, a slight illustrated "stage" framing. This is the
  *dramatic* view, used briefly and repeatedly, so it can afford more visual flourish
  per second on screen than the Table View can.

This contrast (functional table vs. dramatic desk) is the main structural idea running
through the rest of this document — don't blend the two treatments.

---

## 4. Screen-by-Screen Spec

### 4.1 Table View

**Layout regions** (CSS grid, not absolute-positioned 3D-style coordinates):
- **Center:** Market board — the four legal-good discard/draw piles laid out as a
  small market stall illustration.
- **Perimeter:** player stands arranged in an arc/horseshoe around the market. For
  3–4 players, a simple flex row works; for 5–6, compute seat angle around an ellipse
  and rotate/position stands accordingly, or fall back to a two-row layout below a
  minimum width (see breakpoints below).
- **Top bar:** phase name, round number, whose turn it is, Sheriff badge.
- **Bottom, docked:** the local player's hand tray (see §4.2).
- **Right edge, collapsible drawer:** action ledger / event log.

**`PlayerStand` component:**
- Coin purse icon + numeric count (top-left of the stand).
- Legal-goods bins: one small stacked-icon-and-count group per good type the player
  has on their stand, using the fixed color coding from §2.
- Sealed-bag indicator: only visible as a closed, wax-sealed pouch icon with a card
  count — no contents, ever, for non-owners.
- Avatar + name + role badge (Sheriff / Deputy, when applicable).

**Breakpoints:**
- **Desktop (≥1280px):** full arc layout, ledger drawer as a persistent side panel.
- **Narrow desktop / tablet (900–1279px):** ledger drawer becomes an overlay toggled
  by a button; stand arc compresses spacing, not stand size.
- **Minimum supported width (~768px):** switch 5–6 player layouts to two horizontal
  rows instead of a full arc; never shrink card/coin art below its legible minimum —
  scroll the row instead.

### 4.2 Hand Tray & Bag Loading

- Cards fan out along the bottom edge, each slightly overlapping and rotated (a real
  card-fan look, not a flat row). Hovering a card lifts it and brings it to full
  overlap-free view; clicking/dragging picks it up.
- Dragging (via `@dnd-kit/core`) toward the bag reveals a drop-zone highlight around
  the bag icon.
- The bag itself: a burlap-sack/coin-purse illustration that visibly "puffs" (scale +
  slight wobble, Framer Motion) as cards are added, with a count badge.
- "Snap Bag" button enables once 1–5 cards are loaded. Pressing it triggers: quick
  squash-then-settle animation on the bag + the existing snap sound cue (reuse the
  audio asset from the original phase). After snapping, the bag becomes visually
  "locked" (a small wax-seal icon appears on it) and its contents can no longer be
  edited client-side (server already enforces this regardless).

### 4.3 Declaration UI

- A compact inline panel (not a full modal — keep the player oriented on the table
  behind it): four good-type icons in a row to pick from, and the count auto-filled
  from the bag's card count (not independently editable, since declared count must
  equal bag size).
- Selecting a good highlights it with the fixed color from §2 and a satisfying "stamp"
  animation (a wax-seal stamping down) on confirm.

### 4.4 Examination Desk (Inspection & Bribe)

- Full-screen overlay. Sheriff's portrait/illustration on one side, the Merchant
  under inspection's on the other (stack vertically instead of side-by-side under
  ~700px width), sealed bag rendered large and centered between them.
- **Balance scale:** a 2D illustrated balance beam. Bribe items (gold, cards) appear
  as draggable chips; dropping one onto a scale pan adds its value to that side's
  total, and the beam tilts proportionally (CSS transform `rotate`, spring-animated
  via Framer Motion, driven by the value difference — no physics simulation needed,
  just an animated function of the two totals).
- **"Unsnap Bag" clasp:** a large illustrated wax-seal/clasp button. Press-and-hold
  fills a radial progress ring around it (SVG `stroke-dashoffset` or a CSS
  `conic-gradient` mask animated over the duration). **Keep the exact timing already
  specified elsewhere** (1.2s threshold, cancelable up to 1.1s) — this document only
  changes how the timer is drawn, not how long it takes. Releasing early drains the
  ring back to zero with the same audio cue reversed or muted, per whatever the
  original sound design already specifies.
- **Outcome reveal:** cards flip face-up one at a time, staggered (~120–180ms between
  each), each getting a brief colored halo (legal-good color or contraband violet)
  before animating to its resolved location (stand or discard pile).

### 4.5 Debt Resolution Flow

Visualize as an "unfurling ledger" — a parchment receipt that scrolls into view,
listing the liquidation steps as line items in order (gold → legal goods → contraband
→ stand wipe). Each step's line item gets a strikethrough-and-checkmark animation as
it resolves, so the player can *see* the order being followed rather than just ending
up with a smaller stand — this is the rule players most often misunderstand, so the
UI should teach it by showing its work.

### 4.6 Round End / Scoring

A scroll-unfurl reveal panel: final counts per good, King/Queen crown icons animating
onto whichever good they landed on, tie-breaks shown as a highlighted side-by-side
comparison row rather than just a number. A single `canvas-confetti` burst on the
overall round winner's stand — not on every reveal, to avoid confetti fatigue across a
multi-round game.

---

## 5. Interaction & Motion Language

Define these as named Framer Motion transition presets in `/theme` and reuse them
everywhere rather than tuning springs ad hoc per component:

- **`snap`** — high stiffness, low damping. Used for: bag closing, wax-seal stamps,
  card-to-bag drop confirmation.
- **`settle`** — critically damped, no overshoot. Used for: layout reflows, stand
  updates, drawer open/close.
- **`flourish`** — slight overshoot, longer duration. Used for: round-end reveals,
  crown placement, King/Queen bonus callouts.

Every interactive element gets a subtle hover/focus lift (translateY(-2px) + soft
shadow) — cheap, consistent, and doubles as a keyboard-focus indicator for
accessibility.

All motion must respect `prefers-reduced-motion`: reduced-motion mode should collapse
staggered reveals to instant, skip the confetti burst, and shorten scale-tilt/beam
animation to a near-instant snap to final position rather than removing the beam tilt
entirely (players still need to see the outcome, just without the flourish).

---

## 6. Asset Production Guidance

- **SVG** for icons and UI chrome — crisp at any size, themeable via `currentColor`/CSS
  variables, small file size.
- **WebP raster** for illustrated backgrounds/textures (parchment grain, wood panel
  backgrounds) where a hand-painted look matters more than infinite scalability.
- Keep every color and font reference in a single `/theme` tokens file (CSS custom
  properties or a TS constants module) — this is what lets Phase 6's new UI (deputy
  indicator, black-market panel) match the rest of the app without re-deriving the
  palette.
- A simple Figma (layout/icons) + hand-illustration or licensed-asset-pack pipeline is
  enough here; there's no need for a 3D-modeling or sprite-sheet pipeline now that the
  client is DOM/SVG-based.

---

## 7. Accessibility Checklist

- Color is never the only differentiator between legal goods or between legal and
  contraband — every good and contraband category gets its own icon silhouette in
  addition to its color.
- Minimum interactive target size: 44×44px, including on desktop (touch/tablet play
  should work without a separate layout).
- Text contrast: verify AA minimum for every text color against the parchment/warm
  backgrounds specifically — warm cream backgrounds are an easy way to accidentally
  fail contrast checks with light or gold text; test this explicitly, don't assume it
  from the mockup.
- Reduced-motion mode (see §5) is a first-class state, not an afterthought bolted on
  in Phase 7 — build every animated component to already support it.

---

## 8. What Carries Over Unchanged From the 3D Plan

None of the following depended on the 3D presentation and should not be re-derived or
re-negotiated:
- Colyseus schema and all hidden-information filtering.
- Sound design intent and specific audio cues (Howler).
- Press-and-hold timing values (1.2s threshold / 1.1s cancel window) for the Unsnap
  Bag interaction.
- The debt-resolution liquidation order and its guided, step-by-step behavior.
- The accessibility requirement for color-independent contraband/legal indicators.

---

## 9. One Open Call Worth Confirming

Everything above assumes a **flat top-down Table View** with a **separate, more
dramatic Examination Desk overlay** (§3) — this is a real design choice, not a
default, because it drives the layout of almost every component in §4. If a more
uniform "everything looks like the dramatic desk" treatment is actually what you want
across the whole game (more illustrated/tilted throughout, at the cost of a harder
responsive layout problem), flag it before Phase 3 starts — reworking the Table View's
layout system after Phase 4/5 are built on top of it would be expensive to undo.