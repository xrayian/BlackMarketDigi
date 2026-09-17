import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Card3D } from './Card3D';
import { MerchantStand } from './MerchantStand';
import type { ClientPlayer } from '../../state/gameStore';

interface TableProps {
  players: ClientPlayer[];
  localPlayerId: string | null;
  activeMerchantId: string | null;
  drawPileCount?: number;
  discardPileTop?: any;
}

const TABLE_RADIUS = 4.5;
const STAND_OFFSET_RADIUS = 3.6;

export function Table({
  players,
  localPlayerId,
  activeMerchantId,
  drawPileCount = 100,
  discardPileTop,
}: TableProps) {
  // Wood and Felt materials
  const woodMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2e1c11',
        roughness: 0.65,
        metalness: 0.12,
      }),
    []
  );

  const feltMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1c2820', // Dark tavern gaming green
        roughness: 0.85,
        metalness: 0.05,
      }),
    []
  );

  const rimMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8c6d37', // Polished brass trim
        roughness: 0.35,
        metalness: 0.75,
      }),
    []
  );

  const floorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#130e0a',
        roughness: 0.9,
        metalness: 0.05,
      }),
    []
  );

  // Determine local player seat index to orient the table
  const localPlayer = players.find((p) => p.id === localPlayerId);
  const localSeatIndex = localPlayer ? localPlayer.seatIndex : 0;
  const totalSeats = Math.max(players.length, 3);

  // Compute stand transforms for each player
  const playerTransforms = useMemo(() => {
    return players.map((player) => {
      // Angular offset: local player always sits at bottom / foreground (-Math.PI / 2)
      const seatDiff = player.seatIndex - localSeatIndex;
      const angle = (seatDiff / totalSeats) * Math.PI * 2 - Math.PI / 2;

      const x = Math.cos(angle) * STAND_OFFSET_RADIUS;
      const z = Math.sin(angle) * STAND_OFFSET_RADIUS;
      const rotY = -angle - Math.PI / 2;

      return {
        player,
        position: [x, 0.12, z] as [number, number, number],
        rotation: [0, rotY, 0] as [number, number, number],
        isLocal: player.id === localPlayerId,
        isActive: player.id === activeMerchantId,
      };
    });
  }, [players, localSeatIndex, totalSeats, localPlayerId, activeMerchantId]);

  return (
    <group position={[0, 0, 0]}>
      {/* Tavern Stone / Plank Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]} receiveShadow material={floorMaterial}>
        <planeGeometry args={[36, 36]} />
      </mesh>

      {/* Main Circular Wooden Tabletop */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow material={woodMaterial}>
        <cylinderGeometry args={[TABLE_RADIUS, TABLE_RADIUS, 0.24, 64]} />
      </mesh>

      {/* Raised Brass Beveled Rim */}
      <mesh position={[0, 0.125, 0]} castShadow receiveShadow material={rimMaterial}>
        <torusGeometry args={[TABLE_RADIUS - 0.08, 0.06, 16, 64]} />
      </mesh>

      {/* Center Inlaid Gaming Felt */}
      <mesh position={[0, 0.122, 0]} receiveShadow material={feltMaterial}>
        <cylinderGeometry args={[TABLE_RADIUS - 0.4, TABLE_RADIUS - 0.4, 0.01, 64]} />
      </mesh>

      {/* Table Central Pedestal Leg */}
      <mesh position={[0, -0.9, 0]} castShadow material={woodMaterial}>
        <cylinderGeometry args={[0.9, 1.3, 1.6, 32]} />
      </mesh>

      {/* Table Center Features: Draw Pile & Discard Pile */}
      <group position={[0, 0.13, 0]}>
        {/* Draw Pile (Deck of cards) */}
        <group position={[-0.75, 0, 0]}>
          {/* Card stack representation */}
          {Array.from({ length: Math.min(Math.ceil(drawPileCount / 15), 6) }).map((_, i) => (
            <Card3D
              key={i}
              faceUp={false}
              position={[0, i * 0.02, 0]}
              rotation={[0, (i * 0.03), 0]}
              scale={0.8}
            />
          ))}

          {/* Draw Pile Label */}
          <Html position={[0, 0.35, 0]} center distanceFactor={8}>
            <div className="flex flex-col items-center px-2 py-0.5 rounded bg-tavern-bg/95 border border-gold/40 text-gold font-display text-[11px] font-bold shadow-md select-none whitespace-nowrap">
              <span>DRAW PILE</span>
              <span className="text-white text-xs">{drawPileCount}</span>
            </div>
          </Html>
        </group>

        {/* Discard Pile */}
        <group position={[0.75, 0, 0]}>
          {discardPileTop ? (
            <Card3D
              name={discardPileTop.name}
              classification={discardPileTop.classification}
              goodType={discardPileTop.goodType}
              value={discardPileTop.value}
              penalty={discardPileTop.penalty}
              faceUp={true}
              position={[0, 0.02, 0]}
              scale={0.8}
            />
          ) : (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
              <planeGeometry args={[0.55, 0.78]} />
              <meshBasicMaterial color="#14100c" opacity={0.3} transparent />
            </mesh>
          )}

          <Html position={[0, 0.35, 0]} center distanceFactor={8}>
            <div className="px-2 py-0.5 rounded bg-tavern-bg/95 border border-gold/40 text-gold-muted font-display text-[11px] font-bold shadow-md select-none whitespace-nowrap">
              DISCARD
            </div>
          </Html>
        </group>
      </group>

      {/* Render all Merchant Stands positioned around the table */}
      {playerTransforms.map(({ player, position, rotation, isLocal, isActive }) => (
        <MerchantStand
          key={player.id}
          player={player}
          isLocalPlayer={isLocal}
          isActiveTurn={isActive}
          position={position}
          rotation={rotation}
        />
      ))}
    </group>
  );
}
