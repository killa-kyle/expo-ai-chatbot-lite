'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useState, useEffect } from 'react';
import { Sky, Environment, Stats } from '@react-three/drei';
import { Player } from '@/components/game/Player';
import { Terrain } from '@/components/game/Terrain';

export default function Home() {
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const [keys, setKeys] = useState({ left: false, right: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setKeys(prev => ({ ...prev, left: true }));
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setKeys(prev => ({ ...prev, right: true }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setKeys(prev => ({ ...prev, left: false }));
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setKeys(prev => ({ ...prev, right: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const isMovingLeft = left || keys.left;
  const isMovingRight = right || keys.right;

  const handlePointerDown = (e: React.PointerEvent) => {
    const x = e.clientX / window.innerWidth;
    setLeft(x < 0.5);
    setRight(x >= 0.5);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Buttons === 1 means primary button (left click) is held
    if (e.buttons === 1) {
      const x = e.clientX / window.innerWidth;
      setLeft(x < 0.5);
      setRight(x >= 0.5);
    }
  };

  const handlePointerUp = () => {
    setLeft(false);
    setRight(false);
  };

  return (
    <main
      className="h-screen w-full bg-[#f0f4f8] touch-none select-none cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas shadows="soft" camera={{ position: [0, 5, 10], fov: 45 }}>
        <Stats />
        <color attach="background" args={['#f0f4f8']} />
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />

        {/* Main Sun Light - High quality stable shadows */}
        <directionalLight
          position={[20, 40, 20]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-camera-near={1}
          shadow-camera-far={150}
        />

        <Player left={isMovingLeft} right={isMovingRight} />
        <Terrain />

        <Environment preset="city" />
      </Canvas>

      {/* Basic HUD Overlay */}
      <div className="absolute top-10 left-10 pointer-events-none">
        <h1 className="text-4xl font-bold text-[#2d3436]">POWDER</h1>
        <p className="text-sm text-[#636e72] uppercase tracking-widest">Alpine Simulator</p>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none text-center">
        <p className="text-[#636e72] text-sm animate-pulse">Arrows, WASD, or Click & Drag to Carve</p>
      </div>
    </main>
  );
}
