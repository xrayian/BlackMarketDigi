import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { CoinPile } from './CoinPile';
import { Card3D } from './Card3D';
import { MerchantBag3D, getPlayerColor } from './MerchantBag3D';
import type { ClientPlayer } from '../../state/gameStore';

interface MerchantStandProps {
  player: ClientPlayer;
  isLocalPlayer?: boolean;
  isActiveTurn?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export function MerchantStand({
  player,
  isLocalPlayer = false,
  isActiveTurn = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: MerchantStandProps) {
  // Wood stand materials
  const woodMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2a1a10',
        roughness: 0.7,
        metalness: 0.1,
      }),
    []
  );

  const trimMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isActiveTurn ? '#f59e0b' : '#8c6d37',
        roughness: 0.35,
        metalness: 0.7,
        emissive: isActiveTurn ? '#d97706' : '#000000',
        emissiveIntensity: isActiveTurn ? 0.3 : 0,
      }),
    [isActiveTurn]
  );

  const waxSealMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#881337',
        roughness: 0.4,
        metalness: 0.2,
      }),
    []
  );

  // Group legal goods by goodType
  const legalGoodsCounts = useMemo(() => {
    const counts: Record<string, number> = {
      APPLE: 0,
      CHEESE: 0,
      BREAD: 0,
      CHICKEN: 0,
    };
    for (const card of player.standLegal) {
      if (card.goodType && counts[card.goodType] !== undefined) {
        counts[card.goodType]++;
      }
    }
    return counts;
  }, [player.standLegal]);

  const legalSlots = [
    { type: 'APPLE', label: 'Apples', icon: '🍎', color: '#c53030', x: -0.36, count: legalGoodsCounts['APPLE'] },
    { type: 'CHEESE', label: 'Cheese', icon: '🧀', color: '#d69e2e', x: -0.06, count: legalGoodsCounts['CHEESE'] },
    { type: 'BREAD', label: 'Bread', icon: '🍞', color: '#dd6b20', x: 0.24, count: legalGoodsCounts['BREAD'] },
    { type: 'CHICKEN', label: 'Chicken', icon: '🍗', color: '#3182ce', x: 0.54, count: legalGoodsCounts['CHICKEN'] },
  ];

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Base Merchant Stall Wooden Board */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow material={woodMaterial}>
        <boxGeometry args={[2.3, 0.08, 1.4]} />
      </mesh>

      {/* Decorative brass trim edges */}
      <mesh position={[0, 0.085, -0.68]} castShadow material={trimMaterial}>
        <boxGeometry args={[2.32, 0.03, 0.04]} />
      </mesh>
      <mesh position={[0, 0.085, 0.68]} castShadow material={trimMaterial}>
        <boxGeometry args={[2.32, 0.03, 0.04]} />
      </mesh>

      {/* Floating Header Banner / Nameplate */}
      <Html position={[0, 0.8, -0.7]} center distanceFactor={9}>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border backdrop-blur-md shadow-xl transition-all duration-300 pointer-events-none select-none whitespace-nowrap ${
          isActiveTurn
            ? 'bg-gold/20 border-gold text-gold ring-2 ring-gold/40'
            : isLocalPlayer
            ? 'bg-tavern-bg/90 border-emerald/60 text-emerald'
            : 'bg-tavern-bg/85 border-tavern-border text-parchment'
        }`}>
          {player.isSheriff && (
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gold/30 text-gold font-bold">
              ⭐ Sheriff
            </span>
          )}
          {player.isDeputy && (
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 font-bold">
              🛡️ Deputy
            </span>
          )}
          <span className="font-display font-bold text-sm tracking-wide">
            {player.name} {isLocalPlayer && '(You)'}
          </span>
          <span className={`w-2 h-2 rounded-full ${player.connected ? 'bg-emerald' : 'bg-crimson'}`} />
        </div>
      </Html>

      {/* Coin Pile Section (Left side of stand) */}
      <CoinPile gold={player.gold} position={[-0.85, 0.08, 0.1]} scale={1.1} />

      {/* Faceup Legal Goods Section (Middle of stand) */}
      {legalSlots.map((slot) => (
        <group key={slot.type} position={[slot.x, 0.08, 0.05]}>
          {/* Card slot indicator outline */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
            <planeGeometry args={[0.26, 0.38]} />
            <meshBasicMaterial color={slot.count > 0 ? slot.color : '#1a1410'} opacity={slot.count > 0 ? 0.35 : 0.15} transparent />
          </mesh>

          {/* Render physical card stack when goods are placed */}
          {slot.count > 0 && (
            <>
              {Array.from({ length: Math.min(slot.count, 4) }).map((_, idx) => (
                <Card3D
                  key={idx}
                  name={slot.label}
                  classification="LEGAL"
                  goodType={slot.type}
                  faceUp={true}
                  position={[0, 0.015 + idx * 0.015, -idx * 0.01]}
                  scale={0.42}
                />
              ))}

              <Html position={[0, 0.28, 0.12]} center distanceFactor={8}>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-tavern-bg/95 border border-gold/40 text-parchment font-display text-[11px] font-bold shadow-md select-none whitespace-nowrap">
                  <span>{slot.icon}</span>
                  <span>{slot.count}</span>
                </div>
              </Html>
            </>
          )}
        </group>
      ))}

      {/* Facedown Wax-Sealed Contraband Section (Top Right of stand) */}
      <group position={[0.88, 0.08, -0.2]}>
        {player.standContrabandCount > 0 ? (
          <>
            {/* Stack of facedown contraband cards */}
            {Array.from({ length: Math.min(player.standContrabandCount, 4) }).map((_, idx) => (
              <Card3D
                key={idx}
                classification="CONTRABAND"
                faceUp={false}
                position={[0, 0.015 + idx * 0.015, -idx * 0.01]}
                scale={0.42}
              />
            ))}

            {/* Red Wax Seal Medallion on top of stack */}
            <mesh position={[0, 0.03 + Math.min(player.standContrabandCount, 4) * 0.015, 0]} castShadow material={waxSealMaterial}>
              <cylinderGeometry args={[0.09, 0.09, 0.02, 16]} />
            </mesh>

            {/* Contraband Count Tag */}
            <Html position={[0, 0.28, 0.12]} center distanceFactor={8}>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-crimson/90 border border-gold/60 text-white font-display text-[11px] font-bold shadow-lg select-none whitespace-nowrap">
                <span>⚜️</span>
                <span>{player.standContrabandCount}</span>
              </div>
            </Html>
          </>
        ) : (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
            <planeGeometry args={[0.26, 0.38]} />
            <meshBasicMaterial color="#1a1410" opacity={0.15} transparent />
          </mesh>
        )}
      </group>

      {/* Royal Goods Section (Bottom Right of stand) */}
      {(player.standRoyalCount > 0 || (isLocalPlayer && player.standRoyal.length > 0)) && (
        <group position={[0.88, 0.08, 0.25]}>
          {Array.from({ length: Math.min(player.standRoyalCount || player.standRoyal.length, 4) }).map((_, idx) => (
            <Card3D
              key={idx}
              classification="ROYAL"
              faceUp={false}
              position={[0, 0.015 + idx * 0.015, -idx * 0.01]}
              scale={0.42}
            />
          ))}

          {/* Purple Royal Seal Medallion */}
          <mesh position={[0, 0.03 + Math.min(player.standRoyalCount || player.standRoyal.length, 4) * 0.015, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.02, 16]} />
            <meshStandardMaterial color="#581c87" roughness={0.3} metalness={0.4} />
          </mesh>

          {/* Royal Count Tag */}
          <Html position={[0, 0.28, 0.12]} center distanceFactor={8}>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-900/90 border border-gold/60 text-gold-light font-display text-[11px] font-bold shadow-lg select-none whitespace-nowrap">
              <span>👑</span>
              <span>{player.standRoyalCount || player.standRoyal.length}</span>
            </div>
          </Html>
        </group>
      )}

      {/* Merchant Bag (Pouch) in front of the stand */}
      <MerchantBag3D
        color={getPlayerColor(player.seatIndex)}
        isSnapped={player.sealedBag?.isSnapped}
        cardCount={player.sealedBag?.cardCount || 0}
        declaredGood={player.sealedBag?.declaredGood}
        declaredCount={player.sealedBag?.declaredCount}
        isRevealed={player.sealedBag?.isRevealed}
        position={[0, 0.02, 0.95]}
        scale={1}
      />
    </group>
  );
}
