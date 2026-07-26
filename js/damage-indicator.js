// js/damage-indicator.js
// ========== ИНДИКАТОР НАПРАВЛЕНИЯ УРОНА ==========
console.log('🩸 damage-indicator.js загружен');
// Камера в игре не вращается вслед за танком (мир рисуется в мировых
// координатах со смещением, без поворота — см. main.js), поэтому угол на
// экране совпадает с мировым углом атаки. onPlayerHit(angle, dmg)
// вызывается неинвазивными хуками из main.js/tank.js в момент попадания по
// игроку; angle — направление "от стрелка к игроку" (как b.a в main.js),
// поэтому источник урона находится в противоположном направлении (+180°).

function ensureDamageIndicatorHost() {
  var host = document.getElementById('damage-indicator-host');
  if (host) return host;
  host = document.createElement('div');
  host.id = 'damage-indicator-host';
  host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:150;overflow:hidden;';
  document.body.appendChild(host);
  return host;
}

var activeDamageWedges = 0;
var MAX_DAMAGE_WEDGES = 6;

function onPlayerHit(fromAngle, dmg) {
  if (!GameState.gameActive) return;
  if (activeDamageWedges >= MAX_DAMAGE_WEDGES) return;

  var host = ensureDamageIndicatorHost();
  var attackerAngle = fromAngle + Math.PI; // направление К стрелку от игрока
  var deg = attackerAngle * 180 / Math.PI;

  var intensity = Math.min(1, 0.35 + (dmg || 0) / 400);
  var wedge = document.createElement('div');
  wedge.style.cssText =
    'position:absolute;top:50%;left:50%;width:130vmax;height:130vmax;' +
    'transform:translate(-50%,-50%) rotate(' + deg + 'deg);' +
    'background:conic-gradient(from -16deg at 50% 50%, rgba(231,76,60,' + intensity + ') 0deg, rgba(231,76,60,' + (intensity * 0.85) + ') 32deg, transparent 33deg);' +
    'opacity:1;transition:opacity 1.1s ease-out;';
  host.appendChild(wedge);
  activeDamageWedges++;

  requestAnimationFrame(function () {
    wedge.style.opacity = '0';
  });
  setTimeout(function () {
    wedge.remove();
    activeDamageWedges--;
  }, 1200);
}

window.onPlayerHit = onPlayerHit;
