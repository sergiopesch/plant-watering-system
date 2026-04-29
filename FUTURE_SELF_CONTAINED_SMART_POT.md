# Virdis Foundry: Self-Contained Smart Plant Pot

This document captures the product and engineering direction for evolving `plant-watering-system` from a simple watering project into **Virdis Foundry**, a design-to-prototype studio for self-contained, agent-connected smart planters.

## Vision

Build a **self-contained plant pot platform** with:
- integrated water reservoir
- pump / motor system
- sensing for moisture, reservoir level, and environment
- local control electronics
- remote monitoring and control
- agent integration with Claw
- 3D-printable modular housing

The goal is not just "automatic watering". The more interesting product is a **plant life-support node** that can be designed digitally, tested virtually, manufactured locally, and monitored through intelligent software.

The current first increment is a public studio at `/`. It establishes the brand, metadata, favicon, a pointer-responsive living hero, configurable pot geometry, first-pass environmental estimates, CAD/electronics/simulation pages, a final build CTA, and the system module map. It intentionally stops short of pretending to be a finished CAD or physics environment.

---

## Product framing

Think of the system as a small autonomous plant-care unit with six layers:
- plant chamber
- reservoir
- fluid delivery
- sensors
- control electronics
- agent interface

That framing matters because watering + nutrient control + monitoring is closer to a miniature agricultural system than a novelty gadget.

---

## Recommended phased approach

### Phase 1 — Smart watering pot
Build the simplest useful system:
- soil moisture sensing
- reservoir level sensing
- automated watering
- telemetry to Claw
- manual override from Claw

### Phase 2 — Plant care node
Extend the system with:
- ambient temperature / humidity
- light sensing
- watering trends and history
- refill alerts
- plant profile logic
- Claw summaries and recommendations

### Phase 3 — Nutrient-aware autonomous planter
Longer-term expansion:
- nutrient dosing
- optional EC / TDS sensing
- possible pH monitoring
- multi-reservoir or multi-pump system
- multiple pot orchestration

Recommendation: **build Phase 1 / 2 first** and design the hardware so Phase 3 remains possible later.

---

## Proposed v1 architecture

### Mechanical modules

#### 1. Plant module
- removable inner pot
- drainage-aware geometry
- sensor mounting channels
- suitable for soil or semi-hydro insert

#### 2. Reservoir module
- integrated water chamber under or behind the pot
- refill port accessible from outside
- level sensor slot
- overflow route
- cleaning access where possible

#### 3. Electronics module
- sealed dry bay for:
  - ESP32
  - motor driver(s)
  - power input / battery logic
  - connectors
- separated from wet areas
- gasketed or screw-fastened access lid

#### 4. Pump / fluid module
- tubing channels
- pump mount(s)
- anti-backflow layout
- serviceable routing

This modular split is important for maintenance, cleaning, printing, and iteration.

---

## Hardware direction

### Controller
**ESP32 / ESP32-S3**

Why:
- Wi-Fi + Bluetooth
- strong maker ecosystem
- easy integration with MQTT / HTTP / Home Assistant / custom services
- sufficient for sensing + pump control + local automation

### Water delivery
**Peristaltic pump** preferred

Why:
- liquid does not pass through the motor body
- self-priming
- usable for more precise dosing later
- better path toward nutrient handling

Alternative:
- small submersible pump for simplicity in early prototypes

### Moisture sensing
Use **capacitive soil moisture sensors**.

Avoid cheap resistive probes for long-term use because they corrode and become unreliable.

### Reservoir level sensing
Good v1 choice:
- **float switch**

Possible later upgrades:
- capacitive level sensing
- more advanced level estimation

### Environment sensing
Suggested sensors:
- **BME280** or **SHT31** for temperature / humidity
- optional light sensor later (BH1750 / VEML7700)

### Nutrient monitoring
Treat this as a later-stage feature.

Why:
- low-cost pH / EC sensors are noisy and drift-prone
- calibration burden is real
- nutrient residues complicate tiny fluid systems

Better early path:
- leave a place in the design for a future nutrient dosing module
- let Claw track dosing history and schedules before attempting full chemistry automation

---

## 3D-printable enclosure direction

### Overall structure
Suggested printable system:
- **base**: reservoir + electronics bay + pump mounts
- **mid/service deck**: separates wet and dry systems
- **inner pot insert**: removable plant chamber
- **outer shell**: aesthetic enclosure and structural wrapper

### Important design details

#### Refill
- easy refill port
- funnel-friendly geometry
- venting
- overflow protection

#### Cleaning / maintenance
- avoid inaccessible stagnant chambers
- removable covers where practical
- serviceable tubing and connectors

#### Electronics protection
- sealed lid / gasket groove
- cable strain relief
- drip-safe routing

#### Printing constraints
- avoid support-heavy hidden cavities
- prefer printable split parts
- use screws / inserts / clips for assembly
- PETG preferred over PLA for wet environments
- ASA optional for higher durability / outdoor resistance

---

## Control logic concept

The system should not simply water when a threshold is crossed.

### Inputs
- soil moisture
- reservoir level
- ambient temperature
- ambient humidity
- optional light level
- time since last watering
- plant profile / target ranges

### Core watering logic
Example behaviour:
- if moisture is below threshold **and** minimum interval since last watering has passed:
  - run pump for a small measured dose
- wait for soak period
- read moisture trend again
- if no expected recovery is observed:
  - flag possible pump issue, dry channel, or sensor issue
- if reservoir is too low:
  - block watering and raise alert

This gives a more intelligent and fault-aware baseline than simple threshold switching.

---

## Claw integration vision

Claw should become the interpretation and control layer.

Possible agent responsibilities:
- report current plant status
- explain watering trends
- detect anomalies
- trigger manual watering
- log nutrient additions
- suggest configuration adjustments
- compare multiple plant nodes over time

Example interactions:
- "Claw, how is the basil doing?"
- "Claw, water the desk pot now."
- "Claw, why is this pot drying faster than last week?"
- "Claw, remind me when nutrient top-up is due."

This is where the project becomes more than IoT telemetry.

---

## Software architecture options

### Studio stack direction

Recommended browser-first stack:
- React / Vite for the product studio
- JSCAD for JavaScript parametric CAD generation and future STL export
- Three.js for 3D scene rendering and STL preview
- Rapier for later rigid-body / assembly / collision simulation
- a deterministic plant-water model before attempting high-fidelity fluid simulation

Why this direction:
- the project is already React/Vite
- JavaScript CAD keeps design parameters, UI state, and export logic close together
- WebAssembly physics can run locally in the browser
- early equations are more valuable than a visually impressive but uncalibrated fluid sim

Research anchors:
- JSCAD describes itself as modular browser and command-line tooling for parametric 2D/3D designs in JavaScript: https://openjscad.xyz/docs/
- Three.js provides STL tooling for browser rendering workflows: https://threejs.org/docs/pages/STLLoader.html
- Rapier provides WebAssembly and JavaScript packages for browser physics: https://rapier.rs/

### Option A — ESP32 + MQTT + Claw bridge
Best long-term structure.

Pot publishes:
- moisture
- reservoir level
- temperature / humidity
- pump events
- errors
- maintenance state

Claw consumes via:
- MQTT bridge
- Home Assistant
- or custom local service

### Option B — ESP32 + simple HTTP API
Faster to prototype.

Good for:
- one or two pots
- early proof-of-concept

### Option C — ESPHome + Home Assistant + Claw
Fastest to prove concept if speed matters more than full custom control.

### Hardware research notes

Early hardware choices should remain boring and serviceable:
- ESP32-S3 is the default controller target because Espressif documents Wi-Fi, Bluetooth LE, low-power modes, and ESP-IDF support.
- BME280 or SHT31-class environmental sensing is enough for v1 temperature/humidity context.
- Capacitive soil moisture sensing is preferred over low-cost resistive probes because soil-contact electrodes corrode and readings drift.
- A float switch is a reliable first reservoir-level signal before moving to more complex capacitive level sensing.
- A peristaltic pump is preferred for serviceability and future nutrient dosing because the fluid path stays inside tubing.

Primary references:
- ESP32-S3: https://www.espressif.com/en/products/socs/esp32-s3
- ESP-IDF ESP32-S3 docs: https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/about.html
- Bosch BME280: https://www.bosch-sensortec.com/products/environmental-sensors/humidity-sensors-bme280/
- University of Maryland Extension on self-watering container reservoirs and overflow: https://extension.umd.edu/resource/self-watering-containers
- University of Illinois Extension on container watering and drainage: https://extension.illinois.edu/blogs/flowers-fruits-and-frass/2020-06-22-6-tips-watering-container-gardens

---

## Main product fork

### Path A — soil planter
Pros:
- natural product shape
- familiar for most people
- better product feel

Cons:
- moisture readings are trend-based rather than chemically precise

### Path B — semi-hydro planter
Pros:
- easier fluid control
- cleaner sensing potential

Cons:
- less natural / less mainstream as a "plant pot"

Recommendation for product fit:
- start with **soil-based smart pot**
- use trend-aware logic rather than pretending to achieve absolute precision

---

## Suggested next-step if this future phase is resumed

1. define exact v1 target behaviour
2. choose BOM
3. sketch module layout
4. define telemetry / command schema for Claw
5. create printable mechanical concept
6. prototype one pot before attempting multi-pot orchestration

---

## Summary

This future direction turns `plant-watering-system` into a more ambitious hardware-software product:
- self-contained
- printable
- modular
- maintainable
- agent-connected

It is a promising next-level evolution, but it should be approached in phases so the result is robust rather than overengineered too early.
