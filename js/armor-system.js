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
  var now = Date.now();
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
  return tank.critTimers[type] > Date.now();
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
      target.critTimers[t] = Date.now() + cfg.duration;
      if (target === GameState.player) {
        combatMessage(cfg.icon + ' ' + cfg.name + '!', '#ff4444');
      } else if (shooter === GameState.player) {
        combatMessage(cfg.icon + ' Критическое попадание!', '#f1c40f');
      }
      return t;
    }
  }
  return null;
}

// A bounced/blocked round is still spent. Only successful hits roll criticals.
function resolveHit(bullet, target, part = 'hull') {
  const zone = getArmorZone(bullet, target, part);
  const plate = part === 'turret' ? target.turretArmor : target.armor;
  const effective = plate * CONFIG.ARMOR_ZONES[zone].mul;
  if (bullet.pen < effective) return {zone, dmg:0};
  rollCritical(bullet.shooter, target);
  return {zone, dmg:bullet.dmg};
}
