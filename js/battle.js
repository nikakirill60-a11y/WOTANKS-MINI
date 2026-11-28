// ========== БОНУСЫ ==========
function getModBonuses(tankId, mods = GameState.modules[tankId] || []) {
  const b = { hp: 0, dmg: 0, vr: 0, camo: 0, reload: 0, shell_speed: 0, speed: 0, armor: 0 };
  mods.forEach((m) => {
    if (m && CONFIG.MODULES[m]) {
      const mod = CONFIG.MODULES[m];
      b[mod.stat] = (b[mod.stat] || 0) + mod.value;
    }
  });
  return b;
}

function getUpgradeBonuses(tankId, u = GameState.upgrades[tankId] || {}) {
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
  return launchBattle(mode === 15 || mode === 10 ? mode : 7);
}
function startTraining() {
  return launchBattle(1);
}
// Eligibility (also used by the platoon lobby) is not the match-level band roll.
const MATCH_TOP_TIER = Math.max(...Object.values(DB).map(t => t.tier));
function matchBand(ids) {
  const tiers = ids.map(id => DB[id]?.tier);
  const low = Math.min(...tiers), high = Math.max(...tiers);
  return tiers.length && high-low <= 1 ? [Math.max(1,high-1), Math.min(MATCH_TOP_TIER,low+1)] : null;
}
function makeRosters(playerId, size, random = Math.random, seats = [playerId]) {
  const humans = seats.filter(Boolean), legal = matchBand(humans);
  if (!legal) throw Error('Во взводе нужны машины одного или соседних уровней.');
  const tier = DB[playerId].tier;
  let [low, high] = legal;
  // A mixed platoon already fixed BOTH tiers. Otherwise draw exactly once for
  // the whole match. At I/X the unavailable neighbour folds into same-tier.
  if (humans.every(id => DB[id].tier === tier)) {
    const roll = random();
    if (roll < .5) low = high = tier;
    else if (roll < .75) high = tier;
    else low = tier;
  }
  const pool = Object.values(DB).filter(t => t.tier >= low && t.tier <= high &&
    (!t.source || t.source === 'premium' || t.source === 'collection'));
  const count = (m, key) => m.get(key) || 0;
  function deal(fixed) {
    const team = Array.from({length:size}, (_, i) => fixed[i] || null);
    const models = new Map(), nations = new Map();
    let left = size, lowLeft = low === high ? size : Math.floor(size/2);
    function seat(id) {
      const t = DB[id];
      models.set(id, count(models,id)+1); nations.set(t.nat, count(nations,t.nat)+1);
      if (t.tier === low) lowLeft--;
      left--;
    }
    // Reserve actual human seats first, even when the middle platoon seat is vacant.
    team.filter(Boolean).forEach(seat);
    for (let i=0; i<size; i++) if (!team[i]) {
      const want = lowLeft === left || (lowLeft > 0 && random()*left < lowLeft) ? low : high;
      // Independent sides, equal tier counts. Use each distinct model before
      // repeats (only seven tier-Is exist); among them prefer unrepresented nations.
      let best = Infinity, choices = [];
      for (const t of pool) if (t.tier === want) {
        const score = (size+1)*count(models,t.id) + count(nations,t.nat);
        if (score < best) { best = score; choices = []; }
        if (score === best) choices.push(t.id);
      }
      seat(team[i] = choices[Math.floor(random()*choices.length)]);
    }
    return team;
  }
  const allies = deal(seats), enemies = deal([]);
  if (enemies.every(id => allies.includes(id))) {
    // Avoid mirrored lists when a reserve exists, without widening the match,
    // changing the tier split or losing a represented nation.
    for (const t of pool) if (!allies.includes(t.id)) {
      const i = enemies.findIndex(id => DB[id].tier === t.tier && (DB[id].nat === t.nat ||
        enemies.filter(other => DB[other].nat === DB[id].nat).length > 1));
      if (i >= 0) { enemies[i] = t.id; break; }
    }
  }
  return [allies, enemies];
}
async function launchBattle(teamSize, net = null) {
  if (GameState.gameActive || battleLaunch || !GameState.owned.includes(GameState.selected)) return false;
  AudioSystem.stopPreview();AudioSystem.unlock(); // before awaiting local meshes (mobile gesture gate)
  const ticket = (battleLaunch = new AbortController());
  GarageViewer.suspend();
  battleNotice('Выезд на позицию', 'Готовим модели и местность…');
  try {
    BattleView.open(() =>
      battleFailed('Графический контекст потерян. Вернитесь в ангар и запустите бой снова.')
    );
    const g = GameState,
      training = teamSize === 1;
    const map = net?.room.map || document.getElementById('map-select').value;
    const arena = BattleMaps.create(map),
      navigation = new BattleNavigation(arena);
    const playerId = net ? net.drivers.get(net.me).tank : g.selected;
    if (!g.owned.includes(playerId)) throw Error('Машина больше не в ангаре.');
    const teams = net ? net.teams : training ? [[playerId], [document.getElementById('enemy-select').value]] : makeRosters(playerId, teamSize);
    const formation = battleFormation(arena, navigation, teams, net?.drivers);
    // Load only unique meshes, four at a time even with two different 15-vehicle teams.
    const assets = new Map(),
      ids = [...new Set(formation.map((slot) => modelKey(slot.id)))];
    for (let i = 0; i < ids.length; i += 4) {
      if (ticket.signal.aborted) return false;
      await Promise.all(
        ids.slice(i, i + 4).map(async (id) => assets.set(id, await BattleModels.load(id, ticket.signal)))
      );
    }
    if (ticket.signal.aborted) return false;
    g.training = training;
    g.battleDmg = g.battleKills = g.battleKillXP = 0;
    g.bullets = [];
    g.tracks = [];
    g.particles = [];
    g.casings = [];
    g.consumables = Array(6).fill(false);
    g.adrenalineActive = g.fuelBoostActive = g.paiokActive = false;
    g.shakeTimer = 0;
    BattleClock.reset();
    CombatMechanics.smokeClouds = [];
    CombatMechanics.artilleryStrikes = [];
    g.arena = arena;
    g.navigation = navigation;
    g.walls = arena.walls;
    g.terrainZones = arena.zones;
    WeatherEngine.initWeatherForBattle(arena, net?.random);
    g.platoon = net;
    g.units = formation.map((slot, index) => {
      const driver = net?.drivers.get(index);
      const mine = index === (net?.me ?? 0);
      const u = new Tank(
        slot.id,
        slot.x,
        slot.y,
        mine ? 'player' : slot.team === 'player' ? 'ally' : slot.team,
        driver ? {mod:getModBonuses(slot.id,driver.mods), upg:getUpgradeBonuses(slot.id,driver.upgrades)} : mine ? getAllBonuses(slot.id) : null
      );
      u.angle = u.tAngle = u.lookYaw = slot.angle;
      u.modelAsset = assets.get(modelKey(slot.id));
      TrackDrive.place(u);
      u.practiceTarget = !!slot.practice;
      u.visible = slot.team !== 'enemy' || training;
      if (driver) { u.driverSeat = index; u.callsign = driver.nick; u.fieldKit = {}; }
      else if (mine) u.callsign = Accounts.callsign;
      else if (!u.practiceTarget) BotAI.attach(u, slot, navigation);
      return u;
    });
    g.player = g.units[net?.me ?? 0];
    navigation.recon?.sample(g.units, 0);
    updateScale();
    const drum = g.player.usesMagazine;
    document.body.classList.toggle('drum-equipped', drum);
    document.body.classList.toggle('spg-equipped', g.player.isSPG);
    document.getElementById('scope-btn').textContent = g.player.isSPG ? 'Арт-прицел' : 'Прицел';
    ShellUI.start(g.player);
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
      `СЕКТОР ${arena.spec.sector}  /  ${net ? 'ВЗВОД · 7 × 7' : training ? 'ТРЕНИРОВКА' : teamSize + ' × ' + teamSize}`;
    document.getElementById('combat-map').textContent = arena.spec.name;
    document.getElementById('combat-tank').textContent = DB[playerId].n;
    const nameplate = document.getElementById('combat-callsign');
    nameplate.hidden = !g.player.callsign; nameplate.textContent = g.player.callsign || '';
    if (net) battleNotice('Сбор взвода', 'Местность готова. Ждём загрузки остальных участников…');
    else beginSortie();
    return true;
  } catch (error) {
    if (!ticket.signal.aborted) battleFailed(error.message || 'Не удалось открыть поле боя.');
    return false;
  } finally {
    if (battleLaunch === ticket) battleLaunch = null;
  }
}

// For a platoon, all drivers must have loaded their assets AND joined their private
// channels. Waiting at the barrier (or a failed partner load) never spends a rental.
function beginSortie() {
  const g = GameState, playerId = g.player.id;
  document.getElementById('battle-notice').hidden = true;
  g.gameActive = true;
  updateScoreboard();
  updateHUD();
  startPerfMonitor();
  BattleInput.begin();
  startBattleLoop();
  // Count a successfully launched match, not a click, failed load, result or exit.
  // Persist now so closing the tab cannot refund it. The fourth match plays normally.
  if (HangarSlots.useRentalBattle(playerId)) {
    g.player.rented = true;
    saveProgress();
  }
}

// ========== КОНЕЦ БОЯ ==========
function endBattle(won) {
  if (!GameState.gameActive) return;
  GameState.gameActive = false;
  BattleInput.end();
  if (tutorialPollHandle !== null) closeTutorial();
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
  // The per-kill tier award isn't multiplied by the consumable XP booster. It is
  // battle XP, though: settle it once, with the tree bonus, for solo and platoon alike.
  xpReward = Math.floor(xpReward * xpMul) + GameState.battleKillXP;
  let goldReward = Math.floor((won ? 50 : 10) * goldMul);
  const tree = TreeEvent.settle(GameState, { silver, xp:xpReward, gold:goldReward });
  const nationalBox = nationalVictoryBox(GameState, won);
  silver += tree.extra.silver; xpReward += tree.extra.xp; goldReward += tree.extra.gold;

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

  if (GameState.player?.rented) {
    const term = HangarSlots.rentalTerm(GameState.player.id);
    boostInfo += '<br>' + (term ? `Остаток аренды: ${term}.` : `Аренда ${DB[GameState.player.id].n} завершена.`);
  }

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

  const {silver:s, xp:x, gold:g} = tree.extra;
  document.getElementById('result-tree').textContent = [
    (s || x || g) ? `В награду вошёл бонус ёлки: +${s} ₽, +${x} XP, +${g} G.` : '',
    nationalBox ? `За победу получен «${CONTAINERS[nationalBox].name}». Откройте его в инвентаре.` : '',
    GameState.training ? 'В тренировке и обучении контейнеры не выдаются.' :
    tree.dropped ? 'Получен ёлочный ларец! Откройте его в ангаре → «Ёлка».' : `Ёлочный ларец не выпал (шанс ${tree.chance}%).`
  ].filter(Boolean).join(' ');
  updateInvCount(); updateBoosterUI();
}

function backToGarage() {
  if (typeof Platoons !== 'undefined') Platoons.detach();
  GameState.platoon = null;
  document.body.classList.remove('drum-equipped', 'spg-equipped');
  if (battleLaunch) {
    battleLaunch.abort();
    battleLaunch = null;
  }
  GameState.gameActive = false;
  stopBattleLoop();
  BattleInput.end();
  if (tutorialPollHandle !== null) closeTutorial();
  stopPerfMonitor();
  BattleView.dispose();
  GameState.aim = { x: 0, y: 0, h: 0 };
  if (GameState.player?.calibration) GameState.curShell = 0; // KPz slots are a different loadout
  GameState.player = null;
  GameState.units = [];
  GameState.arena = GameState.navigation = null;
  GameState.walls = [];
  GameState.terrainZones = [];
  WeatherEngine.waterBodies = [];
  WeatherEngine.ground = null;
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
  WinterSeason.refresh(true);
}

function leaveBattle() {
  if (GameState.gameActive && confirm(GameState.platoon ? 'Покинуть взвод? Общий бой завершится для всех без награды.' : 'Выйти в ангар без награды за бой?')) backToGarage();
}

// ========== ЭФФЕКТЫ ==========
function spawnParticles(x, y, color, count, speed, life, h = surfaceHeight(x, y) + 4) {
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

function sparks(x, y, h) {
  spawnParticles(x, y, '#ffcc00', 6, 4, 15, h);
  spawnParticles(x, y, '#fff', 3, 3, 10, h);
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
