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

function formatLiters(value) {
  return `${value.toFixed(1)} L`;
}

function usePointerField() {
  const shellRef = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const element = shellRef.current;
    if (!element) return undefined;

    let frameId;

    const setTarget = (clientX, clientY) => {
      const rect = element.getBoundingClientRect();
      target.current.x = ((clientX - rect.left) / rect.width - 0.5) * 2;
      target.current.y = ((clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const handlePointerMove = (event) => setTarget(event.clientX, event.clientY);

    const animate = () => {
      current.current.x += (target.current.x - current.current.x) * 0.08;
      current.current.y += (target.current.y - current.current.y) * 0.08;
      element.style.setProperty('--pointer-x', current.current.x.toFixed(4));
      element.style.setProperty('--pointer-y', current.current.y.toFixed(4));
      element.style.setProperty('--glow-x', `${(50 + current.current.x * 8).toFixed(2)}%`);
      element.style.setProperty('--glow-y', `${(50 + current.current.y * 6).toFixed(2)}%`);
      frameId = requestAnimationFrame(animate);
    };

    element.addEventListener('pointermove', handlePointerMove);
    animate();

    return () => {
      element.removeEventListener('pointermove', handlePointerMove);
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
      renderer.setSize(width, boxHeight, false);
      camera.aspect = width / Math.max(boxHeight, 1);
      camera.updateProjectionMatrix();
    };

    let frameId;
    const clock = new Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      group.rotation.y = elapsed * (variant === 'cad' ? 0.32 : 0.18);
      group.rotation.x = Math.sin(elapsed * 0.58) * 0.035;
      group.position.y = variant === 'simulation' ? 0.2 + Math.sin(elapsed * 0.8) * 0.04 : 0.32;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [diameter, height, humidity, light, materialColor, reservoir, variant]);

  return <div ref={mountRef} className="three-stage" aria-hidden="true" />;
};

const Studio = () => {
  const shellRef = usePointerField();
  const [diameter, setDiameter] = useState(180);
  const [height, setHeight] = useState(215);
  const [reservoir, setReservoir] = useState(0.9);
  const [ambientTemp, setAmbientTemp] = useState(23);
  const [humidity, setHumidity] = useState(48);
  const [light, setLight] = useState(62);
  const [plantId, setPlantId] = useState('aroid');
  const [materialId, setMaterialId] = useState('petg');

  const selectedPlant = plantProfiles.find((plant) => plant.id === plantId);
  const selectedMaterial = materials.find((material) => material.id === materialId);

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
      <section id="origin" className="studio-page hero-page" aria-labelledby="studio-title">
        <div className="hero-content">
          <p className="studio-kicker">Design system v0.1</p>
          <h1 id="studio-title">Design, simulate, and build self-contained smart pots.</h1>
          <p>
            A digital workshop for moving from pot geometry to sensor strategy, watering intelligence,
            printable parts, and field-tested autonomy.
          </p>
        </div>
      </section>

      <section id="cad" className="studio-page cad-page" aria-labelledby="cad-title">
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
            <label>
              Diameter
              <input type="range" min="130" max="240" value={diameter} onChange={(event) => setDiameter(Number(event.target.value))} />
              <span>{diameter} mm</span>
            </label>
            <label>
              Body height
              <input type="range" min="160" max="300" value={height} onChange={(event) => setHeight(Number(event.target.value))} />
              <span>{height} mm</span>
            </label>
            <label>
              Reservoir
              <input type="range" min="0.4" max="1.8" step="0.1" value={reservoir} onChange={(event) => setReservoir(Number(event.target.value))} />
              <span>{formatLiters(reservoir)}</span>
            </label>
            <div className="metric-grid">
              <article>
                <span>Soil volume</span>
                <strong>{formatLiters(model.soilVolumeL)}</strong>
              </article>
              <article>
                <span>Print estimate</span>
                <strong>{model.printHours.toFixed(1)} h</strong>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="electronics" className="studio-page electronics-page" aria-labelledby="electronics-title">
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
            <div className="segmented-options">
              {plantProfiles.map((plant) => (
                <button
                  key={plant.id}
                  type="button"
                  className={plant.id === plantId ? 'is-active' : ''}
                  onClick={() => setPlantId(plant.id)}
                >
                  {plant.label}
                </button>
              ))}
            </div>
            <div className="segmented-options material-options">
              {materials.map((material) => (
                <button
                  key={material.id}
                  type="button"
                  className={material.id === materialId ? 'is-active' : ''}
                  onClick={() => setMaterialId(material.id)}
                >
                  {material.label}
                </button>
              ))}
            </div>
            <div className="module-note">
              <span>{selectedMaterial.score}/100 material fit</span>
              <p>{selectedMaterial.note}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="simulation" className="studio-page simulation-page" aria-labelledby="simulation-title">
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
            <label>
              Temperature
              <input type="range" min="15" max="33" value={ambientTemp} onChange={(event) => setAmbientTemp(Number(event.target.value))} />
              <span>{ambientTemp} C</span>
            </label>
            <label>
              Humidity
              <input type="range" min="25" max="80" value={humidity} onChange={(event) => setHumidity(Number(event.target.value))} />
              <span>{humidity}% RH</span>
            </label>
            <label>
              Light
              <input type="range" min="20" max="100" value={light} onChange={(event) => setLight(Number(event.target.value))} />
              <span>{light}%</span>
            </label>
            <div className="metric-grid">
              <article>
                <span>Daily water</span>
                <strong>{model.dailyUseMl.toFixed(0)} ml</strong>
              </article>
              <article>
                <span>Micro-dose</span>
                <strong>{model.doseMl.toFixed(0)} ml</strong>
              </article>
              <article>
                <span>Target moisture</span>
                <strong>{model.targetMoisture}%</strong>
              </article>
              <article>
                <span>Autonomy</span>
                <strong>{model.autonomyDays.toFixed(1)} days</strong>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="studio-page cta-page" aria-labelledby="cta-title">
        <div className="growth-field" aria-hidden="true" />
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
