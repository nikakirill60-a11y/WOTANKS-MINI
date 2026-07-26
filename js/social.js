// js/social.js
// ========== РЫНОК + РЕФЕРАЛЬНАЯ ПРОГРАММА (SocialSystem) ==========
console.log('🏪🔗 social.js загружен');
// Таблицы Supabase: marketplace_listings, referrals (см. supabase-migration.sql)

const SocialSystem = {

  // ================= РЫНОК =================

  canSellTank(tankId) {
    if (GameState.owned.indexOf(tankId) === -1) return { ok: false, error: 'Танк не куплен' };
    if (!DB[tankId] || !DB[tankId].collection) return { ok: false, error: 'Продавать можно только коллекционные танки' };
    if ((GameState.totalBattles || 0) < CONFIG.MARKETPLACE.minBattlesToSellTank) {
      return { ok: false, error: 'Нужно ' + CONFIG.MARKETPLACE.minBattlesToSellTank + ' боёв (сыграно: ' + (GameState.totalBattles || 0) + ')' };
    }
    if (GameState.selected === tankId) return { ok: false, error: 'Нельзя продать выбранный танк — выберите другой' };
    return { ok: true };
  },

  // Заполняет <select id="market-sell-select"> танками, которые можно продать
  populateSellSelect() {
    const sel = document.getElementById('market-sell-select');
    if (!sel) return;
    sel.innerHTML = '';
    let any = false;
    GameState.owned.forEach(id => {
      if (DB[id] && DB[id].collection && id !== GameState.selected) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.innerText = DB[id].n + ' [' + (CONFIG.TIER_ROMAN[DB[id].tier] || '') + ']';
        sel.appendChild(opt);
        any = true;
      }
    });
    if (!any) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.innerText = 'Нет коллекционных танков для продажи';
      sel.appendChild(opt);
    }
  },

  // Вызывается кнопкой "Выставить на рынок" (id, ценаGold, ценаSilver)
  async sellTank(tankId, priceGold, priceSilver) {
    if (!tankId) { alert('Выберите танк'); return; }
    const check = this.canSellTank(tankId);
    if (!check.ok) { alert(check.error); return; }

    const price = priceGold > 0 ? priceGold : priceSilver;
    const currency = priceGold > 0 ? 'gold' : 'silver';
    if (!price || price <= 0) { alert('Укажите цену'); return; }
    if (!supabaseClient || !supabaseClient.from) { alert('Рынок недоступен offline'); return; }

    GameState.owned.splice(GameState.owned.indexOf(tankId), 1);
    delete GameState.equippedCamo[tankId];

    try {
      await supabaseClient.from('marketplace_listings').insert([{
        seller: currentUser, item_type: 'tank', item_id: tankId,
        price, currency, status: 'active', created_at: new Date().toISOString()
      }]);
      saveProgress();
      alert('✅ Танк выставлен на продажу');
      this.loadOffers();
      this.populateSellSelect();
    } catch (error) {
      console.error('⚠️ Ошибка выставления лота:', error);
      GameState.owned.push(tankId); // откат
      alert('Ошибка сервера');
    }
  },

  // Продажа камуфляжей/модулей/бустеров — доп. метод сверх исходной разметки
  async sellItem(itemType, itemId, price, currency) {
    currency = currency || 'silver';
    if (!supabaseClient || !supabaseClient.from) return { success: false, error: 'Рынок недоступен offline' };
    if (!price || price <= 0) return { success: false, error: 'Некорректная цена' };

    if (itemType === 'camo') {
      if (!GameState.camos[itemId]) return { success: false, error: 'Камуфляж не найден' };
      delete GameState.camos[itemId];
      for (const t in GameState.equippedCamo) if (GameState.equippedCamo[t] === itemId) delete GameState.equippedCamo[t];
    } else if (itemType === 'booster') {
      if (!GameState.boosterStock[itemId]) return { success: false, error: 'Нет бустера в запасе' };
      GameState.boosterStock[itemId]--;
    } else if (itemType === 'module') {
      if (!GameState.inventory[itemId]) return { success: false, error: 'Модуль не найден' };
      GameState.inventory[itemId]--;
    } else {
      return { success: false, error: 'Неизвестный тип' };
    }

    try {
      await supabaseClient.from('marketplace_listings').insert([{
        seller: currentUser, item_type: itemType, item_id: itemId,
        price, currency, status: 'active', created_at: new Date().toISOString()
      }]);
      saveProgress();
      this.loadOffers();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Ошибка сервера' };
    }
  },

  // Загружает и рисует активные лоты в #market-offers-list
  async loadOffers(itemTypeFilter) {
    const box = document.getElementById('market-offers-list');
    if (!box) return;
    box.innerHTML = 'Загрузка...';

    if (!supabaseClient || !supabaseClient.from) { box.innerHTML = '<div style="color:#888">Рынок недоступен offline</div>'; return; }

    try {
      let q = supabaseClient.from('marketplace_listings').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(100);
      if (itemTypeFilter) q = q.eq('item_type', itemTypeFilter);
      const { data } = await q;
      const listings = data || [];

      if (listings.length === 0) { box.innerHTML = '<div style="color:#888">Лотов пока нет</div>'; return; }
      box.innerHTML = '';
      listings.forEach(l => {
        const name = l.item_type === 'tank' && DB[l.item_id] ? DB[l.item_id].n : (CONFIG.CAMOS[l.item_id] ? CONFIG.CAMOS[l.item_id].name : l.item_id);
        const row = document.createElement('div');
        row.style.cssText = 'background:#1a1a1a;border:1px solid #555;border-radius:6px;padding:8px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center';
        row.innerHTML =
          '<div><div style="color:#fff;font-size:12px;font-weight:bold">' + name + '</div>' +
          '<div style="color:#888;font-size:10px">от ' + l.seller + ' · ' + l.item_type + '</div></div>' +
          '<div style="text-align:right"><div style="color:' + (l.currency === 'gold' ? '#f1c40f' : '#bdc3c7') + ';font-weight:bold">' + l.price + (l.currency === 'gold' ? ' G' : ' ₽') + '</div></div>';
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm';
        btn.innerText = l.seller === currentUser ? 'Снять' : 'Купить';
        btn.onclick = () => { l.seller === currentUser ? this.cancelOffer(l.id) : this.buyOffer(l.id); };
        row.appendChild(btn);

        const histBtn = document.createElement('button');
        histBtn.className = 'btn btn-sm';
        histBtn.style.background = '#8e44ad';
        histBtn.innerText = '📈';
        histBtn.title = 'История цен';
        histBtn.onclick = () => { if (typeof showPriceHistory === 'function') showPriceHistory(l.item_id, l.item_type, name); };
        row.appendChild(histBtn);

        box.appendChild(row);
      });
    } catch (error) {
      console.error('⚠️ Ошибка загрузки рынка:', error);
      box.innerHTML = '<div style="color:#e74c3c">Ошибка загрузки</div>';
    }
  },

  async buyOffer(listingId) {
    if (!supabaseClient || !supabaseClient.from) return;
    try {
      const { data: listing } = await supabaseClient.from('marketplace_listings').select('*').eq('id', listingId).eq('status', 'active').single();
      if (!listing) { alert('Лот уже продан или снят'); return; }
      if (listing.seller === currentUser) { alert('Нельзя купить свой лот'); return; }

      const price = listing.price;
      if (listing.currency === 'gold') {
        if (GameState.GOLD < price) { alert('Недостаточно золота'); return; }
        GameState.GOLD -= price;
      } else {
        if (GameState.SILVER < price) { alert('Недостаточно серебра'); return; }
        GameState.SILVER -= price;
      }

      await supabaseClient.from('marketplace_listings').update({ status: 'sold', buyer: currentUser }).eq('id', listingId).eq('status', 'active');

      // ✅ Логируем продажу для истории цен (график цен на вкладке рынка)
      supabaseClient.from('market_history').insert([{
        item_type: listing.item_type,
        item_id: listing.item_id,
        price: listing.price,
        currency: listing.currency,
        seller: listing.seller,
        buyer: currentUser,
        sold_at: new Date().toISOString()
      }]).then(() => {}, (err) => console.error('⚠️ Ошибка записи истории цен:', err));

      if (listing.item_type === 'tank') { if (GameState.owned.indexOf(listing.item_id) === -1) GameState.owned.push(listing.item_id); }
      else if (listing.item_type === 'camo') GameState.camos[listing.item_id] = true;
      else if (listing.item_type === 'booster') GameState.boosterStock[listing.item_id] = (GameState.boosterStock[listing.item_id] || 0) + 1;
      else if (listing.item_type === 'module') GameState.inventory[listing.item_id] = (GameState.inventory[listing.item_id] || 0) + 1;

      const fee = Math.floor(price * CONFIG.MARKETPLACE.feePercent);
      const payout = price - fee;
      const { data: seller } = await supabaseClient.from('users').select('silver, gold').eq('username', listing.seller).single();
      if (seller) {
        const field = listing.currency === 'gold' ? 'gold' : 'silver';
        const upd = {}; upd[field] = (seller[field] || 0) + payout;
        await supabaseClient.from('users').update(upd).eq('username', listing.seller);
      }

      updateResources();
      saveProgress();
      this.loadOffers();
    } catch (error) {
      console.error('⚠️ Ошибка покупки:', error);
      alert('Ошибка сервера');
    }
  },

  async cancelOffer(listingId) {
    if (!supabaseClient || !supabaseClient.from) return;
    try {
      const { data: listing } = await supabaseClient.from('marketplace_listings').select('*').eq('id', listingId).eq('seller', currentUser).eq('status', 'active').single();
      if (!listing) { alert('Лот не найден'); return; }
      await supabaseClient.from('marketplace_listings').update({ status: 'cancelled' }).eq('id', listingId);

      if (listing.item_type === 'tank') GameState.owned.push(listing.item_id);
      else if (listing.item_type === 'camo') GameState.camos[listing.item_id] = true;
      else if (listing.item_type === 'booster') GameState.boosterStock[listing.item_id] = (GameState.boosterStock[listing.item_id] || 0) + 1;
      else if (listing.item_type === 'module') GameState.inventory[listing.item_id] = (GameState.inventory[listing.item_id] || 0) + 1;

      saveProgress();
      this.populateSellSelect();
      this.loadOffers();
    } catch (error) {
      alert('Ошибка сервера');
    }
  },

  // ================= РЕФЕРАЛЬНАЯ ПРОГРАММА =================

  getReferralCode() {
    if (!GameState.referralCode) GameState.referralCode = currentUser;
    return GameState.referralCode;
  },

  getReferralLink() {
    return location.origin + location.pathname + '?ref=' + encodeURIComponent(this.getReferralCode());
  },

  copyReferralLink() {
    const link = this.getReferralLink();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        const el = document.getElementById('referral-copy-msg');
        if (el) { el.innerText = '✅ Ссылка скопирована!'; setTimeout(() => el.innerText = '', 2000); }
      });
    }
    return link;
  },

  // Вызывать из auth.js внутри register() ДО первого сохранения прогресса
  applyReferralFromURL(newUsername) {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (!ref || ref === newUsername) return;

    GameState.referredBy = ref;
    GameState.SILVER += CONFIG.REFERRAL.bonusForNewbie.silver;
    this.recordReferral(ref, newUsername);
  },

  async recordReferral(referrerUsername, newUsername) {
    if (!supabaseClient || !supabaseClient.from) return;
    try {
      await supabaseClient.from('referrals').insert([{ referrer: referrerUsername, referred: newUsername, created_at: new Date().toISOString() }]);

      const { data: referrer } = await supabaseClient.from('users').select('referral_count, silver, gold').eq('username', referrerUsername).single();
      if (referrer) {
        const newCount = (referrer.referral_count || 0) + 1;
        const bonus = CONFIG.REFERRAL.bonusForInviter;
        const update = { referral_count: newCount, silver: (referrer.silver || 0) + bonus.silver, gold: (referrer.gold || 0) + bonus.gold };
        const milestone = CONFIG.REFERRAL.milestoneRewards[newCount];
        if (milestone && milestone.gold) update.gold += milestone.gold;
        await supabaseClient.from('users').update(update).eq('username', referrerUsername);
      }
    } catch (error) {
      console.error('⚠️ Ошибка записи реферала:', error);
    }
  },

  async loadReferralStats() {
    if (!supabaseClient || !supabaseClient.from || !currentUser) return { count: 0 };
    try {
      const { data } = await supabaseClient.from('users').select('referral_count').eq('username', currentUser).single();
      GameState.referralCount = (data && data.referral_count) || 0;
      return { count: GameState.referralCount };
    } catch (e) {
      return { count: GameState.referralCount || 0 };
    }
  },

  // Рендер во вкладку #tab-referral
  async renderReferral() {
    const host = document.getElementById('tab-referral');
    if (!host) return;
    await this.loadReferralStats();
    host.innerHTML =
      '<div style="padding:16px;text-align:center">' +
      '<p style="color:#ccc;font-size:13px">Ваша ссылка — друг получит бонус при регистрации, а вы — за каждого приглашённого.</p>' +
      '<input id="referral-link-input" readonly onclick="this.select()" value="' + this.getReferralLink() + '" style="width:80%;padding:8px;border-radius:4px;border:1px solid #555;background:#111;color:#3498db;font-size:12px">' +
      '<br><br><button class="btn" onclick="SocialSystem.copyReferralLink()">📋 Скопировать</button>' +
      '<div id="referral-copy-msg" style="color:#2ecc71;font-size:12px;margin-top:6px"></div>' +
      '<p style="margin-top:16px;color:#888">Приглашено друзей: <span style="color:#2ecc71;font-weight:bold;font-size:18px">' + (GameState.referralCount || 0) + '</span></p>' +
      '</div>';
  }
};

window.SocialSystem = SocialSystem;
