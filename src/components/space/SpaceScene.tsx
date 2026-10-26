import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Stars, Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  BELT_INNER,
  HOVER_SCALE,
  RING_INNER_FACTOR,
  RING_OUTER_FACTOR,
  type ProjectPlanet,
} from "./planets";
import { spaceStore, useSpace } from "./store";

/* ---------- quality tiers ----------
   Everything expensive is sized from one tier decided at mount, so low-end
   phones and laptops get a scene they can actually hold 60fps on. */

type Tier = "low" | "medium" | "high";

interface Quality {
  tier: Tier;
  dpr: [number, number];
  stars: number;
  sparkles: number;
  asteroids: number;
  meteors: number;
  ufos: number;
  sphereSegments: number;
  texSize: number;
  nebula: boolean;
}

const QUALITY: Record<Tier, Omit<Quality, "tier">> = {
  low: {
    dpr: [1, 1],
    stars: 1200,
    sparkles: 0,
    asteroids: 90,
    meteors: 5,
    ufos: 1,
    sphereSegments: 20,
    texSize: 128,
    nebula: false,
  },
  medium: {
    dpr: [1, 1.25],
    stars: 2400,
    sparkles: 40,
    asteroids: 200,
    meteors: 8,
    ufos: 1,
    sphereSegments: 28,
    texSize: 256,
    nebula: true,
  },
  high: {
    dpr: [1, 1.5],
    stars: 3600,
    sparkles: 70,
    asteroids: 320,
    meteors: 10,
    ufos: 2,
    sphereSegments: 40,
    texSize: 256,
    nebula: true,
  },
};

function detectQuality(): Quality {
  if (typeof window === "undefined") return { tier: "medium", ...QUALITY.medium };
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tier: Tier =
    reduced || coarse || window.innerWidth < 820 || cores <= 4
      ? "low"
      : cores <= 8
        ? "medium"
        : "high";
  return { tier, ...QUALITY[tier] };
}

/* ---------- scroll position, sampled once per scroll instead of once per frame ----------
   Reading scrollY/scrollHeight inside useFrame forces a synchronous layout on
   every single frame, which was the scene's biggest stall. */

const scroll = { progress: 0, y: 0 };

function useScrollTracking() {
  useEffect(() => {
    let max = 1;
    const measure = () => {
      max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      update();
    };
    const update = () => {
      scroll.y = window.scrollY;
      scroll.progress = Math.min(1, Math.max(0, scroll.y / max));
    };
    measure();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(document.documentElement);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);
}

/* ---------- procedural textures ---------- */

function makePlanetTexture(base: string, seed: number, size: number) {
  const c = document.createElement("canvas");
  c.width = size * 2;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const col = new THREE.Color(base);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, c.width, c.height);
  let s = seed * 9301 + 49297;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  // latitude bands
  const step = Math.max(2, Math.round(size / 128));
  for (let y = 0; y < c.height; y += step) {
    const n = Math.sin(y * 0.05 + seed) * 0.5 + Math.sin(y * 0.17 + seed * 2) * 0.3;
    const c2 = col.clone().offsetHSL(0, 0, n * 0.12);
    ctx.fillStyle = `#${c2.getHexString()}`;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, y, c.width, step);
  }
  // storms / craters
  ctx.globalAlpha = 0.25;
  const blobs = Math.round(size / 8);
  for (let i = 0; i < blobs; i++) {
    const c3 = col.clone().offsetHSL(0, 0, (rnd() - 0.5) * 0.3);
    ctx.fillStyle = `#${c3.getHexString()}`;
    ctx.beginPath();
    ctx.ellipse(
      rnd() * c.width,
      rnd() * c.height,
      (4 + rnd() * 30) * (size / 256),
      (2 + rnd() * 8) * (size / 256),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  return tex;
}

function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.55)");
  g.addColorStop(0.5, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const LABEL_CANVAS_HEIGHT = 128;
/** World height per unit of camera distance that keeps the label the same
 *  apparent size on screen, the way the DOM labels used to behave. */
const LABEL_SCALE_PER_UNIT = 0.038;

/** Planet name baked into a sprite texture — the DOM-based labels this replaces
 *  re-measured and re-positioned one element per planet on every frame. */
function makeLabelTexture(text: string) {
  const label = text.toUpperCase();
  const font = "600 42px ui-monospace, SFMono-Regular, Menlo, monospace";
  const tracking = "6px";
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = font;
  measure.letterSpacing = tracking; // Chromium only; elsewhere the glyphs just sit tighter
  const pad = 24;
  const c = document.createElement("canvas");
  // Sized to the text, not rounded up to a power of two: the padding that
  // rounding adds would show up as empty width in the sprite's aspect ratio.
  c.width = Math.ceil(measure.measureText(label).width + pad * 2);
  c.height = LABEL_CANVAS_HEIGHT;
  const ctx = c.getContext("2d")!;
  ctx.font = font;
  ctx.letterSpacing = tracking;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return { tex, aspect: c.width / c.height };
}

/* ---------- sun ---------- */

function Sun({ glowTex, q }: { glowTex: THREE.Texture; q: Quality }) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => makePlanetTexture("#ffb347", 7, q.texSize), [q.texSize]);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += Math.min(d, 0.05) * 0.05;
  });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[1.6, q.sphereSegments, q.sphereSegments]} />
        <meshBasicMaterial map={tex} color="#ffd27a" />
      </mesh>
      <sprite scale={[9, 9, 1]}>
        <spriteMaterial
          map={glowTex}
          color="#ffb547"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.9}
        />
      </sprite>
      <sprite scale={[18, 18, 1]}>
        <spriteMaterial
          map={glowTex}
          color="#ff7a3d"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.25}
        />
      </sprite>
      <pointLight intensity={60} distance={60} decay={1.4} color="#fff1d6" />
    </group>
  );
}

/* ---------- planet ---------- */

const planetPositions = new Map<string, THREE.Vector3>();
const ORBIT_IDLE = new THREE.Color("#8a93c9");
const ORBIT_ACTIVE = new THREE.Color("#ffd27a");

/* Only planet bodies are clickable, but a raycast walks the whole scene — which
   meant every pointer move tested thousands of star points and asteroid
   instances. Planet bodies opt into this extra layer and the raycaster is
   pointed at it alone; they stay on layer 0 too, so they still render. */
const INTERACTIVE_LAYER = 1;
const RAYCAST_LAYERS = new THREE.Layers();
RAYCAST_LAYERS.set(INTERACTIVE_LAYER);

function Planet({
  p,
  index,
  glowTex,
  q,
}: {
  p: ProjectPlanet;
  index: number;
  glowTex: THREE.Texture;
  q: Quality;
}) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const bodyMat = useRef<THREE.MeshStandardMaterial>(null);
  const haloMat = useRef<THREE.SpriteMaterial>(null);
  const labelMat = useRef<THREE.SpriteMaterial>(null);
  const labelSprite = useRef<THREE.Sprite>(null);
  const orbitMat = useRef<THREE.LineBasicMaterial>(null);
  const angle = useRef(p.phase);
  const tiltSin = Math.sin(p.tilt);
  const tiltCos = Math.cos(p.tilt);

  const tex = useMemo(
    () => makePlanetTexture(p.color, index + 1, q.texSize),
    [p.color, index, q.texSize],
  );
  const label = useMemo(() => makeLabelTexture(p.name), [p.name]);

  const orbitGeom = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = q.tier === "low" ? 72 : 128;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * p.orbitRadius, 0, Math.sin(a) * p.orbitRadius));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [p.orbitRadius, q.tier]);

  useEffect(() => {
    body.current?.layers.enable(INTERACTIVE_LAYER);
  }, []);

  // Textures and geometries are per-instance; three won't free them for us.
  useEffect(
    () => () => {
      tex.dispose();
      label.tex.dispose();
      orbitGeom.dispose();
    },
    [tex, label, orbitGeom],
  );

  // Hover/selection is read straight off the store inside the frame loop and
  // applied to materials imperatively — no React re-render per pointer move.
  useFrame(({ camera }, raw) => {
    const d = Math.min(raw, 0.05);
    const { selected, hovered } = spaceStore.get();
    const isSelected = selected === p.id;
    const isHovered = hovered === p.id;
    const active = isSelected || isHovered;
    const ease = 1 - Math.exp(-8 * d);

    // planets slow way down while one is being inspected
    angle.current += p.speed * d * (selected ? 0.15 : 1);
    // Position in the flat orbital plane, then rotated about X by the orbit's
    // inclination — the same transform the orbit ring is drawn with, so the
    // planet tracks its own line exactly even at the steeper tilts.
    const inPlane = Math.sin(angle.current) * p.orbitRadius;
    const x = Math.cos(angle.current) * p.orbitRadius;
    const y = -inPlane * tiltSin;
    const z = inPlane * tiltCos;

    if (group.current) {
      group.current.position.set(x, y, z);
      const s = THREE.MathUtils.lerp(group.current.scale.x, active ? HOVER_SCALE : 1, ease);
      group.current.scale.setScalar(s);
    }
    if (body.current) body.current.rotation.y += d * 0.4;
    if (bodyMat.current) {
      bodyMat.current.emissiveIntensity = THREE.MathUtils.lerp(
        bodyMat.current.emissiveIntensity,
        isSelected ? 0.25 : 0.06,
        ease,
      );
    }
    if (haloMat.current) {
      haloMat.current.opacity = THREE.MathUtils.lerp(
        haloMat.current.opacity,
        active ? 0.55 : 0.28,
        ease,
      );
    }
    if (labelMat.current) {
      labelMat.current.opacity = THREE.MathUtils.lerp(
        labelMat.current.opacity,
        active ? 1 : 0.55,
        ease,
      );
    }
    if (labelSprite.current && group.current) {
      // Counter the perspective shrink so the name stays legible at any zoom.
      const h = camera.position.distanceTo(group.current.position) * LABEL_SCALE_PER_UNIT;
      labelSprite.current.scale.set(h * label.aspect, h, 1);
    }
    if (orbitMat.current) {
      orbitMat.current.opacity = THREE.MathUtils.lerp(
        orbitMat.current.opacity,
        active ? 0.6 : 0.16,
        ease,
      );
      orbitMat.current.color.lerp(active ? ORBIT_ACTIVE : ORBIT_IDLE, ease);
    }

    let v = planetPositions.get(p.id);
    if (!v) planetPositions.set(p.id, (v = new THREE.Vector3()));
    v.set(x, y, z);
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    spaceStore.set({ hovered: p.id });
  };
  const onOut = () => {
    if (spaceStore.get().hovered === p.id) spaceStore.set({ hovered: null });
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    spaceStore.set({ selected: p.id });
  };

  return (
    <>
      <group rotation-x={p.tilt}>
        <lineLoop geometry={orbitGeom}>
          <lineBasicMaterial ref={orbitMat} color="#8a93c9" transparent opacity={0.16} />
        </lineLoop>
      </group>
      <group ref={group}>
        <mesh ref={body} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
          <sphereGeometry args={[p.radius, q.sphereSegments, q.sphereSegments]} />
          <meshStandardMaterial
            ref={bodyMat}
            map={tex}
            roughness={0.85}
            metalness={0.05}
            emissive={p.glow}
            emissiveIntensity={0.06}
          />
        </mesh>
        {/* atmosphere */}
        <sprite scale={[p.radius * 4, p.radius * 4, 1]}>
          <spriteMaterial
            ref={haloMat}
            map={glowTex}
            color={p.glow}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0.28}
          />
        </sprite>
        {p.ring && (
          <mesh rotation-x={Math.PI / 2.4}>
            <ringGeometry
              args={[
                p.radius * RING_INNER_FACTOR,
                p.radius * RING_OUTER_FACTOR,
                q.tier === "low" ? 32 : 64,
              ]}
            />
            <meshBasicMaterial color={p.glow} transparent opacity={0.45} side={THREE.DoubleSide} />
          </mesh>
        )}
        {/* scale is set per frame from the camera distance */}
        <sprite ref={labelSprite} position={[0, p.radius + 0.6, 0]}>
          <spriteMaterial
            ref={labelMat}
            map={label.tex}
            transparent
            depthWrite={false}
            opacity={0.55}
          />
        </sprite>
      </group>
    </>
  );
}

/* ---------- black hole ---------- */

function BlackHole({ glowTex, q }: { glowTex: THREE.Texture; q: Quality }) {
  const disc = useRef<THREE.Mesh>(null);
  const discTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 32;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, "#fff7e0");
    g.addColorStop(0.3, "#ffb347");
    g.addColorStop(0.65, "#ff6a3d");
    g.addColorStop(1, "#7a2ea0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 32);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }, []);
  useEffect(() => () => discTex.dispose(), [discTex]);
  useFrame((_, raw) => {
    if (disc.current) disc.current.rotation.z += Math.min(raw, 0.05) * 0.5;
  });
  const seg = q.tier === "low" ? 48 : 96;
  return (
    <group position={[-26, 7, -24]} rotation-x={0.5}>
      {/* event horizon */}
      <mesh>
        <sphereGeometry args={[1.9, q.sphereSegments, q.sphereSegments]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* photon ring */}
      <mesh>
        <torusGeometry args={[2.05, 0.06, 8, seg]} />
        <meshBasicMaterial color="#ffe9b8" />
      </mesh>
      {/* accretion disc */}
      <mesh ref={disc} rotation-x={Math.PI / 2}>
        <torusGeometry args={[3.6, 0.55, 2, seg]} />
        <meshBasicMaterial map={discTex} transparent opacity={0.95} side={THREE.DoubleSide} />
      </mesh>
      <sprite scale={[16, 16, 1]}>
        <spriteMaterial
          map={glowTex}
          color="#ff9a4d"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.35}
        />
      </sprite>
    </group>
  );
}

/* ---------- wormhole ---------- */

function Wormhole({ q }: { q: Quality }) {
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring1.current) {
      ring1.current.rotation.z = t * 0.8;
      ring1.current.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
    }
    if (ring2.current) {
      ring2.current.rotation.z = -t * 1.1;
      ring2.current.scale.setScalar(1 + Math.cos(t * 2.4) * 0.08);
    }
  });
  const seg = q.tier === "low" ? 48 : 96;
  return (
    <group position={[26, -5, -18]} rotation-y={-0.7}>
      <mesh ref={ring1}>
        <torusGeometry args={[1.6, 0.08, 8, seg]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.9} />
      </mesh>
      <mesh ref={ring2}>
        <torusGeometry args={[1.15, 0.05, 8, seg]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.8} />
      </mesh>
      <mesh>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color="#0b1030" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      {q.sparkles > 0 && (
        <Sparkles
          count={Math.min(30, q.sparkles)}
          scale={[3, 3, 1]}
          size={3}
          speed={1.2}
          color="#9fd8ff"
        />
      )}
    </group>
  );
}

/* ---------- meteor shower (instanced streaks) ---------- */

function Meteors({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        max: 1,
      })),
    [count],
  );
  const respawn = (m: (typeof data)[number]) => {
    m.x = (Math.random() - 0.5) * 70;
    m.y = 14 + Math.random() * 14;
    m.z = -30 + Math.random() * 20;
    const sp = 14 + Math.random() * 10;
    m.vx = -sp * 0.8;
    m.vy = -sp * 0.5;
    m.vz = sp * 0.15;
    m.max = m.life = 1.2 + Math.random() * 1.4;
  };
  useFrame((_, raw) => {
    const d = Math.min(raw, 0.05);
    const mesh = ref.current;
    if (!mesh) return;
    data.forEach((m, i) => {
      if (m.life <= 0) {
        if (Math.random() < 0.01) respawn(m);
        else {
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          return;
        }
      }
      m.life -= d;
      m.x += m.vx * d;
      m.y += m.vy * d;
      m.z += m.vz * d;
      dummy.position.set(m.x, m.y, m.z);
      dummy.lookAt(m.x + m.vx, m.y + m.vy, m.z + m.vz);
      const fade = Math.max(0, m.life / m.max);
      dummy.scale.set(0.04, 0.04, 2.5 * fade);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color="#cfe4ff"
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/* ---------- asteroid belt (instanced) ----------
   Matrices are written once at mount; the belt drifts by rotating the parent
   group, so the frame loop touches one transform instead of hundreds. */

function AsteroidBelt({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const r = BELT_INNER + Math.random() * 2.2;
      const a = Math.random() * Math.PI * 2;
      dummy.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.6, Math.sin(a) * r);
      dummy.scale.setScalar(0.03 + Math.random() * 0.08);
      dummy.rotation.set(a * 3, a * 2, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [count]);

  useFrame((_, raw) => {
    if (group.current) group.current.rotation.y += Math.min(raw, 0.05) * 0.025;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#8b8478" roughness={1} />
      </instancedMesh>
    </group>
  );
}

/* ---------- alien visitors (UFO saucers) ---------- */

function UFO({ seed, glowTex, q }: { seed: number; glowTex: THREE.Texture; q: Quality }) {
  const ship = useRef<THREE.Group>(null);
  const beamMat = useRef<THREE.MeshBasicMaterial>(null);
  const path = useMemo(
    () => ({
      r: 16 + seed * 5,
      h: 3 + seed * 2.5,
      speed: 0.06 + seed * 0.025,
      phase: seed * 2.4,
      wobble: 0.8 + seed * 0.4,
    }),
    [seed],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = ship.current;
    if (!g) return;
    const a = t * path.speed + path.phase;
    g.position.set(
      Math.cos(a) * path.r,
      path.h + Math.sin(t * path.wobble) * 1.2,
      Math.sin(a) * path.r,
    );
    // face travel direction with a slight bank
    g.rotation.y = -a;
    g.rotation.z = Math.sin(t * path.wobble) * 0.12;
    g.rotation.x = 0.08;
    if (beamMat.current) {
      beamMat.current.opacity = 0.1 + (0.5 + Math.sin(t * 3 + seed) * 0.3) * 0.12;
    }
  });
  const seg = q.tier === "low" ? 16 : 32;
  return (
    <group ref={ship} scale={0.55}>
      {/* saucer body */}
      <mesh>
        <sphereGeometry args={[1, seg, seg / 2]} />
        <meshStandardMaterial color="#9aa7b8" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh scale={[1.6, 0.45, 1.6]}>
        <sphereGeometry args={[1, seg, seg / 2]} />
        <meshStandardMaterial color="#6b7686" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* glass dome with the pilot */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#9fe8ff"
          transparent
          opacity={0.45}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>
      {/* little alien pilot */}
      <group position={[0, 0.42, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshStandardMaterial color="#7ddf8a" emissive="#3fae5c" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-0.06, 0.18, 0.12]}>
          <sphereGeometry args={[0.035, 6, 6]} />
          <meshBasicMaterial color="#0b2010" />
        </mesh>
        <mesh position={[0.06, 0.18, 0.12]}>
          <sphereGeometry args={[0.035, 6, 6]} />
          <meshBasicMaterial color="#0b2010" />
        </mesh>
      </group>
      {/* glowing rim lights */}
      {q.tier !== "low" &&
        Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.35, -0.08, Math.sin(a) * 1.35]}>
              <sphereGeometry args={[0.07, 6, 6]} />
              <meshBasicMaterial color={i % 2 ? "#7dd3fc" : "#a3e635"} />
            </mesh>
          );
        })}
      {/* tractor beam */}
      <mesh position={[0, -1.1, 0]}>
        <coneGeometry args={[0.8, 1.8, 16, 1, true]} />
        <meshBasicMaterial
          ref={beamMat}
          color="#a3e635"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <sprite scale={[4, 4, 1]}>
        <spriteMaterial
          map={glowTex}
          color="#a3e635"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.12}
        />
      </sprite>
    </group>
  );
}

/* ---------- camera rig: scroll + selection ---------- */

function CameraRig({ planets }: { planets: ProjectPlanet[] }) {
  const look = useRef(new THREE.Vector3());
  const pos = useMemo(() => new THREE.Vector3(), []);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const mouse = useRef({ x: 0, y: 0 });
  const lastScroll = useRef(0);

  useFrame(({ camera, pointer }, raw) => {
    const d = Math.min(raw, 0.05);
    mouse.current.x = THREE.MathUtils.lerp(mouse.current.x, pointer.x, 1 - Math.exp(-2 * d));
    mouse.current.y = THREE.MathUtils.lerp(mouse.current.y, pointer.y, 1 - Math.exp(-2 * d));

    const sel = spaceStore.get().selected;
    // scrolling dismisses the focused planet so the panel doesn't linger
    if (sel && Math.abs(scroll.y - lastScroll.current) > 4) spaceStore.set({ selected: null });
    lastScroll.current = scroll.y;

    const sp = sel ? planetPositions.get(sel) : undefined;
    const planet = sel ? planets.find((x) => x.id === sel) : undefined;
    if (sp && planet) {
      // fly to a comfortable viewing distance, lifted so the card has room
      const dist = planet.radius * 6 + 3;
      offset.copy(sp).normalize().multiplyScalar(dist);
      pos.copy(sp).add(offset);
      pos.y += planet.radius * 2 + 0.8;
      tgt.copy(sp);
    } else {
      const t = scroll.progress;
      // start tilted & close, sweep to a high overview as you scroll
      const ang = 0.6 + t * 1.6;
      const dist = 22 - t * 2;
      pos.set(
        Math.sin(ang) * dist + mouse.current.x * 1.5,
        5 + t * 11 + mouse.current.y,
        Math.cos(ang) * dist,
      );
      tgt.set(0, 0, 0);
    }
    camera.position.lerp(pos, 1 - Math.exp(-2.2 * d));
    look.current.lerp(tgt, 1 - Math.exp(-3 * d));
    camera.lookAt(look.current);
  });
  return null;
}

/* ---------- distant nebula backdrop ---------- */

function Nebula({ glowTex }: { glowTex: THREE.Texture }) {
  return (
    <group>
      <sprite position={[-40, 10, -60]} scale={[70, 50, 1]}>
        <spriteMaterial
          map={glowTex}
          color="#5b3fb8"
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite position={[50, -8, -70]} scale={[80, 55, 1]}>
        <spriteMaterial
          map={glowTex}
          color="#1f6f8b"
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  );
}

export default function SpaceScene() {
  const planets = useSpace((s) => s.planets);
  const q = useMemo(detectQuality, []);
  const glowTex = useMemo(makeGlowTexture, []);
  useScrollTracking();

  // Stop rendering entirely while the tab is in the background.
  const [running, setRunning] = useState(true);
  useEffect(() => {
    const sync = () => setRunning(!document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      camera={{ position: [12, 5, 16], fov: 50, near: 0.1, far: 500 }}
      dpr={q.dpr}
      raycaster={{ layers: RAYCAST_LAYERS }}
      // Antialiasing on a full-screen canvas is expensive; the dpr cap plus the
      // dark backdrop hide the aliasing well enough to be worth dropping.
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false, depth: true }}
      onPointerMissed={() => spaceStore.set({ selected: null })}
    >
      <color attach="background" args={["#05060f"]} />
      <ambientLight intensity={0.35} color="#8090ff" />
      <hemisphereLight args={["#9fb4ff", "#1a0f2e", 0.35]} />
      <Stars radius={120} depth={60} count={q.stars} factor={4} saturation={0.2} fade speed={0.6} />
      {q.sparkles > 0 && (
        <Sparkles
          count={q.sparkles}
          scale={[40, 10, 40]}
          size={2}
          speed={0.2}
          opacity={0.5}
          color="#ffe2a8"
        />
      )}
      {q.nebula && <Nebula glowTex={glowTex} />}
      <BlackHole glowTex={glowTex} q={q} />
      <Wormhole q={q} />
      <Meteors count={q.meteors} />
      <Sun glowTex={glowTex} q={q} />
      {planets.map((p, i) => (
        <Planet key={p.id} p={p} index={i} glowTex={glowTex} q={q} />
      ))}
      <AsteroidBelt count={q.asteroids} />
      {Array.from({ length: q.ufos }, (_, i) => (
        <UFO key={i} seed={i + 1} glowTex={glowTex} q={q} />
      ))}
      <CameraRig planets={planets} />
    </Canvas>
  );
}
