// js/supabase.js
// ========== SUPABASE КОНФИГУРАЦИЯ ==========

console.log('✅ supabase.js загружен');

// 🔐 ЗАМЕНИТЕ НА СВОИ ДАННЫЕ
const SUPABASE_URL = 'https://tkkpdtfhcwwondonfjsi.supabase.co'; // 👈 ЗАМЕНИТЕ
const SUPABASE_KEY = 'sb_publishable_r2tEe8p_WJPrEzsN7aIpSw_OKQzzKTw'; // 👈 ЗАМЕНИТЕ

let supabaseClient = null;

function initSupabase() {
  try {
    if (typeof window.supabase === 'undefined') {
      console.warn('⚠️ Supabase библиотека не загружена');
      return false;
    }
    
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
    
    console.log('✅ Supabase подключен');
    console.log('   URL:', SUPABASE_URL);
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения Supabase:', error);
    return false;
  }
}

// ========== РЕГИСТРАЦИЯ ==========
async function registerUser(username, password) {
  if (!supabaseClient) {
    console.error('❌ Supabase не инициализирован');
    return { success: false, error: 'Supabase не инициализирован' };
  }

  try {
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('username')
      .eq('username', username);

    if (existingUser && existingUser.length > 0) {
      return { success: false, error: 'Пользователь уже существует!' };
    }

    const { data, error } = await supabaseClient
      .from('users')
      .insert([{
        username: username,
        password: password,
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

// ========== ВХОД ==========
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

// ========== СОХРАНЕНИЕ ПРОГРЕССА ==========
async function saveUserProgress(username, progressData) {
  if (!supabaseClient) {
    console.warn('⚠️ Supabase не доступен');
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

    console.log('💾 Прогресс сохранён:', username);
    return { success: true };
  } catch (error) {
    console.error('⚠️ Ошибка сохранения:', error);
    return { success: true };
  }
}

// ========== ЗАГРУЗКА ПРОГРЕССА ==========
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

    console.log('☁️ Прогресс загружен:', username);
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
    console.error('⚠️ Ошибка загрузки:', error);
    return { success: false };
  }
}

// ========== СТАТИСТИКА ==========
async function saveBattleStats(username, stats) {
  if (!supabaseClient) return { success: true };

  try {
    const { data: user } = await supabaseClient
      .from('users')
      .select('total_battles, total_wins, total_kills, total_damage')
      .eq('username', username)
      .single();

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
        gold_earned: stats.gold || 0
      }]);

    return { success: true };
  } catch (error) {
    console.error('⚠️ Ошибка статистики:', error);
    return { success: true };
  }
}

// ========== ТАБЛИЦА ЛИДЕРОВ ==========
async function getLeaderboard(limit = 100) {
  if (!supabaseClient) return { success: false, data: [] };

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('username, xp, total_battles, total_wins, total_kills')
      .order('xp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    console.log('✅ Таблица лидеров загружена');
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('⚠️ Ошибка лидеров:', error);
    return { success: false, data: [] };
  }
}

// ========== ОНЛАЙН СТАТУС ==========
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

    return { success: true };
  } catch (error) {
    console.error('⚠️ Ошибка статуса:', error);
    return { success: false };
  }
}

// ========== ОНЛАЙН ИГРОКИ ==========
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
    console.error('⚠️ Ошибка онлайн:', error);
    return { success: false, data: [] };
  }
}

// ========== ЧАТ ==========
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
    console.error('⚠️ Ошибка чата:', error);
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
    console.error('⚠️ Ошибка загрузки чата:', error);
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
    console.error('⚠️ Ошибка подписки:', error);
    return null;
  }
}

console.log('✅ supabase.js полностью загружен');