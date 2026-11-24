const test = require('node:test'),
  assert = require('node:assert/strict'),
  vm = require('node:vm');
const fs = require('node:fs'),
  path = require('node:path');
const root = process.env.CITY_TANKS_INDEX
  ? path.dirname(path.resolve(process.env.CITY_TANKS_INDEX))
  : path.resolve(__dirname, '..');
function controls() {
  let ms = 0;
  const c = vm.createContext({
    window: { addEventListener() {} },
    console: { log() {} },
    performance: { now: () => ms },
    Date: { now: () => 100000 + ms }
  });
  for (const name of ['models/catalog', 'js/config', 'js/battle-space', 'js/battle-look'])
    vm.runInContext(fs.readFileSync(path.join(root, name + '.js'), 'utf8'), c);
  return {
    ...vm.runInContext('({ArcadeLook,BattleClock})', c),
    advance: (t) => {
      ms += t;
    }
  };
}
test('reference orbit: relative deltas, pitch limits, 6–26 m boom, wheel transitions and 2/4/8 optics', () => {
  const { ArcadeLook: A } = controls(),
    a = new A(0);
  assert.equal(A.sightY, 0.12);
  assert.equal(a.fov, 62);
  assert.equal(a.targetDistance, 13);
  a.rotate(100, 20, 1);
  assert.ok(Math.abs(a.yaw - 0.22) < 1e-8);
  assert.equal(a.pitch, 0.22 + 0.044);
  a.rotate(0, 1e5, 2);
  assert.equal(a.pitch, 1.2);
  a.rotate(0, -1e5, 2);
  assert.equal(a.pitch, -0.55);
  for (let i = 0; i < 12; i++) a.wheel(400);
  assert.equal(a.targetDistance, 26);
  for (let i = 0; i < 8; i++) a.wheel(-10);
  assert.equal(a.targetDistance, 6);
  assert.equal(a.scoped, false);
  for (const z of [2, 4, 8, 8]) {
    a.wheel(-123);
    assert.equal(a.zoom, z);
    assert.equal(a.fov, 44 / z);
  }
  let yaw = a.yaw;
  a.rotate(100, 0, 1);
  assert.ok(Math.abs(a.yaw - yaw - 0.22 / (8 * 1.4)) < 1e-8);
  a.cycleZoom();
  assert.equal(a.zoom, 2);
  a.wheel(1);
  assert.equal(a.fov, 62);
  a.toggleScope();
  a.cycleZoom();
  a.toggleScope();
  a.toggleScope();
  assert.equal(a.zoom, 2);
});
test('floating joystick uses a 58px circle and quantised axes after its dead zone', () => {
  const { ArcadeLook: A } = controls();
  assert.equal(A.stick(8, 0).dx, 0);
  assert.equal(A.stick(29, -58).dy, -0.9);
  assert.equal(A.stick(0, -90).dy, -1);
  const d = A.stick(110, 110);
  assert.ok(Math.abs(Math.hypot(d.x, d.y) - 58) < 1e-8);
  assert.equal(d.dx, d.dy);
});
test('a local pause freezes both reloads and wall-clock-based battle effects, without carrying into replay', () => {
  const { BattleClock: c, advance } = controls();
  advance(200);
  c.pause();
  advance(1700);
  c.pause();
  assert.equal(c.now(), 200);
  assert.equal(c.date(), 100200);
  c.resume();
  advance(40);
  assert.equal(c.now(), 240);
  assert.equal(c.date(), 100240);
  c.reset();
  assert.equal(c.now(), 1940);
});
