// ========== БОНУСЫ ==========
function getModBonuses(tankId) {
  const mods = GameState.modules[tankId] || [null, null, null];
  const b = { hp: 0, dmg: 0, vr: 0, camo: 0, reload: 0, shell_speed: 0, speed: 0, armor: 0 };
  mods.forEach((m) => {
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
    dmgMul: gun.dmgMul,
    reloadMul: gun.reloadMul,
    speedMul: eng.speedMul,
    hpMul: tur.hpMul,
    vrMul: tur.vrMul
  };
}

function getAllBonuses(tankId) {
  return {
    mod: getModBonuses(tankId),
    upg: getUpgradeBonuses(tankId)
  };
}

// The notice covers loading and recoverable failures. A cancelled/failed sortie never
// starts simulation, spends a booster or runs the end-of-match reward hooks.
let battleLaunch = null;
function battleNotice(title, text) {
  document.getElementById('battle-notice-title').textContent = title;
  document.getElementById('battle-notice-text').textContent = text;
  document.getElementById('battle-notice').hidden = false;
}
function battleFailed(message) {
  backToGarage();
  battleNotice('3D-бой недоступен', message);
}
function startBattle(mode) {
  return launchBattle(mode === 10 ? 10 : 7);
}
function startTraining() {
  return launchBattle(1);
}
async function launchBattle(teamSize) {
  if (GameState.gameActive || battleLaunch) return false;
  const ticket = (battleLaunch = new AbortController());
  GarageViewer.suspend();
  battleNotice('Выезд на позицию', 'Готовим модели и местность…');
  try {
    BattleView.open(() =>
      battleFailed('Графический контекст потерян. Вернитесь в ангар и запустите бой снова.')
    );
    const g = GameState,
      training = teamSize === 1;
    const map = document.getElementById('map-select').value;
    const arena = BattleMaps.create(map),
      navigation = new BattleNavigation(arena);
    const playerId = g.selected;
    // Interleave nations by tier so even a seven-vehicle side includes all three lines.
    const pool = Object.values(DB)
      .filter((t) => Math.abs(t.tier - DB[playerId].tier) <= 1)
      .sort((a, b) => a.tier - b.tier)
      .map((t) => t.id);
    // Mirror the line-up, not the paint/position: both teams get the same models and tiers.
    const offset = Math.floor(Math.random() * pool.length);
    const roster = Array.from({ length: teamSize }, (_, i) =>
      i ? pool[(offset + i - 1) % pool.length] : playerId
    );
    const formation = battleFormation(
      arena,
      navigation,
      roster,
      training ? document.getElementById('enemy-select').value : null
    );
    const assets = new Map(
      await Promise.all(
        [...new Set(formation.map((slot) => slot.id))].map(async (id) => [
          id,
          await BattleModels.load(id, ticket.signal)
        ])
      )
    );
    if (ticket.signal.aborted) return false;
    g.training = training;
    g.battleDmg = g.battleKills = 0;
    g.bullets = [];
    g.tracks = [];
    g.particles = [];
    g.casings = [];
    g.consumables = Array(6).fill(false);
    g.adrenalineActive = g.fuelBoostActive = g.paiokActive = false;
    g.shakeTimer = 0;
    resetBattleInput();
    CombatMechanics.smokeClouds = [];
    CombatMechanics.artilleryStrikes = [];
    g.arena = arena;
    g.navigation = navigation;
    g.walls = arena.walls;
    g.terrainZones = arena.zones;
    WeatherEngine.initWeatherForBattle(arena);
    updateScale();
    g.units = formation.map((slot) => {
      const u = new Tank(
        slot.id,
        slot.x,
        slot.y,
        slot.team,
        slot.team === 'player' ? getAllBonuses(slot.id) : null
      );
      u.angle = u.tAngle = u.lookYaw = slot.angle;
      u.modelAsset = assets.get(slot.id);
      u.practiceTarget = !!slot.practice;
      if (slot.team !== 'player' && !u.practiceTarget) BotAI.attach(u, slot, navigation);
      return u;
    });
    g.player = g.units[0];
    const drum = g.player.usesMagazine;
    document.body.classList.toggle('drum-equipped', drum);
    setShell(drum ? 0 : g.curShell);
    document.getElementById('ui').style.display = 'none';
    BattleView.build();
    document.querySelectorAll('.cons-btn').forEach((b) => {
      b.classList.remove('used');
      b.classList.add('ready');
    });
    document.querySelectorAll('.m-cons').forEach((b) => b.classList.remove('used'));
    document.getElementById('hud').style.display = 'block';
    document.getElementById('result-screen').classList.remove('show');
    document.getElementById('mobile-controls').classList.toggle('show', g.controlMode === 'mobile');
    document.getElementById('combat-sector').textContent =
      `СЕКТОР ${arena.spec.sector}  /  ${training ? 'ТРЕНИРОВКА' : teamSize + ' × ' + teamSize}`;
    document.getElementById('combat-map').textContent = arena.spec.name;
    document.getElementById('combat-tank').textContent = DB[playerId].n;
    document.getElementById('battle-notice').hidden = true;
    g.gameActive = true;
    updateScoreboard();
    updateHUD();
    startPerfMonitor();
    startBattleLoop();
    document.getElementById('game').focus({ preventScroll: true });
    return true;
  } catch (error) {
    if (!ticket.signal.aborted) battleFailed(error.message || 'Не удалось открыть поле боя.');
    return false;
  } finally {
    if (battleLaunch === ticket) battleLaunch = null;
  }
}

// ========== КОНЕЦ БОЯ ==========
function endBattle(won) {
  if (!GameState.gameActive) return;
  GameState.gameActive = false;
  resetBattleInput();
  stopPerfMonitor();
  document.getElementById('mobile-controls').classList.remove('show');
  GameState.totalBattles = (GameState.totalBattles || 0) + 1;

  let silver = Math.floor(GameState.battleDmg * 0.5 + GameState.battleKills * 200);
  let xpReward = Math.floor(GameState.battleKills * 500 + (won ? 300 : 100));
  let xpMul = 1,
    goldMul = 1,
    silverMul = 1;

  if (GameState.boosters.xp > 0) {
    xpMul = CONFIG.BOOSTERS.xp.multiplier;
    GameState.boosters.xp--;
  }
  if (GameState.boosters.gold > 0) {
    goldMul = CONFIG.BOOSTERS.gold.multiplier;
    GameState.boosters.gold--;
  }
  if (GameState.boosters.silver > 0) {
    silverMul = CONFIG.BOOSTERS.silver.multiplier;
    GameState.boosters.silver--;
  }

  silver = Math.floor(silver * silverMul);
  xpReward = Math.floor(xpReward * xpMul);
  const goldReward = Math.floor((won ? 50 : 10) * goldMul);

  GameState.SILVER += silver;
  GameState.XP += xpReward;
  GameState.GOLD += goldReward;

  if (won) GameState.lifetimeWins++;
  GameState.lifetimeKills += GameState.battleKills;
  saveProgress();

  document.getElementById('result-screen').classList.add('show');
  document.getElementById('result-title').innerText = won ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
  document.getElementById('result-title').style.color = won ? '#2ecc71' : '#e74c3c';

  let boostInfo = '';
  if (xpMul > 1) boostInfo += '<br><span style="color:#3498db">⭐ Бустер XP x' + xpMul + '</span>';
  if (silverMul > 1) boostInfo += '<br><span style="color:#bdc3c7">💰 Бустер ₽ x' + silverMul + '</span>';
  if (goldMul > 1) boostInfo += '<br><span style="color:#f1c40f">🪙 Бустер G x' + goldMul + '</span>';

  document.getElementById('result-stats').innerHTML =
    'Урон: ' +
    Math.floor(GameState.battleDmg) +
    '<br>' +
    'Фрагов: ' +
    GameState.battleKills +
    '<br>' +
    'Серебро: +' +
    silver +
    '₽<br>' +
    'Опыт: +' +
    xpReward +
    ' XP<br>' +
    'Золото: +' +
    goldReward +
    ' G' +
    boostInfo;

  updateBoosterUI();
}

function backToGarage() {
  document.body.classList.remove('drum-equipped');
  if (battleLaunch) {
    battleLaunch.abort();
    battleLaunch = null;
  }
  GameState.gameActive = false;
  stopBattleLoop();
  resetBattleInput();
  stopPerfMonitor();
  BattleView.dispose();
  GameState.aim = { x: 0, y: 0, h: 0 };
  GameState.player = null;
  GameState.units = [];
  GameState.arena = GameState.navigation = null;
  GameState.walls = [];
  GameState.terrainZones = [];
  WeatherEngine.waterBodies = [];
  MapChart.reset();
  GameState.bullets = [];
  GameState.particles = [];
  GameState.tracks = [];
  CombatMechanics.smokeClouds = [];
  CombatMechanics.artilleryStrikes = [];
  document.getElementById('hud').classList.remove('photo-mode');
  document.getElementById('battle-notice').hidden = true;
  document.body.classList.remove('mobile-mode');
  document.getElementById('result-screen').classList.remove('show');
  document.getElementById('ui').style.display = 'flex';
  document.getElementById('hud').style.display = 'none';
  document.getElementById('mobile-controls').classList.remove('show');

  updateResources();
  if (typeof updateBoosterUI === 'function') updateBoosterUI();
  renderTree();
  renderCarousel();
}

function leaveBattle() {
  if (GameState.gameActive && confirm('Выйти в ангар без награды за бой?')) backToGarage();
}

// ========== ЭФФЕКТЫ ==========
function spawnParticles(x, y, color, count, speed, life, h = 4) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2,
      s = Math.random() * speed;
    GameState.particles.push({
      x,
      y,
      h,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life,
      ml: life,
      color,
      sz: 2 + Math.random() * 3
    });
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
    life: 30,
    ml: 30,
    color: '#555',
    sz: 4 + Math.random() * 4
  });
}

console.log('✅ battle.js загружен');
