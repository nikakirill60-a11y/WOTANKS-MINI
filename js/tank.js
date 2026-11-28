// js/tank.js
// ========== КЛАСС ТАНКА ==========

class Tank {
  constructor(id, x, y, team, allBonuses) {
    var d = DB[id];
    this.id = id;
    this.name = d.n;
    this.team = team;
    this.stance = d.stance;
    this.isSPG = d.cls === 'spg';
    this.x = x;
    this.y = y;

    var mb = allBonuses ? allBonuses.mod || {} : {};
    var ub = allBonuses ? allBonuses.upg || {} : {};

    var hpMul = ub.hpMul || 1;
    var dmgMul = ub.dmgMul || 1;
    var reloadMul = ub.reloadMul || 1;
    var speedMul = ub.speedMul || 1;
    var vrMul = ub.vrMul || 1;

    this.hp = Math.floor(d.hp * hpMul * (1 + (mb.hp || 0)));
    this.maxHp = this.hp;
    this.dmg = Math.floor(shotDamage(d) * dmgMul * (1 + (mb.dmg || 0)));
    this.calibration = d.weapon === 'calibration'
      ? { active:false, until:null, damageScale:dmgMul * (1 + (mb.dmg || 0)) } : null;
    this.s = d.s;
    this.tier = d.tier;
    this.vr = Math.floor((d.vr || 350) * vrMul * (1 + (mb.vr || 0)));
    this.camo = (d.camo || 0.2) * (1 + (mb.camo || 0));
    this.armor = Math.floor((d.armor || 0) * (1 + (mb.armor || 0)));

    this.turretArmor = d.turretArmor == null ? null : Math.floor(d.turretArmor * (1 + (mb.armor || 0)));
    this.pen = d.pen;

    // ✅ Критические повреждения модулей (см. armor-system.js)
    this.critTimers = { engine: 0, ammo: 0, gun: 0 };
    this.angle = 0;
    // World-space gun bearing; a limited mount is constrained relative to the hull.
    this.tAngle = this.lookYaw = this.lookPitch = 0;
    // In the renderer turret.rotation.y = hull bearing − gun bearing.
    const [modelMin, modelMax] = d.yawLimits || [-180, 180];
    this.minYaw = (-modelMax * Math.PI) / 180;
    this.maxYaw = (-modelMin * Math.PI) / 180;
    this.minPitch = d.minPitch == null ? -0.48 : (d.minPitch * Math.PI) / 180;
    this.maxPitch = d.maxPitch == null ? 0.58 : (d.maxPitch * Math.PI) / 180;
    this.lastShot = 0;
    this.dead = false;
    this.salvoSize = d.salvo || 1; // rounds per trigger, not magazine capacity
    this.magSize = d.mag || 1;
    this.usesMagazine = this.magSize > 1;
    this.curMag = this.magSize;
    this.isReloading = false;
    this.reloadTime = Math.floor((d.reload || 2500) * reloadMul * (1 + (mb.reload || 0)));
    // km/h → metres/s → world units per 60-Hz simulation step.
    this.baseSpeed = (((d.speed / 3.6) * BATTLE_UNITS_PER_METRE) / 60) * speedMul * (1 + (mb.speed || 0));
    this.vx = this.vy = this.yawRate = this.speedKmh = 0;
    this.driveSpeed = this.accel = this.rideHeight = this.riseSpeed = 0; // drive/rise speed in m/s, height in world units
    this.groundPitch = this.groundRoll = this.swayPitch = this.swayRoll = this.pitchVel = this.rollVel = 0;
    this.airborne = false;
    this.driveBlocked = this.isMoving = false;
    this.currentTerrain = 'normal';
    this.justFired = false;
    this.fireTimer = 0;
    this.trackBroken = false;
    this.trackRepairAt = this.engineRestartAt = 0;
    this.visible = true;
    this.engineTick = 0;
    this.shotDelay = d.clipMs || 0; // interval between successive rounds, not full reload or twin salvo

    this.aimPitch = 0;
    this.modelScale = BATTLE_UNITS_PER_METRE;
    this.shellSpeedMul = 1 + (mb.shell_speed || 0);
    this.onFire = false;
    this.fireDmgTimer = 0;
    this.nextShot = 0;
  }

  slewDriver(dt) {
    const rate = ({lt:52, mt:42, ht:30, td:34, spg:34})[DB[this.id].cls] || 42;
    this.slewSight(rate * Math.PI / 180 * dt, 28 * Math.PI / 180 * dt);
  }

  shellStep(round) { return 14 * CONFIG.SHELL_FLIGHT_RATE * round.sMul * this.shellSpeedMul; }

  roundFor(index) {
    if (this.calibration) return KPZ_CALIBRATION[this.calibration.active ? 'calibrated' : 'standard'][index];
    return this.isSPG ? CONFIG.SPG_ROUND : CONFIG.SHELLS[this.usesMagazine ? 0 : index];
  }

  updateCalibration(now) {
    const c = this.calibration;
    if (c && c.until !== null && now >= c.until) {
      c.active = !c.active;
      c.until = null;
    }
  }

  toggleCalibration(now = BattleClock.now()) {
    if (!this.calibration || this.dead) return false;
    this.updateCalibration(now);
    if (this.calibration.until !== null) return false;
    this.calibration.until = now + KPZ_CALIBRATION.switchMs;
    return true; // independent of the gun's existing reload deadline
  }

  updateReload(now) {
    if (this.isReloading && now >= this.nextShot) {
      this.curMag = this.magSize;
      this.isReloading = false;
    }
  }

  fire(shellType = 0, sight = null) {
    const now = BattleClock.now();
    this.updateReload(now);
    if (this.calibration) {
      this.updateCalibration(now);
      if (this.calibration.until !== null) return false;
    }
    if (this.dead || this.isReloading || now < this.nextShot || !this.modelAsset) return false;
    if (this.usesMagazine) shellType = 0; // One clip type, including for AI and touch input.
    if (sight && (!this.isSPG || (this === GameState.player && GameState.holdTurret) || !sight.aligned(this))) return false;
    const sh = this.roundFor(shellType);
    if (!sh) return false;
    const speed = this.shellStep(sh);
    const base = sh.alpha === undefined ? this.dmg * sh.dMul : Math.floor(sh.alpha * this.calibration.damageScale);
    const damage = base * getCritMultiplier(this, 'dmg') *
      ((this.fieldKit?.paiokActive || (this === GameState.player && GameState.paiokActive)) ? 1.05 : 1);
    const tips = this.modelAsset.muzzles || [this.modelAsset.muzzle];
    for (const tip of tips) {
      const ray = this.barrelRay(tip);
      const shell = {
        ...ray, a: Math.atan2(ray.dy, ray.dx), team: this.team, shooter: this,
        speed, traveled: 0, round: sh, color: sh.color, dmg: damage,
        pen: this.pen * sh.penMul, st: this.isSPG ? 1 : shellType
      };
      if (sight) shell.arc = sight.plot(shell);
      GameState.bullets.push(shell);
      spawnParticles(ray.x, ray.y, '#ffb24c', 5, 1.2, 8, ray.h);
      spawnShellCasing(this);
    }
    const yaw = this.tAngle - this.angle,
      kick = Math.min(0.16, 0.035 + this.dmg * 0.0002);
    this.pitchVel += kick * Math.cos(yaw);
    this.rollVel -= kick * Math.sin(yaw);
    this.shotsFired = (this.shotsFired || 0) + 1;
    this.lastShot = BattleClock.date();
    this.justFired = true;
    this.fireTimer = this.lastShot + 3000;
    this.curMag--;
    const multiplier =
      ((this.fieldKit?.adrenalineTimer > BattleClock.date() || (this === GameState.player && GameState.adrenalineActive)) ? 0.5 : 1) * getCritMultiplier(this, 'reload');
    this.nextShot = now + (this.curMag ? this.shotDelay : this.reloadTime * multiplier);
    this.isReloading = !this.curMag;
    snd(this.usesMagazine ? 'rapidfire' : 'shot');
    return true;
  }

  get aimHeight() {
    return this.rideHeight + bodyAxes(this).uh * this.modelAsset.aimHeight * this.modelScale;
  }
  get suspensionPitch() {
    if (!this.modelAsset?.suspension) return 0;
    return this.stance === 'hull' ? this.aimPitch : Math.min(this.aimPitch, 0);
  }
  gunPivotWorld() {
    return this.gunPoint(false);
  }
  get gunHeight() {
    return this.gunPivotWorld().h;
  }

  setLook(yaw, pitch) {
    this.lookYaw = wrapAngle(yaw);
    this.lookPitch = bounded(pitch, this.minPitch, this.maxPitch);
    this.constrainTraverse();
  }
  canTraverseTo(bearing) {
    const delta = wrapAngle(bearing - this.angle);
    return delta >= this.minYaw && delta <= this.maxYaw;
  }
  constrainTraverse() {
    if (this.minYaw === -Math.PI && this.maxYaw === Math.PI) return;
    // Limited mount: neither the mesh nor the stored input can wind up past its stops.
    const stop = (a) => wrapAngle(this.angle + bounded(wrapAngle(a - this.angle), this.minYaw, this.maxYaw));
    this.tAngle = stop(this.tAngle);
    this.lookYaw = stop(this.lookYaw);
  }
  slewSight(yawStep = 0.053, pitchStep = 0.026) {
    this.tAngle = wrapAngle(this.tAngle + bounded(wrapAngle(this.lookYaw - this.tAngle), -yawStep, yawStep));
    this.aimPitch += bounded(this.lookPitch - this.aimPitch, -pitchStep, pitchStep);
    this.constrainTraverse();
  }
  // Convert a picked world point into a bearing for the actual model pivots
  // (especially the offset gun on the M3 Lee).
  lookAtPoint(x, y, h) {
    const { pivot, gunPivot, muzzle } = this.modelAsset,
      s = this.modelScale;
    const local = bodyLocal(bodyAxes(this), x - this.x, y - this.y, h - this.rideHeight);
    const dx = local.z - pivot[2] * s,
      dy = -local.x + pivot[0] * s,
      side = (gunPivot[0] + muzzle[0]) * s;
    const yaw = Math.atan2(dy, dx) + Math.asin(bounded(side / Math.max(1, Math.hypot(dx, dy)), -1, 1));
    const forward = Math.max(1, dx * Math.cos(yaw) + dy * Math.sin(yaw) - gunPivot[2] * s),
      dh = local.h - (this.modelAsset.groundY + pivot[1] + gunPivot[1]) * s;
    let pitch =
      Math.atan2(dh, forward) - Math.asin(bounded((muzzle[1] * s) / Math.hypot(forward, dh), -1, 1));
    const origin = this.modelAsset.suspension;
    if (origin && (this.stance === 'hull' || pitch < 0)) {
      const forward = local.z - origin[2] * s,
        up = local.h - (this.modelAsset.groundY + origin[1]) * s;
      const offset = (pivot[1] + gunPivot[1] + muzzle[1] - origin[1]) * s;
      pitch =
        Math.atan2(up, forward) -
        Math.asin(bounded(offset / Math.max(0.001, Math.hypot(forward, up)), -1, 1));
    }
    this.setLook(this.angle + yaw, pitch);
    return wrapAngle(this.angle + yaw); // bearing before any mount stop; a fixed gun turns with the hull
  }
  barrelRay(tip) {
    const flat = Math.cos(this.aimPitch),
      yaw = this.tAngle - this.angle;
    const d = bodyVector(this, -Math.sin(yaw) * flat, Math.sin(this.aimPitch), Math.cos(yaw) * flat);
    return { ...this.muzzle(tip), dx: d.x, dy: d.y, dh: d.h };
  }
  sightHit(range = BATTLE_RANGE, includeAllies = false, visibleOnly = false, tip) {
    const r = this.barrelRay(tip);
    return traceBattleRay(r.x, r.y, r.h, r.dx, r.dy, r.dh, range, this, false, includeAllies, visibleOnly);
  }

  // Same hull → turret → gun transforms as the renderer, in simulation coordinates (x,y,height).
  gunPoint(atMuzzle, muzzle = this.modelAsset.muzzle) {
    const { pivot, gunPivot, groundY } = this.modelAsset,
      s = this.modelScale;
    const yaw = this.tAngle - this.angle,
      c = Math.cos(yaw),
      sn = Math.sin(yaw),
      tilt = this.suspensionPitch,
      p = this.aimPitch - tilt;
    const side = gunPivot[0] + (atMuzzle ? muzzle[0] : 0),
      forward = gunPivot[2] + (atMuzzle ? muzzle[2] * Math.cos(p) - muzzle[1] * Math.sin(p) : 0);
    let up = pivot[1] + gunPivot[1] + (atMuzzle ? muzzle[1] * Math.cos(p) + muzzle[2] * Math.sin(p) : 0);
    let z = pivot[2] + sn * side + c * forward;
    if (tilt) {
      const [, hy, hz] = this.modelAsset.suspension,
        y0 = up - hy,
        z0 = z - hz,
        ct = Math.cos(tilt),
        st = Math.sin(tilt);
      up = hy + ct * y0 + st * z0;
      z = hz + ct * z0 - st * y0;
    }
    return bodyPoint(this, (pivot[0] + c * side - sn * forward) * s, (groundY + up) * s, z * s);
  }
  muzzle(tip) {
    return this.gunPoint(true, tip);
  }
}

function canSee(obs, tgt) {
  if (tgt.dead || obs.dead || obs === tgt) return false;
  var d = Math.hypot(obs.x - tgt.x, obs.y - tgt.y);
  var er = (obs.vr || 350) * (1 - (tgt.camo || 0.2) * 0.7);
  if (tgt.isMoving) er *= 1.3;
  if (tgt.justFired) er *= 1.5;
  if (d > er) return false;
  return clearBattleSight(obs, tgt);
}

function clearBattleSight(obs, tgt) {
  const eye = obs.gunPivotWorld(),
    dx = tgt.x - eye.x,
    dy = tgt.y - eye.y,
    d = Math.hypot(dx, dy);
  if (d < 1) return true;
  for (const cloud of CombatMechanics.smokeClouds) {
    const k = Math.max(0, Math.min(1, ((cloud.x - eye.x) * dx + (cloud.y - eye.y) * dy) / (d * d)));
    if (Math.hypot(eye.x + k * dx - cloud.x, eye.y + k * dy - cloud.y) < cloud.radius) return false;
  }
  const h = eye.h,
    dz = tgt.aimHeight - h,
    length = Math.hypot(d, dz);
  return !traceBattleRay(eye.x, eye.y, h, dx / length, dy / length, dz / length, length, obs, true).hit;
}

function teamSees(tgt, team) {
  for (var i = 0; i < GameState.units.length; i++) {
    var u = GameState.units[i];
    if (u.dead) continue;
    var st = team === 'enemy' ? u.team === 'enemy' : u.team !== 'enemy';
    if (st && canSee(u, tgt)) return true;
  }
  return false;
}

console.log('✅ tank.js загружен');
