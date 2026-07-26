// js/supabase.js
console.log('✅ supabase.js загружен');

const SUPABASE_URL = 'https://tkkpdtfhcwwondonfjsi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r2tEe8p_WJPrEzsN7aIpSw_OKQzzKTw';

let supabaseClient = null;

function initSupabase() {
  try {
    // ✅ ПРАВИЛЬНЫЙ СПОСОБ - window.supabase
    if (typeof window.supabase === 'undefined') {
      console.warn('⚠️ Supabase библиотека не загружена');
      // Работаем локально без Supabase
      supabaseClient = {
        from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({}) }) }) })
      };
      return false;
    }
    
    // Используем глобальный объект supabase из CDN
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    console.log('✅ Supabase подключен');
    console.log('   URL:', SUPABASE_URL);
    return true;
  } catch (error) {
    console.error('❌ Ошибка Supabase:', error.message);
    return false;
  }
}

// ========== РЕГИСТРАЦИЯ ==========
async function registerUser(username, password) {
  if (!supabaseClient || !supabaseClient.from) {
    console.warn('⚠️ Supabase не доступен, работаем локально');
    const users = JSON.parse(localStorage.getItem('ct_users') || '{}');
    if (users[username]) {
      return { success: false, error: 'Пользователь уже существует!' };
    }
    users[username] = { pass: password, data: null };
    localStorage.setItem('ct_users', JSON.stringify(users));
    return { success: true };
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
        upgrades_bought: {}
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
  if (!supabaseClient || !supabaseClient.from) {
    console.warn('⚠️ Supabase не доступен, работаем локально');
    const users = JSON.parse(localStorage.getItem('ct_users') || '{}');
    if (!users[username] || users[username].pass !== password) {
      return { success: false, error: 'Неверные учётные данные!' };
    }
    return { success: true, data: { username } };
  }

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      return { success: false, error: 'Неверные учётные данные!' };
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
  if (!supabaseClient || !supabaseClient.from) {
    console.log('⚠️ Сохраняем локально (Supabase не доступен)');
    const users = JSON.parse(localStorage.getItem('ct_users') || '{}');
    if (users[username]) {
      users[username].data = progressData;
      localStorage.setItem('ct_users', JSON.stringify(users));
    }
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
        client_total_battles: progressData.totalBattles,
        camos: progressData.camos,
        equipped_camo: progressData.equippedCamo,
        crew: progressData.crew,
        blueprints: progressData.blueprints,
        collection_bonuses_claimed: progressData.collectionBonusesClaimed,
        battle_pass: progressData.battlePass,
        referral_code: progressData.referralCode,
        referred_by: progressData.referredBy,
        news_last_seen_id: progressData.newsLastSeenId,
        tutorial_done: progressData.tutorialDone,
        achievements: progressData.achievements,
        lifetime_wins: progressData.lifetimeWins,
        daily_quests: progressData.dailyQuests,
        settings: progressData.settings,
        updated_at: new Date().toISOString()
      })
      .eq('username', username);

    if (error) throw error;
    console.log('💾 Прогресс сохранён (Supabase):', username);
    return { success: true };
  } catch (error) {
    console.error('⚠️ Ошибка сохранения:', error);
    const users = JSON.parse(localStorage.getItem('ct_users') || '{}');
    if (users[username]) {
      users[username].data = progressData;
      localStorage.setItem('ct_users', JSON.stringify(users));
    }
    return { success: true };
  }
}

// ========== ЗАГРУЗКА ПРОГРЕССА ==========
async function loadUserProgress(username) {
  if (!supabaseClient || !supabaseClient.from) {
    console.log('⚠️ Загружаем локально (Supabase не доступен)');
    const users = JSON.parse(localStorage.getItem('ct_users') || '{}');
    if (users[username] && users[username].data) {
      return { success: true, data: users[username].data };
    }
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
        upgradesBought: data.upgrades_bought || {},
        totalBattles: data.client_total_battles || 0,
        camos: data.camos || {},
        equippedCamo: data.equipped_camo || {},
        crew: data.crew || {},
        blueprints: data.blueprints || {},
        collectionBonusesClaimed: data.collection_bonuses_claimed || [],
        battlePass: data.battle_pass || { season: 1, level: 1, xp: 0, premium: false, claimedFree: [], claimedPremium: [] },
        referralCode: data.referral_code || null,
        referredBy: data.referred_by || null,
        newsLastSeenId: data.news_last_seen_id || 0,
        tutorialDone: data.tutorial_done || false,
        achievements: data.achievements || { unlocked: [] },
        lifetimeWins: data.lifetime_wins || 0,
        dailyQuests: data.daily_quests || null,
        settings: data.settings || { volume: 0.3, showTracks: true, lang: 'ru' }
      }
    };
  } catch (error) {
    console.error('⚠️ Ошибка загрузки:', error);
    const users = JSON.parse(localStorage.getItem('ct_users') || '{}');
    if (users[username] && users[username].data) {
      return { success: true, data: users[username].data };
    }
    return { success: false };
  }
}

// ========== СТАТИСТИКА ==========
async function saveBattleStats(username, stats) {
  if (!supabaseClient || !supabaseClient.from) return { success: true };

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
  if (!supabaseClient || !supabaseClient.from) return { success: false, data: [] };

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
  if (!supabaseClient || !supabaseClient.from) return { success: true };

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
  if (!supabaseClient || !supabaseClient.from) return { success: false, data: [] };

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
  if (!supabaseClient || !supabaseClient.from) return { success: true };

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
  if (!supabaseClient || !supabaseClient.from) return { success: false, data: [] };

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
  if (!supabaseClient || !supabaseClient.from) return null;
  
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