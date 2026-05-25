// CapabilityScene.tsx
// Vertus-register landing scene.
// Central GPU-instanced particle bloom (curl-noise-driven attractor) plus six
// orbiting capability clusters. Labels rendered as projected HTML overlays.
// Post: bloom + DOF + chromatic aberration + atmospheric fog.
// Performance: adaptive density via useDetectGPU; visibility-paused frameloop.

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, useDetectGPU } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  ChromaticAberration,
  Vignette,
  Noise,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { CAPABILITIES, type Capability } from '../data/capabilities';

// ---------- types ----------

// The scene communicates with the surrounding Astro page via window events,
// not props, because client:only React islands can't receive function props
// across the serialization boundary. Astro page listens for cy:capability and
// cy:center on window.
function emitCapability(capId: string) {
  // Temporary diagnostic — confirm which cap id leaves the scene.
  // Remove once the click bug is verified fixed.
  if (typeof window !== 'undefined' && (window as { __dbg?: boolean }).__dbg !== false) {
    console.log('[scene] emit capability →', capId);
  }
  window.dispatchEvent(new CustomEvent('cy:capability', { detail: capId }));
}
function emitCenter() {
  window.dispatchEvent(new CustomEvent('cy:center'));
}

type ThemeName = 'light' | 'dark';
type TierName = 'high' | 'mid' | 'low';

interface Tier {
  centerCount: number;
  clusterCount: number;
  fogNear: number;
  fogFar: number;
  bloom: number;
  dof: boolean;
  chromatic: boolean;
  grain: boolean;
}

// ---------- tier config ----------

const TIERS: Record<TierName, Tier> = {
  high: { centerCount:  30000, clusterCount: 1200, fogNear: 6, fogFar: 22, bloom: 0.85, dof: true,  chromatic: true,  grain: true  },
  mid:  { centerCount:  16000, clusterCount:  650, fogNear: 6, fogFar: 22, bloom: 0.7,  dof: false, chromatic: true,  grain: false },
  low:  { centerCount:   6000, clusterCount:  300, fogNear: 6, fogFar: 22, bloom: 0.55, dof: false, chromatic: false, grain: false },
};

// ---------- palette ----------

// Coral pastel base — Vertus register, with TE orange retained as core accent.
interface Palette {
  bg0: string;
  bg1: string;
  particleBase: THREE.Color;
  particleCore: THREE.Color;
  clusterTints: THREE.Color[]; // one per capability (matches CAPABILITIES order)
}

function paletteFor(theme: ThemeName): Palette {
  if (theme === 'light') {
    return {
      bg0: '#F4ECDF',
      bg1: '#FFD8C7',
      particleBase: new THREE.Color('#FFB39A'),
      particleCore: new THREE.Color('#FF5722'), // TE orange — emissive core only
      clusterTints: [
        new THREE.Color('#FF8E70'), // technical — slightly hotter coral
        new THREE.Color('#FFB3A0'), // soft-power — softer pink-coral
        new THREE.Color('#FFA070'), // ai — amber-coral
        new THREE.Color('#FFC0A8'), // infrastructure — pale peach
        new THREE.Color('#FF9888'), // design — rose-coral
        new THREE.Color('#FFAE9A'), // aesthetic — neutral coral
      ],
    };
  }
  return {
    bg0: '#0A0A0A',
    bg1: '#1A0A12',
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

// ---------- shaders ----------

// Central bloom — curl-noise + attractor toward a slowly-shifting target.
// One Points draw. Per-vertex random seed → position trajectory in vertex shader.
const centerVertex = /* glsl */ `
  uniform float uTime;
  uniform float uMouse;        // hover/pulse intensity
  uniform vec3  uCore;         // emissive core color
  uniform vec3  uBase;         // base color
  uniform float uSize;
  uniform float uPixelRatio;

  attribute float aSeed;       // 0..1 per particle

  varying float vEnergy;       // for fragment color blend (0 = base, 1 = core)
  varying float vAlpha;

  // hash + simplex-style noise (cheap pseudo-curl)
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  vec3 curl(vec3 p) {
    float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    vec3 p0 = hash3(p);
    vec3 p_x1 = hash3(p + dx); vec3 p_x0 = hash3(p - dx);
    vec3 p_y1 = hash3(p + dy); vec3 p_y0 = hash3(p - dy);
    vec3 p_z1 = hash3(p + dz); vec3 p_z0 = hash3(p - dz);
    float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
    float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
    float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;
    return normalize(vec3(x, y, z) + p0 * 0.001);
  }

  void main() {
    // seed → spherical bloom origin
    float t = uTime * 0.18;
    float seed = aSeed;
    float ang = seed * 6.28318 * 9.0;
    float rad = pow(seed, 0.5) * 1.6;
    vec3 home = vec3(
      cos(ang) * rad,
      (fract(seed * 17.0) - 0.5) * 1.4,
      sin(ang) * rad
    );

    // curl-noise flow
    vec3 flow = curl(home * 0.6 + vec3(t * 0.4, t * 0.3, -t * 0.5));
    vec3 displaced = home + flow * 0.5 * (0.6 + 0.6 * sin(t * 1.7 + seed * 18.0));

    // breath — gentle radial pulse
    float breath = 1.0 + 0.06 * sin(uTime * 0.7 + seed * 5.0);
    displaced *= breath;

    // mouse pulse on the bloom — small inward push
    displaced *= 1.0 - 0.05 * uMouse;

    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mv;

    // energy: hotter near origin
    float r = length(displaced);
    vEnergy = clamp(1.0 - r / 2.2, 0.0, 1.0);
    vAlpha = 0.55 + 0.45 * vEnergy;

    // point size: closer = bigger; tempered by perspective
    float ps = uSize * (1.4 + 1.6 * vEnergy);
    gl_PointSize = ps * uPixelRatio * (1.0 / -mv.z);
  }
`;

const centerFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uCore;
  uniform vec3 uBase;
  varying float vEnergy;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.05, d);
    vec3 col = mix(uBase, uCore, pow(vEnergy, 1.6));
    // softer outer
    col = mix(col, uBase * 0.6, smoothstep(0.0, 0.5, d) * (1.0 - vEnergy));
    gl_FragColor = vec4(col, a * vAlpha);
  }
`;

// Cluster — same shape but smaller bloom, no core, single tint.
const clusterVertex = /* glsl */ `
  uniform float uTime;
  uniform float uHover;   // 0..1
  uniform vec3  uMouse;   // world-space mouse target (local to cluster)
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uRadius;

  attribute float aSeed;
  varying float vAlpha;

  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  void main() {
    float t = uTime * 0.25;
    float seed = aSeed;
    float ang = seed * 6.28318 * 7.0;
    float rad = pow(seed, 0.6) * uRadius;
    vec3 home = vec3(
      cos(ang) * rad,
      (fract(seed * 23.0) - 0.5) * uRadius * 0.65,
      sin(ang) * rad
    );

    vec3 noise = hash3(home * 1.6 + vec3(t));
    vec3 displaced = home + noise * uRadius * 0.35
      * (0.7 + 0.5 * sin(t * 1.3 + seed * 9.0));

    // hover: attract toward uMouse
    vec3 toMouse = uMouse - displaced;
    displaced += toMouse * 0.35 * uHover * smoothstep(0.0, uRadius * 2.0, length(toMouse));

    float breath = 1.0 + 0.05 * sin(uTime * 0.8 + seed * 4.0);
    displaced *= breath;

    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mv;

    float r = length(home);
    vAlpha = (0.45 + 0.55 * (1.0 - r / uRadius)) * (0.7 + 0.5 * uHover);

    float ps = uSize * (1.0 + 0.6 * uHover);
    gl_PointSize = ps * uPixelRatio * (1.0 / -mv.z);
  }
`;

const clusterFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uTint;
  uniform float uHover;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    // hover brightens the tint slightly
    vec3 col = uTint * (1.0 + 0.3 * uHover);
    gl_FragColor = vec4(col, a * vAlpha);
  }
`;

// ---------- center bloom mesh ----------

function CenterBloom({
  count,
  palette,
  onClick,
}: {
  count: number;
  palette: Palette;
  onClick: () => void;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { size, gl } = useThree();

  const { geometry, uniforms } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3); // placeholder — all zero, shader computes
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seeds[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    // explicit bounding sphere so frustum doesn't cull the shader-displaced points
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4);

    const uni = {
      uTime: { value: 0 },
      uMouse: { value: 0 },
      uCore: { value: palette.particleCore.clone() },
      uBase: { value: palette.particleBase.clone() },
      uSize: { value: 2.4 },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
    };
    return { geometry: geo, uniforms: uni };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // update palette uniforms when palette changes (theme switch)
  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.uniforms.uCore.value.copy(palette.particleCore);
    matRef.current.uniforms.uBase.value.copy(palette.particleBase);
  }, [palette]);

  useFrame((state, dt) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value += dt;
  });

  // hover handling
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (!matRef.current) return;
    const target = hover ? 1 : 0;
    let raf: number;
    const step = () => {
      if (!matRef.current) return;
      const cur = matRef.current.uniforms.uMouse.value;
      const next = cur + (target - cur) * 0.08;
      matRef.current.uniforms.uMouse.value = next;
      if (Math.abs(next - target) > 0.01) raf = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(raf);
  }, [hover]);

  // sync pixel ratio on resize
  useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2);
    }
  }, [size, gl]);

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      onPointerOver={() => { setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
      onClick={(e) => {
        e.stopPropagation();
        console.log('[scene] CLICK center bloom');
        onClick();
      }}
    >
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={centerVertex}
        fragmentShader={centerFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ---------- capability cluster ----------

interface ClusterProps {
  cap: Capability;
  index: number;
  count: number;
  palette: Palette;
  radius: number;     // ring radius for orbit center
  size: number;       // cluster size (point cloud extent)
  orbitSpeed: number; // radians/sec
  phaseOffset: number;
  onClick: () => void;
  onHoverChange: (hovered: boolean, capId: string) => void;
  highlighted: boolean; // lit because a reinforced neighbour is hovered
  lang: 'en' | 'zh';   // locale — swaps label rendering
}

function CapabilityCluster({
  cap,
  index,
  count,
  palette,
  radius,
  size,
  orbitSpeed,
  phaseOffset,
  onClick,
  onHoverChange,
  highlighted,
  lang,
}: ClusterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();
  const [hover, setHover] = useState(false);

  const { geometry, uniforms } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seeds[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), size * 2);

    const uni = {
      uTime: { value: 0 },
      uHover: { value: 0 },
      uMouse: { value: new THREE.Vector3() },
      uTint: { value: palette.clusterTints[index].clone() },
      uSize: { value: 1.9 },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      uRadius: { value: size },
    };
    return { geometry: geo, uniforms: uni };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, size, index]);

  // palette swap on theme change
  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTint.value.copy(palette.clusterTints[index]);
  }, [palette, index]);

  // orbit — original X-Y plane (screen plane). Position on a flat ellipse
  // facing the camera; no z variance. Each cluster has a fixed angular
  // position with subtle y-bob for liveness.
  useFrame((state, dt) => {
    if (!matRef.current || !groupRef.current) return;
    matRef.current.uniforms.uTime.value += dt;
    const fx = Math.cos(phaseOffset) * radius;
    const fy = Math.sin(phaseOffset) * radius * 0.45;
    const bob = Math.sin(state.clock.elapsedTime * (0.4 + (index % 3) * 0.08) + phaseOffset) * 0.05;
    groupRef.current.position.set(fx, fy + bob, 0);

    // hover lerp (own hover OR reinforcement highlight)
    const target = (hover || highlighted) ? 1 : 0;
    const cur = matRef.current.uniforms.uHover.value;
    matRef.current.uniforms.uHover.value = cur + (target - cur) * 0.1;
  });

  // notify parent of hover state
  useEffect(() => {
    onHoverChange(hover, cap.id);
  }, [hover, cap.id, onHoverChange]);

  return (
    <group ref={groupRef}>
      {/* Visual particles — non-interactive. All click + hover handling
          happens on the DOM-layer button below. */}
      <points geometry={geometry} raycast={() => null}>
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
      {/* DOM-layer click target — a real <button> projected to the cluster's
          screen position by Drei. Each cluster has its OWN button rendered
          at its OWN local origin, so a click on screen routes to exactly
          this cluster's button (DOM hit-test, not 3D raycast). */}
      <Html
        position={[0, 0, 0]}
        center
        distanceFactor={6}
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'auto' }}
      >
        <button
          type="button"
          className={`cap-hit ${hover || highlighted ? 'is-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            console.log('[scene] CLICK cap.id=' + cap.id + ' index=' + index);
            emitCapability(cap.id);
          }}
          onMouseEnter={() => {
            console.log('[scene] HOVER cap.id=' + cap.id + ' index=' + index);
            setHover(true);
          }}
          onMouseLeave={() => setHover(false)}
          aria-label={`Open ${lang === 'zh' ? cap.labelZh : cap.label} essay`}
        >
          <span className="cap-label">
            <span className="cap-label-num">{cap.number}</span>
            <span className="cap-label-sep"> / </span>
            <span className="cap-label-name">{lang === 'zh' ? cap.labelZh : cap.label.toLowerCase()}</span>
          </span>
        </button>
      </Html>
    </group>
  );
}

// ---------- camera rig: drift + mouse parallax ----------

function CameraRig() {
  const { camera, mouse } = useThree();
  const baseRef = useRef({ x: 0, y: 0 });

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // slow drift — dampened so it can't push clusters past the viewport edge
    const driftX = Math.sin(t * 0.08) * 0.18;
    const driftY = Math.cos(t * 0.06) * 0.10;
    // mouse parallax — dampened for the same reason
    const parX = mouse.x * 0.22;
    const parY = mouse.y * 0.15;

    const targetX = driftX + parX;
    const targetY = driftY + parY;

    baseRef.current.x += (targetX - baseRef.current.x) * 0.04;
    baseRef.current.y += (targetY - baseRef.current.y) * 0.04;

    camera.position.set(baseRef.current.x, baseRef.current.y, 6.2);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ---------- background gradient (CSS, but driven by theme) ----------

function bgStyle(theme: ThemeName) {
  if (theme === 'light') {
    return 'radial-gradient(ellipse 90% 70% at 50% 40%, #FFD8C7 0%, #F4ECDF 55%, #ECE3D2 100%)';
  }
  return 'radial-gradient(ellipse 90% 70% at 50% 40%, #1A0A12 0%, #0A0707 55%, #050505 100%)';
}

// ---------- main exported component ----------

interface SceneProps {
  /** 'en' (default) renders English labels; 'zh' renders Chinese (labelZh). */
  lang?: 'en' | 'zh';
}

export default function CapabilityScene({ lang = 'en' }: SceneProps) {
  const onCapability = emitCapability;
  const onCenter = emitCenter;
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof document === 'undefined') return 'dark';
    return (document.documentElement.getAttribute('data-theme') as ThemeName) || 'dark';
  });
  const [tier, setTier] = useState<TierName | null>(null);
  const [paused, setPaused] = useState(false);
  const [hoveredCapId, setHoveredCapId] = useState<string | null>(null);
  // Slow-connection / reduced-motion gate. When true, the 3D scene is skipped
  // entirely and the page-level static fallback list takes over.
  const [staticMode, setStaticMode] = useState<boolean | null>(null);

  // Connection-awareness — detect slow networks, data-saver, reduced-motion.
  useEffect(() => {
    if (typeof navigator === 'undefined') { setStaticMode(false); return; }
    type NetInfo = { effectiveType?: string; saveData?: boolean };
    const conn = (navigator as Navigator & { connection?: NetInfo }).connection;
    const slow = conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g';
    const saveData = conn?.saveData === true;
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const useStatic = slow || saveData || reducedMotion;
    setStaticMode(useStatic);
    if (useStatic && typeof document !== 'undefined') {
      document.body.classList.add('is-static-mode');
    }
  }, []);

  // GPU tier detection (only runs once we know we are NOT in static mode)
  const gpu = useDetectGPU();
  useEffect(() => {
    if (staticMode !== false) return; // wait for static-mode resolution
    // tier 0 = unsupported, 1-3 = phone-ish, 3+ = high-end
    if (gpu.tier <= 1) setTier('low');
    else if (gpu.tier === 2) setTier('mid');
    else setTier('high');
  }, [gpu, staticMode]);

  // theme listener — Base.astro dispatches cy:theme
  useEffect(() => {
    const sync = () => {
      const t = (document.documentElement.getAttribute('data-theme') as ThemeName) || 'dark';
      setTheme(t);
    };
    document.addEventListener('cy:theme', sync);
    return () => document.removeEventListener('cy:theme', sync);
  }, []);

  // visibility pause
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const palette = useMemo(() => paletteFor(theme), [theme]);

  // Reinforcement neighbours — a cluster lights up when its reinforced sibling is hovered
  const reinforceMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const c of CAPABILITIES) {
      m.set(c.id, new Set(c.reinforces));
    }
    return m;
  }, []);

  const isHighlighted = (capId: string) => {
    if (!hoveredCapId || hoveredCapId === capId) return false;
    return reinforceMap.get(hoveredCapId)?.has(capId) ?? false;
  };

  const handleClusterHover = (hovered: boolean, capId: string) => {
    setHoveredCapId((prev) => {
      if (hovered) return capId;
      if (prev === capId) return null;
      return prev;
    });
  };

  // Static mode resolved + slow connection detected: render nothing here.
  // The page's static fallback list (revealed by body.is-static-mode CSS) takes over.
  if (staticMode === true) {
    return null;
  }

  if (!tier) {
    return (
      <div className="scene-loading">
        <span>[ scene / detecting ]</span>
      </div>
    );
  }

  const cfg = TIERS[tier];

  return (
    <div className="scene-root" style={{ background: bgStyle(theme) }} data-ready="false" ref={(el) => {
      // Single rAF after mount → smooth opacity fade-in (handled by CSS).
      if (el && el.dataset.ready === 'false') {
        requestAnimationFrame(() => { el.dataset.ready = 'true'; });
      }
    }}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6.2], fov: 38, near: 0.1, far: 100 }}
        frameloop={paused ? 'never' : 'always'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0);
          scene.fog = new THREE.Fog(theme === 'light' ? 0xF4ECDF : 0x0A0707, cfg.fogNear, cfg.fogFar);
        }}
      >
        <CameraRig />

        {/* ambient + a single warm key light. Particle materials are unlit but
            lights influence the fog/post tonality. */}
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 2, 3]} intensity={0.6} color={theme === 'light' ? '#FFD8C7' : '#FF7A4E'} />

        <CenterBloom count={cfg.centerCount} palette={palette} onClick={onCenter} />

        {CAPABILITIES.map((cap, i) => {
          const angle = (i / CAPABILITIES.length) * Math.PI * 2;
          // alternating radii — slight depth tiering for parallax
          // tuned to keep all six clusters visible on screen at 4:3/5:4 aspect
          // ratios with parallax + drift accounted for. previous values 3.4/3.7
          // pushed clusters past the viewport edge on narrower desktops.
          const radius = i % 2 === 0 ? 2.4 : 2.7;
          // unique slow orbit per cluster
          const orbitSpeed = 0.05 + (i % 3) * 0.012;
          const phase = angle;
          return (
            <CapabilityCluster
              key={cap.id}
              cap={cap}
              index={i}
              count={cfg.clusterCount}
              palette={palette}
              radius={radius}
              size={0.55}
              orbitSpeed={orbitSpeed}
              phaseOffset={phase}
              highlighted={isHighlighted(cap.id)}
              onHoverChange={handleClusterHover}
              onClick={() => onCapability(cap.id)}
              lang={lang}
            />
          );
        })}

        <EffectComposer multisampling={0}>
          <Bloom
            intensity={cfg.bloom}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.6}
            mipmapBlur
          />
          {cfg.dof ? (
            <DepthOfField
              focusDistance={0.02}
              focalLength={0.05}
              bokehScale={1.4}
              height={360}
            />
          ) : <></>}
          {cfg.chromatic ? (
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={[0.0008, 0.0012] as unknown as THREE.Vector2}
              radialModulation={false}
              modulationOffset={0}
            />
          ) : <></>}
          <Vignette eskil={false} offset={0.2} darkness={theme === 'light' ? 0.35 : 0.55} />
          {cfg.grain ? (
            <Noise opacity={0.04} blendFunction={BlendFunction.OVERLAY} />
          ) : <></>}
        </EffectComposer>
      </Canvas>
    </div>
  );
}
