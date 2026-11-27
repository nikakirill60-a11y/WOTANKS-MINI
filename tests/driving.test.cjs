const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path');
const root = process.env.CITY_TANKS_INDEX
  ? path.dirname(path.resolve(process.env.CITY_TANKS_INDEX))
  : path.resolve(__dirname, '..');
const near = (a, b, e = 1e-8) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
function field(id = 'M4SHERMAN', surface = 'normal') {
  const c = vm.createContext({ window: { addEventListener() {} }, console: { log() {} } });
  for (const file of [
    'models/catalog',
    'js/tree-event',
    'js/config',
    'js/battle-space',
    'js/armor-system',
    'js/tank',
    'js/terrain',
    'js/battle-ground',
    'js/track-contact',
    'js/track-drive'
  ])
    vm.runInContext(fs.readFileSync(path.join(root, file + '.js'), 'utf8'), c, { filename: file });
  const {
    Tank,
    TrackDrive,
    TrackContact,
    BattleGround,
    traceBattleRay,
    GameState: g
  } = vm.runInContext(
    "Math.random=()=>{throw Error('random drivetrain')};({Tank,TrackDrive,TrackContact,BattleGround,traceBattleRay,GameState})",
    c
  );
  const p = (g.player = new Tank(id, 0, 0, 'player'));
  g.units = [p];
  g.walls = [];
  g.arena = { bounds: { x: 30000, y: 30000 } };
  g.terrainZones = [{ x: -29999, y: -29999, w: 59998, h: 59998, type: surface }];
  return {
    p,
    g,
    Tank,
    TrackDrive,
    TrackContact,
    BattleGround,
    traceBattleRay,
    run(n, ...input) {
      for (let i = 0; i < n; i++) TrackDrive.step(p, ...input);
    }
  };
}

test('metric drive at 60 Hz: power-limited run-up, braking distance, stop before engaging reverse', () => {
  const { p, run, TrackDrive } = field();
  run(60, 1);
  const launch = 2.6 - 0.045 * 9.81;
  near(p.driveSpeed, launch);
  near(p.x, (9 * launch * 61) / 120);
  near(p.speedKmh, 3.6 * p.driveSpeed);
  run(540, 1);
  assert.ok(p.driveSpeed > launch && p.accel > 0 && p.accel < launch * 0.5);
  run(2100, 1);
  near(p.speedKmh, 48);
  near(p.y, 0);
  const coast = p.x;
  run(1, 0);
  assert.ok(p.driveSpeed > 0 && p.speedKmh < 48);
  run(900, 0);
  near(p.speedKmh, 0);
  const rollout = p.x - coast;
  run(2700, 1);
  const before = p.x;
  run(1, 1, 0, true);
  near(p.accel, -5.5);
  run(220, 1, 0, true);
  near(p.driveSpeed, 0);
  assert.ok(p.x > before && p.x - before < rollout * 0.5);
  run(220, 1);
  const forward = p.x;
  run(1, -1);
  near(p.accel, -5.5);
  assert.ok(p.x > forward);
  let stopped = false;
  for (let i = 0; i < 800; i++) {
    run(1, -1);
    if (!p.driveSpeed) stopped = true;
    if (p.driveSpeed < 0) assert.ok(stopped);
  }
  near(p.speedKmh, -TrackDrive.profile(p).reverse);
  near(p.angle, 0);
});

test('traverse builds at 4 rad/s², slows in motion, scrubs speed and reverses sense in the reverse gear', () => {
  function yaw(pedal) {
    const { p, run } = field();
    run(290, pedal);
    run(1, pedal, 1);
    near(Math.abs(p.yawRate), 4 / 60);
    run(44, pedal, 1);
    return [p.angle, p.yawRate, p.speedKmh];
  }
  const forward = yaw(1),
    reverse = yaw(-1),
    park = yaw(0),
    straight = field();
  straight.run(335, 1);
  assert.ok(forward[0] > 0 && reverse[0] < 0 && reverse[2] < 0);
  near(forward[1], 0.85 * park[1]);
  near(reverse[1], -forward[1]);
  assert.ok(forward[2] < straight.p.speedKmh);
});

test('mud limits speed, ice slips and coasts farther, road gearing and engine/fuel modifiers still matter', () => {
  function drive(type) {
    const { p, run } = field('M4SHERMAN', type);
    run(2600, 1);
    const max = p.speedKmh;
    near(p.vy, 0);
    run(20, 1, 1);
    const slip = Math.abs(Math.atan2(p.vy, p.vx) - p.angle),
      x = p.x,
      y = p.y;
    run(1800, 0);
    near(p.driveSpeed, 0);
    return { max, slip, coast: Math.hypot(p.x - x, p.y - y) };
  }
  const ice = drive('ice'),
    road = drive('asphalt'),
    mud = drive('mud');
  near(road.max, 48);
  near(mud.max, 48 * 0.55);
  near(ice.max, 48 * 1.05);
  assert.ok(ice.slip > road.slip * 3 && ice.coast > road.coast * 2);
  assert.deepEqual(ice, drive('ice'));
  const { p, run, g } = field('IS7', 'asphalt');
  run(3500, 1);
  near(p.speedKmh, 59);
  g.fuelBoostActive = true;
  run(3000, 1);
  near(p.speedKmh, 59 * 1.15);
  const healthy = field(),
    damaged = field();
  damaged.p.critTimers.engine = Infinity;
  healthy.run(360, 1);
  damaged.run(360, 1);
  assert.ok(healthy.p.speedKmh > damaged.p.speedKmh + 3);
  const { p: u, run: step } = damaged;
  u.trackBroken = true;
  step(400, 1, 1);
  near(u.driveSpeed, 0);
  near(u.yawRate, 0);
  u.trackRepairAt = 1;
  step(60, 1);
  assert.ok(!u.trackBroken && u.driveSpeed > 0);
  u.engineRestartAt = Infinity;
  step(400, 1);
  near(u.driveSpeed, 0);
  u.engineRestartAt = 0;
  step(60, 1);
  assert.ok(u.speedKmh > 0);
});

test('swept hulls stop at a thin wall and the map edge, slide on a diagonal and leave without stored speed', () => {
  const { p, g, run, TrackContact: C } = field();
  p.modelAsset = { hull: { boundingBox: { min: { x: -1, y: 0, z: -2 }, max: { x: 1, y: 2, z: 3 } } } };
  g.walls = [{ solid: true, x: 80, y: -430, w: 1, h: 860 }];
  const half = C.shape(p);
  near(half.L, 22.5);
  near(half.W, 9);
  assert.ok(C.move(p, 160, 80, null));
  near(p.x, 80 - 27, 0.005);
  near(p.y, 80);
  run(190, 1);
  near(p.driveSpeed, 0);
  assert.ok(p.driveBlocked);
  const hit = p.x;
  run(40, -1);
  assert.ok(p.x < hit && p.speedKmh < 0);
  p.x = p.y = 0;
  p.angle = Math.PI / 2;
  C.move(p, 100, 30);
  near(p.x, 80 - 9, 0.005);
  near(p.y, 30);
  g.walls = [];
  g.arena.bounds.x = 120;
  C.move(p, 210, 0);
  near(p.x, 120 - 5 * 9);
});

test('pair contacts displace and share velocity by mass, damage is enemy-only and rate-limited per pair', () => {
  const { p, g, Tank, TrackContact: C, TrackDrive: D } = field('IS7');
  const b = new Tank('BT2', 0, 0, 'enemy');
  g.units = [p, b];
  const gap = C.shape(p).L + C.shape(b).L,
    cb = [];
  function collide(tick) {
    p.x = 0;
    b.x = gap - 3;
    p.driveSpeed = 12;
    b.driveSpeed = 0;
    C.pairs(g.units, tick, (...a) => cb.push(a));
  }
  collide(1);
  assert.ok(C.overlap(C.pose(p), C.pose(b)) === null);
  assert.ok(Math.abs(p.x) < b.x - gap + 3, 'the lighter hull moves farther');
  near(p.driveSpeed, b.driveSpeed);
  near(p.driveSpeed, (12 * D.profile(p).mass) / (D.profile(p).mass + D.profile(b).mass));
  assert.ok(cb[0][2] > 0 && cb[0][3] > cb[0][2]);
  collide(35);
  assert.equal(cb.length, 1);
  collide(62);
  assert.equal(cb.length, 2);
  b.team = 'ally';
  collide(150);
  assert.equal(cb.length, 2);
});

test('four track supports pitch and roll the hull; gravity affects pace and landing; sway settles when stopped', () => {
  function slope(grade) {
    const f = field(),
      ground = { min: -5000, max: 5000, at: (x, y) => 200 + grade * x + 0.05 * y };
    f.g.arena.ground = ground;
    f.TrackDrive.place(f.p);
    near(f.p.groundPitch, Math.atan(grade));
    near(f.p.groundRoll, Math.atan(-0.05));
    near(f.p.rideHeight, 200);
    f.run(240, 1);
    near(f.p.rideHeight, ground.at(f.p.x, f.p.y), 0.2);
    return f;
  }
  const up = slope(0.08),
    flat = slope(0),
    down = slope(-0.08);
  assert.ok(up.p.speedKmh < flat.p.speedKmh && down.p.speedKmh > flat.p.speedKmh);
  assert.ok(up.p.swayPitch < 0);
  up.run(600, 0, 0, true);
  near(up.p.swayPitch, 0, 0.0001);
  up.p.rideHeight += 35;
  up.run(1, 0);
  assert.ok(up.p.airborne && up.p.riseSpeed < 0);
  up.run(70, 0);
  assert.ok(!up.p.airborne && up.p.landingSpeed > 7);
});

test('terrain rays intersect the actual sloping triangles and submerged bed, from inside or outside the arena', () => {
  const { BattleGround: G } = field();
  const t = new G({ id: 'city', bounds: { x: 10, y: 10 }, walls: [], water: [] });
  Object.assign(t, {
    cols: 2,
    rows: 2,
    dx: 10,
    dy: 10,
    min: -2,
    max: 8,
    samples: Float32Array.of(0, 0, 0, 0, 8, 0, 0, 0, 0)
  });
  near(t.at(-4, -3), 2.4);
  near(t.at(3, 2), 4);
  near(t.ray(-12, 0, 4, 1, 0, 0, 30), 7);
  near(t.ray(3, 2, 12, 0, 0, -1, 20), 8);
  assert.equal(t.ray(-12, 0, 8.01, 1, 0, 0, 30), Infinity);
  near(t.ray(-19, -5, 4, 0, 0, -1, 10), 4);
  t.samples[4] = -2;
  t.max = 0;
  near(t.ray(0, 0, 5, 0, 0, -1, 10), 7);
  for (const limit of [5, 6]) assert.equal(t.ray(0, 0, 5, 0, 0, -1, limit), Infinity);
});

test('a moving hull topples an individual tree once; a slow light vehicle stops at its trunk', () => {
  const { p, g, run, TrackContact: C } = field('BT2');
  const tree = { x: 40, y: 0, r: 3, height: 60, fallen: false };
  Object.assign(g.arena, { trees: [tree], treeRevision: 0 });
  assert.ok(C.move(p, 60, 0));
  assert.ok(!tree.fallen && p.x < 40 - C.shape(p).L);
  p.driveSpeed = 6;
  run(4, 1);
  assert.ok(tree.fallen && Number.isFinite(tree.angle) && p.driveSpeed < 6);
  run(130, 1);
  assert.ok(p.x > 40 && g.arena.treeRevision === 1);
});

test('independent sight and asymmetric M3 mount: turning cannot wind up the gun or disconnect the shot', () => {
  const { p, run } = field('M3LEE');
  p.modelAsset = { groundY: 0, pivot: [-0.8, 1.64, 1.28], gunPivot: [0, 0, 0], muzzle: [0.07, 0.08, 1.64] };
  const goal = { x: 284, y: 35, h: 8 };
  p.lookAtPoint(goal.x, goal.y, goal.h);
  p.slewSight(Math.PI, Math.PI);
  const r = p.barrelRay(),
    t = (goal.x - r.x) / r.dx;
  near(r.y + t * r.dy, goal.y);
  near(r.h + t * r.dh, goal.h);
  p.lookAtPoint(-200, 180, 15);
  near(p.lookYaw, p.maxYaw);
  p.lookAtPoint(200, 0, 350);
  near(p.lookPitch, p.maxPitch);
  p.setLook(Math.PI, 1);
  p.slewSight(Math.PI, Math.PI);
  near(p.tAngle, Math.PI / 12);
  near(p.aimPitch, (20 * Math.PI) / 180);
  for (let i = 0; i < 430; i++) {
    run(1, 0, -1);
    p.slewSight();
    assert.ok(
      Math.abs(Math.atan2(Math.sin(p.tAngle - p.angle), Math.cos(p.tAngle - p.angle))) <= Math.PI / 12 + 1e-9
    );
  }
  const { p: s, run: move } = field();
  s.setLook(Math.PI / 2, 0.1);
  s.slewSight();
  assert.ok(s.tAngle > 0 && s.tAngle < Math.PI / 2);
  for (let i = 0; i < 210; i++) {
    move(1, 0);
    s.slewSight();
  }
  near(s.tAngle, Math.PI / 2);
  near(s.aimPitch, 0.1);
  near(s.angle, 0);
  move(190, 0, 1, true);
  near(s.tAngle, Math.PI / 2);
  assert.ok(Math.abs(s.angle) > 2);
});
