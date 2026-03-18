'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import { KANTO_PREFECTURES } from '../../lib/constants/kanto';
import type { WorkerResponse } from '../../lib/types';

type MeshData = NonNullable<WorkerResponse['mesh']>;

function b64ToFloat32(b64: string): Float32Array {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Float32Array(buf);
}

interface Props { code: string; mesh: MeshData; }

export default function TerrainMesh({ code, mesh }: Props) {
  const pref = KANTO_PREFECTURES.find(p => p.code === code);
  const color = pref?.color ?? '#ffffff';

  const geometries = useMemo(() => {
    function makeGeo(posB64: string, normB64: string) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(b64ToFloat32(posB64), 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(b64ToFloat32(normB64), 3));
      return geo;
    }
    return {
      terrain: makeGeo(mesh.terrain.posB64, mesh.terrain.normB64),
      walls: makeGeo(mesh.walls.posB64, mesh.walls.normB64),
      bottom: makeGeo(mesh.bottom.posB64, mesh.bottom.normB64),
      text: mesh.text ? makeGeo(mesh.text.posB64, mesh.text.normB64) : null,
    };
  }, [mesh]);

  return (
    <group>
      {[geometries.terrain, geometries.walls, geometries.bottom, geometries.text].filter(Boolean).map((geo, i) => (
        <mesh key={i} geometry={geo!}>
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
