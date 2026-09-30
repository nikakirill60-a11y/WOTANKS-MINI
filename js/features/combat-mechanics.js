// js/features/combat-mechanics.js
// 🎯 Продвинутые боевые механики: Типы снарядов (AP/APCR/HEAT/HE), Криты модулей, Снаряжение (Ремка/Аптечка/Дым/Арта), Лампочка, Таран, Бочки
console.log('💥 combat-mechanics.js загружается...');

const SHELL_TYPES = {
  AP: { name: 'ББ (Бронебойный)', penMul: 1.0, dmgMul: 1.0, speedMul: 1.0, icon: '🪨', color: '#ffcc00', splash: 0 },
  APCR: { name: 'БП (Подкалиберный)', penMul: 1.35, dmgMul: 0.95, speedMul: 1.45, icon: '⚡', color: '#00ffff', splash: 0 },
  HEAT: { name: 'КС (Кумулятивный)', penMul: 1.50, dmgMul: 0.90, speedMul: 0.9, icon: '🔥', color: '#ff6600', splash: 0 },
  HE: { name: 'ОФ (Осколочно-фугасный)', penMul: 0.45, dmgMul: 1.40, speedMul: 0.85, icon: '💥', color: '#ff2200', splash: 65 }
};

const CombatMechanics = {
  currentShell: 'AP',
  smokeClouds: [],
  artilleryStrikes: [],
  fuelBarrels: [],
  sixthSenseTimer: null,
  isSpotted: false,

  // 16. ПЕРЕКЛЮЧЕНИЕ ТИПОВ СНАРЯДОВ
  setShellType(type) {
    if (SHELL_TYPES[type]) {
      this.currentShell = type;
      if (typeof snd === 'function') snd('reload');
      const el = document.getElementById('cur-shell-badge');
      if (el) el.innerText = SHELL_TYPES[type].name;
      this.renderAmmoBar();
    }
  },

  renderAmmoBar() {
    const bar = document.getElementById('ammo-selector-bar');
    if (!bar) return;
    bar.innerHTML = Object.entries(SHELL_TYPES).map(([k, s]) => `
      <button class="shell-btn ${this.currentShell === k ? 'active' : ''}" onclick="CombatMechanics.setShellType('${k}')">
        <span class="shell-icon">${s.icon}</span>
        <span class="shell-name">${k}</span>
      </button>
    `).join('');
  },

  // 17 & 18. РИКОШЕТ И ПРИВЕДЕННАЯ БРОНЯ
  calculateArmorPenetration(shellType, nominalPen, rawArmor, angleDegrees) {
    const shell = SHELL_TYPES[shellType] || SHELL_TYPES.AP;
    let effectivePen = nominalPen * shell.penMul;
    
    // Нормализация (ББ +5°, БП +2°, КС/ОФ 0°)
    let normAngle = Math.abs(angleDegrees);
    if (shellType === 'AP') normAngle = Math.max(0, normAngle - 5);
    if (shellType === 'APCR') normAngle = Math.max(0, normAngle - 2);

    // Авторикошет при угле > 70° (кроме КС и ОФ)
    if (normAngle > 70 && shellType !== 'HEAT' && shellType !== 'HE') {
      return { penetrated: false, ricochet: true, effectiveArmor: 9999 };
    }

    const rad = (normAngle * Math.PI) / 180;
    const effectiveArmor = rawArmor / Math.cos(rad);
    const penetrated = effectivePen >= effectiveArmor;

    return { penetrated, ricochet: false, effectiveArmor: Math.round(effectiveArmor), effectivePen: Math.round(effectivePen) };
  },

  // 19. ПРИЦЕЛ-ИНДИКАТОР ПРОБИТИЯ (Светофор: Зеленый/Желтый/Красный)
  getPenetrationColor(targetTank, nominalPen) {
    if (!targetTank) return '#00ff00';
    const armor = targetTank.stats.armor || 100;
    const shell = SHELL_TYPES[this.currentShell] || SHELL_TYPES.AP;
    const pen = nominalPen * shell.penMul;
    const ratio = pen / armor;
    if (ratio >= 1.2) return '#00ff44'; // 100% пробитие (Зеленый)
    if (ratio >= 0.85) return '#ffea00'; // 50/50 шанс (Желтый)
    return '#ff1100'; // Не пробьет (Красный)
  },

  // 20. КРИТИЧЕСКИЕ ПОВРЕЖДЕНИЯ МОДУЛЕЙ И ЭКИПАЖА
  applyModuleCrit(target, shooter) {
    const roll = Math.random();
    const crits = [];
    if (roll < 0.15) {
      // Сбитие гусеницы
      target.trackBroken = true;
      target.trackRepairTimer = 5.0; // 5 сек на починку
      crits.push({ name: 'Гусеница сбита!', color: '#ff9900' });
      if (typeof snd === 'function') snd('crit');
    } else if (roll < 0.23) {
      // Поджог двигателя
      target.isOnFire = true;
      target.fireTimer = 4.0;
      crits.push({ name: 'Двигатель горит! 🔥', color: '#ff2200' });
      if (typeof snd === 'function') snd('explosion');
    } else if (roll < 0.28) {
      // Повреждение боеукладки (БК)
      target.ammoRackDamaged = true;
      crits.push({ name: 'Повреждение БК! 💥', color: '#ff0055' });
    }
    return crits;
  },

  // 21. ТАРАН (Физика столкновений)
  handleRamming(tankA, tankB) {
    const massA = tankA.stats.hp || 1000;
    const massB = tankB.stats.hp || 1000;
    const speedA = Math.hypot(tankA.vx || 0, tankA.vy || 0);
    const speedB = Math.hypot(tankB.vx || 0, tankB.vy || 0);
    const relSpeed = speedA + speedB;
    if (relSpeed < 1.5) return;

    const baseDmg = Math.round(relSpeed * 35);
    const dmgToB = Math.round(baseDmg * (massA / massB));
    const dmgToA = Math.round(baseDmg * (massB / massA));

    tankA.hp = Math.max(0, tankA.hp - dmgToA);
    tankB.hp = Math.max(0, tankB.hp - dmgToB);

    if (typeof spawnParticles === 'function') {
      spawnParticles((tankA.x + tankB.x) / 2, (tankA.y + tankB.y) / 2, '#ffaa00', 25, 4, 30);
    }
    if (typeof snd === 'function') snd('hit');
  },

  // 22. ВЗРЫВАЮЩИЕСЯ БОЧКИ С ТОПЛИВОМ НА КАРТЕ
  setupFuelBarrels(mapType) {
    this.fuelBarrels = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      this.fuelBarrels.push({
        x: -800 + Math.random() * 1600,
        y: -800 + Math.random() * 1600,
        hp: 50,
        maxHp: 50,
        radius: 18,
        color: '#d63031',
        isExploded: false
      });
    }
  },

  checkBarrelHit(bullet) {
    for (const b of this.fuelBarrels) {
      if (b.isExploded) continue;
      if (Math.hypot(b.x - bullet.x, b.y - bullet.y) < b.radius + 10) {
        b.hp -= bullet.dmg || 50;
        bullet.dead = true;
        if (b.hp <= 0) {
          this.explodeBarrel(b);
        }
        return true;
      }
    }
    return false;
  },

  explodeBarrel(barrel) {
    barrel.isExploded = true;
    if (typeof spawnParticles === 'function') {
      spawnParticles(barrel.x, barrel.y, '#ff4400', 45, 8, 40);
      spawnParticles(barrel.x, barrel.y, '#333333', 25, 5, 50);
    }
    if (typeof snd === 'function') snd('explosion');

    // AoE урон танкам вокруг
    if (GameState.units) {
      GameState.units.forEach(u => {
        const dist = Math.hypot(u.x - barrel.x, u.y - barrel.y);
        if (dist < 180) {
          const dmg = Math.round(450 * (1 - dist / 180));
          u.hp = Math.max(0, u.hp - dmg);
          if (typeof spawnDamageNumber === 'function') {
            spawnDamageNumber(u.x, u.y, dmg, '#ff3300');
          }
        }
      });
    }
  },

  // 23. ДЫМОВАЯ ЗАВЕСА (Smoke Screen)
  deploySmokeScreen(caster) {
    if (!caster) return;
    this.smokeClouds.push({
      x: caster.x,
      y: caster.y,
      radius: 160,
      duration: 12.0, // 12 секунд
      maxDuration: 12.0
    });
    if (typeof snd === 'function') snd('hit');
  },

  // 24. АРТИЛЛЕРИЙСКИЙ УДАР (Artillery Strike)
  callArtilleryStrike(targetX, targetY) {
    this.artilleryStrikes.push({
      x: targetX,
      y: targetY,
      timer: 2.5, // задержка перед прилетом
      radius: 140,
      exploded: false
    });
  },

  // 25. ЛАМПОЧКА (Шестое чувство)
  triggerSixthSense() {
    if (this.isSpotted) return;
    this.isSpotted = true;
    const bulb = document.getElementById('sixth-sense-icon');
    if (bulb) {
      bulb.classList.add('active');
      setTimeout(() => bulb.classList.remove('active'), 3000);
    }
    if (typeof snd === 'function') snd('warning');
  },

  // АКТИВНЫЕ СНАРЯЖЕНИЯ (Ремкомплект, Аптечка, Огнетушитель)
  useRepairKit(player) {
    if (!player) return;
    player.trackBroken = false;
    player.ammoRackDamaged = false;
    player.isOnFire = false;
    if (typeof snd === 'function') snd('repair');
  },

  useMedkit(player) {
    if (!player) return;
    player.gunnerInjured = false;
    player.driverInjured = false;
    if (typeof snd === 'function') snd('heal');
  },

  update(dt) {
    // Обновление дыма
    this.smokeClouds.forEach(s => s.duration -= dt);
    this.smokeClouds = this.smokeClouds.filter(s => s.duration > 0);

    // Обновление арт-ударов
    this.artilleryStrikes.forEach(a => {
      a.timer -= dt;
      if (a.timer <= 0 && !a.exploded) {
        a.exploded = true;
        if (typeof spawnParticles === 'function') {
          spawnParticles(a.x, a.y, '#ff2200', 60, 10, 45);
        }
        if (typeof snd === 'function') snd('explosion');
        if (GameState.units) {
          GameState.units.forEach(u => {
            const dist = Math.hypot(u.x - a.x, u.y - a.y);
            if (dist < a.radius) {
              const dmg = Math.round(650 * (1 - dist / a.radius));
              u.hp = Math.max(0, u.hp - dmg);
            }
          });
        }
      }
    });
    this.artilleryStrikes = this.artilleryStrikes.filter(a => !a.exploded || a.timer > -1);
  },

  draw(ctx, camX, camY) {
    // Отрисовка бочек
    this.fuelBarrels.forEach(b => {
      if (b.isExploded) return;
      const sx = b.x - camX, sy = b.y - camY;
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(sx, sy, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⛽', sx, sy + 4);
      ctx.restore();
    });

    // Отрисовка дыма
    this.smokeClouds.forEach(s => {
      const sx = s.x - camX, sy = s.y - camY;
      const alpha = Math.min(1, s.duration / 3);
      ctx.save();
      ctx.fillStyle = `rgba(200, 200, 210, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Отрисовка маркеров арты
    this.artilleryStrikes.forEach(a => {
      if (a.exploded) return;
      const sx = a.x - camX, sy = a.y - camY;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(sx, sy, a.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.fill();
      ctx.restore();
    });
  }
};

window.CombatMechanics = CombatMechanics;
window.SHELL_TYPES = SHELL_TYPES;
console.log('✅ combat-mechanics.js полностью готов');
