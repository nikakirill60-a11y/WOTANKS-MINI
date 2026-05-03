// js/api.js
console.log('✅ api.js загружен');

const API_URL = ''; // Пусто = тот же домен

let supabaseClient = { connected: true }; // Заглушка для совместимости

function initSupabase() {
  console.log('✅ API инициализирован');
  return true;
}

async function registerUser(username, password) {
  try {
    const response = await fetch(`${API_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', username, password })
    });
    return await response.json();
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    // Работаем локально если нет сервера
    const users = JSON.parse(localStorage.getItem('ct_users') || '{}');
    if (users[username]) {
      return { success: false, error: 'Пользователь уже существует!' };
    }
    users[username] = { pass: password, data: null };
    localStorage.setItem('ct_users', JSON.stringify(users));
    return { success: true };
  }
}

async function loginUser(username, password) {
  try {
    const response = await fetch(`${API_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', username, password })
    });
    return await response.json();
  } catch (error) {
    console.error('Ошибка входа:', error);
    // Работаем локально
    const users = JSON.parse(localStorage.getItem('ct_users') || '{}');
    if (!users[username] || users[username].pass !== password) {
      return { success: false, error: 'Неверные учётные данные!' };
    }
    return { success: true, data: { username } };
  }
}

async function saveUserProgress(username, progressData) {
  try {
    const response = await fetch(`${API_URL}/api/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', username, data: progressData })
    });
    const result = await response.json();
    if (result.success) console.log('💾 Прогресс сохранён в облако');
    return result;
  } catch (error) {
    console.log('⚠️ Сохраняем локально (нет сервера)');
    const users = JSON.parse(localStorage.getItem('ct_users') || '{}');
    if (users[username]) {
      users[username].data = progressData;
      localStorage.setItem('ct_users', JSON.stringify(users));
    }
    return { success: true };
  }
}

async function loadUserProgress(username) {
  try {
    const response = await fetch(`${API_URL}/api/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'load', username })
    });
    return await response.json();
  } catch (error) {
    console.log('⚠️ Загружаем локально');
    const users = JSON.parse(localStorage.getItem('ct_users') || '{}');
    if (users[username] && users[username].data) {
      return { success: true, data: users[username].data };
    }
    return { success: false };
  }
}

async function getLeaderboard(limit = 100) {
  try {
    const response = await fetch(`${API_URL}/api/leaderboard`);
    return await response.json();
  } catch (error) {
    console.log('⚠️ Таблица лидеров локально');
    const users = JSON.parse(localStorage.getItem('ct_users') || '{}');
    const leaderboard = Object.keys(users)
      .map(username => ({
        username: username,
        xp: users[username].data?.XP || 0,
        total_battles: 0,
        total_wins: 0,
        total_kills: 0
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit);
    
    return { success: true, data: leaderboard };
  }
}

async function saveBattleStats(username, stats) {
  try {
    const response = await fetch(`${API_URL}/api/battle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, stats })
    });
    return await response.json();
  } catch (error) {
    return { success: true };
  }
}

async function updateOnlineStatus(username, isOnline) {
  try {
    await fetch(`${API_URL}/api/online`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, isOnline })
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

async function getOnlinePlayers() {
  try {
    const response = await fetch(`${API_URL}/api/online`);
    return await response.json();
  } catch (error) {
    return { success: true, data: [] };
  }
}

async function sendChatMessage(username, message) {
  return { success: true };
}

async function getChatMessages(limit = 50) {
  return { success: true, data: [] };
}

function subscribeToChatMessages(callback) {
  return null;
}

console.log('✅ api.js полностью загружен');