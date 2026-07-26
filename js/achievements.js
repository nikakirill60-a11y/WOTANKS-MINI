// js/achievements.js
// ========== СИСТЕМА ДОСТИЖЕНИЙ (МЕДАЛЕЙ) ==========
console.log('🏆 achievements.js загружен');

const ACHIEVEMENTS_DB = {
  first_blood: {
    name: "Первая кровь",
    desc: "Уничтожьте свой первый вражеский танк.",
    icon: "🩸",
    reward: { gold: 20 }
  },
  warrior: {
    name: "Воин",
    desc: "Уничтожьте 4 и более вражеских танков за один бой.",
    icon: "⚔️",
    reward: { gold: 60 }
  },
  sniper: {
    name: "Снайпер",
    desc: "Сделайте 5 пробитий подряд без единого промаха или рикошета.",
    icon: "🎯",
    reward: { gold: 75 }
  },
  steel_wall: {
    name: "Стальная стена",
    desc: "Заблокируйте бронёй (рикошетом) 2000+ суммарного урона за один бой.",
    icon: "🛡️",
    reward: { gold: 100 }
  },
  veteran: {
    name: "Ветеран",
    desc: "Сыграйте 100 боёв.",
    icon: "🎖️",
    reward: { gold: 150, silver: 20000 }
  },
  ace: {
    name: "Ас",
    desc: "Наберите 50 суммарных побед в боях (за всю карьеру).",
    icon: "🏅",
    reward: { gold: 200 }
  }
};

// ========== СОСТОЯНИЕ (боевые счётчики, не сохраняются между боями) ==========
var achShotStreak = 0;    // подряд идущих пробитий без промаха/рикошета
var achBlockedDmg = 0;    // урон, заблокированный рикошетом за этот бой

function ensureAchievementsState() {
  if (!GameState.achievements) GameState.achievements = { unlocked: [] };
  if (!GameState.achievements.unlocked) GameState.achievements.unlocked = [];
  if (typeof GameState.lifetimeKills !== 'number') GameState.lifetimeKills = 0;
  if (typeof GameState.lifetimeWins !== 'number') GameState.lifetimeWins = 0;
}

function isAchievementUnlocked(id) {
  ensureAchievementsState();
  return GameState.achievements.unlocked.indexOf(id) !== -1;
}

function unlockAchievement(id) {
  ensureAchievementsState();
  if (isAchievementUnlocked(id)) return;
  var a = ACHIEVEMENTS_DB[id];
  if (!a) return;

  GameState.achievements.unlocked.push(id);
  if (a.reward) {
    if (a.reward.gold) GameState.GOLD += a.reward.gold;
    if (a.reward.silver) GameState.SILVER += a.reward.silver;
  }
  showAchievementToast(a);
  if (typeof updateResources === 'function') updateResources();
  if (typeof renderAchievementsGrid === 'function') renderAchievementsGrid();
  if (typeof saveProgress === 'function') saveProgress();
}

// ========== ВСПЛЫВАЮЩЕЕ УВЕДОМЛЕНИЕ ==========
function showAchievementToast(a) {
  var host = document.getElementById('achievement-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'achievement-toast-host';
    host.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:2000;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(host);
  }
  var toast = document.createElement('div');
  toast.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#2c2c4e);border:2px solid #f1c40f;border-radius:10px;padding:10px 18px;color:#fff;font-size:13px;box-shadow:0 0 25px rgba(241,196,15,0.5);text-align:center;animation:achPop 0.3s ease-out;';
  var rewardTxt = '';
  if (a.reward) {
    if (a.reward.gold) rewardTxt += ' +' + a.reward.gold + 'G';
    if (a.reward.silver) rewardTxt += ' +' + a.reward.silver + '₽';
  }
  toast.innerHTML = '<div style="font-size:26px">' + a.icon + '</div><div style="color:#f1c40f;font-weight:bold">🏆 Достижение получено!</div><div>' + a.name + '</div><div style="color:#2ecc71;font-size:11px">' + rewardTxt + '</div>';
  host.appendChild(toast);
  setTimeout(function () {
    toast.style.transition = 'opacity 0.6s';
    toast.style.opacity = '0';
    setTimeout(function () { toast.remove(); }, 600);
  }, 3500);
}

if (!document.getElementById('achievements-style')) {
  var st = document.createElement('style');
  st.id = 'achievements-style';
  st.innerText = '@keyframes achPop{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}' +
    '.ach-card{background:#1a1a1a;border:1px solid #555;border-radius:8px;padding:10px;margin:5px;display:inline-block;width:170px;vertical-align:top;text-align:center}' +
    '.ach-card.unlocked{border-color:#f1c40f;box-shadow:0 0 10px rgba(241,196,15,0.3)}' +
    '.ach-card.locked{opacity:0.5}';
  document.head.appendChild(st);
}

// ========== ХУКИ ИЗ ИГРОВОГО ЦИКЛА (см. main.js/tank.js) ==========
// Вызывается для каждого выстрела игрока: true = пробитие, false = промах/рикошет.
function onPlayerShotResult(didHit) {
  if (didHit) {
    achShotStreak++;
    if (achShotStreak >= 5) unlockAchievement('sniper');
  } else {
    achShotStreak = 0;
  }
}

// Вызывается, когда вражеский снаряд рикошетит от брони игрока.
function onPlayerBlockedDamage(dmg) {
  achBlockedDmg += dmg;
  if (achBlockedDmg >= 2000) unlockAchievement('steel_wall');
}

// ========== ПРОВЕРКА ДОСТИЖЕНИЙ ПОСЛЕ БОЯ ==========
function checkBattleAchievements(won) {
  ensureAchievementsState();
  if (GameState.battleKills > 0 && !isAchievementUnlocked('first_blood')) unlockAchievement('first_blood');
  if (GameState.battleKills >= 4) unlockAchievement('warrior');
  if ((GameState.totalBattles || 0) >= 100) unlockAchievement('veteran');
  if (won) {
    GameState.lifetimeWins = (GameState.lifetimeWins || 0) + 1;
    if (GameState.lifetimeWins >= 50) unlockAchievement('ace');
  }
}

// ========== НЕИНВАЗИВНЫЕ ХУКИ ==========
var achievementsHooksPatched = false;
function patchAchievementsHooks() {
  if (achievementsHooksPatched) return;
  achievementsHooksPatched = true;

  var origEndBattle = window.endBattle;
  if (typeof origEndBattle === 'function') {
    window.endBattle = function (won) {
      checkBattleAchievements(won);
      var r = origEndBattle.apply(this, arguments);
      achShotStreak = 0;
      achBlockedDmg = 0;
      return r;
    };
  }
}
patchAchievementsHooks();

// ========== РЕНДЕР ПАНЕЛИ (ожидает <div id="achievements-grid"></div>) ==========
function renderAchievementsGrid() {
  var grid = document.getElementById('achievements-grid');
  if (!grid) return;
  ensureAchievementsState();
  grid.innerHTML = '';
  for (var id in ACHIEVEMENTS_DB) {
    var a = ACHIEVEMENTS_DB[id];
    var unlocked = isAchievementUnlocked(id);
    var card = document.createElement('div');
    card.className = 'ach-card ' + (unlocked ? 'unlocked' : 'locked');
    var rewardTxt = a.reward ? ((a.reward.gold ? '🪙' + a.reward.gold + ' ' : '') + (a.reward.silver ? '💰' + a.reward.silver : '')) : '';
    card.innerHTML =
      '<div style="font-size:28px">' + a.icon + '</div>' +
      '<div style="color:#fff;font-weight:bold;font-size:12px;margin:4px 0">' + a.name + '</div>' +
      '<div style="color:#888;font-size:10px">' + a.desc + '</div>' +
      '<div style="color:#f1c40f;font-size:10px;margin-top:4px">' + rewardTxt + '</div>' +
      (unlocked ? '<div style="color:#2ecc71;font-size:11px;margin-top:4px">✅ Получено</div>' : '<div style="color:#e74c3c;font-size:11px;margin-top:4px">🔒 Заблокировано</div>');
    grid.appendChild(card);
  }
}

window.ACHIEVEMENTS_DB = ACHIEVEMENTS_DB;
window.unlockAchievement = unlockAchievement;
window.onPlayerShotResult = onPlayerShotResult;
window.onPlayerBlockedDamage = onPlayerBlockedDamage;
window.renderAchievementsGrid = renderAchievementsGrid;
window.checkBattleAchievements = checkBattleAchievements;
