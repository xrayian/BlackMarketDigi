import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { defineServer, defineRoom, matchMaker } from 'colyseus';
import { Client, Room } from '@colyseus/sdk';
import { NottinghamRoom } from '../../src/rooms/NottinghamRoom';
import { CardState, SealedBagState } from '../../src/schema/GameState';

describe('NegotiationFeedRework Integration Tests (Colyseus 0.18)', () => {
  const TEST_PORT = 2576;
  let server: any;
  let client1: Client;
  let client2: Client;
  let client3: Client;
  let client4: Client;

  beforeAll(async () => {
    server = defineServer({
      rooms: {
        nottingham: defineRoom(NottinghamRoom),
      },
    });
    await server.listen(TEST_PORT);
    client1 = new Client(`http://localhost:${TEST_PORT}`);
    client2 = new Client(`http://localhost:${TEST_PORT}`);
    client3 = new Client(`http://localhost:${TEST_PORT}`);
    client4 = new Client(`http://localhost:${TEST_PORT}`);
  });

  afterAll(async () => {
    if (server) {
      await server.gracefullyShutdown(false);
    }
  });

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async function setup4PlayerInspectionRoom() {
    const room1 = await client1.create('nottingham', { playerName: 'Robin' });
    const room2 = await client2.joinById(room1.roomId, { playerName: 'Marian' });
    const room3 = await client3.joinById(room1.roomId, { playerName: 'LittleJohn' });
    const room4 = await client4.joinById(room1.roomId, { playerName: 'FriarTuck' });

    await delay(100);

    room1.send('ready');
    room2.send('ready');
    room3.send('ready');
    room4.send('ready');
    await delay(200);

    const serverRoom = matchMaker.getLocalRoomById(room1.roomId) as NottinghamRoom;
    serverRoom.state.phase = 'INSPECTION';
    serverRoom.state.sheriffId = room1.sessionId;
    serverRoom.state.activeMerchantId = '';
    serverRoom.state.currentInspectionBagOwnerId = '';

    // Give each merchant a sealed bag
    for (const rid of [room2.sessionId, room3.sessionId, room4.sessionId]) {
      const p = serverRoom.state.players.get(rid)!;
      p.gold = 50;
      p.sealedBag = new SealedBagState({
        merchantId: rid,
        declaredGood: 'APPLE',
        declaredCount: 2,
        isSnapped: true,
        snapConfirmed: true,
        snappedAt: Date.now(),
        cardCount: 2,
      });
      p.sealedBag.cards.push(
        new CardState({
          id: `bag_${rid}_1`,
          name: 'Apple',
          classification: 'LEGAL',
          goodType: 'APPLE',
          value: 2,
          penalty: 2,
        })
      );
      p.sealedBag.cards.push(
        new CardState({
          id: `bag_${rid}_2`,
          name: 'Apple',
          classification: 'LEGAL',
          goodType: 'APPLE',
          value: 2,
          penalty: 2,
        })
      );
    }
    // Set Sheriff gold
    const sheriff = serverRoom.state.players.get(room1.sessionId)!;
    sheriff.gold = 50;

    return { room1, room2, room3, room4, serverRoom };
  }

  it('cross-bag rival bribe: LittleJohn bribes Sheriff to FORCE_INSPECT Marian, binding commitment overrides Sheriff pass', async () => {
    const { room1, room2, room3, room4, serverRoom } = await setup4PlayerInspectionRoom();

    let toastReceived: any = null;
    room2.onMessage('negotiation_cross_bag_toast', (data) => {
      toastReceived = data;
    });

    // LittleJohn (room3) offers 10 gold to FORCE_INSPECT Marian (room2)
    room3.send('negotiation_propose', {
      targetBagOwnerId: room2.sessionId,
      intendedOutcome: 'FORCE_INSPECT',
      goldOffered: 10,
      futureFavorText: 'Check her bag, she is definitely smuggling!',
    });
    await delay(150);

    expect(serverRoom.state.negotiationFeed.length).toBe(1);
    const offer = serverRoom.state.negotiationFeed.at(0)!;
    expect(offer.fromPlayerId).toBe(room3.sessionId);
    expect(offer.targetBagOwnerId).toBe(room2.sessionId);
    expect(offer.intendedOutcome).toBe('FORCE_INSPECT');
    expect(offer.goldOffered).toBe(10);
    expect(offer.status).toBe('OPEN');

    // Verify cross-bag toast was received by Marian
    expect(toastReceived).toBeDefined();
    expect(toastReceived.targetBagOwnerId).toBe(room2.sessionId);

    // Sheriff (room1) accepts LittleJohn's offer
    room1.send('negotiation_accept', {
      offerId: offer.id,
      expectedSequence: serverRoom.state.negotiationSequence,
    });
    await delay(150);

    // Offer marked ACCEPTED
    expect(offer.status).toBe('ACCEPTED');
    // Pending commitment exists
    expect(serverRoom.state.pendingCommitments.length).toBe(1);
    const commitment = serverRoom.state.pendingCommitments.at(0)!;
    expect(commitment.targetBagOwnerId).toBe(room2.sessionId);
    expect(commitment.forcedOutcome).toBe('FORCE_INSPECT');

    let inspectionResult: any = null;
    room1.onMessage('inspection_result', (data) => {
      inspectionResult = data;
    });

    // Sheriff now tries to PASS Marian's bag (or someone triggers pass)
    room1.send('inspection_action', {
      type: 'PASS',
      targetPlayerId: room2.sessionId,
    });
    await delay(150);

    // Binding commitment forced inspection!
    expect(inspectionResult).toBeDefined();
    expect(inspectionResult.outcome).toBe('HONEST'); // Bag had 2 Apples as declared
    expect(inspectionResult.targetPlayerId).toBe(room2.sessionId);

    // LittleJohn paid the 10 gold bribe to the Sheriff upon resolution
    const littleJohn = serverRoom.state.players.get(room3.sessionId)!;
    const sheriff = serverRoom.state.players.get(room1.sessionId)!;
    expect(littleJohn.gold).toBe(40); // 50 - 10
    // Sheriff received 10 gold from LittleJohn, but had to pay penalty to Marian for honest inspection (4 gold penalty)
    // 50 + 10 - 4 = 56
    expect(sheriff.gold).toBe(56);

    await room1.leave();
    await room2.leave();
    await room3.leave();
    await room4.leave();
  });

  it('rejects contradictory commitments for the same bag', async () => {
    const { room1, room2, room3, room4, serverRoom } = await setup4PlayerInspectionRoom();

    let sheriffError = '';
    room1.onMessage('error', (data: any) => {
      sheriffError = data.message;
    });

    // LittleJohn proposes FORCE_INSPECT on Marian
    room3.send('negotiation_propose', {
      targetBagOwnerId: room2.sessionId,
      intendedOutcome: 'FORCE_INSPECT',
      goldOffered: 10,
    });
    await delay(100);

    const offer1 = serverRoom.state.negotiationFeed.at(0)!;
    room1.send('negotiation_accept', {
      offerId: offer1.id,
      expectedSequence: serverRoom.state.negotiationSequence,
    });
    await delay(100);
    expect(offer1.status).toBe('ACCEPTED');

    // Marian proposes 15 gold for PASS on her own bag
    room2.send('negotiation_propose', {
      targetBagOwnerId: room2.sessionId,
      intendedOutcome: 'PASS',
      goldOffered: 15,
    });
    await delay(100);

    const offer2 = serverRoom.state.negotiationFeed.at(1)!;
    expect(offer2.status).toBe('OPEN');

    // Sheriff tries to accept Marian's contradictory offer
    room1.send('negotiation_accept', {
      offerId: offer2.id,
      expectedSequence: serverRoom.state.negotiationSequence,
    });
    await delay(100);

    expect(sheriffError).toMatch(/contradicts an existing binding commitment/);
    expect(offer2.status).toBe('OPEN'); // Did not accept

    await room1.leave();
    await room2.leave();
    await room3.leave();
    await room4.leave();
  });

  it('enforces sequence concurrency lock when feed updates before acceptance', async () => {
    const { room1, room2, room3, room4, serverRoom } = await setup4PlayerInspectionRoom();

    let sheriffError = '';
    room1.onMessage('error', (data: any) => {
      sheriffError = data.message;
    });

    // Marian proposes offer 1
    room2.send('negotiation_propose', {
      targetBagOwnerId: room2.sessionId,
      intendedOutcome: 'PASS',
      goldOffered: 5,
    });
    await delay(100);

    const seqBefore = serverRoom.state.negotiationSequence;
    const offer1 = serverRoom.state.negotiationFeed.at(0)!;

    // Tuck proposes offer 2, advancing sequence
    room4.send('negotiation_propose', {
      targetBagOwnerId: room4.sessionId,
      intendedOutcome: 'PASS',
      goldOffered: 8,
    });
    await delay(100);

    expect(serverRoom.state.negotiationSequence).toBeGreaterThan(seqBefore);

    // Sheriff attempts to accept offer1 with the old stale sequence number
    room1.send('negotiation_accept', {
      offerId: offer1.id,
      expectedSequence: seqBefore,
    });
    await delay(100);

    expect(sheriffError).toMatch(/changed before/);
    expect(offer1.status).toBe('OPEN');

    // Accepting with the current sequence succeeds
    room1.send('negotiation_accept', {
      offerId: offer1.id,
      expectedSequence: serverRoom.state.negotiationSequence,
    });
    await delay(100);
    expect(offer1.status).toBe('ACCEPTED');

    await room1.leave();
    await room2.leave();
    await room3.leave();
    await room4.leave();
  });

  it('Honor Among Thieves: phantom stand contraband and bag cards are voided with 0 penalty', async () => {
    const { room1, room2, room3, room4, serverRoom } = await setup4PlayerInspectionRoom();

    let reconciliationRecord: any = null;
    room1.onMessage('negotiation_reconciled', (record) => {
      reconciliationRecord = record;
    });

    const marian = serverRoom.state.players.get(room2.sessionId)!;
    // Marian has 2 apples in bag, 0 contraband on stand, 50 gold
    expect(marian.standContraband.length).toBe(0);
    expect(marian.sealedBag!.cards.length).toBe(2);

    // Marian promises 5 gold, 2 phantom stand contraband, and 3 bag cards (she only has 2 in bag)
    room2.send('negotiation_propose', {
      targetBagOwnerId: room2.sessionId,
      intendedOutcome: 'PASS',
      goldOffered: 5,
      standContrabandCountOffered: 2,
      bagGoodsCountOffered: 3,
    });
    await delay(100);

    const offer = serverRoom.state.negotiationFeed.at(0)!;
    room1.send('negotiation_accept', {
      offerId: offer.id,
      expectedSequence: serverRoom.state.negotiationSequence,
    });
    await delay(100);
    expect(offer.status).toBe('ACCEPTED');

    // Sheriff passes Marian
    room1.send('inspection_action', {
      type: 'PASS',
      targetPlayerId: room2.sessionId,
    });
    await delay(150);

    // Verify reconciliation
    expect(reconciliationRecord).toBeDefined();
    expect(reconciliationRecord.honoredGold).toBe(5);
    expect(reconciliationRecord.honoredContrabandCount).toBe(0);
    expect(reconciliationRecord.voidedContrabandCount).toBe(2); // 2 phantom contraband voided
    expect(reconciliationRecord.honoredBagCardsCount).toBe(2); // genuine 2 bag cards transferred
    expect(reconciliationRecord.voidedBagCardsCount).toBe(1); // 1 phantom bag card voided
    expect(reconciliationRecord.summaryText).toContain('voided');

    // Marian gold should be 45 (50 - 5)
    expect(marian.gold).toBe(45);
    // Sheriff gold should be 55 (50 + 5)
    const sheriff = serverRoom.state.players.get(room1.sessionId)!;
    expect(sheriff.gold).toBe(55);

    await room1.leave();
    await room2.leave();
    await room3.leave();
    await room4.leave();
  });

  it('restricts authority actions and supports offer withdrawal', async () => {
    const { room1, room2, room3, room4, serverRoom } = await setup4PlayerInspectionRoom();

    let tuckError = '';
    room4.onMessage('error', (data: any) => {
      tuckError = data.message;
    });

    // Marian proposes an offer
    room2.send('negotiation_propose', {
      targetBagOwnerId: room2.sessionId,
      intendedOutcome: 'PASS',
      goldOffered: 5,
    });
    await delay(100);

    const offer = serverRoom.state.negotiationFeed.at(0)!;

    // Tuck (regular merchant) tries to accept -> rejected
    room4.send('negotiation_accept', {
      offerId: offer.id,
      expectedSequence: serverRoom.state.negotiationSequence,
    });
    await delay(100);
    expect(tuckError).toMatch(/Only the Sheriff or Deputy can accept/);

    // Tuck tries to decline -> rejected
    tuckError = '';
    room4.send('negotiation_decline', {
      offerId: offer.id,
    });
    await delay(100);
    expect(tuckError).toMatch(/Only the Sheriff or Deputy can decline/);

    // Tuck tries to withdraw Marian's offer -> rejected
    tuckError = '';
    room4.send('negotiation_withdraw', {
      offerId: offer.id,
    });
    await delay(100);
    expect(tuckError).toMatch(/Cannot withdraw someone else's offer/);

    // Marian withdraws her own offer -> succeeds
    room2.send('negotiation_withdraw', {
      offerId: offer.id,
    });
    await delay(100);
    expect(offer.status).toBe('WITHDRAWN');

    await room1.leave();
    await room2.leave();
    await room3.leave();
    await room4.leave();
  });

  it('when merchant is currently at examination desk, rival bribe to inspect immediately triggers checking pot upon acceptance', async () => {
    const { room1, room2, room3, room4, serverRoom } = await setup4PlayerInspectionRoom();

    // Sheriff selects Marian to examine at the desk
    room1.send('select_inspect_merchant', { targetPlayerId: room2.sessionId });
    await delay(100);
    expect(serverRoom.state.activeMerchantId).toBe(room2.sessionId);

    let inspectionResult: any = null;
    room1.onMessage('inspection_result', (data) => {
      inspectionResult = data;
    });

    // LittleJohn (room3) bribes Sheriff with 10 gold to FORCE_INSPECT Marian (check her pot)
    room3.send('negotiation_propose', {
      targetBagOwnerId: room2.sessionId,
      intendedOutcome: 'FORCE_INSPECT',
      goldOffered: 10,
      futureFavorText: 'I know she has contraband, check her pot!',
    });
    await delay(100);

    const offer = serverRoom.state.negotiationFeed.at(0)!;
    expect(offer.status).toBe('OPEN');

    // Sheriff accepts LittleJohn's rival bribe
    room1.send('negotiation_accept', {
      offerId: offer.id,
      expectedSequence: serverRoom.state.negotiationSequence,
    });
    await delay(150);

    // Acceptance IMMEDIATELY triggers inspection of Marian's pot without Sheriff clicking inspect
    expect(inspectionResult).toBeDefined();
    expect(inspectionResult.outcome).toBe('HONEST'); // Bag had 2 Apples
    expect(inspectionResult.targetPlayerId).toBe(room2.sessionId);

    // Marian is now marked as inspected and desk resets
    expect(serverRoom.state.activeMerchantId).toBe('');

    // LittleJohn paid 10 gold bribe to Sheriff upon resolution
    const littleJohn = serverRoom.state.players.get(room3.sessionId)!;
    const sheriff = serverRoom.state.players.get(room1.sessionId)!;
    expect(littleJohn.gold).toBe(40); // 50 - 10
    // Sheriff got 10g from LittleJohn, paid 4g penalty for honest inspection (50 + 10 - 4 = 56)
    expect(sheriff.gold).toBe(56);

    await room1.leave();
    await room2.leave();
    await room3.leave();
    await room4.leave();
  });

  it('when merchant is currently at examination desk, safe passage bribe immediately triggers passing goods upon acceptance', async () => {
    const { room1, room2, room3, room4, serverRoom } = await setup4PlayerInspectionRoom();

    // Sheriff selects Marian to examine at the desk
    room1.send('select_inspect_merchant', { targetPlayerId: room2.sessionId });
    await delay(100);
    expect(serverRoom.state.activeMerchantId).toBe(room2.sessionId);

    let inspectionResult: any = null;
    room1.onMessage('inspection_result', (data) => {
      inspectionResult = data;
    });

    // Marian (room2) bribes Sheriff with 5 gold to PASS her goods
    room2.send('negotiation_propose', {
      targetBagOwnerId: room2.sessionId,
      intendedOutcome: 'PASS',
      goldOffered: 5,
      futureFavorText: 'Let me through, these are just fresh apples!',
    });
    await delay(100);

    const offer = serverRoom.state.negotiationFeed.at(0)!;
    expect(offer.status).toBe('OPEN');

    // Sheriff accepts Marian's safe passage bribe
    room1.send('negotiation_accept', {
      offerId: offer.id,
      expectedSequence: serverRoom.state.negotiationSequence,
    });
    await delay(150);

    // Acceptance IMMEDIATELY triggers passing goods unopened without Sheriff clicking pass
    expect(inspectionResult).toBeDefined();
    expect(inspectionResult.outcome).toBe('PASS');
    expect(inspectionResult.targetPlayerId).toBe(room2.sessionId);

    // Marian is now marked as inspected and desk resets
    expect(serverRoom.state.activeMerchantId).toBe('');

    // Marian paid 5 gold to Sheriff
    const marian = serverRoom.state.players.get(room2.sessionId)!;
    const sheriff = serverRoom.state.players.get(room1.sessionId)!;
    expect(marian.gold).toBe(45); // 50 - 5
    expect(sheriff.gold).toBe(55); // 50 + 5
    // Marian kept her 2 declared apples in stand
    expect(marian.standLegal.length).toBe(2);

    await room1.leave();
    await room2.leave();
    await room3.leave();
    await room4.leave();
  });

  it('when a bribe has been proposed by a sheriff, other players can accept that bribe', async () => {
    const { room1, room2, room3, room4, serverRoom } = await setup4PlayerInspectionRoom();

    // Sheriff selects Marian to examine at the desk
    room1.send('select_inspect_merchant', { targetPlayerId: room2.sessionId });
    await delay(100);
    expect(serverRoom.state.activeMerchantId).toBe(room2.sessionId);

    let inspectionResult: any = null;
    room2.onMessage('inspection_result', (data) => {
      inspectionResult = data;
    });

    let sheriffError = '';
    room1.onMessage('error', (data) => {
      sheriffError = data.message;
    });

    // Sheriff (room1) proposes a bribe / deal on Marian's bag (e.g. 4 gold to PASS)
    room1.send('negotiation_propose', {
      targetBagOwnerId: room2.sessionId,
      intendedOutcome: 'PASS',
      goldOffered: 4,
      futureFavorText: 'I offer safe passage for this bag!',
    });
    await delay(100);

    const offer = serverRoom.state.negotiationFeed.at(0)!;
    expect(offer.status).toBe('OPEN');
    expect(offer.fromPlayerId).toBe(room1.sessionId);

    // Sheriff tries to accept their own offer -> rejected
    room1.send('negotiation_accept', {
      offerId: offer.id,
      expectedSequence: serverRoom.state.negotiationSequence,
    });
    await delay(100);
    expect(sheriffError).toMatch(/Cannot accept your own offer/);

    // Marian (the merchant whose bag is examined) accepts the Sheriff's bribe offer
    room2.send('negotiation_accept', {
      offerId: offer.id,
      expectedSequence: serverRoom.state.negotiationSequence,
    });
    await delay(150);

    // Offer status is ACCEPTED by Marian
    expect(offer.status).toBe('ACCEPTED');
    expect(offer.acceptedByPlayerId).toBe(room2.sessionId);

    // Immediate execution triggers for active merchant
    expect(inspectionResult).toBeDefined();
    expect(inspectionResult.outcome).toBe('PASS');
    expect(inspectionResult.targetPlayerId).toBe(room2.sessionId);

    // The Sheriff paid 4 gold to Marian
    const marian = serverRoom.state.players.get(room2.sessionId)!;
    const sheriff = serverRoom.state.players.get(room1.sessionId)!;
    expect(sheriff.gold).toBe(46); // 50 - 4
    expect(marian.gold).toBe(54); // 50 + 4
    expect(marian.standLegal.length).toBe(2);

    await room1.leave();
    await room2.leave();
    await room3.leave();
    await room4.leave();
  });

  it('quick counter / rival offer with intendedOutcome: INSPECT correctly broadcasts INSPECT in toast and triggers inspection upon acceptance', async () => {
    const { room1, room2, room3, room4, serverRoom } = await setup4PlayerInspectionRoom();

    let toastReceived: any = null;
    room2.onMessage('negotiation_cross_bag_toast', (data) => {
      toastReceived = data;
    });

    let inspectionResult: any = null;
    room1.onMessage('inspection_result', (data) => {
      inspectionResult = data;
    });

    // Sheriff selects Marian to examine at the desk
    room1.send('select_inspect_merchant', { targetPlayerId: room2.sessionId });
    await delay(100);
    expect(serverRoom.state.activeMerchantId).toBe(room2.sessionId);

    // Player C (room3) counters with an offer to INSPECT Marian's (room2) bag
    room3.send('negotiation_propose', {
      targetBagOwnerId: room2.sessionId,
      intendedOutcome: 'INSPECT',
      goldOffered: 7,
      futureFavorText: 'Check her pot!',
    });
    await delay(100);

    // Verify the broadcast toast carried intendedOutcome: 'INSPECT'
    expect(toastReceived).toBeDefined();
    expect(toastReceived.goldOffered).toBe(7);
    expect(toastReceived.intendedOutcome).toBe('INSPECT');
    expect(toastReceived.targetBagOwnerId).toBe(room2.sessionId);

    // Verify offer state in feed
    expect(serverRoom.state.negotiationFeed.length).toBe(1);
    const offer = serverRoom.state.negotiationFeed.at(0)!;
    expect(offer.intendedOutcome).toBe('INSPECT');
    expect(offer.goldOffered).toBe(7);

    // Sheriff accepts the counter offer
    room1.send('negotiation_accept', {
      offerId: offer.id,
      expectedSequence: serverRoom.state.negotiationSequence,
    });
    await delay(150);

    // Deal struck resulted in inspection execution on Marian's bag
    expect(inspectionResult).toBeDefined();
    expect(inspectionResult.targetPlayerId).toBe(room2.sessionId);
    // Marian had legal goods, so outcome was HONEST
    expect(inspectionResult.outcome).toBe('HONEST');

    await room1.leave();
    await room2.leave();
    await room3.leave();
    await room4.leave();
  });

  it('bribe_propose with intendedOutcome: INSPECT sets INSPECT outcome and executes inspect on bribe_respond', async () => {
    const { room1, room2, room3, room4, serverRoom } = await setup4PlayerInspectionRoom();

    let toastReceived: any = null;
    room2.onMessage('negotiation_cross_bag_toast', (data) => {
      toastReceived = data;
    });

    let inspectionResult: any = null;
    room1.onMessage('inspection_result', (data) => {
      inspectionResult = data;
    });

    // Room 3 sends bribe_propose with intendedOutcome INSPECT
    room3.send('bribe_propose', {
      targetBagOwnerId: room2.sessionId,
      intendedOutcome: 'INSPECT',
      gold: 6,
      standCardIds: [],
      bagCardClaims: [],
      nonBindingTerms: 'Inspect Marian!',
    });
    await delay(100);

    // Cross bag toast should have been broadcast
    expect(toastReceived).toBeDefined();
    expect(toastReceived.goldOffered).toBe(6);
    expect(toastReceived.intendedOutcome).toBe('INSPECT');

    // Sheriff accepts via bribe_respond
    room1.send('bribe_respond', {
      accept: true,
      sequenceNumber: serverRoom.state.activeBribe!.sequenceNumber,
    });
    await delay(150);

    // Inspection was executed
    expect(inspectionResult).toBeDefined();
    expect(inspectionResult.targetPlayerId).toBe(room2.sessionId);

    await room1.leave();
    await room2.leave();
    await room3.leave();
    await room4.leave();
  });
});
