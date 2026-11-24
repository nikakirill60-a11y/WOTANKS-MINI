// js/terrain.js
// ========== ФИЗИКА ЛАНДШАФТА ==========
console.log('🏞️ terrain.js загружен');

// ========== ОПРЕДЕЛЕНИЕ ТИПА ПОД ТАНКОМ ==========
function getTerrainAt(x, y) {
  var zones = GameState.terrainZones || [];
  // Later-painted zones are on top, matching the floor texture and map plan.
  for (var i = zones.length - 1; i >= 0; i--) {
    var z = zones[i];
    if (x > z.x && x < z.x + z.w && y > z.y && y < z.y + z.h) return z.type;
  }
  return 'normal';
}

// ========== ВЛИЯНИЕ НА СКОРОСТЬ ==========
function applyTerrainToSpeed(tank, speed, type = getTerrainAt(tank.x, tank.y)) {
  tank.currentTerrain = type;
  if (type === 'normal') return speed;
  if (type === 'asphalt') {
    const spec = DB[tank.id];
    return (speed * (spec.roadSpeed || spec.speed)) / spec.speed;
  }

  return speed * CONFIG.TERRAIN[type].speedMul;
}
