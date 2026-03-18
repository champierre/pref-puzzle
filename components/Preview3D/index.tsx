'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Suspense } from 'react';
import TerrainMesh from './TerrainMesh';
import type { WorkerResponse } from '../../lib/types';

type MeshData = NonNullable<WorkerResponse['mesh']>;

interface Props {
  meshes: Record<string, MeshData>;
}

export default function Preview3D({ meshes }: Props) {
  const entries = Object.entries(meshes);

  return (
    <Canvas camera={{ position: [0, -0.5, 0.4], fov: 50 }} style={{ background: '#111' }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 10]} intensity={1} />
      <Suspense fallback={null}>
        {entries.map(([code, mesh]) => <TerrainMesh key={code} code={code} mesh={mesh} />)}
      </Suspense>
      <OrbitControls makeDefault />
      <Grid args={[2, 2]} cellSize={0.05} sectionSize={0.2} position={[0, 0, -0.01]} />
    </Canvas>
  );
}
