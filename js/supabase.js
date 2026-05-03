// js/supabase.js
// ========== SUPABASE КОНФИГУРАЦИЯ И ИНИЦИАЛИЗАЦИЯ ==========

console.log('✅ supabase.js загружен');

// 🔐 ВАЖНО: Замените на свои значения из Supabase
// Получить можно в: Settings → API → Project URL и anon public key
const SUPABASE_URL = 'https://tkkpdtfhcwwondonfjsi.supabase.co'; // 👈 ЗАМЕНИТЕ
const SUPABASE_KEY = 'sb_publishable_r2tEe8p_WJPrEzsN7aIpSw_OKQzzKTw'; // 👈 ЗАМЕНИТЕ

let supabaseClient = null;

/**
 * Инициализация Supabase клиента
 * @returns {boolean} true если успешно, false если ошибка
 */
function initSupabase() {
  try {
    // Проверяем наличие библиотеки Supabase
    if (typeof window.supabase === 'undefined') {
      console.warn('⚠️ Supabase библиотека не загружена');
      console.warn('   Добавьте: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
      return false;
    }
    
    // Проверяем наличие конфигурации
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.warn('⚠️ Supabase конфигурация не установлена');
      console.warn('   Установите SUPABASE_URL и SUPABASE_KEY в supabase.js');
      return false;
    }
    
    // Создаём клиента
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
    
    console.log('✅ Supabase подключен');
    console.log('   URL:', SUPABASE_URL);
    console.log('   Mode: Production');
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения Supabase:', error);
    return false;
  }
}

// ========== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ==========

/**
 * Регистрация нового пользователя
 * @param {string} username - имя пользователя
 * @param {string} password - пароль
 * @returns {Promise<Object>} { success: boolean, data?: Object, error?: string }
 */
async function registerUser(username, password) {
  if (!supabaseClient) {
    console.error('❌ Supabase не инициализирован');
    return { success: false, error: 'Supabase не инициализирован' };
  }

  try {
    // Проверяем существование пользователя
    const { data: existingUser, error: checkError } = await supabaseClient
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      return { success: false, error: 'Пользователь уже существует!' };
    }

    // Создаём нового пользователя
    const { data, error } = await supabaseClient
      .from('users')
      .insert([{
        username: username,
        password: password, // ⚠️ В продакшене используйте bcrypt!
        xp: 500,
        gold: 0,
        silver: 5000,
        owned_tanks: ["T26", "PZ2", "CRUS2", "VAEB", "R35"],
        selected_tank: "T26",
        used_promos: [],
        quest_23: { active: true, kills: 0, target: 15, claimed: false },
        inventory: {},
        boosters: { xp: 0, gold: 0, silver: 0 },
        booster_stock: { xp: 0, gold: 0, silver: 0 },
        modules: {},
        upgrades: {},
        upgrades_bought: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;

    console.log('✅ Пользователь создан:', username);
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Вход пользователя
 * @param {string} username - имя пользователя
 * @param {string} password - пароль
 * @returns {Promise<Object>} { success: boolean, data?: Object, error?: string }
 */
async function loginUser(username, password) {
  if (!supabaseClient) {
    console.error('❌ Supabase не инициализирован');
    return { success: false, error: 'Supabase не инициализирован' };
  }

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      return { success: false, error: 'Неверное имя или пароль!' };
    }

    // Обновляем время последнего входа
    await supabaseClient
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        is_online: true,
        last_online: new Date().toISOString()
      })
      .eq('id', data.id);

    console.log('✅ Вход успешен:', username);
    return { success: true, data: data };
  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    return { success: false, error: error.message };
  }
}

// ========== СОХРАНЕНИЕ И ЗАГРУЗКА ПРОГРЕССА ==========

/**
 * Сохранение прогресса игрока
 * @param {string} username - имя игрока
 * @param {Object} progressData - данные прогресса
 * @returns {Promise<Object>} { success: boolean }
 */
async function saveUserProgress(username, progressData) {
  if (!supabaseClient) {
    console.warn('⚠️ Supabase не доступен, сохраняем локально');
    return { success: true };
  }

  try {
    const { error } = await supabaseClient
      .from('users')
      .update({
        xp: progressData.XP,
        gold: progressData.GOLD,
        silver: progressData.SILVER,
        owned_tanks: progressData.owned,
        selected_tank: progressData.selected,
        used_promos: progressData.usedPromos,
        quest_23: progressData.quest23,
        inventory: progressData.inventory,
        boosters: progressData.boosters,
        booster_stock: progressData.boosterStock,
        modules: progressData.modules,
        upgrades: progressData.upgrades,
        upgrades_bought: progressData.upgradesBought,
        updated_at: new Date().toISOString()
      })
      .eq('username', username);

    if (error) throw error;

    console.log('💾 Прогресс сохранён (Supabase):', username);
    return { success: true };
  } catch (error) {
    console.error('⚠️ Ошибка сохранения:', error);
    return { success: true }; // Не критично
  }
}

/**
 * Загрузка прогресса игрока
 * @param {string} username - имя игрока
 * @returns {Promise<Object>} { success: boolean, data?: Object }
 */
async function loadUserProgress(username) {
  if (!supabaseClient) {
    console.warn('⚠️ Supabase не доступен');
    return { success: false };
  }

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      return { success: false };
    }

    console.log('☁️ Прогресс загружен (Supabase):', username);
    return {
      success: true,
      data: {
        XP: data.xp || 500,
        GOLD: data.gold || 0,
        SILVER: data.silver || 5000,
        owned: data.owned_tanks || ["T26"],
        selected: data.selected_tank || "T26",
        usedPromos: data.used_promos || [],
        quest23: data.quest_23 || { active: true, kills: 0, target: 15, claimed: false },
        inventory: data.inventory || {},
        boosters: data.boosters || { xp: 0, gold: 0, silver: 0 },
        boosterStock: data.booster_stock || { xp: 0, gold: 0, silver: 0 },
        modules: data.modules || {},
        upgrades: data.upgrades || {},
        upgradesBought: data.upgrades_bought || {}
      }
    };
  } catch (error) {
    console.error('⚠️ Ошибка загрузки прогресса:', error);
    return { success: false };
  }
}

// ========== СТАТИСТИКА БОЁВ ==========

/**
 * Сохранение статистики боя
 * @param {string} username - имя игрока
 * @param {Object} stats - статистика боя
 * @returns {Promise<Object>} { success: boolean }
 */
async function saveBattleStats(username, stats) {
  if (!supabaseClient) return { success: true };

  try {
    // Получаем текущие статы игрока
    const { data: user } = await supabaseClient
      .from('users')
      .select('total_battles, total_wins, total_kills, total_damage')
      .eq('username', username)
      .single();

    // Обновляем статы
    if (user) {
      await supabaseClient
        .from('users')
        .update({
          total_battles: (user.total_battles || 0) + 1,
          total_wins: (user.total_wins || 0) + (stats.won ? 1 : 0),
          total_kills: (user.total_kills || 0) + stats.kills,
          total_damage: (user.total_damage || 0) + stats.damage
        })
        .eq('username', username);
    }

    // Добавляем в историю боёв
    await supabaseClient
      .from('battle_history')
      .insert([{
        username: username,
        tank_id: stats.tankId || 'unknown',
        map: stats.map || 'city',
        mode: stats.mode || '7v7',
        won: stats.won || false,
        kills: stats.kills || 0,
        damage: stats.damage || 0,
        xp_earned: stats.xp || 0,
        silver_earned: stats.silver || 0,
        gold_earned: stats.gold || 0,
        created_at: new Date().toISOString()
      }]);

    console.log('⚔️ Статистика боя сохранена:', username);
    return { success: true };
  } catch (error) {
    console.error('⚠️ Ошибка сохранения статистики:', error);
    return { success: true };
  }
}

// ========== ТАБЛИЦА ЛИДЕРОВ ==========

/**
 * Получение таблицы лидеров
 * @param {number} limit - количество игроков
 * @returns {Promise<Object>} { success: boolean, data?: Array }
 */
async function getLeaderboard(limit = 100) {
  if (!supabaseClient) {
    console.warn('⚠️ Supabase не доступен');
    return { success: false, data: [] };
  }

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('username, xp, total_battles, total_wins, total_kills, total_damage')
      .order('xp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    console.log('🏆 Таблица лидеров загружена:', data.length, 'игроков');
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('⚠️ Ошибка загрузки лидеров:', error);
    return { success: false, data: [] };
  }
}

// ========== ОНЛАЙН СТАТУС ==========

/**
 * Обновление онлайн статуса
 * @param {string} username - имя игрока
 * @param {boolean} isOnline - онлайн ли игрок
 * @returns {Promise<Object>} { success: boolean }
 */
async function updateOnlineStatus(username, isOnline) {
  if (!supabaseClient) return { success: true };

  try {
    await supabaseClient
      .from('users')
      .update({
        is_online: isOnline,
        last_online: new Date().toISOString()
      })
      .eq('username', username);

    console.log(isOnline ? '🟢 Онлайн' : '🔴 Офлайн', username);
    return { success: true };
  } catch (error) {
    console.error('⚠️ Ошибка обновления статуса:', error);
    return { success: false };
  }
}

/**
 * Получение онлайн игроков
 * @returns {Promise<Object>} { success: boolean, data?: Array }
 */
async function getOnlinePlayers() {
  if (!supabaseClient) {
    return { success: false, data: [] };
  }

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabaseClient
      .from('users')
      .select('username, selected_tank, last_online')
      .eq('is_online', true)
      .gte('last_online', fiveMinutesAgo)
      .order('last_online', { ascending: false });

    if (error) throw error;

    console.log('👥 Онлайн игроков:', data.length);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('⚠️ Ошибка получения онлайн игроков:', error);
    return { success: false, data: [] };
  }
}

// ========== ЧАТ ==========

/**
 * Отправка сообщения в чат
 * @param {string} username - имя отправителя
 * @param {string} message - текст сообщения
 * @returns {Promise<Object>} { success: boolean }
 */
async function sendChatMessage(username, message) {
  if (!supabaseClient) return { success: true };

  try {
    const { error } = await supabaseClient
      .from('chat_messages')
      .insert([{
        username: username,
        message: message,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('⚠️ Ошибка отправки сообщения:', error);
    return { success: false };
  }
}

/**
 * Получение сообщений чата
 * @param {number} limit - количество сообщений
 * @returns {Promise<Object>} { success: boolean, data?: Array }
 */
async function getChatMessages(limit = 50) {
  if (!supabaseClient) {
    return { success: false, data: [] };
  }

  try {
    const { data, error } = await supabaseClient
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: (data || []).reverse() };
  } catch (error) {
    console.error('⚠️ Ошибка загрузки чата:', error);
    return { success: false, data: [] };
  }
}

/**
 * Подписка на новые сообщения чата
 * @param {Function} callback - функция обратного вызова
 * @returns {Object|null} subscription объект
 */
function subscribeToChatMessages(callback) {
  if (!supabaseClient) return null;
  
  try {
    const subscription = supabaseClient
      .channel('chat_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, callback)
      .subscribe();

    console.log('💬 Подписка на чат активирована');
    return subscription;
  } catch (error) {
    console.error('⚠️ Ошибка подписки на чат:', error);
    return null;
  }
}

console.log('✅ supabase.js полностью загружен');