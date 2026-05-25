// FieldHeroScene.tsx
// Isolated single-cluster hero scene for /field/[slug] pages.
// Reuses the cluster shader vocabulary from CapabilityScene, but renders ONE
// cluster — no central bloom, no other capability clusters, no orbit ring,
// no DOF, no chromatic, no grain. Larger cluster, slow self-rotation.
// Performance budget cheaper than the landing scene.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useDetectGPU } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CAPABILITIES } from '../data/capabilities';

type ThemeName = 'light' | 'dark';
type TierName = 'high' | 'mid' | 'low';

interface Tier {
  count: number;
  bloom: number;
  size: number; // base point size
}

// Cheaper than the landing scene because it is a single cluster.
const TIERS: Record<TierName, Tier> = {
  high: { count: 8000, bloom: 0.85, size: 2.4 },
  mid:  { count: 5000, bloom: 0.7,  size: 2.2 },
  low:  { count: 3000, bloom: 0.55, size: 2.0 },
};

// Palette — mirrors paletteFor() in CapabilityScene so the cluster tint on
// the field page is the SAME colour as the cluster on the landing graph.
interface Palette {
  particleBase: THREE.Color;
  particleCore: THREE.Color;
  clusterTints: THREE.Color[];
}

function paletteFor(theme: ThemeName): Palette {
  if (theme === 'light') {
    return {
      particleBase: new THREE.Color('#FFB39A'),
      particleCore: new THREE.Color('#FF5722'),
      clusterTints: [
        new THREE.Color('#FF8E70'),
        new THREE.Color('#FFB3A0'),
        new THREE.Color('#FFA070'),
        new THREE.Color('#FFC0A8'),
        new THREE.Color('#FF9888'),
        new THREE.Color('#FFAE9A'),
      ],
    };
  }
  return {
    particleBase: new THREE.Color('#C76A4A'),
    particleCore: new THREE.Color('#FF5722'),
    clusterTints: [
      new THREE.Color('#FF7A4E'),
      new THREE.Color('#E07060'),
      new THREE.Color('#FF8050'),
      new THREE.Color('#C86A50'),
      new THREE.Color('#E26050'),
      new THREE.Color('#D87050'),
    ],
  };
}

const clusterVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uRadius;

  attribute float aSeed;
  varying float vAlpha;
  varying float vEnergy;

  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  void main() {
    float t = uTime * 0.22;
    float seed = aSeed;
    float ang = seed * 6.28318 * 7.0;
    float rad = pow(seed, 0.55) * uRadius;
    vec3 home = vec3(
      cos(ang) * rad,
      (fract(seed * 23.0) - 0.5) * uRadius * 0.7,
      sin(ang) * rad
    );

    vec3 noise = hash3(home * 1.4 + vec3(t));
    vec3 displaced = home + noise * uRadius * 0.32
      * (0.7 + 0.5 * sin(t * 1.2 + seed * 9.0));

    float breath = 1.0 + 0.05 * sin(uTime * 0.7 + seed * 4.0);
    displaced *= breath;

    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mv;

    float r = length(home);
    float energy = 1.0 - r / uRadius;
    vEnergy = clamp(energy, 0.0, 1.0);
    vAlpha = 0.5 + 0.5 * vEnergy;

    float ps = uSize * (1.0 + 0.5 * vEnergy);
    gl_PointSize = ps * uPixelRatio * (1.0 / -mv.z);
  }
`;

const clusterFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uTint;
  uniform vec3 uCore;
  varying float vAlpha;
  varying float vEnergy;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    vec3 col = mix(uTint, uCore, pow(vEnergy, 1.8) * 0.5);
    gl_FragColor = vec4(col, a * vAlpha);
  }
`;

function SingleCluster({
  count,
  size,
  pointSize,
  tint,
  core,
}: {
  count: number;
  size: number;
  pointSize: number;
  tint: THREE.Color;
  core: THREE.Color;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();

  const { geometry, uniforms } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seeds[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), size * 2.5);

    const uni = {
      uTime: { value: 0 },
      uSize: { value: pointSize },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      uRadius: { value: size },
      uTint: { value: tint.clone() },
      uCore: { value: core.clone() },
    };
    return { geometry: geo, uniforms: uni };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, size, pointSize]);

  // palette sync on theme change
  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTint.value.copy(tint);
    matRef.current.uniforms.uCore.value.copy(core);
  }, [tint, core]);

  useFrame((state, dt) => {
    if (!matRef.current || !groupRef.current) return;
    matRef.current.uniforms.uTime.value += dt;
    // slow self-rotation around the vertical axis
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.06;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.04) * 0.12;
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry}>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={clusterVertex}
          fragmentShader={clusterFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function CameraRig() {
  const { camera, mouse } = useThree();
  const baseRef = useRef({ x: 0, y: 0 });

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const driftX = Math.sin(t * 0.07) * 0.15;
    const driftY = Math.cos(t * 0.05) * 0.08;
    const parX = mouse.x * 0.2;
    const parY = mouse.y * 0.15;

    const targetX = driftX + parX;
    const targetY = driftY + parY;

    baseRef.current.x += (targetX - baseRef.current.x) * 0.04;
    baseRef.current.y += (targetY - baseRef.current.y) * 0.04;

    camera.position.set(baseRef.current.x, baseRef.current.y, 4.6);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function bgStyle(theme: ThemeName) {
  if (theme === 'light') {
    return 'radial-gradient(ellipse 90% 70% at 50% 45%, #FFD8C7 0%, #F4ECDF 60%, #ECE3D2 100%)';
  }
  return 'radial-gradient(ellipse 90% 70% at 50% 45%, #1A0A12 0%, #0A0707 60%, #050505 100%)';
}

export default function FieldHeroScene({ capabilityId }: { capabilityId: string }) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof document === 'undefined') return 'dark';
    return (document.documentElement.getAttribute('data-theme') as ThemeName) || 'dark';
  });
  const [tier, setTier] = useState<TierName | null>(null);
  const [paused, setPaused] = useState(false);

  const gpu = useDetectGPU();
  useEffect(() => {
    if (gpu.tier <= 1) setTier('low');
    else if (gpu.tier === 2) setTier('mid');
    else setTier('high');
  }, [gpu]);

  useEffect(() => {
    const sync = () => {
      const t = (document.documentElement.getAttribute('data-theme') as ThemeName) || 'dark';
      setTheme(t);
    };
    document.addEventListener('cy:theme', sync);
    return () => document.removeEventListener('cy:theme', sync);
  }, []);

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const palette = useMemo(() => paletteFor(theme), [theme]);

  // Resolve the cluster tint that matches the landing graph for this capability.
  const capIndex = useMemo(
    () => Math.max(0, CAPABILITIES.findIndex((c) => c.id === capabilityId)),
    [capabilityId],
  );
  const tint = palette.clusterTints[capIndex] ?? palette.clusterTints[0];
  const core = palette.particleCore;

  if (!tier) {
    return (
      <div className="field-scene-loading">
        <span>[ scene / detecting ]</span>
      </div>
    );
  }

  const cfg = TIERS[tier];

  return (
    <div className="field-scene-root" style={{ background: bgStyle(theme) }}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 4.6], fov: 38, near: 0.1, far: 50 }}
        frameloop={paused ? 'never' : 'always'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <CameraRig />
        <ambientLight intensity={0.4} />
        <pointLight
          position={[2, 1.5, 2]}
          intensity={0.5}
          color={theme === 'light' ? '#FFD8C7' : '#FF7A4E'}
        />

        <SingleCluster
          count={cfg.count}
          size={1.6}
          pointSize={cfg.size}
          tint={tint}
          core={core}
        />

        <EffectComposer multisampling={0}>
          <Bloom
            intensity={cfg.bloom}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.6}
            mipmapBlur
          />
          <Vignette
            eskil={false}
            offset={0.2}
            darkness={theme === 'light' ? 0.35 : 0.55}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
