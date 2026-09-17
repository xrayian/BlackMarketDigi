import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

export function TavernEffects() {
  return (
    <EffectComposer multisampling={4}>
      {/* Subtle warm bloom for gold coins and lantern flame */}
      <Bloom
        luminanceThreshold={0.75}
        luminanceSmoothing={0.4}
        intensity={0.45}
        kernelSize={3}
      />
      {/* Tavern corner shadow vignette */}
      <Vignette eskil={false} offset={0.15} darkness={0.8} />
    </EffectComposer>
  );
}
