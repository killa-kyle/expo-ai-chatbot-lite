'use client';

import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import { Sky, ContactShadows, Environment } from '@react-three/drei';
import { Player } from '@/components/game/Player';
import { Terrain } from '@/components/game/Terrain';

export default function Home() {
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    const x = e.clientX / window.innerWidth;
    if (x < 0.5) setLeft(true);
    else setRight(true);
  };

  const handlePointerUp = () => {
    setLeft(false);
    setRight(false);
  };

  return (
    <main
      className="h-screen w-full bg-[#f0f4f8] touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 45 }}>
        <color attach="background" args={['#f0f4f8']} />
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />

        <Player left={left} right={right} />
        <Terrain />

        <Environment preset="city" />
        <ContactShadows
          opacity={0.4}
          scale={10}
          blur={2.4}
          far={10}
          resolution={256}
          color="#000000"
        />
      </Canvas>

      {/* Basic HUD Overlay */}
      <div className="absolute top-10 left-10 pointer-events-none">
        <h1 className="text-4xl font-bold text-[#2d3436]">POWDER</h1>
        <p className="text-sm text-[#636e72] uppercase tracking-widest">Alpine Simulator</p>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none text-center">
        <p className="text-[#636e72] text-sm animate-pulse">Tap or Hold Left/Right to Carve</p>
      </div>
    </main>
  );
}
