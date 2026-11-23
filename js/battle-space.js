// The simulation uses a horizontal (x,y) plane and a vertical h axis.
// Three.js maps this to (x,h,y). Distances below are game units, not screen pixels.
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const bounded = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const BATTLE_RANGE = 2350;
const BATTLE_UNITS_PER_METRE = 9;
// Slab intersection with a finite ray. Reused for cursor picking, camera clearance and
// swept projectile hits so that zoom, frame rate and shell speed cannot change cover.
function rayBox(x, y, h, dx, dy, dh, x0, y0, h0, x1, y1, h1, limit) {
  let enter = 0,
    exit = limit;
  for (const [o, d, lo, hi] of [
    [x, dx, x0, x1],
    [y, dy, y0, y1],
    [h, dh, h0, h1]
  ]) {
    if (Math.abs(d) < 1e-7) {
      if (o < lo || o > hi) return Infinity;
      continue;
    }
    const a = (lo - o) / d,
      b = (hi - o) / d;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (exit < enter) return Infinity;
  }
  return enter;
}

function rayPart(box, x, y, h, dx, dy, dh, cs, sn, scale, limit) {
  const { min, max } = box;
  return rayBox(
    x * sn - y * cs,
    x * cs + y * sn,
    h,
    dx * sn - dy * cs,
    dx * cs + dy * sn,
    dh,
    min.x * scale,
    min.z * scale,
    min.y * scale,
    max.x * scale,
    max.z * scale,
    max.y * scale,
    limit
  );
}

function traceBattleRay(x, y, h, dx, dy, dh, limit, shooter, wallsOnly = false, includeAllies = false) {
  let distance = limit,
    hit = null,
    part = null;
  const ground = dh < 0 ? -h / dh : Infinity;
  if (ground >= 0 && ground <= distance) {
    distance = ground;
    hit = 'ground';
  }
  for (const wall of GameState.walls) {
    if (!wall.solid) continue;
    const t = rayBox(
      x,
      y,
      h,
      dx,
      dy,
      dh,
      wall.x,
      wall.y,
      0,
      wall.x + wall.w,
      wall.y + wall.h,
      wall.height,
      distance
    );
    if (t <= distance) {
      distance = t;
      hit = wall;
    }
  }
  if (!wallsOnly)
    for (const u of GameState.units) {
      if (u === shooter || u.dead || (!includeAllies && (u.team === 'enemy') === (shooter.team === 'enemy')))
        continue;
      const s = u.modelScale,
        asset = u.modelAsset,
        baseH = asset.groundY * s;
      const ox = x - u.x,
        oy = y - u.y,
        cs = Math.cos(u.angle),
        sn = Math.sin(u.angle);
      // Geometry-local bounding volumes come from the loaded model, not the tank ID.
      // +Z is forward, +X points left. Rotate the turret volume independently.
      const body = rayPart(asset.hull.boundingBox, ox, oy, h - baseH, dx, dy, dh, cs, sn, s, distance);
      const [tx, th, tz] = asset.pivot;
      const turret = rayPart(
        asset.turret.boundingBox,
        ox - s * (tx * sn + tz * cs),
        oy - s * (-tx * cs + tz * sn),
        h - baseH - th * s,
        dx,
        dy,
        dh,
        Math.cos(u.tAngle),
        Math.sin(u.tAngle),
        s,
        distance
      );
      const t = Math.min(body, turret);
      if (t <= distance) {
        distance = t;
        hit = u;
        part = turret < body ? 'turret' : 'hull';
      }
    }
  return { x: x + dx * distance, y: y + dy * distance, h: h + dh * distance, distance, hit, part };
}
