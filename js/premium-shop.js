function buyPremium(id, shownDay) {
  const now = WinterSeason.now(), t = DB[id];
  const valid = shownDay === WinterSeason.dateKey(now) && WinterSeason.offers(now).includes(t);
  const status = document.getElementById('premium-status');
  if (!valid) status.textContent = 'Наступил новый день. Витрина обновлена; золото не списано.';
  else if (GameState.owned.includes(id)) status.textContent = 'Эта машина уже в ангаре.';
  else if (HangarSlots.free() <= 0) status.textContent = HangarSlots.fullMessage();
  else if (GameState.GOLD < t.price) status.textContent = 'Недостаточно игрового золота.';
  else if (HangarSlots.park(id)) {
    GameState.GOLD -= t.price;
    saveProgress(); renderCarousel(); updateResources(); status.textContent = `${t.n} добавлен в ангар.`;
  }
  renderPremiumShop();
}
function renderPremiumShop() {
  const ms = WinterSeason.now(), day = WinterSeason.dateKey(ms);
  document.getElementById('premium-date').textContent = new Date(ms).toLocaleDateString('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'});
  document.getElementById('premium-balance').textContent = GameState.GOLD.toLocaleString('ru-RU') + ' G';
  document.getElementById('premium-cards').replaceChildren(...WinterSeason.offers(ms).map(t => {
    const card = document.createElement('article'); card.className = 'offer-card'; card.dataset.id = t.id;
    // Data is exclusively from the built-in catalogue, never from user profiles.
    card.innerHTML = `<small class="season-kicker">${CONFIG.TIER_ROMAN[t.tier]} · ${CONFIG.TANK_CLASSES[t.cls]} / ${CONFIG.NATIONS[t.nat]}</small>
      <h3>${t.n}</h3><p>${t.hp} HP · ${shotDamage(t)} урона<br>${t.speed} км/ч</p>
      <b class="offer-price">${t.price.toLocaleString('ru-RU')} G</b>`;
    card.querySelector('h3').before(vehicleThumbnail(t));
    const buy = document.createElement('button'); buy.type = 'button'; buy.className = 'winter-action';
    const full = HangarSlots.free() <= 0;
    buy.disabled = GameState.owned.includes(t.id) || full || GameState.GOLD < t.price;
    buy.textContent = GameState.owned.includes(t.id) ? 'В ангаре' : full ? 'Нет свободного слота' : buy.disabled ? 'Не хватает золота' : 'Купить за золото';
    buy.onclick = () => buyPremium(t.id,day); card.append(buy); return card;
  }));
}
function openPremiumShop() {
  document.getElementById('premium-status').textContent = HangarSlots.free() <= 0 ? HangarSlots.fullMessage() : '';
  renderPremiumShop(); document.getElementById('premium-modal').showModal();
}
