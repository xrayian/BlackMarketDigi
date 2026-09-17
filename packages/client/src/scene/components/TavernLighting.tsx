import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function TavernLighting() {
  const lanternRef = useRef<THREE.PointLight>(null);
  const fireplaceRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Natural tavern chandelier / lantern candle flicker
    if (lanternRef.current) {
      lanternRef.current.intensity = 1.35 + Math.sin(t * 7.2) * 0.12 + Math.cos(t * 13.1) * 0.08;
    }

    // Warm fireplace ambient glow pulse
    if (fireplaceRef.current) {
      fireplaceRef.current.intensity = 1.0 + Math.sin(t * 4.5) * 0.18 + Math.sin(t * 9.7) * 0.1;
    }
  });

  return (
    <group>
      {/* Soft warm tavern ambient fill */}
      <ambientLight color="#fff1e0" intensity={0.45} />

      {/* Main Overhead Tavern Chandelier / Lantern Light */}
      <pointLight
        ref={lanternRef}
        position={[0, 4.2, 0]}
        color="#ffaa44"
        intensity={1.4}
        distance={16}
        decay={1.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.001}
      />

      {/* Decorative lantern model above the table */}
      <group position={[0, 4.2, 0]}>
        {/* Brass lantern cap */}
        <mesh position={[0, 0.2, 0]}>
          <coneGeometry args={[0.3, 0.25, 16]} />
          <meshStandardMaterial color="#8c6d37" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Warm glowing flame inside */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color="#ffcc66" />
        </mesh>
      </group>

      {/* Directional Key Light (Moonlight/Window rim light) */}
      <directionalLight
        position={[6, 8, 5]}
        color="#fff5e6"
        intensity={0.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Cozy Fireplace Glow from side wall */}
      <pointLight
        ref={fireplaceRef}
        position={[-8, 2, -5]}
        color="#ff5511"
        intensity={1.0}
        distance={22}
        decay={2}
      />
    </group>
  );
}
