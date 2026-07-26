// js/daily-quests.js
// ========== ЕЖЕДНЕВНЫЕ ЗАДАЧИ (случайные контракты) ==========
console.log('📋 daily-quests.js загружен');
// GameState.dailyQuests = { date: 'YYYY-MM-DD', quests: [ {id,type,desc,icon,target,progress,claimed,reward,nation?} ] }
// Генерируется заново каждый календарный день (по локальному времени игрока).

var DAILY_QUEST_POOL = [
  { type: 'damage', icon: '💥', desc: function (n) { return 'Нанеси ' + n + ' единиц урона за день'; }, targets: [3000, 5000, 8000], reward: function (t) { return { silver: Math.round(t * 1.2) }; } },
  { type: 'survive_streak', icon: '🛡️', desc: function (n) { return 'Выживи в ' + n + ' боях подряд (не погибнуть)'; }, targets: [2, 3, 4], reward: function (t) { return { gold: 20 * t }; } },
  { type: 'kills', icon: '🎯', desc: function (n) { return 'Уничтожь ' + n + ' вражеских танков'; }, targets: [5, 8, 12], reward: function (t) { return { silver: 700 * t }; } },
  { type: 'wins', icon: '🏆', desc: function (n) { return 'Победи в ' + n + ' боях'; }, targets: [2, 3, 5], reward: function (t) { return { gold: 25 * t }; } },
  { type: 'kills_nation', icon: '🌍', desc: function (n, nat) { return 'Уничтожь ' + n + ' танков нации «' + (CONFIG.NATIONS[nat] || nat) + '»'; }, targets: [3, 5], reward: function (t) { return { silver: 900 * t }; } }
];

function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function pickRandomNation() {
  var keys = Object.keys(CONFIG.NATIONS);
  return keys[Math.floor(Math.random() * keys.length)];
}

function generateDailyQuests() {
  var pool = DAILY_QUEST_POOL.slice();
  var picks = [];
  while (picks.length < 3 && pool.length > 0) {
    var i = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }

  var quests = picks.map(function (def, idx) {
    var target = def.targets[Math.floor(Math.random() * def.targets.length)];
    var nation = def.type === 'kills_nation' ? pickRandomNation() : null;
    return {
      id: def.type + '_' + idx,
      type: def.type,
      nation: nation,
      icon: def.icon,
      desc: def.desc(target, nation),
      target: target,
      progress: 0,
      claimed: false,
      reward: def.reward(target)
    };
  });

  GameState.dailyQuests = { date: todayStr(), quests: quests, survivedStreak: 0 };
}

// Вызывать при входе и при загрузке прогресса — перегенерирует набор,
// если наступил новый день.
function refreshDailyQuests() {
  if (!GameState.dailyQuests || GameState.dailyQuests.date !== todayStr()) {
    generateDailyQuests();
    if (typeof saveProgress === 'function') saveProgress();
  }
  if (typeof renderDailyQuestsPanel === 'function') renderDailyQuestsPanel();
  if (typeof updateDailyQuestsBadge === 'function') updateDailyQuestsBadge();
}

function addQuestProgress(type, amount, nation) {
  if (!GameState.dailyQuests) return;
  var changed = false;
  GameState.dailyQuests.quests.forEach(function (q) {
    if (q.claimed || q.type !== type) return;
    if (type === 'kills_nation' && q.nation !== nation) return;
    q.progress = Math.min(q.target, q.progress + amount);
    changed = true;
  });
  if (changed) {
    if (typeof renderDailyQuestsPanel === 'function') renderDailyQuestsPanel();
    if (typeof updateDailyQuestsBadge === 'function') updateDailyQuestsBadge();
  }
}

function claimDailyQuest(id) {
  if (!GameState.dailyQuests) return { success: false };
  var q = GameState.dailyQuests.quests.find(function (x) { return x.id === id; });
  if (!q) return { success: false, error: 'Задача не найдена' };
  if (q.claimed) return { success: false, error: 'Уже получено' };
  if (q.progress < q.target) return { success: false, error: 'Задача ещё не выполнена' };

  q.claimed = true;
  if (q.reward.gold) GameState.GOLD += q.reward.gold;
  if (q.reward.silver) GameState.SILVER += q.reward.silver;

  if (typeof updateResources === 'function') updateResources();
  if (typeof saveProgress === 'function') saveProgress();
  renderDailyQuestsPanel();
  updateDailyQuestsBadge();
  return { success: true, reward: q.reward };
}

// ========== ХУКИ ИЗ БОЯ ==========
function onPlayerKill(killedTank) {
  addQuestProgress('kills', 1);
  var natId = killedTank && killedTank.id && typeof DB !== 'undefined' && DB[killedTank.id] ? DB[killedTank.id].nat : null;
  if (natId) addQuestProgress('kills_nation', 1, natId);
}

function checkDailyQuestsAfterBattle(won) {
  if (!GameState.dailyQuests) return;
  addQuestProgress('damage', Math.floor(GameState.battleDmg || 0));
  if (won) addQuestProgress('wins', 1);

  // survive_streak: считаем последовательные бои, где игрок не погиб
  var survived = !(GameState.player && GameState.player.dead);
  GameState.dailyQuests.survivedStreak = survived ? (GameState.dailyQuests.survivedStreak || 0) + 1 : 0;
  if (survived) addQuestProgress('survive_streak', 0); // триггерим перерасчёт через прямое присвоение ниже
  GameState.dailyQuests.quests.forEach(function (q) {
    if (q.type === 'survive_streak' && !q.claimed) {
      q.progress = Math.min(q.target, GameState.dailyQuests.survivedStreak);
    }
  });
}

var dailyQuestsHooksPatched = false;
function patchDailyQuestsHooks() {
  if (dailyQuestsHooksPatched) return;
  dailyQuestsHooksPatched = true;
  var origEndBattle = window.endBattle;
  if (typeof origEndBattle === 'function') {
    window.endBattle = function (won) {
      checkDailyQuestsAfterBattle(won);
      return origEndBattle.apply(this, arguments);
    };
  }
}
patchDailyQuestsHooks();

// ========== UI (ожидает <div id="daily-quests-grid"></div>) ==========
function renderDailyQuestsPanel() {
  var grid = document.getElementById('daily-quests-grid');
  if (!grid || !GameState.dailyQuests) return;
  grid.innerHTML = '';
  GameState.dailyQuests.quests.forEach(function (q) {
    var pct = Math.min(100, Math.round(q.progress / q.target * 100));
    var done = q.progress >= q.target;
    var card = document.createElement('div');
    card.style.cssText = 'background:#1a1a1a;border:1px solid ' + (q.claimed ? '#2ecc71' : done ? '#f1c40f' : '#555') + ';border-radius:8px;padding:10px;margin:6px 0';
    var rewardTxt = (q.reward.gold ? '🪙' + q.reward.gold + ' ' : '') + (q.reward.silver ? '💰' + q.reward.silver : '');
    card.innerHTML =
      '<div style="display:flex;justify-content:space-between;color:#fff;font-size:13px"><span>' + q.icon + ' ' + q.desc + '</span><span style="color:#f1c40f">' + rewardTxt + '</span></div>' +
      '<div style="background:#333;border-radius:4px;height:8px;margin:6px 0"><div style="background:' + (done ? '#2ecc71' : '#3498db') + ';height:100%;border-radius:4px;width:' + pct + '%"></div></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<span style="color:#888;font-size:11px">' + q.progress + ' / ' + q.target + '</span>' +
        (q.claimed
          ? '<span style="color:#2ecc71;font-size:11px">✅ Получено</span>'
          : done
            ? '<button class="btn btn-sm" onclick="var r=claimDailyQuest(\'' + q.id + '\');if(!r.success)alert(r.error);">Забрать</button>'
            : '<span style="color:#666;font-size:11px">В процессе</span>') +
      '</div>';
    grid.appendChild(card);
  });
}

function updateDailyQuestsBadge() {
  var badge = document.getElementById('daily-quests-badge');
  if (!badge || !GameState.dailyQuests) return;
  var ready = GameState.dailyQuests.quests.filter(function (q) { return !q.claimed && q.progress >= q.target; }).length;
  if (ready > 0) { badge.style.display = 'inline-block'; badge.innerText = ready; }
  else badge.style.display = 'none';
}

window.refreshDailyQuests = refreshDailyQuests;
window.claimDailyQuest = claimDailyQuest;
window.onPlayerKill = onPlayerKill;
window.renderDailyQuestsPanel = renderDailyQuestsPanel;
window.updateDailyQuestsBadge = updateDailyQuestsBadge;
