import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import type { ClientCard } from '../state/gameStore';
import { network } from '../net/colyseus';
import { CardDisplay } from './CardDisplay';

export function MarketPanel() {
  const phase = useGameStore((s) => s.phase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const activeMerchantId = useGameStore((s) => s.activeMerchantId);
  const players = useGameStore((s) => s.players);
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const toggleCardSelection = useGameStore((s) => s.toggleCardSelection);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const drawPileCount = useGameStore((s) => s.drawPileCount);
  const discardPile = useGameStore((s) => s.discardPile);

  if (phase !== 'MARKET' || !localPlayerId) return null;

  const localPlayer = players.get(localPlayerId);
  if (!localPlayer) return null;

  const isSheriff = localPlayer.isSheriff;
  const activeMerchantName = activeMerchantId ? players.get(activeMerchantId)?.name || 'Unknown' : '';
  const discardPileCount = discardPile.length;

  const handleSelectStartPlayer = (playerId: string) => {
    network.send('select_start_player', { playerId });
  };

  const handleConfirmExchange = () => {
    network.send('market_exchange', { cardIds: selectedCardIds });
    clearSelection();
  };

  const handleToggleCard = (card: ClientCard) => {
    if (selectedCardIds.length >= 5 && !selectedCardIds.includes(card.id)) return;
    toggleCardSelection(card.id);
  };

  let content = null;

  if (activeMerchantId === null && isSheriff) {
    const nonSheriffPlayers = Array.from(players.values()).filter((p) => !p.isSheriff);
    content = (
      <div className="flex flex-col items-center">
        <h2 className="text-2xl font-display text-gold mb-6">Select Starting Merchant</h2>
        <div className="flex gap-4">
          {nonSheriffPlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectStartPlayer(p.id)}
              className="btn-outline px-6 py-3 text-lg"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    );
  } else if (activeMerchantId === null && !isSheriff) {
    content = (
      <div className="flex justify-center items-center h-full">
        <p className="text-parchment text-lg animate-pulse">Waiting for Sheriff to select starting player...</p>
      </div>
    );
  } else if (activeMerchantId === localPlayerId && !isSheriff) {
    content = (
      <div className="flex flex-col items-center w-full">
        <h2 className="text-2xl font-display text-gold mb-2">Your Market Turn</h2>
        <p className="text-parchment mb-6">Select up to 5 cards to discard, then confirm exchange</p>
        
        <div className="flex gap-4 overflow-x-auto w-full max-w-5xl p-4 mb-6 justify-center bg-tavern-surface/50 rounded-lg border border-tavern-border">
          {localPlayer.hand.map((card) => {
            const isSelected = selectedCardIds.includes(card.id);
            return (
              <div
                key={card.id}
                onClick={() => handleToggleCard(card)}
                className={`cursor-pointer transition-transform duration-200 ${isSelected ? '-translate-y-4 shadow-lg shadow-gold/20' : 'hover:-translate-y-2'} ${selectedCardIds.length >= 5 && !isSelected ? 'opacity-50' : ''}`}
              >
                <CardDisplay
                  card={card}
                  selected={isSelected}
                />
              </div>
            );
          })}
          {localPlayer.hand.length === 0 && (
            <p className="text-gold-muted italic py-8">Your hand is empty.</p>
          )}
        </div>
        
        <div className="flex flex-col items-center gap-3">
          <p className="text-gold-light font-medium">Discarding {selectedCardIds.length} cards</p>
          <button
            onClick={handleConfirmExchange}
            className="btn-gold px-8 py-3 text-lg font-bold"
          >
            Confirm Exchange
          </button>
        </div>
      </div>
    );
  } else if (activeMerchantId !== localPlayerId && activeMerchantId !== null && !isSheriff) {
    content = (
      <div className="flex justify-center items-center h-full">
        <p className="text-parchment text-lg animate-pulse">Waiting for {activeMerchantName}'s turn...</p>
      </div>
    );
  } else if (isSheriff && activeMerchantId !== null) {
    content = (
      <div className="flex flex-col items-center">
        <h2 className="text-2xl font-display text-gold mb-3">Observing market exchanges... Watch for clues!</h2>
        <p className="text-parchment text-lg">{activeMerchantName} is currently exchanging.</p>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 w-full bg-tavern-bg/95 border-t border-tavern-border p-6 shadow-2xl z-40 backdrop-blur-sm"
      >
        <div className="absolute top-4 left-6 flex flex-col gap-1 text-sm font-body">
          <div className="text-parchment">Draw Pile: <span className="text-gold font-bold">{drawPileCount}</span></div>
          <div className="text-parchment">Discard Pile: <span className="text-gold font-bold">{discardPileCount}</span></div>
        </div>

        <div className="max-w-6xl mx-auto min-h-[200px] flex flex-col justify-center">
          {content}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
