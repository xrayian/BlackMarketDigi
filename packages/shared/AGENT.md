# Shared Package — AGENT.md

## Tech Stack
- Pure TypeScript 5 (zero external runtime dependencies)
- Emits compiled declarations and JavaScript to `dist/` via `tsc`

## Architecture
- `src/types.ts` — Core domain types: `Card`, `GoodType`, `ContrabandType`, `RoyalGoodType`, `PlayerStand`, `SealedBag`, `InspectionResult`, `DebtResolutionResult`, `PlayerScoreBreakdown`, and `GamePhase`.
- `src/cards.ts` — Canonical card catalog defining all 204 base cards (legal goods, contraband) and 12 Royal Goods cards with values, penalties, and unique identifiers.
- `src/constants.ts` — Canonical rulebook constants: deck compositions (3p vs 4-6p), legal/contraband values and penalties, King/Queen bonus tables, starting gold (50), turn timers, and sheriff rounds.
- `src/messages.ts` — Client-to-server action message schemas for all game interactions (`MarketDiscardMessage`, `LoadBagMessage`, `DeclarationMessage`, `InspectionAction`, `BribeOfferMessage`, `BribeResponseMessage`, `SelectStartPlayerMessage`, `ClaimBlackMarketMessage`).

## Conventions
- **Zero Runtime Dependencies:** This package is consumed by both the Node.js game server and the browser client. It must NEVER import React, Colyseus, or Node-specific modules (`fs`, `path`, etc.).
- **Canonical Game Values:** All numbers (card values, quantities, penalties, King/Queen bonuses) originate strictly from `docs/architecture.md` and `docs/consultation-rulebook.md`. Do not alter these values from memory.
- **Strict Typing:** All new message types and shared structures must be strongly typed with TypeScript interfaces or type aliases.
