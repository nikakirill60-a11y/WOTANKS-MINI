// js/bp.js
// ========== БОЕВОЙ ПРОПУСК (BattlePassSystem) ==========
console.log('🎖️ bp.js загружен');

const BattlePassSystem = {
  seasonalPool: [],

  // Эксклюзивные танки боевого пропуска
  TANKS_DB: {
    BP_PZ2D: { n: "Pz.Kpfw. II Ausf. D", nat: "germany", tier: 2, hp: 230, dmg: 20, s: .75, mag: 3, reload: 3200, off: 5, vr: 300, camo: .32, cls: 'lt', armor: 40, nc: '#f1c40f', premium: true, collection: true, desc: "Награда боевого пропуска — 1 уровень." },
    BP_T34E: { n: "Т-34 экранированный", nat: "ussr", tier: 5, hp: 980, dmg: 160, s: .95, off: 5, vr: 340, camo: .2, cls: 'mt', armor: 95, nc: '#f1c40f', premium: true, collection: true, desc: "Награда боевого пропуска — 15 уровень. Дополнительные экраны брони." },
    BP_E75TS: { n: "E 75 TS", nat: "germany", tier: 8, hp: 1550, dmg: 320, s: 1.0, off: 8, vr: 360, camo: .12, cls: 'ht', armor: 210, nc: '#f1c40f', premium: true, collection: true, desc: "Награда боевого пропуска — 30 уровень." }
  },

  init() {
    for (const id in this.TANKS_DB) DB[id] = this.TANKS_DB[id];
    this.seasonalPool = [];
    for (const tid in DB) {
      const t = DB[tid];
      if (!t.collection && !t.premium && t.tier >= 4 && t.tier <= 6) this.seasonalPool.push(tid);
    }
    console.log('🎖️ Сезонный пул (IV-VI ур.):', this.seasonalPool.length, 'танков');
  },

  // ========== НАЧИСЛЕНИЕ ОПЫТА ==========
  addXP(amount) {
    if (!amount || amount <= 0) return;
    const bp = GameState.battlePass;
    if (bp.level >= CONFIG.BATTLE_PASS.maxLevel) return;

    bp.xp += amount;
    const need = CONFIG.BATTLE_PASS.xpPerLevel;
    while (bp.xp >= need && bp.level < CONFIG.BATTLE_PASS.maxLevel) {
      bp.xp -= need;
      bp.level++;
      if (GameState.player) crewMsg('🎖️ Боевой пропуск: ' + bp.level + ' уровень!', '#f1c40f');
    }
    this.render();
  },

  // ========== НАГРАДЫ ==========
  getFreeReward(level) {
    if (level % 10 === 0) return { type: 'gold', amount: 80 };
    if (level % 5 === 0) return { type: 'booster', kind: 'xp' };
    return { type: 'silver', amount: 1500 + level * 150 };
  },

  getPremiumReward(level) {
    const special = CONFIG.BATTLE_PASS.premiumTankLevels[level];
    if (special) return { type: 'tank', id: special.id, name: special.name };
    if (level % 3 === 0) return { type: 'seasonal_container' };
    if (level % 5 === 0) return { type: 'booster', kind: (level % 2 === 0 ? 'gold' : 'silver') };
    return { type: 'gold', amount: 30 + level * 3 };
  },

  applyReward(reward) {
    if (reward.type === 'silver') GameState.SILVER += reward.amount;
    else if (reward.type === 'gold') GameState.GOLD += reward.amount;
    else if (reward.type === 'xp') GameState.XP += reward.amount;
    else if (reward.type === 'booster') GameState.boosterStock[reward.kind] = (GameState.boosterStock[reward.kind] || 0) + 1;
    else if (reward.type === 'tank') { if (GameState.owned.indexOf(reward.id) === -1) GameState.owned.push(reward.id); }
    else if (reward.type === 'seasonal_container') return this.openSeasonalReward();
    return reward;
  },

  // Сезонный контейнер: танки IV-VI уровня / бустеры / серебро / золото
  openSeasonalReward() {
    const roll = Math.random();
    let result;
    if (roll < 0.15 && this.seasonalPool.length > 0) {
      const tid = this.seasonalPool[Math.floor(Math.random() * this.seasonalPool.length)];
      if (GameState.owned.indexOf(tid) === -1) GameState.owned.push(tid);
      result = { type: 'tank', id: tid, name: DB[tid].n };
    } else if (roll < 0.45) {
      const kind = ['xp', 'gold', 'silver'][Math.floor(Math.random() * 3)];
      GameState.boosterStock[kind] = (GameState.boosterStock[kind] || 0) + 1;
      result = { type: 'booster', kind };
    } else if (roll < 0.75) {
      const g = 50 + Math.floor(Math.random() * 150);
      GameState.GOLD += g;
      result = { type: 'gold', amount: g };
    } else {
      const s = 8000 + Math.floor(Math.random() * 12000);
      GameState.SILVER += s;
      result = { type: 'silver', amount: s };
    }
    return result;
  },

  // ========== ПОЛУЧЕНИЕ НАГРАДЫ ЗА УРОВЕНЬ ==========
  claim(level, track) {
    const bp = GameState.battlePass;
    if (level > bp.level) return { success: false, error: 'Уровень ещё не достигнут' };
    if (track === 'premium' && !bp.premium) return { success: false, error: 'Нужен премиум-пропуск' };

    const claimedList = track === 'premium' ? bp.claimedPremium : bp.claimedFree;
    if (claimedList.indexOf(level) !== -1) return { success: false, error: 'Уже получено' };

    const reward = track === 'premium' ? this.getPremiumReward(level) : this.getFreeReward(level);
    const applied = this.applyReward(reward) || reward;
    claimedList.push(level);

    updateResources();
    saveProgress();
    this.render();
    return { success: true, reward: applied };
  },

  // ========== ПОКУПКА ПРЕМИУМ-ПРОПУСКА ("Сезонный") ==========
  buyPremium() {
    const bp = GameState.battlePass;
    if (bp.premium) return { success: false, error: 'Уже куплен' };
    const cost = CONFIG.BATTLE_PASS.premiumCostGold;
    if (GameState.GOLD < cost) return { success: false, error: 'Недостаточно золота (' + cost + ' G)' };
    GameState.GOLD -= cost;
    bp.premium = true;
    updateResources();
    saveProgress();
    this.render();
    return { success: true };
  },

  rewardLabel(r) {
    if (r.type === 'tank') return '🪖 ' + (r.name || r.id);
    if (r.type === 'gold') return '🪙 ' + r.amount + 'G';
    if (r.type === 'silver') return '💰 ' + r.amount + '₽';
    if (r.type === 'xp') return '⭐ ' + r.amount + 'XP';
    if (r.type === 'booster') return '🚀 Бустер';
    if (r.type === 'seasonal_container') return '📦 Сезонный';
    return '🎁';
  },

  // ========== РЕНДЕР ВО ВКЛАДКУ #tab-bp ==========
  render() {
    const host = document.getElementById('tab-bp');
    if (!host) return;
    const bp = GameState.battlePass;

    let html = '<div class="battlepass-header"><h2>🎖️ Боевой пропуск — Уровень ' + bp.level + '/' + CONFIG.BATTLE_PASS.maxLevel + ' (' + Math.floor(bp.xp) + '/' + CONFIG.BATTLE_PASS.xpPerLevel + ' XP)' + (bp.premium ? ' · ⭐ ' + CONFIG.BATTLE_PASS.seasonName : '') + '</h2></div>';

    if (!bp.premium) {
      html += '<div style="padding:10px 0"><button class="btn btn-bp-premium" onclick="var r=BattlePassSystem.buyPremium(); if(!r.success)alert(r.error);">⭐ Купить «' + CONFIG.BATTLE_PASS.seasonName + '» пропуск — ' + CONFIG.BATTLE_PASS.premiumCostGold + ' G</button></div>';
    }
    html += '<p style="color:#888;font-size:11px">Верхний ряд — премиум-награды («' + CONFIG.BATTLE_PASS.seasonName + '»), нижний — бесплатные. Три уникальных танка на 1, 15 и 30 уровнях премиум-трека.</p>';
    html += '<div id="battlepass-track">';

    for (let lvl = 1; lvl <= CONFIG.BATTLE_PASS.maxLevel; lvl++) {
      const reached = bp.level >= lvl;
      const freeClaimed = bp.claimedFree.indexOf(lvl) !== -1;
      const premClaimed = bp.claimedPremium.indexOf(lvl) !== -1;
      const premReward = this.getPremiumReward(lvl);
      const freeReward = this.getFreeReward(lvl);

      html += '<div style="display:inline-flex;flex-direction:column;gap:4px;margin:3px;min-width:70px;text-align:center;vertical-align:top">';
      html += '<div style="border:2px solid ' + (bp.premium ? '#f1c40f' : '#555') + ';border-radius:6px;padding:4px;background:#1a1a2e;font-size:10px;color:#fff;cursor:pointer;opacity:' + (reached ? '1' : '0.5') + '" onclick="var r=BattlePassSystem.claim(' + lvl + ',\'premium\'); if(!r.success)alert(r.error); else alert(\'Получено: \'+BattlePassSystem.rewardLabel(r.reward||{}));">' + this.rewardLabel(premReward) + (premClaimed ? '<br>✅' : '') + '</div>';
      html += '<div style="border:1px solid #555;border-radius:6px;padding:4px;background:#222;font-size:10px;color:#ccc;cursor:pointer;opacity:' + (reached ? '1' : '0.5') + '" onclick="var r=BattlePassSystem.claim(' + lvl + ',\'free\'); if(!r.success)alert(r.error); else alert(\'Получено: \'+BattlePassSystem.rewardLabel(r.reward||{}));">' + this.rewardLabel(freeReward) + (freeClaimed ? '<br>✅' : '') + '</div>';
      html += '<div style="color:#888;font-size:9px">Ур.' + lvl + '</div>';
      html += '</div>';
    }
    html += '</div>';
    host.innerHTML = html;
  }
};

window.BattlePassSystem = BattlePassSystem;
window.addBattlePassXP = function (amount) { BattlePassSystem.addXP(amount); }; // обратная совместимость

// ⚠️ bp.js должен подключаться ПОСЛЕ containers.js — сезонный пул строится из полного DB
BattlePassSystem.init();
