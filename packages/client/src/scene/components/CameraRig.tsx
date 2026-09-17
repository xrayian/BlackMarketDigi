import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraRigProps {
  controlsEnabled?: boolean;
}

export function CameraRig({ controlsEnabled = true }: CameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    // Initial camera position: seated directly behind local merchant stand, looking at table
    camera.position.set(0, 5.4, 6.8);
    camera.lookAt(0, 0.3, 0.4);
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={controlsEnabled}
      enableDamping
      dampingFactor={0.06}
      enablePan={false}
      minDistance={3.5}
      maxDistance={12.0}
      minPolarAngle={Math.PI / 6} // Cannot look directly from above
      maxPolarAngle={Math.PI / 2.3} // Cannot clip below table height
      target={[0, 0.3, 0.4]}
    />
  );
}
