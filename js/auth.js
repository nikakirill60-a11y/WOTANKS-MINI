// js/auth.js
// ========== АУТЕНТИФИКАЦИЯ И РЕГИСТРАЦИЯ ==========

let currentUser = null;
let onlineStatusInterval = null;

// Локальные функции для совместимости
function getUsers() {
  return JSON.parse(localStorage.getItem('ct_users') || '{}');
}

function saveUsers(users) {
  localStorage.setItem('ct_users', JSON.stringify(users));
}

// ========== ВАЛИДАЦИЯ НИКНЕЙМА ==========
function validateUsername(username) {
  // Проверка длины
  if (username.length < 3 || username.length > 20) {
    return {
      valid: false,
      error: "❌ Имя должно быть 3-20 символов!"
    };
  }

  // Проверка: только буквы, цифры, _ и -
  const validNickname = /^[a-zA-Z0-9_-]+$/;
  if (!validNickname.test(username)) {
    return {
      valid: false,
      error: "❌ Только буквы (A-Z, a-z), цифры (0-9), подчёркивание (_) и дефис (-)"
    };
  }

  // Проверка запрещённых символов
  const forbiddenChars = /[{}[\]<>"'`;,\\|]/g;
  if (forbiddenChars.test(username)) {
    return {
      valid: false,
      error: "❌ Запрещены символы: { } [ ] < > \" ' ` ; , \\ |"
    };
  }

  // Проверка на SQL injection паттерны
  const sqlInjectionPatterns = [
    /union/i,
    /select/i,
    /insert/i,
    /update/i,
    /delete/i,
    /drop/i,
    /exec/i,
    /script/i,
    /onclick/i
  ];

  for (let pattern of sqlInjectionPatterns) {
    if (pattern.test(username)) {
      return {
        valid: false,
        error: "❌ Недопустимое имя пользователя"
      };
    }
  }

  return {
    valid: true,
    error: null
  };
}

// ========== СОХРАНЕНИЕ ПРОГРЕССА ==========
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
    upgradesBought: GameState.upgradesBought,
    totalBattles: GameState.totalBattles,
    camos: GameState.camos,
    equippedCamo: GameState.equippedCamo,
    crew: GameState.crew,
    blueprints: GameState.blueprints,
    collectionBonusesClaimed: GameState.collectionBonusesClaimed,
    battlePass: GameState.battlePass,
    referralCode: GameState.referralCode,
    referredBy: GameState.referredBy,
    newsLastSeenId: GameState.newsLastSeenId,
    tutorialDone: GameState.tutorialDone
  };

  // Сохраняем локально
  const users = getUsers();
  if (users[currentUser]) {
    users[currentUser].data = progressData;
    saveUsers(users);
  }

  // Сохраняем в облако
  if (supabaseClient) {
    await saveUserProgress(currentUser, progressData);
  }
}

// ========== ЗАГРУЗКА ПРОГРЕССА ==========
async function loadProgress(username) {
  let data = null;

  // Пытаемся загрузить из облака
  if (supabaseClient) {
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
    GameState.totalBattles = data.totalBattles || 0;
    GameState.camos = data.camos || {};
    GameState.equippedCamo = data.equippedCamo || {};
    GameState.crew = data.crew || {};
    GameState.blueprints = data.blueprints || {};
    GameState.collectionBonusesClaimed = data.collectionBonusesClaimed || [];
    GameState.battlePass = data.battlePass || { season: 1, level: 1, xp: 0, premium: false, claimedFree: [], claimedPremium: [] };
    GameState.referralCode = data.referralCode || null;
    GameState.referredBy = data.referredBy || null;
    GameState.newsLastSeenId = data.newsLastSeenId || 0;
    GameState.tutorialDone = data.tutorialDone || false;

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

// ========== РЕГИСТРАЦИЯ ==========
async function register() {
  const u = document.getElementById('username-input').value.trim();
  const p = document.getElementById('password-input').value.trim();
  const msg = document.getElementById('login-msg');

  // Проверка пустых полей
  if (!u || !p) {
    msg.innerText = "❌ Введите имя и пароль!";
    msg.style.color = "#e74c3c";
    return;
  }

  // Проверка пароля
  if (p.length < 4) {
    msg.innerText = "❌ Пароль должен быть минимум 4 символа!";
    msg.style.color = "#e74c3c";
    return;
  }

  // ✅ ВАЛИДАЦИЯ НИКНЕЙМА
  const validation = validateUsername(u);
  if (!validation.valid) {
    msg.innerText = validation.error;
    msg.style.color = "#e74c3c";
    return;
  }

  // Регистрация в облаке
  if (supabaseClient) {
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
    msg.innerText = "❌ Пользователь уже существует!";
    msg.style.color = "#e74c3c";
    return;
  }

  users[u] = { pass: p, data: null };
  saveUsers(users);

  SocialSystem.applyReferralFromURL(u);

  msg.innerText = "✅ Регистрация успешна! Входим...";
  msg.style.color = "#2ecc71";
  
  setTimeout(() => {
    performLogin(u);
  }, 1000);
}

// ========== ВХОД ==========
async function login() {
  const u = document.getElementById('username-input').value.trim();
  const p = document.getElementById('password-input').value.trim();
  const msg = document.getElementById('login-msg');

  if (!u || !p) {
    msg.innerText = "❌ Введите имя и пароль!";
    msg.style.color = "#e74c3c";
    return;
  }

  // ✅ ВАЛИДАЦИЯ НИКНЕЙМА
  const validation = validateUsername(u);
  if (!validation.valid) {
    msg.innerText = validation.error;
    msg.style.color = "#e74c3c";
    return;
  }

  // Проверка в облаке
  if (supabaseClient) {
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
      msg.innerText = "❌ Неверное имя или пароль!";
      msg.style.color = "#e74c3c";
      return;
    }
  }

  msg.innerText = "✅ Входим...";
  msg.style.color = "#2ecc71";
  
  setTimeout(() => {
    performLogin(u);
  }, 500);
}

// ========== ВЫПОЛНЕНИЕ ВХОДА ==========
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
  if (typeof checkUnreadNews === 'function') checkUnreadNews();
  if (typeof BattlePassSystem !== 'undefined') BattlePassSystem.render();
  if (typeof renderCollectionBadges === 'function') renderCollectionBadges();
  if (!GameState.tutorialDone && typeof startTutorial === 'function') {
    setTimeout(function () {
      if (confirm('👋 Похоже, вы здесь впервые. Пройти короткое обучение?')) startTutorial();
      else GameState.tutorialDone = true;
    }, 500);
  }

  // Обновляем онлайн статус
  if (supabaseClient) {
    await updateOnlineStatus(username, true);
    
    // Периодическое обновление статуса
    onlineStatusInterval = setInterval(async () => {
      await updateOnlineStatus(username, true);
    }, 60000); // Каждую минуту
  }

  // Автосохранение каждые 5 секунд
  setInterval(saveProgress, 5000);

  console.log('✅ Игрок вошёл:', username);
}

// ========== ВЫХОД ==========
async function logout() {
  await saveProgress();
  
  if (supabaseClient && currentUser) {
    await updateOnlineStatus(currentUser, false);
  }

  if (onlineStatusInterval) {
    clearInterval(onlineStatusInterval);
  }

  currentUser = null;
  
  console.log('👋 Игрок вышел');
  
  location.reload();
}

// ========== ОБРАБОТКА ЗАКРЫТИЯ ВКЛАДКИ ==========
window.addEventListener('beforeunload', async () => {
  if (currentUser) {
    await saveProgress();
    if (supabaseClient) {
      await updateOnlineStatus(currentUser, false);
    }
  }
});

// ========== ОЧИСТКА КОНСОЛИ ПРИ ВХОДЕ ==========
window.addEventListener('load', () => {
  console.clear();
  console.log('%c🎮 CITY TANKS', 'color: #f1c40f; font-size: 20px; font-weight: bold');
  console.log('%c⚠️ Это окно разработчика. Будьте осторожны!', 'color: #e74c3c; font-size: 14px');
  console.log('%c✅ Все действия защищены серверной валидацией', 'color: #2ecc71; font-size: 12px');
});

console.log('✅ auth.js полностью загружен');