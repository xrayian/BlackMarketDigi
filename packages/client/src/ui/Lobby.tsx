import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../state/gameStore';
import { network } from '../net/colyseus';

type ViewState = 'menu' | 'create' | 'join' | 'room';

export function Lobby() {
  const [view, setView] = useState<ViewState>('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const store = useGameStore();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      await network.createRoom(playerName);
      setView('room');
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = playerName.trim();
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanName || !cleanCode) return;
    
    setLoading(true);
    setError('');
    try {
      await network.joinRoom(cleanCode, cleanName);
      setView('room');
    } catch (err: any) {
      setError(err.message || 'Caravan not found. Verify the room code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReady = () => {
    network.send('ready');
  };

  const renderMenu = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-4 w-full max-w-sm"
    >
      <button onClick={() => setView('create')} className="btn-gold">
        Create Game
      </button>
      <button onClick={() => setView('join')} className="btn-outline">
        Join Game
      </button>
    </motion.div>
  );

  const renderCreate = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-md card-surface p-8"
    >
      <h2 className="text-2xl font-display text-gold mb-6 text-center">Establish Trade</h2>
      <form onSubmit={handleCreate} className="flex flex-col gap-6">
        <div>
          <label className="block text-gold-muted text-sm mb-2 font-display">Merchant Name</label>
          <input
            type="text"
            className="input-field"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name..."
            autoFocus
            maxLength={16}
          />
        </div>
        {error && <div className="text-crimson text-sm">{error}</div>}
        <div className="flex gap-4 mt-4">
          <button type="button" onClick={() => setView('menu')} className="btn-outline flex-1">
            Back
          </button>
          <button type="submit" disabled={!playerName.trim() || loading} className="btn-gold flex-1">
            {loading ? 'Preparing...' : 'Create'}
          </button>
        </div>
      </form>
    </motion.div>
  );

  const renderJoin = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-md card-surface p-8"
    >
      <h2 className="text-2xl font-display text-gold mb-6 text-center">Join Caravan</h2>
      <form onSubmit={handleJoin} className="flex flex-col gap-6">
        <div>
          <label className="block text-gold-muted text-sm mb-2 font-display">Merchant Name</label>
          <input
            type="text"
            className="input-field mb-4"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name..."
            autoFocus
            maxLength={16}
          />
          <label className="block text-gold-muted text-sm mb-2 font-display">Room Code</label>
          <input
            type="text"
            className="input-field uppercase tracking-widest font-mono font-bold"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="e.g. 4-LETTER CODE"
            maxLength={16}
          />
        </div>
        {error && <div className="text-crimson text-sm">{error}</div>}
        <div className="flex gap-4 mt-4">
          <button type="button" onClick={() => setView('menu')} className="btn-outline flex-1">
            Back
          </button>
          <button type="submit" disabled={!playerName.trim() || !roomCode.trim() || loading} className="btn-gold flex-1">
            {loading ? 'Approaching...' : 'Join'}
          </button>
        </div>
      </form>
    </motion.div>
  );

  const renderRoom = () => {
    const players = Array.from(store.players.values());
    const isHost = players.length > 0 && players[0]?.id === store.localPlayerId;
    const me = store.players.get(store.localPlayerId || '');

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl card-surface p-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-sm font-display text-gold-muted tracking-widest uppercase mb-2">Room Code</h2>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-display text-gold tracking-widest select-all font-mono font-bold">{store.roomId}</span>
            <button
              type="button"
              onClick={() => {
                if (store.roomId) navigator.clipboard.writeText(store.roomId);
              }}
              className="text-xs px-3 py-1.5 rounded-md border border-gold-muted/40 text-gold-muted hover:text-gold hover:border-gold transition-colors font-display tracking-wider uppercase"
              title="Copy room code"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {players.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4 rounded-lg bg-tavern-bg border border-tavern-border">
              <span className="font-display text-lg text-parchment">
                {p.name} {p.id === store.localPlayerId ? '(You)' : ''}
              </span>
              <span className={`text-sm px-3 py-1 rounded-full font-bold ${p.ready ? 'bg-emerald/20 text-emerald' : 'bg-tavern-surface text-gold-muted'}`}>
                {p.ready ? 'Ready' : 'Not Ready'}
              </span>
            </div>
          ))}
          {players.length === 0 && <div className="text-center text-gold-muted">Waiting for merchants...</div>}
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={async () => {
              await network.leave();
              setView('menu');
            }}
            className="btn-outline"
          >
            Leave
          </button>
          <button onClick={handleToggleReady} className={me?.ready ? 'btn-outline' : 'btn-gold'}>
            {me?.ready ? 'Not Ready' : 'Ready'}
          </button>
          {isHost && (
            <button
              onClick={() => network.send('startGame')}
              disabled={players.length < 3 || !players.every(p => p.ready)}
              className="btn-gold disabled:opacity-50"
            >
              Start Game
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-tavern-bg text-parchment bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-tavern-surface to-tavern-bg p-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl md:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-gold-light via-gold to-gold-dark filter drop-shadow-lg mb-4">
          Sheriff of Nottingham
        </h1>
        <p className="text-xl font-display text-gold-muted italic tracking-wide">
          A Game of Bluffing & Bribery
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {view === 'menu' && renderMenu()}
        {view === 'create' && renderCreate()}
        {view === 'join' && renderJoin()}
        {view === 'room' && renderRoom()}
      </AnimatePresence>
    </div>
  );
}
