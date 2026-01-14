import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Global state for frame-consistent movement
export const gameState = {
    worldZ: 0,
    worldX: 0,
    velocityZ: 0,
    velocityX: 0,
    sideInput: 0, // Current steering state
};

const CHUNK_SIZE = 250;
const TREE_COUNT = 35;

function Chunk({ zOffset }: { zOffset: number }) {
    const trees = useMemo(() => {
        const temp = [];
        const seed = zOffset;
        const random = (s: number) => {
            const x = Math.sin(s) * 10000;
            return x - Math.floor(x);
        };

        for (let i = 0; i < TREE_COUNT; i++) {
            const tSeed = seed + i * 1.5;
            temp.push({
                id: i,
                x: (random(tSeed) - 0.5) * 70,
                z: random(tSeed + 0.5) * CHUNK_SIZE
            });
        }
        return temp;
    }, [zOffset]);

    const groupRef = useRef<THREE.Group>(null);

    // We move the chunk in the PARENT's frame to ensure all chunks move together
    return (
        <group ref={groupRef} position={[0, 0, zOffset]}>
            {/* Floor - Positioned at y=0 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, CHUNK_SIZE / 2]} receiveShadow>
                <planeGeometry args={[120, CHUNK_SIZE]} />
                <meshStandardMaterial color="#f8fafc" />
            </mesh>

            {/* Trees */}
            {trees.map(tree => (
                <group key={tree.id} position={[tree.x, 0, tree.z]}>
                    <mesh position={[0, 0.5, 0]}>
                        <cylinderGeometry args={[0.08, 0.12, 1]} />
                        <meshStandardMaterial color="#4d392b" />
                    </mesh>
                    <mesh position={[0, 1.2, 0]}>
                        <coneGeometry args={[0.5, 1.4, 8]} />
                        <meshStandardMaterial color="#2d4a22" />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

export function Terrain() {
    const containerRef = useRef<THREE.Group>(null);
    const [activeChunks, setActiveChunks] = useState([0, 1, 2, 3]);

    useFrame((state, delta) => {
        // 1. UPDATE GLOBAL VELOCITY & POSITION (Single Truth)
        const baseSpeed = 24;
        const maxLateralSpeed = 22;
        const carvingEase = 10;
        const accelerationEase = 3;

        // Direct access to state.sideInput (managed by parent)
        const targetSideSpeed = gameState.sideInput * maxLateralSpeed;

        gameState.velocityX = THREE.MathUtils.lerp(
            gameState.velocityX,
            targetSideSpeed,
            delta * carvingEase
        );

        gameState.velocityZ = THREE.MathUtils.lerp(
            gameState.velocityZ,
            baseSpeed,
            delta * accelerationEase
        );

        gameState.worldX += gameState.velocityX * delta;
        gameState.worldZ += gameState.velocityZ * delta;

        // 2. MOVE THE ENTIRE WORLD CONTAINER
        if (containerRef.current) {
            // Negative world position moves the world past the player
            containerRef.current.position.z = -gameState.worldZ;
            containerRef.current.position.x = -gameState.worldX;
        }

        // 3. RECYCLE CHUNKS
        const currentChunkIdx = Math.floor(gameState.worldZ / CHUNK_SIZE);
        if (activeChunks[0] < currentChunkIdx - 1) {
            setActiveChunks([currentChunkIdx - 1, currentChunkIdx, currentChunkIdx + 1, currentChunkIdx + 2, currentChunkIdx + 3]);
        }

        // 4. CAMERA SYNC (Static relative to Player at 0,0,0)
        state.camera.position.set(0, 24, -18);
        state.camera.lookAt(0, 0, 10);
    });

    return (
        <group ref={containerRef}>
            {activeChunks.map(idx => (
                <Chunk key={idx} zOffset={idx * CHUNK_SIZE} />
            ))}
            <gridHelper args={[120, 30, '#e2e8f0', '#e2e8f0']} position={[0, 0.01, gameState.worldZ + 500]} />
        </group>
    );
}
