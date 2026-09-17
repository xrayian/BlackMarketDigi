import { useMemo } from 'react';
import { useGameStore, type ClientPlayer } from '../../state/gameStore';
import { PlayerStand2D } from './PlayerStand2D';
import { MarketBoard2D } from './MarketBoard2D';

export function TableBoard2D() {
  const playersMap = useGameStore((s) => s.players);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const activeMerchantId = useGameStore((s) => s.activeMerchantId);
  const drawPileCount = useGameStore((s) => s.drawPileCount);
  const discardPile = useGameStore((s) => s.discardPile);

  // Order players so local player is first (bottom anchor), followed by clockwise seats
  const orderedPlayers = useMemo(() => {
    const list = Array.from(playersMap.values()).sort(
      (a, b) => a.seatIndex - b.seatIndex
    );

    if (list.length === 0) {
      // Default mockup for preview
      const mockups: ClientPlayer[] = [
        {
          id: 'p1',
          sessionId: 'p1',
          name: 'Robin',
          gold: 50,
          ready: true,
          connected: true,
          seatIndex: 0,
          isSheriff: true,
          isDeputy: false,
          handCount: 6,
          hand: [],
          standLegal: [
            { id: '1', name: 'Apples', classification: 'LEGAL', goodType: 'APPLE', value: 2, penalty: 2 },
            { id: '2', name: 'Apples', classification: 'LEGAL', goodType: 'APPLE', value: 2, penalty: 2 },
          ],
          standContrabandCount: 2,
          standContraband: [],
          standRoyalCount: 0,
          standRoyal: [],
          hasClaimedBlackMarketThisRound: false,
          sheriffCount: 0,
        },
        {
          id: 'p2',
          sessionId: 'p2',
          name: 'Marian',
          gold: 50,
          ready: true,
          connected: true,
          seatIndex: 1,
          isSheriff: false,
          isDeputy: false,
          handCount: 6,
          hand: [],
          standLegal: [
            { id: '3', name: 'Cheese', classification: 'LEGAL', goodType: 'CHEESE', value: 3, penalty: 2 },
          ],
          standContrabandCount: 0,
          standContraband: [],
          standRoyalCount: 0,
          standRoyal: [],
          hasClaimedBlackMarketThisRound: false,
          sheriffCount: 0,
        },
        {
          id: 'p3',
          sessionId: 'p3',
          name: 'Little John',
          gold: 50,
          ready: true,
          connected: true,
          seatIndex: 2,
          isSheriff: false,
          isDeputy: false,
          handCount: 6,
          hand: [],
          standLegal: [
            { id: '4', name: 'Bread', classification: 'LEGAL', goodType: 'BREAD', value: 3, penalty: 2 },
            { id: '5', name: 'Chicken', classification: 'LEGAL', goodType: 'CHICKEN', value: 4, penalty: 2 },
          ],
          standContrabandCount: 1,
          standContraband: [],
          standRoyalCount: 0,
          standRoyal: [],
          hasClaimedBlackMarketThisRound: false,
          sheriffCount: 0,
        },
        {
          id: 'p4',
          sessionId: 'p4',
          name: 'Friar Tuck',
          gold: 50,
          ready: true,
          connected: true,
          seatIndex: 3,
          isSheriff: false,
          isDeputy: false,
          handCount: 6,
          hand: [],
          standLegal: [],
          standContrabandCount: 0,
          standContraband: [],
          standRoyalCount: 0,
          standRoyal: [],
          hasClaimedBlackMarketThisRound: false,
          sheriffCount: 0,
        },
      ];
      return { local: mockups[0], opponents: mockups.slice(1) };
    }

    const localIdx = list.findIndex((p) => p.id === localPlayerId);
    if (localIdx === -1) {
      return { local: list[0], opponents: list.slice(1) };
    }

    const local = list[localIdx];
    // Rotate array so player after local comes first, wrapping around
    const opponents = [
      ...list.slice(localIdx + 1),
      ...list.slice(0, localIdx),
    ];

    return { local, opponents };
  }, [playersMap, localPlayerId]);

  const discardTop = discardPile.length > 0 ? discardPile[discardPile.length - 1] : undefined;
  const { local, opponents } = orderedPlayers;

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between items-center p-4 pt-20 pb-28 select-none overflow-y-auto">
      {/* Upper Opponents Perimeter Stalls */}
      <div className="w-full max-w-6xl flex flex-wrap items-center justify-center gap-4 z-10">
        {opponents.map((player) => (
          <PlayerStand2D
            key={player.id}
            player={player}
            isLocalPlayer={false}
            isActiveTurn={player.id === activeMerchantId}
          />
        ))}
      </div>

      {/* Center Table: Market Board */}
      <div className="my-6 z-10 flex items-center justify-center">
        <MarketBoard2D
          drawPileCount={drawPileCount}
          discardPileTop={discardTop}
        />
      </div>

      {/* Bottom Anchor: Local Player's Stand */}
      {local && (
        <div className="w-full max-w-md flex justify-center z-10">
          <PlayerStand2D
            player={local}
            isLocalPlayer={true}
            isActiveTurn={local.id === activeMerchantId}
          />
        </div>
      )}
    </div>
  );
}
