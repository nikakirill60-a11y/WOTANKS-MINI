// js/terrain.js
// ========== ФИЗИКА ЛАНДШАФТА ==========
console.log('🏞️ terrain.js загружен');

// ========== ГЕНЕРАЦИЯ ЗОН ==========
function setupTerrain(mapType) {
  GameState.terrainZones = [];

  if (mapType === 'city') {
    // Асфальтовые дороги между кварталами домов (полосы по сетке)
    for (let i = -3; i <= 3; i++) {
      GameState.terrainZones.push({ x: -600 + i * 500, y: -1200, w: 120, h: 2400, type: 'asphalt' });
    }
    GameState.terrainZones.push({ x: -1400, y: -80, w: 2800, h: 160, type: 'asphalt' });
  }

  if (mapType === 'field') {
    // Грязь после дождя + пара ледяных луж
    for (let i = 0; i < 5; i++) {
      GameState.terrainZones.push({
        x: -1000 + Math.random() * 2200, y: -900 + Math.random() * 1800,
        w: 200 + Math.random() * 220, h: 150 + Math.random() * 180, type: 'mud'
      });
    }
    for (let i = 0; i < 2; i++) {
      GameState.terrainZones.push({
        x: -800 + Math.random() * 1800, y: -700 + Math.random() * 1400,
        w: 150 + Math.random() * 100, h: 120 + Math.random() * 80, type: 'ice'
      });
    }
  }

  if (mapType === 'desert') {
    // Редкий влажный оазис-грязь у дюн
    for (let i = 0; i < 3; i++) {
      GameState.terrainZones.push({
        x: -500 + Math.random() * 1600, y: -500 + Math.random() * 1000,
        w: 120 + Math.random() * 100, h: 100 + Math.random() * 80, type: 'mud'
      });
    }
  }
}

// ========== ОПРЕДЕЛЕНИЕ ТИПА ПОД ТАНКОМ ==========
function getTerrainAt(x, y) {
  var zones = GameState.terrainZones || [];
  for (var i = 0; i < zones.length; i++) {
    var z = zones[i];
    if (x > z.x && x < z.x + z.w && y > z.y && y < z.y + z.h) return z.type;
  }
  return 'normal';
}

function getTankTerrainRes(tank) {
  if (tank && tank.team === 'player' && typeof getCrewPerkValue === 'function') {
    return getCrewPerkValue(tank.crewTankId, 'driver', 'terrainRes') || 0;
  }
  return 0;
}

// ========== ВЛИЯНИЕ НА СКОРОСТЬ ==========
function applyTerrainToSpeed(tank, speed) {
  var type = getTerrainAt(tank.x, tank.y);
  tank.currentTerrain = type;
  if (type === 'normal') return speed;

  var t = CONFIG.TERRAIN[type];
  var res = getTankTerrainRes(tank); // перк "Король бездорожья" смягчает штраф
  var mul = t.speedMul;
  if (mul < 1) mul = 1 - (1 - mul) * (1 - res);
  return speed * mul;
}

function getTerrainTurnMul(tank) {
  var type = getTerrainAt(tank.x, tank.y);
  return (CONFIG.TERRAIN[type] || CONFIG.TERRAIN.normal).turnMul;
}

// ========== ЗАНОС НА ЛЬДУ ==========
function applyIceDrift(tank) {
  if (!tank.isMoving) return;
  var type = getTerrainAt(tank.x, tank.y);
  if (type !== 'ice') return;
  var t = CONFIG.TERRAIN.ice;
  var res = getTankTerrainRes(tank);
  var drift = t.drift * (1 - res);
  tank.angle += (Math.random() - 0.5) * drift * 0.15;
}

// ========== ОТРИСОВКА ЗОН (вызывать из draw() в main.js перед стенами) ==========
function drawTerrainZones(ctx, cam) {
  var zones = GameState.terrainZones || [];
  for (var i = 0; i < zones.length; i++) {
    var z = zones[i];
    var color = CONFIG.TERRAIN[z.type] && CONFIG.TERRAIN[z.type].color;
    if (!color) continue;
    ctx.globalAlpha = z.type === 'ice' ? 0.55 : 0.5;
    ctx.fillStyle = color;
    ctx.fillRect(z.x - cam.x, z.y - cam.y, z.w, z.h);
    ctx.globalAlpha = 1;
  }
}

window.setupTerrain = setupTerrain;
window.getTerrainAt = getTerrainAt;
window.applyTerrainToSpeed = applyTerrainToSpeed;
window.getTerrainTurnMul = getTerrainTurnMul;
window.applyIceDrift = applyIceDrift;
window.drawTerrainZones = drawTerrainZones;
