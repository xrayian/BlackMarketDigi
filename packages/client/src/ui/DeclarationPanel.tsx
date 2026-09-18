import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { network } from '../net/colyseus';
import { soundManager } from '../audio/soundManager';
import { type GoodType, LEGAL_GOODS } from '@sheriff/shared';
import { GOOD_TOKENS } from '../theme/tokens';

export function DeclarationPanel() {
  const phase = useGameStore((s) => s.phase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const playersMap = useGameStore((s) => s.players);
  const playerCount = useGameStore((s) => s.maxPlayers);

  const [selectedGood, setSelectedGood] = useState<GoodType | null>(null);
  const [isStamping, setIsStamping] = useState(false);

  if (phase !== 'DECLARATION') return null;

  const allPlayers = Array.from(playersMap.values());
  const localPlayer = allPlayers.find((p) => p.id === localPlayerId);

  if (!localPlayer) return null;

  const hasDeclared = Boolean(localPlayer.sealedBag?.declaredGood);
  const bagCardCount =
    localPlayer.sealedBag?.cardCount ||
    localPlayer.sealedBag?.cards?.length ||
    localPlayer.handCount ||
    0;

  const totalPlayers = playersMap.size || playerCount || 4;
  const isBagSnapped = Boolean(localPlayer.sealedBag?.isSnapped);
  const availableGoods =
    totalPlayers <= 3 ? LEGAL_GOODS.filter((g) => g !== 'BREAD') : LEGAL_GOODS;

  const handleDeclare = () => {
    if (!selectedGood || bagCardCount === 0 || isStamping) return;

    soundManager.playSnap();
    setIsStamping(true);

    setTimeout(() => {
      network.send('declaration', {
        declaredGood: selectedGood,
        declaredCount: bagCardCount,
      });
      setIsStamping(false);
    }, 450);
  };

  const merchants = allPlayers.filter((p) => !p.isSheriff);
  const declaredMerchantsCount = merchants.filter((m) => Boolean(m.sealedBag?.declaredGood)).length;

  return (
    <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center pointer-events-none px-4 select-none">
      <AnimatePresence>
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="pointer-events-auto w-full max-w-xl bg-walnut-bg/95 border-2 border-gold/60 rounded-3xl p-5 shadow-[0_15px_45px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col gap-3 text-parchment"
        >
          {localPlayer.isSheriff ? (
            /* Sheriff View: Hearing declarations */
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">⭐</span>
                <h2 className="text-lg font-display font-black text-gold tracking-wide">
                  Declarations ({declaredMerchantsCount}/{merchants.length})
                </h2>
              </div>
              <p className="text-xs text-parchment/70 font-body">
                Merchants are declaring their wares before your inspection.
              </p>

              {/* Status List */}
              <div className="w-full flex flex-col gap-1.5 mt-1">
                {merchants.map((m) => {
                  const goodToken = m.sealedBag?.declaredGood
                    ? GOOD_TOKENS[m.sealedBag.declaredGood as GoodType]
                    : null;
                  const isSnapped = Boolean(m.sealedBag?.isSnapped);

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs font-display transition-all ${
                        goodToken
                          ? 'bg-walnut-card/90 border-gold/40 text-gold-light'
                          : isSnapped
                          ? 'bg-amber-950/70 border-gold text-gold animate-pulse'
                          : 'bg-walnut-surface/70 border-tavern-border text-parchment/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{goodToken ? '📜' : isSnapped ? '⏳' : '🔒'}</span>
                        <span className="font-bold text-parchment">{m.name}</span>
                      </div>
                      <div>
                        {goodToken ? (
                          <span className="flex items-center gap-1">
                            <span>Declared {m.sealedBag?.declaredCount}</span>
                            <span>{goodToken.icon}</span>
                            <span className="font-bold">{goodToken.name}</span>
                          </span>
                        ) : isSnapped ? (
                          <span className="text-gold font-bold">Declaring...</span>
                        ) : (
                          <span className="text-parchment/50">Snapping bag...</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : hasDeclared ? (
            /* Merchant View: Already Declared */
            <div className="flex flex-col items-center gap-2 py-1 text-center">
              <div className="flex items-center gap-2 text-emerald">
                <span className="text-xl">✅</span>
                <h2 className="text-base font-display font-black tracking-wide">
                  Declared ✓
                </h2>
              </div>
              <p className="text-xs text-parchment font-body">
                Declared{' '}
                <span className="font-bold text-gold">
                  {localPlayer.sealedBag?.declaredCount}{' '}
                  {localPlayer.sealedBag?.declaredGood
                    ? GOOD_TOKENS[localPlayer.sealedBag.declaredGood as GoodType]?.name ||
                      localPlayer.sealedBag.declaredGood
                    : ''}
                </span>
              </p>
              <span className="text-[11px] text-parchment/60 font-body animate-pulse">
                {declaredMerchantsCount < merchants.length
                  ? `Waiting for remaining merchants (${declaredMerchantsCount}/${merchants.length} declared)...`
                  : 'All declarations received! Sheriff will inspect shortly...'}
              </span>
            </div>
          ) : !isBagSnapped ? (
            /* Merchant View: Bag not snapped yet */
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <span className="text-2xl">🔒</span>
              <h2 className="text-sm font-display font-bold text-gold">
                Snap Your Bag First
              </h2>
              <p className="text-xs text-parchment/70 font-body">
                Please snap your merchant bag clasp to begin your declaration.
              </p>
            </div>
          ) : (
            /* Merchant View: Bag snapped, can declare in parallel */
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <h2 className="text-lg font-display font-black text-gold tracking-wide">
                  Declare Your Wares
                </h2>
              </div>
              <p className="text-xs text-parchment/80 font-body">
                You carry <span className="font-bold text-gold">{bagCardCount} goods</span> in your bag. Choose a legal good type.
              </p>

              {/* Legal Goods Picker (3-column if 3p, 4-column if 4p+) */}
              <div className={`grid ${availableGoods.length === 3 ? 'grid-cols-3' : 'grid-cols-4'} gap-2 w-full mt-1`}>
                {availableGoods.map((good) => {
                  const token = GOOD_TOKENS[good];
                  const isSelected = selectedGood === good;

                  return (
                    <motion.button
                      key={good}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        soundManager.playCardSlide();
                        setSelectedGood(good);
                      }}
                      className={`
                        relative flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer
                        ${
                          isSelected
                            ? 'bg-walnut-card ring-2 ring-gold border-gold shadow-[0_0_20px_rgba(212,168,75,0.4)]'
                            : 'bg-walnut-surface/80 border-tavern-border hover:border-gold/50'
                        }
                      `}
                    >
                      <span className="text-3xl filter drop-shadow">{token.icon}</span>
                      <span className="font-display font-black text-xs text-parchment mt-1">
                        {token.name}
                      </span>

                      {/* Stamped Wax Seal Animation on Selected Good */}
                      <AnimatePresence>
                        {isSelected && isStamping && (
                          <motion.div
                            initial={{ scale: 2.5, opacity: 0, rotate: -20 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                            className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-crimson border-2 border-gold flex items-center justify-center text-white text-xs font-display font-black shadow-2xl z-30"
                          >
                            SEAL
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>

              {/* Declaration Statement & Confirm Button */}
              <div className="w-full flex items-center justify-between gap-3 mt-1 pt-2 border-t border-tavern-border">
                <div className="text-left text-xs font-display">
                  <span className="text-parchment/60 block text-[10px] uppercase">Declaration:</span>
                  <span className="text-gold font-bold">
                    {selectedGood
                      ? `I declare ${bagCardCount} ${GOOD_TOKENS[selectedGood].name}!`
                      : 'Choose a good above...'}
                  </span>
                </div>

                <motion.button
                  type="button"
                  whileHover={selectedGood && !isStamping ? { scale: 1.04 } : undefined}
                  whileTap={selectedGood && !isStamping ? { scale: 0.96 } : undefined}
                  disabled={!selectedGood || isStamping}
                  onClick={handleDeclare}
                  className={`
                    px-6 py-2 rounded-xl font-display font-black text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-xl border
                    ${
                      selectedGood && !isStamping
                        ? 'bg-gradient-to-r from-gold-dark via-gold to-gold-light text-walnut-bg border-gold-light shadow-[0_0_20px_rgba(212,168,75,0.4)] cursor-pointer'
                        : 'bg-tavern-surface text-parchment/40 border-tavern-border cursor-not-allowed opacity-50'
                    }
                  `}
                >
                  <span>📜</span>
                  <span>{isStamping ? 'Sealing...' : 'Declare'}</span>
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
