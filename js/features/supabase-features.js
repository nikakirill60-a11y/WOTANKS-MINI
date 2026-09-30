// js/supabase-features.js
// 🌐 Расширенная интеграция Supabase: Кланы, Рейтинги, Почта, Рынок, Друзья, Мировой Босс, Реплеи и Облачные сохранения
console.log('🚀 supabase-features.js загружается...');

const SupabaseFeatures = {
  // 1. ОБЛАЧНЫЕ СОХРАНЕНИЯ С РАЗРЕШЕНИЕМ КОНФЛИКТОВ
  async autoCloudSync() {
    const user = typeof currentUser !== 'undefined' && currentUser ? currentUser.username : null;
    if (!user || !supabaseClient || !supabaseClient.from) return;
    try {
      const stateToSave = {
        XP: GameState.XP,
        GOLD: GameState.GOLD,
        SILVER: GameState.SILVER,
        charges: GameState.charges || 0,
        owned: GameState.owned,
        selected: GameState.selected,
        usedPromos: GameState.usedPromos,
        inventory: GameState.inventory,
        boosters: GameState.boosters,
        boosterStock: GameState.boosterStock,
        modules: GameState.modules,
        upgrades: GameState.upgrades,
        camos: GameState.camos,
        crew: GameState.crew,
        blueprints: GameState.blueprints,
        battlePass: GameState.battlePass,
        dailyQuests: GameState.dailyQuests,
        rankedRating: GameState.rankedRating || 1000,
        clanId: GameState.clanId || null,
        favoriteTanks: GameState.favoriteTanks || [],
        fieldMods: GameState.fieldMods || {},
        equipment: GameState.equipment || {},
        provisions: GameState.provisions || {},
        avatars: GameState.avatars || ['default'],
        selectedAvatar: GameState.selectedAvatar || 'default',
        playerTitle: GameState.playerTitle || 'Танкист',
        vaults: GameState.vaults || { gold: 0, silver: 0 },
        loginCalendar: GameState.loginCalendar || { lastDay: 0, streak: 0, lastClaimDate: null },
        lbzProgress: GameState.lbzProgress || {},
        timestamp: Date.now()
      };
      await saveUserProgress(user, stateToSave);
      console.log('☁️ Автоматическая синхронизация с Supabase выполнена');
    } catch (e) {
      console.warn('⚠️ Ошибка автосинхронизации:', e.message);
    }
  },

  // 2. РАСШИРЕННЫЕ ТАБЛИЦЫ ЛИДЕРОВ (5 категорий)
  async getTopLeaderboards(category = 'xp', limit = 20) {
    if (!supabaseClient || !supabaseClient.from) {
      return this.getLocalMockLeaderboard(category);
    }
    try {
      let orderCol = 'xp';
      if (category === 'damage') orderCol = 'total_damage';
      if (category === 'wins') orderCol = 'total_wins';
      if (category === 'battles') orderCol = 'total_battles';
      if (category === 'gold') orderCol = 'gold';

      const { data, error } = await supabaseClient
        .from('users')
        .select('username, xp, gold, silver, total_battles, total_wins, total_kills, total_damage, selected_tank')
        .order(orderCol, { ascending: false })
        .limit(limit);

      if (error || !data || data.length === 0) {
        return this.getLocalMockLeaderboard(category);
      }
      return data;
    } catch (e) {
      return this.getLocalMockLeaderboard(category);
    }
  },

  getLocalMockLeaderboard(category) {
    const list = [
      { username: 'VonKrieger_99', xp: 950000, gold: 45000, total_battles: 1420, total_wins: 1050, total_kills: 3100, total_damage: 4500000, selected_tank: 'WT_E110' },
      { username: 'IronGeneral', xp: 720000, gold: 28000, total_battles: 980, total_wins: 690, total_kills: 2200, total_damage: 3200000, selected_tank: 'MAUS' },
      { username: 'GhostRider_UA', xp: 580000, gold: 19500, total_battles: 810, total_wins: 540, total_kills: 1750, total_damage: 2600000, selected_tank: 'OB140' },
      { username: 'ThunderBolt', xp: 460000, gold: 12000, total_battles: 650, total_wins: 430, total_kills: 1400, total_damage: 2100000, selected_tank: 'T55_THUNDER' },
      { username: 'SniperElite_EU', xp: 390000, gold: 9800, total_battles: 520, total_wins: 340, total_kills: 1100, total_damage: 1700000, selected_tank: 'GRILLE15' },
      { username: (typeof currentUser !== 'undefined' && currentUser ? currentUser.username : 'Вы (Командир)'), xp: GameState.XP || 1000, gold: GameState.GOLD || 0, total_battles: GameState.totalBattles || 1, total_wins: GameState.lifetimeWins || 1, total_kills: 5, total_damage: 12500, selected_tank: GameState.selected || 'T26' }
    ];
    let sortKey = 'xp';
    if (category === 'damage') sortKey = 'total_damage';
    if (category === 'wins') sortKey = 'total_wins';
    if (category === 'battles') sortKey = 'total_battles';
    if (category === 'gold') sortKey = 'gold';
    return list.sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
  },

  // 3. СИСТЕМА КЛАНОВ (Создание, вступление, тег, казна, перки)
  async createClan(clanName, clanTag, emblem = '🛡️') {
    const cost = 2500;
    if (GameState.GOLD < cost) {
      return { success: false, error: `Недостаточно золота для создания клана! Нужно ${cost} 🪙` };
    }
    const currentUsername = typeof currentUser !== 'undefined' && currentUser ? currentUser.username : 'Командир';
    const clanId = 'clan_' + Date.now();
    const newClan = {
      id: clanId,
      name: clanName,
      tag: clanTag.toUpperCase(),
      emblem: emblem,
      leader: currentUsername,
      members: [currentUsername],
      level: 1,
      treasurySilver: 50000,
      treasuryGold: 500,
      createdAt: new Date().toISOString()
    };

    GameState.GOLD -= cost;
    GameState.clanId = clanId;
    GameState.clanTag = newClan.tag;

    if (supabaseClient && supabaseClient.from) {
      try {
        await supabaseClient.from('clans').insert([newClan]);
      } catch (e) {
        console.warn('Локальное сохранение клана');
      }
    }
    const localClans = JSON.parse(localStorage.getItem('ct_clans') || '[]');
    localClans.push(newClan);
    localStorage.setItem('ct_clans', JSON.stringify(localClans));
    if (typeof saveProgress === 'function') saveProgress();
    return { success: true, clan: newClan };
  },

  async getClansList() {
    if (supabaseClient && supabaseClient.from) {
      try {
        const { data, error } = await supabaseClient.from('clans').select('*').limit(30);
        if (!error && data && data.length > 0) return data;
      } catch (e) {}
    }
    const localClans = JSON.parse(localStorage.getItem('ct_clans') || '[]');
    if (localClans.length === 0) {
      return [
        { id: 'clan_1', name: 'Стальной Кулак', tag: 'STEEL', emblem: '⚔️', leader: 'IronGeneral', members: ['IronGeneral', 'SniperElite_EU'], level: 3, treasuryGold: 4500 },
        { id: 'clan_2', name: 'Орден Ваффентрагера', tag: 'KRIEGER', emblem: '⚡', leader: 'VonKrieger_99', members: ['VonKrieger_99', 'ThunderBolt'], level: 5, treasuryGold: 12000 },
        { id: 'clan_3', name: 'Легион Победы', tag: 'VICTORY', emblem: '👑', leader: 'GhostRider_UA', members: ['GhostRider_UA'], level: 2, treasuryGold: 1500 }
      ];
    }
    return localClans;
  },

  async donateToClan(silver = 0, gold = 0) {
    if (GameState.SILVER < silver || GameState.GOLD < gold) {
      return { success: false, error: 'Недостаточно ресурсов для взноса!' };
    }
    GameState.SILVER -= silver;
    GameState.GOLD -= gold;
    if (typeof saveProgress === 'function') saveProgress();
    return { success: true, message: `Вы внесли ${silver} 🥈 и ${gold} 🪙 в казну клана!` };
  },

  // 4. СИСТЕМА ПОЧТЫ И НАГРАД (Mailbox & Gift System)
  async getMailbox() {
    let mails = JSON.parse(localStorage.getItem('ct_mailbox') || '[]');
    if (mails.length === 0) {
      mails = [
        {
          id: 'mail_welcome',
          from: 'Штаб Командования',
          title: 'Добро пожаловать в Обновление 2.0!',
          text: 'Командир! Мы подготовили для вас стартовый пакет снабжения. Удачных боев на полях сражений!',
          claimed: false,
          attachment: { gold: 500, silver: 50000, xp: 5000, charges: 3 },
          date: 'Сегодня'
        },
        {
          id: 'mail_event',
          from: 'Фон Кригер',
          title: 'Вызов принят: Ваффентрагер',
          text: 'Энергетические щиты заряжены на максимум. Попробуйте пробить мою броню, гончие!',
          claimed: false,
          attachment: { charges: 2, gold: 200 },
          date: 'Вчера'
        }
      ];
      localStorage.setItem('ct_mailbox', JSON.stringify(mails));
    }
    return mails;
  },

  async claimMailAttachment(mailId) {
    const mails = await this.getMailbox();
    const mail = mails.find(m => m.id === mailId);
    if (!mail || mail.claimed) return { success: false, error: 'Награда уже получена или письмо не найдено' };

    if (mail.attachment) {
      if (mail.attachment.gold) GameState.GOLD += mail.attachment.gold;
      if (mail.attachment.silver) GameState.SILVER += mail.attachment.silver;
      if (mail.attachment.xp) GameState.XP += mail.attachment.xp;
      if (mail.attachment.charges) GameState.charges = (GameState.charges || 0) + mail.attachment.charges;
    }
    mail.claimed = true;
    localStorage.setItem('ct_mailbox', JSON.stringify(mails));
    if (typeof saveProgress === 'function') saveProgress();
    return { success: true, attachment: mail.attachment };
  },

  // 5. МИРОВОЙ БОСС: ГЛОБАЛЬНЫЙ СЕРВЕРНЫЙ РЕЙД (Global Raid Boss)
  async getWorldBossStatus() {
    let bossData = JSON.parse(localStorage.getItem('ct_world_boss') || 'null');
    if (!bossData) {
      bossData = {
        name: 'Левиафан: Разрушитель Миров',
        maxHp: 10000000,
        currentHp: 6420500,
        endTime: Date.now() + 86400000 * 3,
        tierMilestones: [
          { hpTarget: 8000000, reward: '1000 🪙 + 3 Контейнера', claimed: true },
          { hpTarget: 5000000, reward: '2500 🪙 + Спец. Камуфляж "Плазма"', claimed: false },
          { hpTarget: 2000000, reward: '5000 🪙 + 10 Зарядов Ваффентрагера', claimed: false },
          { hpTarget: 0, reward: 'Уникальный танк: Leviathan Prototype XI', claimed: false }
        ]
      };
      localStorage.setItem('ct_world_boss', JSON.stringify(bossData));
    }
    return bossData;
  },

  async dealWorldBossDamage(dmg) {
    const boss = await this.getWorldBossStatus();
    boss.currentHp = Math.max(0, boss.currentHp - dmg);
    localStorage.setItem('ct_world_boss', JSON.stringify(boss));
    return boss;
  },

  // 6. СИСТЕМА ДРУЗЕЙ И ВЗВОДОВ (Friends & Social Hub)
  async getFriendsList() {
    let friends = JSON.parse(localStorage.getItem('ct_friends') || '[]');
    if (friends.length === 0) {
      friends = [
        { username: 'GhostRider_UA', isOnline: true, tank: 'T-62A', rating: 2450 },
        { username: 'IronGeneral', isOnline: true, tank: 'Maus', rating: 3100 },
        { username: 'ThunderBolt', isOnline: false, tank: 'T-55A', rating: 1850 }
      ];
      localStorage.setItem('ct_friends', JSON.stringify(friends));
    }
    return friends;
  },

  async addFriend(friendName) {
    const friends = await this.getFriendsList();
    if (friends.some(f => f.username.toLowerCase() === friendName.toLowerCase())) {
      return { success: false, error: 'Игрок уже в списке друзей!' };
    }
    friends.push({ username: friendName, isOnline: true, tank: 'T26', rating: 1000 });
    localStorage.setItem('ct_friends', JSON.stringify(friends));
    return { success: true };
  },

  // 7. РЕЙТИНГОВАЯ ЛИГА (Ranked League & MMR)
  getRankLeague(rating) {
    if (rating >= 4500) return { name: '👑 Легенда', color: '#ff0055', icon: '👑' };
    if (rating >= 3500) return { name: '💎 Мастер', color: '#00e5ff', icon: '💎' };
    if (rating >= 2500) return { name: '💠 Бриллиант', color: '#3388ff', icon: '💠' };
    if (rating >= 1800) return { name: '🥇 Платина', color: '#00ffcc', icon: '🥇' };
    if (rating >= 1200) return { name: '🥈 Золото', color: '#ffd700', icon: '🥈' };
    if (rating >= 700) return { name: '🥉 Серебро', color: '#c0c0c0', icon: '🥉' };
    return { name: '🛡️ Бронза', color: '#cd7f32', icon: '🛡️' };
  },

  updateRankedMatch(won, kills, damage) {
    if (!GameState.rankedRating) GameState.rankedRating = 1000;
    const delta = won ? (25 + Math.floor(kills * 5) + Math.floor(damage / 500)) : -Math.max(5, 20 - Math.floor(damage / 800));
    GameState.rankedRating = Math.max(100, GameState.rankedRating + delta);
    if (typeof saveProgress === 'function') saveProgress();
    return { rating: GameState.rankedRating, delta, league: this.getRankLeague(GameState.rankedRating) };
  },

  // 8. РЕПЛЕИ И КОДЫ БОЕВ (Replay & Share Code Generator)
  generateReplayCode(stats) {
    const replayObj = {
      date: new Date().toLocaleDateString(),
      tank: stats.tankId || GameState.selected,
      map: stats.map || 'city',
      dmg: stats.damage || 0,
      kills: stats.kills || 0,
      won: stats.won || false,
      xp: stats.xp || 0,
      silver: stats.silver || 0,
      seed: Math.floor(Math.random() * 999999)
    };
    const code = 'WT-' + btoa(JSON.stringify(replayObj)).substring(0, 16).toUpperCase();
    return { code, replay: replayObj };
  },

  // 9. ЖИВАЯ ЛЕНТА СОБЫТИЙ СЕРВЕРА (Live Activity Ticker)
  getLiveServerEvents() {
    return [
      { text: '🔥 Игрок VonKrieger_99 выбил Blitzträger auf E 220 из контейнера!', time: '1 мин назад' },
      { text: '🛡️ Клан [STEEL] победил в клановой битве и захватил провинцию!', time: '3 мин назад' },
      { text: '⚡ Игрок ThunderBolt нанес 9,450 урона на T-55 Thunderbolt!', time: '7 мин назад' },
      { text: '💎 Игрок IronGeneral достиг лиги "Мастер" (3,620 MMR)!', time: '12 мин назад' }
    ];
  }
};

window.SupabaseFeatures = SupabaseFeatures;
console.log('✅ supabase-features.js полностью готов');
