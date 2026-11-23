// Arcade drivetrain. Inputs are dimensionless; velocity is WORLD UNITS per fixed 1/60 s tick.
// Integrate in world space: on ice the hull can turn before its direction of travel catches up.
const TrackDrive = (() => {
  const chassis = {
    lt: { runup: 59, turn: 0.047 },
    mt: { runup: 81, turn: 0.04 },
    ht: { runup: 107, turn: 0.034 }
  };
  const towards = (v, target, step) => v + Math.sign(target - v) * Math.min(Math.abs(target - v), step);
  const axis = (v) => Math.max(-1, Math.min(1, v));

  function translate(u, nav) {
    const startX = u.x,
      startY = u.y,
      radius = 25 * u.s;
    // Short swept steps, even with a speed upgrade. Resolve a glancing contact along
    // a free axis; never carry velocity into the blocked component on the next tick.
    const steps = Math.max(1, Math.ceil(Math.hypot(u.vx, u.vy) / Math.min(4, radius * 0.45)));
    function free(x, y) {
      return !tankCollides(x, y, radius, u) && (!nav || nav.clear(u.x, u.y, x, y));
    }
    u.driveBlocked = false;
    for (let i = 0; i < steps; i++) {
      const dx = u.vx / steps,
        dy = u.vy / steps;
      if (!dx && !dy) break;
      if (free(u.x + dx, u.y + dy)) {
        u.x += dx;
        u.y += dy;
        continue;
      }
      u.driveBlocked = true;
      const freeX = dx !== 0 && free(u.x + dx, u.y),
        freeY = dy !== 0 && free(u.x, u.y + dy);
      if (freeX && (!freeY || Math.abs(dx) >= Math.abs(dy))) {
        u.x += dx;
        u.vy = 0;
      } else if (freeY) {
        u.y += dy;
        u.vx = 0;
      } else {
        u.vx = u.vy = 0;
        break;
      }
    }
    const dx = u.x - startX,
      dy = u.y - startY,
      distance = Math.hypot(dx, dy);
    u.isMoving = distance > 0.002;
    u.speedKmh =
      ((distance * 60 * 3.6) / BATTLE_UNITS_PER_METRE) *
      (dx * Math.cos(u.angle) + dy * Math.sin(u.angle) < 0 ? -1 : 1);
  }

  function step(u, throttle = 0, steer = 0, brake = false, nav = null) {
    const type = getTerrainAt(u.x, u.y),
      ground = CONFIG.TERRAIN[type];
    const ch = chassis[DB[u.id].cls] || chassis.mt;
    const engine = (u.trackBroken ? 0.3 : 1) * getCritMultiplier(u, 'speed');
    const boost = u === GameState.player && GameState.fuelBoostActive ? 1.15 : 1;
    const top = applyTerrainToSpeed(u, u.baseSpeed * engine * boost, type);
    const pace = Math.min(1, Math.hypot(u.vx, u.vy) / Math.max(0.01, top));
    const yaw = axis(steer) * ch.turn * ground.turnMul * (1 - 0.39 * pace) * (u.trackBroken ? 0.58 : 1);
    u.yawRate = towards(u.yawRate, yaw, 0.0065 * ground.traction);
    u.angle = wrapAngle(u.angle + u.yawRate);
    const cs = Math.cos(u.angle),
      sn = Math.sin(u.angle);
    const f = u.vx * cs + u.vy * sn,
      side = (-u.vx * sn + u.vy * cs) * (1 - ground.grip);
    const input = axis(throttle),
      request = brake ? 0 : input * top * (input < 0 ? 0.58 : 1);
    const reversing = f * request < 0;
    const accel = (u.baseSpeed * engine * boost * ground.traction) / ch.runup;
    const pedal = u.baseSpeed * (0.025 + 0.044 * ground.traction);
    const roll = u.baseSpeed * 0.022 * ground.drag;
    const rate =
      brake || reversing
        ? pedal
        : !request
          ? roll
          : Math.abs(request) < Math.abs(f)
            ? Math.max(accel, roll)
            : accel;
    const next = towards(f, reversing ? 0 : request, rate);
    u.vx = cs * next - sn * side;
    u.vy = sn * next + cs * side;
    if (!request && Math.hypot(u.vx, u.vy) < 0.002) u.vx = u.vy = 0;
    translate(u, nav);
    u.constrainTraverse();
  }
  return { step };
})();
