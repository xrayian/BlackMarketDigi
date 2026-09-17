import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useGameStore } from '../state/gameStore';
import type { ClientCard } from '../state/gameStore';
import { network } from '../net/colyseus';
import { soundManager } from '../audio/soundManager';
import { HandCardFan } from './table2d/HandCardFan';
import { MerchantBagDropZone } from './table2d/MerchantBagDropZone';
import { CardDisplay } from './CardDisplay';

export function BagLoadingPanel() {
  const phase = useGameStore((s) => s.phase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const players = useGameStore((s) => s.players);
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const toggleCardSelection = useGameStore((s) => s.toggleCardSelection);
  const addCardToSelection = useGameStore((s) => s.addCardToSelection);
  const removeCardFromSelection = useGameStore((s) => s.removeCardFromSelection);

  const [activeCard, setActiveCard] = useState<ClientCard | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Setup dnd-kit sensors: mouse/touch + keyboard for full accessibility
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6, // Prevents clicks from accidentally starting drags
      },
    }),
    useSensor(KeyboardSensor)
  );

  if (phase !== 'LOAD_BAG') return null;

  const allPlayers = Array.from(players.values());
  const localPlayer = allPlayers.find((p) => p.id === localPlayerId);
  if (!localPlayer) return null;

  const isSheriff = localPlayer.isSheriff;
  const isSnapped = localPlayer.sealedBag?.isSnapped === true;

  const loadedCards: ClientCard[] = isSnapped
    ? (localPlayer.sealedBag?.cards && localPlayer.sealedBag.cards.length > 0)
      ? localPlayer.sealedBag.cards
      : localPlayer.hand.filter((c) => selectedCardIds.includes(c.id))
    : localPlayer.hand.filter((c) => selectedCardIds.includes(c.id));

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current?.card as ClientCard | undefined;
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    if (over && over.id === 'merchant-bag-dropzone' && activeCard) {
      soundManager.playCardSlide();
      addCardToSelection(activeCard.id);
    }
    setActiveCard(null);
  };

  const handleDragCancel = () => {
    setActiveCard(null);
  };

  const handleCardClick = (card: ClientCard) => {
    if (isSnapped) return;
    soundManager.playCardSlide();
    toggleCardSelection(card.id);
  };

  const handleSnap = () => {
    if (selectedCardIds.length >= 1 && selectedCardIds.length <= 5) {
      network.send('load_bag', { cardIds: selectedCardIds });
    }
  };

  const renderOtherMerchantsStatus = () => {
    const merchants = allPlayers.filter((p) => !p.isSheriff && p.id !== localPlayerId);
    if (merchants.length === 0) return null;

    return (
      <div className="flex flex-col gap-2 w-full max-w-md text-parchment font-body">
        {merchants.map((m) => {
          const snapped = m.sealedBag?.isSnapped;
          return (
            <div
              key={m.id}
              className="flex justify-between items-center bg-walnut-card/90 border border-tavern-border px-4 py-2 rounded-xl backdrop-blur-sm shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{snapped ? '💼' : '⏳'}</span>
                <span className="font-display font-bold text-sm text-parchment">{m.name}</span>
              </div>
              <span
                className={`text-xs font-display px-2.5 py-0.5 rounded-full border ${
                  snapped
                    ? 'bg-emerald/20 text-emerald border-emerald/50'
                    : 'bg-amber-500/20 text-gold-light border-gold/40 animate-pulse'
                }`}
              >
                {snapped ? 'Sealed & Locked' : 'Selecting Goods...'}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-3 right-6 z-40 bg-walnut-bg/95 border-2 border-gold/60 rounded-2xl px-5 py-2.5 shadow-2xl backdrop-blur-md flex items-center gap-3 cursor-pointer select-none hover:bg-gold/10"
        onClick={() => setIsMinimized(false)}
      >
        <span className="text-lg">💼</span>
        <span className="text-xs font-display font-bold text-gold">
          {isSheriff ? 'Watching Merchants' : isSnapped ? 'Bag Sealed' : `Bag: ${selectedCardIds.length}/5 cards`}
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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <AnimatePresence>
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="fixed inset-x-0 bottom-0 z-40 bg-walnut-bg/95 border-t-2 border-gold/50 backdrop-blur-md px-6 py-5 shadow-[0_-15px_50px_rgba(0,0,0,0.7)] flex flex-col items-center"
        >
          {/* Minimize Button */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="absolute top-3 right-6 text-xs text-gold-muted hover:text-gold bg-walnut-surface hover:bg-gold/10 border border-gold/30 px-3 py-1 rounded-xl font-display font-bold cursor-pointer flex items-center gap-1 transition-all"
            title="Minimize tray to view your stand and table"
          >
            <span>Minimize</span>
            <span>▼</span>
          </button>

          {isSheriff ? (
            /* Sheriff View: Waiting for merchants */
            <div className="flex flex-col items-center gap-4 py-3 text-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                <h2 className="text-xl md:text-2xl font-display font-black text-gold tracking-wide">
                  The Merchants Are Packing Their Bags...
                </h2>
              </div>
              <p className="text-xs md:text-sm text-parchment/80 max-w-lg font-body">
                Keep a sharp eye on their movements. Honest wares or smuggled contraband will soon arrive at your gate!
              </p>
              {renderOtherMerchantsStatus()}
            </div>
          ) : isSnapped ? (
            /* Merchant View: Already snapped bag */
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔒</span>
                <h2 className="text-xl md:text-2xl font-display font-black text-emerald tracking-wide">
                  Your Bag is Wax-Sealed & Locked!
                </h2>
              </div>
              <p className="text-xs md:text-sm text-parchment/80 font-body">
                {localPlayer.sealedBag?.cardCount || loadedCards.length} goods safely stowed. Prepare your declaration for the Sheriff!
              </p>
              <div className="my-1">
                <MerchantBagDropZone
                  loadedCards={loadedCards}
                  onRemoveCard={() => {}}
                  onSnapBag={() => {}}
                  isSnapped={true}
                  disabled={true}
                />
              </div>
              <div className="w-full flex flex-col items-center">
                <span className="text-xs font-display text-gold-muted mb-1.5 uppercase tracking-wider">
                  Waiting for other merchants to finish:
                </span>
                {renderOtherMerchantsStatus()}
              </div>
            </div>
          ) : (
            /* Merchant View: Loading Bag */
            <div className="w-full max-w-5xl flex flex-col items-center gap-3">
              {/* Header Title & Prompt */}
              <div className="flex flex-col items-center text-center">
                <h2 className="text-lg md:text-xl font-display font-black text-gold tracking-wide flex items-center gap-2">
                  <span>💼</span>
                  <span>Load Your Merchant Bag</span>
                </h2>
                <p className="text-xs text-parchment/80 font-body">
                  Drag cards into your bag or click them to select (1 to 5 goods). Then snap it shut!
                </p>
              </div>

              {/* Central Bag Drop Target */}
              <MerchantBagDropZone
                loadedCards={loadedCards}
                onRemoveCard={(cardId) => removeCardFromSelection(cardId)}
                onSnapBag={handleSnap}
                isSnapped={false}
              />

              {/* Hand Cards Fanned at Bottom */}
              <div className="w-full flex flex-col items-center pt-1">
                <span className="text-[11px] font-display text-parchment/60 uppercase tracking-widest">
                  Your Hand ({localPlayer.hand.length} cards)
                </span>
                <HandCardFan
                  cards={localPlayer.hand}
                  selectedCardIds={selectedCardIds}
                  onCardClick={handleCardClick}
                  isDraggable={true}
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Floating Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="rotate-6 scale-110 shadow-[0_15px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(212,168,75,0.6)] cursor-grabbing pointer-events-none">
            <CardDisplay card={activeCard} selected={true} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
