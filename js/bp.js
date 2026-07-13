// js/bp.js
// ========== СИСТЕМА СЕЗОННОГО БОЕВОГО ПРОПУСКА ==========

const BattlePassSystem = {
  async addXP(amount) {
    GameState.bpXP += amount;
    let nextLevelXP = CONFIG.BATTLE_PASS.XP_PER_LEVEL;
    
    while (GameState.bpXP >= nextLevelXP && GameState.bpLevel < 30) {
      GameState.bpXP -= nextLevelXP;
      GameState.bpLevel++;
      crewMsg(`🎖️ Достигнут уровень сезона ${GameState.bpLevel}!`, "#f1c40f");
    }
    saveProgress();
    this.render();
  },

  buyPremium() {
    if (GameState.GOLD < CONFIG.BATTLE_PASS.PREMIUM_COST) {
      alert("❌ Недостаточно золота для покупки Премиум Пропуска!");
      return;
    }
    GameState.GOLD -= CONFIG.BATTLE_PASS.PREMIUM_COST;
    GameState.bp_premium = true;
    crewMsg("👑 Премиум доступ активирован!", "#ffd700");
    saveProgress();
    updateResources();
    this.render();
  },

  claimReward(level, isPremium) {
    if (level > GameState.bpLevel) return;
    
    let claimed = GameState.bpClaimedRewards || { free: [], premium: [] };
    if (isPremium && !GameState.bp_premium) return;
    
    if (isPremium) {
      if (claimed.premium.includes(level)) return;
      claimed.premium.push(level);
    } else {
      if (claimed.free.includes(level)) return;
      claimed.free.push(level);
    }
    
    // Выдача награды
    let r = isPremium ? CONFIG.BATTLE_PASS.REWARDS.premium[level] : CONFIG.BATTLE_PASS.REWARDS.free[level];
    if (r) {
      if (r.type === 'silver') GameState.SILVER += r.amount;
      if (r.type === 'gold') GameState.GOLD += r.amount;
      if (r.type === 'booster') GameState.boosterStock[r.kind] += r.amount;
      if (r.type === 'container') {
        GameState.inventory[r.provider] = (GameState.inventory[r.provider] || 0) + 1;
      }
      if (r.type === 'tank') {
        if (!GameState.owned.includes(r.tid)) GameState.owned.push(r.tid);
      }
    }
    
    GameState.bpClaimedRewards = claimed;
    saveProgress();
    updateResources();
    this.render();
    alert(`🎁 Получена награда: ${r.label}`);
  },

  render() {
    const container = document.getElementById('tab-bp');
    if (!container) return;

    let bpXP = GameState.bpXP || 0;
    let bpLvl = GameState.bpLevel || 1;
    let nextLevelXP = CONFIG.BATTLE_PASS.XP_PER_LEVEL;
    let pct = Math.min(100, (bpXP / nextLevelXP) * 100);

    let html = `
      <div style="padding: 20px; background: rgba(0,0,0,0.85); border-radius: 10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
          <h2>🎖️ СЕЗОННЫЙ БОЕВОЙ ПРОПУСК</h2>
          ${!GameState.bp_premium ? `<button class="btn" style="background:#ffd700; color:#000;" onclick="BattlePassSystem.buyPremium()">👑 Купить Премиум за ${CONFIG.BATTLE_PASS.PREMIUM_COST} G</button>` : `<span style="color:#ffd700; font-weight:bold;">👑 ПРЕМИУМ АКТИВЕН</span>`}
        </div>
        
        <div style="margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
            <span>Уровень: <strong>${bpLvl} / 30</strong></span>
            <span>${bpXP} / ${nextLevelXP} XP</span>
          </div>
          <div style="width:100%; height:16px; background:#111; border:1px solid #555; border-radius:8px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, #d35400, #f1c40f);"></div>
          </div>
        </div>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:10px; max-height:450px; overflow-y:auto; padding-right:5px;">
    `;

    for (let i = 1; i <= 30; i++) {
      let freeReward = CONFIG.BATTLE_PASS.REWARDS.free[i] || { label: "Пусто" };
      let premReward = CONFIG.BATTLE_PASS.REWARDS.premium[i];
      let claimedFree = (GameState.bpClaimedRewards?.free || []).includes(i);
      let claimedPrem = (GameState.bpClaimedRewards?.premium || []).includes(i);

      html += `
        <div style="background:#222; border: 1px solid ${i <= bpLvl ? '#f1c40f' : '#444'}; padding:10px; border-radius:5px; text-align:center;">
          <div style="font-size:14px; font-weight:bold; color:#f1c40f; margin-bottom:8px;">Уровень ${i}</div>
          
          <div style="font-size:11px; background:#111; padding:5px; margin-bottom:5px; border-radius:3px;">
            <div style="color:#aaa;">Обычный:</div>
            <div>${freeReward.label}</div>
            ${i <= bpLvl && !claimedFree && freeReward.label !== "Пусто" ? `<button class="btn btn-sm" style="margin-top:4px;" onclick="BattlePassSystem.claimReward(${i}, false)">Забрать</button>` : ''}
            ${claimedFree ? '<span style="color:#2ecc71; font-size:10px;">✓ Получено</span>' : ''}
          </div>

          ${premReward ? `
          <div style="font-size:11px; background:rgba(255, 215, 0, 0.05); border:1px solid rgba(255, 215, 0, 0.2); padding:5px; border-radius:3px;">
            <div style="color:#ffd700;">Премиум:</div>
            <div style="font-weight:bold;">${premReward.label}</div>
            ${i <= bpLvl && !claimedPrem && GameState.bp_premium ? `<button class="btn btn-sm" style="margin-top:4px; background:#ffd700; color:#000;" onclick="BattlePassSystem.claimReward(${i}, true)">Забрать</button>` : ''}
            ${claimedPrem ? '<span style="color:#2ecc71; font-size:10px;">✓ Получено</span>' : ''}
          </div>
          ` : ''}
        </div>
      `;
    }

    html += `</div></div>`;
    container.innerHTML = html;
  }
};