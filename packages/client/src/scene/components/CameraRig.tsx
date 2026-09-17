import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGameStore } from '../../state/gameStore';

interface CameraRigProps {
  controlsEnabled?: boolean;
}

export function CameraRig({ controlsEnabled = true }: CameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const phase = useGameStore((s) => s.phase);
  const activeMerchantId = useGameStore((s) => s.activeMerchantId);
  const isExamining = phase === 'INSPECTION' && !!activeMerchantId;

  const targetPos = useRef(new THREE.Vector3(0, 5.4, 6.8));
  const targetLook = useRef(new THREE.Vector3(0, 0.3, 0.4));

  useEffect(() => {
    // Initial camera setup
    camera.position.set(0, 5.4, 6.8);
    camera.lookAt(0, 0.3, 0.4);
  }, [camera]);

  useFrame((_, delta) => {
    const t = Math.min(delta * 2.8, 0.12);
    if (isExamining) {
      // 1-on-1 Examination Desk close-up view
      targetPos.current.set(0, 3.4, 4.4);
      targetLook.current.set(0, 0.25, 0.6);
    } else {
      // Global Table overview
      targetPos.current.set(0, 5.4, 6.8);
      targetLook.current.set(0, 0.3, 0.4);
    }

    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook.current, t);
      camera.position.lerp(targetPos.current, t);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={controlsEnabled}
      enableDamping
      dampingFactor={0.06}
      enablePan={false}
      minDistance={3.0}
      maxDistance={12.0}
      minPolarAngle={Math.PI / 6} // Cannot look directly from above
      maxPolarAngle={Math.PI / 2.3} // Cannot clip below table height
      target={[0, 0.3, 0.4]}
    />
  );
}
