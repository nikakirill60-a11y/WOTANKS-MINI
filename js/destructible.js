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
    snd('collapse',1,{x:wall.x+wall.w/2,y:wall.y+wall.h/2});
    spawnParticles(wall.x + wall.w / 2, wall.y + wall.h / 2, '#5a5a5a', 20, 4, 40);
    wall.destroyed = true;
    GameState.walls.splice(wallIndex, 1);
    GameState.arena.revision++; // invalidate both the route grid and minimap
    if (GameState.player && GameState.player.team === 'player') {
      combatMessage('🧱 Здание разрушено!', '#f39c12');
    }
  }
}
