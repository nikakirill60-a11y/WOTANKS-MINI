// js/tank.js
// ========== КЛАСС ТАНКА ==========

class Tank {
  constructor(id, x, y, team, allBonuses) {
    var d = DB[id];
    this.id = id;
    this.name = d.n;
    this.team = team;
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
    this.s = d.s;
    this.tier = d.tier;
    this.vr = Math.floor((d.vr || 350) * vrMul * (1 + (mb.vr || 0)));
    this.camo = (d.camo || 0.2) * (1 + (mb.camo || 0));
    this.armor = Math.floor((d.armor || 0) * (1 + (mb.armor || 0)));

    this.turretArmor = Math.floor(d.turretArmor * (1 + (mb.armor || 0)));
    this.pen = d.pen;

    // ✅ Критические повреждения модулей (см. armor-system.js)
    this.critTimers = { engine: 0, ammo: 0, gun: 0 };
    this.angle = 0;
    // World-space gun bearing; a limited mount is constrained relative to the hull.
    this.tAngle = this.lookYaw = this.lookPitch = 0;
    this.yawArc = d.yawArc ? (d.yawArc * Math.PI) / 180 : Math.PI;
    this.minPitch = d.minPitch == null ? -0.48 : (d.minPitch * Math.PI) / 180;
    this.maxPitch = d.maxPitch == null ? 0.58 : (d.maxPitch * Math.PI) / 180;
    this.lastShot = 0;
    this.dead = false;
    this.magSize = d.mag || 1;
    this.usesMagazine = this.magSize > 1;
    this.curMag = this.magSize;
    this.isReloading = false;
    this.reloadTime = Math.floor((d.reload || 2500) * reloadMul * (1 + (mb.reload || 0)));
    // km/h → metres/s → world units per 60-Hz simulation step.
    this.baseSpeed = (((d.speed / 3.6) * BATTLE_UNITS_PER_METRE) / 60) * speedMul * (1 + (mb.speed || 0));
    this.vx = this.vy = this.yawRate = this.speedKmh = 0;
    this.driveBlocked = this.isMoving = false;
    this.currentTerrain = 'normal';
    this.justFired = false;
    this.fireTimer = 0;
    this.trackBroken = false;
    this.visible = true;
    this.engineTick = 0;
    this.shotDelay = this.usesMagazine ? 120 : 0; // arcade spacing inside a clip, never the full reload

    this.aimPitch = 0;
    this.modelScale = BATTLE_UNITS_PER_METRE;
    this.shellSpeedMul = 1 + (mb.shell_speed || 0);
    this.onFire = false;
    this.fireDmgTimer = 0;
    this.nextShot = 0;
  }

  updateReload(now) {
    if (this.isReloading && now >= this.nextShot) {
      this.curMag = this.magSize;
      this.isReloading = false;
    }
  }

  fire(shellType = 0) {
    const now = performance.now();
    this.updateReload(now);
    if (this.dead || this.isReloading || now < this.nextShot || !this.modelAsset) return false;
    if (this.usesMagazine) shellType = 0; // One clip type, including for AI and touch input.
    const sh = CONFIG.SHELLS[shellType],
      ray = this.barrelRay();
    const speed = 14 * sh.sMul * this.shellSpeedMul;
    const damage = this.dmg * sh.dMul * getCritMultiplier(this, 'dmg');
    GameState.bullets.push({
      ...ray,
      a: this.tAngle,
      team: this.team,
      shooter: this,
      speed,
      traveled: 0,
      color: sh.color,
      dmg: damage * (this === GameState.player && GameState.paiokActive ? 1.05 : 1),
      pen: this.pen * sh.penMul,
      st: shellType
    });
    this.lastShot = Date.now();
    this.justFired = true;
    this.fireTimer = this.lastShot + 3000;
    this.curMag--;
    const multiplier =
      (this === GameState.player && GameState.adrenalineActive ? 0.5 : 1) * getCritMultiplier(this, 'reload');
    this.nextShot = now + (this.curMag ? this.shotDelay : this.reloadTime * multiplier);
    this.isReloading = !this.curMag;
    spawnParticles(ray.x, ray.y, '#ffb24c', 5, 1.2, 8, ray.h);
    spawnShellCasing(this);
    snd(this.usesMagazine ? 'rapidfire' : 'shot');
    return true;
  }

  get aimHeight() {
    return this.modelAsset.aimHeight * this.modelScale;
  }
  get gunHeight() {
    return (
      (this.modelAsset.groundY + this.modelAsset.pivot[1] + this.modelAsset.gunPivot[1]) * this.modelScale
    );
  }

  setLook(yaw, pitch) {
    this.lookYaw = wrapAngle(yaw);
    this.lookPitch = bounded(pitch, this.minPitch, this.maxPitch);
    this.constrainTraverse();
  }
  constrainTraverse() {
    if (this.yawArc === Math.PI) return;
    // Limited mount: neither the mesh nor the stored input can wind up past its stops.
    const stop = (a) => wrapAngle(this.angle + bounded(wrapAngle(a - this.angle), -this.yawArc, this.yawArc));
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
    const cs = Math.cos(this.angle),
      sn = Math.sin(this.angle);
    const dx = x - this.x - s * (pivot[2] * cs + pivot[0] * sn),
      dy = y - this.y - s * (pivot[2] * sn - pivot[0] * cs);
    const side = (gunPivot[0] + muzzle[0]) * s;
    const yaw = Math.atan2(dy, dx) + Math.asin(bounded(side / Math.max(1, Math.hypot(dx, dy)), -1, 1));
    const forward = Math.max(1, dx * Math.cos(yaw) + dy * Math.sin(yaw) - gunPivot[2] * s),
      dh = h - this.gunHeight;
    this.setLook(
      yaw,
      Math.atan2(dh, forward) - Math.asin(bounded((muzzle[1] * s) / Math.hypot(forward, dh), -1, 1))
    );
  }
  barrelRay() {
    const flat = Math.cos(this.aimPitch);
    return {
      ...this.muzzle(),
      dx: Math.cos(this.tAngle) * flat,
      dy: Math.sin(this.tAngle) * flat,
      dh: Math.sin(this.aimPitch)
    };
  }
  sightHit(range = BATTLE_RANGE, includeAllies = false) {
    const r = this.barrelRay();
    return traceBattleRay(r.x, r.y, r.h, r.dx, r.dy, r.dh, range, this, false, includeAllies);
  }

  // Same hull → turret → gun transforms as the renderer, in simulation coordinates (x,y,height).
  muzzle() {
    const { pivot, gunPivot, muzzle } = this.modelAsset,
      s = this.modelScale;
    const side = gunPivot[0] + muzzle[0];
    const forward = gunPivot[2] + muzzle[2] * Math.cos(this.aimPitch) - muzzle[1] * Math.sin(this.aimPitch);
    return {
      x:
        this.x +
        s *
          (pivot[2] * Math.cos(this.angle) +
            pivot[0] * Math.sin(this.angle) +
            forward * Math.cos(this.tAngle) +
            side * Math.sin(this.tAngle)),
      y:
        this.y +
        s *
          (pivot[2] * Math.sin(this.angle) -
            pivot[0] * Math.cos(this.angle) +
            forward * Math.sin(this.tAngle) -
            side * Math.cos(this.tAngle)),
      h:
        s *
        (this.modelAsset.groundY +
          pivot[1] +
          gunPivot[1] +
          muzzle[1] * Math.cos(this.aimPitch) +
          muzzle[2] * Math.sin(this.aimPitch))
    };
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
  const dx = tgt.x - obs.x,
    dy = tgt.y - obs.y,
    d = Math.hypot(dx, dy);
  if (d < 1) return true;
  for (const cloud of CombatMechanics.smokeClouds) {
    const k = Math.max(0, Math.min(1, ((cloud.x - obs.x) * dx + (cloud.y - obs.y) * dy) / (d * d)));
    if (Math.hypot(obs.x + k * dx - cloud.x, obs.y + k * dy - cloud.y) < cloud.radius) return false;
  }
  const h = obs.gunHeight,
    dz = tgt.aimHeight - h,
    length = Math.hypot(d, dz);
  return !traceBattleRay(
    obs.x,
    obs.y,
    h,
    (tgt.x - obs.x) / length,
    (tgt.y - obs.y) / length,
    dz / length,
    length,
    obs,
    true
  ).hit;
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

// ========== ПРОВЕРКА СТОЛКНОВЕНИЙ ==========
function tankCollides(x, y, size, self) {
  const bounds = GameState.arena.bounds;
  if (Math.abs(x) + size > bounds.x || Math.abs(y) + size > bounds.y) return true;
  for (const u of GameState.units) {
    if (u !== self && !u.dead && (x - u.x) ** 2 + (y - u.y) ** 2 < ((u.s * 25 + size) * 0.78) ** 2)
      return true;
  }
  for (const w of GameState.walls) {
    if (!w.solid) continue;
    const dx = Math.max(w.x - x, 0, x - w.x - w.w),
      dy = Math.max(w.y - y, 0, y - w.y - w.h);
    if (dx * dx + dy * dy < (size + 3) ** 2) return true;
  }
  return false;
}

console.log('✅ tank.js загружен');
