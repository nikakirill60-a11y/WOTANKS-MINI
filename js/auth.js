// auth.js (ИСПРАВЛЕННАЯ ВЕРСИЯ)

let currentUser = null;
let onlineStatusInterval = null;

// Локальные функции для совместимости
function getUsers() {
  return JSON.parse(localStorage.getItem('ct_users') || '{}');
}

function saveUsers(users) {
  localStorage.setItem('ct_users', JSON.stringify(users));
}

async function saveProgress() {
  if (!currentUser) return;

  const progressData = {
    XP: GameState.XP,
    GOLD: GameState.GOLD,
    SILVER: GameState.SILVER,
    owned: GameState.owned,
    selected: GameState.selected,
    usedPromos: GameState.usedPromos,
    quest23: GameState.quest23,
    inventory: GameState.inventory,
    boosters: GameState.boosters,
    boosterStock: GameState.boosterStock,
    modules: GameState.modules,
    upgrades: GameState.upgrades,
    upgradesBought: GameState.upgradesBought
  };

  // Сохраняем локально
  const users = getUsers();
  if (users[currentUser]) {
    users[currentUser].data = progressData;
    saveUsers(users);
  }

  // Сохраняем в облако
  if (supabaseClient) { // ✅ ИСПРАВЛЕНО
    await saveUserProgress(currentUser, progressData);
  }
}

async function loadProgress(username) {
  let data = null;

  // Пытаемся загрузить из облака
  if (supabaseClient) { // ✅ ИСПРАВЛЕНО
    const result = await loadUserProgress(username);
    if (result.success) {
      data = result.data;
      console.log('☁️ Прогресс загружен из облака');
    }
  }

  // Если не удалось из облака, загружаем локально
  if (!data) {
    const users = getUsers();
    if (users[username] && users[username].data) {
      data = users[username].data;
      console.log('💾 Прогресс загружен локально');
    }
  }

  // Применяем данные
  if (data) {
    GameState.XP = data.XP;
    GameState.GOLD = data.GOLD;
    GameState.SILVER = data.SILVER;
    GameState.owned = data.owned;
    GameState.selected = data.selected;
    GameState.usedPromos = data.usedPromos || [];
    GameState.quest23 = data.quest23 || { active: true, kills: 0, target: 15, claimed: false };
    GameState.inventory = data.inventory || {};
    GameState.boosters = data.boosters || { xp: 0, gold: 0, silver: 0 };
    GameState.boosterStock = data.boosterStock || { xp: 0, gold: 0, silver: 0 };
    GameState.modules = data.modules || {};
    GameState.upgrades = data.upgrades || {};
    GameState.upgradesBought = data.upgradesBought || {};

    if (!GameState.owned.includes(GameState.selected)) {
      GameState.selected = GameState.owned[0];
    }
  } else {
    // Дефолтные значения
    GameState.XP = 500;
    GameState.GOLD = 0;
    GameState.SILVER = 5000;
    GameState.owned = ["T26", "PZ2", "CRUS2", "VAEB", "R35"];
    GameState.selected = "T26";
    GameState.usedPromos = [];
    GameState.quest23 = { active: true, kills: 0, target: 15, claimed: false };
    GameState.inventory = {};
    GameState.boosters = { xp: 0, gold: 0, silver: 0 };
    GameState.boosterStock = { xp: 0, gold: 0, silver: 0 };
    GameState.modules = {};
    GameState.upgrades = {};
    GameState.upgradesBought = {};
  }

  if (typeof updateQuestUI === 'function') updateQuestUI();
  if (typeof updateInvCount === 'function') updateInvCount();
  if (typeof updateBoosterUI === 'function') updateBoosterUI();
}

async function register() {
  const u = document.getElementById('username-input').value.trim();
  const p = document.getElementById('password-input').value.trim();
  const msg = document.getElementById('login-msg');

  if (!u || !p) {
    msg.innerText = "Введите имя и пароль!";
    msg.style.color = "#e74c3c";
    return;
  }

  // Регистрация в облаке
  if (supabaseClient) { // ✅ ИСПРАВЛЕНО
    const result = await registerUser(u, p);
    if (!result.success) {
      msg.innerText = result.error;
      msg.style.color = "#e74c3c";
      return;
    }
  }

  // Локальная регистрация
  const users = getUsers();
  if (users[u]) {
    msg.innerText = "Пользователь уже существует!";
    msg.style.color = "#e74c3c";
    return;
  }

  users[u] = { pass: p, data: null };
  saveUsers(users);
  performLogin(u);
}

async function login() {
  const u = document.getElementById('username-input').value.trim();
  const p = document.getElementById('password-input').value.trim();
  const msg = document.getElementById('login-msg');

  // Проверка в облаке
  if (supabaseClient) { // ✅ ИСПРАВЛЕНО
    const result = await loginUser(u, p);
    if (!result.success) {
      msg.innerText = result.error;
      msg.style.color = "#e74c3c";
      return;
    }
  } else {
    // Локальная проверка
    const users = getUsers();
    if (!users[u] || users[u].pass !== p) {
      msg.innerText = "Неверное имя или пароль!";
      msg.style.color = "#e74c3c";
      return;
    }
  }

  performLogin(u);
}

async function performLogin(username) {
  currentUser = username;
  await loadProgress(username);

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('ui').style.display = 'flex';
  document.getElementById('current-user').innerText = username;

  updateResources();
  renderTree();
  renderCarousel();
  updateInvCount();
  updateBoosterUI();

  // Обновляем онлайн статус
  if (supabaseClient) { // ✅ ИСПРАВЛЕНО
    await updateOnlineStatus(username, true);
    
    // Периодическое обновление статуса
    onlineStatusInterval = setInterval(async () => {
      await updateOnlineStatus(username, true);
    }, 60000); // Каждую минуту
  }

  // Автосохранение каждые 5 секунд
  setInterval(saveProgress, 5000);
}

async function logout() {
  await saveProgress();
  
  if (supabaseClient && currentUser) { // ✅ ИСПРАВЛЕНО
    await updateOnlineStatus(currentUser, false);
  }

  if (onlineStatusInterval) {
    clearInterval(onlineStatusInterval);
  }

  currentUser = null;
  location.reload();
}

// Обработка закрытия вкладки
window.addEventListener('beforeunload', async () => {
  if (currentUser) {
    await saveProgress();
    if (supabaseClient) { // ✅ ИСПРАВЛЕНО
      await updateOnlineStatus(currentUser, false);
    }
  }
});