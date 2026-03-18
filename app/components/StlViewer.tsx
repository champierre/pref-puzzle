'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  url: string;
  color: string;
}

export default function StlViewer({ url, color }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let animId: number;
    let cancelled = false;

    (async () => {
      const THREE = await import('three');
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      if (cancelled) return;

      const w = mount.clientWidth;
      const h = mount.clientHeight;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111827);

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const sun = new THREE.DirectionalLight(0xffffff, 1.0);
      sun.position.set(1, 3, 2);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0x8899ff, 0.3);
      fill.position.set(-2, -1, -1);
      scene.add(fill);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;

      new STLLoader().load(
        url,
        (geometry) => {
          if (cancelled) return;
          geometry.computeBoundingBox();
          const box = geometry.boundingBox!;
          const center = new THREE.Vector3();
          box.getCenter(center);
          geometry.translate(-center.x, -center.y, -center.z);

          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);

          const mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshPhongMaterial({ color: new THREE.Color(color), specular: 0x222222, shininess: 40 }),
          );
          mesh.rotation.x = -Math.PI / 2;
          scene.add(mesh);

          camera.position.set(0, maxDim * 1.2, maxDim * 0.9);
          camera.lookAt(0, 0, 0);
          controls.update();
          setLoaded(true);
        },
        (xhr) => {
          if (xhr.total) setProgress(Math.round((xhr.loaded / xhr.total) * 100));
        },
        () => { setError(true); },
      );

      function animate() {
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();

      function onResize() {
        if (!mount) return;
        const nw = mount.clientWidth;
        const nh = mount.clientHeight;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      }
      window.addEventListener('resize', onResize);

      // cleanup stored in outer scope via cancelled flag + returned function
      (mount as any).__stlCleanup = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', onResize);
        controls.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      const cleanup = (mount as any).__stlCleanup;
      if (cleanup) cleanup();
    };
  }, [url, color]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      {!loaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-300 gap-3">
          <span className="text-sm">読み込み中... {progress}%</span>
          <div className="w-48 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-gray-500">ファイルサイズが大きいため時間がかかることがあります</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-red-400 text-sm">
          読み込みエラー
        </div>
      )}
    </div>
  );
}
