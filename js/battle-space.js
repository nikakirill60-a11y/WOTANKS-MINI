// The simulation uses a horizontal (x,y) plane and a vertical h axis.
// Three.js maps this to (x,h,y). Distances below are game units, not screen pixels.
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const bounded = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const BATTLE_RANGE = 2350;
const BATTLE_UNITS_PER_METRE = 9;
// Model axes (+X left, +Y up, +Z forward), in simulation coordinates (x,y,h).
// Equivalent to the renderer's YXZ rotation. Use its transpose for local picking
// so shots and the sight still agree with a rolled or pitching hull.
function bodyAxes(u) {
  const yaw = u.angle,
    pitch = (u.groundPitch || 0) + (u.swayPitch || 0),
    roll = (u.groundRoll || 0) + (u.swayRoll || 0);
  let b = u._basis;
  if (b && b.a === yaw && b.p === pitch && b.r === roll) return b;
  b = u._basis || (u._basis = {});
  const c = Math.cos(yaw),
    s = Math.sin(yaw),
    cp = Math.cos(pitch),
    sp = Math.sin(pitch),
    cr = Math.cos(roll),
    sr = Math.sin(roll);
  Object.assign(b, {
    a: yaw,
    p: pitch,
    r: roll,
    fx: c * cp,
    fy: s * cp,
    fh: sp,
    lx: s * cr - c * sp * sr,
    ly: -c * cr - s * sp * sr,
    lh: cp * sr,
    ux: -s * sr - c * sp * cr,
    uy: c * sr - s * sp * cr,
    uh: cp * cr
  });
  return b;
}
function bodyVector(u, l, up, f) {
  const b = bodyAxes(u);
  return {
    x: b.lx * l + b.ux * up + b.fx * f,
    y: b.ly * l + b.uy * up + b.fy * f,
    h: b.lh * l + b.uh * up + b.fh * f
  };
}
function bodyPoint(u, l, up, f) {
  const p = bodyVector(u, l, up, f);
  p.x += u.x;
  p.y += u.y;
  p.h += u.rideHeight || 0;
  return p;
}
function bodyLocal(b, x, y, h) {
  return {
    x: x * b.lx + y * b.ly + h * b.lh,
    h: x * b.ux + y * b.uy + h * b.uh,
    z: x * b.fx + y * b.fy + h * b.fh
  };
}
function surfaceHeight(x, y) {
  return GameState.arena?.ground?.at(x, y) ?? 0;
}
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

function localBox(box, scale, x, h, z, dx, dh, dz, limit) {
  const lo = box.min,
    hi = box.max;
  return rayBox(
    x,
    z,
    h,
    dx,
    dz,
    dh,
    lo.x * scale,
    lo.z * scale,
    lo.y * scale,
    hi.x * scale,
    hi.z * scale,
    hi.y * scale,
    limit
  );
}

// Camera booms retract at solids; ground height is clamped separately so looking
// up from level ground doesn't also zoom the vehicle in.
function nearestBattleWall(x, y, h, dx, dy, dh, limit) {
  let distance = limit,
    hit = null;
  const x1 = x + dx * limit,
    y1 = y + dy * limit,
    minX = Math.min(x, x1),
    maxX = Math.max(x, x1),
    minY = Math.min(y, y1),
    maxY = Math.max(y, y1),
    minH = Math.min(h, h + dh * limit);
  for (const wall of GameState.walls) {
    const base = wall.baseHeight || 0;
    if (
      !wall.solid ||
      base + wall.height < minH ||
      wall.x > maxX ||
      wall.y > maxY ||
      wall.x + wall.w < minX ||
      wall.y + wall.h < minY
    )
      continue;
    const t = rayBox(
      x,
      y,
      h,
      dx,
      dy,
      dh,
      wall.x,
      wall.y,
      base,
      wall.x + wall.w,
      wall.y + wall.h,
      base + wall.height,
      distance
    );
    if (t <= distance) {
      distance = t;
      hit = wall;
    }
  }
  return { distance, hit };
}

function traceBattleRay(
  x,
  y,
  h,
  dx,
  dy,
  dh,
  limit,
  shooter,
  wallsOnly = false,
  includeAllies = false,
  visibleOnly = false
) {
  const ground = GameState.arena?.ground?.ray(x, y, h, dx, dy, dh, limit) ?? (dh < 0 ? -h / dh : Infinity),
    land = ground >= 0 && ground <= limit;
  let { distance, hit } = nearestBattleWall(x, y, h, dx, dy, dh, land ? ground : limit),
    part = null;
  if (!hit && land) hit = 'ground';
  if (!wallsOnly)
    for (const u of GameState.units) {
      if (
        u === shooter ||
        u.dead ||
        (visibleOnly && u.team === 'enemy' && !u.visible) ||
        (!includeAllies && (u.team === 'enemy') === (shooter.team === 'enemy'))
      )
        continue;
      const s = u.modelScale,
        asset = u.modelAsset,
        axes = bodyAxes(u);
      const o = bodyLocal(axes, x - u.x, y - u.y, h - (u.rideHeight || 0)),
        d = bodyLocal(axes, dx, dy, dh);
      o.h -= asset.groundY * s;
      let body;
      if (asset.suspension) {
        const [, hy, hz] = asset.suspension,
          ct = Math.cos(u.suspensionPitch),
          st = Math.sin(u.suspensionPitch);
        const tracks = localBox(asset.treads.boundingBox, s, o.x, o.h, o.z, d.x, d.h, d.z, distance);
        const y = o.h - hy * s,
          z = o.z - hz * s,
          dy = d.h,
          dz = d.z;
        o.h = hy * s + ct * y - st * z;
        o.z = hz * s + st * y + ct * z;
        d.h = ct * dy - st * dz;
        d.z = st * dy + ct * dz;
        body = Math.min(tracks, localBox(asset.body.boundingBox, s, o.x, o.h, o.z, d.x, d.h, d.z, distance));
      } else body = localBox(asset.hitHull || asset.hull.boundingBox, s, o.x, o.h, o.z, d.x, d.h, d.z, distance);
      const [tx, th, tz] = asset.pivot,
        side = o.x - tx * s,
        f = o.z - tz * s;
      const yaw = u.tAngle - u.angle,
        c = Math.cos(yaw),
        sn = Math.sin(yaw);
      const l = c * side + sn * f,
        upLocal = o.h - th * s,
        z = c * f - sn * side,
        dl = c * d.x + sn * d.z,
        dz = c * d.z - sn * d.x;
      let turret = localBox(asset.hitTurret || asset.turret.boundingBox, s, l, upLocal, z, dl, d.h, dz, distance);
      if (asset.upperBox) {
        const [gx, gy, gz] = asset.gunPivot,
          up = upLocal - gy * s,
          fw = z - gz * s,
          cp = Math.cos(u.aimPitch),
          sp = Math.sin(u.aimPitch);
        turret = Math.min(
          turret,
          localBox(
            asset.upperBox,
            s,
            l - gx * s,
            cp * up - sp * fw,
            sp * up + cp * fw,
            dl,
            cp * d.h - sp * dz,
            sp * d.h + cp * dz,
            distance
          )
        );
      }
      const t = Math.min(body, turret);
      if (t <= distance) {
        distance = t;
        hit = u;
        // On casemate models the upper mesh can be hit, but is part of the hull.
        part = turret < body && u.turretArmor != null ? 'turret' : 'hull';
      }
    }
  return { x: x + dx * distance, y: y + dy * distance, h: h + dh * distance, distance, hit, part };
}
