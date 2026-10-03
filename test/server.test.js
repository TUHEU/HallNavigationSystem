const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  createApp, Location, Room, Restroom, ParkingLot,
  LocationFactory, CampusRepository, NavigationService
} = require('../server');

// ---------- OOP and design pattern tests ----------

test('Location is abstract', () => {
  assert.throws(() => new Location({ id: 'x' }), TypeError);
});

test('Factory returns the right subclass (inheritance + polymorphism)', () => {
  const base = { id: 'a', name: 'A', floorKey: '1', type: 'T', color: 0, x: 0, z: 0, w: 1, d: 1 };
  const restroom = LocationFactory.create({ ...base, kind: 'restroom' });
  const parking = LocationFactory.create({ ...base, floorKey: 'outdoor', kind: 'parking' });
  const room = LocationFactory.create(base);

  assert.ok(restroom instanceof Restroom && restroom instanceof Room);
  assert.ok(parking instanceof ParkingLot && parking.isOutdoor);
  assert.equal(parking.opacity, 1);
  assert.ok(room instanceof Room && !room.isOutdoor);
  assert.notEqual(restroom.describe(), room.describe());
});

test('Repository is a singleton and rejects duplicate ids', () => {
  assert.equal(CampusRepository.getInstance(), CampusRepository.getInstance());
  const spec = { id: 'dup', name: 'D', floorKey: '1', type: 'T', color: 0, x: 0, z: 0, w: 1, d: 1 };
  assert.throws(() => new CampusRepository([spec, spec]), /Duplicate/);
});

test('Ground floor route stays at one height (no stairs)', () => {
  const nav = new NavigationService(CampusRepository.getInstance());
  const path = nav.getRoutes('pondi')[0].path;
  assert.ok(path.every(p => Math.abs(p.y - path[0].y) < 1e-9));
});

test('Upper floor route climbs and never goes down', () => {
  const nav = new NavigationService(CampusRepository.getInstance());
  const path = nav.getRoutes('comp_lab')[0].path;
  for (let i = 1; i < path.length; i++) {
    assert.ok(path[i].y >= path[i - 1].y - 1e-9);
  }
  assert.ok(path[path.length - 1].y > path[0].y);
});

test('Parking route is chosen by the outdoor strategy', () => {
  const nav = new NavigationService(CampusRepository.getInstance());
  assert.match(nav.getRoutes('parking')[0].name, /Ground Route/);
});

test('NavigationService accepts an injected strategy (dependency injection)', () => {
  const stub = {
    supports: () => true,
    build: loc => ({ name: 'stub for ' + loc.id, path: [], directions: [] })
  };
  const nav = new NavigationService(CampusRepository.getInstance(), [stub]);
  assert.equal(nav.getRoutes('library')[0].name, 'stub for library');
});

test('Unknown location returns null', () => {
  const nav = new NavigationService(CampusRepository.getInstance());
  assert.equal(nav.getRoutes('nope'), null);
});

// ---------- Page and API tests ----------

let server;
let base;

before(async () => {
  await new Promise(resolve => { server = createApp().listen(0, resolve); });
  base = 'http://127.0.0.1:' + server.address().port;
});

after(() => new Promise(resolve => {
  server.close(resolve);
  if (server.closeAllConnections) server.closeAllConnections();
}));

async function getJson(path) {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
}

test('GET / serves the home page', async () => {
  const res = await fetch(base + '/');
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.ok(html.includes('Find your way around'));
});

test('GET /about serves the about page with both team members', async () => {
  const res = await fetch(base + '/about');
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.ok(html.includes('Nyetam Bassong Charles'));
  assert.ok(html.includes('Scrum Master'));
  assert.ok(html.includes('Imouck Njoh Rosaline'));
  assert.ok(html.includes('Product Owner'));
});

test('GET /navigate serves the 3D page', async () => {
  const res = await fetch(base + '/navigate');
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.ok(html.includes('ICT-U Multi-Level Campus GPS'));
});

test('GET /api/health returns ok', async () => {
  const { status, body } = await getJson('/api/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'ok');
});

test('GET /api/campus returns config, floors, locations and routes', async () => {
  const { status, body } = await getJson('/api/campus');
  assert.equal(status, 200);
  assert.ok(body.config && body.floors.length && body.locations.length);
  assert.ok(Array.isArray(body.routes.library));
});

test('GET /api/locations filters by floor', async () => {
  const { body } = await getJson('/api/locations?floor=3');
  assert.ok(body.length > 0);
  assert.ok(body.every(l => l.floorKey === '3'));
});

test('GET /api/locations/:id returns one location', async () => {
  const { status, body } = await getJson('/api/locations/library');
  assert.equal(status, 200);
  assert.equal(body.name, 'Central Library');
  assert.equal(body.floor, 'Floor 1');
});

test('GET /api/locations/:id returns 404 for unknown id', async () => {
  const { status } = await getJson('/api/locations/does-not-exist');
  assert.equal(status, 404);
});

test('GET /api/locations/:id/routes starts at the gate and ends in the room', async () => {
  const { status, body } = await getJson('/api/locations/chapel/routes');
  assert.equal(status, 200);
  const path = body[0].path;
  assert.equal(path[0].z, 32);
  const last = path[path.length - 1];
  assert.equal(last.x, 0);
  assert.equal(last.z, -8);
  assert.ok(Math.abs(last.y - 20.6) < 1e-9);
});

test('GET /api/search validates and searches', async () => {
  const bad = await getJson('/api/search');
  assert.equal(bad.status, 400);
  const ok = await getJson('/api/search?q=restroom');
  assert.equal(ok.status, 200);
  assert.ok(ok.body.length >= 1);
});

test('Unknown API endpoint returns 404 JSON', async () => {
  const { status, body } = await getJson('/api/nothing-here');
  assert.equal(status, 404);
  assert.ok(body.error);
});