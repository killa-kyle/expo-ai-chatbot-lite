import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gameState } from './Terrain';

export function Player({ left, right }: { left: boolean; right: boolean }) {
    const modelRef = useRef<THREE.Group>(null);
    const currentTilt = useRef(0);

    // Sync inputs to global state for Terrain to read
    gameState.sideInput = (left ? -1 : 0) + (right ? 1 : 0);

    useFrame((state, delta) => {
        // Visual Banking only - character doesn't move in space
        const targetTilt = -gameState.sideInput * 0.45;
        currentTilt.current = THREE.MathUtils.lerp(currentTilt.current, targetTilt, delta * 8);

        if (modelRef.current) {
            modelRef.current.rotation.z = currentTilt.current;
            modelRef.current.rotation.y = gameState.sideInput * 0.2;
        }
    });

    return (
        /* Height at y=0.45, with skis at y=-0.4 offset => Skis at y=0.05 (just above y=0 floor) */
        <group position={[0, 0.45, 0]}>
            <group ref={modelRef}>
                <mesh castShadow>
                    <boxGeometry args={[0.4, 0.8, 0.4]} />
                    <meshStandardMaterial color="#2d3436" />
                </mesh>
                <mesh position={[0.12, -0.4, 0]}>
                    <boxGeometry args={[0.06, 0.04, 1.4]} />
                    <meshStandardMaterial color="#636e72" />
                </mesh>
                <mesh position={[-0.12, -0.4, 0]}>
                    <boxGeometry args={[0.06, 0.04, 1.4]} />
                    <meshStandardMaterial color="#636e72" />
                </mesh>
            </group>
        </group>
    );
}
