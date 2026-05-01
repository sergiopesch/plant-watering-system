import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BoxGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Clock,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import './styles/Studio.css';

const plantProfiles = [
  { id: 'herbs', label: 'Kitchen herbs', targetMoisture: 58, dailyUseMl: 92 },
  { id: 'aroid', label: 'Aroid / foliage', targetMoisture: 52, dailyUseMl: 64 },
  { id: 'succulent', label: 'Dry-tolerant', targetMoisture: 34, dailyUseMl: 28 },
];

const materials = [
  { id: 'petg', label: 'PETG', score: 91, color: '#5f8d68', note: 'Water tolerant and practical for first prints' },
  { id: 'asa', label: 'ASA', score: 86, color: '#45524b', note: 'Tougher under heat and sun, harder to print' },
  { id: 'ceramic', label: 'Ceramic sleeve', score: 72, color: '#d9d0bd', note: 'Premium exterior around printable internals' },
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

const ThreeStage = ({ variant, diameter, height, reservoir, materialColor, light, humidity }) => {
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.25, 7.2);
    camera.lookAt(0, -0.05, 0);

    scene.add(new HemisphereLight(0xf7ffe8, 0x244233, 2.6));

    const keyLight = new DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const group = new Group();
    scene.add(group);

    if (variant === 'cad') {
      const shellMaterial = new MeshStandardMaterial({
        color: new Color(materialColor),
        roughness: 0.52,
        metalness: 0.08,
      });
      const waterMaterial = new MeshPhysicalMaterial({
        color: 0x63c5d5,
        transparent: true,
        opacity: 0.72,
        roughness: 0.08,
        transmission: 0.18,
      });
      const soilMaterial = new MeshStandardMaterial({ color: 0x44362b, roughness: 0.92 });
      const metalMaterial = new MeshStandardMaterial({ color: 0xe0c164, roughness: 0.38, metalness: 0.25 });

      const radius = clamp(diameter / 180, 0.78, 1.35);
      const bodyHeight = clamp(height / 210, 0.86, 1.55) * 2.6;
      const shell = new Mesh(
        new CylinderGeometry(radius * 0.72, radius, bodyHeight, 96, 1, true),
        shellMaterial,
      );
      shell.position.y = 0.18;
      group.add(shell);

      const rim = new Mesh(
        new TorusGeometry(radius * 0.86, 0.075, 16, 96),
        shellMaterial,
      );
      rim.position.y = bodyHeight / 2 + 0.2;
      rim.rotation.x = Math.PI / 2;
      group.add(rim);

      const soil = new Mesh(
        new CylinderGeometry(radius * 0.74, radius * 0.74, 0.09, 96),
        soilMaterial,
      );
      soil.position.y = bodyHeight / 2 + 0.16;
      group.add(soil);

      const reservoirMesh = new Mesh(
        new CylinderGeometry(radius * 0.98, radius * 0.98, clamp(reservoir, 0.45, 1.8) * 0.36, 96),
        waterMaterial,
      );
      reservoirMesh.position.y = -bodyHeight / 2 - 0.22;
      group.add(reservoirMesh);

      const electronicsBay = new Mesh(
        new BoxGeometry(radius * 0.72, 0.42, 0.34),
        new MeshStandardMaterial({ color: 0x1f2a24, roughness: 0.48 }),
      );
      electronicsBay.position.set(0, -bodyHeight / 2 - 0.02, radius * 0.82);
      group.add(electronicsBay);

      const sensor = new Mesh(new BoxGeometry(0.05, bodyHeight * 0.82, 0.05), metalMaterial);
      sensor.position.set(radius * 0.52, 0.18, radius * 0.22);
      group.add(sensor);

      const tubeCurve = new CatmullRomCurve3([
        new Vector3(-radius * 0.64, -bodyHeight / 2 - 0.28, radius * 0.18),
        new Vector3(-radius * 0.76, -0.2, radius * 0.5),
        new Vector3(-radius * 0.24, bodyHeight / 2 + 0.28, radius * 0.34),
      ]);
      const tube = new Mesh(
        new TubeGeometry(tubeCurve, 48, 0.025, 8, false),
        new MeshStandardMaterial({ color: 0x91d2ca, roughness: 0.32 }),
      );
      group.add(tube);
    } else {
      const ground = new Mesh(
        new CircleGeometry(3.2, 96),
        new MeshStandardMaterial({ color: 0x28382f, roughness: 0.88 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.08;
      scene.add(ground);

      const pot = new Mesh(
        new CylinderGeometry(0.78, 1.04, 1.75, 96, 1, true),
        new MeshStandardMaterial({ color: 0x5f8d68, roughness: 0.62 }),
      );
      pot.position.y = 0.02;
      group.add(pot);

      const water = new Mesh(
        new CylinderGeometry(0.96, 0.96, clamp(reservoir, 0.45, 1.8) * 0.34, 96),
        new MeshPhysicalMaterial({ color: 0x6ac7df, transparent: true, opacity: 0.58, roughness: 0.04 }),
      );
      water.position.y = -1.22;
      group.add(water);

      const stemMaterial = new MeshStandardMaterial({ color: 0x7da56e, roughness: 0.8 });
      for (let index = 0; index < 6; index += 1) {
        const angle = index * 1.04;
        const stem = new Mesh(new CapsuleGeometry(0.025, 0.78, 6, 12), stemMaterial);
        stem.position.set(Math.cos(angle) * 0.16, 1.04, Math.sin(angle) * 0.16);
        stem.rotation.z = Math.sin(angle) * 0.55;
        stem.rotation.x = Math.cos(angle) * 0.45;
        group.add(stem);

        const leaf = new Mesh(
          new SphereGeometry(0.18 + light / 700, 24, 12),
          new MeshStandardMaterial({ color: 0x9bcf71, roughness: 0.7 }),
        );
        leaf.scale.set(1.7, 0.18, 0.78);
        leaf.position.set(Math.cos(angle) * 0.54, 1.44 + humidity / 260, Math.sin(angle) * 0.54);
        leaf.rotation.y = angle;
        group.add(leaf);
      }
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
      group.rotation.y = elapsed * (variant === 'cad' ? 0.32 : 0.18);
      group.rotation.x = Math.sin(elapsed * 0.58) * 0.035;
      group.position.y = variant === 'simulation' ? 0.2 + Math.sin(elapsed * 0.8) * 0.04 : 0.32;
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
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material?.dispose();
        }
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [diameter, height, humidity, light, materialColor, reservoir, variant]);

  return <div ref={mountRef} className="three-stage" aria-hidden="true" />;
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

const Studio = () => {
  const shellRef = usePanoramaMotion();
  const [diameter, setDiameter] = useState(180);
  const [height, setHeight] = useState(215);
  const [reservoir, setReservoir] = useState(0.9);
  const [ambientTemp, setAmbientTemp] = useState(23);
  const [humidity, setHumidity] = useState(48);
  const [light, setLight] = useState(62);
  const [plantId, setPlantId] = useState('aroid');
  const [materialId, setMaterialId] = useState('petg');

  const selectedPlant = plantProfiles.find((plant) => plant.id === plantId) ?? plantProfiles[0];
  const selectedMaterial = materials.find((material) => material.id === materialId) ?? materials[0];

  const model = useMemo(() => {
    const radiusMm = diameter / 2;
    const soilHeightMm = height * 0.58;
    const soilVolumeL = Math.PI * radiusMm * radiusMm * soilHeightMm / 1000000;
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
      soilVolumeL,
      printHours: clamp((diameter * height) / 5100, 5.5, 16.5),
      targetMoisture: selectedPlant.targetMoisture,
    };
  }, [ambientTemp, diameter, height, humidity, light, reservoir, selectedPlant]);

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
          <p className="studio-kicker">Page 02 / CAD 3D</p>
          <h2 id="cad-title">Shape the pot as a printable, serviceable machine.</h2>
          <p>
            The geometry is treated as a parametric product system: shell, reservoir, sensor spine,
            tubing path, electronics bay, refill path, and manufacturing constraints.
          </p>
        </div>

        <div className="immersive-grid">
          <ThreeStage
            variant="cad"
            diameter={diameter}
            height={height}
            reservoir={reservoir}
            materialColor={selectedMaterial.color}
            light={light}
            humidity={humidity}
          />
          <div className="control-surface">
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
            <div className="metric-grid">
              <MetricCard label="Soil volume" value={formatLiters(model.soilVolumeL)} />
              <MetricCard label="Print estimate" value={`${model.printHours.toFixed(1)} h`} />
            </div>
          </div>
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
          <p className="studio-kicker">Page 04 / Simulated World</p>
          <h2 id="simulation-title">Test the plant pot against changing real-world conditions.</h2>
          <p>
            The virtual world models water demand, light, air, dosing, and fault detection before a
            print is committed to plastic and electronics.
          </p>
        </div>

        <div className="immersive-grid simulation-grid">
          <ThreeStage
            variant="simulation"
            diameter={diameter}
            height={height}
            reservoir={reservoir}
            materialColor={selectedMaterial.color}
            light={light}
            humidity={humidity}
          />
          <div className="control-surface">
            <RangeControl
              label="Temperature"
              min="15"
              max="33"
              value={ambientTemp}
              onChange={setAmbientTemp}
              valueLabel={`${ambientTemp} C`}
            />
            <RangeControl
              label="Humidity"
              min="25"
              max="80"
              value={humidity}
              onChange={setHumidity}
              valueLabel={`${humidity}% RH`}
            />
            <RangeControl
              label="Light"
              min="20"
              max="100"
              value={light}
              onChange={setLight}
              valueLabel={`${light}%`}
            />
            <div className="metric-grid">
              <MetricCard label="Daily water" value={`${model.dailyUseMl.toFixed(0)} ml`} />
              <MetricCard label="Micro-dose" value={`${model.doseMl.toFixed(0)} ml`} />
              <MetricCard label="Target moisture" value={`${model.targetMoisture}%`} />
              <MetricCard label="Autonomy" value={`${model.autonomyDays.toFixed(1)} days`} />
            </div>
          </div>
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
