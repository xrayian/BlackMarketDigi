import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface MerchantBag3DProps {
  color?: string;
  isSnapped?: boolean;
  cardCount?: number;
  declaredGood?: string;
  declaredCount?: number;
  isRevealed?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onClick?: () => void;
}

const SEAT_COLORS = [
  '#991b1b', // Seat 0: Crimson Red
  '#166534', // Seat 1: Forest Green
  '#1e40af', // Seat 2: Royal Blue
  '#b45309', // Seat 3: Warm Ochre
  '#6b21a8', // Seat 4: Deep Purple
  '#1f2937', // Seat 5: Midnight Charcoal
];

export function getPlayerColor(seatIndex: number): string {
  return SEAT_COLORS[seatIndex % SEAT_COLORS.length];
}

export function MerchantBag3D({
  color = '#991b1b',
  isSnapped = false,
  cardCount = 0,
  declaredGood = '',
  declaredCount = 0,
  isRevealed = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  onClick,
}: MerchantBag3DProps) {
  const bagMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.75,
        metalness: 0.1,
      }),
    [color]
  );

  const trimMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#c5a059',
        roughness: 0.35,
        metalness: 0.7,
      }),
    []
  );

  const claspMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isSnapped ? '#f59e0b' : '#9ca3af',
        roughness: 0.2,
        metalness: 0.85,
      }),
    [isSnapped]
  );

  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      {/* Lower rounded bag body */}
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow material={bagMaterial}>
        <sphereGeometry args={[0.26, 24, 16]} />
      </mesh>

      {/* Mid body (stretched cylinder with bulge) */}
      <mesh position={[0, 0.24, 0]} castShadow receiveShadow material={bagMaterial}>
        <cylinderGeometry args={[0.2, 0.25, 0.22, 24]} />
      </mesh>

      {/* Cinch collar ring */}
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow material={trimMaterial}>
        <torusGeometry args={[0.18, 0.025, 16, 32]} />
      </mesh>

      {/* Flared top ruffle */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow material={bagMaterial}>
        <cylinderGeometry args={[0.22, 0.15, 0.12, 24, 1, true]} />
      </mesh>

      {/* Metallic snap button clasp on the front */}
      <mesh position={[0, 0.28, 0.22]} rotation={[Math.PI / 2, 0, 0]} castShadow material={claspMaterial}>
        <cylinderGeometry args={[0.045, 0.045, 0.025, 16]} />
      </mesh>

      {/* Status Badges */}
      <Html position={[0, 0.55, 0]} center distanceFactor={7}>
        <div className="flex flex-col items-center gap-1 pointer-events-none select-none">
          {isSnapped && !declaredGood && (
            <span className="px-2 py-0.5 text-[11px] font-display font-bold rounded-full bg-crimson/90 border border-gold/60 text-parchment shadow-md whitespace-nowrap animate-pulse">
              🔒 SNAPPED ({cardCount})
            </span>
          )}

          {declaredGood && (
            <div className="px-2.5 py-1 rounded-md bg-tavern-bg/95 border border-gold text-gold font-display text-xs shadow-xl backdrop-blur-sm whitespace-nowrap flex items-center gap-1.5">
              <span>📜</span>
              <span className="font-bold">
                {declaredCount} {declaredGood}
              </span>
            </div>
          )}

          {isRevealed && (
            <span className="px-2 py-0.5 text-[10px] font-display font-bold rounded-full bg-emerald/90 text-white shadow-md uppercase tracking-wider">
              Revealed
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}
