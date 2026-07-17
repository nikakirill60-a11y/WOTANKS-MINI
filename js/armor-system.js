// js/armor-system.js
// ========== ДИФФЕРЕНЦИРОВАННОЕ БРОНИРОВАНИЕ + КРИТИЧЕСКИЕ ПОВРЕЖДЕНИЯ ==========
console.log('🛡️ armor-system.js загружен');

// Множители доп. урона за пробитие в слабую зону (борт/корма тоньше — снаряд
// разрушает больше внутренних узлов).
const ZONE_DAMAGE_MUL = { front: 1.0, side: 1.15, rear: 1.35 };

// ========== ОПРЕДЕЛЕНИЕ ЗОНЫ ПОПАДАНИЯ ==========
// Возвращает 'front' | 'side' | 'rear' на основе угла между направлением
// выстрела и текущим разворотом корпуса цели.
function getArmorZone(shooter, target) {
  var hitAngle = Math.atan2(target.y - shooter.y, target.x - shooter.x);
  var diff = hitAngle - target.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  diff = Math.abs(diff);

  if (diff <= Math.PI / 4) return 'front';      // ±45°
  if (diff <= Math.PI * 0.75) return 'side';     // 45°..135°
  return 'rear';
}

function getZoneDamageMultiplier(zone) {
  return ZONE_DAMAGE_MUL[zone] || 1;
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
    if (tank.critTimers.gunner > now) return 1 - CONFIG.CRITICALS.gunner.value;
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

  var bonus = 0;
  if (shooter && shooter.team === 'player' && typeof getCrewPerkValue === 'function') {
    bonus = getCrewPerkValue(shooter.crewTankId, 'gunner', 'critChance') || 0;
  }

  var types = ['engine', 'ammo', 'gunner'];
  for (var i = 0; i < types.length; i++) {
    var t = types[i];
    var cfg = CONFIG.CRITICALS[t];
    if (Math.random() < cfg.chance + bonus) {
      target.critTimers[t] = Date.now() + cfg.duration;
      if (target === GameState.player) {
        crewMsg(cfg.icon + ' ' + cfg.name + '!', '#ff4444');
      } else if (shooter === GameState.player) {
        crewMsg(cfg.icon + ' Критическое попадание!', '#f1c40f');
      }
      return t;
    }
  }
  return null;
}

// ========== ПОЛНЫЙ РАСЧЁТ ПОПАДАНИЯ (зона + крит) ==========
// Используется в main.js вместо "u2.hp -= b.dmg" напрямую.
// Возвращает { dmg, zone }.
function resolveHit(bullet, target) {
  var zone = getArmorZone(bullet.shooter, target);
  var dmg = bullet.dmg * getZoneDamageMultiplier(zone);
  rollCritical(bullet.shooter, target);
  return { dmg: dmg, zone: zone };
}

window.getArmorZone = getArmorZone;
window.getZoneDamageMultiplier = getZoneDamageMultiplier;
window.getCritMultiplier = getCritMultiplier;
window.isCritActive = isCritActive;
window.rollCritical = rollCritical;
window.resolveHit = resolveHit;
