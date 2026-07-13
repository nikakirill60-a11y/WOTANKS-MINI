// js/tank.js
// ========== КЛАСС ТАНКА И МЕХАНИКА УРОНА ==========

// Векторная функция расчета дифференцированного бронирования и углов встречи (Вне класса Tank!)
function calculateDamage(shooter, target, baseDmg, bulletAngle) {
    let hitAngle = Math.abs(bulletAngle - target.angle) % (Math.PI * 2);
    if (hitAngle > Math.PI) hitAngle = Math.PI * 2 - hitAngle;

    let zone = "side";
    let effectiveArmor = target.armor || 0;

    // Распределяем броню по зонам (лоб, борта, корма)
    if (hitAngle < Math.PI / 4 || hitAngle > Math.PI * 1.75) {
        zone = "front";
        effectiveArmor = (target.armor || 0) * 1.3; // Лоб на 30% прочнее
    } else if (hitAngle > Math.PI * 0.75 && hitAngle < Math.PI * 1.25) {
        zone = "rear";
        effectiveArmor = (target.armor || 0) * 0.5; // Корма в 2 раза слабее
    } else {
        zone = "side";
        effectiveArmor = (target.armor || 0) * 0.85;
    }

    // Приведение брони на основе угла попадания (наклон увеличивает приведенную толщину)
    let impactCos = Math.abs(Math.cos(bulletAngle - target.angle));
    let angleMultiplier = 1 / (impactCos + 0.1);

    let realArmor = effectiveArmor * angleMultiplier;
    let finalDmg = baseDmg - (realArmor * 0.15);
    
    return {
        dmg: Math.max(10, Math.floor(finalDmg)),
        zone: zone,
        armorPenetrated: baseDmg > (realArmor * 0.7)
    };
}

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
    this.dmg = Math.floor(d.dmg * dmgMul * (1 + (mb.dmg || 0)));
    this.s = d.s;
    this.tier = d.tier;
    this.isPT = d.isPT || false;
    this.isLong = d.isLong || false;
    this.off = d.off || 0;
    this.cls = d.cls || 'mt';
    this.nc = d.nc || '#666';
    this.vr = Math.floor((d.vr || 350) * vrMul * (1 + (mb.vr || 0)));
    this.camo = (d.camo || .2) * (1 + (mb.camo || 0));
    this.armor = Math.floor((d.armor || 0) * (1 + (mb.armor || 0)));
    
    this.angle = 0;
    this.tAngle = 0;
    this.lastShot = 0;
    this.dead = false;
    this.magSize = d.mag || 1;
    this.curMag = this.magSize;
    this.isReloading = false;
    this.reloadTime = Math.floor((d.reload || 2500) * reloadMul * (1 + (mb.reload || 0)));
    this.baseSpeed = (d.moveSpeed || 2.5) * speedMul * (1 + (mb.speed || 0));
    this.isMoving = false;
    this.justFired = false;
    this.fireTimer = 0;
    this.trackBroken = false;
    this.visible = true;
    this.engineTick = 0;
    this.premium = d.premium || false;
    this.collection = d.collection || false;
    this.shotDelay = d.shotDelay || (this.magSize >= 20 ? 80 : 200);
    
    this.flame = d.flame || false;
    this.flameRange = d.flameRange || 0;
    this.flameCone = d.flameCone || .4;
    this.flameDPS = d.flameDPS || 0;
    this.flameActive = false;
    this.flameTick = 0;
    
    this.missile = d.missile || false;
    this.titan = d.titan || false;
    this.shellSpeedMul = 1 + (mb.shell_speed || 0);
    
    this.stuckTimer = 0;
    this.lastPos = { x: x, y: y };
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;
    this.onFire = false;
    this.fireDmgTimer = 0;
    
    // Двухстволка
    this.dualGun = d.dualGun || false;
    this.dualDelay = d.dualDelay || 400;
    this.dualReady = [true, true];
    this.dualNext = 0;
    this.dualCooldowns = [0, 0];
    this.dualBothMode = true;

    // Здоровье модулей танка
    this.modulesHP = {
        engine: 100,
        ammoRack: 100,
        crew: 100
    };
    this.driftFactor = 1.0;
  }

  draw(ctx) {
    var cam = GameState.cam;
    
    if (this.team === 'enemy' && !this.dead) {
      this.visible = teamSees(this, 'player');
      if (!this.visible) return;
    }
    
    ctx.save();
    ctx.translate(this.x - cam.x, this.y - cam.y);
    
    // ПСЕВДО-3D ТЕНЬ ТАНКА (Отрисовывается под гусеницами)
    if (!this.dead) {
        ctx.save();
        ctx.rotate(this.angle);
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        let shadowOffset = 4 * this.s;
        let bWShadow = this.isLong ? 80 : (this.dualGun ? 70 : 44);
        ctx.fillRect((-bWShadow / 2 * this.s) + shadowOffset, (-14 * this.s) + shadowOffset, bWShadow * this.s, 28 * this.s);
        ctx.restore();
    }

    if (!this.dead) {
      ctx.fillStyle = "#441111";
      ctx.fillRect(-30, -45, 60, 6);
      ctx.fillStyle = this.team === 'enemy' ? "#e74c3c" : "#2ecc71";
      ctx.fillRect(-30, -45, 60 * (this.hp / this.maxHp), 6);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(-30, -45, 60, 6);
      
      ctx.fillStyle = this.premium ? "#f1c40f" : "#fff";
      ctx.font = "bold 9px Arial";
      ctx.textAlign = "center";
      var fi = this.flame ? '🔥 ' : (this.missile ? '🚀 ' : (this.titan ? '⚙️ ' : (this.dualGun ? '👑 ' : '')));
      var pi = this.premium && !this.flame && !this.missile && !this.titan && !this.dualGun ? '★ ' : '';
      ctx.fillText(fi + pi + this.name + ' [' + CONFIG.TIER_ROMAN[this.tier] + ']', 0, -50);
      
      if (this.trackBroken) {
        ctx.fillStyle = "#ff0";
        ctx.fillText("⚠", 0, -60);
      }
      if (this.onFire) {
        ctx.fillStyle = "#ff4500";
        ctx.fillText("🔥", 15, -60);
      }
      
      if (this.dualGun && this === GameState.player) {
        var g1 = this.dualReady[0] ? '#2ecc71' : '#e74c3c';
        var g2 = this.dualReady[1] ? '#2ecc71' : '#e74c3c';
        ctx.fillStyle = g1;
        ctx.fillRect(-12, -38, 10, 4);
        ctx.fillStyle = g2;
        ctx.fillRect(2, -38, 10, 4);
      }
    }
    
    // ОТРИСОВКА КОРПУСА С НАКЛОНОМ
    ctx.save();
    ctx.rotate(this.angle);

    if (this.isMoving && !this.dead) {
        let tilt = Math.sin(Date.now() * 0.015) * 0.03 * this.s;
        ctx.rotate(tilt);
    }

    var bc = this.dead ? '#333' : 
             this.team === 'player' ? (this.flame ? '#cc3300' : this.missile ? '#005580' : this.titan ? '#2a5a7a' : this.dualGun ? '#5a5a5a' : this.premium ? '#ff6600' : '#27ae60') : 
             this.team === 'ally' ? (this.nc || '#2980b9') : '#c0392b';
    
    ctx.fillStyle = bc;
    var bW = this.isLong ? 80 : 44;
    if (this.dualGun) { bW = 70; }
    ctx.fillRect(-bW / 2 * this.s, -14 * this.s, bW * this.s, 28 * this.s);
    ctx.fillStyle = "#111";
    ctx.fillRect(-bW / 2 * this.s - 2, -16 * this.s, (bW + 4) * this.s, 6 * this.s);
    ctx.fillRect(-bW / 2 * this.s - 2, 10 * this.s, (bW + 4) * this.s, 6 * this.s);
    ctx.restore();
    
    if (!this.dead) {
      ctx.save();
      ctx.translate(Math.cos(this.angle) * this.off * this.s, Math.sin(this.angle) * this.off * this.s);
      ctx.rotate(this.isPT ? this.angle : this.tAngle);
      
      var tc2 = this.team === 'player' ? (this.flame ? '#ff4500' : this.missile ? '#00ccff' : this.titan ? '#4a8fb5' : this.dualGun ? '#6a6a6a' : this.premium ? '#ff8800' : '#2ecc71') : 
                this.team === 'ally' ? (this.nc || '#3498db') : '#e74c3c';
      
      ctx.fillStyle = tc2;
      var turretSize = this.dualGun ? 14 : 10;
      ctx.fillRect(-turretSize * this.s, -turretSize * this.s, turretSize * 2 * this.s, turretSize * 2 * this.s);
      
      if (this.flame) {
        ctx.fillStyle = "#333";
        ctx.fillRect(5 * this.s, -5 * this.s, 25 * this.s, 10 * this.s);
        ctx.fillStyle = "#ff4500";
        ctx.fillRect(28 * this.s, -4 * this.s, 6 * this.s, 8 * this.s);
      } else if (this.dualGun) {
        var gunLen = 40 * this.s;
        var gunW = 3 * this.s;
        var spacing = 5 * this.s;
        ctx.fillStyle = this.dualReady[0] ? "#333" : "#555";
        ctx.fillRect(5 * this.s, -spacing - gunW, gunLen, gunW * 2);
        ctx.fillStyle = this.dualReady[1] ? "#333" : "#555";
        ctx.fillRect(5 * this.s, spacing - gunW, gunLen, gunW * 2);
        ctx.fillStyle = "#222";
        ctx.fillRect(2 * this.s, -spacing - gunW - 2, 6 * this.s, (spacing + gunW) * 2 + 4);
      } else {
        ctx.fillStyle = "#111";
        ctx.fillRect(5 * this.s, -3 * this.s, 35 * this.s, 6 * this.s);
      }
      
      if (this.flame && this.flameActive && !this.dead) {
        this.drawFlame(ctx);
      }
      
      ctx.restore();
    }
    ctx.restore();
  }

  drawFlame(ctx) {
    var rng = this.flameRange, cone = this.flameCone, time = Date.now() * 0.01;
    
    for (var i = 0; i < 12; i++) {
      var dist = 30 + Math.random() * rng * 0.9;
      var spread = (Math.random() - 0.5) * cone * dist * 0.8;
      var sz = 4 + Math.random() * 8 * (1 - dist / rng * 0.5);
      var alpha = 0.6 * (1 - dist / rng);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgb(255,' + Math.floor(200 * (1 - dist / rng)) + ',0)';
      ctx.beginPath();
      ctx.arc(dist, spread + Math.sin(time + i) * 3, sz, 0, Math.PI * 2);
      ctx.fill();
    }
    
    for (var i = 0; i < 4; i++) {
      var dist = rng * 0.5 + Math.random() * rng * 0.6;
      var spread = (Math.random() - 0.5) * cone * dist;
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.arc(dist, spread + Math.sin(time * 0.5 + i * 2) * 5, 6 + Math.random() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    
    for (var i = 0; i < 5; i++) {
      var dist = 20 + Math.random() * rng;
      var spread = (Math.random() - 0.5) * cone * dist;
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(dist, spread, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
  }

  fire(shellType) {
    if (this.dead) return false;
    if (this.flame) return this.fireFlame();
    if (this.dualGun) return this.fireDual(shellType);
    
    if (this.isReloading || Date.now() - this.lastShot < this.shotDelay) return false;
    
    shellType = shellType || 0;
    var sh = CONFIG.SHELLS[shellType];
    var fa = this.isPT ? this.angle : this.tAngle;
    var tx = this.x + Math.cos(this.angle) * this.off * this.s;
    var ty = this.y + Math.sin(this.angle) * this.off * this.s;
    var finalDmg = this.dmg * sh.dMul;
    
    if (this.team === 'player' && GameState.paiokActive) {
      finalDmg *= 1.05;
    }
    
    var b = {
      x: tx,
      y: ty,
      a: fa,
      team: this.team,
      dmg: finalDmg,
      speed: 12 * sh.sMul * this.shellSpeedMul,
      color: this.missile ? '#00ffff' : sh.color,
      st: shellType,
      shooter: this
    };
    
    if (this.missile) {
      b.guided = true;
      b.speed = 8;
      b.dmg = this.dmg;
    }
    
    GameState.bullets.push(b);
    this.lastShot = Date.now();
    this.justFired = true;
    this.fireTimer = Date.now() + 3000;
    this.curMag--;
    
    if (this.magSize >= 20) {
      snd('rapidfire');
    } else if (this.dmg >= 400) {
      snd('bigshot');
    } else {
      snd('shot');
    }
    
    spawnParticles(tx + Math.cos(fa) * 35 * this.s, ty + Math.sin(fa) * 35 * this.s, this.missile ? '#00ccff' : '#ff8800', this.magSize >= 20 ? 2 : 5, 3, 10);
    
    if (this === GameState.player && this.dmg >= 300) {
      GameState.shakeTimer = 10;
      GameState.shakeIntensity = Math.min(this.dmg / 100, 8);
    }
    
    if (this.curMag <= 0) {
      this.isReloading = true;
      var self = this;
      var mul = (this === GameState.player && GameState.adrenalineActive) ? 0.5 : 1;
      setTimeout(function() {
        self.curMag = self.magSize;
        self.isReloading = false;
      }, this.reloadTime * mul);
    }
    
    if (this === GameState.player && GameState.multiplayerMode && GameState.currentRoomId) {
      sendShot(tx, ty, fa, shellType);
    }
    
    return true;
  }

  fireDual(shellType) {
    var now = Date.now();
    
    for (var i = 0; i < 2; i++) {
      if (!this.dualReady[i] && now >= this.dualCooldowns[i]) {
        this.dualReady[i] = true;
      }
    }
    
    if (!this.dualReady[0] && !this.dualReady[1]) return false;
    if (now - this.lastShot < 300) return false;
    
    shellType = shellType || 0;
    var sh = CONFIG.SHELLS[shellType];
    var fa = this.isPT ? this.angle : this.tAngle;
    var spacing = 5 * this.s;
    
    var gunIndex = -1;
    if (this.dualReady[0] && this.dualReady[1]) {
      gunIndex = this.dualNext;
      this.dualNext = 1 - this.dualNext;
    } else if (this.dualReady[0]) {
      gunIndex = 0;
    } else if (this.dualReady[1]) {
      gunIndex = 1;
    }
    
    if (gunIndex === -1) return false;
    
    var gunOffset = gunIndex === 0 ? -spacing : spacing;
    var cosA = Math.cos(fa);
    var sinA = Math.sin(fa);
    var perpX = -sinA * gunOffset;
    var perpY = cosA * gunOffset;
    var tx = this.x + Math.cos(this.angle) * this.off * this.s + perpX;
    var ty = this.y + Math.sin(this.angle) * this.off * this.s + perpY;
    
    var finalDmg = this.dmg * sh.dMul;
    if (this.team === 'player' && GameState.paiokActive) {
      finalDmg *= 1.05;
    }
    
    var b = {
      x: tx,
      y: ty,
      a: fa,
      team: this.team,
      dmg: finalDmg,
      speed: 12 * sh.sMul * this.shellSpeedMul,
      color: sh.color,
      st: shellType,
      shooter: this
    };
    
    GameState.bullets.push(b);
    snd('bigshot');
    spawnParticles(tx + cosA * 40 * this.s, ty + sinA * 40 * this.s, '#ff8800', 6, 4, 12);
    
    if (this === GameState.player) {
      GameState.shakeTimer = 12;
      GameState.shakeIntensity = 8;
    }
    
    this.dualReady[gunIndex] = false;
    var mul = (this === GameState.player && GameState.adrenalineActive) ? 0.5 : 1;
    this.dualCooldowns[gunIndex] = now + this.reloadTime * mul;
    this.lastShot = now;
    this.justFired = true;
    this.fireTimer = now + 3000;
    
    if (this === GameState.player && GameState.multiplayerMode && GameState.currentRoomId) {
      sendShot(tx, ty, fa, shellType);
    }
    
    return true;
  }

  fireFlame() {
    if (this.curMag <= 0) return false;
    
    this.flameActive = true;
    this.lastShot = Date.now();
    this.justFired = true;
    this.fireTimer = Date.now() + 3000;
    this.curMag--;
    snd('flame');
    
    var fa = this.isPT ? this.angle : this.tAngle;
    var ox = this.x + Math.cos(this.angle) * this.off * this.s;
    var oy = this.y + Math.sin(this.angle) * this.off * this.s;
    var self = this;
    
    GameState.units.forEach(function(u) {
      if (u.dead) return;
      var fr = (self.team === u.team) || (self.team === 'player' && u.team === 'ally') || (self.team === 'ally' && u.team === 'player');
      if (fr) return;
      
      var dx = u.x - ox, dy = u.y - oy, dist = Math.hypot(dx, dy);
      if (dist > self.flameRange) return;
      
      var at = Math.atan2(dy, dx);
      var ad = at - fa;
      while (ad > Math.PI) ad -= Math.PI * 2;
      while (ad < -Math.PI) ad += Math.PI * 2;
      if (Math.abs(ad) > self.flameCone) return;
      
      var dmg = self.flameDPS * (1 - dist / self.flameRange * 0.5);
      u.hp -= dmg;
      
      if (!u.trackBroken && Math.random() < 0.03) {
        u.trackBroken = true;
        if (u === GameState.player) crewMsg("Гусеница горит!", "#ff4500");
      }
      
      if (!u.onFire && Math.random() < 0.05) {
        u.onFire = true;
      }
      
      if (self.team === 'player') {
        GameState.battleDmg += dmg;
        if (self.flameTick % 10 === 0) dmgLog('🔥-' + Math.floor(dmg), '#ff4500');
      }
      
      if (u === GameState.player) {
        if (self.flameTick % 10 === 0) dmgLog('🔥-' + Math.floor(dmg), '#ff0000');
        GameState.shakeTimer = 2;
        GameState.shakeIntensity = 1;
      }
      
      if (self.flameTick % 5 === 0) {
        spawnParticles(u.x, u.y, '#ff4500', 2, 2, 15);
      }
      
      if (u.hp <= 0) {
        u.dead = true;
        boom(u.x, u.y);
        snd('boom');
        if (self.team === 'player') {
          GameState.XP += u.tier * 500;
          GameState.battleKills++;
          crewMsg("🔥 Сгорел!", "#ff4500");
        }
        updateScoreboard();
      }
    });
    
    this.flameTick++;
    
    if (this.flameTick % 3 === 0) {
      var fx = ox + Math.cos(fa) * 30 * this.s;
      var fy = oy + Math.sin(fa) * 30 * this.s;
      spawnParticles(fx, fy, '#ff6600', 3, 4, 12);
    }
    
    if (this.curMag <= 0) {
      this.flameActive = false;
      this.isReloading = true;
      var self2 = this;
      var mul = (this === GameState.player && GameState.adrenalineActive) ? 0.5 : 1;
      setTimeout(function() {
        self2.curMag = self2.magSize;
        self2.isReloading = false;
        self2.flameTick = 0;
      }, this.reloadTime * mul);
    }
    
    return true;
  }
}

function canSee(obs, tgt) {
  if (obs === tgt || tgt.dead) return true;
  var d = Math.hypot(obs.x - tgt.x, obs.y - tgt.y);
  var er = (obs.vr || 350) * (1 - (tgt.camo || 0.2) * 0.7);
  if (tgt.isMoving) er *= 1.3;
  if (tgt.justFired) er *= 1.5;
  return d <= er;
}

function teamSees(tgt, team) {
  for (var i = 0; i < GameState.units.length; i++) {
    var u = GameState.units[i];
    if (u.dead) continue;
    var st = (team === 'enemy') ? (u.team === 'enemy') : (u.team !== 'enemy');
    if (st && canSee(u, tgt)) return true;
  }
  return false;
}

function checkRicochet(shooter, target, st) {
  if (!CONFIG.SHELLS[st].rico) return false;
  var arm = target.armor || 0;
  if (arm <= 0) return false;
  var ha = Math.atan2(target.y - shooter.y, target.x - shooter.x);
  var ad = Math.abs(ha - target.angle);
  while (ad > Math.PI) ad = Math.abs(ad - Math.PI * 2);
  return Math.random() < Math.abs(Math.cos(ad)) * (arm / 400) * (st === 2 ? 0.5 : 1);
}

function tankCollides(x, y, angle, size) {
  var pts = [
    { dx: 0, dy: 0 },
    { dx: size, dy: 0 },
    { dx: -size * 0.8, dy: 0 },
    { dx: size * 0.6, dy: size * 0.5 },
    { dx: size * 0.6, dy: -size * 0.5 },
    { dx: -size * 0.6, dy: size * 0.5 },
    { dx: -size * 0.6, dy: -size * 0.5 }
  ];
  
  for (var pi = 0; pi < pts.length; pi++) {
    var p = pts[pi];
    var rx = x + p.dx * Math.cos(angle) - p.dy * Math.sin(angle);
    var ry = y + p.dx * Math.sin(angle) + p.dy * Math.cos(angle);
    
    for (var wi = 0; wi < GameState.walls.length; wi++) {
      var w = GameState.walls[wi];
      if (w.type === 'bush' || w.type === 'dune') continue;
      if (rx > w.x - 5 && rx < w.x + w.w + 5 && ry > w.y - 5 && ry < w.y + w.h + 5) {
        return true;
      }
    }
  }
  return false;
}

console.log('✅ tank.js загружен');