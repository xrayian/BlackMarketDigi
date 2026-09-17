# Examination Phase — Bribe & Negotiation Rework

## 0. Scope

This document is a companion/amendment to `docs/architecture.md` §6.2 and `init.md`
§9 (Phase 5 — Inspection & Bribe Negotiation), not a replacement. The press-and-hold
clasp timing (1.2s / 1.1s), hidden-information filtering, and the outcome/debt logic
from those documents are unchanged and correct. What's wrong is narrower and deeper:
the existing spec models bribery as a **two-party, single-bag** negotiation, and the
actual 2nd Edition rule is **all-players, all-bags, simultaneously**, with deals that
can defer their execution to a bag that hasn't been opened yet. This document reworks
the schema, server logic, and 2D UI to match the real rule.

---

## 1. Rules Reference (2nd Edition, condensed for implementation)

### 1.1 Structure of Phase 4 (Inspection)
The Sheriff receives every Merchant's closed, declared bag. They choose to inspect
each bag — from none to all of them — one at a time, in any order they choose. Before
deciding on a given bag, they may threaten to inspect it, opening negotiation for that
bag.

### 1.2 What Can Be Offered
Gold (only up to what the offering player actually has), legal goods from the
offering player's own Merchant Stand, contraband from the offering player's own
Merchant Stand, goods currently in the offering player's own sealed bag, or a
non-binding promise of a future favor. **Cards in hand can never be offered.**

### 1.3 Who Can Participate, and When (the core gap)
All players may participate in all negotiations at the same time during this phase —
this is not scoped to the Sheriff and the current bag's owner. Any player may:
- Offer a bribe concerning **their own** bag.
- Offer a bribe concerning **another player's** bag (e.g., paying the Sheriff to
  guarantee a rival gets inspected regardless of what that rival offers).
- Do this **at any point during the phase**, not only while that specific bag is
  the one currently "open" for decision.

### 1.4 Deal Finality
A deal is struck the moment the Sheriff explicitly accepts an offer (the rulebook has
players say "Deal" to remove ambiguity) — this can happen for a bag that hasn't come
up for decision yet. The deal is **executed** only when the Sheriff actually resolves
that specific bag (hands it back or opens it). Once a bag is resolved, negotiation for
that bag is permanently closed, regardless of what else is still being negotiated for
other bags.

### 1.5 Honor Among Thieves (binding exceptions)
- Promises of future favors for a **later round** are never mechanically enforced —
  flavor only, no game-state effect.
- A bribe sourced from the offering player's own **sealed bag** or their own **secret
  contraband** (not their public legal goods, which are already visible) is only
  honored to the extent it's real. A promised card that turns out not to exist is
  simply voided — no penalty beyond that.

### 1.6 Inspection Outcomes (recap — unchanged elsewhere, included for context)
- **Fully honest bag:** Sheriff pays the Merchant gold equal to the Penalty on every
  card in the bag; all cards go to the Merchant's stand.
- **Dishonest bag:** cards matching the declaration go to the stand as normal;
  everything else — wrong-type legal goods *and* contraband alike — is confiscated to
  discard, and the Merchant pays the Sheriff the Penalty on every confiscated card.
- **Passed (not inspected):** declared legal goods go face-up to the stand; contraband
  count is revealed, identity stays hidden face-down at the top of the stand.

### 1.7 Out of Scope for This Rework
- The optional "Inspection Time Limit" rule (a countdown budget for the whole phase)
  is not required by the base spec — don't build a timer unless separately requested.
- The 6-Player Deputies variant (two simultaneous decision-makers, who may act jointly
  or split) is handled in Phase 6 per `init.md` §10. **Design note for this rework:**
  model the "who can accept/decline an offer" authority as a `playerId` field rather
  than hard-coding "the Sheriff," so Deputies mode can plug in two independent
  authorities later without a schema rewrite.

---

## 2. Gap Analysis vs. Current Spec

| Aspect | Current spec (`architecture.md` §6.2 / `init.md` §9) | Actual rule | Impact |
|---|---|---|---|
| Negotiation scope | One bag, two parties (Sheriff ↔ current Merchant) | All players, all not-yet-resolved bags, concurrently | Schema and UI both need to widen from "one active bribe" to a shared feed |
| Offer targeting | Implicit — assumed to be about the currently open bag | Explicit — an offer can concern a *different* bag than the one open | Needs an explicit target-bag field |
| Deal timing | Resolved immediately against the open bag | A deal can be accepted now and executed later, when its target bag comes up | Needs a "pending commitment" concept |
| Bribe honesty | Not modeled | Bag/secret-contraband bribes are only honored if genuine (Honor Among Thieves) | Needs reconciliation logic at resolution time |
| Stale-offer handling | A single `BribeOffer` with a sequence number | A multi-entry feed where several offers can be in flight from different players at once | The sequence-number pattern needs to generalize from one offer to the whole feed |

---

## 3. Server & Schema Rework

### 3.1 Replace `activeBribe` with a Negotiation Feed

Offers and their outcomes are never hidden information — the physical game is a
face-to-face verbal negotiation everyone hears. Only sealed **bag contents** remain
`@filter`ed; the negotiation feed itself is fully public schema.

```typescript
class NegotiationOfferSchema extends Schema {
  @type("string") id: string;
  @type("string") fromPlayerId: string;           // who is speaking / offering
  @type("string") targetBagOwnerId: string;        // whose bag this offer concerns —
                                                     // may differ from fromPlayerId
  @type("number") goldOffered: number;
  @type(["string"]) standLegalGoodsOffered = new ArraySchema<string>();   // card ids —
                                                     // public, validated at offer time
  @type("number") standContrabandCountOffered: number;  // count only; identity
                                                     // reconciled at resolution
  @type("number") bagGoodsCountOffered: number;     // count only; reconciled when
                                                     // fromPlayer's own bag is opened
                                                     // or passed
  @type("string") futureFavorText?: string;         // flavor only — never enforced
  @type("string") status: "OPEN" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "VOIDED";
  @type("string") acceptedByPlayerId?: string;       // the deciding authority — the
                                                     // Sheriff today; a Deputy later
  @type("number") sequence: number;                 // monotonic — same staleness
                                                     // pattern as the original spec
  @type("number") timestamp: number;
}

class PendingCommitmentSchema extends Schema {
  @type("string") sourceOfferId: string;
  @type("string") targetBagOwnerId: string;
  @type("string") forcedOutcome: "FORCE_INSPECT" | "FORCE_PASS";
}

class GameStateSchema extends Schema {
  // ...existing fields unchanged...
  @type([NegotiationOfferSchema]) negotiationFeed = new ArraySchema<NegotiationOfferSchema>();
  @type([PendingCommitmentSchema]) pendingCommitments = new ArraySchema<PendingCommitmentSchema>();
  @type("string") currentInspectionBagOwnerId?: string; // a UI focus hint only —
                                                     // NOT a lock on who may offer
}
```

`negotiationFeed` and `pendingCommitments` are cleared at the end of each Inspection
phase.

### 3.2 Server Logic

- **`proposeOffer`**: any connected player, at any time during Phase 4, targeting any
  `targetBagOwnerId` whose bag hasn't yet been resolved this round (including their
  own). Validate `goldOffered` against the offering player's actual gold and
  `standLegalGoodsOffered` against their actual public stand contents at offer time —
  both are verifiable immediately since they're public information.
- **`acceptOffer(offerId, expectedSequence)`**: restricted to the current deciding
  authority (`acceptedByPlayerId` — the Sheriff in the base game). Rejected if
  `expectedSequence` doesn't match the feed's current sequence (see §3.3). On accept:
  - If `targetBagOwnerId` is the bag currently being resolved, execute immediately.
  - If it targets a different, not-yet-resolved bag, create a `PendingCommitmentSchema`
    entry instead of executing yet.
- **Resolving a bag** (the Sheriff's inspect-now/pass-now action): before applying the
  Sheriff's live choice, check `pendingCommitments` for that bag owner. A commitment
  overrides the live choice (per the Richard/Guy example: the Sheriff is *bound* to
  inspect regardless of further bribes). Once resolved:
  - Mark every remaining `OPEN` offer targeting that bag as `VOIDED`.
  - Reconcile any accepted offer's `standContrabandCountOffered` /
    `bagGoodsCountOffered` against the real (server-known) contents. The server always
    has full information, so this reconciliation is exact — no client-side "prove it"
    step is needed; just apply the genuine portion and mark the shortfall in the
    ledger entry for display (see §4.3).
- **`futureFavorText`** offers are never enforced server-side — they're a log entry
  only, and should render as such (see §4.4).

### 3.3 Concurrency

Generalize the original single-offer sequence-number pattern (`architecture.md` §6.2)
to the whole feed: each new offer or status change increments a feed-level sequence.
`acceptOffer` calls carry the sequence the client last observed and are rejected —
returning the current feed — if it's moved since, exactly as the original spec did for
the single-bribe case. This prevents a Sheriff's stale "Accept" from locking in an
offer that was since withdrawn or superseded by a counter-offer.

---

## 4. 2D UI Rework

### 4.1 The Problem With the Original Examination Desk

`docs/2d-design-overhaul.md` §4.4 specifies a full-screen, exclusive, two-party
overlay — Sheriff portrait vs. one Merchant's portrait, blocking the rest of the
table. That's wrong for this rule set: it would make it structurally impossible for a
third Merchant to jump in and bribe the Sheriff to inspect a *different* bag while the
desk is showing someone else — which is the single most memorable, highest-agency move
in the physical game. The fix: the Examination Desk becomes a **prominent panel**, not
an exclusive one.

### 4.2 Revised Layout

- The Examination Desk shrinks from a full-screen takeover to a large, elevated
  **focused panel** (roughly 70% of viewport width, centered, drop-shadow/scrim) that
  still shows the current bag's portraits and bribe scale — but the rest of the Table
  View (other stands, phase banner) stays visible and interactive around it. No player
  is ever fully locked out of the table just because their bag isn't the one currently
  open.
- Every `PlayerStand` gets a small, persistent **"Make an offer"** affordance (a
  coin/handshake icon), usable at any time during Phase 4 regardless of whose bag is
  currently in the desk. It opens a lightweight offer composer — not the full desk —
  where the player sets: gold amount, stand goods, bag-goods count, or a future-favor
  note, and which not-yet-resolved bag it concerns (defaulting to whichever is
  currently open, but changeable).

### 4.3 The Negotiation Ledger — bribe offer history, done properly

This is the direct fix for "better bribe offer history":

- A **persistent, collapsible side panel** (a distinct tab within the existing event
  Ledger drawer from `docs/2d-design-overhaul.md` §4.1, not a separate drawer) shows a
  live, chronological feed of every `NegotiationOfferSchema` entry for the *current*
  Inspection phase. It archives (collapses, doesn't delete) at phase end.
- Each entry is a compact card: offering player's avatar → the deciding authority's
  avatar, a one-line summary ("12 Gold + 1 Cheese to let Alan pass"), a tag naming
  which bag/player it concerns (since it may not be the one currently open), and a
  status pill — Pending / Deal / Declined / Withdrawn / Voided.
- An offer concerning a bag **other than** the one currently open gets a distinct
  visual treatment (a small "↗ concerns Gilbert's bag" tag) and triggers a brief,
  non-blocking toast over the *table* (not over the desk, so it never interrupts the
  active negotiation) — e.g., "Will offered the Sheriff 20 Gold to guarantee Gilbert
  gets inspected."
- An **accepted, not-yet-executed commitment** (the deferred cross-bag case) shows a
  small persistent chip on the affected player's stand in the Table View itself — a
  gavel icon with a tooltip like "The Sheriff has committed to inspect this bag." This
  is public information in the physical game (said aloud at the table), so surfacing
  it openly is correct and is not a hidden-information leak.
- The deciding authority's Accept/Decline controls live inline on each ledger entry,
  not only inside the desk — so a commitment about a future bag can be resolved
  without first opening that bag.
- On resolution, ledger entries tied to that bag collapse into one summary line
  showing what was actually honored vs. voided (the Honor-Among-Thieves case from
  §3.2) — e.g., "Deal honored: 8 Gold + 2 Apples. (Promised Silk did not exist —
  voided.)"

### 4.4 Motion & Feedback

- New ledger entries slide in using the existing `settle` preset
  (`docs/2d-design-overhaul.md` §5). An entry that becomes `ACCEPTED` gets the `snap`
  flourish plus the literal word **"DEAL"** stamped briefly across it — mirroring the
  tabletop convention of saying it aloud, and removing any ambiguity about what's
  actually locked in.
- `DECLINED`/`WITHDRAWN` entries fade and strike through rather than disappearing —
  the negotiation's blustery, failed-bribe moments are part of what makes the physical
  game memorable and retellable; don't erase them from the record.
- `futureFavorText` entries render with a distinct muted style and a small "not
  binding" label, so players never mistake flavor for a mechanically enforced deal.

### 4.5 Accessibility & Reduced Motion

- Every toast and commitment chip must also be reachable via the ledger — a toast is a
  convenience notification, never the only place the information lives.
- Under reduced motion, skip the slide/stamp animations but keep the status-pill
  color/text change instant, so the information itself is never gated behind motion.

---

## 5. Sequencing Note for the Agent

This rework touches Phase 5 (already mid-retrofit per `init.md` §9) at both the schema
and UI layers. Recommended order:

1. **Schema rework (§3) first**, headless, before any UI work. Write integration tests
   replicating the rulebook's own examples: the cross-bag "pay to guarantee a rival's
   inspection" deal, and the phantom-bribe Honor-Among-Thieves case.
2. **Negotiation Ledger UI (§4.3) next** — every other desk UI piece depends on it for
   correctness feedback, so build the source of truth for "what happened" before the
   more cosmetic layers.
3. **Examination Desk panel resize (§4.2) and per-stand offer affordance last.**

Add to `init.md` §9's acceptance criteria:
- "A player who is neither the Sheriff nor the current bag's owner can successfully
  make and have accepted an offer concerning a different, not-yet-resolved bag in the
  same Inspection phase, and that commitment is correctly enforced when that bag comes
  up for resolution."
- "A bribe offer including a phantom item (a bag card or secret stand contraband that
  turns out not to exist) resolves at reveal time to only its genuine portion, with
  the discrepancy reflected in the negotiation ledger."