import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export function GameScene() {
  return (
    <div className="w-screen h-screen">
      <Canvas
        camera={{ position: [0, 8, 8], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => gl.setClearColor('#0f0d0a')}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 5, 0]} intensity={1} color="#f5d680" />
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
          <cylinderGeometry args={[4, 4, 0.2, 64]} />
          <meshStandardMaterial color="#3d2b1f" roughness={0.8} />
        </mesh>
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.5} />
      </Canvas>
    </div>
  );
}
