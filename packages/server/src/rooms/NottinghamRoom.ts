import { Room, Client } from 'colyseus';
import { StateView } from '@colyseus/schema';
import {
  Card,
  GoodType,
  ContrabandType,
  SHERIFF_ROUNDS_BY_PLAYER_COUNT,
  MarketDiscardMessage,
  LoadBagMessage,
  DeclarationMessage,
  InspectionAction,
  BribeOfferMessage,
  BribeResponseMessage,
  SelectStartPlayerMessage,
} from '@sheriff/shared';
import {
  GameState,
  PlayerState,
  CardState,
  SealedBagState,
  BribeOfferState,
  PlayerScoreState,
} from '../schema/GameState';
import {
  buildDeck,
  shuffleDeck,
  drawCards,
  dealStartingHands,
  initMarketPhase,
  getCurrentMarketMerchant,
  exchangeMarketCards,
  finalizeMarketPhase,
  MarketPhaseState,
  validateBagCards,
  loadAndSnapBag,
  getDeclarationOrder,
  validateDeclaration,
  applyDeclaration,
  resolveInspection,
  resolvePassUnopened,
  resolveDebt,
  calculateScores,
  PlayerStandInput,
} from '../engine';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function cardToState(c: Card): CardState {
  return new CardState({
    id: c.id,
    name: c.name,
    classification: c.classification,
    goodType: c.goodType || '',
    contrabandType: c.contrabandType || '',
    royalGoodType: c.royalGoodType || '',
    baseGood: c.baseGood || '',
    royalBonusCount: c.royalBonusCount || 0,
    value: c.value,
    penalty: c.penalty,
  });
}

function stateToCard(s: CardState): Card {
  const card: Card = {
    id: s.id,
    name: s.name,
    classification: s.classification as any,
    value: s.value,
    penalty: s.penalty,
  };
  if (s.goodType) card.goodType = s.goodType as GoodType;
  if (s.contrabandType) card.contrabandType = s.contrabandType as ContrabandType;
  if (s.royalGoodType) card.royalGoodType = s.royalGoodType as any;
  if (s.baseGood) card.baseGood = s.baseGood as GoodType;
  if (s.royalBonusCount) card.royalBonusCount = s.royalBonusCount;
  return card;
}

export class NottinghamRoom extends Room<{ state: GameState }> {
  maxClients = 6;

  // Server-authoritative state
  internalDrawPile: Card[] = [];
  internalDiscardPile: Card[] = [];
  tableSeatIds: string[] = [];
  marketState?: MarketPhaseState;
  declarationOrder: string[] = [];
  declarationIndex = 0;
  inspectedMerchantIds = new Set<string>();
  bribeSequenceNumber = 1;

  onCreate(options: any) {
    this.roomId = generateRoomCode();

    this.setState(new GameState());
    this.state.phase = 'LOBBY';
    this.state.maxPlayers = options?.maxPlayers || 4;
    this.state.enableRoyalGoods = options?.enableRoyalGoods || false;
    this.state.enableDeputies = options?.enableDeputies || false;
    this.state.enableBlackMarket = options?.enableBlackMarket || false;

    this.setupMessageHandlers();
  }

  onJoin(client: Client, options: any) {
    client.view = new StateView();

    const seatIndex = this.tableSeatIds.length;
    const playerId = client.sessionId;
    this.tableSeatIds.push(playerId);

    const player = new PlayerState({
      id: playerId,
      sessionId: playerId,
      name: options?.playerName || `Player ${seatIndex + 1}`,
      gold: 50,
      ready: false,
      seatIndex,
    });

    this.state.players.set(playerId, player);

    // Zero-knowledge visibility: player's hand and private contraband only visible to them
    client.view.add(player);
    client.view.subscribe(player.hand);
    client.view.subscribe(player.standContraband);
    client.view.subscribe(player.standRoyal);
  }

  async onLeave(client: Client, code?: number) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Normal disconnection / voluntary leave (code 1000 is normal WS closure)
    const isConsented = code === 1000 || code === 4000;

    if (this.state.phase === 'LOBBY' || isConsented) {
      this.state.players.delete(client.sessionId);
      const idx = this.tableSeatIds.indexOf(client.sessionId);
      if (idx !== -1) this.tableSeatIds.splice(idx, 1);
    } else {
      player.connected = false;
      try {
        // Allow reconnection buffer (GDD §6.2)
        await this.allowReconnection(client, 30);
        player.connected = true;
        // Re-grant client view permissions on reconnect
        if (client.view) {
          client.view.add(player);
          if (player.sealedBag) client.view.add(player.sealedBag);
        }
      } catch {
        player.connected = false;
      }
    }
  }

  private setupMessageHandlers() {
    // 1. Ready toggle in Lobby
    this.onMessage('ready', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.ready = !player.ready;

      // Start game when all players are ready and minimum player count met
      if (this.state.phase === 'LOBBY' && this.state.players.size >= 3) {
        let allReady = true;
        this.state.players.forEach((p) => {
          if (!p.ready) allReady = false;
        });

        if (allReady) {
          this.startGame();
        }
      }
    });

    // 2. Select starting player for Market Phase (Sheriff only)
    this.onMessage('select_start_player', (client, message: SelectStartPlayerMessage) => {
      if (this.state.phase !== 'MARKET' || client.sessionId !== this.state.sheriffId) return;

      const targetId = message.playerId;
      if (!this.state.players.has(targetId) || targetId === this.state.sheriffId) return;

      this.marketState = initMarketPhase({
        tableSeats: this.tableSeatIds,
        sheriffId: this.state.sheriffId,
        startingMerchantId: targetId,
      });

      this.state.activeMerchantId = getCurrentMarketMerchant(this.marketState) || '';
    });

    // 3. Market discard & redraw exchange
    this.onMessage('market_exchange', (client, message: MarketDiscardMessage) => {
      if (this.state.phase !== 'MARKET' || !this.marketState) return;
      if (client.sessionId !== this.state.activeMerchantId) return;

      const player = this.state.players.get(client.sessionId)!;
      const handCards = player.hand.map(stateToCard);

      const result = exchangeMarketCards({
        state: this.marketState,
        playerId: client.sessionId,
        cardIdsToDiscard: message.cardIds || [],
        hand: handCards,
        drawPile: this.internalDrawPile,
        discardPile: this.internalDiscardPile,
      });

      this.marketState = result.nextState;
      this.internalDrawPile = result.newDrawPile;
      this.internalDiscardPile = result.newDiscardPile;
      this.state.drawPileCount = this.internalDrawPile.length;

      // Update player hand
      player.hand.clear();
      for (const card of result.newHand) {
        const cs = cardToState(card);
        player.hand.push(cs);
        if (client.view) {
          client.view.add(cs);
        }
      }
      player.handCount = result.newHand.length;

      if (result.isMarketComplete) {
        const { finalDiscardPile } = finalizeMarketPhase(this.marketState, this.internalDiscardPile);
        this.internalDiscardPile = finalDiscardPile;

        this.state.discardPile.clear();
        for (const card of this.internalDiscardPile) {
          this.state.discardPile.push(cardToState(card));
        }

        // Transition to Load Bag
        this.startLoadBagPhase();
      } else {
        this.state.activeMerchantId = getCurrentMarketMerchant(this.marketState) || '';
      }
    });

    // 4. Load Merchant Bag
    this.onMessage('load_bag', (client, message: LoadBagMessage) => {
      if (this.state.phase !== 'LOAD_BAG') return;
      if (client.sessionId === this.state.sheriffId) return;

      const player = this.state.players.get(client.sessionId)!;
      if (player.sealedBag?.isSnapped) return; // Cannot modify snapped bag

      const handCards = player.hand.map(stateToCard);
      const { sealedBag, remainingHand } = loadAndSnapBag({
        playerId: client.sessionId,
        hand: handCards,
        cardIdsToLoad: message.cardIds,
      });

      // Update hand
      player.hand.clear();
      for (const card of remainingHand) {
        const cs = cardToState(card);
        player.hand.push(cs);
        if (client.view) {
          client.view.add(cs);
        }
      }
      player.handCount = remainingHand.length;

      // Update sealed bag
      const bagState = new SealedBagState({
        playerId: client.sessionId,
        cardCount: sealedBag.cards.length,
        isSnapped: true,
        isRevealed: false,
      });

      player.sealedBag = bagState;

      // Grant owning client private view permission for their bag cards
      if (client.view) {
        client.view.add(bagState);
        client.view.subscribe(bagState.cards);
      }

      for (const card of sealedBag.cards) {
        const cs = cardToState(card);
        bagState.cards.push(cs);
        if (client.view) {
          client.view.add(cs);
        }
      }

      // Check if all merchants snapped bags
      let allSnapped = true;
      this.state.players.forEach((p) => {
        if (p.id !== this.state.sheriffId && (!p.sealedBag || !p.sealedBag.isSnapped)) {
          allSnapped = false;
        }
      });

      if (allSnapped) {
        this.startDeclarationPhase();
      }
    });

    // 5. Declaration
    this.onMessage('declaration', (client, message: DeclarationMessage) => {
      if (this.state.phase !== 'DECLARATION') return;
      if (client.sessionId !== this.state.activeMerchantId) return;

      const player = this.state.players.get(client.sessionId)!;
      const bagCards = player.sealedBag!.cards.map(stateToCard);

      const validation = validateDeclaration(bagCards, message.declaredCount, message.declaredGood);
      if (!validation.valid) {
        client.send('error', { message: validation.error });
        return;
      }

      player.sealedBag!.declaredGood = message.declaredGood;
      player.sealedBag!.declaredCount = message.declaredCount;

      this.declarationIndex++;
      if (this.declarationIndex >= this.declarationOrder.length) {
        this.startInspectionPhase();
      } else {
        this.state.activeMerchantId = this.declarationOrder[this.declarationIndex];
      }
    });

    // 6. Propose Bribe
    this.onMessage('bribe_propose', (client, message: BribeOfferMessage) => {
      if (this.state.phase !== 'INSPECTION') return;

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (message.gold > player.gold) {
        client.send('error', { message: 'Cannot offer more gold than you currently hold' });
        return;
      }

      this.bribeSequenceNumber++;
      const toPlayerId = client.sessionId === this.state.sheriffId ? '' : this.state.sheriffId;

      this.state.activeBribe = new BribeOfferState({
        id: `bribe_${this.bribeSequenceNumber}`,
        sequenceNumber: this.bribeSequenceNumber,
        fromPlayerId: client.sessionId,
        toPlayerId,
        gold: message.gold || 0,
        standCardIds: message.standCardIds || [],
        bagCardClaims: (message.bagCardClaims || []).map((c) => JSON.stringify(c)),
        nonBindingTerms: message.nonBindingTerms || '',
        status: 'PROPOSED',
        createdAt: Date.now(),
      });
    });

    // 7. Respond to Bribe (atomic sequence check)
    this.onMessage('bribe_respond', (client, message: BribeResponseMessage) => {
      if (this.state.phase !== 'INSPECTION' || !this.state.activeBribe) return;

      // Reject stale acceptance if sequence number doesn't match current active bribe (GDD §6.2)
      if (
        message.sequenceNumber !== undefined &&
        message.sequenceNumber !== this.state.activeBribe.sequenceNumber
      ) {
        client.send('error', { message: 'Bribe offer terms changed before response was registered' });
        return;
      }

      if (!message.accept) {
        this.state.activeBribe.status = 'REJECTED';
        return;
      }

      // Accepted bribe
      this.state.activeBribe.status = 'ACCEPTED';
      const merchantId = this.state.activeBribe.fromPlayerId;

      // Execute pass-unopened with accepted bribe
      this.executePassUnopened(merchantId, {
        gold: this.state.activeBribe.gold,
        standCardIds: [...this.state.activeBribe.standCardIds],
        bagGoodsClaims: this.state.activeBribe.bagCardClaims.map((str) => JSON.parse(str)),
      });
    });

    // 8. Inspection Action (Sheriff only: PASS or INSPECT)
    this.onMessage('inspection_action', (client, message: InspectionAction) => {
      if (this.state.phase !== 'INSPECTION') return;
      if (client.sessionId !== this.state.sheriffId) return;

      const targetMerchantId = message.targetPlayerId;
      if (this.inspectedMerchantIds.has(targetMerchantId)) return;

      if (message.type === 'PASS') {
        this.executePassUnopened(targetMerchantId);
      } else {
        this.executeInspect(targetMerchantId);
      }
    });
  }

  private startGame() {
    const playerCount = this.state.players.size;

    this.internalDrawPile = shuffleDeck(
      buildDeck({
        playerCount,
        enableRoyalGoods: this.state.enableRoyalGoods,
      })
    );
    this.internalDiscardPile = [];

    // Assign initial Sheriff (seat 0)
    const sheriffId = this.tableSeatIds[0];
    this.state.sheriffId = sheriffId;
    this.state.round = 1;

    // Deal starting hands
    const { hands, remainingDeck } = dealStartingHands(this.internalDrawPile, this.tableSeatIds, 6);
    this.internalDrawPile = remainingDeck;
    this.state.drawPileCount = remainingDeck.length;

    this.tableSeatIds.forEach((id) => {
      const player = this.state.players.get(id)!;
      player.isSheriff = id === sheriffId;
      player.hand.clear();
      const client = this.clients.find((c) => c.sessionId === id);
      for (const card of hands[id]) {
        const cs = cardToState(card);
        player.hand.push(cs);
        if (client?.view) {
          client.view.add(cs);
        }
      }
      player.handCount = hands[id].length;
    });

    this.startMarketPhase();
  }

  private startMarketPhase() {
    this.state.phase = 'MARKET';
    this.marketState = initMarketPhase({
      tableSeats: this.tableSeatIds,
      sheriffId: this.state.sheriffId,
    });
    this.state.activeMerchantId = getCurrentMarketMerchant(this.marketState) || '';
  }

  private startLoadBagPhase() {
    this.state.phase = 'LOAD_BAG';
    this.state.activeMerchantId = '';
  }

  private startDeclarationPhase() {
    this.state.phase = 'DECLARATION';
    this.declarationOrder = getDeclarationOrder(this.tableSeatIds, this.state.sheriffId);
    this.declarationIndex = 0;
    this.state.activeMerchantId = this.declarationOrder[0];
  }

  private startInspectionPhase() {
    this.state.phase = 'INSPECTION';
    this.state.activeMerchantId = '';
    this.inspectedMerchantIds.clear();
    this.state.activeBribe = undefined;
  }

  private revealBagToAll(bag: SealedBagState) {
    bag.isRevealed = true;
    // Reveal to all clients by adding to each client's view
    this.clients.forEach((c) => {
      if (c.view) {
        c.view.add(bag);
        c.view.subscribe(bag.cards);
        for (const card of bag.cards) {
          c.view.add(card);
        }
      }
    });
  }

  private executePassUnopened(merchantId: string, bribe?: any) {
    const merchant = this.state.players.get(merchantId)!;
    const sheriff = this.state.players.get(this.state.sheriffId)!;
    const bagCards = merchant.sealedBag!.cards.map(stateToCard);
    const standCards = merchant.standLegal.map(stateToCard);

    const result = resolvePassUnopened(bagCards, bribe, standCards);

    // Apply bribe transfers
    if (result.merchantPaidGold > 0) {
      merchant.gold -= result.merchantPaidGold;
      sheriff.gold += result.merchantPaidGold;
    }

    for (const card of result.merchantTransferredStandCards) {
      const idx = merchant.standLegal.findIndex((c) => c.id === card.id);
      if (idx !== -1) merchant.standLegal.splice(idx, 1);
      sheriff.standLegal.push(cardToState(card));
    }

    for (const card of result.sheriffReceivedBagCards) {
      sheriff.standLegal.push(cardToState(card));
    }

    // Move remaining legal cards to merchant stand
    for (const card of result.merchantKeptLegalCards) {
      merchant.standLegal.push(cardToState(card));
    }

    // Move contraband to merchant stand (face down)
    for (const card of result.merchantKeptContrabandCards) {
      merchant.standContraband.push(cardToState(card));
      merchant.standContrabandCount++;
    }

    this.revealBagToAll(merchant.sealedBag!);
    this.inspectedMerchantIds.add(merchantId);

    this.checkInspectionCompletion();
  }

  private executeInspect(merchantId: string) {
    const merchant = this.state.players.get(merchantId)!;
    const sheriff = this.state.players.get(this.state.sheriffId)!;
    const bagCards = merchant.sealedBag!.cards.map(stateToCard);
    const declaredGood = merchant.sealedBag!.declaredGood as GoodType;
    const declaredCount = merchant.sealedBag!.declaredCount;

    const result = resolveInspection(bagCards, declaredGood, declaredCount);
    this.revealBagToAll(merchant.sealedBag!);

    if (result.isHonest) {
      // Merchant kept all cards
      for (const card of result.merchantKeptCards) {
        merchant.standLegal.push(cardToState(card));
      }

      // Sheriff pays penalty to merchant via debt resolution
      const debtRes = resolveDebt(
        {
          id: sheriff.id,
          gold: sheriff.gold,
          standLegal: sheriff.standLegal.map(stateToCard),
          standContraband: sheriff.standContraband.map(stateToCard),
        },
        {
          id: merchant.id,
          gold: merchant.gold,
          standLegal: merchant.standLegal.map(stateToCard),
          standContraband: merchant.standContraband.map(stateToCard),
        },
        result.penaltyAmount
      );

      sheriff.gold = debtRes.debtor.gold;
      merchant.gold = debtRes.creditor.gold;
    } else {
      // Dishonest: Merchant keeps only truthful legal cards
      for (const card of result.merchantKeptCards) {
        merchant.standLegal.push(cardToState(card));
      }

      // Confiscated cards go to discard pile
      for (const card of result.confiscatedCards) {
        this.internalDiscardPile.push(card);
        this.state.discardPile.push(cardToState(card));
      }

      // Merchant pays fine to Sheriff via debt resolution
      const debtRes = resolveDebt(
        {
          id: merchant.id,
          gold: merchant.gold,
          standLegal: merchant.standLegal.map(stateToCard),
          standContraband: merchant.standContraband.map(stateToCard),
        },
        {
          id: sheriff.id,
          gold: sheriff.gold,
          standLegal: sheriff.standLegal.map(stateToCard),
          standContraband: sheriff.standContraband.map(stateToCard),
        },
        result.penaltyAmount
      );

      merchant.gold = debtRes.debtor.gold;
      sheriff.gold = debtRes.creditor.gold;
    }

    this.inspectedMerchantIds.add(merchantId);
    this.checkInspectionCompletion();
  }

  private checkInspectionCompletion() {
    const merchantCount = this.tableSeatIds.length - 1;
    if (this.inspectedMerchantIds.size >= merchantCount) {
      this.handleRoundEnd();
    }
  }

  private handleRoundEnd() {
    const currentSheriff = this.state.players.get(this.state.sheriffId)!;
    currentSheriff.sheriffCount++;

    const playerCount = this.tableSeatIds.length;
    const requiredSheriffTurns = SHERIFF_ROUNDS_BY_PLAYER_COUNT[playerCount] || 2;

    let isGameOver = true;
    this.state.players.forEach((p) => {
      if (p.sheriffCount < requiredSheriffTurns) {
        isGameOver = false;
      }
    });

    if (isGameOver) {
      this.finishGame();
    } else {
      // Pass Sheriff standee clockwise
      const currentIdx = this.tableSeatIds.indexOf(this.state.sheriffId);
      const nextSheriffId = this.tableSeatIds[(currentIdx + 1) % this.tableSeatIds.length];

      this.state.sheriffId = nextSheriffId;
      this.state.round++;

      // Refill all players' hands to 6 cards
      this.tableSeatIds.forEach((id) => {
        const player = this.state.players.get(id)!;
        player.isSheriff = id === nextSheriffId;
        player.sealedBag = undefined;

        const needed = Math.max(0, 6 - player.hand.length);
        if (needed > 0) {
          const { drawn, drawPile, discardPile } = drawCards(
            this.internalDrawPile,
            this.internalDiscardPile,
            needed
          );
          this.internalDrawPile = drawPile;
          this.internalDiscardPile = discardPile;
          this.state.drawPileCount = drawPile.length;

          const client = this.clients.find((c) => c.sessionId === id);
          for (const card of drawn) {
            const cs = cardToState(card);
            player.hand.push(cs);
            if (client?.view) {
              client.view.add(cs);
            }
          }
          player.handCount = player.hand.length;
        }
      });

      this.startMarketPhase();
    }
  }

  private finishGame() {
    this.state.phase = 'GAME_OVER';

    // Reveal all contraband identities to all clients
    this.state.players.forEach((player) => {
      this.clients.forEach((c) => {
        if (c.view) {
          c.view.add(player.standContraband);
          c.view.add(player.standRoyal);
          for (const card of player.standContraband) c.view.add(card);
          for (const card of player.standRoyal) c.view.add(card);
        }
      });
    });

    // Score game
    const scoringInputs: PlayerStandInput[] = this.tableSeatIds.map((id) => {
      const p = this.state.players.get(id)!;
      return {
        id: p.id,
        name: p.name,
        gold: p.gold,
        standLegal: p.standLegal.map(stateToCard),
        standContraband: p.standContraband.map(stateToCard),
        standRoyal: p.standRoyal.map(stateToCard),
      };
    });

    const breakdowns = calculateScores(scoringInputs);

    this.state.leaderboard.clear();
    for (const b of breakdowns) {
      this.state.leaderboard.push(
        new PlayerScoreState({
          playerId: b.playerId,
          name: b.name,
          gold: b.gold,
          goodsValue: b.goodsValue,
          bonusPoints: b.bonusPoints,
          totalScore: b.totalScore,
          legalGoodsCount: b.legalGoodsCount,
          contrabandCount: b.contrabandCount,
          rank: b.rank,
        })
      );
    }

    if (breakdowns.length > 0) {
      this.state.winnerId = breakdowns[0].playerId;
      this.state.winningScore = breakdowns[0].totalScore;
    }
  }

  onDispose() {}
}
