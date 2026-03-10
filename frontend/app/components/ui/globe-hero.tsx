"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { cn } from "@/lib/utils";

function WireframeGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // Create dots on sphere surface
  const particles = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const radius = 2;
      positions[i * 3] = radius * Math.cos(theta) * Math.sin(phi);
      positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group>
      {/* Wireframe sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial
          color="#8b5cf6"
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Dots */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particles, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#8b5cf6"
          size={0.015}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>

      {/* Inner glow sphere */}
      <mesh>
        <sphereGeometry args={[1.95, 32, 32]} />
        <meshBasicMaterial
          color="#4c1d95"
          transparent
          opacity={0.04}
        />
      </mesh>
    </group>
  );
}

interface GlobeHeroProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export function GlobeHero({
  className,
  title = "Prediction Markets",
  subtitle = "Decentralized, private, and provably fair",
}: GlobeHeroProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Globe Canvas */}
      <div className="absolute inset-0 opacity-60">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          style={{ background: "transparent" }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.5} />
          <WireframeGlobe />
        </Canvas>
      </div>

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#09090b_70%)]" />

      {/* Content overlay */}
      <div className="relative flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32">
        <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
          {title}
        </h1>
        <p className="mt-4 max-w-md text-base text-zinc-400">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
