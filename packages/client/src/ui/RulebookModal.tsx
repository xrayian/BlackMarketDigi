import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { soundManager } from '../audio/soundManager';

interface Chapter {
  id: string;
  title: string;
  icon: string;
  badge?: string;
}

const CHAPTERS: Chapter[] = [
  { id: 'quickstart', title: 'Quick Start Guide', icon: '📖', badge: 'Start Here' },
  { id: 'phases', title: 'The 5 Round Phases', icon: '🔄' },
  { id: 'inspection', title: 'Inspection & Fines', icon: '⚖️' },
  { id: 'bribery', title: 'Bribery & Deals', icon: '🤝', badge: 'Core Rule' },
  { id: 'goods', title: 'Goods & Scoring', icon: '🃏' },
  { id: 'tactics', title: 'Merchant Wisdom & Tactics', icon: '💡' },
];

export function RulebookModal() {
  const isRulebookOpen = useGameStore((s) => s.isRulebookOpen);
  const rulebookActiveChapter = useGameStore((s) => s.rulebookActiveChapter);
  const closeRulebook = useGameStore((s) => s.closeRulebook);
  const reducedMotion = useGameStore((s) => s.reducedMotion);

  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (rulebookActiveChapter >= 0 && rulebookActiveChapter < CHAPTERS.length) {
      setActiveTab(rulebookActiveChapter);
    }
  }, [rulebookActiveChapter]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRulebookOpen) {
        closeRulebook();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRulebookOpen, closeRulebook]);

  if (!isRulebookOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          className="relative flex flex-col w-full max-w-4xl h-[88vh] max-h-[820px] bg-[#140e0a] border-2 border-gold/70 rounded-3xl shadow-2xl overflow-hidden text-parchment"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-[#1c140e] via-[#2a1d13] to-[#1c140e] border-b-2 border-gold/40 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl filter drop-shadow">📜</span>
              <div>
                <h2 className="font-display font-black text-lg md:text-xl text-gold tracking-wide flex items-center gap-2 leading-none">
                  NOTTINGHAM CODEX & RULEBOOK
                </h2>
                <span className="text-[11px] font-body text-gold-muted">
                  Official Merchant Regulations & 2nd Edition Rules
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundManager.playCardSlide();
                closeRulebook();
              }}
              className="p-1.5 px-3 rounded-xl bg-[#2a1d13] hover:bg-crimson/80 border border-gold/30 hover:border-crimson text-parchment transition-all cursor-pointer font-display font-bold text-sm"
              title="Close Rulebook (Esc)"
            >
              ✕ Close
            </button>
          </div>

          {/* Chapter Navigation Tabs */}
          <div className="flex items-center gap-1.5 px-4 py-2 bg-[#1b130e] border-b border-[#3d2a1b] overflow-x-auto scrollbar-thin shrink-0">
            {CHAPTERS.map((chapter, idx) => {
              const isActive = activeTab === idx;
              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => {
                    soundManager.playCardSlide();
                    setActiveTab(idx);
                  }}
                  className={`
                    relative flex items-center gap-2 px-3 py-1.5 rounded-xl font-display font-bold text-xs whitespace-nowrap transition-all cursor-pointer
                    ${
                      isActive
                        ? 'bg-gold text-[#140e0a] shadow-md'
                        : 'bg-[#251a12] text-parchment/70 hover:text-parchment hover:bg-[#322318] border border-transparent'
                    }
                  `}
                >
                  <span className="text-sm">{chapter.icon}</span>
                  <span>{chapter.title}</span>
                  {chapter.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase font-bold tracking-tighter ${
                        isActive
                          ? 'bg-[#140e0a] text-gold'
                          : 'bg-gold/20 text-gold-light border border-gold/40'
                      }`}
                    >
                      {chapter.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main Book Content Area */}
          <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#18110b] scrollbar-thin scrollbar-thumb-gold/30 scrollbar-track-transparent">
            {/* TAB 0: QUICK START */}
            {activeTab === 0 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="bg-[#24170f] border-2 border-gold/50 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center gap-2.5 text-gold font-display font-black text-lg mb-2">
                    <span>👑</span>
                    <span>The Objective</span>
                  </div>
                  <p className="text-sm text-parchment/90 leading-relaxed font-body">
                    Welcome to Nottingham! You are a merchant attempting to bring goods into the city to sell at the market.
                    The <strong className="text-gold">Sheriff</strong> guards the city gate, searching bags for illicit <span className="text-red-400 font-bold">Contraband</span>.
                    Your goal is to finish the game with the <strong className="text-gold">largest personal fortune</strong>, calculated from your gold coins, the value of all goods successfully brought to your stand, and prestigious end-game bonuses.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1f140d] border border-[#3e2b1d] rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-gold font-display font-bold text-sm mb-1.5">
                      <span>⭐ The Sheriff</span>
                    </div>
                    <p className="text-xs text-parchment/80 leading-normal font-body">
                      The Sheriff badge rotates clockwise each round. The Sheriff has the sole authority to either inspect each merchant’s sealed bag or let it pass unopened.
                      The Sheriff collects heavy penalty fines when catching dishonest merchants, but must pay out of pocket if inspecting an honest merchant!
                    </p>
                  </div>

                  <div className="bg-[#1f140d] border border-[#3e2b1d] rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-emerald-400 font-display font-bold text-sm mb-1.5">
                      <span>🎒 The Merchants</span>
                    </div>
                    <p className="text-xs text-parchment/80 leading-normal font-body">
                      All other players act as merchants. You will discard and redraw cards, load 1 to 5 goods into your bag, snap it shut, and look the Sheriff in the eye to declare what you carry.
                      You may tell the absolute truth, or smuggle contraband while bluffing with a poker face!
                    </p>
                  </div>
                </div>

                <div className="bg-[#1f140d] border border-gold/30 rounded-2xl p-5 space-y-3">
                  <h3 className="font-display font-black text-sm text-gold uppercase tracking-wider flex items-center gap-2">
                    <span>⚡ The 5 Steps of Every Round</span>
                  </h3>
                  <div className="space-y-2.5 text-xs text-parchment/85 font-body">
                    <div className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full bg-gold text-[#140e0a] font-black font-display flex items-center justify-center shrink-0 text-[11px]">1</span>
                      <div>
                        <strong className="text-gold-light">Market:</strong> Discard up to 5 unwanted cards from hand and redraw back up to 6 cards.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full bg-gold text-[#140e0a] font-black font-display flex items-center justify-center shrink-0 text-[11px]">2</span>
                      <div>
                        <strong className="text-gold-light">Load Bag:</strong> Select 1 to 5 cards to stow into your Merchant Bag and snap the clasp shut.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full bg-gold text-[#140e0a] font-black font-display flex items-center justify-center shrink-0 text-[11px]">3</span>
                      <div>
                        <strong className="text-gold-light">Declaration:</strong> Announce your goods to the Sheriff. You must state the <span className="text-gold underline">exact card count</span>, and exactly <span className="text-gold underline">one legal good</span> (Apples, Cheese, Bread, or Chickens). You cannot declare Contraband!
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full bg-gold text-[#140e0a] font-black font-display flex items-center justify-center shrink-0 text-[11px]">4</span>
                      <div>
                        <strong className="text-gold-light">Inspection & Bribes:</strong> The Sheriff inspects bags one by one. All players haggle, make bribe proposals, and strike binding deals in the Bribe Ledger!
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full bg-gold text-[#140e0a] font-black font-display flex items-center justify-center shrink-0 text-[11px]">5</span>
                      <div>
                        <strong className="text-gold-light">Round End:</strong> The Sheriff badge passes to the left. The game ends when each player has been Sheriff twice (or 3 times in 3-player games).
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: THE 5 ROUND PHASES */}
            {activeTab === 1 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                {/* Phase 1 */}
                <div className="bg-[#1f140d] border border-[#3e2b1d] rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#3e2b1d] pb-2">
                    <h3 className="font-display font-black text-sm text-gold flex items-center gap-2">
                      <span>Phase 1: Nottingham Market</span>
                    </h3>
                    <span className="text-[10px] text-parchment/50 font-display uppercase">Preparation</span>
                  </div>
                  <p className="text-xs text-parchment/85 leading-relaxed font-body">
                    Starting with the player to the Sheriff’s left, each merchant has one opportunity to curate their hand:
                  </p>
                  <ul className="list-disc list-inside text-xs text-parchment/80 space-y-1 pl-1 font-body">
                    <li>You may discard up to 5 cards from your hand of 6.</li>
                    <li>You can discard face-up to either discard pile or sweep them away.</li>
                    <li>Then, redraw back up to 6 cards from the draw pile or the top of discard piles.</li>
                    <li>The Sheriff skips this phase—they do not trade or load a bag this round.</li>
                  </ul>
                </div>

                {/* Phase 2 */}
                <div className="bg-[#1f140d] border border-[#3e2b1d] rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#3e2b1d] pb-2">
                    <h3 className="font-display font-black text-sm text-gold flex items-center gap-2">
                      <span>Phase 2: Load the Merchant Bag</span>
                    </h3>
                    <span className="text-[10px] text-parchment/50 font-display uppercase">Cargo Stowing</span>
                  </div>
                  <p className="text-xs text-parchment/85 leading-relaxed font-body">
                    All merchants secretly place <strong>between 1 and 5 cards</strong> from their hand into their pouch:
                  </p>
                  <ul className="list-disc list-inside text-xs text-parchment/80 space-y-1 pl-1 font-body">
                    <li>You can put only legal goods, only contraband, or a mixture of both.</li>
                    <li>No other player can see what you are loading.</li>
                    <li>Once you are satisfied, press <strong>"Snap Bag"</strong>. Snapping is permanent for the round!</li>
                  </ul>
                </div>

                {/* Phase 3 */}
                <div className="bg-[#1f140d] border border-[#3e2b1d] rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#3e2b1d] pb-2">
                    <h3 className="font-display font-black text-sm text-gold flex items-center gap-2">
                      <span>Phase 3: The Declaration</span>
                    </h3>
                    <span className="text-[10px] text-parchment/50 font-display uppercase">Solemn Oath</span>
                  </div>
                  <div className="bg-[#2a1b12] border-l-4 border-gold p-3 rounded-r-xl text-xs space-y-1">
                    <div className="font-display font-bold text-gold">The Strict Declaration Rule:</div>
                    <p className="text-parchment/90 font-body">
                      You must declare the <strong>EXACT number of cards</strong> in your bag, and exactly <strong>ONE LEGAL GOOD</strong> (Apples, Cheese, Bread, or Chickens).
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 font-body">
                    <div className="bg-emerald-950/60 border border-emerald-500/40 p-2.5 rounded-xl text-emerald-200">
                      <strong>✓ Valid Declarations:</strong>
                      <div className="mt-1 space-y-0.5 text-[11px]">
                        <div>• "3 Apples" (bag contains 3 cards)</div>
                        <div>• "4 Chickens" (bag contains 4 cards)</div>
                        <div>• "1 Bread" (bag contains 1 card)</div>
                      </div>
                    </div>
                    <div className="bg-red-950/60 border border-red-500/40 p-2.5 rounded-xl text-red-200">
                      <strong>✕ Illegal Declarations:</strong>
                      <div className="mt-1 space-y-0.5 text-[11px]">
                        <div>• "2 Apples and 1 Bread" (only 1 type allowed!)</div>
                        <div>• "3 Silk" (Contraband is never declared!)</div>
                        <div>• "3 Cheese" if you loaded 4 cards (count must match!)</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phase 4 & 5 */}
                <div className="bg-[#1f140d] border border-[#3e2b1d] rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#3e2b1d] pb-2">
                    <h3 className="font-display font-black text-sm text-gold flex items-center gap-2">
                      <span>Phase 4: Inspection & Bribery</span>
                    </h3>
                    <span className="text-[10px] text-parchment/50 font-display uppercase">The Climax</span>
                  </div>
                  <p className="text-xs text-parchment/85 leading-relaxed font-body">
                    The Sheriff receives all declared bags and decides their fate one by one in any order. The Sheriff may threaten to open a bag to solicit bribes.
                    All players can propose bribes and cut deals at the same time—even paying to have rivals inspected! (See Chapter 3 for deep details).
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: INSPECTION & FINES */}
            {activeTab === 2 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-xs text-parchment/80 font-body leading-relaxed">
                  When the Sheriff chooses to resolve a bag, there are three possible branches:
                </div>

                {/* Branch 1: Passed */}
                <div className="bg-[#1f140d] border-2 border-emerald-600/50 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black text-sm text-emerald-400 flex items-center gap-2">
                      <span>🛡️ Branch 1: Handed Back Unopened (Passed)</span>
                    </span>
                    <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded text-emerald-300 font-bold border border-emerald-600">
                      Safe Passage
                    </span>
                  </div>
                  <p className="text-xs text-parchment/90 font-body leading-relaxed">
                    The Sheriff decides not to open your bag. All cards inside enter the city safely:
                  </p>
                  <ul className="list-disc list-inside text-xs text-parchment/80 space-y-1 pl-1 font-body">
                    <li><strong className="text-emerald-300">Legal Goods:</strong> Placed face-up in your stand's legal bins.</li>
                    <li><strong className="text-purple-300">Contraband:</strong> Placed face-down at the top of your stand. The count is public, but card identities remain hidden until end-game scoring!</li>
                    <li>No penalties or fines are paid by either party.</li>
                  </ul>
                </div>

                {/* Branch 2: Honest */}
                <div className="bg-[#1f140d] border-2 border-gold/60 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black text-sm text-gold flex items-center gap-2">
                      <span>✓ Branch 2: Inspected & 100% Honest</span>
                    </span>
                    <span className="text-[10px] bg-[#2a1d13] px-2 py-0.5 rounded text-gold font-bold border border-gold">
                      Sheriff Pays You!
                    </span>
                  </div>
                  <p className="text-xs text-parchment/90 font-body leading-relaxed">
                    The Sheriff opens your bag and finds that you told the complete truth: every card matches your declaration!
                  </p>
                  <div className="bg-[#2a1d13] p-3 rounded-xl border border-gold/30 text-xs font-body space-y-1">
                    <div className="text-gold font-bold">The Sheriff was Wrong:</div>
                    <div>
                      The Sheriff must pay <strong>YOU</strong> gold equal to the <strong>Penalty (🛡️)</strong> on every single card in your bag!
                      (e.g., inspecting 4 honest Apples with 2 penalty each forces the Sheriff to pay you <strong>8 Gold</strong>!).
                    </div>
                  </div>
                  <p className="text-xs text-parchment/80 font-body">
                    All declared cards are placed face-up in your merchant stand.
                  </p>
                </div>

                {/* Branch 3: Dishonest */}
                <div className="bg-[#1f140d] border-2 border-crimson/70 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black text-sm text-red-400 flex items-center gap-2">
                      <span>✕ Branch 3: Inspected & Caught Lying</span>
                    </span>
                    <span className="text-[10px] bg-red-950 px-2 py-0.5 rounded text-red-300 font-bold border border-red-600">
                      Merchant Pays Fine!
                    </span>
                  </div>
                  <p className="text-xs text-parchment/90 font-body leading-relaxed">
                    The Sheriff opens your bag and discovers contraband or legal goods that don't match your declaration:
                  </p>
                  <ul className="list-disc list-inside text-xs text-parchment/80 space-y-1.5 pl-1 font-body">
                    <li><strong className="text-emerald-300">Declared Goods Kept:</strong> Any cards that genuinely match what you declared go to your stand.</li>
                    <li><strong className="text-red-400">Undeclared Goods Confiscated:</strong> All contraband and wrong-type legal goods are permanently discarded into the discard pile!</li>
                    <li><strong className="text-gold">Fines Paid:</strong> You must immediately pay the Sheriff gold equal to the Penalty (🛡️) on every confiscated card!</li>
                  </ul>
                </div>

                {/* Statutory Debt Liquidation */}
                <div className="bg-[#24170f] border border-gold/40 rounded-2xl p-4 space-y-2">
                  <div className="font-display font-bold text-xs text-gold uppercase tracking-wider">
                    ⚖️ Statutory Liquidation Order (Bankruptcy Rule)
                  </div>
                  <p className="text-xs text-parchment/80 font-body">
                    If you do not have enough gold to pay a fine, Nottingham law automatically liquidates your assets in strict order:
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-display pt-1">
                    <div className="p-2 rounded-xl bg-[#140e0a] border border-gold/30">
                      <span className="block text-sm">🪙</span>
                      <span className="font-bold text-gold">1. Gold Coins</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#140e0a] border border-emerald/40">
                      <span className="block text-sm">🍎</span>
                      <span className="font-bold text-emerald-400">2. Legal Goods</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#140e0a] border border-red-500/40">
                      <span className="block text-sm">⚜️</span>
                      <span className="font-bold text-red-400">3. Contraband</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#140e0a] border border-parchment/30">
                      <span className="block text-sm">📜</span>
                      <span className="font-bold text-parchment/70">4. Debt Wiped</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BRIBERY & DEALS */}
            {activeTab === 3 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="bg-[#24170f] border-2 border-gold/50 rounded-2xl p-5 space-y-2">
                  <h3 className="font-display font-black text-sm text-gold uppercase tracking-wide flex items-center gap-2">
                    <span>🤝 All-Players, All-Bags Concurrent Negotiation</span>
                  </h3>
                  <p className="text-xs text-parchment/85 leading-relaxed font-body">
                    In the digital 2nd Edition, negotiation is <strong>not</strong> a private 1-on-1 chat! All players can propose bribes, counter-offer, and negotiate at the exact same time during Phase 4.
                    Offers appear live in the <strong>Bribe Ledger</strong> for everyone to witness.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1f140d] border border-gold/30 rounded-2xl p-4 space-y-2">
                    <div className="font-display font-bold text-xs text-gold flex items-center gap-1.5">
                      <span>✓ What You CAN Offer in a Bribe:</span>
                    </div>
                    <ul className="text-xs text-parchment/80 space-y-1 pl-1 font-body">
                      <li>• <strong>Gold:</strong> Any amount up to your current treasury.</li>
                      <li>• <strong>Legal Goods from Stand:</strong> Goods already in your market stall.</li>
                      <li>• <strong>Contraband from Stand:</strong> Face-down contraband in your stall.</li>
                      <li>• <strong>Goods in your Bag:</strong> Items currently inside your sealed pouch!</li>
                      <li>• <strong>Future Favors:</strong> Flavor promises (not legally binding).</li>
                    </ul>
                  </div>

                  <div className="bg-[#1f140d] border border-red-500/30 rounded-2xl p-4 space-y-2">
                    <div className="font-display font-bold text-xs text-red-400 flex items-center gap-1.5">
                      <span>✕ What You CANNOT Offer:</span>
                    </div>
                    <ul className="text-xs text-parchment/80 space-y-1.5 pl-1 font-body">
                      <li>• <strong>Cards in Hand:</strong> Cards still in your merchant hand can <span className="underline font-bold text-red-300">never</span> be offered or transferred as a bribe.</li>
                      <li>• <strong>More Gold than you own:</strong> You cannot promise non-existent coins.</li>
                    </ul>
                  </div>
                </div>

                {/* Cross-Bag Rival Bribes */}
                <div className="bg-[#1f140d] border-2 border-purple-500/50 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display font-black text-sm text-purple-300 flex items-center gap-2">
                      <span>🎯 Cross-Bag Rival Bribes (The Power Move)</span>
                    </h4>
                    <span className="text-[10px] bg-purple-950 px-2 py-0.5 rounded text-purple-300 border border-purple-500 font-bold">
                      Sabotage
                    </span>
                  </div>
                  <p className="text-xs text-parchment/85 font-body leading-relaxed">
                    You do not have to limit bribes to your own bag! Any merchant can click <strong className="text-gold">"🤝 Offer"</strong> on <em>another player's stand</em> to bribe the Sheriff to force-inspect that merchant!
                  </p>
                  <div className="bg-[#27152b] p-3 rounded-xl border border-purple-400/40 text-xs font-body text-purple-100">
                    <strong>Tabletop Example:</strong> Will Scarlet notices Little John loaded 5 suspicious goods.
                    Will offers the Sheriff 10 Gold on condition: <em>"Force Inspect Little John's bag!"</em>
                    If the Sheriff accepts, a brass gavel locks onto Little John's stand. When his bag comes up, the Sheriff is legally bound to inspect it!
                  </div>
                </div>

                {/* Binding Commitments & Honor Among Thieves */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#1f140d] border border-[#3e2b1d] rounded-2xl p-4 space-y-1.5">
                    <div className="font-display font-bold text-xs text-gold flex items-center gap-1.5">
                      <span>🔨 Binding Commitments</span>
                    </div>
                    <p className="text-xs text-parchment/80 font-body leading-normal">
                      The moment the Sheriff accepts an offer (stamped with <strong>DEAL</strong>), the agreement is binding for that round.
                      The Sheriff cannot take a bribe to pass a bag and then decide to open it anyway!
                    </p>
                  </div>

                  <div className="bg-[#1f140d] border border-[#3e2b1d] rounded-2xl p-4 space-y-1.5">
                    <div className="font-display font-bold text-xs text-gold flex items-center gap-1.5">
                      <span>🏴‍☠️ Honor Among Thieves</span>
                    </div>
                    <p className="text-xs text-parchment/80 font-body leading-normal">
                      If you promised secret stand contraband or bag cards that turn out not to exist, that phantom promise is simply <strong>voided with 0 penalty</strong>.
                      Only genuine items are transferred to the Sheriff!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: GOODS & SCORING */}
            {activeTab === 4 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div>
                  <h3 className="font-display font-bold text-sm text-gold uppercase tracking-wider mb-2">
                    Legal Goods & King/Queen Bonuses
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-2xl bg-[#14532d] border-2 border-emerald-500 shadow-md flex flex-col items-center text-center">
                      <span className="text-3xl">🍎</span>
                      <span className="font-display font-black text-sm text-parchment mt-1">Apple</span>
                      <span className="text-xs text-gold font-bold">🪙 2 Value</span>
                      <span className="text-[11px] text-emerald-200">🛡️ 2 Penalty</span>
                      <div className="mt-2 pt-2 border-t border-emerald-400/30 w-full text-[10px] text-emerald-100">
                        <div>👑 King: <strong>+20g</strong></div>
                        <div>👸 Queen: <strong>+10g</strong></div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#78350f] border-2 border-amber-400 shadow-md flex flex-col items-center text-center">
                      <span className="text-3xl">🧀</span>
                      <span className="font-display font-black text-sm text-parchment mt-1">Cheese</span>
                      <span className="text-xs text-gold font-bold">🪙 3 Value</span>
                      <span className="text-[11px] text-amber-200">🛡️ 2 Penalty</span>
                      <div className="mt-2 pt-2 border-t border-amber-400/30 w-full text-[10px] text-amber-100">
                        <div>👑 King: <strong>+15g</strong></div>
                        <div>👸 Queen: <strong>+10g</strong></div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#7c2d12] border-2 border-orange-500 shadow-md flex flex-col items-center text-center">
                      <span className="text-3xl">🍞</span>
                      <span className="font-display font-black text-sm text-parchment mt-1">Bread</span>
                      <span className="text-xs text-gold font-bold">🪙 3 Value</span>
                      <span className="text-[11px] text-orange-200">🛡️ 2 Penalty</span>
                      <div className="mt-2 pt-2 border-t border-orange-400/30 w-full text-[10px] text-orange-100">
                        <div>👑 King: <strong>+15g</strong></div>
                        <div>👸 Queen: <strong>+10g</strong></div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#0f4c81] border-2 border-sky-400 shadow-md flex flex-col items-center text-center">
                      <span className="text-3xl">🍗</span>
                      <span className="font-display font-black text-sm text-parchment mt-1">Chicken</span>
                      <span className="text-xs text-gold font-bold">🪙 4 Value</span>
                      <span className="text-[11px] text-sky-200">🛡️ 2 Penalty</span>
                      <div className="mt-2 pt-2 border-t border-sky-400/30 w-full text-[10px] text-sky-100">
                        <div>👑 King: <strong>+10g</strong></div>
                        <div>👸 Queen: <strong>+5g</strong></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-sm text-red-400 uppercase tracking-wider mb-2">
                    Contraband Goods (High Profit, High Risk)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-2xl bg-[#7f1d1d] border-2 border-red-500 shadow-md flex flex-col items-center text-center">
                      <span className="text-3xl">🌶️</span>
                      <span className="font-display font-black text-sm text-parchment mt-1">Pepper</span>
                      <span className="text-xs text-gold font-bold">🪙 6 Value</span>
                      <span className="text-[11px] text-red-200">🛡️ 4 Penalty</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#7f1d1d] border-2 border-red-500 shadow-md flex flex-col items-center text-center">
                      <span className="text-3xl">🍺</span>
                      <span className="font-display font-black text-sm text-parchment mt-1">Mead</span>
                      <span className="text-xs text-gold font-bold">🪙 7 Value</span>
                      <span className="text-[11px] text-red-200">🛡️ 4 Penalty</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#7f1d1d] border-2 border-red-500 shadow-md flex flex-col items-center text-center">
                      <span className="text-3xl">🧵</span>
                      <span className="font-display font-black text-sm text-parchment mt-1">Silk</span>
                      <span className="text-xs text-gold font-bold">🪙 8 Value</span>
                      <span className="text-[11px] text-red-200">🛡️ 4 Penalty</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#7f1d1d] border-2 border-red-500 shadow-md flex flex-col items-center text-center">
                      <span className="text-3xl">⚔️</span>
                      <span className="font-display font-black text-sm text-parchment mt-1">Crossbow</span>
                      <span className="text-xs text-gold font-bold">🪙 9 Value</span>
                      <span className="text-[11px] text-red-200">🛡️ 4 Penalty</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1f140d] border border-gold/30 rounded-2xl p-4 space-y-2">
                  <div className="font-display font-bold text-xs text-gold uppercase tracking-wider">
                    🏆 How Final Score is Calculated:
                  </div>
                  <div className="text-xs text-parchment/85 font-body space-y-1">
                    <div>1. <strong>Cash Purse:</strong> 1 Point for every 1 Gold coin in your purse.</div>
                    <div>2. <strong>Legal Goods:</strong> Face-value score for every legal good on your stand.</div>
                    <div>3. <strong>Contraband:</strong> Face-value score for all smuggled contraband.</div>
                    <div>4. <strong>King Bonuses:</strong> Highest count in Apples (+20), Cheese (+15), Bread (+15), Chicken (+10).</div>
                    <div>5. <strong>Queen Bonuses:</strong> 2nd highest count in Apples (+10), Cheese (+10), Bread (+10), Chicken (+5).</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: TACTICS & BLUFFING */}
            {activeTab === 5 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1f140d] border border-gold/40 rounded-2xl p-4 space-y-2">
                    <div className="font-display font-bold text-xs text-gold flex items-center gap-1.5">
                      <span>🎣 Tactic 1: The Honest Bait</span>
                    </div>
                    <p className="text-xs text-parchment/80 font-body leading-relaxed">
                      Pack 5 honest Apples into your bag. Feign nervousness and stall. When the Sheriff threatens to inspect, offer a meager 1 gold bribe.
                      An aggressive Sheriff will smell blood, reject your bribe, and snap the bag open—only to be forced to pay you <strong>10 Gold in penalties</strong>!
                    </p>
                  </div>

                  <div className="bg-[#1f140d] border border-purple-400/40 rounded-2xl p-4 space-y-2">
                    <div className="font-display font-bold text-xs text-purple-300 flex items-center gap-1.5">
                      <span>🍯 Tactic 2: The Sweetener</span>
                    </div>
                    <p className="text-xs text-parchment/80 font-body leading-relaxed">
                      Load 3 Bread and 1 Silk. Declare 4 Bread. Immediately offer the Sheriff 3 gold to pass you without inspection.
                      If the Sheriff accepts, you keep your 3 Bread (9g) + 1 Silk (8g) = 17g value for a tiny 3g fee!
                    </p>
                  </div>

                  <div className="bg-[#1f140d] border border-emerald-400/40 rounded-2xl p-4 space-y-2">
                    <div className="font-display font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                      <span>👑 Tactic 3: King Hunting</span>
                    </div>
                    <p className="text-xs text-parchment/80 font-body leading-relaxed">
                      Pay close attention to who is competing for the Apple King (+20g). If you can squeeze just one more Apple onto your stand than your nearest rival, you flip a 20-point swing in your favor at game end!
                    </p>
                  </div>

                  <div className="bg-[#1f140d] border border-red-500/40 rounded-2xl p-4 space-y-2">
                    <div className="font-display font-bold text-xs text-red-400 flex items-center gap-1.5">
                      <span>🕵️ Tactic 4: The Sheriff's Shakedown</span>
                    </div>
                    <p className="text-xs text-parchment/80 font-body leading-relaxed">
                      When you are Sheriff, threaten every merchant bag. Even if you don't intend to inspect, threatening costs you nothing and often panics merchants into parting with 2–4 gold in bribes!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-6 py-3 bg-[#170f0a] border-t border-[#3d2a1b] shrink-0 text-xs text-parchment/60 font-display">
            <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-[#2a1d13] text-gold border border-gold/40">?</kbd> anytime to open the Codex</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab((prev) => Math.max(0, prev - 1))}
                disabled={activeTab === 0}
                className="px-2.5 py-1 rounded bg-[#24170f] border border-[#3e2b1d] text-parchment/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                ← Prev
              </button>
              <span className="text-gold font-bold">
                Chapter {activeTab + 1} of {CHAPTERS.length}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab((prev) => Math.min(CHAPTERS.length - 1, prev + 1))}
                disabled={activeTab === CHAPTERS.length - 1}
                className="px-2.5 py-1 rounded bg-[#24170f] border border-[#3e2b1d] text-parchment/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
