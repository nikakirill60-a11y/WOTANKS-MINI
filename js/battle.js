// js/battle.js
// ========== НАСТРОЙКА КАРТЫ ==========
function setupWalls(mt) {
  GameState.walls = [];
  if (mt === 'city') {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const bhp = 400 + Math.floor(Math.random() * 300);
        GameState.walls.push({ x: -400 + c * 500, y: -1000 + r * 500, w: 100, h: 100, type: 'building', color: '#3a3a3a', hp: bhp, maxHp: bhp });
      }
    }
  }
  if (mt === 'field') {
    for (let i = 0; i < 8; i++) {
      GameState.walls.push({ x: -1000 + Math.random() * 2500, y: -1000 + Math.random() * 2000, w: 30 + Math.random() * 40, h: 30 + Math.random() * 40, type: 'bush', color: '#2d5a1e' });
    }
  }
  if (mt === 'desert') {
    for (let i = 0; i < 6; i++) {
      GameState.walls.push({ x: -600 + Math.random() * 2000, y: -600 + Math.random() * 1200, w: 80 + Math.random() * 60, h: 20, type: 'dune', color: '#c2a645' });
    }
  }
}

// ========== БОНУСЫ ==========
function getModBonuses(tankId) {
  const mods = GameState.modules[tankId] || [null, null, null];
  const b = { hp: 0, dmg: 0, vr: 0, camo: 0, reload: 0, shell_speed: 0, speed: 0, armor: 0 };
  mods.forEach(m => {
    if (m && CONFIG.MODULES[m]) {
      const mod = CONFIG.MODULES[m];
      b[mod.stat] = (b[mod.stat] || 0) + mod.value;
    }
  });
  return b;
}

function getUpgradeBonuses(tankId) {
  const u = GameState.upgrades[tankId] || { gun: 0, engine: 0, turret: 0 };
  const gun = CONFIG.UPGRADES.gun[u.gun] || CONFIG.UPGRADES.gun[0];
  const eng = CONFIG.UPGRADES.engine[u.engine] || CONFIG.UPGRADES.engine[0];
  const tur = CONFIG.UPGRADES.turret[u.turret] || CONFIG.UPGRADES.turret[0];
  return {
    dmgMul: gun.dmgMul, reloadMul: gun.reloadMul,
    speedMul: eng.speedMul,
    hpMul: tur.hpMul, vrMul: tur.vrMul
  };
}

function getAllBonuses(tankId) {
  return {
    mod: getModBonuses(tankId),
    upg: getUpgradeBonuses(tankId)
  };
}

// ========== НАЧАЛО БОЯ ==========
function startBattle(mode) {
  console.log('🎮 startBattle вызвана, mode:', mode);
  console.log('🌐 multiplayerMode:', GameState.multiplayerMode);
  
  GameState.gameActive = true;
  GameState.battleDmg = 0;
  GameState.battleKills = 0;
  GameState.curMap = document.getElementById('map-select').value;
  GameState.consumables = [false, false, false, false, false, false];
  GameState.adrenalineActive = false;
  GameState.fuelBoostActive = false;
  GameState.paiokActive = false;
  
  document.querySelectorAll('.cons-btn').forEach(b => { b.classList.remove('used'); b.classList.add('ready'); });
  document.querySelectorAll('.m-cons').forEach(b => b.classList.remove('used'));
  
  document.getElementById('ui').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  document.getElementById('result-screen').classList.remove('show');
  
  if (GameState.controlMode === 'mobile') {
    document.getElementById('mobile-controls').classList.add('show');
  } else {
    document.getElementById('mobile-controls').classList.remove('show');
  }
  startPerfMonitor();

  const bonuses = getAllBonuses(GameState.selected);
  GameState.player = new Tank(GameState.selected, -1500, 0, 'player', bonuses);
  GameState.units = [GameState.player];
  GameState.bullets = [];
  GameState.particles = [];
  GameState.tracks = [];
  
  setupWalls(GameState.curMap);
  setupTerrain(GameState.curMap);

  // ✅ ПРОВЕРКА МУЛЬТИПЛЕЕРА
  if (GameState.multiplayerMode) {
    console.log('🌐 МУЛЬТИПЛЕЕР БОЙ!');
    console.log('👥 Враги:', GameState.multiplayerEnemies);
    console.log('👥 Союзники:', GameState.multiplayerAllies);
    console.log('👥 Другие игроки:', Object.keys(GameState.otherPlayers));
    console.log('👥 Всего юнитов:', GameState.units.length);
    
    // Добавляем других игроков
    for (const name in GameState.otherPlayers) {
      const tank = GameState.otherPlayers[name];
      if (!GameState.units.includes(tank)) {
        GameState.units.push(tank);
        console.log('➕ Добавлен:', name);
      }
    }
    
    console.log('👥 Итогово юнитов:', GameState.units.length);
    updateScoreboard();
    
    if (GameState.currentRoomId) {
      syncPlayerPositions(GameState.currentRoomId);
      syncPlayerShots(GameState.currentRoomId);
    }
    return;
  }

  // Обычный бой с ботами
  console.log('🤖 Обычный бой с ботами');
  const pt = GameState.player.tier;
  const valid = Object.keys(DB).filter(id => Math.abs(DB[id].tier - pt) <= 1 && !DB[id].collection);
  
  for (let i = 0; i < mode - 1; i++) {
    const id = valid[Math.floor(Math.random() * valid.length)];
    GameState.units.push(new Tank(id, -1400 + Math.random() * 200, -500 + Math.random() * 1000, 'ally'));
  }
  
  for (let i = 0; i < mode; i++) {
    const id = valid[Math.floor(Math.random() * valid.length)];
    const e = new Tank(id, 1200 + Math.random() * 600, -500 + Math.random() * 1000, 'enemy');
    e.angle = Math.PI;
    GameState.units.push(e);
  }
  
  updateScoreboard();
}

// ========== ТРЕНИРОВКА ==========
function startTraining() {
  GameState.gameActive = true;
  GameState.battleDmg = 0;
  GameState.battleKills = 0;
  GameState.curMap = document.getElementById('map-select').value;
  GameState.consumables = [false, false, false, false, false, false];
  
  document.querySelectorAll('.cons-btn').forEach(b => { b.classList.remove('used'); b.classList.add('ready'); });
  document.querySelectorAll('.m-cons').forEach(b => b.classList.remove('used'));
  
  const eid = document.getElementById('enemy-select').value;
  document.getElementById('ui').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  document.getElementById('result-screen').classList.remove('show');
  startPerfMonitor();
  
  if (GameState.controlMode === 'mobile') {
    document.getElementById('mobile-controls').classList.add('show');
  } else {
    document.getElementById('mobile-controls').classList.remove('show');
  }

  const bonuses = getAllBonuses(GameState.selected);
  GameState.player = new Tank(GameState.selected, -500, 0, 'player', bonuses);
  const enemy = new Tank(eid, 500, 0, 'enemy');
  enemy.angle = Math.PI;
  
  GameState.units = [GameState.player, enemy];
  GameState.bullets = [];
  GameState.particles = [];
  GameState.tracks = [];
  
  setupWalls(GameState.curMap);
  setupTerrain(GameState.curMap);
  updateScoreboard();
}

// ========== КОНЕЦ БОЯ ==========
function endBattle(won) {
  GameState.gameActive = false;
  GameState.totalBattles = (GameState.totalBattles || 0) + 1;
  
  let silver = Math.floor(GameState.battleDmg * 0.5 + GameState.battleKills * 200);
  let xpReward = Math.floor(GameState.battleKills * 500 + (won ? 300 : 100));
  let xpMul = 1, goldMul = 1, silverMul = 1;
  
  if (GameState.boosters.xp > 0) { xpMul = CONFIG.BOOSTERS.xp.multiplier; GameState.boosters.xp--; }
  if (GameState.boosters.gold > 0) { goldMul = CONFIG.BOOSTERS.gold.multiplier; GameState.boosters.gold--; }
  if (GameState.boosters.silver > 0) { silverMul = CONFIG.BOOSTERS.silver.multiplier; GameState.boosters.silver--; }
  
  silver = Math.floor(silver * silverMul);
  xpReward = Math.floor(xpReward * xpMul);
  const goldReward = Math.floor((won ? 50 : 10) * goldMul);
  
  GameState.SILVER += silver;
  GameState.XP += xpReward;
  GameState.GOLD += goldReward;
  
  if (GameState.quest23 && !GameState.quest23.claimed && GameState.battleKills > 0) {
    GameState.quest23.kills += GameState.battleKills;
    saveProgress();
  }
  
  if (GameState.multiplayerMode) {
    endMultiplayerBattle();
  }

  addBattlePassXP(won ? 300 : 100);
  checkCollectionBonuses();
  
  document.getElementById('result-screen').classList.add('show');
  document.getElementById('result-title').innerText = won ? "ПОБЕДА!" : "ПОРАЖЕНИЕ";
  document.getElementById('result-title').style.color = won ? "#2ecc71" : "#e74c3c";
  
  let boostInfo = '';
  if (xpMul > 1) boostInfo += '<br><span style="color:#3498db">⭐ Бустер XP x' + xpMul + '</span>';
  if (silverMul > 1) boostInfo += '<br><span style="color:#bdc3c7">💰 Бустер ₽ x' + silverMul + '</span>';
  if (goldMul > 1) boostInfo += '<br><span style="color:#f1c40f">🪙 Бустер G x' + goldMul + '</span>';
  
  document.getElementById('result-stats').innerHTML = 
    'Урон: ' + Math.floor(GameState.battleDmg) + '<br>' +
    'Фрагов: ' + GameState.battleKills + '<br>' +
    'Серебро: +' + silver + '₽<br>' +
    'Опыт: +' + xpReward + ' XP<br>' +
    'Золото: +' + goldReward + ' G' + boostInfo;
  
  updateBoosterUI();
}

function backToGarage() {
  stopPerfMonitor();
  document.getElementById('result-screen').classList.remove('show');
  document.getElementById('ui').style.display = 'flex';
  document.getElementById('hud').style.display = 'none';
  document.getElementById('mobile-controls').classList.remove('show');
  
  updateResources();
  if (typeof updateQuestUI === 'function') updateQuestUI();
  if (typeof updateBoosterUI === 'function') updateBoosterUI();
  renderTree();
  renderCarousel();
}

// ========== ЭФФЕКТЫ ==========
function spawnParticles(x, y, color, count, speed, life) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * speed;
    GameState.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, ml: life, color, sz: 2 + Math.random() * 3 });
  }
}

function boom(x, y) {
  spawnParticles(x, y, '#ff6600', 25, 5, 40);
  spawnParticles(x, y, '#ffcc00', 15, 3, 30);
  spawnParticles(x, y, '#ff0000', 10, 4, 35);
  spawnParticles(x, y, '#333', 8, 2, 50);
}

function sparks(x, y) {
  spawnParticles(x, y, '#ffcc00', 6, 4, 15);
  spawnParticles(x, y, '#fff', 3, 3, 10);
}

function smoke(x, y) {
  GameState.particles.push({
    x: x + (Math.random() - 0.5) * 5,
    y: y + (Math.random() - 0.5) * 5,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5 - 0.3,
    life: 30, ml: 30, color: '#555', sz: 4 + Math.random() * 4
  });
}

console.log('✅ battle.js загружен');