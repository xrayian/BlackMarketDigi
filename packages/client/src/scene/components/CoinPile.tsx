import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface CoinPileProps {
  gold: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

const COIN_RADIUS = 0.08;
const COIN_HEIGHT = 0.022;
const MAX_INSTANCES = 50;

export function CoinPile({
  gold = 50,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: CoinPileProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Determine number of physical coins to display (up to MAX_INSTANCES)
  // E.g. 50 gold -> ~25 coins (each 3D coin roughly represents 2 gold)
  const coinCount = useMemo(() => {
    if (gold <= 0) return 0;
    return Math.min(MAX_INSTANCES, Math.max(1, Math.round(gold / 2)));
  }, [gold]);

  // Compute transform matrices for coin stacks
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!meshRef.current || coinCount === 0) return;

    // Arrange coins into 1-4 neat mini stacks arranged organically
    const stackOffsets = [
      { x: 0, z: 0 },
      { x: COIN_RADIUS * 1.8, z: COIN_RADIUS * 0.4 },
      { x: -COIN_RADIUS * 1.5, z: COIN_RADIUS * 0.8 },
      { x: COIN_RADIUS * 0.2, z: -COIN_RADIUS * 1.7 },
    ];

    let currentCoin = 0;
    const coinsPerStack = Math.ceil(coinCount / stackOffsets.length);

    for (let s = 0; s < stackOffsets.length && currentCoin < coinCount; s++) {
      const offset = stackOffsets[s];
      const countInThisStack = Math.min(coinsPerStack, coinCount - currentCoin);

      for (let i = 0; i < countInThisStack; i++) {
        // Slight organic jitter so stacks look naturally placed
        const jitterX = (Math.sin(currentCoin * 9.1) * 0.008);
        const jitterZ = (Math.cos(currentCoin * 7.3) * 0.008);
        const rotY = (currentCoin * 0.45);

        dummy.position.set(
          offset.x + jitterX,
          i * COIN_HEIGHT + COIN_HEIGHT / 2,
          offset.z + jitterZ
        );
        dummy.rotation.set(0, rotY, 0);
        dummy.updateMatrix();

        meshRef.current.setMatrixAt(currentCoin, dummy.matrix);
        currentCoin++;
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [coinCount, dummy]);

  const coinGeometry = useMemo(
    () => new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, COIN_HEIGHT, 24),
    []
  );

  const coinMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e5a93c',
        metalness: 0.85,
        roughness: 0.22,
        envMapIntensity: 1.2,
      }),
    []
  );

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {coinCount > 0 && (
        <instancedMesh
          ref={meshRef}
          args={[coinGeometry, coinMaterial, coinCount]}
          castShadow
          receiveShadow
        />
      )}

      {/* Gold amount label badge */}
      <Html position={[0, 0.4, 0]} center distanceFactor={8}>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-tavern-bg/90 border border-gold/60 text-gold font-display font-bold text-xs shadow-lg backdrop-blur-sm pointer-events-none select-none whitespace-nowrap">
          <span>🪙</span>
          <span>{gold}</span>
        </div>
      </Html>
    </group>
  );
}
