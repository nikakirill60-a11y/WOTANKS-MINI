// js/destructible.js
// ========== РАЗРУШАЕМОСТЬ ЗДАНИЙ ==========
console.log('🧱 destructible.js загружен');

// Танки с большим уроном (или прямым тараном) разрушают здания быстрее —
// используем тот же b.dmg, что и по танкам, так что тяжёлые орудия сносят
// стены за 1-3 выстрела, а лёгкие тратят на это гораздо больше времени.
function damageWall(wall, dmg, wallIndex) {
  wall.hp -= dmg;
  spawnParticles(
    wall.x + wall.w / 2 + (Math.random() - 0.5) * wall.w,
    wall.y + wall.h / 2 + (Math.random() - 0.5) * wall.h,
    '#888', 6, 2, 20
  );

  if (wall.hp <= 0) {
    boom(wall.x + wall.w / 2, wall.y + wall.h / 2);
    snd('boom');
    spawnParticles(wall.x + wall.w / 2, wall.y + wall.h / 2, '#5a5a5a', 20, 4, 40);
    GameState.walls.splice(wallIndex, 1);
    if (GameState.player && GameState.player.team === 'player') {
      crewMsg('🧱 Здание разрушено!', '#f39c12');
    }
  }
}

// ========== ОТРИСОВКА ПОВРЕЖДЁННОГО ЗДАНИЯ ==========
// main.js вызывает это вместо простой заливки для type==='building'
function drawBuildingHealth(ctx, wl, cam) {
  if (wl.type !== 'building' || wl.hp === undefined) return;
  var frac = Math.max(0, wl.hp / wl.maxHp);
  // трещины — чем меньше HP, тем темнее и "выбитее" здание выглядит
  ctx.globalAlpha = 0.4 + frac * 0.6;
  if (frac < 0.5) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wl.x - cam.x, wl.y - cam.y);
    ctx.lineTo(wl.x - cam.x + wl.w * 0.6, wl.y - cam.y + wl.h);
    ctx.moveTo(wl.x - cam.x + wl.w, wl.y - cam.y);
    ctx.lineTo(wl.x - cam.x + wl.w * 0.3, wl.y - cam.y + wl.h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

window.damageWall = damageWall;
window.drawBuildingHealth = drawBuildingHealth;
