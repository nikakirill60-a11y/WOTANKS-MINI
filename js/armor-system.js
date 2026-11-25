// js/armor-system.js
// ========== ДИФФЕРЕНЦИРОВАННОЕ БРОНИРОВАНИЕ + КРИТИЧЕСКИЕ ПОВРЕЖДЕНИЯ ==========
console.log('🛡️ armor-system.js загружен');

// Arcade armour check: compare this shell's game penetration to the part it
// actually intersected. A weaker zone helps penetration, NOT damage per round.
function getArmorZone(bullet, target, part) {
  const facing = part === 'turret' ? target.tAngle : target.angle;
  const angle = bullet.a + Math.PI - facing;
  const diff = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
  return diff <= Math.PI/4 ? 'front' : diff <= Math.PI*.75 ? 'side' : 'rear';
}

// ========== КРИТИЧЕСКИЕ ПОВРЕЖДЕНИЯ ==========
// Множитель, который нужно применить к скорости/перезарядке/урону танка
// прямо сейчас, с учётом активных критов.
function getCritMultiplier(tank, type) {
  if (!tank || !tank.critTimers) return 1;
  var now = BattleClock.date();
  if (type === 'speed') {
    if (tank.critTimers.engine > now) return 1 - CONFIG.CRITICALS.engine.value;
    return 1;
  }
  if (type === 'reload') {
    if (tank.critTimers.ammo > now) return 1 + CONFIG.CRITICALS.ammo.value;
    return 1;
  }
  if (type === 'dmg') {
    if (tank.critTimers.gun > now) return 1 - CONFIG.CRITICALS.gun.value;
    return 1;
  }
  return 1;
}

function isCritActive(tank, type) {
  if (!tank || !tank.critTimers) return false;
  return tank.critTimers[type] > BattleClock.date();
}

// ========== БРОСОК НА КРИТ ==========
// Вызывается после подтверждённого пробития (не рикошета).
function rollCritical(shooter, target) {
  if (!target || target.dead) return null;

  var types = ['engine', 'ammo', 'gun'];
  for (var i = 0; i < types.length; i++) {
    var t = types[i];
    var cfg = CONFIG.CRITICALS[t];
    if (Math.random() < cfg.chance) {
      // A second engine critical before the first one is repaired stalls the vehicle.
      const stalled = t === 'engine' && isCritActive(target, 'engine');
      if (stalled) target.engineRestartAt = BattleClock.date() + cfg.duration;
      target.critTimers[t] = BattleClock.date() + cfg.duration;
      if (target === GameState.player) {
        combatMessage(cfg.icon + ' ' + (stalled ? 'Двигатель заглох' : cfg.name) + '!', '#ff4444');
      } else if (shooter === GameState.player) {
        combatMessage(cfg.icon + ' Критическое попадание!', '#f1c40f');
      }
      return t;
    }
  }
  return null;
}

// A bounced/blocked round is still spent. Only successful hits roll criticals.
function resolveHit(bullet, target, part = 'hull', incidenceCos = 1) {
  const zone = getArmorZone(bullet, target, part);
  const plate = part === 'turret' ? target.turretArmor : target.armor;
  const effective = plate * CONFIG.ARMOR_ZONES[zone].mul;
  const round = bullet.round; // selected at launch, never read the shooter's current mode here
  let pen = bullet.pen;
  if (round?.ricochetDeg !== undefined) {
    const angle = Math.acos(bounded(incidenceCos, 0, 1)) * 180 / Math.PI;
    if (angle >= round.ricochetDeg - 1e-9) return {zone, dmg:0, ricochet:true};
    pen *= Math.cos(Math.max(0, angle - round.normalizationDeg) * Math.PI / 180);
  } else if (round?.lossPct !== undefined) {
    // CITY TANKS has a single armour check per impact (no separate screen layers).
    pen *= 1 - round.lossPct / 100;
  }
  if (pen < effective) return {zone, dmg:0};
  rollCritical(bullet.shooter, target);
  return {zone, dmg:bullet.dmg};
}
