// js/features/economy-vaults.js
// 💰 Экономика: Премиум аккаунт, 30-дневный календарь наград, Сейфы золота/серебра, Черный рынок, Колесо фортуны, Лаборатория чертежей
console.log('🏦 economy-vaults.js загружается...');

const EconomyEngine = {
  // 76. ПРЕМИУМ АККАУНТ
  isPremiumActive() {
    return !!(GameState.premiumUntil && GameState.premiumUntil > Date.now());
  },

  buyPremiumDays(days = 1) {
    const cost = days === 1 ? 250 : (days === 7 ? 1250 : 3000);
    if (GameState.GOLD < cost) {
      alert(`Недостаточно золота! Нужно ${cost} 🪙`);
      return false;
    }
    GameState.GOLD -= cost;
    const now = Date.now();
    const base = (GameState.premiumUntil && GameState.premiumUntil > now) ? GameState.premiumUntil : now;
    GameState.premiumUntil = base + days * 86400000;
    if (typeof saveProgress === 'function') saveProgress();
    if (typeof updateUI === 'function') updateUI();
    return true;
  },

  // 77. 30-ДНЕВНЫЙ КАЛЕНДАРЬ НАГРАД
  getDailyCalendarData() {
    if (!GameState.loginCalendar) {
      GameState.loginCalendar = { streak: 0, lastClaimDay: null, claimedDays: [] };
    }
    const days = [];
    for (let i = 1; i <= 30; i++) {
      let reward = { gold: 50, silver: 10000, xp: 1000, text: '50 🪙 + 10k 🥈' };
      if (i === 7) reward = { gold: 500, silver: 50000, charges: 2, text: '🎁 500 🪙 + 2 Заряда' };
      if (i === 14) reward = { gold: 1000, silver: 100000, tank: 'T34_85', text: '⭐ Т-34-85 + 1000 🪙' };
      if (i === 21) reward = { gold: 1500, silver: 250000, charges: 5, text: '⚡ 1500 🪙 + 5 Зарядов' };
      if (i === 28 || i === 30) reward = { gold: 3000, silver: 500000, tank: 'IS3', text: '👑 ИС-3 + 3000 🪙' };
      days.push({ day: i, reward, claimed: GameState.loginCalendar.claimedDays.includes(i) });
    }
    return days;
  },

  claimDailyCalendar(dayNum) {
    const days = this.getDailyCalendarData();
    const item = days.find(d => d.day === dayNum);
    if (!item || item.claimed) return false;

    if (item.reward.gold) GameState.GOLD += item.reward.gold;
    if (item.reward.silver) GameState.SILVER += item.reward.silver;
    if (item.reward.xp) GameState.XP += item.reward.xp;
    if (item.reward.charges) GameState.charges = (GameState.charges || 0) + item.reward.charges;
    if (item.reward.tank && !GameState.owned.includes(item.reward.tank)) GameState.owned.push(item.reward.tank);

    GameState.loginCalendar.claimedDays.push(dayNum);
    if (typeof saveProgress === 'function') saveProgress();
    if (typeof updateUI === 'function') updateUI();
    return true;
  },

  // 78. СЕЙФЫ ЗОЛОТА И СЕРЕБРА (Vaults)
  addBattleToVault(silverEarned, goldEarned = 10) {
    if (!GameState.vaults) GameState.vaults = { gold: 0, silver: 0, maxGold: 1000, maxSilver: 200000 };
    GameState.vaults.gold = Math.min(GameState.vaults.maxGold || 1000, GameState.vaults.gold + goldEarned);
    GameState.vaults.silver = Math.min(GameState.vaults.maxSilver || 200000, GameState.vaults.silver + Math.round(silverEarned * 0.15));
    if (typeof saveProgress === 'function') saveProgress();
  },

  openVaults() {
    if (!GameState.vaults) return false;
    const g = GameState.vaults.gold || 0;
    const s = GameState.vaults.silver || 0;
    if (g === 0 && s === 0) {
      alert('Сейфы пока пусты! Сражайтесь в боях, чтобы наполнить их!');
      return false;
    }
    GameState.GOLD += g;
    GameState.SILVER += s;
    GameState.vaults.gold = 0;
    GameState.vaults.silver = 0;
    if (typeof saveProgress === 'function') saveProgress();
    if (typeof updateUI === 'function') updateUI();
    alert(`🎉 СЕЙФ ВЗЛОМАН!\nПолучено: +${g} 🪙 и +${s} 🥈!`);
    return true;
  },

  // 79. ЧЕРНЫЙ РЫНОК (Black Market)
  getBlackMarketOffers() {
    return [
      { id: 'bm_1', name: '📦 Партия чертежей Type 71', costGold: 2500, discount: '-40%', item: 'blueprints_type71' },
      { id: 'bm_2', name: '🎨 Легендарный камуфляж "Плазма"', costGold: 1500, discount: '-50%', item: 'camo_plasma' },
      { id: 'bm_3', name: '⚡ 10 Зарядов Ваффентрагера', costGold: 750, discount: '-25%', item: 'charges_10' }
    ];
  },

  // 81. КОЛЕСО ФОРТУНЫ (Lucky Wheel)
  spinWheel() {
    const cost = 100;
    if (GameState.GOLD < cost) {
      alert(`Недостаточно золота для прокрутки! Нужно ${cost} 🪙`);
      return null;
    }
    GameState.GOLD -= cost;
    const prizes = [
      { name: '100 🪙 Золото', type: 'gold', val: 100, icon: '🪙' },
      { name: '50,000 🥈 Серебро', type: 'silver', val: 50000, icon: '🥈' },
      { name: '5,000 💡 Опыт', type: 'xp', val: 5000, icon: '💡' },
      { name: '3 ⚡ Заряда Ваффентрагера', type: 'charges', val: 3, icon: '⚡' },
      { name: '500 🪙 ДЖЕКПОТ!', type: 'gold', val: 500, icon: '👑' },
      { name: '📦 Большой Контейнер', type: 'container', val: 'huge', icon: '📦' }
    ];
    const prize = prizes[Math.floor(Math.random() * prizes.length)];
    if (prize.type === 'gold') GameState.GOLD += prize.val;
    if (prize.type === 'silver') GameState.SILVER += prize.val;
    if (prize.type === 'xp') GameState.XP += prize.val;
    if (prize.type === 'charges') GameState.charges = (GameState.charges || 0) + prize.val;

    if (typeof saveProgress === 'function') saveProgress();
    if (typeof updateUI === 'function') updateUI();
    return prize;
  }
};

window.EconomyEngine = EconomyEngine;
console.log('✅ economy-vaults.js полностью готов');
