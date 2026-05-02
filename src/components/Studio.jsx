import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Clock,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Group,
  GridHelper,
  HemisphereLight,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './styles/Studio.css';

const plantProfiles = [
  { id: 'herbs', label: 'Kitchen herbs', targetMoisture: 58, dailyUseMl: 92 },
  { id: 'aroid', label: 'Aroid / foliage', targetMoisture: 52, dailyUseMl: 64 },
  { id: 'succulent', label: 'Dry-tolerant', targetMoisture: 34, dailyUseMl: 28 },
];

const materials = [
  {
    id: 'petg',
    label: 'PETG',
    score: 91,
    color: '#5f8d68',
    densityGcm3: 1.27,
    tensileMpa: 50,
    note: 'Water tolerant and practical for first prints',
  },
  {
    id: 'asa',
    label: 'ASA',
    score: 86,
    color: '#45524b',
    densityGcm3: 1.07,
    tensileMpa: 43,
    note: 'Tougher under heat and sun, harder to print',
  },
  {
    id: 'ceramic',
    label: 'Ceramic sleeve',
    score: 72,
    color: '#d9d0bd',
    densityGcm3: 2.15,
    tensileMpa: 28,
    note: 'Premium exterior around printable internals',
  },
];

const cadModes = [
  { id: 'assembly', label: 'Assembly' },
  { id: 'flow', label: 'Flow test' },
  { id: 'stress', label: 'Stress test' },
  { id: 'section', label: 'Section' },
];

const cadProfiles = [
  { id: 'tapered', label: 'Tapered', bottom: 0.72, shoulder: 0.92, top: 1.03 },
  { id: 'straight', label: 'Straight', bottom: 0.88, shoulder: 0.98, top: 1 },
  { id: 'bell', label: 'Bell', bottom: 0.64, shoulder: 0.94, top: 1.16 },
];

const defaultRimWidth = 7;

const simulationProfiles = [
  { id: 'room', label: 'Room baseline', temperature: 23, humidity: 48, light: 62 },
  { id: 'window', label: 'Hot window', temperature: 30, humidity: 34, light: 92 },
  { id: 'shade', label: 'Cool shade', temperature: 18, humidity: 64, light: 28 },
];

const electronics = [
  { label: 'ESP32-S3', detail: 'Wi-Fi, BLE, local autonomy, OTA-ready firmware' },
  { label: 'Capacitive moisture', detail: 'Trend-aware soil signal with calibration routine' },
  { label: 'Reservoir level', detail: 'Float switch v1, capacitive level path later' },
  { label: 'Peristaltic pump', detail: 'Measured dosing with isolated fluid path' },
  { label: 'BME280 / SHT31', detail: 'Temperature and humidity context' },
  { label: 'BH1750 / VEML7700', detail: 'Light signal for water demand modeling' },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function interpolate(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function formatLiters(value) {
  return `${value.toFixed(1)} L`;
}

function formatKpa(value) {
  return `${value.toFixed(1)} kPa`;
}

function formatKg(value) {
  return `${value.toFixed(2)} kg`;
}

function frustumVolumeMm3(heightMm, bottomRadiusMm, topRadiusMm) {
  return Math.PI * heightMm * (
    bottomRadiusMm ** 2 + bottomRadiusMm * topRadiusMm + topRadiusMm ** 2
  ) / 3;
}

function tubeVolumeMm3(centerRadiusMm, tubeRadiusMm) {
  return 2 * Math.PI ** 2 * centerRadiusMm * tubeRadiusMm ** 2;
}

export function getCadEnvelopeRadiusAtY(y, dimensions) {
  const { baseY, outerBottom, outerShoulder, outerTop, topY } = dimensions;
  if (y <= baseY) return outerBottom;
  if (y >= topY - 0.48) return outerTop;

  const lowerSpan = Math.max((topY - 0.48) - (baseY + 0.1), 0.001);
  const lowerProgress = clamp((y - (baseY + 0.1)) / lowerSpan, 0, 1);
  return interpolate(outerBottom, outerShoulder, smoothstep(lowerProgress));
}

export function buildInternalTubePath(dimensions) {
  const {
    baseY,
    radius,
    topY,
    wall,
  } = dimensions;
  const tubeRadius = 0.022;
  const clearance = Math.max(wall + tubeRadius + 0.04, 0.12);

  const clampInside = (point) => {
    const envelope = getCadEnvelopeRadiusAtY(point.y, dimensions);
    const maxRadial = Math.max(envelope - clearance, radius * 0.34);
    const radial = Math.hypot(point.x, point.z);
    if (radial <= maxRadial) return point;

    const scale = maxRadial / Math.max(radial, 0.001);
    return new Vector3(point.x * scale, point.y, point.z * scale);
  };

  return [
    clampInside(new Vector3(-radius * 0.34, baseY + 0.2, radius * 0.12)),
    clampInside(new Vector3(-radius * 0.5, -0.2, radius * 0.22)),
    clampInside(new Vector3(-radius * 0.38, topY - 0.44, radius * 0.24)),
    clampInside(new Vector3(-radius * 0.12, topY - 0.1, radius * 0.18)),
  ];
}

function buildCadPhysics({
  diameter,
  height,
  reservoir,
  wallThickness,
  rimWidth,
  selectedMaterial,
  profileId,
}) {
  const profile = cadProfiles.find((candidate) => candidate.id === profileId) ?? cadProfiles[0];
  const nominalRadiusMm = diameter / 2;
  const outerBottomRadiusMm = nominalRadiusMm * profile.bottom;
  const outerShoulderRadiusMm = nominalRadiusMm * profile.shoulder;
  const outerTopRadiusMm = nominalRadiusMm * profile.top;
  const shellHeightMm = height;
  const innerBottomRadiusMm = Math.max(outerBottomRadiusMm - wallThickness * 0.62, nominalRadiusMm * 0.46);
  const innerTopRadiusMm = Math.max(outerTopRadiusMm - wallThickness, nominalRadiusMm * 0.55);
  const soilHeightMm = height * 0.68;
  const soilVolumeL = frustumVolumeMm3(soilHeightMm, innerBottomRadiusMm, innerTopRadiusMm) / 1000000;

  const outerShellVolumeMm3 = frustumVolumeMm3(shellHeightMm, outerBottomRadiusMm, outerTopRadiusMm);
  const innerShellVolumeMm3 = frustumVolumeMm3(
    shellHeightMm - wallThickness * 1.8,
    innerBottomRadiusMm,
    innerTopRadiusMm,
  );
  const rimVolumeMm3 = tubeVolumeMm3(Math.max(outerTopRadiusMm, nominalRadiusMm * 0.86), rimWidth);
  const gasketVolumeMm3 = Math.PI * ((nominalRadiusMm * 0.98) ** 2 - (nominalRadiusMm * 0.74) ** 2) * 18;
  const printableVolumeCm3 = Math.max(
    (outerShellVolumeMm3 - innerShellVolumeMm3 + rimVolumeMm3 + gasketVolumeMm3) / 1000,
    1,
  );
  const dryMassKg = printableVolumeCm3 * selectedMaterial.densityGcm3 / 1000;

  const reservoirVolumeMm3 = reservoir * 1000000;
  const reservoirBottomRadiusMm = nominalRadiusMm * 0.72;
  const reservoirTopRadiusMm = nominalRadiusMm * 0.86;
  const reservoirAreaMm2 = Math.PI * ((reservoirBottomRadiusMm + reservoirTopRadiusMm) / 2) ** 2;
  const waterColumnM = clamp(reservoirVolumeMm3 / reservoirAreaMm2, 35, height * 0.45) / 1000;
  const hydrostaticPressurePa = 997 * 9.80665 * waterColumnM;
  const pumpPeakPressurePa = 55000;
  const designPressurePa = hydrostaticPressurePa + pumpPeakPressurePa;
  const hoopStressMpa = designPressurePa * (outerTopRadiusMm / 1000) / (wallThickness / 1000) / 1000000;
  const safetyFactor = selectedMaterial.tensileMpa / Math.max(hoopStressMpa, 0.001);
  const waterMassKg = reservoir;
  const soilMassKg = soilVolumeL * 0.85;
  const totalMassKg = dryMassKg + waterMassKg + soilMassKg;
  const centerOfMassHeightMm = (
    dryMassKg * height * 0.44 + waterMassKg * height * 0.18 + soilMassKg * height * 0.58
  ) / Math.max(totalMassKg, 0.001);
  const stabilityAngleDeg = Math.atan(outerBottomRadiusMm / centerOfMassHeightMm) * 180 / Math.PI;

  return {
    dryMassKg,
    hydrostaticPressureKpa: hydrostaticPressurePa / 1000,
    hoopStressMpa,
    printableVolumeCm3,
    safetyFactor,
    soilVolumeL,
    stabilityAngleDeg,
    totalMassKg,
  };
}

const cssVars = {
  glowX: '--glow-x',
  glowY: '--glow-y',
  panoramaDriftX: '--panorama-drift-x',
  panoramaDriftY: '--panorama-drift-y',
  panoramaLightX: '--panorama-light-x',
  panoramaRotate: '--panorama-rotate',
  panoramaScale: '--panorama-scale',
  pointerX: '--pointer-x',
  pointerY: '--pointer-y',
  scrollProgress: '--scroll-progress',
  sectionCopyY: '--section-copy-y',
};

const panoramaCameraStops = [
  { x: 82, y: -2.6, scale: 1.015, rotate: -0.9, light: -56, copy: -2.4 },
  { x: 32, y: -1.6, scale: 1.04, rotate: 0.25, light: -18, copy: -0.8 },
  { x: -12, y: -0.8, scale: 1.065, rotate: 0.75, light: 20, copy: 0.45 },
  { x: -58, y: -1.35, scale: 1.075, rotate: -0.35, light: 54, copy: 1.35 },
  { x: -82, y: -2.4, scale: 1.045, rotate: -0.95, light: 32, copy: 2.2 },
];

function buildPanoramaFrame(journey, pointerY) {
  const cameraPosition = journey * (panoramaCameraStops.length - 1);
  const cameraIndex = Math.min(Math.floor(cameraPosition), panoramaCameraStops.length - 2);
  const easedLocalJourney = smoothstep(cameraPosition - cameraIndex);
  const currentStop = panoramaCameraStops[cameraIndex];
  const nextStop = panoramaCameraStops[cameraIndex + 1];

  return {
    [cssVars.scrollProgress]: journey.toFixed(4),
    [cssVars.panoramaDriftX]: `${interpolate(currentStop.x, nextStop.x, easedLocalJourney).toFixed(2)}vw`,
    [cssVars.panoramaDriftY]: `${interpolate(currentStop.y, nextStop.y, easedLocalJourney).toFixed(2)}vh`,
    [cssVars.panoramaRotate]: `${interpolate(currentStop.rotate, nextStop.rotate, easedLocalJourney).toFixed(2)}deg`,
    [cssVars.panoramaScale]: interpolate(currentStop.scale, nextStop.scale, easedLocalJourney).toFixed(4),
    [cssVars.panoramaLightX]: `${interpolate(currentStop.light, nextStop.light, easedLocalJourney).toFixed(2)}vw`,
    [cssVars.sectionCopyY]: `${(interpolate(currentStop.copy, nextStop.copy, easedLocalJourney) + pointerY * 0.22).toFixed(2)}vh`,
  };
}

function setCachedStyleVar(node, cache, name, value) {
  if (cache[name] === value) return;
  node.style.setProperty(name, value);
  cache[name] = value;
}

function usePanoramaMotion() {
  const shellRef = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const rootStyle = useRef({});

  useEffect(() => {
    const element = shellRef.current;
    if (!element) return undefined;
    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    let frameId = 0;
    let scrollDirty = true;
    let pointerDirty = true;

    const scheduleMotionFrame = () => {
      if (frameId) return;
      frameId = requestAnimationFrame(updateMotion);
    };

    const setTarget = (clientX, clientY) => {
      const rect = element.getBoundingClientRect();
      target.current.x = ((clientX - rect.left) / rect.width - 0.5) * 2;
      target.current.y = ((clientY - rect.top) / rect.height - 0.5) * 2;
      pointerDirty = true;
      scheduleMotionFrame();
    };

    function updateMotion() {
      frameId = 0;
      const pointerX = target.current.x;
      const pointerY = target.current.y;
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const journey = clamp(window.scrollY / scrollable, 0, 1);
      const shouldWritePointer = pointerDirty;

      if (scrollDirty) {
        const frame = buildPanoramaFrame(journey, pointerY);
        Object.entries(frame).forEach(([name, value]) => {
          setCachedStyleVar(element, rootStyle.current, name, value);
        });
      }

      if (shouldWritePointer || scrollDirty) {
        setCachedStyleVar(element, rootStyle.current, cssVars.pointerX, pointerX.toFixed(4));
        setCachedStyleVar(element, rootStyle.current, cssVars.pointerY, pointerY.toFixed(4));
        setCachedStyleVar(element, rootStyle.current, cssVars.glowX, `${(50 + pointerX * 8).toFixed(2)}%`);
        setCachedStyleVar(element, rootStyle.current, cssVars.glowY, `${(50 + pointerY * 6).toFixed(2)}%`);
      }

      scrollDirty = false;
      pointerDirty = false;
    }

    const handlePointerMove = (event) => setTarget(event.clientX, event.clientY);
    const handlePointerLeave = () => {
      target.current.x = 0;
      target.current.y = 0;
      pointerDirty = true;
      scheduleMotionFrame();
    };

    const markScrollDirty = () => {
      scrollDirty = true;
      scheduleMotionFrame();
    };

    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('scroll', markScrollDirty, { passive: true });
    window.addEventListener('resize', markScrollDirty);
    markScrollDirty();

    return () => {
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('scroll', markScrollDirty);
      window.removeEventListener('resize', markScrollDirty);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return shellRef;
}

function makeMachinedTexture(baseColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const base = new Color(baseColor);
  const dark = base.clone().multiplyScalar(0.55).getStyle();
  const light = base.clone().lerp(new Color(0xffffff), 0.42).getStyle();

  context.fillStyle = base.getStyle();
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 1) {
    const band = 0.5 + Math.sin(y * 0.34) * 0.18 + Math.sin(y * 2.1) * 0.04;
    context.fillStyle = band > 0.55 ? light : dark;
    context.globalAlpha = band > 0.55 ? 0.08 : 0.06;
    context.fillRect(0, y, canvas.width, 1);
  }

  context.globalAlpha = 0.12;
  for (let x = 0; x < canvas.width; x += 11) {
    context.fillStyle = x % 22 === 0 ? '#ffffff' : '#000000';
    context.fillRect(x, 0, 1, canvas.height);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(3, 7);
  return texture;
}

function makeSoilTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = '#4c4033';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 4200; index += 1) {
    const xSeed = Math.sin(index * 12.9898) * 43758.5453;
    const ySeed = Math.sin(index * 78.233) * 19341.413;
    const sizeSeed = Math.sin(index * 37.719) * 28411.129;
    const shadeSeed = Math.sin(index * 4.761) * 9173.771;
    const alphaSeed = Math.sin(index * 9.173) * 19191.13;
    const xRandom = xSeed - Math.floor(xSeed);
    const yRandom = ySeed - Math.floor(ySeed);
    const sizeRandom = sizeSeed - Math.floor(sizeSeed);
    const shadeRandom = shadeSeed - Math.floor(shadeSeed);
    const alphaRandom = alphaSeed - Math.floor(alphaSeed);
    const x = xRandom * canvas.width;
    const y = yRandom * canvas.height;
    const size = 0.8 + sizeRandom * 3.2;
    const shade = 42 + Math.floor(shadeRandom * 68);
    context.globalAlpha = 0.2 + alphaRandom * 0.5;
    context.fillStyle = `rgb(${shade + 24}, ${shade + 15}, ${shade + 4})`;
    context.beginPath();
    context.ellipse(x, y, size * 1.6, size, Math.random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2.2, 2.2);
  return texture;
}

function addCadEdges(mesh, color = 0x244131, threshold = 32) {
  const edges = new LineSegments(
    new EdgesGeometry(mesh.geometry, threshold),
    new LineBasicMaterial({ color, transparent: true, opacity: 0.2 }),
  );
  mesh.add(edges);
  return edges;
}

function disposeMaterial(material) {
  Object.values(material).forEach((value) => {
    if (value?.isTexture) value.dispose();
  });
  material.dispose();
}

const ThreeStage = ({
  variant,
  diameter,
  height,
  reservoir,
  materialColor,
  light,
  humidity,
  cadMode = 'assembly',
  exploded = 0,
  profileId = 'tapered',
  wallThickness = 7,
  rimWidth = 7,
}) => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom')) return undefined;

    const canvas = document.createElement('canvas');
    let context;
    try {
      context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    } catch {
      return undefined;
    }

    if (!context) return undefined;

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, context, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, variant === 'cad' ? 2 : 2.5));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = variant === 'cad' ? 1.18 : 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(variant === 'cad' ? 35 : 42, 1, 0.1, 100);
    camera.position.set(variant === 'cad' ? 3.8 : 0, variant === 'cad' ? 2.6 : 1.25, variant === 'cad' ? 6.1 : 7.2);
    camera.lookAt(0, variant === 'cad' ? 0.15 : -0.05, 0);

    scene.add(new HemisphereLight(0xf7ffe8, 0x244233, variant === 'cad' ? 3.1 : 2.6));

    const keyLight = new DirectionalLight(0xffffff, variant === 'cad' ? 3.8 : 3.2);
    keyLight.position.set(4, 6, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 16;
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    scene.add(keyLight);

    const fillLight = new DirectionalLight(0xa9f2ff, variant === 'cad' ? 1.15 : 0.2);
    fillLight.position.set(-5, 2.4, -3.6);
    scene.add(fillLight);

    const group = new Group();
    scene.add(group);

    if (variant === 'cad') {
      const machinedTexture = makeMachinedTexture(materialColor);
      const profileShape = cadProfiles.find((profile) => profile.id === profileId) ?? cadProfiles[0];
      const explode = clamp(exploded / 100, 0, 1);
      const isFlowMode = cadMode === 'flow';
      const isStressMode = cadMode === 'stress';
      const isSectionMode = cadMode === 'section';
      const testPulseMeshes = [];
      const shellMaterial = new MeshPhysicalMaterial({
        color: new Color(materialColor),
        clearcoat: 0.72,
        clearcoatRoughness: 0.34,
        metalness: 0.12,
        opacity: isSectionMode ? 0.42 : 1,
        roughness: isStressMode ? 0.28 : 0.34,
        roughnessMap: machinedTexture,
        transparent: isSectionMode,
      });
      const waterMaterial = new MeshPhysicalMaterial({
        color: isFlowMode ? 0x4cecff : 0x63c5d5,
        transparent: true,
        opacity: isFlowMode ? 0.78 : 0.62,
        roughness: 0.02,
        transmission: 0.44,
      });
      const glassMaterial = new MeshPhysicalMaterial({
        color: 0xb7f1ef,
        transparent: true,
        opacity: 0.28,
        roughness: 0.02,
        transmission: 0.6,
        side: DoubleSide,
      });
      const soilMaterial = new MeshStandardMaterial({ color: 0x44362b, roughness: 0.96 });
      const metalMaterial = new MeshStandardMaterial({ color: 0xd7b866, roughness: 0.26, metalness: 0.48 });
      const blackMaterial = new MeshStandardMaterial({ color: 0x17211c, roughness: 0.42, metalness: 0.18 });
      const rubberMaterial = new MeshStandardMaterial({ color: 0x111713, roughness: 0.74 });
      const flowMaterial = new MeshPhysicalMaterial({
        color: 0x56f2ff,
        emissive: 0x0f8fa1,
        emissiveIntensity: 0.7,
        opacity: 0.86,
        roughness: 0.04,
        transparent: true,
        transmission: 0.18,
      });
      const stressMaterial = new MeshStandardMaterial({
        color: 0xff9340,
        emissive: 0xbd4515,
        emissiveIntensity: 0.52,
        opacity: 0.58,
        roughness: 0.38,
        transparent: true,
      });

      const radius = clamp(diameter / 180, 0.78, 1.35);
      const bodyHeight = clamp(height / 210, 0.86, 1.55) * 2.6;
      const baseY = -bodyHeight / 2;
      const topY = bodyHeight / 2;
      const wall = clamp(radius * (wallThickness / 82), 0.045, 0.17);
      const rimTube = clamp(rimWidth / 100, 0.045, 0.14);
      const outerBottom = radius * profileShape.bottom;
      const outerShoulder = radius * profileShape.shoulder;
      const outerTop = radius * profileShape.top;
      const cadDimensions = {
        baseY,
        outerBottom,
        outerShoulder,
        outerTop,
        radius,
        topY,
        wall,
      };
      const profile = [
        new Vector2(outerBottom, baseY + 0.1),
        new Vector2(radius * (profileShape.bottom + 0.1), baseY - 0.04),
        new Vector2(outerShoulder, topY - 0.48),
        new Vector2(outerTop, topY - 0.08),
        new Vector2(outerTop + rimTube, topY + 0.08),
        new Vector2(outerTop + rimTube * 0.38, topY + 0.19),
        new Vector2(outerTop - wall, topY + 0.09),
        new Vector2(Math.max(outerBottom - wall * 0.62, radius * 0.46), baseY + 0.22),
        new Vector2(outerBottom, baseY + 0.1),
      ];

      const addPart = (object, explodeVector = new Vector3()) => {
        object.position.addScaledVector(explodeVector, explode);
        group.add(object);
        return object;
      };

      const shell = new Mesh(new LatheGeometry(profile, 160), shellMaterial);
      shell.castShadow = true;
      shell.receiveShadow = true;
      addPart(shell, new Vector3(-1.05, 0.12, -0.16));
      addCadEdges(shell);

      const rim = new Mesh(new TorusGeometry(Math.max(outerTop, radius * 0.86), rimTube, 20, 160), shellMaterial);
      rim.position.y = topY + 0.12;
      rim.rotation.x = Math.PI / 2;
      rim.castShadow = true;
      addPart(rim, new Vector3(0, 0.88, -0.12));
      addCadEdges(rim, 0x183326);

      const innerSleeve = new Mesh(
        new CylinderGeometry(radius * 0.72, Math.max(outerShoulder - wall, radius * 0.74), bodyHeight * 0.68, 128, 1, true),
        new MeshPhysicalMaterial({
          color: 0xe8f7eb,
          metalness: 0.02,
          opacity: isSectionMode ? 0.52 : 0.34,
          roughness: 0.18,
          side: DoubleSide,
          transparent: true,
          transmission: 0.24,
        }),
      );
      innerSleeve.position.y = baseY + bodyHeight * 0.5;
      addPart(innerSleeve, new Vector3(0.72, 0.28, 0.04));

      const soil = new Mesh(
        new CylinderGeometry(radius * 0.73, radius * 0.79, 0.1, 128),
        soilMaterial,
      );
      soil.position.y = topY + 0.05;
      soil.receiveShadow = true;
      addPart(soil, new Vector3(0.28, 0.74, 0.38));

      for (let index = 0; index < 42; index += 1) {
        const angle = index * 2.3999632297;
        const spread = Math.sqrt((index + 0.5) / 42) * radius * 0.67;
        const seed = Math.sin(index * 12.9898) * 43758.5453;
        const pebble = new Mesh(
          new SphereGeometry(0.025 + (seed - Math.floor(seed)) * 0.028, 12, 8),
          new MeshStandardMaterial({
            color: new Color(index % 3 === 0 ? 0x574431 : index % 3 === 1 ? 0x3d3027 : 0x675341),
            roughness: 0.98,
          }),
        );
        pebble.scale.set(1.35, 0.42, 0.88);
        pebble.position.set(Math.cos(angle) * spread, topY + 0.11, Math.sin(angle) * spread);
        pebble.rotation.set(seed * 0.01, angle, seed * 0.02);
        addPart(pebble, new Vector3(0.28, 0.74, 0.38));
      }

      const reservoirHeight = clamp(reservoir, 0.45, 1.8) * 0.36;
      const reservoirMesh = new Mesh(
        new CylinderGeometry(radius * 0.72, radius * 0.86, reservoirHeight, 128),
        waterMaterial,
      );
      reservoirMesh.position.y = baseY + reservoirHeight / 2 + 0.14;
      addPart(reservoirMesh, new Vector3(0.08, -0.54, 0.18));

      const sightGlass = new Mesh(new BoxGeometry(radius * 0.54, bodyHeight * 0.36, 0.035), glassMaterial);
      sightGlass.position.set(0, baseY + bodyHeight * 0.28, radius * 0.91);
      addPart(sightGlass, new Vector3(0.92, -0.06, 0.68));
      addCadEdges(sightGlass, 0x237b78, 12);

      const baseGasket = new Mesh(new CylinderGeometry(radius * 0.92, radius * 0.98, 0.18, 128), rubberMaterial);
      baseGasket.position.y = baseY - 0.08;
      baseGasket.receiveShadow = true;
      addPart(baseGasket, new Vector3(0, -0.78, -0.08));

      const electronicsBay = new Mesh(
        new BoxGeometry(radius * 0.74, 0.5, 0.38),
        blackMaterial,
      );
      electronicsBay.position.set(0, baseY + 0.18, radius * 0.93);
      electronicsBay.castShadow = true;
      addPart(electronicsBay, new Vector3(0.95, -0.22, 0.98));
      addCadEdges(electronicsBay, 0x9bd7c8, 12);

      for (let index = 0; index < 4; index += 1) {
        const chip = new Mesh(
          new BoxGeometry(radius * 0.12, 0.035, 0.08),
          new MeshStandardMaterial({ color: index % 2 ? 0x315f57 : 0x202c2a, roughness: 0.34, metalness: 0.18 }),
        );
        chip.position.set((index - 1.5) * radius * 0.16, baseY + 0.42, radius * 1.13);
        addPart(chip, new Vector3(0.95, -0.22, 0.98));
      }

      if (!isFlowMode) {
        const sensor = new Mesh(new BoxGeometry(0.045, bodyHeight * 0.78, 0.035), metalMaterial);
        sensor.position.set(radius * 0.5, 0.14, radius * 0.18);
        sensor.castShadow = true;
        addPart(sensor);

        const sensorRail = new Mesh(new BoxGeometry(0.035, bodyHeight * 0.9, 0.035), blackMaterial);
        sensorRail.position.set(radius * 0.58, 0.1, radius * 0.2);
        addPart(sensorRail);
      }

      const refillCap = new Mesh(new CylinderGeometry(radius * 0.105, radius * 0.105, 0.024, 48), blackMaterial);
      refillCap.position.set(-radius * 0.46, topY + 0.18, radius * 0.28);
      refillCap.castShadow = true;
      addPart(refillCap, new Vector3(0, 0.88, -0.12));

      const outletPort = buildInternalTubePath(cadDimensions).at(-1);
      const nozzle = new Mesh(new CylinderGeometry(0.026, 0.038, 0.16, 24), metalMaterial);
      nozzle.position.set(outletPort.x, topY + 0.02, outletPort.z);
      nozzle.rotation.set(Math.PI / 2, 0, -0.38);
      addPart(nozzle);

      const tubePath = buildInternalTubePath(cadDimensions);
      const tubeCurve = new CatmullRomCurve3(tubePath);
      const tube = new Mesh(
        new TubeGeometry(tubeCurve, 72, 0.022, 12, false),
        new MeshPhysicalMaterial({
          color: 0x93e7dc,
          opacity: isSectionMode || isFlowMode ? 0.72 : 0.34,
          roughness: 0.08,
          transparent: true,
          transmission: 0.24,
        }),
      );
      tube.castShadow = true;
      addPart(tube);

      if (isFlowMode) {
        for (let index = 0; index < 5; index += 1) {
          const bead = new Mesh(new SphereGeometry(0.038, 18, 12), flowMaterial.clone());
          const point = tubeCurve.getPointAt(index / 5);
          bead.position.copy(point);
          group.add(bead);
          testPulseMeshes.push(bead);
        }

        const dosingPool = new Mesh(
          new TorusGeometry(radius * 0.24, 0.01, 10, 64),
          flowMaterial.clone(),
        );
        dosingPool.position.set(outletPort.x, topY + 0.02, outletPort.z);
        dosingPool.rotation.x = Math.PI / 2;
        addPart(dosingPool);
        testPulseMeshes.push(dosingPool);
      }

      if (isStressMode) {
        for (let index = 0; index < 3; index += 1) {
          const band = new Mesh(
            new TorusGeometry(radius * (0.74 + index * 0.11), 0.012, 8, 96),
            stressMaterial.clone(),
          );
          band.position.y = baseY + bodyHeight * (0.22 + index * 0.24);
          band.rotation.x = Math.PI / 2;
          addPart(band, new Vector3(-1.05, 0.12, -0.16));
          testPulseMeshes.push(band);
        }
      }

      if (isSectionMode) {
        const sectionRadius = Math.max(
          getCadEnvelopeRadiusAtY(topY - 0.52, cadDimensions) - wall * 0.55,
          radius * 0.42,
        );
        const sectionRing = new Mesh(
          new RingGeometry(sectionRadius, sectionRadius + 0.006, 160),
          new MeshStandardMaterial({ color: 0x243a31, roughness: 0.38, side: DoubleSide }),
        );
        sectionRing.position.y = topY - 0.52;
        sectionRing.rotation.x = Math.PI / 2;
        addPart(sectionRing);
      }

      const floor = new Mesh(
        new PlaneGeometry(7, 7),
        new MeshStandardMaterial({
          color: 0xeaf0e7,
          opacity: 0.54,
          roughness: 0.82,
          transparent: true,
        }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = baseY - 0.2;
      floor.receiveShadow = true;
      scene.add(floor);

      const grid = new GridHelper(6.2, 28, 0x517263, 0xa8bbb0);
      grid.material.opacity = 0.44;
      grid.material.transparent = true;
      grid.position.y = baseY - 0.195;
      scene.add(grid);

      group.position.set(0, 0.18, 0);
      group.rotation.set(-0.08, -0.38, 0);
      group.userData.testPulseMeshes = testPulseMeshes;
    } else {
      const scenarioWarmth = clamp((light - 20) / 80, 0, 1);
      const radius = clamp(diameter / 190, 0.72, 1.28);
      const bodyHeight = clamp(height / 220, 0.78, 1.36) * 1.95;
      const baseY = -bodyHeight / 2;
      const topY = bodyHeight / 2;
      const potColor = new Color(materialColor).lerp(new Color(0xe1f0dc), 0.18);
      const potMaterial = new MeshPhysicalMaterial({
        color: potColor,
        clearcoat: 0.52,
        clearcoatRoughness: 0.48,
        metalness: 0.02,
        roughness: 0.58,
      });
      const trayMaterial = new MeshPhysicalMaterial({
        color: 0x16291e,
        clearcoat: 0.22,
        clearcoatRoughness: 0.6,
        roughness: 0.72,
      });
      const soilMaterial = new MeshStandardMaterial({
        color: 0x4b3d30,
        map: makeSoilTexture(),
        roughness: 0.98,
      });
      const waterBandMaterial = new MeshPhysicalMaterial({
        color: 0x79d9df,
        opacity: 0.48,
        roughness: 0.06,
        transparent: true,
        transmission: 0.32,
      });
      const stemMaterial = new MeshStandardMaterial({ color: 0x6f9865, roughness: 0.82 });
      const leafMaterial = new MeshPhysicalMaterial({
        color: new Color(0x74a962).lerp(new Color(0xc7e987), scenarioWarmth * 0.2),
        clearcoat: 0.18,
        clearcoatRoughness: 0.74,
        roughness: 0.62,
      });

      const ground = new Mesh(
        new CircleGeometry(3.6, 160),
        new MeshStandardMaterial({ color: 0xdde7d9, roughness: 0.92 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = baseY - 0.18;
      ground.receiveShadow = true;
      scene.add(ground);

      const tray = new Mesh(new CylinderGeometry(radius * 1.2, radius * 1.32, 0.16, 160), trayMaterial);
      tray.position.y = baseY - 0.08;
      tray.castShadow = true;
      tray.receiveShadow = true;
      group.add(tray);

      const potProfile = [
        new Vector2(radius * 0.72, baseY + 0.12),
        new Vector2(radius * 0.82, baseY),
        new Vector2(radius * 0.94, topY - 0.34),
        new Vector2(radius * 1.05, topY - 0.08),
        new Vector2(radius * 1.12, topY + 0.04),
        new Vector2(radius * 1.08, topY + 0.14),
        new Vector2(radius * 0.92, topY + 0.07),
        new Vector2(radius * 0.68, baseY + 0.2),
        new Vector2(radius * 0.72, baseY + 0.12),
      ];
      const pot = new Mesh(
        new LatheGeometry(potProfile, 192),
        potMaterial,
      );
      pot.castShadow = true;
      pot.receiveShadow = true;
      group.add(pot);

      const rimHighlight = new Mesh(
        new TorusGeometry(radius * 1.05, 0.035, 16, 160),
        new MeshPhysicalMaterial({ color: 0xe6f3df, clearcoat: 0.46, roughness: 0.42 }),
      );
      rimHighlight.position.y = topY + 0.08;
      rimHighlight.rotation.x = Math.PI / 2;
      rimHighlight.castShadow = true;
      group.add(rimHighlight);

      const soil = new Mesh(new CylinderGeometry(radius * 0.8, radius * 0.84, 0.08, 160), soilMaterial);
      soil.position.y = topY + 0.06;
      soil.receiveShadow = true;
      group.add(soil);

      for (let index = 0; index < 95; index += 1) {
        const angle = index * 2.3999632297;
        const spread = Math.sqrt((index + 0.3) / 95) * radius * 0.72;
        const seed = Math.sin(index * 28.41) * 10000;
        const grain = new Mesh(
          new SphereGeometry(0.011 + (seed - Math.floor(seed)) * 0.022, 10, 7),
          new MeshStandardMaterial({
            color: new Color(index % 4 === 0 ? 0x8b785e : index % 4 === 1 ? 0x5a4a3a : index % 4 === 2 ? 0xb8a080 : 0x73614c),
            roughness: 0.96,
          }),
        );
        grain.scale.set(1.8, 0.42, 1);
        grain.position.set(Math.cos(angle) * spread, topY + 0.105, Math.sin(angle) * spread);
        grain.rotation.set(seed * 0.01, angle, seed * 0.02);
        grain.castShadow = true;
        group.add(grain);
      }

      const water = new Mesh(
        new CylinderGeometry(radius * 0.82, radius * 0.88, clamp(reservoir, 0.45, 1.8) * 0.19, 128),
        waterBandMaterial,
      );
      water.position.y = baseY + 0.22;
      group.add(water);

      const sightGlass = new Mesh(
        new BoxGeometry(radius * 0.32, bodyHeight * 0.3, 0.026),
        new MeshPhysicalMaterial({
          color: 0xbdece7,
          opacity: 0.38,
          roughness: 0.04,
          transparent: true,
          transmission: 0.42,
        }),
      );
      sightGlass.position.set(-radius * 0.44, baseY + bodyHeight * 0.42, radius * 0.76);
      group.add(sightGlass);

      for (let index = 0; index < 14; index += 1) {
        const angle = index * 0.448 + 0.2;
        const tier = index % 3;
        const stem = new Mesh(new CapsuleGeometry(0.018, 0.68 + scenarioWarmth * 0.16, 8, 16), stemMaterial);
        stem.position.set(Math.cos(angle) * radius * 0.09, topY + 0.35 + tier * 0.02, Math.sin(angle) * radius * 0.09);
        stem.rotation.z = Math.sin(angle) * 0.36;
        stem.rotation.x = Math.cos(angle) * 0.34;
        stem.castShadow = true;
        group.add(stem);

        const leaf = new Mesh(
          new SphereGeometry(0.12 + light / 1050 + tier * 0.012, 40, 20),
          leafMaterial,
        );
        leaf.scale.set(1.9 - tier * 0.16, 0.11, 0.66 + tier * 0.08);
        leaf.position.set(
          Math.cos(angle) * radius * (0.28 + tier * 0.08),
          topY + 0.58 + humidity / 520 + tier * 0.05 + Math.sin(index * 1.7) * 0.025,
          Math.sin(angle) * radius * (0.28 + tier * 0.08),
        );
        leaf.rotation.x = 0.56 + Math.cos(angle) * 0.22;
        leaf.rotation.y = angle;
        leaf.rotation.z = Math.sin(angle) * 0.34;
        leaf.castShadow = true;
        group.add(leaf);
      }

      group.position.y = 0.06;
    }

    const controls = variant === 'cad' ? new OrbitControls(camera, renderer.domElement) : null;
    let userHasControlledCamera = false;

    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.38;
      controls.enableDamping = true;
      controls.dampingFactor = 0.075;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.minDistance = 3.2;
      controls.maxDistance = 9.2;
      controls.minPolarAngle = 0.24;
      controls.maxPolarAngle = Math.PI - 0.18;
      controls.panSpeed = 0.74;
      controls.rotateSpeed = 0.68;
      controls.zoomSpeed = 0.82;
      controls.target.set(0, 0.22, 0);
      controls.update();

      const handleControlStart = () => {
        userHasControlledCamera = true;
        controls.autoRotate = false;
        mount.classList.add('is-grabbing');
      };
      const handleControlEnd = () => {
        mount.classList.remove('is-grabbing');
      };

      controls.addEventListener('start', handleControlStart);
      controls.addEventListener('end', handleControlEnd);
    }

    const resize = () => {
      const { width, height: boxHeight } = mount.getBoundingClientRect();
      if (width === 0 || boxHeight === 0) return;
      renderer.setSize(width, boxHeight, false);
      camera.aspect = width / Math.max(boxHeight, 1);
      camera.updateProjectionMatrix();
    };

    let frameId = 0;
    let isVisible = false;
    let resizeObserver;
    let visibilityObserver;
    const clock = new Clock();

    const renderFrame = () => {
      const elapsed = clock.getElapsedTime();
      if (variant === 'cad') {
        if (!userHasControlledCamera) {
          group.rotation.x = -0.08 + Math.sin(elapsed * 0.4) * 0.012;
        }
        group.userData.testPulseMeshes?.forEach((mesh, index) => {
          const pulse = 0.5 + Math.sin(elapsed * 2.8 + index * 1.15) * 0.5;
          mesh.scale.setScalar(0.78 + pulse * 0.38);
          if (mesh.material) mesh.material.opacity = 0.36 + pulse * 0.5;
        });
        controls?.update();
      } else {
        group.rotation.y = elapsed * 0.18;
        group.rotation.x = Math.sin(elapsed * 0.58) * 0.035;
        group.position.y = 0.2 + Math.sin(elapsed * 0.8) * 0.04;
      }
      renderer.render(scene, camera);
    };

    const animate = () => {
      frameId = 0;
      if (!isVisible) return;
      renderFrame();
      frameId = requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (frameId) return;
      isVisible = true;
      frameId = requestAnimationFrame(animate);
    };

    const stopAnimation = () => {
      isVisible = false;
      if (!frameId) return;
      cancelAnimationFrame(frameId);
      frameId = 0;
    };

    resize();
    renderFrame();

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        resize();
        renderFrame();
      });
      resizeObserver.observe(mount);
    } else {
      window.addEventListener('resize', resize);
    }

    if ('IntersectionObserver' in window) {
      visibilityObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          resize();
          startAnimation();
        } else {
          stopAnimation();
        }
      }, { rootMargin: '180px 0px', threshold: 0.04 });
      visibilityObserver.observe(mount);
    } else {
      startAnimation();
    }

    return () => {
      window.removeEventListener('resize', resize);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      cancelAnimationFrame(frameId);
      controls?.dispose();
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(disposeMaterial);
        } else {
          if (object.material) disposeMaterial(object.material);
        }
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [
    cadMode,
    diameter,
    exploded,
    height,
    humidity,
    light,
    materialColor,
    profileId,
    reservoir,
    rimWidth,
    variant,
    wallThickness,
  ]);

  return (
    <div
      ref={mountRef}
      className={`three-stage ${variant === 'cad' ? 'cad-stage' : 'simulation-stage'}`}
      aria-label={variant === 'cad' ? 'Interactive 3D CAD smart pot model' : undefined}
      aria-hidden={variant === 'cad' ? undefined : 'true'}
      role={variant === 'cad' ? 'application' : undefined}
      tabIndex={variant === 'cad' ? 0 : undefined}
    >
      {variant === 'cad' && (
        <>
          <div className="cad-hud" aria-hidden="true">
            <div>
              <span>DIA</span>
              <strong>{diameter} mm</strong>
            </div>
            <div>
              <span>H</span>
              <strong>{height} mm</strong>
            </div>
            <div>
              <span>RES</span>
              <strong>{formatLiters(reservoir)}</strong>
            </div>
          </div>
          <div className="cad-mode-hud" aria-hidden="true">
            <span>{cadModes.find((mode) => mode.id === cadMode)?.label ?? 'Assembly'}</span>
            <strong>{Math.round(exploded)}% split</strong>
          </div>
        </>
      )}
    </div>
  );
};

const RangeControl = ({ label, min, max, step, value, onChange, valueLabel }) => (
  <label>
    {label}
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
    <span>{valueLabel ?? value}</span>
  </label>
);

const SelectControl = ({ label, options, value, onChange }) => (
  <label className="select-control">
    {label}
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const MetricCard = ({ label, value }) => (
  <article>
    <span>{label}</span>
    <strong>{value}</strong>
  </article>
);

const SegmentedOptions = ({ options, selectedId, onSelect, className = '' }) => (
  <div className={`segmented-options ${className}`.trim()}>
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        aria-pressed={option.id === selectedId}
        className={option.id === selectedId ? 'is-active' : ''}
        onClick={() => onSelect(option.id)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const ControlGroup = ({ title, children }) => (
  <section className="control-group" aria-label={title}>
    <h3>{title}</h3>
    {children}
  </section>
);

const Studio = () => {
  const shellRef = usePanoramaMotion();
  const [cadMode, setCadMode] = useState('assembly');
  const [cadProfile, setCadProfile] = useState('tapered');
  const [exploded, setExploded] = useState(0);
  const [diameter, setDiameter] = useState(180);
  const [height, setHeight] = useState(215);
  const [wallThickness, setWallThickness] = useState(7);
  const [reservoir, setReservoir] = useState(0.9);
  const [simulationId, setSimulationId] = useState('room');
  const [ambientTemp, setAmbientTemp] = useState(23);
  const [humidity, setHumidity] = useState(48);
  const [light, setLight] = useState(62);
  const [plantId, setPlantId] = useState('aroid');
  const [materialId, setMaterialId] = useState('petg');

  const selectedPlant = plantProfiles.find((plant) => plant.id === plantId) ?? plantProfiles[0];
  const selectedMaterial = materials.find((material) => material.id === materialId) ?? materials[0];
  const selectedSimulation = simulationProfiles.find((profile) => profile.id === simulationId) ?? simulationProfiles[0];

  const handleSimulationChange = (nextId) => {
    const nextProfile = simulationProfiles.find((profile) => profile.id === nextId) ?? simulationProfiles[0];
    setSimulationId(nextProfile.id);
    setAmbientTemp(nextProfile.temperature);
    setHumidity(nextProfile.humidity);
    setLight(nextProfile.light);
  };

  const model = useMemo(() => {
    const cadPhysics = buildCadPhysics({
      diameter,
      height,
      reservoir,
      wallThickness,
      rimWidth: defaultRimWidth,
      selectedMaterial,
      profileId: cadProfile,
    });
    const tempFactor = 1 + (ambientTemp - 22) * 0.045;
    const humidityFactor = 1 - (humidity - 50) * 0.007;
    const lightFactor = 0.72 + light / 110;
    const dailyUseMl = selectedPlant.dailyUseMl * tempFactor * humidityFactor * lightFactor;
    const autonomyDays = reservoir * 1000 / dailyUseMl;
    const doseMl = clamp(selectedPlant.dailyUseMl * 0.36, 10, 55);

    return {
      autonomyDays,
      dailyUseMl,
      doseMl,
      ...cadPhysics,
      targetMoisture: selectedPlant.targetMoisture,
    };
  }, [
    ambientTemp,
    cadProfile,
    diameter,
    height,
    humidity,
    light,
    reservoir,
    selectedMaterial,
    selectedPlant,
    wallThickness,
  ]);

  return (
    <main ref={shellRef} className="studio-shell">
      <div className="studio-panorama" aria-hidden="true">
        <div className="studio-panorama__image" />
        <div className="studio-panorama__haze" />
        <div className="studio-panorama__light" />
        <div className="studio-panorama__glass" />
      </div>
      <section
        id="origin"
        className="studio-page hero-page"
        aria-labelledby="studio-title"
        data-panorama-hero
        data-panorama-section="hero"
      >
        <div className="hero-viewport">
          <div className="hero-content">
            <p className="studio-kicker">Design system v0.1</p>
            <h1 id="studio-title">Design, simulate, and build self-contained smart pots.</h1>
            <p>
              A digital workshop for moving from pot geometry to sensor strategy, watering intelligence,
              printable parts, and field-tested autonomy.
            </p>
          </div>
          <div className="hero-telemetry" aria-label="Current smart pot model snapshot">
            <article>
              <span>Water reserve</span>
              <strong>{model.autonomyDays.toFixed(1)} d</strong>
            </article>
            <article>
              <span>Pump rhythm</span>
              <strong>{model.doseMl.toFixed(0)} ml</strong>
            </article>
            <article>
              <span>Prototype path</span>
              <strong>CAD to STL</strong>
            </article>
          </div>
        </div>
      </section>

      <section id="cad" className="studio-page cad-page" aria-labelledby="cad-title" data-panorama-section="cad">
        <div className="section-copy">
          <p className="studio-kicker">Page 02 / CAD Workbench</p>
          <h2 id="cad-title">A cleaner way to shape the smart pot.</h2>
          <p>
            Tune the form, split the assembly, and run quick visual checks without losing the model.
          </p>
        </div>

        <div className="cad-workbench">
          <div className="cad-viewer-panel">
            <ThreeStage
              variant="cad"
              diameter={diameter}
              height={height}
              reservoir={reservoir}
              materialColor={selectedMaterial.color}
              light={light}
              humidity={humidity}
              cadMode={cadMode}
              exploded={exploded}
              profileId={cadProfile}
              wallThickness={wallThickness}
              rimWidth={defaultRimWidth}
            />
            <div className="cad-status-strip" aria-label="CAD model summary">
              <MetricCard label="Volume" value={formatLiters(model.soilVolumeL)} />
              <MetricCard label="Mass" value={formatKg(model.totalMassKg)} />
              <MetricCard label="Safety" value={`${model.safetyFactor.toFixed(0)}x`} />
              <MetricCard label="Pressure" value={formatKpa(model.hydrostaticPressureKpa)} />
            </div>
          </div>

          <aside className="control-surface cad-control-surface" aria-label="CAD controls">
            <div className="cad-inspector-title">
              <span>{cadModes.find((mode) => mode.id === cadMode)?.label ?? 'Assembly'}</span>
              <strong>{cadProfiles.find((profile) => profile.id === cadProfile)?.label ?? 'Tapered'}</strong>
            </div>

            <ControlGroup title="View">
              <SelectControl
                label="Mode"
                options={cadModes}
                value={cadMode}
                onChange={setCadMode}
              />
              <div className="control-stack">
                <RangeControl
                  label="Exploded view"
                  min="0"
                  max="100"
                  value={exploded}
                  onChange={setExploded}
                  valueLabel={`${exploded}%`}
                />
              </div>
            </ControlGroup>

            <ControlGroup title="Form">
              <SelectControl
                label="Profile"
                options={cadProfiles}
                value={cadProfile}
                onChange={setCadProfile}
              />
              <div className="control-stack">
                <RangeControl
                  label="Diameter"
                  min="130"
                  max="240"
                  value={diameter}
                  onChange={setDiameter}
                  valueLabel={`${diameter} mm`}
                />
                <RangeControl
                  label="Body height"
                  min="160"
                  max="300"
                  value={height}
                  onChange={setHeight}
                  valueLabel={`${height} mm`}
                />
                <RangeControl
                  label="Reservoir"
                  min="0.4"
                  max="1.8"
                  step="0.1"
                  value={reservoir}
                  onChange={setReservoir}
                  valueLabel={formatLiters(reservoir)}
                />
              </div>
            </ControlGroup>

            <ControlGroup title="Build">
              <SelectControl
                label="Material"
                options={materials}
                value={materialId}
                onChange={setMaterialId}
              />
              <div className="control-stack">
                <RangeControl
                  label="Wall"
                  min="4"
                  max="14"
                  value={wallThickness}
                  onChange={setWallThickness}
                  valueLabel={`${wallThickness} mm`}
                />
              </div>
            </ControlGroup>

            <ControlGroup title="Physics">
              <div className="physics-readout" aria-label="CAD physics readout">
                <MetricCard label="Hoop stress" value={`${model.hoopStressMpa.toFixed(2)} MPa`} />
                <MetricCard label="Tip angle" value={`${model.stabilityAngleDeg.toFixed(0)} deg`} />
                <MetricCard label="Material" value={`${model.dryMassKg.toFixed(2)} kg`} />
                <MetricCard label="Print volume" value={`${model.printableVolumeCm3.toFixed(0)} cm3`} />
              </div>
            </ControlGroup>
          </aside>
        </div>
      </section>

      <section id="electronics" className="studio-page electronics-page" aria-labelledby="electronics-title" data-panorama-section="electronics">
        <div className="section-copy">
          <p className="studio-kicker">Page 03 / Electronics</p>
          <h2 id="electronics-title">Introduce intelligence only where autonomy needs it.</h2>
          <p>
            Electronics stay modular and dry: controller, sensing, pump driver, power, and telemetry
            are designed as a removable service deck rather than buried inside the wet structure.
          </p>
        </div>

        <div className="electronics-layout">
          <div className="circuit-board" aria-label="Electronics module map">
            {electronics.map((part, index) => (
              <article key={part.label} style={{ '--pin-index': index }}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{part.label}</strong>
                <p>{part.detail}</p>
              </article>
            ))}
          </div>
          <div className="control-surface electronics-controls">
            <SegmentedOptions options={plantProfiles} selectedId={plantId} onSelect={setPlantId} />
            <SegmentedOptions
              options={materials}
              selectedId={materialId}
              onSelect={setMaterialId}
              className="material-options"
            />
            <div className="module-note">
              <span>{selectedMaterial.score}/100 material fit</span>
              <p>{selectedMaterial.note}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="simulation" className="studio-page simulation-page" aria-labelledby="simulation-title" data-panorama-section="simulation">
        <div className="section-copy">
          <p className="studio-kicker">Page 04 / Validation</p>
          <h2 id="simulation-title">Run one clean environment check.</h2>
          <p>
            Pick a real-world condition and read the watering outcome.
          </p>
        </div>

        <div className="simulation-workbench">
          <div className="simulation-stage-panel">
            <ThreeStage
              variant="simulation"
              diameter={diameter}
              height={height}
              reservoir={reservoir}
              materialColor={selectedMaterial.color}
              light={light}
              humidity={humidity}
            />
            <div className="simulation-result-strip" aria-label="Simulation result">
              <MetricCard label="Daily water" value={`${model.dailyUseMl.toFixed(0)} ml`} />
              <MetricCard label="Autonomy" value={`${model.autonomyDays.toFixed(1)} days`} />
              <MetricCard label="Dose" value={`${model.doseMl.toFixed(0)} ml`} />
            </div>
          </div>

          <aside className="simulation-minimal-panel" aria-label="Simulation controls">
            <SelectControl
              label="Scenario"
              options={simulationProfiles}
              value={simulationId}
              onChange={handleSimulationChange}
            />
            <div className="simulation-condition-strip" aria-label="Scenario conditions">
              <MetricCard label="Air" value={`${selectedSimulation.temperature} C`} />
              <MetricCard label="RH" value={`${selectedSimulation.humidity}%`} />
              <MetricCard label="Light" value={`${selectedSimulation.light}%`} />
            </div>
          </aside>
        </div>
      </section>

      <section className="studio-page cta-page" aria-labelledby="cta-title">
        <div className="cta-panel">
          <p className="studio-kicker">Build the first living prototype</p>
          <h2 id="cta-title">Start with a printable pot, then teach it to care for itself.</h2>
          <p>
            Move from this digital studio into a concrete first build: CAD geometry, electronics,
            firmware behavior, simulated validation, and a 3D-printable handoff.
          </p>
          <a className="cta-button" href="#cad">Start building</a>
        </div>
      </section>
    </main>
  );
};

export default Studio;
