// js/marketplace.js
// ========== ВНУТРИИГРОВОЙ РЫНОК (Supabase) ==========
console.log('🏪 marketplace.js загружен');
// Таблица marketplace_listings: id, seller, item_type, item_id, price, currency, status, created_at

function canSellTank(tankId) {
  if (GameState.owned.indexOf(tankId) === -1) return { ok: false, error: 'Танк не куплен' };
  if (!DB[tankId] || !DB[tankId].collection) return { ok: false, error: 'Продавать можно только коллекционные танки' };
  if ((GameState.totalBattles || 0) < CONFIG.MARKETPLACE.minBattlesToSellTank) {
    return { ok: false, error: 'Нужно ' + CONFIG.MARKETPLACE.minBattlesToSellTank + ' боёв (сыграно: ' + (GameState.totalBattles || 0) + ')' };
  }
  if (GameState.selected === tankId) return { ok: false, error: 'Нельзя продать выбранный танк — выберите другой' };
  return { ok: true };
}

// ========== ВЫСТАВЛЕНИЕ ЛОТА ==========
async function listOnMarket(itemType, itemId, price, currency) {
  if (!supabaseClient || !supabaseClient.from) return { success: false, error: 'Рынок недоступен offline' };
  if (!price || price <= 0) return { success: false, error: 'Некорректная цена' };
  currency = currency || 'silver';

  if (itemType === 'tank') {
    var check = canSellTank(itemId);
    if (!check.ok) return { success: false, error: check.error };
    GameState.owned.splice(GameState.owned.indexOf(itemId), 1);
    delete GameState.equippedCamo[itemId];
  } else if (itemType === 'camo') {
    if (!GameState.camos[itemId]) return { success: false, error: 'Камуфляж не найден' };
    delete GameState.camos[itemId];
    for (var t in GameState.equippedCamo) { if (GameState.equippedCamo[t] === itemId) delete GameState.equippedCamo[t]; }
  } else if (itemType === 'booster') {
    if (!GameState.boosterStock[itemId] || GameState.boosterStock[itemId] <= 0) return { success: false, error: 'Нет бустера в запасе' };
    GameState.boosterStock[itemId]--;
  } else if (itemType === 'module') {
    if (!GameState.inventory[itemId] || GameState.inventory[itemId] <= 0) return { success: false, error: 'Модуль не найден в инвентаре' };
    GameState.inventory[itemId]--;
  } else {
    return { success: false, error: 'Неизвестный тип предмета' };
  }

  try {
    await supabaseClient.from('marketplace_listings').insert([{
      seller: currentUser, item_type: itemType, item_id: itemId,
      price: price, currency: currency, status: 'active', created_at: new Date().toISOString()
    }]);
    saveProgress();
    return { success: true };
  } catch (error) {
    console.error('⚠️ Ошибка выставления лота:', error);
    return { success: false, error: 'Ошибка сервера' };
  }
}

// ========== ПРОСМОТР ЛОТОВ ==========
async function browseMarket(itemTypeFilter) {
  if (!supabaseClient || !supabaseClient.from) return [];
  try {
    var q = supabaseClient.from('marketplace_listings').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(100);
    if (itemTypeFilter) q = q.eq('item_type', itemTypeFilter);
    const { data } = await q;
    return data || [];
  } catch (error) {
    console.error('⚠️ Ошибка загрузки рынка:', error);
    return [];
  }
}

// ========== ПОКУПКА ЛОТА ==========
async function buyFromMarket(listingId) {
  if (!supabaseClient || !supabaseClient.from) return { success: false, error: 'Рынок недоступен offline' };
  try {
    const { data: listing } = await supabaseClient.from('marketplace_listings').select('*').eq('id', listingId).eq('status', 'active').single();
    if (!listing) return { success: false, error: 'Лот уже продан или снят' };
    if (listing.seller === currentUser) return { success: false, error: 'Нельзя купить свой лот' };

    var price = listing.price;
    if (listing.currency === 'gold') {
      if (GameState.GOLD < price) return { success: false, error: 'Недостаточно золота' };
      GameState.GOLD -= price;
    } else {
      if (GameState.SILVER < price) return { success: false, error: 'Недостаточно серебра' };
      GameState.SILVER -= price;
    }

    await supabaseClient.from('marketplace_listings').update({ status: 'sold', buyer: currentUser }).eq('id', listingId).eq('status', 'active');

    // Выдаём предмет покупателю
    if (listing.item_type === 'tank') {
      if (GameState.owned.indexOf(listing.item_id) === -1) GameState.owned.push(listing.item_id);
    } else if (listing.item_type === 'camo') {
      GameState.camos[listing.item_id] = true;
    } else if (listing.item_type === 'booster') {
      GameState.boosterStock[listing.item_id] = (GameState.boosterStock[listing.item_id] || 0) + 1;
    } else if (listing.item_type === 'module') {
      GameState.inventory[listing.item_id] = (GameState.inventory[listing.item_id] || 0) + 1;
    }

    // Зачисляем продавцу выручку за вычетом комиссии
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
    return { success: true, item: listing };
  } catch (error) {
    console.error('⚠️ Ошибка покупки:', error);
    return { success: false, error: 'Ошибка сервера' };
  }
}

// ========== СНЯТИЕ СВОЕГО ЛОТА ==========
async function cancelMarketListing(listingId) {
  if (!supabaseClient || !supabaseClient.from) return { success: false };
  try {
    const { data: listing } = await supabaseClient.from('marketplace_listings').select('*').eq('id', listingId).eq('seller', currentUser).eq('status', 'active').single();
    if (!listing) return { success: false, error: 'Лот не найден' };

    await supabaseClient.from('marketplace_listings').update({ status: 'cancelled' }).eq('id', listingId);

    if (listing.item_type === 'tank') GameState.owned.push(listing.item_id);
    else if (listing.item_type === 'camo') GameState.camos[listing.item_id] = true;
    else if (listing.item_type === 'booster') GameState.boosterStock[listing.item_id] = (GameState.boosterStock[listing.item_id] || 0) + 1;
    else if (listing.item_type === 'module') GameState.inventory[listing.item_id] = (GameState.inventory[listing.item_id] || 0) + 1;

    saveProgress();
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Ошибка сервера' };
  }
}

// ========== РЕНДЕР (ожидает <div id="market-grid"></div>) ==========
async function renderMarketGrid(filter) {
  var grid = document.getElementById('market-grid');
  if (!grid) return;
  grid.innerHTML = 'Загрузка...';
  var listings = await browseMarket(filter);
  grid.innerHTML = '';
  if (listings.length === 0) { grid.innerHTML = '<div style="color:#888">Лотов пока нет</div>'; return; }

  listings.forEach(function (l) {
    var name = l.item_type === 'tank' && DB[l.item_id] ? DB[l.item_id].n : l.item_id;
    var card = document.createElement('div');
    card.style.cssText = 'background:#1a1a1a;border:1px solid #555;border-radius:6px;padding:8px;margin:4px;display:inline-block;min-width:140px;text-align:center';
    card.innerHTML =
      '<div style="color:#fff;font-size:12px;font-weight:bold">' + name + '</div>' +
      '<div style="color:#888;font-size:10px">от ' + l.seller + '</div>' +
      '<div style="color:' + (l.currency === 'gold' ? '#f1c40f' : '#bdc3c7') + ';margin:4px 0">' + l.price + (l.currency === 'gold' ? ' G' : ' ₽') + '</div>';
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.innerText = l.seller === currentUser ? 'Снять с продажи' : 'Купить';
    btn.onclick = async function () {
      var res = l.seller === currentUser ? await cancelMarketListing(l.id) : await buyFromMarket(l.id);
      if (!res.success) alert(res.error || 'Ошибка'); else renderMarketGrid(filter);
    };
    card.appendChild(btn);
    grid.appendChild(card);
  });
}

window.canSellTank = canSellTank;
window.listOnMarket = listOnMarket;
window.browseMarket = browseMarket;
window.buyFromMarket = buyFromMarket;
window.cancelMarketListing = cancelMarketListing;
window.renderMarketGrid = renderMarketGrid;
