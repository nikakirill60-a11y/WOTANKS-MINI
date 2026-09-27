// js/waffentrager.js
// ========== СОБЫТИЕ: ВАФФЕНТРАГЕР (1 vs 10) ==========
console.log('⚡ waffentrager.js загружен');

var WT_STATE = {
  active: false,
  role: 'hound', // 'boss' | 'hound'
  houndTankId: 'T55_THUNDER',
  boss: null,
  hounds: [],
  sentinels: [],
  generators: [],
  plasmaDrops: [],
  energyLevel: 1,
  shieldOverloaded: false,
  shieldTimer: 0,
  matchTimer: 360, // 6 минут
  matchStart: 0,
  playerLives: 3,
  teamRespawns: 15,
  empCooldown: 0,
  teleportCooldown: 0,
  turboCooldown: 0,
  repairCooldown: 0,
  turboActive: false,
  turboTimer: 0,
  empWave: null // { x, y, r, maxR, life }
};

// Генераторы плазмы на карте
var GENERATOR_LOCATIONS = [
  { id: 1, name: "Альфа", x: -800, y: -600, overloaded: false, cooldown: 0 },
  { id: 2, name: "Бета",  x: 0,    y: 700,  overloaded: false, cooldown: 0 },
  { id: 3, name: "Гамма", x: 800,  y: -600, overloaded: false, cooldown: 0 }
];

// ========== ОТКРЫТИЕ МОДАЛКИ ИВЕНТА ==========
function showWaffentragerModal() {
  var modal = document.getElementById('waffentrager-modal');
  if (modal) {
    modal.classList.add('show');
    selectWTRole('random');
  }
}

function closeWaffentragerModal() {
  var modal = document.getElementById('waffentrager-modal');
  if (modal) modal.classList.remove('show');
}

var selectedWTRole = 'random';
var selectedWTHound = 'T55_THUNDER';

function selectWTRole(role) {
  selectedWTRole = role;
  document.querySelectorAll('.wt-role-card').forEach(function(c) {
    c.classList.remove('selected');
  });
  var target = document.getElementById('wt-role-' + role);
  if (target) target.classList.add('selected');
  
  var houndSelect = document.getElementById('wt-hound-picker');
  if (houndSelect) {
    houndSelect.style.display = (role === 'hound' || role === 'random') ? 'block' : 'none';
  }
}

function selectWTHound(houndId) {
  selectedWTHound = houndId;
  document.querySelectorAll('.wt-hound-card').forEach(function(c) {
    c.classList.remove('selected');
  });
  var target = document.getElementById('wt-hound-' + houndId);
  if (target) target.classList.add('selected');
}

// ========== СТАРТ БОЯ ВАФФЕНТРАГЕР ==========
function startWaffentragerEventBattle() {
  closeWaffentragerModal();
  
  var actualRole = selectedWTRole;
  if (actualRole === 'random') {
    actualRole = (Math.random() < 0.25) ? 'boss' : 'hound';
  }
  
  // Если у игрока есть WT_E220 в аренде или во владении и он выбрал босса, предлагаем E 220
  var bossId = 'WT_E110';
  if (GameState.owned.indexOf('WT_E220') !== -1) {
    bossId = 'WT_E220';
  }

  startWaffentragerBattle(actualRole, selectedWTHound, bossId);
}

function startWaffentragerBattle(role, houndTankId, bossId) {
  console.log('⚡ Запуск ивента Ваффентрагер, роль:', role, 'Гончая:', houndTankId, 'Босс:', bossId);
  
  GameState.gameActive = true;
  GameState.waffentragerMode = true;
  GameState.battleDmg = 0;
  GameState.battleKills = 0;
  GameState.curMap = 'city';
  GameState.consumables = [false, false, false, false, false, false];
  GameState.adrenalineActive = false;
  GameState.fuelBoostActive = false;
  GameState.paiokActive = false;

  WT_STATE.active = true;
  WT_STATE.role = role;
  WT_STATE.houndTankId = houndTankId || 'T55_THUNDER';
  WT_STATE.energyLevel = 1;
  WT_STATE.shieldOverloaded = false;
  WT_STATE.shieldTimer = 0;
  WT_STATE.matchTimer = 360;
  WT_STATE.matchStart = Date.now();
  WT_STATE.playerLives = (role === 'boss') ? 1 : 3;
  WT_STATE.teamRespawns = 15;
  WT_STATE.empCooldown = 0;
  WT_STATE.teleportCooldown = 0;
  WT_STATE.turboCooldown = 0;
  WT_STATE.repairCooldown = 0;
  WT_STATE.turboActive = false;
  WT_STATE.plasmaDrops = [];
  WT_STATE.empWave = null;

  // Сброс генераторов
  WT_STATE.generators = GENERATOR_LOCATIONS.map(function(g) {
    return { id: g.id, name: g.name, x: g.x, y: g.y, overloaded: false, cooldown: 0 };
  });

  document.querySelectorAll('.cons-btn').forEach(function(b) { b.classList.remove('used'); b.classList.add('ready'); });
  document.querySelectorAll('.m-cons').forEach(function(b) { b.classList.remove('used'); });

  var uiEl = document.getElementById('ui');
  if (uiEl) uiEl.style.display = 'none';
  var hudEl = document.getElementById('hud');
  if (hudEl) hudEl.style.display = 'block';
  var rsEl = document.getElementById('result-screen');
  if (rsEl && rsEl.classList) rsEl.classList.remove('show');

  // Показываем HUD Ваффентрагера
  var wtHud = document.getElementById('wt-hud');
  if (wtHud) wtHud.style.display = 'block';

  var mcEl = document.getElementById('mobile-controls');
  if (mcEl && mcEl.classList) {
    if (GameState.controlMode === 'mobile') mcEl.classList.add('show');
    else mcEl.classList.remove('show');
  }
  if (typeof startPerfMonitor === 'function') startPerfMonitor();

  GameState.bullets = [];
  GameState.particles = [];
  GameState.tracks = [];
  if (typeof setupWalls === 'function') setupWalls('city');
  if (typeof setupTerrain === 'function') setupTerrain('city');

  var allHoundIds = ['T55_THUNDER', 'RESISTOR_140', 'THUNDERBOLT_PATTON', 'FOUDRE_BC', 'JISKRA_TVP'];

  if (role === 'boss') {
    // ИГРОК = БОСС
    var playerBossId = bossId || 'WT_E110';
    var bonuses = (typeof getAllBonuses === 'function') ? getAllBonuses(playerBossId) : null;
    GameState.player = new Tank(playerBossId, 0, 0, 'player', bonuses);
    GameState.player.shieldActive = true;
    GameState.player.customType = (playerBossId === 'WT_E220') ? 'wte220' : 'wte110';
    GameState.units = [GameState.player];
    WT_STATE.boss = GameState.player;

    // Спавним 10 Гончих противников
    WT_STATE.hounds = [];
    for (var i = 0; i < 10; i++) {
      var hid = allHoundIds[i % allHoundIds.length];
      var angle = (i / 10) * Math.PI * 2;
      var dist = 1100 + Math.random() * 300;
      var hx = Math.cos(angle) * dist;
      var hy = Math.sin(angle) * dist;
      var hound = new Tank(hid, hx, hy, 'enemy');
      hound.angle = angle + Math.PI;
      hound.customType = DB[hid].customType || 'hound_t55';
      hound.houndIndex = i;
      hound.respawnTimer = 0;
      hound.hasPlasma = false;
      GameState.units.push(hound);
      WT_STATE.hounds.push(hound);
    }

    // Спавним Часовых у генераторов
    WT_STATE.sentinels = [];
    WT_STATE.generators.forEach(function(gen, idx) {
      for (var si = 0; si < 2; si++) {
        var sx = gen.x + (si === 0 ? -60 : 60);
        var sy = gen.y + (si === 0 ? -60 : 60);
        var sentinel = new Tank('SENTINEL_BOT', sx, sy, 'ally');
        sentinel.customType = 'sentinel';
        sentinel.guardGenId = gen.id;
        GameState.units.push(sentinel);
        WT_STATE.sentinels.push(sentinel);
      }
    });

    crewMsg("⚡ ВЫ — BLITZTRÄGER! УНИЧТОЖЬТЕ ГОНЧИХ!", "#00e5ff");
  } else {
    // ИГРОК = ГОНЧАЯ
    var chosenHound = houndTankId || 'T55_THUNDER';
    var pBonuses = (typeof getAllBonuses === 'function') ? getAllBonuses(chosenHound) : null;
    GameState.player = new Tank(chosenHound, -1100, 0, 'player', pBonuses);
    GameState.player.customType = DB[chosenHound].customType || 'hound_t55';
    GameState.player.hasPlasma = false;
    GameState.player.lives = 3;
    GameState.units = [GameState.player];

    // Спавним 9 союзных Гончих
    WT_STATE.hounds = [GameState.player];
    for (var j = 1; j < 10; j++) {
      var hid2 = allHoundIds[j % allHoundIds.length];
      var ax = -1100 + (Math.random() - 0.5) * 300;
      var ay = -500 + (j * 110);
      var allyHound = new Tank(hid2, ax, ay, 'ally');
      allyHound.customType = DB[hid2].customType || 'hound_t55';
      allyHound.houndIndex = j;
      allyHound.respawnTimer = 0;
      allyHound.hasPlasma = false;
      GameState.units.push(allyHound);
      WT_STATE.hounds.push(allyHound);
    }

    // Спавним Босса
    var targetBossId = bossId || 'WT_E110';
    var boss = new Tank(targetBossId, 200, 0, 'enemy');
    boss.shieldActive = true;
    boss.customType = (targetBossId === 'WT_E220') ? 'wte220' : 'wte110';
    GameState.units.push(boss);
    WT_STATE.boss = boss;

    // Спавним Часовых фон Кригера у генераторов
    WT_STATE.sentinels = [];
    WT_STATE.generators.forEach(function(gen, idx) {
      for (var si2 = 0; si2 < 2; si2++) {
        var sx2 = gen.x + (si2 === 0 ? -60 : 60);
        var sy2 = gen.y + (si2 === 0 ? -60 : 60);
        var sentinel2 = new Tank('SENTINEL_BOT', sx2, sy2, 'enemy');
        sentinel2.customType = 'sentinel';
        sentinel2.guardGenId = gen.id;
        GameState.units.push(sentinel2);
        WT_STATE.sentinels.push(sentinel2);
      }
    });

    crewMsg("🐺 АЛЬЯНС: УНИЧТОЖАЙТЕ ЧАСОВЫХ, ВЕЗИТЕ ПЛАЗМУ К ГЕНЕРАТОРАМ!", "#3498db");
  }

  updateScoreboard();
}

// ========== ОБНОВЛЕНИЕ ИВЕНТА В ИГРОВОМ ЦИКЛЕ ==========
function updateWaffentrager() {
  if (!WT_STATE.active || !GameState.gameActive) return;

  var now = Date.now();
  var p = GameState.player;
  if (!p) return;

  // Таймер матча
  var elapsed = Math.floor((now - WT_STATE.matchStart) / 1000);
  WT_STATE.matchTimer = Math.max(0, 360 - elapsed);
  if (WT_STATE.matchTimer <= 0) {
    // Время вышло: победа Босса
    var bossWon = (WT_STATE.role === 'boss');
    endWaffentragerBattle(bossWon);
    return;
  }

  // Проверка состояния щита Босса
  if (WT_STATE.shieldOverloaded) {
    if (now >= WT_STATE.shieldTimer) {
      WT_STATE.shieldOverloaded = false;
      if (WT_STATE.boss) WT_STATE.boss.shieldActive = true;
      crewMsg("⚡ ЩИТ BLITZTRÄGER СНОВА АКТИВЕН!", "#00e5ff");
      if (typeof snd === 'function') snd('hit');
    }
  }

  // Турбо-ускоритель
  if (WT_STATE.turboActive && now >= WT_STATE.turboTimer) {
    WT_STATE.turboActive = false;
    p.baseSpeed = (DB[p.id] ? DB[p.id].moveSpeed || 2.5 : 2.5);
  }

  // Расширение ЭМИ-волны
  if (WT_STATE.empWave) {
    WT_STATE.empWave.r += 12;
    WT_STATE.empWave.life--;
    if (WT_STATE.empWave.r >= WT_STATE.empWave.maxR || WT_STATE.empWave.life <= 0) {
      WT_STATE.empWave = null;
    }
  }

  // 1. Проверка подбора выпавшей Плазмы
  for (var pi = WT_STATE.plasmaDrops.length - 1; pi >= 0; pi--) {
    var drop = WT_STATE.plasmaDrops[pi];
    if (!drop.active) continue;

    for (var ui = 0; ui < GameState.units.length; ui++) {
      var unit = GameState.units[ui];
      if (unit.dead) continue;
      // Плазму могут подбирать только Гончие (любой игрок/бот с team != boss)
      var isBossUnit = (unit === WT_STATE.boss);
      if (!isBossUnit && !unit.hasPlasma && Math.hypot(unit.x - drop.x, unit.y - drop.y) < 55) {
        unit.hasPlasma = true;
        drop.active = false;
        WT_STATE.plasmaDrops.splice(pi, 1);
        spawnParticles(unit.x, unit.y, '#00ffff', 25, 4, 30);
        if (typeof snd === 'function') snd('hit');
        if (unit === p) {
          crewMsg("⚡ ВЫ ПОДОБРАЛИ ПЛАЗМУ! ВЕЗИТЕ К ГЕНЕРАТОРУ!", "#00ffff");
        } else {
          crewMsg("⚡ Союзник подобрал Плазму!", "#3498db");
        }
        break;
      }
    }
  }

  // 2. Проверка доставки Плазмы к Генератору
  WT_STATE.generators.forEach(function(gen) {
    if (gen.cooldown > now) return;

    for (var ui2 = 0; ui2 < GameState.units.length; ui2++) {
      var carrier = GameState.units[ui2];
      if (carrier.dead || !carrier.hasPlasma) continue;

      if (Math.hypot(carrier.x - gen.x, carrier.y - gen.y) < 90) {
        // ДОСТАВКА СОСТОЯЛАСЬ!
        carrier.hasPlasma = false;
        gen.overloaded = true;
        gen.cooldown = now + 45000; // 45 сек перезарядка генератора

        WT_STATE.shieldOverloaded = true;
        WT_STATE.shieldTimer = now + 30000; // 30 сек без щита
        if (WT_STATE.boss) WT_STATE.boss.shieldActive = false;

        WT_STATE.energyLevel = Math.min(5, WT_STATE.energyLevel + 1);

        // Вспышка на генераторе
        for (var ep = 0; ep < 40; ep++) {
          spawnParticles(gen.x, gen.y, '#00e5ff', 30, 7, 45);
          spawnParticles(gen.x, gen.y, '#ffffff', 20, 5, 30);
        }
        boom(gen.x, gen.y);
        if (typeof snd === 'function') snd('boom');

        if (carrier === p) {
          GameState.XP += 2000;
          GameState.SILVER += 25000;
          crewMsg("🎉 ГЕНЕРАТОР ПЕРЕГРУЖЕН! ЩИТ БОССА СНЯТ НА 30 СЕК! (Уровень " + WT_STATE.energyLevel + ")", "#f1c40f");
        } else {
          crewMsg("⚡ Генератор " + gen.name + " перегружен! Щит Босса снят на 30 сек!", "#2ecc71");
        }
      }
    }
  });

  // 3. Возрождение Гончих
  WT_STATE.hounds.forEach(function(hound) {
    if (hound.dead && hound !== p) {
      if (!hound.respawnTimer) hound.respawnTimer = now + 8000;
      if (now >= hound.respawnTimer && WT_STATE.teamRespawns > 0) {
        WT_STATE.teamRespawns--;
        hound.dead = false;
        hound.hp = hound.maxHp;
        hound.x = -1100 + (Math.random() - 0.5) * 400;
        hound.y = -600 + Math.random() * 1200;
        hound.respawnTimer = 0;
        hound.hasPlasma = false;
        spawnParticles(hound.x, hound.y, '#3498db', 20, 4, 30);
      }
    }
  });

  // Если погиб игрок-Гончая
  if (WT_STATE.role === 'hound' && p.dead) {
    if (WT_STATE.playerLives > 1) {
      WT_STATE.playerLives--;
      p.dead = false;
      p.hp = p.maxHp;
      p.x = -1100 + (Math.random() - 0.5) * 300;
      p.y = -400 + Math.random() * 800;
      p.hasPlasma = false;
      spawnParticles(p.x, p.y, '#2ecc71', 30, 5, 40);
      crewMsg("🛡️ ВОЗРОЖДЕНИЕ! Осталось жизней: " + WT_STATE.playerLives, "#2ecc71");
    } else {
      endWaffentragerBattle(false);
      return;
    }
  }

  // 4. Проверка уничтожения Босса (Победа Гончих)
  if (WT_STATE.boss && WT_STATE.boss.dead) {
    var houndsWon = (WT_STATE.role === 'hound');
    endWaffentragerBattle(houndsWon);
    return;
  }

  // 5. ИИ Босса (когда игрок — Гончая)
  if (WT_STATE.role === 'hound' && WT_STATE.boss && !WT_STATE.boss.dead && !WT_STATE.boss.isPlayer) {
    updateBossAI(WT_STATE.boss, now);
  }

  updateWTHUD();
}

// ========== ИИ БОССА ==========
function updateBossAI(boss, now) {
  if (!boss.aiActionTimer || now > boss.aiActionTimer) {
    boss.aiActionTimer = now + 3000 + Math.random() * 2000;

    // Использование ЭМИ если рядом много врагов
    var nearbyHounds = 0;
    WT_STATE.hounds.forEach(function(h) {
      if (!h.dead && Math.hypot(h.x - boss.x, h.y - boss.y) < 320) nearbyHounds++;
    });

    if (nearbyHounds >= 2 && now >= WT_STATE.empCooldown) {
      useWaffentragerAbility('emp', boss);
    }

    // Телепортация к генератору с плазмой
    if (now >= WT_STATE.teleportCooldown && Math.random() < 0.4) {
      var targetGen = WT_STATE.generators[Math.floor(Math.random() * WT_STATE.generators.length)];
      if (targetGen) {
        useWaffentragerAbility('teleport', boss, targetGen.x, targetGen.y);
      }
    }
  }
}

// ========== СПОСОБНОСТИ ВАФФЕНТРАГЕРА ==========
function useWaffentragerAbility(type, customCaster, targetX, targetY) {
  var now = Date.now();
  var caster = customCaster || GameState.player;
  if (!caster || caster.dead) return;

  if (type === 'emp') {
    if (now < WT_STATE.empCooldown && !customCaster) {
      crewMsg("⏳ ЭМИ перезаряжается!", "#aaa");
      return;
    }
    WT_STATE.empCooldown = now + 25000;

    WT_STATE.empWave = { x: caster.x, y: caster.y, r: 20, maxR: 320, life: 30 };
    if (typeof snd === 'function') snd('boom');

    // Наносим урон и оглушаем всех врагов вокруг
    for (var i = 0; i < GameState.units.length; i++) {
      var target = GameState.units[i];
      if (target.dead || target.team === caster.team) continue;
      if (Math.hypot(target.x - caster.x, target.y - caster.y) <= 320) {
        var empDmg = 400;
        target.hp -= empDmg;
        target.trackBroken = true;
        if (target.critTimers) target.critTimers.engine = now + 5000;
        spawnParticles(target.x, target.y, '#00e5ff', 20, 5, 25);
        if (target === GameState.player) {
          dmgLog('⚡ ЭМИ: -' + empDmg, '#00e5ff');
          crewMsg("⚡ ЭМИ-УДАР! Двигатель и гусеницы повреждены!", "#ff4444");
        }
        if (target.hp <= 0) {
          target.dead = true;
          boom(target.x, target.y);
        }
      }
    }
    crewMsg("⚡ ЭМИ-УДАР АКТИВИРОВАН!", "#00e5ff");
  }
  else if (type === 'teleport') {
    if (now < WT_STATE.teleportCooldown && !customCaster) {
      crewMsg("⏳ Телепорт перезаряжается!", "#aaa");
      return;
    }
    WT_STATE.teleportCooldown = now + 35000;

    spawnParticles(caster.x, caster.y, '#00e5ff', 40, 6, 35);
    var destX = targetX !== undefined ? targetX : caster.x + Math.cos(caster.angle) * 450;
    var destY = targetY !== undefined ? targetY : caster.y + Math.sin(caster.angle) * 450;
    caster.x = destX;
    caster.y = destY;
    spawnParticles(caster.x, caster.y, '#ffffff', 40, 6, 35);
    if (typeof snd === 'function') snd('hit');
    crewMsg("🌀 ТЕЛЕПОРТАЦИЯ!", "#00e5ff");
  }
  else if (type === 'turbo') {
    if (now < WT_STATE.turboCooldown) {
      crewMsg("⏳ Форсаж перезаряжается!", "#aaa");
      return;
    }
    WT_STATE.turboCooldown = now + 16000;
    WT_STATE.turboActive = true;
    WT_STATE.turboTimer = now + 6000;
    caster.baseSpeed *= 1.65;
    spawnParticles(caster.x, caster.y, '#3498db', 25, 4, 20);
    crewMsg("🚀 ГИПЕР-ФОРСАЖ!", "#3498db");
  }
  else if (type === 'repair') {
    if (now < WT_STATE.repairCooldown) {
      crewMsg("⏳ Ремонт перезаряжается!", "#aaa");
      return;
    }
    WT_STATE.repairCooldown = now + 25000;

    for (var j = 0; j < GameState.units.length; j++) {
      var ally = GameState.units[j];
      if (ally.dead || ally.team !== caster.team) continue;
      if (Math.hypot(ally.x - caster.x, ally.y - caster.y) <= 220) {
        var heal = 450;
        ally.hp = Math.min(ally.maxHp, ally.hp + heal);
        ally.trackBroken = false;
        spawnParticles(ally.x, ally.y, '#2ecc71', 20, 3, 25);
        if (ally === GameState.player) {
          dmgLog('💚 +' + heal, '#2ecc71');
          crewMsg("🔧 РЕМОНТНЫЙ КРУГ АКТИВИРОВАН!", "#2ecc71");
        }
      }
    }
  }
}

// ========== ОТРИСОВКА ЭЛЕМЕНТОВ ИВЕНТА ==========
function drawWaffentrager(ctx, cam) {
  if (!WT_STATE.active) return;

  var now = Date.now();

  // 1. Отрисовка Генераторов
  WT_STATE.generators.forEach(function(gen) {
    var gx = gen.x - cam.x;
    var gy = gen.y - cam.y;

    // Зона генератора
    ctx.save();
    ctx.beginPath();
    ctx.arc(gx, gy, 85, 0, Math.PI * 2);
    ctx.fillStyle = gen.overloaded ? 'rgba(0, 229, 255, 0.08)' : 'rgba(231, 76, 60, 0.08)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = gen.overloaded ? 'rgba(0, 229, 255, 0.4)' : 'rgba(231, 76, 60, 0.4)';
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();

    // Тело генератора
    ctx.fillStyle = "#222";
    ctx.fillRect(gx - 25, gy - 25, 50, 50);
    ctx.strokeStyle = gen.overloaded ? "#00e5ff" : "#e74c3c";
    ctx.lineWidth = 3;
    ctx.strokeRect(gx - 25, gy - 25, 50, 50);

    // Вращающийся/пульсирующий кристалл плазмы в центре
    var pulse = Math.sin(now * 0.005) * 4;
    ctx.fillStyle = gen.overloaded ? "#00e5ff" : "#ff3333";
    ctx.beginPath();
    ctx.arc(gx, gy, 12 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Подпись
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("⚡ " + gen.name + (gen.overloaded ? " [ПЕРЕГРУЖЕН]" : " [АКТИВЕН]"), gx, gy - 35);
  });

  // 2. Отрисовка выпавшей Плазмы
  WT_STATE.plasmaDrops.forEach(function(drop) {
    if (!drop.active) return;
    var px = drop.x - cam.x;
    var py = drop.y - cam.y;

    ctx.save();
    var pGlow = Math.sin(now * 0.01) * 6;
    ctx.beginPath();
    ctx.arc(px, py, 18 + pGlow, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 229, 255, 0.25)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  });

  // 3. Отрисовка ЭМИ-волны
  if (WT_STATE.empWave) {
    var ew = WT_STATE.empWave;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ew.x - cam.x, ew.y - cam.y, ew.r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 229, 255, " + (ew.life / 30) + ")";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }
}

// ========== КАСТОМНАЯ ОТРИСОВКА ТАНКОВ ==========
function drawCustomTank(tank, ctx) {
  var cam = GameState.cam;
  var s = tank.s;
  var now = Date.now();

  ctx.save();
  ctx.translate(tank.x - cam.x, tank.y - cam.y);

  // 1. Полоска HP и имя
  if (!tank.dead) {
    ctx.fillStyle = "#441111";
    ctx.fillRect(-35 * s, -50 * s, 70 * s, 7 * s);
    ctx.fillStyle = tank.team === 'enemy' ? "#e74c3c" : "#2ecc71";
    ctx.fillRect(-35 * s, -50 * s, 70 * s * (tank.hp / tank.maxHp), 7 * s);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(-35 * s, -50 * s, 70 * s, 7 * s);

    ctx.fillStyle = (tank.customType === 'wte220') ? "#f1c40f" : "#fff";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    var tag = (tank.customType === 'wte110' || tank.customType === 'wte220') ? "⚡ " :
              (tank.customType === 'sturmtiger') ? "💥 " :
              (tank.customType === 'sentinel') ? "🛡️ " : "🐺 ";
    ctx.fillText(tag + tank.name, 0, -55 * s);

    // Индикатор несущейся плазмы
    if (tank.hasPlasma) {
      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 11px Arial";
      ctx.fillText("⚡ НЕСЁТ ПЛАЗМУ!", 0, -70 * s);

      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, 45 * s, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 255, 0.7)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2. Силовой щит фон Кригера
  if (!tank.dead && tank.shieldActive) {
    ctx.save();
    var shieldPulse = Math.sin(now * 0.008) * 3;
    var shieldColor = (tank.customType === 'wte220') ? 'rgba(168, 85, 247, 0.35)' : 'rgba(0, 229, 255, 0.35)';
    var shieldBorder = (tank.customType === 'wte220') ? '#a855f7' : '#00e5ff';
    ctx.beginPath();
    ctx.arc(0, 0, 58 * s + shieldPulse, 0, Math.PI * 2);
    ctx.fillStyle = shieldColor;
    ctx.fill();
    ctx.strokeStyle = shieldBorder;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Искры на щите
    for (var si = 0; si < 3; si++) {
      var sAngle = (now * 0.003 + si * 2.1) % (Math.PI * 2);
      var sx = Math.cos(sAngle) * (58 * s);
      var sy = Math.sin(sAngle) * (58 * s);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Корпус
  ctx.save();
  ctx.rotate(tank.angle);

  if (tank.customType === 'wte110' || tank.customType === 'wte220') {
    // BLITZTRÄGER E 110 / E 220 (Фото 1 & 2)
    var is220 = (tank.customType === 'wte220');
    // Гусеницы
    ctx.fillStyle = "#111";
    ctx.fillRect(-45 * s, -22 * s, 90 * s, 9 * s);
    ctx.fillRect(-45 * s, 13 * s, 90 * s, 9 * s);

    // Корпус E 100
    ctx.fillStyle = tank.dead ? "#333" : (is220 ? "#2b1b3d" : "#222a30");
    ctx.fillRect(-40 * s, -17 * s, 80 * s, 34 * s);

    // Золотая окантовка для E 220
    if (is220 && !tank.dead) {
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-40 * s, -17 * s, 80 * s, 34 * s);
    }

    // 4 катушки Тесла по бокам корпуса
    var coilColor = is220 ? "#a855f7" : "#00e5ff";
    var coilPositions = [
      { x: -25 * s, y: -20 * s },
      { x: 20 * s,  y: -20 * s },
      { x: -25 * s, y: 20 * s },
      { x: 20 * s,  y: 20 * s }
    ];

    coilPositions.forEach(function(cp) {
      ctx.fillStyle = "#333";
      ctx.fillRect(cp.x - 4 * s, cp.y - 4 * s, 8 * s, 8 * s);
      if (!tank.dead) {
        ctx.fillStyle = coilColor;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 4 * s + Math.sin(now * 0.01) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

  } else if (tank.customType === 'sturmtiger') {
    // STURMTIGER (Фото 3)
    // Гусеницы Tiger I
    ctx.fillStyle = "#111";
    ctx.fillRect(-35 * s, -20 * s, 70 * s, 8 * s);
    ctx.fillRect(-35 * s, 12 * s, 70 * s, 8 * s);

    // Корпус
    ctx.fillStyle = tank.dead ? "#333" : "#4a4235";
    ctx.fillRect(-30 * s, -15 * s, 60 * s, 30 * s);

    // Массивная наклонная лобовая рубка
    ctx.fillStyle = tank.dead ? "#444" : "#5a5040";
    ctx.beginPath();
    ctx.moveTo(-20 * s, -14 * s);
    ctx.lineTo(25 * s, -12 * s);
    ctx.lineTo(25 * s, 12 * s);
    ctx.lineTo(-20 * s, 14 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2e2820";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Кран подачи 380-мм ракет на корме
    ctx.fillStyle = "#222";
    ctx.fillRect(-26 * s, -4 * s, 8 * s, 8 * s);
    ctx.fillRect(-24 * s, -2 * s, 12 * s, 4 * s);

  } else if (tank.customType === 'gepard') {
    // E 50 GEPARD
    ctx.fillStyle = "#111";
    ctx.fillRect(-36 * s, -18 * s, 72 * s, 7 * s);
    ctx.fillRect(-36 * s, 11 * s, 72 * s, 7 * s);

    ctx.fillStyle = tank.dead ? "#333" : "#1a2a3a";
    ctx.fillRect(-32 * s, -13 * s, 64 * s, 26 * s);

    if (!tank.dead) {
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(-32 * s, -13 * s, 64 * s, 26 * s);
    }
  } else {
    // ГОНЧИЕ / ЧАСОВЫЕ
    var isSentinel = (tank.customType === 'sentinel');
    ctx.fillStyle = "#111";
    ctx.fillRect(-30 * s, -16 * s, 60 * s, 6 * s);
    ctx.fillRect(-30 * s, 10 * s, 60 * s, 6 * s);

    ctx.fillStyle = tank.dead ? "#333" : (isSentinel ? "#4a2020" : "#243342");
    ctx.fillRect(-25 * s, -12 * s, 50 * s, 24 * s);

    if (!tank.dead && !isSentinel) {
      ctx.strokeStyle = "#3498db";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-25 * s, -12 * s, 50 * s, 24 * s);
    }
  }
  ctx.restore();

  // 4. Башня и Орудие
  if (!tank.dead) {
    ctx.save();
    ctx.translate(Math.cos(tank.angle) * tank.off * s, Math.sin(tank.angle) * tank.off * s);
    ctx.rotate(tank.isPT ? tank.angle : tank.tAngle);

    if (tank.customType === 'wte110' || tank.customType === 'wte220') {
      var is220Turret = (tank.customType === 'wte220');
      // Огромная рубка Ваффентрагера
      ctx.fillStyle = is220Turret ? "#382352" : "#2d3740";
      ctx.fillRect(-18 * s, -18 * s, 36 * s, 36 * s);
      ctx.strokeStyle = is220Turret ? "#ffd700" : "#00e5ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(-18 * s, -18 * s, 36 * s, 36 * s);

      // Плазменный рельсотрон / ствол с кольцами
      var gunColor = is220Turret ? "#553366" : "#222";
      var pColor = is220Turret ? "#a855f7" : "#00e5ff";
      ctx.fillStyle = gunColor;
      ctx.fillRect(10 * s, -5 * s, 48 * s, 10 * s);

      // Кольца индуктора
      for (var ri = 0; ri < 4; ri++) {
        ctx.fillStyle = pColor;
        ctx.fillRect((16 + ri * 9) * s, -7 * s, 4 * s, 14 * s);
      }

      // Дульный тормоз с искрами
      ctx.fillStyle = "#111";
      ctx.fillRect(58 * s, -8 * s, 12 * s, 16 * s);

      if (is220Turret) {
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 6px Arial";
        ctx.fillText("ACHTUNG", 25 * s, 3 * s);
      }

    } else if (tank.customType === 'sturmtiger') {
      // 380-мм мортира Штурмтигра
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(12 * s, 0, 11 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5a5040";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Срез ствола с нарезами
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(12 * s, 0, 7 * s, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Обычная башня Гончей
      ctx.fillStyle = (tank.customType === 'sentinel') ? "#6a2a2a" : "#34495e";
      ctx.fillRect(-12 * s, -12 * s, 24 * s, 24 * s);

      ctx.fillStyle = "#111";
      ctx.fillRect(8 * s, -3 * s, 32 * s, 6 * s);
    }

    ctx.restore();
  }

  ctx.restore();
}

// ========== HUD ИВЕНТА ==========
function updateWTHUD() {
  var hud = document.getElementById('wt-hud');
  if (!hud) return;

  var minutes = Math.floor(WT_STATE.matchTimer / 60);
  var seconds = WT_STATE.matchTimer % 60;
  var timeStr = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

  var timerEl = document.getElementById('wt-timer');
  if (timerEl) timerEl.innerText = timeStr;

  var shieldEl = document.getElementById('wt-shield-status');
  if (shieldEl) {
    if (WT_STATE.shieldOverloaded) {
      var rem = Math.max(0, Math.ceil((WT_STATE.shieldTimer - Date.now()) / 1000));
      shieldEl.innerHTML = '<span style="color:#e74c3c">⚠️ ЩИТ СНЯТ: ' + rem + 'с</span>';
    } else {
      shieldEl.innerHTML = '<span style="color:#00e5ff">🛡️ ЩИТ БОССА АКТИВЕН</span>';
    }
  }

  var energyEl = document.getElementById('wt-energy-level');
  if (energyEl) {
    energyEl.innerText = '⚡ Уровень энергии: x' + WT_STATE.energyLevel + ' (+' + ((WT_STATE.energyLevel - 1) * 25) + '% урона)';
  }

  // Кнопки способностей
  var now = Date.now();
  var empBtn = document.getElementById('wt-btn-emp');
  if (empBtn) {
    var empRem = Math.max(0, Math.ceil((WT_STATE.empCooldown - now) / 1000));
    empBtn.innerText = empRem > 0 ? '⚡ ЭМИ (' + empRem + 'с)' : '⚡ ЭМИ [E]';
    empBtn.disabled = empRem > 0;
  }

  var tpBtn = document.getElementById('wt-btn-tp');
  if (tpBtn) {
    var tpRem = Math.max(0, Math.ceil((WT_STATE.teleportCooldown - now) / 1000));
    tpBtn.innerText = tpRem > 0 ? '🌀 ТЕЛЕПОРТ (' + tpRem + 'с)' : '🌀 ТЕЛЕПОРТ [T]';
    tpBtn.disabled = tpRem > 0;
  }

  var turboBtn = document.getElementById('wt-btn-turbo');
  if (turboBtn) {
    var turRem = Math.max(0, Math.ceil((WT_STATE.turboCooldown - now) / 1000));
    turboBtn.innerText = turRem > 0 ? '🚀 ФОРСАЖ (' + turRem + 'с)' : '🚀 ФОРСАЖ [Shift]';
    turboBtn.disabled = turRem > 0;
  }

  var repBtn = document.getElementById('wt-btn-repair');
  if (repBtn) {
    var repRem = Math.max(0, Math.ceil((WT_STATE.repairCooldown - now) / 1000));
    repBtn.innerText = repRem > 0 ? '🔧 РЕМОНТ (' + repRem + 'с)' : '🔧 РЕМОНТ [R]';
    repBtn.disabled = repRem > 0;
  }
}

// ========== ЗАВЕРШЕНИЕ БОЯ ВАФФЕНТРАГЕР ==========
function endWaffentragerBattle(won) {
  GameState.gameActive = false;
  GameState.waffentragerMode = false;
  WT_STATE.active = false;

  var wtHud = document.getElementById('wt-hud');
  if (wtHud) wtHud.style.display = 'none';

  // Выдача зарядов: за победу от 1 до 3 зарядов!
  var chargesWon = won ? (Math.floor(Math.random() * 3) + 1) : (Math.random() < 0.3 ? 1 : 0);
  GameState.charges = (GameState.charges || 0) + chargesWon;

  var silverReward = won ? 50000 : 15000;
  var xpReward = won ? 2500 : 600;
  var goldReward = won ? 150 : 20;

  GameState.SILVER += silverReward;
  GameState.XP += xpReward;
  GameState.GOLD += goldReward;

  // Проверка аренды танков (например, WT_E220 по промокоду)
  var pTankId = GameState.player ? GameState.player.id : null;
  if (pTankId && GameState.rentalTanks && GameState.rentalTanks[pTankId]) {
    GameState.rentalTanks[pTankId]--;
    if (GameState.rentalTanks[pTankId] <= 0) {
      delete GameState.rentalTanks[pTankId];
      GameState.owned = GameState.owned.filter(function(id) { return id !== pTankId; });
      if (GameState.selected === pTankId) {
        GameState.selected = GameState.owned[0] || 'T26';
      }
      setTimeout(function() {
        alert("⚠️ Срок аренды " + (DB[pTankId] ? DB[pTankId].n : pTankId) + " завершён! Танк списан из ангара.");
      }, 600);
    }
  }

  updateResources();
  if (typeof saveProgress === 'function') saveProgress();

  var rsEl = document.getElementById('result-screen');
  if (rsEl && rsEl.classList) rsEl.classList.add('show');
  var rtEl = document.getElementById('result-title');
  if (rtEl) {
    rtEl.innerText = won ? "ПОБЕДА В СОБЫТИИ!" : "ПОРАЖЕНИЕ";
    rtEl.style.color = won ? "#00e5ff" : "#e74c3c";
  }

  var rstEl = document.getElementById('result-stats');
  if (rstEl) {
    rstEl.innerHTML =
      '⚡ <b>Заряды Ваффентрагер: +' + chargesWon + ' ⚡</b><br>' +
      'Урон: ' + Math.floor(GameState.battleDmg) + '<br>' +
      'Фрагов: ' + GameState.battleKills + '<br>' +
      'Серебро: +' + silverReward + ' ₽<br>' +
      'Опыт: +' + xpReward + ' XP<br>' +
      'Золото: +' + goldReward + ' G';
  }
}

// Экспорт в глобальную область
window.WT_STATE = WT_STATE;
window.showWaffentragerModal = showWaffentragerModal;
window.closeWaffentragerModal = closeWaffentragerModal;
window.selectWTRole = selectWTRole;
window.selectWTHound = selectWTHound;
window.startWaffentragerEventBattle = startWaffentragerEventBattle;
window.startWaffentragerBattle = startWaffentragerBattle;
window.updateWaffentrager = updateWaffentrager;
window.drawWaffentrager = drawWaffentrager;
window.drawCustomTank = drawCustomTank;
window.useWaffentragerAbility = useWaffentragerAbility;
window.endWaffentragerBattle = endWaffentragerBattle;