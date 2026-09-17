import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface Card3DProps {
  name?: string;
  classification?: 'LEGAL' | 'CONTRABAND' | 'ROYAL';
  goodType?: string;
  contrabandType?: string;
  royalGoodType?: string;
  value?: number;
  penalty?: number;
  faceUp?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onClick?: () => void;
}

// Generate high-resolution procedural canvas textures for front and back
function createCardFrontTexture(props: {
  name: string;
  classification: string;
  value: number;
  penalty: number;
  goodType?: string;
}): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 716; // Standard 2.5 : 3.5 ratio
  const ctx = canvas.getContext('2d')!;

  // Background color based on classification
  let bgColor = '#f7fafc';
  let bannerColor = '#2b6cb0';
  let borderColor = '#4a5568';
  let iconText = '📦';

  if (props.classification === 'LEGAL') {
    switch (props.goodType) {
      case 'APPLE':
        bgColor = '#fff5f5';
        bannerColor = '#c53030';
        borderColor = '#9b2c2c';
        iconText = '🍎';
        break;
      case 'CHEESE':
        bgColor = '#fffff0';
        bannerColor = '#d69e2e';
        borderColor = '#b7791f';
        iconText = '🧀';
        break;
      case 'BREAD':
        bgColor = '#fffaf0';
        bannerColor = '#dd6b20';
        borderColor = '#c05621';
        iconText = '🍞';
        break;
      case 'CHICKEN':
        bgColor = '#f0f9ff';
        bannerColor = '#3182ce';
        borderColor = '#2b6cb0';
        iconText = '🍗';
        break;
    }
  } else if (props.classification === 'CONTRABAND') {
    bgColor = '#2a1a1f';
    bannerColor = '#9b2c2c';
    borderColor = '#742a2a';
    iconText = '⚔️';
  } else if (props.classification === 'ROYAL') {
    bgColor = '#1f162b';
    bannerColor = '#6b46c1';
    borderColor = '#553c9a';
    iconText = '👑';
  }

  // Base card surface
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 716);

  // Outer border & inner parchment frame
  ctx.lineWidth = 14;
  ctx.strokeStyle = borderColor;
  ctx.strokeRect(16, 16, 480, 684);

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#d69e2e'; // Gold filigree accent
  ctx.strokeRect(28, 28, 456, 660);

  // Header Banner
  ctx.fillStyle = bannerColor;
  ctx.fillRect(36, 40, 440, 90);
  ctx.strokeStyle = '#d69e2e';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 40, 440, 90);

  // Card Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(props.name.toUpperCase(), 256, 85);

  // Central Icon / Emblem
  ctx.font = '120px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(iconText, 256, 310);

  // Classification Subtitle
  ctx.fillStyle = props.classification === 'LEGAL' ? '#2d3748' : '#e2e8f0';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(props.classification, 256, 440);

  // Divider line
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(80, 470);
  ctx.lineTo(432, 470);
  ctx.stroke();

  // Bottom stats: Value (Gold Coin) and Penalty (Red Seal)
  // Left: Value
  ctx.fillStyle = '#d69e2e';
  ctx.beginPath();
  ctx.arc(140, 570, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#744210';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = '#744210';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('VALUE', 140, 545);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px serif';
  ctx.fillText(`${props.value}`, 140, 585);

  // Right: Penalty
  ctx.fillStyle = '#c53030';
  ctx.beginPath();
  ctx.arc(372, 570, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#742a2a';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = '#fed7d7';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PENALTY', 372, 545);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px serif';
  ctx.fillText(`${props.penalty}`, 372, 585);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCardBackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 716;
  const ctx = canvas.getContext('2d')!;

  // Deep forest tavern green background
  ctx.fillStyle = '#1c2826';
  ctx.fillRect(0, 0, 512, 716);

  // Double gold borders
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#8c6d37';
  ctx.strokeRect(16, 16, 480, 684);

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#c5a059';
  ctx.strokeRect(28, 28, 456, 660);

  // Crosshatch lattice background
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.12)';
  ctx.lineWidth = 2;
  for (let i = -512; i < 1024; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 716, 716);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i, 716);
    ctx.lineTo(i + 716, 0);
    ctx.stroke();
  }

  // Central Nottingham Crest Medallion
  ctx.fillStyle = '#263430';
  ctx.beginPath();
  ctx.arc(256, 358, 140, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#c5a059';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Heraldic Arrow & Bow Motif
  ctx.fillStyle = '#c5a059';
  ctx.font = 'bold 110px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏹', 256, 358);

  ctx.font = 'bold 24px serif';
  ctx.fillStyle = '#c5a059';
  ctx.fillText('SHERIFF', 256, 260);
  ctx.fillText('OF NOTTINGHAM', 256, 455);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function Card3D({
  name = 'Apple',
  classification = 'LEGAL',
  goodType = 'APPLE',
  value = 2,
  penalty = 2,
  faceUp = true,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  onClick,
}: Card3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const frontTexture = useMemo(
    () =>
      createCardFrontTexture({
        name,
        classification,
        value,
        penalty,
        goodType,
      }),
    [name, classification, value, penalty, goodType]
  );

  const backTexture = useMemo(() => createCardBackTexture(), []);

  // Card box geometry materials: [right, left, top, bottom, front, back]
  const edgeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f0e6d2',
        roughness: 0.6,
        metalness: 0.05,
      }),
    []
  );

  const frontMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: frontTexture,
        roughness: 0.45,
        metalness: 0.1,
      }),
    [frontTexture]
  );

  const backMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: backTexture,
        roughness: 0.45,
        metalness: 0.1,
      }),
    [backTexture]
  );

  const materials = useMemo(
    () => [
      edgeMaterial,
      edgeMaterial,
      edgeMaterial,
      edgeMaterial,
      faceUp ? frontMaterial : backMaterial, // Front face (positive Z)
      faceUp ? backMaterial : frontMaterial, // Back face (negative Z)
    ],
    [edgeMaterial, frontMaterial, backMaterial, faceUp]
  );

  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <mesh ref={meshRef} castShadow receiveShadow material={materials}>
        <boxGeometry args={[0.6, 0.86, 0.015]} />
      </mesh>
    </group>
  );
}
