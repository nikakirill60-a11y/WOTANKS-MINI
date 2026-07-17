// js/battlepass.js
// ========== БОЕВОЙ ПРОПУСК ==========
console.log('🎖️ battlepass.js загружен');

// Эксклюзивные танки боевого пропуска (выдаются только за уровни премиум-трека)
const BATTLEPASS_TANKS_DB = {
  BP_PZ2D: { n: "Pz.Kpfw. II Ausf. D", nat: "germany", tier: 2, hp: 230, dmg: 20, s: .75, mag: 3, reload: 3200, off: 5, vr: 300, camo: .32, cls: 'lt', armor: 40, nc: '#f1c40f', premium: true, collection: true, desc: "Награда боевого пропуска — 1 уровень." },
  BP_T34E: { n: "Т-34 экранированный", nat: "ussr", tier: 5, hp: 980, dmg: 160, s: .95, off: 5, vr: 340, camo: .2, cls: 'mt', armor: 95, nc: '#f1c40f', premium: true, collection: true, desc: "Награда боевого пропуска — 15 уровень. Дополнительные экраны брони." },
  BP_E75TS: { n: "E 75 TS", nat: "germany", tier: 8, hp: 1550, dmg: 320, s: 1.0, off: 8, vr: 360, camo: .12, cls: 'ht', armor: 210, nc: '#f1c40f', premium: true, collection: true, desc: "Награда боевого пропуска — 30 уровень." }
};

var BP_SEASONAL_POOL = []; // заполняется в initBattlePass() танками 4-6 уровня из основной ветки

function initBattlePass() {
  for (var id in BATTLEPASS_TANKS_DB) DB[id] = BATTLEPASS_TANKS_DB[id];

  BP_SEASONAL_POOL = [];
  for (var tid in DB) {
    var t = DB[tid];
    if (!t.collection && !t.premium && t.tier >= 4 && t.tier <= 6) BP_SEASONAL_POOL.push(tid);
  }
  console.log('🎖️ Сезонный пул (IV-VI ур.):', BP_SEASONAL_POOL.length, 'танков');
}

// ========== НАЧИСЛЕНИЕ ОПЫТА ==========
function addBattlePassXP(amount) {
  if (!amount || amount <= 0) return;
  var bp = GameState.battlePass;
  if (bp.level >= CONFIG.BATTLE_PASS.maxLevel) return;

  bp.xp += amount;
  var need = CONFIG.BATTLE_PASS.xpPerLevel;
  while (bp.xp >= need && bp.level < CONFIG.BATTLE_PASS.maxLevel) {
    bp.xp -= need;
    bp.level++;
    if (GameState.player) crewMsg('🎖️ Боевой пропуск: ' + bp.level + ' уровень!', '#f1c40f');
  }
  if (typeof updateBattlePassUI === 'function') updateBattlePassUI();
}

// ========== НАГРАДЫ ==========
function getFreeReward(level) {
  if (level % 10 === 0) return { type: 'gold', amount: 80 };
  if (level % 5 === 0) return { type: 'booster', kind: 'xp' };
  return { type: 'silver', amount: 1500 + level * 150 };
}

function getPremiumReward(level) {
  var special = CONFIG.BATTLE_PASS.premiumTankLevels[level];
  if (special) return { type: 'tank', id: special.id, name: special.name };
  if (level % 3 === 0) return { type: 'seasonal_container' };
  if (level % 5 === 0) return { type: 'booster', kind: (level % 2 === 0 ? 'gold' : 'silver') };
  return { type: 'gold', amount: 30 + level * 3 };
}

function applyReward(reward) {
  if (reward.type === 'silver') GameState.SILVER += reward.amount;
  else if (reward.type === 'gold') GameState.GOLD += reward.amount;
  else if (reward.type === 'xp') GameState.XP += reward.amount;
  else if (reward.type === 'booster') GameState.boosterStock[reward.kind] = (GameState.boosterStock[reward.kind] || 0) + 1;
  else if (reward.type === 'tank') {
    if (GameState.owned.indexOf(reward.id) === -1) GameState.owned.push(reward.id);
  } else if (reward.type === 'seasonal_container') {
    return openSeasonalReward();
  }
  return reward;
}

// Сезонный контейнер: танки IV-VI уровня / бустеры / серебро / золото
function openSeasonalReward() {
  var roll = Math.random();
  var result;
  if (roll < 0.15 && BP_SEASONAL_POOL.length > 0) {
    var tid = BP_SEASONAL_POOL[Math.floor(Math.random() * BP_SEASONAL_POOL.length)];
    if (GameState.owned.indexOf(tid) === -1) GameState.owned.push(tid);
    result = { type: 'tank', id: tid, name: DB[tid].n };
  } else if (roll < 0.45) {
    var kind = ['xp', 'gold', 'silver'][Math.floor(Math.random() * 3)];
    GameState.boosterStock[kind] = (GameState.boosterStock[kind] || 0) + 1;
    result = { type: 'booster', kind: kind };
  } else if (roll < 0.75) {
    var g = 50 + Math.floor(Math.random() * 150);
    GameState.GOLD += g;
    result = { type: 'gold', amount: g };
  } else {
    var s = 8000 + Math.floor(Math.random() * 12000);
    GameState.SILVER += s;
    result = { type: 'silver', amount: s };
  }
  return result;
}

// ========== ПОЛУЧЕНИЕ НАГРАДЫ ЗА УРОВЕНЬ ==========
function claimBattlePassReward(level, track) {
  var bp = GameState.battlePass;
  if (level > bp.level) return { success: false, error: 'Уровень ещё не достигнут' };
  if (track === 'premium' && !bp.premium) return { success: false, error: 'Нужен премиум-пропуск' };

  var claimedList = track === 'premium' ? bp.claimedPremium : bp.claimedFree;
  if (claimedList.indexOf(level) !== -1) return { success: false, error: 'Уже получено' };

  var reward = track === 'premium' ? getPremiumReward(level) : getFreeReward(level);
  var applied = applyReward(reward) || reward;
  claimedList.push(level);

  updateResources();
  saveProgress();
  if (typeof updateBattlePassUI === 'function') updateBattlePassUI();
  return { success: true, reward: applied };
}

// ========== ПОКУПКА ПРЕМИУМ-ПРОПУСКА ("Сезонный") ==========
function buyPremiumBattlePass() {
  var bp = GameState.battlePass;
  if (bp.premium) return { success: false, error: 'Уже куплен' };
  var cost = CONFIG.BATTLE_PASS.premiumCostGold;
  if (GameState.GOLD < cost) return { success: false, error: 'Недостаточно золота (' + cost + ' G)' };
  GameState.GOLD -= cost;
  bp.premium = true;
  updateResources();
  saveProgress();
  if (typeof updateBattlePassUI === 'function') updateBattlePassUI();
  return { success: true };
}

// ========== РЕНДЕР UI ==========
// Ожидает <div id="battlepass-track"></div> и <div id="bp-level-label"></div>
// в реальном Index.html
function updateBattlePassUI() {
  var bp = GameState.battlePass;
  var label = document.getElementById('bp-level-label');
  if (label) label.innerText = 'Уровень ' + bp.level + '/' + CONFIG.BATTLE_PASS.maxLevel + ' — ' + Math.floor(bp.xp) + '/' + CONFIG.BATTLE_PASS.xpPerLevel + ' XP' + (bp.premium ? ' · ⭐ ' + CONFIG.BATTLE_PASS.seasonName : '');

  var track = document.getElementById('battlepass-track');
  if (!track) return;
  track.innerHTML = '';

  for (var lvl = 1; lvl <= CONFIG.BATTLE_PASS.maxLevel; lvl++) {
    var reached = bp.level >= lvl;
    var freeClaimed = bp.claimedFree.indexOf(lvl) !== -1;
    var premClaimed = bp.claimedPremium.indexOf(lvl) !== -1;
    var col = document.createElement('div');
    col.style.cssText = 'display:inline-flex;flex-direction:column;gap:4px;margin:3px;min-width:70px;text-align:center;vertical-align:top';

    var premBox = document.createElement('div');
    var premReward = getPremiumReward(lvl);
    premBox.style.cssText = 'border:2px solid ' + (bp.premium ? '#f1c40f' : '#555') + ';border-radius:6px;padding:4px;background:#1a1a2e;font-size:10px;color:#fff;cursor:pointer;opacity:' + (reached ? '1' : '0.5');
    premBox.innerHTML = rewardLabel(premReward) + (premClaimed ? '<br>✅' : '');
    premBox.onclick = function (l) { return function () {
      var r = claimBattlePassReward(l, 'premium');
      if (!r.success) alert(r.error); else alert('Получено: ' + rewardLabel(r.reward || {}));
    }; }(lvl);

    var freeBox = document.createElement('div');
    var freeReward = getFreeReward(lvl);
    freeBox.style.cssText = 'border:1px solid #555;border-radius:6px;padding:4px;background:#222;font-size:10px;color:#ccc;cursor:pointer;opacity:' + (reached ? '1' : '0.5');
    freeBox.innerHTML = rewardLabel(freeReward) + (freeClaimed ? '<br>✅' : '');
    freeBox.onclick = function (l) { return function () {
      var r = claimBattlePassReward(l, 'free');
      if (!r.success) alert(r.error); else alert('Получено: ' + rewardLabel(r.reward || {}));
    }; }(lvl);

    var lvlLabel = document.createElement('div');
    lvlLabel.style.cssText = 'color:#888;font-size:9px';
    lvlLabel.innerText = 'Ур.' + lvl;

    col.appendChild(premBox);
    col.appendChild(freeBox);
    col.appendChild(lvlLabel);
    track.appendChild(col);
  }
}

function rewardLabel(r) {
  if (r.type === 'tank') return '🪖 ' + (r.name || r.id);
  if (r.type === 'gold') return '🪙 ' + r.amount + 'G';
  if (r.type === 'silver') return '💰 ' + r.amount + '₽';
  if (r.type === 'xp') return '⭐ ' + r.amount + 'XP';
  if (r.type === 'booster') return '🚀 Бустер';
  if (r.type === 'seasonal_container') return '📦 Сезонный';
  return '🎁';
}

window.initBattlePass = initBattlePass;
window.addBattlePassXP = addBattlePassXP;
window.claimBattlePassReward = claimBattlePassReward;
window.buyPremiumBattlePass = buyPremiumBattlePass;
window.updateBattlePassUI = updateBattlePassUI;
window.openSeasonalReward = openSeasonalReward;

// ⚠️ Важно: battlepass.js должен подключаться в Index.html ПОСЛЕ containers.js,
// т.к. сезонный пул берётся из полностью собранного DB.
initBattlePass();
