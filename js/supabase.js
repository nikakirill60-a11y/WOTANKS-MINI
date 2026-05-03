// ========== SUPABASE КОНФИГУРАЦИЯ ==========
const SUPABASE_URL = 'https://tkkpdtfhcwwondonfjsi.supabase.co'; // Замените на ваш URL
const SUPABASE_KEY = 'sb_publishable_r2tEe8p_WJPrEzsN7aIpSw_OKQzzKTw'; // Замените на ваш ключ

// Инициализация Supabase
let supabaseClient = null;

function initSupabase() {
  try {
    if (typeof window.supabase === 'undefined') {
      console.warn('⚠️ Supabase библиотека не загружена, работаем локально');
      return false;
    }
    
    // ВАЖНО: URL должен быть БЕЗ /rest/v1
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
    
    console.log('✅ Supabase подключен');
    console.log('URL:', SUPABASE_URL);
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения Supabase:', error);
    return false;
  }
}

// ========== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ==========
async function registerUser(username, password) {
  if (!supabaseClient) {
    console.warn('Supabase не инициализирован');
    return { success: false, error: 'Сервис недоступен' };
  }

  try {
    // Проверка существования пользователя
    const { data: existingUser, error: checkError } = await supabaseClient
      .from('users')
      .select('username')
      .eq('username', username);

    if (checkError) {
      console.error('Ошибка проверки:', checkError);
      throw checkError;
    }

    if (existingUser && existingUser.length > 0) {
      return { success: false, error: 'Пользователь уже существует!' };
    }

    // Создание нового пользователя
    const newUser = {
      username: username,
      password: password,
      xp: 500,
      gold: 0,
      silver: 5000,
      owned_tanks: JSON.stringify(["T26", "PZ2", "CRUS2", "VAEB", "R35"]),
      selected_tank: "T26",
      used_promos: JSON.stringify([]),
      quest_23: JSON.stringify({ active: true, kills: 0, target: 15, claimed: false }),
      inventory: JSON.stringify({}),
      boosters: JSON.stringify({ xp: 0, gold: 0, silver: 0 }),
      booster_stock: JSON.stringify({ xp: 0, gold: 0, silver: 0 }),
      modules: JSON.stringify({}),
      upgrades: JSON.stringify({}),
      upgrades_bought: JSON.stringify({}),
      total_battles: 0,
      total_wins: 0,
      total_kills: 0,
      total_damage: 0,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
      .from('users')
      .insert([newUser])
      .select();

    if (error) {
      console.error('Ошибка вставки:', error);
      throw error;
    }

    console.log('✅ Пользователь создан:', data);
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    return { success: false, error: error.message || 'Ошибка регистрации' };
  }
}

async function loginUser(username, password) {
  if (!supabaseClient) {
    console.warn('Supabase не инициализирован');
    return { success: false, error: 'Сервис недоступен' };
  }

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password);

    if (error) {
      console.error('Ошибка запроса:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'Неверное имя или пароль!' };
    }

    const user = data[0];

    // Обновляем последний вход
    await supabaseClient
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    console.log('✅ Пользователь вошёл:', username);
    return { success: true, data: user };
  } catch (error) {
    console.error('Ошибка входа:', error);
    return { success: false, error: error.message || 'Ошибка входа' };
  }
}

async function saveUserProgress(username, progressData) {
  if (!supabaseClient) return { success: false };

  try {
    const updateData = {
      xp: progressData.XP,
      gold: progressData.GOLD,
      silver: progressData.SILVER,
      owned_tanks: JSON.stringify(progressData.owned),
      selected_tank: progressData.selected,
      used_promos: JSON.stringify(progressData.usedPromos),
      quest_23: JSON.stringify(progressData.quest23),
      inventory: JSON.stringify(progressData.inventory),
      boosters: JSON.stringify(progressData.boosters),
      booster_stock: JSON.stringify(progressData.boosterStock),
      modules: JSON.stringify(progressData.modules),
      upgrades: JSON.stringify(progressData.upgrades),
      upgrades_bought: JSON.stringify(progressData.upgradesBought),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient
      .from('users')
      .update(updateData)
      .eq('username', username);

    if (error) throw error;

    console.log('💾 Прогресс сохранён:', username);
    return { success: true };
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    return { success: false };
  }
}

async function loadUserProgress(username) {
  if (!supabaseClient) return { success: false };

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('username', username);

    if (error) throw error;

    if (!data || data.length === 0) {
      return { success: false, error: 'Пользователь не найден' };
    }

    const user = data[0];

    return {
      success: true,
      data: {
        XP: user.xp,
        GOLD: user.gold,
        SILVER: user.silver,
        owned: JSON.parse(user.owned_tanks || '["T26"]'),
        selected: user.selected_tank,
        usedPromos: JSON.parse(user.used_promos || '[]'),
        quest23: JSON.parse(user.quest_23 || '{"active":true,"kills":0,"target":15,"claimed":false}'),
        inventory: JSON.parse(user.inventory || '{}'),
        boosters: JSON.parse(user.boosters || '{"xp":0,"gold":0,"silver":0}'),
        boosterStock: JSON.parse(user.booster_stock || '{"xp":0,"gold":0,"silver":0}'),
        modules: JSON.parse(user.modules || '{}'),
        upgrades: JSON.parse(user.upgrades || '{}'),
        upgradesBought: JSON.parse(user.upgrades_bought || '{}')
      }
    };
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    return { success: false, error: error.message };
  }
}

async function saveBattleStats(username, stats) {
  if (!supabaseClient) return { success: false };

  try {
    const { data: user, error: getUserError } = await supabaseClient
      .from('users')
      .select('total_battles, total_wins, total_kills, total_damage')
      .eq('username', username);

    if (getUserError) throw getUserError;

    const userData = user[0];
    const updateData = {
      total_battles: (userData.total_battles || 0) + 1,
      total_wins: (userData.total_wins || 0) + (stats.won ? 1 : 0),
      total_kills: (userData.total_kills || 0) + stats.kills,
      total_damage: (userData.total_damage || 0) + stats.damage
    };

    await supabaseClient
      .from('users')
      .update(updateData)
      .eq('username', username);

    await supabaseClient
      .from('battle_history')
      .insert([{
        username: username,
        tank_id: stats.tankId,
        map: stats.map,
        mode: stats.mode,
        won: stats.won,
        kills: stats.kills,
        damage: stats.damage,
        xp_earned: stats.xp,
        silver_earned: stats.silver,
        gold_earned: stats.gold,
        created_at: new Date().toISOString()
      }]);

    return { success: true };
  } catch (error) {
    console.error('Ошибка сохранения статистики:', error);
    return { success: false };
  }
}

async function getLeaderboard(limit = 100) {
  if (!supabaseClient) return { success: false, data: [] };

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('username, xp, total_battles, total_wins, total_kills, total_damage')
      .order('xp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Ошибка получения таблицы лидеров:', error);
    return { success: false, data: [] };
  }
}

async function updateOnlineStatus(username, isOnline) {
  if (!supabaseClient) return { success: false };

  try {
    await supabaseClient
      .from('users')
      .update({
        is_online: isOnline,
        last_online: new Date().toISOString()
      })
      .eq('username', username);

    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

async function getOnlinePlayers() {
  if (!supabaseClient) return { success: false, data: [] };

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabaseClient
      .from('users')
      .select('username, selected_tank, last_online')
      .eq('is_online', true)
      .gte('last_online', fiveMinutesAgo)
      .order('last_online', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, data: [] };
  }
}

async function sendChatMessage(username, message) {
  if (!supabaseClient) return { success: false };

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
    console.error('Ошибка отправки сообщения:', error);
    return { success: false };
  }
}

async function getChatMessages(limit = 50) {
  if (!supabaseClient) return { success: false, data: [] };

  try {
    const { data, error } = await supabaseClient
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: (data || []).reverse() };
  } catch (error) {
    return { success: false, data: [] };
  }
}

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

    return subscription;
  } catch (error) {
    console.error('Ошибка подписки на чат:', error);
    return null;
  }
}