// js/effects.js
// ========== ПРОДВИНУТЫЕ ВИЗУАЛЬНЫЕ ЭФФЕКТЫ ==========
console.log('✨ effects.js загружен');

GameState.casings = GameState.casings || [];

// ========== НАПРАВЛЕННЫЕ ИСКРЫ ОТ ПОПАДАНИЯ/РИКОШЕТА ==========
function sparksAdvanced(x, y, impactAngle, h) {
  // Основной сноп искр летит "от брони", т.е. навстречу выстрелу
  var back = impactAngle + Math.PI;
  for (var i = 0; i < 10; i++) {
    var spread = (Math.random() - 0.5) * 1.4;
    var a = back + spread;
    var sp = 2 + Math.random() * 5;
    GameState.particles.push({
      x: x, y: y, h, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 12 + Math.random() * 10, ml: 20, color: Math.random() < 0.5 ? '#ffcc00' : '#fff', sz: 1.5 + Math.random() * 2
    });
  }
  spawnParticles(x, y, '#ff8800', 3, 2, 12, h);
}

// ========== ЛЕТЯЩИЕ ГИЛЬЗЫ ==========
function spawnShellCasing(shooter) {
  if (!shooter) return;
  var fa = shooter.tAngle;
  var ejectAngle = fa + Math.PI / 2 + (Math.random() - 0.5) * 0.3;
  var ox = shooter.x + Math.cos(fa) * 15 * shooter.s;
  var oy = shooter.y + Math.sin(fa) * 15 * shooter.s;
  GameState.casings.push({
    x: ox, y: oy,
    vx: Math.cos(ejectAngle) * (2 + Math.random() * 2),
    vy: Math.sin(ejectAngle) * (2 + Math.random() * 2),
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.5,
    life: 45, ml: 45
  });
}

function updateCasings() {
  for (var i = GameState.casings.length - 1; i >= 0; i--) {
    var c = GameState.casings[i];
    c.x += c.vx; c.y += c.vy;
    c.vx *= 0.9; c.vy *= 0.9;
    c.rot += c.vr;
    c.life--;
    if (c.life <= 0) GameState.casings.splice(i, 1);
  }
}
