import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import type { ClientCard } from '../state/gameStore';
import { network } from '../net/colyseus';
import { soundManager } from '../audio/soundManager';
import { HandCardFan } from './table2d/HandCardFan';

export function MarketPanel() {
  const phase = useGameStore((s) => s.phase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const activeMerchantId = useGameStore((s) => s.activeMerchantId);
  const playersMap = useGameStore((s) => s.players);
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const toggleCardSelection = useGameStore((s) => s.toggleCardSelection);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const drawPileCount = useGameStore((s) => s.drawPileCount);
  const discardPile = useGameStore((s) => s.discardPile);

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
            Sheriff's Decree: Select Starting Merchant
          </h2>
        </div>
        <p className="text-xs text-parchment/80 font-body max-w-md">
          Choose which merchant will begin exchanging their wares at the market stalls.
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
            <span>Your Market Turn: Discard & Draw</span>
          </h2>
          <p className="text-xs text-parchment/80 font-body">
            Select up to 5 cards to discard into the open market, or keep your hand as is.
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
            {selectedCardIds.length > 0 ? 'Exchange Cards' : 'Keep Hand (0 Discards)'}
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
          Reviewing their hand and making exchanges. Your turn is coming up!
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
          {activeMerchantName} is currently exchanging cards. Pay attention to how many cards they cycle!
        </p>
      </div>
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
          <div className="flex items-center gap-1.5 text-parchment/80">
            <span>🗑️ Discard:</span>
            <span className="font-bold text-gold">{discardPile.length}</span>
          </div>
        </div>

        <div className="w-full max-w-5xl flex flex-col items-center">{content}</div>
      </motion.div>
    </AnimatePresence>
  );
}
