import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { network } from '../net/colyseus';
import { type GoodType, LEGAL_GOODS } from '@sheriff/shared';

const GOOD_DISPLAY: Record<GoodType, string> = {
  APPLE: '🍎 Apples',
  CHEESE: '🧀 Cheese',
  BREAD: '🍞 Bread',
  CHICKEN: '🐔 Chickens',
};

export function DeclarationPanel() {
  const { phase, localPlayerId, activeMerchantId, players } = useGameStore();
  const [selectedGood, setSelectedGood] = useState<GoodType | null>(null);

  if (phase !== 'DECLARATION') return null;

  const allPlayers = Array.from(players.values());
  const localPlayer = allPlayers.find((p) => p.id === localPlayerId);
  const activeMerchant = allPlayers.find((p) => p.id === activeMerchantId);

  if (!localPlayer) return null;

  const hasDeclared = localPlayer.sealedBag?.declaredGood !== undefined;
  const bagCardCount = localPlayer.sealedBag?.cardCount || 0;

  const handleDeclare = () => {
    if (selectedGood) {
      network.send('declaration', { declaredGood: selectedGood, declaredCount: bagCardCount });
    }
  };

  const merchants = allPlayers.filter((p) => !p.isSheriff);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg bg-tavern-bg/95 border border-gold/40 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-parchment"
      >
        {localPlayer.isSheriff ? (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-display text-gold">Listen to the merchants' declarations carefully!</h2>
            <div className="space-y-2 mt-4 text-left">
              {merchants.map((m) => (
                <div key={m.id} className="p-3 bg-tavern-surface border border-tavern-border rounded flex justify-between items-center">
                  <span className="font-bold">{m.name}</span>
                  <span>
                    {m.sealedBag?.declaredGood
                      ? `Declared ${m.sealedBag.declaredCount} ${GOOD_DISPLAY[m.sealedBag.declaredGood as GoodType] || m.sealedBag.declaredGood}`
                      : 'Declaring...'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : localPlayer.id === activeMerchantId && !hasDeclared ? (
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-display text-gold mb-2">Make Your Declaration</h2>
            <p className="text-parchment/80">Look the Sheriff in the eye and declare what's in your bag!</p>
            <p className="text-lg font-bold">Your bag contains {bagCardCount} cards</p>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              {LEGAL_GOODS.map((good) => (
                <button
                  key={good}
                  onClick={() => setSelectedGood(good)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedGood === good
                      ? 'border-gold bg-gold/20'
                      : 'border-tavern-border bg-tavern-surface hover:border-gold/50'
                  }`}
                >
                  <span className="text-xl block">{GOOD_DISPLAY[good as GoodType]}</span>
                </button>
              ))}
            </div>
            
            <button
              onClick={handleDeclare}
              disabled={!selectedGood}
              className={`w-full mt-4 p-3 rounded font-bold text-lg transition-colors ${
                selectedGood
                  ? 'btn-gold'
                  : 'bg-tavern-surface text-gray-500 cursor-not-allowed border border-tavern-border'
              }`}
            >
              Declare!
            </button>
          </div>
        ) : hasDeclared ? (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-display text-gold">Declaration Complete</h2>
            <p className="text-xl">
              You declared: {localPlayer.sealedBag?.declaredCount} {GOOD_DISPLAY[localPlayer.sealedBag?.declaredGood as GoodType]}
            </p>
            <p className="text-parchment/70 italic mt-4">Waiting for other merchants...</p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-display text-gold">
              {activeMerchant ? `${activeMerchant.name} is declaring...` : 'Waiting...'}
            </h2>
            <div className="space-y-2 mt-4 text-left">
              {merchants.map((m) => (
                <div key={m.id} className="p-3 bg-tavern-surface border border-tavern-border rounded flex justify-between items-center">
                  <span className="font-bold">{m.name}</span>
                  <span>
                    {m.sealedBag?.declaredGood
                      ? `Declared ${m.sealedBag.declaredCount} ${GOOD_DISPLAY[m.sealedBag.declaredGood as GoodType] || m.sealedBag.declaredGood}`
                      : m.id === activeMerchantId
                        ? 'Declaring...'
                        : 'Waiting'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
