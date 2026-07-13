// js/social.js
// ========== РЕФЕРАЛЬНАЯ СИСТЕМА И МАРКЕТПЛЕЙС ==========

const SocialSystem = {
  // Реферальная система
  generateReferralLink() {
    const code = GameState.referralCode || 'NOT_FOUND';
    const link = `${window.location.origin}${window.location.pathname}?ref=${code}`;
    
    // Копирование в буфер обмена
    navigator.clipboard.writeText(link).then(() => {
      alert("📋 Реферальная ссылка скопирована в буфер обмена!\nОтправьте её другу для регистрации.");
    });
  },

  async checkReferralOnLoad() {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (!refCode || !supabaseClient) return;

    // Запись реферала при регистрации
    console.log('📌 Зарегистрирован переход по реферальной ссылке с кодом:', refCode);
    localStorage.setItem('referred_by_code', refCode);
  },

  // Рынок коллекционных танков
  async loadOffers() {
    const listEl = document.getElementById('market-offers-list');
    if (!listEl) return;
    listEl.innerHTML = "Загрузка предложений...";

    if (!supabaseClient) {
      listEl.innerHTML = "❌ Рынок доступен только в онлайн режиме.";
      return;
    }

    const { data, error } = await supabaseClient
      .from('marketplace_offers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      listEl.innerHTML = "<em>Нет активных лотов на продажу. Станьте первым!</em>";
      return;
    }

    let html = '';
    data.forEach(offer => {
      const t = DB[offer.tank_id];
      if (!t) return;
      
      const priceText = offer.price_gold > 0 ? `${offer.price_gold} G` : `${offer.price_silver} ₽`;
      const isMyOffer = offer.seller_username === currentUser;

      html += `
        <div style="background:#222; border:1px solid #444; border-radius:5px; padding:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
          <div>
            <strong style="color:${getRarityColor(t.tier)}">${t.n}</strong> [${CONFIG.TIER_ROMAN[t.tier]}]
            <div style="font-size:10px; color:#888;">Продавец: ${offer.seller_username}</div>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <strong style="color:#f1c40f;">${priceText}</strong>
            ${isMyOffer ? 
              `<button class="btn btn-sm" style="background:#e74c3c;" onclick="SocialSystem.cancelOffer('${offer.id}')">Отменить</button>` : 
              `<button class="btn btn-sm" style="background:#27ae60;" onclick="SocialSystem.buyFromMarket('${offer.id}', '${offer.tank_id}', ${offer.price_gold}, ${offer.price_silver}, '${offer.seller_username}')">Купить</button>`
            }
          </div>
        </div>
      `;
    });
    listEl.innerHTML = html;
  },

  async sellTank(tankId, priceGold, priceSilver) {
    if (!supabaseClient) return;
    
    // Проверка ограничений (не менее 100 боев)
    const totalBattles = GameState.totalBattles || 0;
    if (totalBattles < 100) {
      alert("🔒 Продажа доступна только опытным танкистам, наигравшим 100+ боев!");
      return;
    }

    const t = DB[tankId];
    if (!t || !t.collection) {
      alert("❌ На рынке можно продавать только редкие коллекционные танки!");
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('marketplace_offers')
        .insert([{
          seller_username: currentUser,
          tank_id: tankId,
          price_gold: priceGold,
          price_silver: priceSilver
        }]);

      if (error) throw error;
      
      // Удаляем у себя
      GameState.owned = GameState.owned.filter(id => id !== tankId);
      if (GameState.selected === tankId) GameState.selected = GameState.owned[0];
      
      saveProgress();
      renderCarousel();
      this.loadOffers();
      alert(` Lot успешно выставлен на продажу!`);
    } catch (e) {
      alert(e.message);
    }
  },

  async buyFromMarket(offerId, tankId, gold, silver, seller) {
    if (GameState.GOLD < gold || GameState.SILVER < silver) {
      alert("❌ У вас недостаточно средств для покупки!");
      return;
    }

    try {
      // Списание средств у покупателя
      GameState.GOLD -= gold;
      GameState.SILVER -= silver;
      GameState.owned.push(tankId);
      
      // Удаляем предложение из базы
      await supabaseClient.from('marketplace_offers').delete().eq('id', offerId);
      
      // Начисление средств продавцу (логика распределения через Supabase в идеале, тут симуляция по завершении транзакции)
      // В реальном времени продавец получит средства при следующем входе/синхронизации прогресса.
      
      saveProgress();
      renderCarousel();
      this.loadOffers();
      alert(`🎉 Вы успешно приобрели коллекционный танк: ${DB[tankId].n}!`);
    } catch (e) {
      alert("Ошибка при покупке лота");
    }
  }
};