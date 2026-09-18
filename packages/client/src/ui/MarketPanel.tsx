import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import type { ClientCard } from '../state/gameStore';
import { network } from '../net/colyseus';
import { soundManager } from '../audio/soundManager';
import { HandCardFan } from './table2d/HandCardFan';

export function MarketPanel() {
  const [isMinimized, setIsMinimized] = useState(false);
  const phase = useGameStore((s) => s.phase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const activeMerchantId = useGameStore((s) => s.activeMerchantId);
  const playersMap = useGameStore((s) => s.players);
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const toggleCardSelection = useGameStore((s) => s.toggleCardSelection);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const drawPileCount = useGameStore((s) => s.drawPileCount);
  const discardPile = useGameStore((s) => s.discardPile);
  const openDiscardPile = useGameStore((s) => s.openDiscardPile);

  if (phase !== 'MARKET' || !localPlayerId) return null;

  const localPlayer = playersMap.get(localPlayerId);
  if (!localPlayer) return null;

  const isSheriff = localPlayer.isSheriff;
  const activeMerchantName = activeMerchantId
    ? playersMap.get(activeMerchantId)?.name || 'Unknown'
    : '';

  const handleSelectStartPlayer = (playerId: string) => {
    soundManager.playGavel();
    network.send('select_start_player', { playerId });
  };

  const handleConfirmExchange = () => {
    soundManager.playCardSlide();
    network.send('market_exchange', { cardIds: selectedCardIds });
    clearSelection();
  };

  const handleToggleCard = (card: ClientCard) => {
    if (selectedCardIds.length >= 5 && !selectedCardIds.includes(card.id)) return;
    soundManager.playCardSlide();
    toggleCardSelection(card.id);
  };

  let content = null;

  if (activeMerchantId === null && isSheriff) {
    const nonSheriffPlayers = Array.from(playersMap.values()).filter((p) => !p.isSheriff);
    content = (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">⭐</span>
          <h2 className="text-lg md:text-xl font-display font-black text-gold tracking-wide">
            Select Starting Merchant
          </h2>
        </div>
        <p className="text-xs text-parchment/80 font-body max-w-md">
          Pick a merchant to start the market phase.
        </p>
        <div className="flex flex-wrap gap-2.5 justify-center mt-2">
          {nonSheriffPlayers.map((p) => (
            <motion.button
              key={p.id}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelectStartPlayer(p.id)}
              className="px-5 py-2.5 rounded-xl bg-walnut-surface hover:bg-gold/20 border border-gold/50 hover:border-gold text-gold-light font-display font-bold text-sm tracking-wider shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <span>👤</span>
              <span>{p.name}</span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  } else if (activeMerchantId === null && !isSheriff) {
    content = (
      <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
        <span className="text-2xl animate-spin">⚖️</span>
        <h3 className="text-base font-display font-bold text-gold">Market Opening...</h3>
        <p className="text-xs text-parchment/70 font-body animate-pulse">
          The Sheriff is designating which merchant approaches the stalls first.
        </p>
      </div>
    );
  } else if (activeMerchantId === localPlayerId && !isSheriff) {
    content = (
      <div className="flex flex-col items-center w-full max-w-4xl gap-2">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-lg md:text-xl font-display font-black text-gold tracking-wide flex items-center gap-2">
            <span>🏪</span>
            <span>Market: Discard & Draw</span>
          </h2>
          <p className="text-xs text-parchment/80 font-body">
            Select up to 5 cards to discard, or keep your hand.
          </p>
        </div>

        {/* Fanned Cards in Hand */}
        <div className="w-full flex flex-col items-center">
          <HandCardFan
            cards={localPlayer.hand}
            selectedCardIds={selectedCardIds}
            onCardClick={handleToggleCard}
            isDraggable={false}
            maxSelection={5}
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs font-display text-gold-light">
            Discarding {selectedCardIds.length} / 5 cards
          </span>
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleConfirmExchange}
            className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-gold-dark via-gold to-gold-light text-walnut-bg font-display font-black text-xs md:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(212,168,75,0.4)] border border-gold-light cursor-pointer"
          >
            {selectedCardIds.length > 0 ? 'Exchange Cards' : 'Keep Hand'}
          </motion.button>
        </div>
      </div>
    );
  } else if (activeMerchantId !== localPlayerId && activeMerchantId !== null && !isSheriff) {
    content = (
      <div className="flex flex-col items-center justify-center gap-2 py-3 text-center">
        <span className="text-xl">⏳</span>
        <h3 className="text-base font-display font-bold text-gold">
          {activeMerchantName} is Trading at Market
        </h3>
        <p className="text-xs text-parchment/70 font-body animate-pulse">
          Your turn is coming up.
        </p>
      </div>
    );
  } else if (isSheriff && activeMerchantId !== null) {
    content = (
      <div className="flex flex-col items-center justify-center gap-2 py-3 text-center">
        <span className="text-xl">👁️</span>
        <h3 className="text-base font-display font-bold text-gold">
          Observing Market Exchanges
        </h3>
        <p className="text-xs text-parchment/80 font-body">
          {activeMerchantName} is exchanging cards. Watch closely!
        </p>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-3 right-6 z-40 bg-walnut-bg/95 border-2 border-gold/60 rounded-2xl px-5 py-2.5 shadow-2xl backdrop-blur-md flex items-center gap-3 cursor-pointer select-none hover:bg-gold/10"
        onClick={() => setIsMinimized(false)}
      >
        <span className="text-lg">🏪</span>
        <span className="text-xs font-display font-bold text-gold">
          {activeMerchantId === localPlayerId ? 'Your Market Turn' : `${activeMerchantName}'s Turn`}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          className="ml-2 text-xs text-gold-light bg-gold/20 hover:bg-gold/30 px-2.5 py-1 rounded-lg font-bold cursor-pointer"
        >
          Expand ▲
        </button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="fixed inset-x-0 bottom-0 z-40 bg-walnut-bg/95 border-t-2 border-gold/50 backdrop-blur-md px-6 py-4 shadow-[0_-15px_50px_rgba(0,0,0,0.7)] flex flex-col items-center"
      >
        {/* Market Stalls Pile Tallies */}
        <div className="absolute top-3 left-6 hidden sm:flex items-center gap-4 text-xs font-display">
          <div className="flex items-center gap-1.5 text-parchment/80">
            <span>📦 Draw:</span>
            <span className="font-bold text-gold">{drawPileCount}</span>
          </div>
          <button
            type="button"
            onClick={openDiscardPile}
            className="flex items-center gap-1.5 text-parchment/80 hover:text-gold transition-colors cursor-pointer bg-walnut-surface/70 px-2 py-0.5 rounded-lg border border-gold/20 hover:border-gold/50"
            title="Click to view all cards in the Discard Pile"
          >
            <span>🗑️ Discard:</span>
            <span className="font-bold text-gold">{discardPile.length}</span>
            <span className="text-[10px] text-gold-muted underline ml-0.5">view</span>
          </button>
        </div>

        {/* Minimize Button */}
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="absolute top-3 right-6 text-xs text-gold-muted hover:text-gold bg-walnut-surface hover:bg-gold/10 border border-gold/30 px-3 py-1 rounded-xl font-display font-bold cursor-pointer flex items-center gap-1 transition-all"
          title="Minimize tray to view your stand and table"
        >
          <span>▼</span>
        </button>

        <div className="w-full max-w-5xl flex flex-col items-center">{content}</div>
      </motion.div>
    </AnimatePresence>
  );
}
