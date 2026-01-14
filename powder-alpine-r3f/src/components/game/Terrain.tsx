import { useRef, useMemo, useState, useLayoutEffect } from 'react';
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
const TREE_COUNT = 45;

// Reusable geometries and materials to save memory and prevent flickering
const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 1);
const needlesGeo = new THREE.ConeGeometry(0.5, 1.4, 8);
const trunkMat = new THREE.MeshStandardMaterial({ color: '#4d392b' });
const needlesMat = new THREE.MeshStandardMaterial({ color: '#2d4a22' });

function Chunk({ zOffset }: { zOffset: number }) {
    const trunkRef = useRef<THREE.InstancedMesh>(null);
    const needlesRef = useRef<THREE.InstancedMesh>(null);

    const treePositions = useMemo(() => {
        const temp = [];
        const seed = zOffset;
        const random = (s: number) => {
            const x = Math.sin(s) * 10000;
            return x - Math.floor(x);
        };

        for (let i = 0; i < TREE_COUNT; i++) {
            const tSeed = seed + i * 1.5;
            temp.push({
                x: (random(tSeed) - 0.5) * 80,
                z: random(tSeed + 0.5) * CHUNK_SIZE
            });
        }
        return temp;
    }, [zOffset]);

    useLayoutEffect(() => {
        if (!trunkRef.current || !needlesRef.current) return;

        const dummy = new THREE.Object3D();
        treePositions.forEach((tree, i) => {
            // Trunk
            dummy.position.set(tree.x, 0.5, tree.z);
            dummy.updateMatrix();
            trunkRef.current!.setMatrixAt(i, dummy.matrix);

            // Needles
            dummy.position.set(tree.x, 1.2, tree.z);
            dummy.updateMatrix();
            needlesRef.current!.setMatrixAt(i, dummy.matrix);
        });

        trunkRef.current.instanceMatrix.needsUpdate = true;
        needlesRef.current.instanceMatrix.needsUpdate = true;
    }, [treePositions]);

    return (
        <group position={[0, 0, zOffset]}>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, CHUNK_SIZE / 2]} receiveShadow>
                <planeGeometry args={[140, CHUNK_SIZE]} />
                <meshStandardMaterial color="#f8fafc" />
            </mesh>

            <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, TREE_COUNT]} castShadow receiveShadow />
            <instancedMesh ref={needlesRef} args={[needlesGeo, needlesMat, TREE_COUNT]} castShadow receiveShadow />
        </group>
    );
}

export function Terrain() {
    const containerRef = useRef<THREE.Group>(null);
    const [activeChunks, setActiveChunks] = useState([0, 1, 2, 3]);

    useFrame((state, delta) => {
        // 1. UPDATE GLOBAL VELOCITY & POSITION
        const baseSpeed = 26;
        const maxLateralSpeed = 24;
        const carvingEase = 10;
        const accelerationEase = 3;

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
            containerRef.current.position.z = -gameState.worldZ;
            containerRef.current.position.x = -gameState.worldX;
        }

        // 3. RECYCLE CHUNKS
        const currentChunkIdx = Math.floor(gameState.worldZ / CHUNK_SIZE);
        if (activeChunks[0] < currentChunkIdx - 1) {
            setActiveChunks([currentChunkIdx - 1, currentChunkIdx, currentChunkIdx + 1, currentChunkIdx + 2, currentChunkIdx + 3]);
        }

        // 4. CAMERA SYNC
        state.camera.position.set(0, 24, -18);
        state.camera.lookAt(0, 0, 12);
    });

    return (
        <group ref={containerRef}>
            {activeChunks.map(idx => (
                <Chunk key={idx} zOffset={idx * CHUNK_SIZE} />
            ))}
        </group>
    );
}
