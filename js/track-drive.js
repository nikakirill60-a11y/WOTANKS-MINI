// Reference arcade drivetrain. Integrate signed speed in m/s and yaw rate in rad/s
// at 60 Hz; convert once at the boundary to the game's world-units-per-tick vx/vy.
const TrackDrive = (() => {
  const dt = 1 / 60,
    m = BATTLE_UNITS_PER_METRE,
    g = 9.81;
  // The local roster provides top speeds but not power, weight or reverse gears.
  // These are game profiles, NOT historical specifications for individual tanks.
  const classes = { lt: [17, 25, 53, 22], mt: [31, 21, 42, 18], ht: [56, 16, 30, 13], td: [36, 18, 33, 16], spg: [17, 20, 40, 16] };
  const toward = (v, to, d) => v + bounded(to - v, -d, d);
  function profile(u) {
    if (u._mobility) return u._mobility;
    const [weight, power, traverse, reverse] = classes[DB[u.id].cls] || classes.mt;
    const mass = weight * (0.55 + 0.45 * u.s * u.s);
    return (u._mobility = { mass, power: mass * power, traverse: (traverse * Math.PI) / 180, reverse });
  }
  function support(u) {
    const field = GameState.arena?.ground;
    if (!field || field.min === field.max) return { h: 0, pitch: 0, roll: 0 };
    const f = TrackContact.shape(u),
      l = Math.max(0.5, f.L * 0.84),
      w = Math.max(0.5, f.W * 0.8),
      c = Math.cos(u.angle),
      s = Math.sin(u.angle);
    const end = (a, b) => field.at(u.x + c * a + s * b, u.y + s * a - c * b);
    const fl = end(l, w),
      fr = end(l, -w),
      bl = end(-l, w),
      br = end(-l, -w);
    return {
      h: Math.max((fl + fr + bl + br) / 4, field.at(u.x, u.y) - 0.15 * m),
      pitch: Math.atan2(fl + fr - bl - br, 4 * l),
      roll: Math.atan2(fl + bl - fr - br, 4 * w)
    };
  }
  function place(u) {
    const t = support(u);
    u.rideHeight = t.h;
    u.groundPitch = t.pitch;
    u.groundRoll = t.roll;
    u.riseSpeed = 0;
    u.airborne = false;
    u._placed = true;
  }
  function ride(u) {
    const t = support(u),
      k = 1 - Math.exp(-12 * dt);
    u.groundPitch += (t.pitch - u.groundPitch) * k;
    u.groundRoll += (t.roll - u.groundRoll) * k;
    if (u.rideHeight > t.h + 0.05 * m || u.airborne) {
      u.airborne = true;
      u.riseSpeed -= g * dt;
      u.rideHeight += u.riseSpeed * dt * m;
      if (u.rideHeight <= t.h) {
        u.landingSpeed = Math.max(0, -u.riseSpeed);
        u.riseSpeed = 0;
        u.airborne = false;
        u.rideHeight = t.h;
      }
    } else {
      u.rideHeight = t.h;
      u.riseSpeed = 0;
    }
    const pitch = bounded(-u.accel * 0.012, -0.05, 0.05),
      roll = bounded(-u.yawRate * u.driveSpeed * 0.01, -0.04, 0.04);
    u.pitchVel += (64 * (pitch - u.swayPitch) - 4.8 * u.pitchVel) * dt;
    u.swayPitch += u.pitchVel * dt;
    u.rollVel += (64 * (roll - u.swayRoll) - 4.8 * u.rollVel) * dt;
    u.swayRoll += u.rollVel * dt;
  }
  function step(u, throttle = 0, steer = 0, brake = false, nav = null) {
    if (!u._placed) place(u);
    if (u.trackBroken && u.trackRepairAt && BattleClock.date() >= u.trackRepairAt) u.trackBroken = false;
    const disabled = u.trackBroken || BattleClock.date() < u.engineRestartAt;
    throttle = disabled ? 0 : bounded(throttle, -1, 1);
    steer = disabled ? 0 : bounded(steer, -1, 1);
    brake ||= disabled;
    const spec = profile(u),
      type = getTerrainAt(u.x, u.y),
      surface = CONFIG.TERRAIN[type];
    const v = u.driveSpeed,
      engine = getCritMultiplier(u, 'speed'),
      boost = u === GameState.player && GameState.fuelBoostActive ? 1.15 : 1;
    const ratio = u.baseSpeed / ((DB[u.id].speed / 3.6) * m * dt),
      torque = engine * boost * ratio;
    const top = applyTerrainToSpeed(u, u.baseSpeed * boost, type) / (m * dt),
      reverse = Math.min(top, (spec.reverse / 3.6) * ratio * boost);
    const drag = surface.resistance * (surfaceHeight(u.x, u.y) < -0.3 * m ? 1.4 : 1),
      slope = Math.sin(u.groundPitch);
    const pedal = Math.sign(throttle),
      against = pedal * v < 0;
    let accel;
    if (brake) accel = -Math.sign(v) * Math.min(Math.abs(v) / dt, 5.5);
    else if (throttle) {
      if (against && Math.abs(v) > 0.3) accel = pedal * 5.5;
      else {
        const power = (spec.power * 735.5 * 0.62 * torque) / (spec.mass * 1000 * Math.max(Math.abs(v), 1.5));
        accel = pedal * (Math.min(power, 2.6) * Math.abs(throttle) - 0.045 * g * drag);
        const target = (pedal > 0 ? top : reverse) * Math.max(0.35, Math.abs(throttle));
        if (Math.abs(v) >= target && accel * pedal > 0) accel = 0;
      }
      accel -= g * slope * 0.85;
    } else {
      const coast = 2.2 * (0.7 + 0.3 * drag) * (type === 'ice' ? 0.45 : 1);
      accel =
        Math.abs(v) < 0.3 && Math.abs(u.groundPitch) < 0.6
          ? -v / dt
          : -Math.sign(v) * Math.min(Math.abs(v) / dt, coast) - g * slope * 0.5;
    }
    if (!brake && Math.abs(v) > 0.5) accel -= Math.sign(v) * 0.7 * Math.abs(steer);
    let next = bounded(v + accel * dt, -reverse * 1.15, top * 1.15);
    if (!slope && pedal && !against && pedal * next >= 0) {
      next =
        pedal *
        Math.min(
          Math.abs(next),
          Math.max(Math.abs(v), (pedal > 0 ? top : reverse) * Math.max(0.35, Math.abs(throttle)))
        );
    }
    if (
      (v * next < 0 && (brake || against || !throttle)) ||
      (!v && pedal && next * pedal < 0) ||
      Math.abs(next) < 0.0001
    )
      next = 0;
    u.accel = (next - v) / dt;
    u.driveSpeed = next;
    const backing = next < -0.5 || (throttle < 0 && next < 0.2);
    const yaw =
      ((steer * (backing ? -1 : 1) * spec.traverse) / Math.sqrt(drag)) * (Math.abs(next) > 1 ? 0.85 : 1);
    u.yawRate = toward(u.yawRate, yaw, 4 * dt);
    u.angle = wrapAngle(u.angle + u.yawRate * dt);
    const c = Math.cos(u.angle),
      s = Math.sin(u.angle),
      speed = next * m * dt,
      side = bounded(
        (-u.vx * s + u.vy * c) * (1 - surface.grip),
        -Math.abs(speed) * 0.8,
        Math.abs(speed) * 0.8
      );
    const f = Math.sign(speed) * Math.sqrt(Math.max(0, speed * speed - side * side)),
      x = u.x,
      y = u.y;
    u.driveBlocked = TrackContact.move(u, c * f - s * side, s * f + c * side, nav);
    u.vx = u.x - x;
    u.vy = u.y - y;
    if (u.driveBlocked) {
      u.driveSpeed = bounded((u.vx * c + u.vy * s) / (m * dt), -Math.abs(next), Math.abs(next));
      u.accel = bounded((u.driveSpeed - v) / dt, -12, 12);
    }
    if (u.treeDrag) {
      u.driveSpeed *= u.treeDrag;
      u.vx *= u.treeDrag;
      u.vy *= u.treeDrag;
      u.treeDrag = 0;
    }
    u.isMoving = Math.hypot(u.vx, u.vy) > 0.002;
    u.speedKmh = u.driveSpeed * 3.6;
    ride(u);
    u.constrainTraverse();
  }
  return { step, place, profile };
})();
