/**
 * ICT-U Multi-Level Campus GPS
 *
 * Sections:
 *   1. Configuration
 *   2. Models                 (OOP: encapsulation, abstraction, inheritance, polymorphism)
 *   3. LocationFactory        (Factory pattern)
 *   4. Campus data
 *   5. CampusRepository       (Repository + Singleton patterns)
 *   6. Route strategies       (Strategy pattern)
 *   7. NavigationService      (Facade pattern + Dependency Injection)
 *   8. API router             (REST endpoints)
 *   9. 3D navigation page
 *  10. App factory + start
 */
const path = require('path');
const express = require('express');
const { homePage, aboutPage } = require('./pages');

// ---------------------------------------------------------------------------
// 1. CONFIGURATION
// ---------------------------------------------------------------------------
const CONFIG = Object.freeze({
  GROUND_Y: -5,          // ground level = Floor -1
  BOUNDS: 32,            // perimeter half-size; the gate sits at z = +BOUNDS
  WALK: 0.6,             // route line height above the walking surface
  STEP_H: 25 / 45,       // staircase rise per step
  SPIRAL_R: 2.5,         // spiral staircase radius
  SPIRAL_ANGLE: 0.35,    // angle between steps (radians)
  TOTAL_STEPS: 46
});

const LEVELS = Object.freeze({
  '-1': -5, '1': 0, '2': 5, '3': 10, '4': 15, '5': 20, outdoor: -5
});

// Explicit order (integer-like object keys would otherwise be re-sorted)
const FLOOR_ORDER = Object.freeze(['-1', '1', '2', '3', '4', '5', 'outdoor']);

// ---------------------------------------------------------------------------
// 2. MODELS (OOP)
// ---------------------------------------------------------------------------

/**
 * ABSTRACTION: Location is abstract and cannot be instantiated directly.
 * ENCAPSULATION: the data lives in a private, frozen field and is exposed
 * only through getters.
 */
class Location {
  #props;

  constructor(props) {
    if (new.target === Location) {
      throw new TypeError('Location is abstract and cannot be instantiated directly');
    }
    this.#props = Object.freeze({ ...props });
  }

  get id() { return this.#props.id; }
  get name() { return this.#props.name; }
  get type() { return this.#props.type; }
  get color() { return this.#props.color; }
  get floorKey() { return this.#props.floorKey; }
  get x() { return this.#props.x; }
  get z() { return this.#props.z; }
  get w() { return this.#props.w; }
  get d() { return this.#props.d; }
  get h() { return this.#props.h; }

  get y() { return LEVELS[this.floorKey]; }
  get floor() { return 'Floor ' + this.floorKey; }
  get isOutdoor() { return false; }
  get opacity() { return 0.75; }

  // POLYMORPHISM: subclasses override this
  describe() {
    return `${this.name} (${this.type}) on ${this.floor}`;
  }

  toJSON() {
    return {
      id: this.id, name: this.name, type: this.type, color: this.color,
      floorKey: this.floorKey, floor: this.floor,
      x: this.x, y: this.y, z: this.z, w: this.w, h: this.h, d: this.d,
      opacity: this.opacity
    };
  }
}

/** INHERITANCE: a normal indoor room (hall, lab, office...). */
class Room extends Location {}

/** INHERITANCE + POLYMORPHISM: a restroom is a room with its own description. */
class Restroom extends Room {
  describe() {
    return `${this.name} - restroom on ${this.floor}`;
  }
}

/** An outdoor place: no floor number and fully opaque. */
class ParkingLot extends Location {
  get floor() { return 'Outdoor'; }
  get isOutdoor() { return true; }
  get opacity() { return 1; }
  describe() {
    return `${this.name} - outdoor parking behind the school`;
  }
}

// ---------------------------------------------------------------------------
// 3. FACTORY PATTERN
// ---------------------------------------------------------------------------
class LocationFactory {
  static create(spec) {
    const base = { h: 3, ...spec };
    switch (spec.kind) {
      case 'restroom':
        return new Restroom(base);
      case 'parking':
        return new ParkingLot({ ...base, h: spec.h ?? 0.2 });
      default:
        return new Room(base);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. CAMPUS DATA
// ---------------------------------------------------------------------------
// Rooms sit on either side of the central corridor (z = 0).
// x = -12 left wing, x = 12 right wing; z = -7 north side, z = 7 south side.
// Same x with opposite z = face to face across the corridor.
// Toilets are at the extreme ends of the corridor (x = +/-22), centered (z = 0).
const room = (id, name, floorKey, type, color, x, z, w = 14, d = 8, h = 3) =>
  ({ id, name, floorKey, type, color, x, z, w, d, h });

const restroom = (...args) => ({ ...room(...args), kind: 'restroom' });

const CAMPUS_SPECS = [
  // Floor -1
  room('pondi', 'Pondi Hall', '-1', 'Hall', 0x0284c7, -12, -7),
  room('cantine', 'Campus Cantine', '-1', 'Cafeteria', 0xf97316, 12, -7),

  // Floor 1
  room('sickbay', 'Campus Sickbay', '1', 'Medical', 0xf43f5e, -12, -7),
  room('mbarika1', 'George Mbarika Hall', '1', 'Hall', 0x38bdf8, -12, 7),
  room('admin', 'Administration Office', '1', 'Office', 0xf97316, 12, -7),
  room('library', 'Central Library', '1', 'Library', 0x10b981, 12, 7),
  restroom('toilet_staff1', 'Staff Toilets', '1', 'Restroom', 0x94a3b8, 22, 0, 6, 8),

  // Floor 2
  room('chumbow', 'Chumbow Hall', '2', 'Hall', 0xf97316, -12, -7),
  room('terry_lynda', 'Terry & Lynda Hall', '2', 'Hall', 0x0284c7, -12, 7),
  room('comp_lab', 'Computer Lab', '2', 'Laboratory', 0x10b981, 12, -7),
  room('cisco_lab', 'Cisco Lab', '2', 'Laboratory', 0x6366f1, 12, 7),
  restroom('toilet_girls2', "Girls' Restroom", '2', 'Restroom', 0xf472b6, -22, 0, 6, 8),

  // Floor 3
  room('gaming', 'Gaming Hall', '3', 'Recreation', 0xec4899, -12, -7),
  room('department', 'Department', '3', 'Office', 0x14b8a6, -12, 7),
  room('french3', 'French Hall 3', '3', 'Hall', 0x84cc16, 0, -8, 8, 7),
  room('eric_mbarika', 'Eric Mbarika Hall', '3', 'Hall', 0xf59e0b, 12, -7),
  room('french2', 'French Hall 2', '3', 'Hall', 0x06b6d4, 12, 7),
  restroom('toilet_boys3', "Boys' Restroom", '3', 'Restroom', 0x60a5fa, -22, 0, 6, 8),

  // Floor 4
  room('vc_office', 'VC Office', '4', 'Executive', 0xef4444, -12, -7),
  room('staff_offices', 'Staff Offices', '4', 'Office', 0xfb923c, -12, 7),
  room('disciplinary', 'Disciplinary Council', '4', 'Council', 0xa855f7, 0, -8, 8, 7),
  room('finance', 'Finance Office', '4', 'Office', 0xeab308, 12, 7),
  restroom('toilet_staff4', 'Staff Toilets', '4', 'Restroom', 0x94a3b8, -22, 0, 6, 8),

  // Floor 5
  room('chapel', 'University Chapel', '5', 'Chapel', 0x8b5cf6, 0, -8, 14, 8, 3.5),

  // Outdoor: behind the school, inside the fence
  { id: 'parking', name: 'Campus Parking Lot', floorKey: 'outdoor', type: 'Parking',
    color: 0x1e293b, x: 0, z: -23, w: 30, d: 14, kind: 'parking' }
];

// ---------------------------------------------------------------------------
// 5. REPOSITORY + SINGLETON PATTERNS
// ---------------------------------------------------------------------------
/**
 * REPOSITORY: the only place that knows how locations are stored and queried.
 * SINGLETON: getInstance() always returns the same shared repository.
 */
class CampusRepository {
  static #instance = null;
  #byId = new Map();

  constructor(specs = CAMPUS_SPECS) {
    specs.forEach(spec => {
      const loc = LocationFactory.create(spec);
      if (this.#byId.has(loc.id)) throw new Error('Duplicate location id: ' + loc.id);
      this.#byId.set(loc.id, loc);
    });
  }

  static getInstance() {
    if (!CampusRepository.#instance) {
      CampusRepository.#instance = new CampusRepository();
    }
    return CampusRepository.#instance;
  }

  findAll({ floor, type } = {}) {
    return [...this.#byId.values()].filter(l =>
      (!floor || l.floorKey === String(floor)) &&
      (!type || l.type.toLowerCase() === String(type).toLowerCase())
    );
  }

  findById(id) {
    return this.#byId.get(id) || null;
  }

  search(query) {
    const q = String(query).toLowerCase();
    return this.findAll().filter(l =>
      l.name.toLowerCase().includes(q) || l.type.toLowerCase().includes(q)
    );
  }

  getFloors() {
    return FLOOR_ORDER.map(key => ({
      key,
      name: key === 'outdoor' ? 'Outdoor' : 'Floor ' + key,
      level: LEVELS[key]
    }));
  }
}

// ---------------------------------------------------------------------------
// 6. STRATEGY PATTERN (route building)
// ---------------------------------------------------------------------------
function dedupe(points) {
  return points.filter((p, i) => {
    if (i === 0) return true;
    const q = points[i - 1];
    return Math.abs(p.x - q.x) + Math.abs(p.y - q.y) + Math.abs(p.z - q.z) > 1e-6;
  });
}

const sideOf = loc => (loc.x < 0 ? 'left' : 'right');

/** Abstract strategy: each subclass knows how to route to one kind of place. */
class RouteStrategy {
  supports() { throw new Error('supports() must be implemented'); }
  build() { throw new Error('build() must be implemented'); }

  _start() {
    return {
      points: [{ x: 0, y: CONFIG.GROUND_Y + CONFIG.WALK, z: CONFIG.BOUNDS }],
      directions: ['Enter through the Main Gate and follow the central walkway.']
    };
  }

  // Shared ending: corridor -> door -> room centre
  _finish(loc, points, directions, name) {
    const y = loc.y + CONFIG.WALK;
    points.push(
      { x: loc.x, y, z: 0 },
      { x: loc.x, y, z: Math.sign(loc.z) * 3 },
      { x: loc.x, y, z: loc.z }
    );
    directions.push('Enter ' + loc.name + '.');
    return { name, path: dedupe(points), directions };
  }
}

/** Outdoor places: walk around the right side of the school to the back. */
class OutdoorRouteStrategy extends RouteStrategy {
  supports(loc) { return loc.isOutdoor; }

  build(loc) {
    const y0 = CONFIG.GROUND_Y + CONFIG.WALK;
    const sideX = CONFIG.BOUNDS - 5;
    const { points, directions } = this._start();
    points.push(
      { x: 0, y: y0, z: CONFIG.BOUNDS - 6 },
      { x: sideX, y: y0, z: CONFIG.BOUNDS - 6 },
      { x: sideX, y: y0, z: loc.z },
      { x: loc.x, y: y0, z: loc.z }
    );
    directions.push('Turn right and walk along the right side of the school.');
    directions.push('Continue to the back of the compound; the parking lot is behind the school.');
    return { name: 'Ground Route: Main Gate -> ' + loc.name, path: dedupe(points), directions };
  }
}

/** Floor -1 is at ground level: no stairs needed. */
class GroundFloorRouteStrategy extends RouteStrategy {
  supports(loc) { return !loc.isOutdoor && loc.y === CONFIG.GROUND_Y; }

  build(loc) {
    const { points, directions } = this._start();
    points.push({ x: 0, y: CONFIG.GROUND_Y + CONFIG.WALK, z: 10 });
    directions.push('Walk to the central staircase.');
    directions.push('Stay on the ground floor and follow the corridor ' + sideOf(loc) + '.');
    return this._finish(loc, points, directions, 'Ground Route: Main Gate -> ' + loc.name);
  }
}

/** Upper floors: climb the spiral staircase, then follow the corridor. */
class StaircaseRouteStrategy extends RouteStrategy {
  supports(loc) { return !loc.isOutdoor && loc.y > CONFIG.GROUND_Y; }

  build(loc) {
    const { points, directions } = this._start();
    points.push({ x: 0, y: CONFIG.GROUND_Y + CONFIG.WALK, z: 10 });
    directions.push('Walk to the central staircase.');

    const steps = Math.round((loc.y - CONFIG.GROUND_Y) / CONFIG.STEP_H);
    for (let i = 0; i <= steps; i++) {
      const a = i * CONFIG.SPIRAL_ANGLE;
      points.push({
        x: Math.cos(a) * CONFIG.SPIRAL_R,
        y: CONFIG.GROUND_Y + i * CONFIG.STEP_H + CONFIG.WALK,
        z: Math.sin(a) * CONFIG.SPIRAL_R
      });
    }
    directions.push('Climb the spiral staircase up to ' + loc.floor + ' (' + steps + ' steps).');
    directions.push(loc.x === 0
      ? 'Continue straight along the corridor.'
      : 'Leave the stairs and follow the corridor to the ' + sideOf(loc) +
        (Math.abs(loc.x) > 20 ? ', all the way to the end.' : '.'));

    return this._finish(loc, points, directions,
      'Staircase Route: Main Gate -> ' + loc.floor + ' -> ' + loc.name);
  }
}

// ---------------------------------------------------------------------------
// 7. FACADE PATTERN + DEPENDENCY INJECTION
// ---------------------------------------------------------------------------
/**
 * FACADE: one simple entry point hiding the repository and the strategies.
 * DEPENDENCY INJECTION: both collaborators arrive through the constructor,
 * so tests (or future code) can swap them.
 */
class NavigationService {
  #repo;
  #strategies;

  constructor(repository, strategies = [
    new OutdoorRouteStrategy(),
    new GroundFloorRouteStrategy(),
    new StaircaseRouteStrategy()
  ]) {
    this.#repo = repository;
    this.#strategies = strategies;
  }

  getRoutes(locationId) {
    const loc = this.#repo.findById(locationId);
    if (!loc) return null;
    const strategy = this.#strategies.find(s => s.supports(loc));
    if (!strategy) throw new Error('No route strategy for location: ' + locationId);
    return [{ id: 'r1', ...strategy.build(loc) }];
  }

  getCampusSnapshot() {
    const locations = this.#repo.findAll();
    const routes = {};
    locations.forEach(l => { routes[l.id] = this.getRoutes(l.id); });
    return {
      config: {
        groundY: CONFIG.GROUND_Y, bounds: CONFIG.BOUNDS, stepHeight: CONFIG.STEP_H,
        spiralRadius: CONFIG.SPIRAL_R, spiralAngle: CONFIG.SPIRAL_ANGLE,
        totalSteps: CONFIG.TOTAL_STEPS
      },
      floors: this.#repo.getFloors(),
      locations,
      routes
    };
  }
}

// ---------------------------------------------------------------------------
// 8. API ROUTER (REST endpoints)
// ---------------------------------------------------------------------------
function createApiRouter(repository, navigation) {
  const router = express.Router();

  // GET /api/health
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // GET /api/campus  (everything the 3D client needs)
  router.get('/campus', (req, res) => {
    res.json(navigation.getCampusSnapshot());
  });

  // GET /api/floors
  router.get('/floors', (req, res) => {
    res.json(repository.getFloors());
  });

  // GET /api/locations?floor=3&type=Hall
  router.get('/locations', (req, res) => {
    res.json(repository.findAll({ floor: req.query.floor, type: req.query.type }));
  });

  // GET /api/locations/:id
  router.get('/locations/:id', (req, res) => {
    const loc = repository.findById(req.params.id);
    if (!loc) return res.status(404).json({ error: 'Location not found' });
    res.json(loc);
  });

  // GET /api/locations/:id/routes
  router.get('/locations/:id/routes', (req, res) => {
    const routes = navigation.getRoutes(req.params.id);
    if (!routes) return res.status(404).json({ error: 'Location not found' });
    res.json(routes);
  });

  // GET /api/search?q=library
  router.get('/search', (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });
    res.json(repository.search(q));
  });

  return router;
}

// ---------------------------------------------------------------------------
// 9. 3D NAVIGATION PAGE (served at /navigate)
// ---------------------------------------------------------------------------
const PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ICT-U Multi-Level Campus GPS</title>
  <style>
    body { margin: 0; background: #0b0f19; font-family: Arial, sans-serif; color: white; overflow: hidden; }
    #ui { position: absolute; top: 20px; left: 20px; background: rgba(15, 23, 42, 0.95); padding: 20px; border-radius: 8px; width: 350px; max-width: calc(100vw - 80px); max-height: calc(100vh - 80px); overflow-y: auto; border: 1px solid #334155; z-index: 10; box-shadow: 0 4px 15px rgba(0,0,0,0.6); }
    h2 { margin: 0 0 12px 0; }
    select, button { width: 100%; padding: 10px; margin-top: 8px; margin-bottom: 10px; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: white; font-size: 0.9rem; }
    button { background: #0284c7; cursor: pointer; font-weight: bold; margin-top: 5px; }
    button:hover { background: #0369a1; }
    button.secondary { background: #334155; }
    button.secondary:hover { background: #475569; }
    #canvas-container { width: 100vw; height: 100vh; position: absolute; top: 0; left: 0; }
    .instructions { font-size: 0.8rem; color: #38bdf8; margin-top: 10px; line-height: 1.4; background: rgba(2, 132, 199, 0.1); padding: 8px; border-radius: 4px; border-left: 3px solid #38bdf8; }
    .instructions ol { margin: 6px 0 0 0; padding-left: 18px; color: #e2e8f0; }
    label { font-size: 0.85rem; color: #cbd5e1; font-weight: bold; }
  </style>
</head>
<body>

  <div id="ui">
    <h2>Multi-Level Campus GPS</h2>
    <div style="margin-bottom:12px; font-size:0.85rem;">
      <a href="/" style="color:#38bdf8;">Home</a> &nbsp;|&nbsp;
      <a href="/about" style="color:#38bdf8;">About Us</a>
    </div>

    <label for="dest-select">1. Select Destination Hall:</label>
    <select id="dest-select" onchange="updateRoutes()"></select>

    <label for="route-select">2. Available Route & Floor Paths:</label>
    <select id="route-select"></select>

    <label for="floor-select">3. Show Floor:</label>
    <select id="floor-select" onchange="applyFloorFilter()"></select>

    <button onclick="drawRoute()">Navigate 3D Route</button>
    <button class="secondary" onclick="resetView()">Reset Camera / Overview</button>

    <div id="status" class="instructions">
      <b>GPS Active:</b> Choose your destination to view multi-floor navigation options.
    </div>
  </div>

  <div id="canvas-container"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <script>
    var scene, camera, renderer, controls, data, cfg, pathMesh, marker;
    var navToken = 0;
    var floorGroups = {};
    var DEFAULT_CAM = { x: 65, y: 50, z: 75 };
    var DEFAULT_TARGET = { x: 0, y: 8, z: 0 };
    var SLAB_COLORS = { '1': 0x1e3a8a, '2': 0x312e81, '3': 0x4c1d95, '4': 0x701a75, '5': 0x831843 };

    function getGroup(key) {
      if (!floorGroups[key]) {
        var g = new THREE.Group();
        scene.add(g);
        floorGroups[key] = g;
      }
      return floorGroups[key];
    }

    function makeLabel(text) {
      var canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, 512, 128);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.strokeRect(0, 0, 512, 128);
      ctx.font = 'Bold 36px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 64);
      var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
      sprite.scale.set(6, 1.5, 1);
      return sprite;
    }

    async function init() {
      var container = document.getElementById('canvas-container');

      try {
        var res = await fetch('/api/campus');
        data = await res.json();
        cfg = data.config;
      } catch (err) {
        document.getElementById('status').innerHTML = 'Could not load campus data from the server.';
        return;
      }

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f172a);

      camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(DEFAULT_CAM.x, DEFAULT_CAM.y, DEFAULT_CAM.z);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      container.appendChild(renderer.domElement);

      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.target.set(DEFAULT_TARGET.x, DEFAULT_TARGET.y, DEFAULT_TARGET.z);

      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(40, 70, 40);
      scene.add(dirLight);

      buildGround();
      buildPerimeter();
      buildStairs();
      buildFloorSlabs();
      buildRooms();
      buildMenus();

      window.addEventListener('resize', onResize);
      animate();
    }

    function buildGround() {
      var G = cfg.groundY;
      var ground = new THREE.Mesh(
        new THREE.PlaneGeometry(140, 140),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = G - 0.1;
      scene.add(ground);

      var grid = new THREE.GridHelper(140, 40, 0xf97316, 0x0284c7);
      grid.position.y = G - 0.05;
      scene.add(grid);

      var walk = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.1, cfg.bounds - 4),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
      );
      walk.position.set(0, G + 0.02, (cfg.bounds + 4) / 2);
      scene.add(walk);
    }

    function buildPerimeter() {
      var G = cfg.groundY, b = cfg.bounds;
      var ORANGE = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 });
      var BLUE = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });

      function wall(x1, z1, x2, z2, orange) {
        var dx = x2 - x1, dz = z2 - z1;
        var len = Math.sqrt(dx * dx + dz * dz);
        var mesh = new THREE.Mesh(new THREE.BoxGeometry(len, 4, 0.8), orange ? ORANGE : BLUE);
        mesh.position.set((x1 + x2) / 2, G + 2, (z1 + z2) / 2);
        mesh.rotation.y = -Math.atan2(dz, dx);
        scene.add(mesh);
      }

      wall(-b, -b, 0, -b, true);
      wall(0, -b, b, -b, false);
      wall(-b, -b, -b, 0, false);
      wall(-b, 0, -b, b, true);
      wall(b, -b, b, 0, true);
      wall(b, 0, b, b, false);
      wall(-b, b, -10, b, true);
      wall(10, b, b, b, false);

      var pillarGeo = new THREE.BoxGeometry(2.5, 7, 2.5);
      var left = new THREE.Mesh(pillarGeo, BLUE);
      left.position.set(-10, G + 3.5, b);
      scene.add(left);
      var right = new THREE.Mesh(pillarGeo, ORANGE);
      right.position.set(10, G + 3.5, b);
      scene.add(right);

      var arch = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 1.5), ORANGE);
      arch.position.set(0, G + 6.4, b);
      scene.add(arch);

      var sign = makeLabel('ICT-U');
      sign.scale.set(10, 2.5, 1);
      sign.position.set(0, G + 9, b);
      scene.add(sign);
    }

    function buildStairs() {
      var mat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
      for (var i = 0; i < cfg.totalSteps; i++) {
        var a = i * cfg.spiralAngle;
        var step = new THREE.Mesh(new THREE.BoxGeometry(4, cfg.stepHeight * 0.9, 1.2), mat);
        step.position.set(Math.cos(a) * cfg.spiralRadius, cfg.groundY + i * cfg.stepHeight, Math.sin(a) * cfg.spiralRadius);
        step.rotation.y = -a;
        scene.add(step);
      }
    }

    function buildFloorSlabs() {
      var corridorMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
      data.floors.forEach(function (f) {
        if (f.key === 'outdoor') return;
        var g = getGroup(f.key);

        var corridor = new THREE.Mesh(new THREE.BoxGeometry(52, 0.12, 4), corridorMat);
        corridor.position.set(0, f.level + 0.06, 0);
        g.add(corridor);

        if (f.key !== '-1') {
          var slab = new THREE.Mesh(
            new THREE.BoxGeometry(54, 0.3, 26),
            new THREE.MeshStandardMaterial({ color: SLAB_COLORS[f.key], roughness: 0.9, transparent: true, opacity: 0.35 })
          );
          slab.position.set(0, f.level - 0.15, 0);
          g.add(slab);
        }
      });
    }

    function buildRooms() {
      data.locations.forEach(function (loc) {
        var group = new THREE.Group();
        group.position.set(loc.x, loc.y + loc.h / 2, loc.z);

        var geo = new THREE.BoxGeometry(loc.w, loc.h, loc.d);
        var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
          color: loc.color, roughness: 0.4, transparent: true, opacity: loc.opacity
        }));
        group.add(mesh);

        var edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
        );
        group.add(edges);

        var label = makeLabel(loc.name);
        label.position.set(0, loc.h / 2 + 1.2, 0);
        group.add(label);

        getGroup(loc.floorKey).add(group);
      });
    }

    function buildMenus() {
      var destSelect = document.getElementById('dest-select');
      var floorSelect = document.getElementById('floor-select');

      floorSelect.innerHTML = '<option value="all">All floors</option>';

      data.floors.forEach(function (f) {
        var opt = document.createElement('option');
        opt.value = f.key;
        opt.textContent = f.name;
        floorSelect.appendChild(opt);

        var inFloor = data.locations.filter(function (l) { return l.floorKey === f.key; });
        if (!inFloor.length) return;
        var groupEl = document.createElement('optgroup');
        groupEl.label = f.name;
        inFloor.forEach(function (loc) {
          var o = document.createElement('option');
          o.value = loc.id;
          o.textContent = loc.name + ' (' + loc.floor + ')';
          groupEl.appendChild(o);
        });
        destSelect.appendChild(groupEl);
      });

      updateRoutes();
    }

    function applyFloorFilter() {
      var v = document.getElementById('floor-select').value;
      Object.keys(floorGroups).forEach(function (k) {
        floorGroups[k].visible = (v === 'all' || k === v || k === 'outdoor');
      });
    }

    function updateRoutes() {
      var destId = document.getElementById('dest-select').value;
      var routeSelect = document.getElementById('route-select');
      routeSelect.innerHTML = '';
      (data.routes[destId] || []).forEach(function (r) {
        var opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name;
        routeSelect.appendChild(opt);
      });
    }

    function clearRoute() {
      navToken++;
      controls.enabled = true;
      if (pathMesh) { scene.remove(pathMesh); pathMesh.geometry.dispose(); pathMesh = null; }
      if (marker) { scene.remove(marker); marker = null; }
    }

    function drawRoute() {
      var destId = document.getElementById('dest-select').value;
      var routeId = document.getElementById('route-select').value;
      var target = data.locations.filter(function (l) { return l.id === destId; })[0];
      var routeObj = (data.routes[destId] || []).filter(function (r) { return r.id === routeId; })[0];
      if (!target || !routeObj) return;

      var fv = document.getElementById('floor-select');
      if (fv.value !== 'all' && fv.value !== target.floorKey) {
        fv.value = 'all';
        applyFloorFilter();
      }

      var html = 'Navigating to <b>' + target.name + '</b> on <b>' + target.floor + '</b><ol>';
      routeObj.directions.forEach(function (d) { html += '<li>' + d + '</li>'; });
      html += '</ol>';
      document.getElementById('status').innerHTML = html;

      clearRoute();
      var token = navToken;

      var vectors = routeObj.path.map(function (p) { return new THREE.Vector3(p.x, p.y, p.z); });
      var curve = new THREE.CatmullRomCurve3(vectors, false, 'centripetal');
      var tube = new THREE.TubeGeometry(curve, Math.max(128, vectors.length * 6), 0.25, 8, false);
      pathMesh = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false, transparent: true }));
      pathMesh.renderOrder = 10;
      scene.add(pathMesh);

      marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, depthTest: false })
      );
      marker.renderOrder = 11;
      scene.add(marker);

      controls.enabled = false;
      var t = 0;
      function glide() {
        if (token !== navToken) return;
        t = Math.min(1, t + 0.0025);
        var p = curve.getPointAt(t);
        marker.position.copy(p);
        camera.position.set(p.x + 10, p.y + 10, p.z + 16);
        controls.target.copy(p);
        controls.update();
        if (t < 1) {
          requestAnimationFrame(glide);
        } else {
          controls.enabled = true;
        }
      }
      glide();
    }

    function resetView() {
      clearRoute();
      camera.position.set(DEFAULT_CAM.x, DEFAULT_CAM.y, DEFAULT_CAM.z);
      controls.target.set(DEFAULT_TARGET.x, DEFAULT_TARGET.y, DEFAULT_TARGET.z);
      controls.update();
      document.getElementById('status').innerHTML = '<b>GPS Active:</b> Choose your destination to view multi-floor navigation options.';
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    window.onload = init;
  </script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// 10. APP FACTORY + START
// ---------------------------------------------------------------------------
/** App factory: lets tests build an app without opening a fixed port. */
function createApp({
  repository = CampusRepository.getInstance(),
  navigation = new NavigationService(repository)
} = {}) {
  const app = express();

  // Photos for the About page
  app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

  // Pages
  app.get('/', (req, res) => res.type('html').send(homePage()));
  app.get('/about', (req, res) => res.type('html').send(aboutPage()));
  app.get('/navigate', (req, res) => res.type('html').send(PAGE_HTML));

  // REST API
  app.use('/api', createApiRouter(repository, navigation));

  // Unknown API endpoint
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Central error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

// Start the server only when run directly (`node server.js`), not when required by tests
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  createApp().listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = {
  createApp,
  Location, Room, Restroom, ParkingLot,
  LocationFactory, CampusRepository,
  RouteStrategy, OutdoorRouteStrategy, GroundFloorRouteStrategy, StaircaseRouteStrategy,
  NavigationService
};