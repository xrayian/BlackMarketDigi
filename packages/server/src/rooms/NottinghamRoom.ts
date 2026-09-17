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
  SelectInspectMerchantMessage,
  UpdateLobbyOptionsMessage,
  DeputyInspectionMessage,
  ClaimBlackMarketMessage,
} from '@sheriff/shared';
import {
  GameState,
  PlayerState,
  CardState,
  SealedBagState,
  BribeOfferState,
  PlayerScoreState,
  BootyTileState,
  BlackMarketOrderState,
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
  initDeputiesState,
  drawDeputiesForRound,
  distributeBootyTile,
  DeputiesState,
  initBlackMarketState,
  canClaimBlackMarketOrder,
  claimBlackMarketOrder,
  resetRoundBlackMarketClaims,
  BlackMarketState,
  BlackMarketCard,
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

function blackMarketCardToState(c: BlackMarketCard): BlackMarketOrderState {
  return new BlackMarketOrderState({
    id: c.id,
    name: c.name,
    contrabandType: c.contrabandType,
    requiredCount: c.requiredCount,
    pointsValue: c.pointsValue,
  });
}

function syncBlackMarketPiles(state: GameState, bmState: BlackMarketState) {
  state.blackMarketPepperPile.clear();
  for (const c of bmState.pepperPile) state.blackMarketPepperPile.push(blackMarketCardToState(c));

  state.blackMarketMeadPile.clear();
  for (const c of bmState.meadPile) state.blackMarketMeadPile.push(blackMarketCardToState(c));

  state.blackMarketSilkPile.clear();
  for (const c of bmState.silkPile) state.blackMarketSilkPile.push(blackMarketCardToState(c));
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
  deputiesEngineState?: DeputiesState;
  blackMarketEngineState?: BlackMarketState;

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

    // 8. Inspection Action (Sheriff or Deputy: PASS or INSPECT)
    this.onMessage('inspection_action', (client, message: InspectionAction) => {
      if (this.state.phase !== 'INSPECTION') return;
      const isAuthority =
        client.sessionId === this.state.sheriffId ||
        this.state.deputyIds.includes(client.sessionId);
      if (!isAuthority) return;

      const targetMerchantId = message.targetPlayerId;
      if (this.inspectedMerchantIds.has(targetMerchantId)) return;

      if (this.state.enableDeputies && this.state.deputyIds.length === 2) {
        this.executeDeputyInspection(
          message.type === 'PASS' ? 'JOINT_PASS' : 'JOINT_INSPECT',
          client.sessionId,
          targetMerchantId
        );
      } else {
        if (message.type === 'PASS') {
          this.executePassUnopened(targetMerchantId);
        } else {
          this.executeInspect(targetMerchantId);
        }
      }
    });

    // 9. Select Merchant to Examine (Sheriff or Deputy sets active merchant for 1-on-1 inspection desk view)
    this.onMessage('select_inspect_merchant', (client, message: SelectInspectMerchantMessage) => {
      if (this.state.phase !== 'INSPECTION') return;
      const isAuthority =
        client.sessionId === this.state.sheriffId ||
        this.state.deputyIds.includes(client.sessionId);
      if (!isAuthority) return;
      if (this.inspectedMerchantIds.has(message.targetPlayerId)) return;
      this.state.activeMerchantId = message.targetPlayerId;
    });

    // 10. Start Game from Lobby (Host)
    this.onMessage('startGame', (client) => {
      if (this.state.phase !== 'LOBBY') return;
      if (this.tableSeatIds[0] !== client.sessionId) return;
      if (this.state.players.size < 3) return;
      let allReady = true;
      this.state.players.forEach((p) => {
        if (!p.ready) allReady = false;
      });
      if (allReady) {
        this.startGame();
      }
    });

    // 11. Update Lobby Options (Host only)
    this.onMessage('update_lobby_options', (client, message: UpdateLobbyOptionsMessage) => {
      if (this.state.phase !== 'LOBBY') return;
      if (this.tableSeatIds[0] !== client.sessionId) return;

      if (message.enableRoyalGoods !== undefined) {
        this.state.enableRoyalGoods = message.enableRoyalGoods;
      }
      if (message.enableDeputies !== undefined) {
        this.state.enableDeputies = message.enableDeputies;
      }
      if (message.enableBlackMarket !== undefined) {
        this.state.enableBlackMarket = message.enableBlackMarket;
      }
      if (message.maxPlayers !== undefined && message.maxPlayers >= 3 && message.maxPlayers <= 6) {
        this.state.maxPlayers = message.maxPlayers;
      }
    });

    // 12. 6-Player Deputy Inspection Actions
    this.onMessage('deputy_inspection', (client, message: DeputyInspectionMessage) => {
      if (this.state.phase !== 'INSPECTION') return;
      if (!this.state.enableDeputies) return;
      if (!this.state.deputyIds.includes(client.sessionId)) return;
      if (this.inspectedMerchantIds.has(message.targetPlayerId)) return;

      this.executeDeputyInspection(message.type, client.sessionId, message.targetPlayerId);
    });

    // 13. Black Market Order Claim
    this.onMessage('claim_black_market', (client, message: ClaimBlackMarketMessage) => {
      if (!this.state.enableBlackMarket || !this.blackMarketEngineState) {
        client.send('error', { message: 'Black Market expansion is not enabled' });
        return;
      }
      if (this.state.phase !== 'INSPECTION' && this.state.phase !== 'ROUND_END') {
        client.send('error', { message: 'Can only claim Black Market orders after inspection' });
        return;
      }

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const standContrabandCards = player.standContraband.map(stateToCard);
      const check = canClaimBlackMarketOrder(
        this.blackMarketEngineState,
        client.sessionId,
        message.contrabandType,
        standContrabandCards
      );

      if (!check.canClaim || !check.topCard) {
        client.send('error', { message: check.reason || 'Cannot claim Black Market order' });
        return;
      }

      const claimResult = claimBlackMarketOrder(
        this.blackMarketEngineState,
        client.sessionId,
        message.contrabandType,
        standContrabandCards
      );

      this.blackMarketEngineState = claimResult.nextState;
      syncBlackMarketPiles(this.state, this.blackMarketEngineState);
      player.hasClaimedBlackMarketThisRound = true;

      // Discard 3 traded contraband cards
      for (const card of claimResult.discardedCards) {
        this.internalDiscardPile.push(card);
        this.state.discardPile.push(cardToState(card));
      }

      // Update standContraband
      player.standContraband.clear();
      for (const card of claimResult.updatedStandContraband) {
        const cs = cardToState(card);
        player.standContraband.push(cs);
        if (client.view) client.view.add(cs);
      }

      // Add claimed Black Market card as high-value contraband
      const claimedCard: Card = {
        id: claimResult.claimedCard.id,
        name: claimResult.claimedCard.name,
        classification: 'CONTRABAND',
        contrabandType: claimResult.claimedCard.contrabandType,
        value: claimResult.claimedCard.pointsValue,
        penalty: 4,
      };

      const claimedState = cardToState(claimedCard);
      player.standContraband.push(claimedState);
      if (client.view) client.view.add(claimedState);
      player.standContrabandCount = player.standContraband.length;

      this.broadcast('black_market_claimed', {
        playerId: player.id,
        playerName: player.name,
        orderId: claimResult.claimedCard.id,
        orderName: claimResult.claimedCard.name,
        contrabandType: claimResult.claimedCard.contrabandType,
        pointsValue: claimResult.claimedCard.pointsValue,
      });
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

    const is6pDeputies = this.state.enableDeputies && playerCount === 6;
    let initialSheriffId = this.tableSeatIds[0];

    if (is6pDeputies) {
      this.deputiesEngineState = initDeputiesState(this.tableSeatIds);
      this.state.bootyTile = new BootyTileState({ gold: 0 });
      const drawResult = drawDeputiesForRound(this.deputiesEngineState);
      this.deputiesEngineState = drawResult.nextState;

      this.state.deputyIds.clear();
      this.state.deputyIds.push(drawResult.deputies[0], drawResult.deputies[1]);
      initialSheriffId = drawResult.deputies[0];
    }

    if (this.state.enableBlackMarket) {
      this.blackMarketEngineState = initBlackMarketState();
      syncBlackMarketPiles(this.state, this.blackMarketEngineState);
    }

    this.state.sheriffId = initialSheriffId;
    this.state.round = 1;

    // Deal starting hands
    const { hands, remainingDeck } = dealStartingHands(this.internalDrawPile, this.tableSeatIds, 6);
    this.internalDrawPile = remainingDeck;
    this.state.drawPileCount = remainingDeck.length;

    this.tableSeatIds.forEach((id) => {
      const player = this.state.players.get(id)!;
      if (is6pDeputies) {
        player.isDeputy = this.state.deputyIds.includes(id);
        player.isSheriff = false;
      } else {
        player.isSheriff = id === initialSheriffId;
        player.isDeputy = false;
      }
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
    const is6pDeputies = this.state.enableDeputies && this.tableSeatIds.length === 6;
    this.marketState = initMarketPhase({
      tableSeats: this.tableSeatIds,
      sheriffId: this.state.sheriffId,
      deputyIds: is6pDeputies ? Array.from(this.state.deputyIds) : undefined,
    });
    this.state.activeMerchantId = getCurrentMarketMerchant(this.marketState) || '';
  }

  private startLoadBagPhase() {
    this.state.phase = 'LOAD_BAG';
    this.state.activeMerchantId = '';
  }

  private startDeclarationPhase() {
    this.state.phase = 'DECLARATION';
    const is6pDeputies = this.state.enableDeputies && this.tableSeatIds.length === 6;
    this.declarationOrder = getDeclarationOrder(
      this.tableSeatIds,
      this.state.sheriffId,
      is6pDeputies ? Array.from(this.state.deputyIds) : undefined
    );
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

    // Move contraband & royal goods to merchant stand (face down)
    for (const card of result.merchantKeptContrabandCards) {
      if (card.classification === 'ROYAL') {
        const cs = cardToState(card);
        merchant.standRoyal.push(cs);
        merchant.standRoyalCount++;
        const client = this.clients.find((c) => c.sessionId === merchant.id);
        if (client?.view) client.view.add(cs);
      } else {
        merchant.standContraband.push(cardToState(card));
        merchant.standContrabandCount++;
      }
    }

    this.revealBagToAll(merchant.sealedBag!);
    this.inspectedMerchantIds.add(merchantId);

    if (this.state.activeMerchantId === merchantId) {
      this.state.activeMerchantId = '';
    }

    this.broadcast('inspection_result', {
      outcome: 'PASS',
      targetPlayerId: merchantId,
      targetPlayerName: merchant.name,
      sheriffId: sheriff.id,
      sheriffName: sheriff.name,
      declaredGood: merchant.sealedBag?.declaredGood || '',
      declaredCount: merchant.sealedBag?.declaredCount || 0,
      penaltyAmount: 0,
      keptCardsCount: result.merchantKeptLegalCards.length + result.merchantKeptContrabandCards.length,
      confiscatedCardsCount: 0,
      debtSettled: true,
      debtPaidGold: result.merchantPaidGold,
      debtForgiven: 0,
    });

    this.checkInspectionCompletion();
  }

  private executeDeputyInspection(
    type: 'JOINT_PASS' | 'JOINT_INSPECT' | 'SOLO_PASS' | 'SOLO_INSPECT',
    actingDeputyId: string,
    merchantId: string
  ) {
    const merchant = this.state.players.get(merchantId)!;
    const dep1 = this.state.players.get(this.state.deputyIds[0])!;
    const dep2 = this.state.players.get(this.state.deputyIds[1])!;
    const actingDeputy = this.state.players.get(actingDeputyId)!;

    const bagCards = merchant.sealedBag!.cards.map(stateToCard);
    const declaredGood = merchant.sealedBag!.declaredGood as GoodType;
    const declaredCount = merchant.sealedBag!.declaredCount;

    let bribe: any = undefined;
    if (this.state.activeBribe && this.state.activeBribe.fromPlayerId === merchantId) {
      bribe = {
        gold: this.state.activeBribe.gold,
        standCardIds: [...this.state.activeBribe.standCardIds],
        bagGoodsClaims: this.state.activeBribe.bagCardClaims.map((str) => JSON.parse(str)),
      };
    }

    if (type === 'JOINT_PASS') {
      const standCards = merchant.standLegal.map(stateToCard);
      const result = resolvePassUnopened(bagCards, bribe, standCards);

      if (result.merchantPaidGold > 0) {
        merchant.gold -= result.merchantPaidGold;
        if (this.state.bootyTile) {
          this.state.bootyTile.gold += result.merchantPaidGold;
        }
      }

      for (const card of result.merchantTransferredStandCards) {
        const idx = merchant.standLegal.findIndex((c) => c.id === card.id);
        if (idx !== -1) merchant.standLegal.splice(idx, 1);
        if (this.state.bootyTile) {
          this.state.bootyTile.goods.push(cardToState(card));
        }
      }

      for (const card of result.sheriffReceivedBagCards) {
        if (this.state.bootyTile) {
          this.state.bootyTile.goods.push(cardToState(card));
        }
      }

      for (const card of result.merchantKeptLegalCards) {
        merchant.standLegal.push(cardToState(card));
      }

      for (const card of result.merchantKeptContrabandCards) {
        if (card.classification === 'ROYAL') {
          const cs = cardToState(card);
          merchant.standRoyal.push(cs);
          merchant.standRoyalCount++;
          const client = this.clients.find((c) => c.sessionId === merchant.id);
          if (client?.view) client.view.add(cs);
        } else {
          merchant.standContraband.push(cardToState(card));
          merchant.standContrabandCount++;
        }
      }

      this.revealBagToAll(merchant.sealedBag!);
      this.inspectedMerchantIds.add(merchantId);
      if (this.state.activeMerchantId === merchantId) this.state.activeMerchantId = '';

      this.broadcast('inspection_result', {
        outcome: 'PASS',
        targetPlayerId: merchantId,
        targetPlayerName: merchant.name,
        sheriffId: dep1.id,
        sheriffName: `${dep1.name} & ${dep2.name} (Deputies)`,
        declaredGood: merchant.sealedBag?.declaredGood || '',
        declaredCount: merchant.sealedBag?.declaredCount || 0,
        penaltyAmount: 0,
        keptCardsCount: result.merchantKeptLegalCards.length + result.merchantKeptContrabandCards.length,
        confiscatedCardsCount: 0,
        debtSettled: true,
        debtPaidGold: result.merchantPaidGold,
        debtForgiven: 0,
      });

      this.checkInspectionCompletion();
    } else if (type === 'SOLO_PASS') {
      const standCards = merchant.standLegal.map(stateToCard);
      const result = resolvePassUnopened(bagCards, bribe, standCards);

      if (result.merchantPaidGold > 0) {
        merchant.gold -= result.merchantPaidGold;
        actingDeputy.gold += result.merchantPaidGold;
      }

      for (const card of result.merchantTransferredStandCards) {
        const idx = merchant.standLegal.findIndex((c) => c.id === card.id);
        if (idx !== -1) merchant.standLegal.splice(idx, 1);
        actingDeputy.standLegal.push(cardToState(card));
      }

      for (const card of result.sheriffReceivedBagCards) {
        actingDeputy.standLegal.push(cardToState(card));
      }

      for (const card of result.merchantKeptLegalCards) merchant.standLegal.push(cardToState(card));
      for (const card of result.merchantKeptContrabandCards) {
        if (card.classification === 'ROYAL') {
          const cs = cardToState(card);
          merchant.standRoyal.push(cs);
          merchant.standRoyalCount++;
          const client = this.clients.find((c) => c.sessionId === merchant.id);
          if (client?.view) client.view.add(cs);
        } else {
          merchant.standContraband.push(cardToState(card));
          merchant.standContrabandCount++;
        }
      }

      this.revealBagToAll(merchant.sealedBag!);
      this.inspectedMerchantIds.add(merchantId);
      if (this.state.activeMerchantId === merchantId) this.state.activeMerchantId = '';

      this.broadcast('inspection_result', {
        outcome: 'PASS',
        targetPlayerId: merchantId,
        targetPlayerName: merchant.name,
        sheriffId: actingDeputy.id,
        sheriffName: `${actingDeputy.name} (Solo Deputy)`,
        declaredGood: merchant.sealedBag?.declaredGood || '',
        declaredCount: merchant.sealedBag?.declaredCount || 0,
        penaltyAmount: 0,
        keptCardsCount: result.merchantKeptLegalCards.length + result.merchantKeptContrabandCards.length,
        confiscatedCardsCount: 0,
        debtSettled: true,
        debtPaidGold: result.merchantPaidGold,
        debtForgiven: 0,
      });

      this.checkInspectionCompletion();
    } else if (type === 'JOINT_INSPECT') {
      const result = resolveInspection(bagCards, declaredGood, declaredCount);
      this.revealBagToAll(merchant.sealedBag!);

      if (result.isHonest) {
        for (const card of result.merchantKeptCards) {
          merchant.standLegal.push(cardToState(card));
        }

        const half = Math.floor(result.penaltyAmount / 2);
        const remainder = result.penaltyAmount % 2;
        const dep1Penalty = half + remainder;
        const dep2Penalty = half;

        const debt1 = resolveDebt(
          { id: dep1.id, gold: dep1.gold, standLegal: dep1.standLegal.map(stateToCard), standContraband: dep1.standContraband.map(stateToCard) },
          { id: merchant.id, gold: merchant.gold, standLegal: merchant.standLegal.map(stateToCard), standContraband: merchant.standContraband.map(stateToCard) },
          dep1Penalty
        );
        dep1.gold = debt1.debtor.gold;
        merchant.gold = debt1.creditor.gold;

        const debt2 = resolveDebt(
          { id: dep2.id, gold: dep2.gold, standLegal: dep2.standLegal.map(stateToCard), standContraband: dep2.standContraband.map(stateToCard) },
          { id: merchant.id, gold: merchant.gold, standLegal: merchant.standLegal.map(stateToCard), standContraband: merchant.standContraband.map(stateToCard) },
          dep2Penalty
        );
        dep2.gold = debt2.debtor.gold;
        merchant.gold = debt2.creditor.gold;
      } else {
        for (const card of result.merchantKeptCards) {
          merchant.standLegal.push(cardToState(card));
        }
        for (const card of result.confiscatedCards) {
          this.internalDiscardPile.push(card);
          this.state.discardPile.push(cardToState(card));
        }
        const finePaid = Math.min(merchant.gold, result.penaltyAmount);
        merchant.gold -= finePaid;
        if (this.state.bootyTile) {
          this.state.bootyTile.gold += finePaid;
        }
      }

      this.inspectedMerchantIds.add(merchantId);
      if (this.state.activeMerchantId === merchantId) this.state.activeMerchantId = '';

      this.broadcast('inspection_result', {
        outcome: result.isHonest ? 'HONEST' : 'DISHONEST',
        targetPlayerId: merchantId,
        targetPlayerName: merchant.name,
        sheriffId: dep1.id,
        sheriffName: `${dep1.name} & ${dep2.name} (Deputies)`,
        declaredGood,
        declaredCount,
        penaltyAmount: result.penaltyAmount,
        keptCardsCount: result.merchantKeptCards.length,
        confiscatedCardsCount: result.confiscatedCards.length,
        debtSettled: true,
        debtPaidGold: result.penaltyAmount,
        debtForgiven: 0,
      });

      this.checkInspectionCompletion();
    } else if (type === 'SOLO_INSPECT') {
      const result = resolveInspection(bagCards, declaredGood, declaredCount);
      this.revealBagToAll(merchant.sealedBag!);

      if (result.isHonest) {
        for (const card of result.merchantKeptCards) merchant.standLegal.push(cardToState(card));
        const debt = resolveDebt(
          { id: actingDeputy.id, gold: actingDeputy.gold, standLegal: actingDeputy.standLegal.map(stateToCard), standContraband: actingDeputy.standContraband.map(stateToCard) },
          { id: merchant.id, gold: merchant.gold, standLegal: merchant.standLegal.map(stateToCard), standContraband: merchant.standContraband.map(stateToCard) },
          result.penaltyAmount
        );
        actingDeputy.gold = debt.debtor.gold;
        merchant.gold = debt.creditor.gold;
      } else {
        for (const card of result.merchantKeptCards) merchant.standLegal.push(cardToState(card));
        for (const card of result.confiscatedCards) {
          this.internalDiscardPile.push(card);
          this.state.discardPile.push(cardToState(card));
        }
        const debt = resolveDebt(
          { id: merchant.id, gold: merchant.gold, standLegal: merchant.standLegal.map(stateToCard), standContraband: merchant.standContraband.map(stateToCard) },
          { id: actingDeputy.id, gold: actingDeputy.gold, standLegal: actingDeputy.standLegal.map(stateToCard), standContraband: actingDeputy.standContraband.map(stateToCard) },
          result.penaltyAmount
        );
        merchant.gold = debt.debtor.gold;
        actingDeputy.gold = debt.creditor.gold;
      }

      this.inspectedMerchantIds.add(merchantId);
      if (this.state.activeMerchantId === merchantId) this.state.activeMerchantId = '';

      this.broadcast('inspection_result', {
        outcome: result.isHonest ? 'HONEST' : 'DISHONEST',
        targetPlayerId: merchantId,
        targetPlayerName: merchant.name,
        sheriffId: actingDeputy.id,
        sheriffName: `${actingDeputy.name} (Solo Deputy)`,
        declaredGood,
        declaredCount,
        penaltyAmount: result.penaltyAmount,
        keptCardsCount: result.merchantKeptCards.length,
        confiscatedCardsCount: result.confiscatedCards.length,
        debtSettled: true,
        debtPaidGold: result.penaltyAmount,
        debtForgiven: 0,
      });

      this.checkInspectionCompletion();
    }
  }

  private executeInspect(merchantId: string) {
    const merchant = this.state.players.get(merchantId)!;
    const sheriff = this.state.players.get(this.state.sheriffId)!;
    const bagCards = merchant.sealedBag!.cards.map(stateToCard);
    const declaredGood = merchant.sealedBag!.declaredGood as GoodType;
    const declaredCount = merchant.sealedBag!.declaredCount;

    const result = resolveInspection(bagCards, declaredGood, declaredCount);
    this.revealBagToAll(merchant.sealedBag!);

    let debtPaidGold = 0;
    let debtForgiven = 0;
    let liquidatedLegal = 0;
    let liquidatedContraband = 0;

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
      debtPaidGold = debtRes.paidGold;
      debtForgiven = debtRes.forgivenDebt;
      liquidatedLegal = debtRes.transferredLegalCards.length;
      liquidatedContraband = debtRes.transferredContrabandCards.length;
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
      debtPaidGold = debtRes.paidGold;
      debtForgiven = debtRes.forgivenDebt;
      liquidatedLegal = debtRes.transferredLegalCards.length;
      liquidatedContraband = debtRes.transferredContrabandCards.length;
    }

    this.inspectedMerchantIds.add(merchantId);

    if (this.state.activeMerchantId === merchantId) {
      this.state.activeMerchantId = '';
    }

    this.broadcast('inspection_result', {
      outcome: result.isHonest ? 'HONEST' : 'DISHONEST',
      targetPlayerId: merchantId,
      targetPlayerName: merchant.name,
      sheriffId: sheriff.id,
      sheriffName: sheriff.name,
      declaredGood: declaredGood,
      declaredCount: declaredCount,
      penaltyAmount: result.penaltyAmount,
      keptCardsCount: result.merchantKeptCards.length,
      confiscatedCardsCount: result.confiscatedCards.length,
      debtSettled: true,
      debtPaidGold,
      debtForgiven,
      liquidatedLegalCount: liquidatedLegal,
      liquidatedContrabandCount: liquidatedContraband,
    });

    this.checkInspectionCompletion();
  }

  private checkInspectionCompletion() {
    const is6pDeputies = this.state.enableDeputies && this.tableSeatIds.length === 6;
    const merchantCount = is6pDeputies ? 4 : this.tableSeatIds.length - 1;
    if (this.inspectedMerchantIds.size >= merchantCount) {
      this.handleRoundEnd();
    }
  }

  private handleRoundEnd() {
    const is6pDeputies = this.state.enableDeputies && this.tableSeatIds.length === 6;

    if (is6pDeputies && this.deputiesEngineState) {
      // Distribute Booty Tile
      if (this.state.bootyTile) {
        const dist = distributeBootyTile({
          gold: this.state.bootyTile.gold,
          goods: this.state.bootyTile.goods.map(stateToCard),
        });

        const dep1 = this.state.players.get(this.state.deputyIds[0]);
        const dep2 = this.state.players.get(this.state.deputyIds[1]);
        if (dep1 && dep2) {
          dep1.gold += dist.deputy1Gold;
          dep2.gold += dist.deputy2Gold;
          for (const g of dist.deputy1Goods) dep1.standLegal.push(cardToState(g));
          for (const g of dist.deputy2Goods) dep2.standLegal.push(cardToState(g));
        }

        for (const g of dist.discardedGoods) {
          this.internalDiscardPile.push(g);
          this.state.discardPile.push(cardToState(g));
        }

        this.state.bootyTile.gold = 0;
        this.state.bootyTile.goods.clear();
      }

      // Check endgame for 6p Deputies: Deputy deck depleted 3 times (9 rounds)
      const isGameOver = this.state.round >= 9 || this.deputiesEngineState.deckDepletions >= 3;

      if (isGameOver) {
        this.finishGame();
        return;
      }

      // Draw next 2 deputies
      const drawResult = drawDeputiesForRound(this.deputiesEngineState);
      this.deputiesEngineState = drawResult.nextState;

      this.state.deputyIds.clear();
      this.state.deputyIds.push(drawResult.deputies[0], drawResult.deputies[1]);
      this.state.sheriffId = drawResult.deputies[0];

      this.tableSeatIds.forEach((id) => {
        const player = this.state.players.get(id)!;
        player.isDeputy = drawResult.deputies.includes(id);
        player.isSheriff = false;
        player.sealedBag = undefined;
      });

      this.state.round++;
    } else {
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
        return;
      }

      // Pass Sheriff standee clockwise
      const currentIdx = this.tableSeatIds.indexOf(this.state.sheriffId);
      const nextSheriffId = this.tableSeatIds[(currentIdx + 1) % this.tableSeatIds.length];

      this.state.sheriffId = nextSheriffId;
      this.state.round++;

      this.tableSeatIds.forEach((id) => {
        const player = this.state.players.get(id)!;
        player.isSheriff = id === nextSheriffId;
        player.sealedBag = undefined;
      });
    }

    // Reset Black Market claims for the new round
    if (this.blackMarketEngineState) {
      this.blackMarketEngineState = resetRoundBlackMarketClaims(this.blackMarketEngineState);
      this.state.players.forEach((p) => {
        p.hasClaimedBlackMarketThisRound = false;
      });
    }

    // Refill all players' hands to 6 cards
    this.tableSeatIds.forEach((id) => {
      const player = this.state.players.get(id)!;
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
