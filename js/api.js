// js/api.js
// ========== API ПРОСЛОЙКА (ИСПОЛЬЗУЕТ SUPABASE) ==========

// ✅ НЕ ОБЪЯВЛЯЕМ supabaseClient - он из supabase.js!

// ========== РЕГИСТРАЦИЯ ==========
async function registerUser(username, password) {
  if (!supabaseClient || !supabaseClient.from) {
    console.warn('⚠️ Supabase не инициализирован, работаем локально');
    
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
        selected_tank: "T26"
      }])
      .select();

    if (error) throw error;
    console.log('✅ Пользователь зарегистрирован:', username);
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    return { success: false, error: error.message };
  }
}

// ========== ВХОД ==========
async function loginUser(username, password) {
  if (!supabaseClient || !supabaseClient.from) {
    console.warn('⚠️ Supabase не инициализирован, работаем локально');
    
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
      .eq('password', password);

    if (error) throw error;
    if (!data || data.length === 0) {
      return { success: false, error: 'Неверные учётные данные!' };
    }

    console.log('✅ Вход успешен:', username);
    return { success: true, data: data[0] };
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
      .eq('username', username);

    if (error) throw error;
    if (!data || data.length === 0) {
      return { success: false };
    }

    const user = data[0];
    console.log('☁️ Прогресс загружен (Supabase):', username);
    return {
      success: true,
      data: {
        XP: user.xp || 500,
        GOLD: user.gold || 0,
        SILVER: user.silver || 5000,
        owned: user.owned_tanks || ["T26"],
        selected: user.selected_tank || "T26",
        usedPromos: user.used_promos || [],
        quest23: user.quest_23 || { active: true, kills: 0, target: 15, claimed: false },
        inventory: user.inventory || {},
        boosters: user.boosters || { xp: 0, gold: 0, silver: 0 },
        boosterStock: user.booster_stock || { xp: 0, gold: 0, silver: 0 },
        modules: user.modules || {},
        upgrades: user.upgrades || {},
        upgradesBought: user.upgrades_bought || {},
        totalBattles: user.client_total_battles || 0,
        camos: user.camos || {},
        equippedCamo: user.equipped_camo || {},
        crew: user.crew || {},
        blueprints: user.blueprints || {},
        collectionBonusesClaimed: user.collection_bonuses_claimed || [],
        battlePass: user.battle_pass || { season: 1, level: 1, xp: 0, premium: false, claimedFree: [], claimedPremium: [] },
        referralCode: user.referral_code || null,
        referredBy: user.referred_by || null,
        newsLastSeenId: user.news_last_seen_id || 0,
        tutorialDone: user.tutorial_done || false
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

// ========== СТАТИСТИКА БОЁВ ==========
async function saveBattleStats(username, stats) {
  if (!supabaseClient || !supabaseClient.from) {
    return { success: true };
  }

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
    console.error('⚠️ Ошибка сохранения статистики:', error);
    return { success: true };
  }
}

// ========== ТАБЛИЦА ЛИДЕРОВ ==========
async function getLeaderboard(limit = 100) {
  if (!supabaseClient || !supabaseClient.from) {
    console.log('⚠️ Таблица лидеров недоступна (нет Supabase)');
    return { success: false, data: [] };
  }

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
    console.error('⚠️ Ошибка загрузки лидеров:', error);
    return { success: false, data: [] };
  }
}

// ========== ОНЛАЙН СТАТУС ==========
async function updateOnlineStatus(username, isOnline) {
  if (!supabaseClient || !supabaseClient.from) {
    return { success: true };
  }

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
    console.error('⚠️ Ошибка обновления статуса:', error);
    return { success: false };
  }
}

// ========== ОНЛАЙН ИГРОКИ ==========
async function getOnlinePlayers() {
  if (!supabaseClient || !supabaseClient.from) {
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
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('⚠️ Ошибка получения онлайн:', error);
    return { success: false, data: [] };
  }
}

// ========== ЧАТ ==========
async function sendChatMessage(username, message) {
  if (!supabaseClient || !supabaseClient.from) {
    return { success: true };
  }

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
    console.error('⚠️ Ошибка отправки:', error);
    return { success: false };
  }
}

async function getChatMessages(limit = 50) {
  if (!supabaseClient || !supabaseClient.from) {
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

function subscribeToChatMessages(callback) {
  if (!supabaseClient || !supabaseClient.from) {
    return null;
  }

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

console.log('✅ api.js полностью загружен');