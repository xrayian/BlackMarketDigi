import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { network } from '../net/colyseus';
import { CardDisplay } from './CardDisplay';

export function BagLoadingPanel() {
  const {
    phase,
    localPlayerId,
    players,
    selectedCardIds,
    toggleCardSelection,
    clearSelection
  } = useGameStore();

  if (phase !== 'LOAD_BAG') return null;

  const allPlayers = Array.from(players.values());
  const localPlayer = allPlayers.find(p => p.id === localPlayerId);
  if (!localPlayer) return null;

  const isSheriff = localPlayer.isSheriff;
  const isSnapped = localPlayer.sealedBag?.isSnapped === true;

  const handleSnap = () => {
    if (selectedCardIds.length >= 1 && selectedCardIds.length <= 5) {
      network.send('load_bag', { cardIds: selectedCardIds });
      clearSelection();
    }
  };

  const renderOtherMerchantsStatus = () => {
    const merchants = allPlayers.filter(p => !p.isSheriff && p.id !== localPlayerId);
    if (merchants.length === 0) return null;
    
    return (
      <div className="flex flex-col gap-2 mt-4 text-parchment font-body">
        {merchants.map(m => {
          const snapped = m.sealedBag?.isSnapped;
          return (
            <div key={m.id} className="flex justify-between items-center bg-tavern-surface border border-tavern-border px-4 py-2 rounded">
              <span>{m.name}</span>
              <span>{snapped ? '✅ Snapped' : '⏳ Loading'}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 w-full bg-tavern-bg/95 border-t border-tavern-border backdrop-blur-md p-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          
          {isSheriff ? (
            <div className="text-center">
              <h2 className="text-2xl text-gold font-display mb-2">Merchants are loading their bags...</h2>
              <div className="w-full max-w-md mx-auto">
                {renderOtherMerchantsStatus()}
              </div>
            </div>
          ) : isSnapped ? (
            <div className="text-center flex flex-col items-center">
              <h2 className="text-2xl text-emerald font-display mb-2">🔒 Bag Sealed!</h2>
              <p className="text-parchment font-body mb-4">{localPlayer.sealedBag?.cardCount} cards in bag</p>
              <h3 className="text-xl text-gold-light font-display">Waiting for other merchants...</h3>
              <div className="w-full max-w-md mx-auto">
                {renderOtherMerchantsStatus()}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <h2 className="text-2xl text-gold font-display mb-2">Load Your Merchant Bag</h2>
                <p className="text-parchment font-body mb-4">Select 1-5 cards to place in your bag, then snap it shut!</p>
              </div>

              <div className="flex overflow-x-auto py-4 gap-4 px-2 scroll-smooth">
                {localPlayer.hand.map(card => (
                  <div 
                    key={card.id} 
                    className="shrink-0 cursor-pointer" 
                    onClick={() => toggleCardSelection(card.id)}
                  >
                    <CardDisplay
                      card={card}
                      selected={selectedCardIds.includes(card.id)}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-2 border-t border-tavern-border pt-4">
                <span className="text-gold-light font-body">
                  {selectedCardIds.length} cards selected
                </span>
                <motion.button
                  whileHover={selectedCardIds.length >= 1 && selectedCardIds.length <= 5 ? { scale: 1.05 } : {}}
                  whileTap={selectedCardIds.length >= 1 && selectedCardIds.length <= 5 ? { scale: 0.95 } : {}}
                  className="btn-gold px-8 py-3 rounded text-lg disabled:opacity-50 disabled:cursor-not-allowed font-display"
                  disabled={selectedCardIds.length < 1 || selectedCardIds.length > 5}
                  onClick={handleSnap}
                >
                  Snap Bag Shut! 🔒
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
