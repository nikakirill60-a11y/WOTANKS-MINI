// js/crew.js
// ========== ЭКИПАЖ И ПЕРКИ ==========
console.log('👨‍✈️ crew.js загружен');

var CREW_PERK_TRAIN_COST_BASE = 3000; // серебро за перк, умножается на perk.cost

function ensureCrew(tankId) {
  if (!GameState.crew[tankId]) {
    GameState.crew[tankId] = {};
    CONFIG.CREW_ROLES.forEach(function (role) {
      GameState.crew[tankId][role] = { xp: 0, level: 1, perks: [] };
    });
  }
  return GameState.crew[tankId];
}

// ========== ОПЫТ ЭКИПАЖА ==========
// Начисляется владельцу выстрела (только для игрока), делится поровну между
// тремя должностями.
function addCrewXP(shooter, amount) {
  if (!shooter || shooter.team !== 'player' || amount <= 0) return;
  var crew = ensureCrew(shooter.crewTankId);
  var per = amount / CONFIG.CREW_ROLES.length;
  CONFIG.CREW_ROLES.forEach(function (role) {
    var c = crew[role];
    c.xp += per;
    var need = c.level * CONFIG.CREW_XP_PER_LEVEL;
    while (c.xp >= need && c.level < CONFIG.CREW_MAX_LEVEL) {
      c.xp -= need;
      c.level++;
      need = c.level * CONFIG.CREW_XP_PER_LEVEL;
      if (shooter === GameState.player) crewMsg('👨‍✈️ ' + roleLabel(role) + ' повышен до ' + c.level + ' ур.!', '#3498db');
    }
  });
}

function roleLabel(role) {
  return role === 'commander' ? 'Командир' : role === 'driver' ? 'Механик' : 'Наводчик';
}

// ========== ЗНАЧЕНИЕ БОНУСА ОТ РАЗУЧЕННЫХ ПЕРКОВ ==========
function getCrewPerkValue(tankId, role, statName) {
  var crew = GameState.crew[tankId];
  if (!crew || !crew[role]) return 0;
  var total = 0;
  crew[role].perks.forEach(function (perkId) {
    var p = CONFIG.CREW_PERKS[perkId];
    if (p && p.role === role && p.stat === statName) total += p.value || 0;
  });
  return total;
}

function hasCrewPerk(tankId, role, perkId) {
  var crew = GameState.crew[tankId];
  return !!(crew && crew[role] && crew[role].perks.indexOf(perkId) !== -1);
}

// ========== ОБУЧЕНИЕ ПЕРКУ ==========
function trainPerk(tankId, perkId) {
  var perk = CONFIG.CREW_PERKS[perkId];
  if (!perk) return { success: false, error: 'Неизвестный перк' };
  var crew = ensureCrew(tankId);
  var roleCrew = crew[perk.role];

  if (roleCrew.perks.indexOf(perkId) !== -1) return { success: false, error: 'Уже изучен' };
  if (roleCrew.level < perk.reqLevel) return { success: false, error: 'Нужен ' + perk.reqLevel + ' уровень ' + roleLabel(perk.role).toLowerCase() + 'а' };

  var cost = CREW_PERK_TRAIN_COST_BASE * perk.cost;
  if (GameState.SILVER < cost) return { success: false, error: 'Недостаточно серебра (' + cost + '₽)' };

  GameState.SILVER -= cost;
  roleCrew.perks.push(perkId);
  saveProgress();
  updateResources();
  return { success: true };
}

// ========== ПРИМЕНЕНИЕ ПЕРКА "ШЕСТОЕ ЧУВСТВО" ==========
// Возвращает true, если игрок засветился врагу и у него разучен перк —
// main.js/ui.js могут вызывать это в updateHUD() для показа лампочки.
function checkSixthSense() {
  if (!GameState.player || GameState.player.dead) return false;
  if (!hasCrewPerk(GameState.player.crewTankId, 'commander', 'sixth_sense')) return false;
  return teamSees(GameState.player, 'enemy');
}

// ========== РЕНДЕР ПАНЕЛИ ЭКИПАЖА (ожидает #crew-panel-content) ==========
function renderCrewPanel(tankId) {
  var box = document.getElementById('crew-panel-content');
  if (!box) return;
  var crew = ensureCrew(tankId);
  box.innerHTML = '';

  CONFIG.CREW_ROLES.forEach(function (role) {
    var c = crew[role];
    var need = c.level * CONFIG.CREW_XP_PER_LEVEL;
    var block = document.createElement('div');
    block.className = 'crew-role-block';

    var perksHtml = '';
    for (var pid in CONFIG.CREW_PERKS) {
      var perk = CONFIG.CREW_PERKS[pid];
      if (perk.role !== role) continue;
      var learned = c.perks.indexOf(pid) !== -1;
      var locked = c.level < perk.reqLevel;
      var cost = CREW_PERK_TRAIN_COST_BASE * perk.cost;
      perksHtml +=
        '<div class="perk-card ' + (learned ? 'learned' : locked ? 'locked' : '') + '">' +
          '<div style="font-size:22px">' + perk.icon + '</div>' +
          '<div style="color:#fff;font-weight:bold;font-size:12px">' + perk.name + '</div>' +
          '<div style="color:#888;font-size:10px">' + perk.desc + '</div>' +
          (learned
            ? '<div style="color:#2ecc71;font-size:11px;margin-top:4px">✅ Изучен</div>'
            : locked
              ? '<div style="color:#e74c3c;font-size:10px;margin-top:4px">Нужен ' + perk.reqLevel + ' ур.</div>'
              : '<button class="btn" onclick="var r=trainPerk(\'' + tankId + '\',\'' + pid + '\'); if(!r.success)alert(r.error); else renderCrewPanel(\'' + tankId + '\');">Обучить (' + cost + '₽)</button>') +
        '</div>';
    }

    block.innerHTML =
      '<div class="crew-role-header"><span>' + roleLabel(role) + '</span><span>Ур. ' + c.level + '/' + CONFIG.CREW_MAX_LEVEL + '</span></div>' +
      '<div class="crew-xp-bar"><div class="crew-xp-fill" style="width:' + Math.min(100, c.xp / need * 100) + '%"></div></div>' +
      '<div style="white-space:nowrap;overflow-x:auto">' + perksHtml + '</div>';

    box.appendChild(block);
  });
}

window.ensureCrew = ensureCrew;
window.addCrewXP = addCrewXP;
window.getCrewPerkValue = getCrewPerkValue;
window.hasCrewPerk = hasCrewPerk;
window.trainPerk = trainPerk;
window.checkSixthSense = checkSixthSense;
window.roleLabel = roleLabel;
window.renderCrewPanel = renderCrewPanel;
