# Manual Test Scripts

> Automated tests are strongly preferred. Only add entries here for genuinely
> subjective checks that cannot be verified programmatically (e.g. "does the
> snap sound feel punchy").

## Phase 0: Lobby UX & Multi-Client Join
- [x] Multi-tab connection check:
  - Tab 1: Create room as Merchant A. Copy generated 4-letter room code.
  - Tab 2: Join room using code as Merchant B.
  - Verify: Both tabs show both merchants in the caravan list.
  - Verify: Toggling ready state on either tab updates immediately on both tabs.
  - Subjective: Medieval tavern aesthetic (Cinzel gold headings, dark parchment styling, smooth Framer Motion transitions).
