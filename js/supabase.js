// js/supabase.js
// ========== SUPABASE КОНФИГУРАЦИЯ ==========

// 🔐 Вставьте свои значения из Supabase Settings → API
const SUPABASE_URL = 'https://xxxxx.supabase.co'; // 👈 ЗАМЕНИТЕ
const SUPABASE_KEY = 'ваш-anon-public-key'; // 👈 ЗАМЕНИТЕ

let supabaseClient = null;

function initSupabase() {
  try {
    if (typeof window.supabase === 'undefined') {
      console.warn('⚠️ Supabase библиотека не загружена');
      return false;
    }
    
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase подключен');
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения Supabase:', error);
    return false;
  }
}

// ========== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ==========
async function registerUser(username, password) {
  if (!supabaseClient) return { success: false, error: 'Sервис недоступен' };

  try {
    // Проверка существования пользователя
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('username')
      .eq('username', username);

    if (existingUser && existingUser.length > 0) {
      return { success: false, error: 'Пользователь уже существует!' };
    }

    // Создание нового пользователя
    const { data, error } = await supabaseClient
      .from('users')
      .insert([{
        username: username,
        password: password, // ⚠️ В продакшене используйте bcrypt!
        xp: 500,
        gold: 0,
        silver: 5000,
        owned_tanks: ["T26", "PZ2", "CRUS2", "VAEB", "R35"],
        selected_tank: "T26"
      }])
      .select();

    if (error) throw error;
    console.log('✅ Пользователь создан:', data);
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    return { success: false, error: error.message };
  }
}

async function loginUser(username, password) {
  if (!supabaseClient) return { success: false, error: 'Сервис недоступен' };

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password);

    if (error) throw error;
    if (!data || data.length === 0) {
      return { success: false, error: 'Неверное имя или пароль!' };
    }

    const user = data[0];
    await supabaseClient
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    console.log('✅ Вход выполнен:', username);
    return { success: true, data: user };
  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    return { success: false, error: error.message };
  }
}

async function saveUserProgress(username, progressData) {
  if (!supabaseClient) return { success: false };

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
    console.log('💾 Прогресс сохранён:', username);
    return { success: true };
  } catch (error) {
    console.error('❌ Ошибка сохранения:', error);
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
        owned: user.owned_tanks || ["T26"],
        selected: user.selected_tank,
        usedPromos: user.used_promos || [],
        quest23: user.quest_23 || { active: true, kills: 0, target: 15, claimed: false },
        inventory: user.inventory || {},
        boosters: user.boosters || { xp: 0, gold: 0, silver: 0 },
        boosterStock: user.booster_stock || { xp: 0, gold: 0, silver: 0 },
        modules: user.modules || {},
        upgrades: user.upgrades || {},
        upgradesBought: user.upgrades_bought || {}
      }
    };
  } catch (error) {
    console.error('❌ Ошибка загрузки:', error);
    return { success: false };
  }
}

async function saveBattleStats(username, stats) {
  if (!supabaseClient) return { success: false };

  try {
    const { data: user } = await supabaseClient
      .from('users')
      .select('total_battles, total_wins, total_kills, total_damage')
      .eq('username', username)
      .single();

    const updateData = {
      total_battles: (user?.total_battles || 0) + 1,
      total_wins: (user?.total_wins || 0) + (stats.won ? 1 : 0),
      total_kills: (user?.total_kills || 0) + stats.kills,
      total_damage: (user?.total_damage || 0) + stats.damage
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
        gold_earned: stats.gold
      }]);

    return { success: true };
  } catch (error) {
    console.error('❌ Ошибка сохранения статистики:', error);
    return { success: false };
  }
}

async function getLeaderboard(limit = 100) {
  if (!supabaseClient) return { success: false, data: [] };

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('username, xp, total_battles, total_wins, total_kills')
      .order('xp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Ошибка получения таблицы лидеров:', error);
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
        message: message
      }]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
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
    console.error('❌ Ошибка подписки на чат:', error);
    return null;
  }
}

console.log('✅ supabase.js загружен');