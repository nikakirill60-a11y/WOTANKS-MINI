// Resale is based on the vehicle's catalogue category, never its acquisition cost or the current shop.
const TankSales = (() => {
  const el = id => document.getElementById(id), dialog = el('sale-modal');
  let offered = null;

  function quote(tank) {
    const gold = tank.source === 'collection';
    // Free research roots can be reclaimed indefinitely. They can release their berth, not mint silver.
    const amount = gold ? tank.tier * 100 : tank.xp === 0 ? 0 : tank.tier * 5000;
    return {field: gold ? 'GOLD' : 'SILVER', amount, label: amount.toLocaleString('ru-RU') + (gold ? ' G' : ' ₽')};
  }
  const canSell = id => Object.hasOwn(DB,id) && GameState.owned.includes(id) && !GameState.gameActive && !battleLaunch && !Accounts.switching;
  function open(id) {
    if (dialog.open || !canSell(id)) return;
    offered = id;
    const t = DB[id], price = quote(t);
    el('sale-class').textContent = CONFIG.TIER_ROMAN[t.tier] + ' · ' + ({premium:'Премиум',collection:'Коллекционная',advent:'Награда Адвента'}[t.source] || 'Исследуемая');
    el('sale-name').textContent = t.n;
    setVehicleCardArt(el('sale-photo'), t);
    el('sale-currency').textContent = price.field === 'GOLD' ? 'К получению · золото' : 'К получению · серебро';
    el('sale-price').textContent = price.label;
    const notes = ['Установленные модули и улучшения будут сняты без компенсации.'];
    if (t.xp === 0) notes.push('Стартовую машину можно снова получить бесплатно, поэтому цена продажи — 0 ₽.');
    if (t.source === 'advent') notes.push('Этот подарок Адвента повторно не выдаётся.');
    if (GameState.pendingVehicles.length) notes.push('Освободившееся место займёт ' + DB[GameState.pendingVehicles[0]].n + '.');
    else if (GameState.owned.length === 1) notes.push('Это последняя машина. После продажи можно бесплатно взять танк I уровня в дереве развития.');
    el('sale-terms').textContent = notes.join(' ');
    dialog.showModal(); el('sale-cancel').focus();
  }
  function close() { offered = null; if (dialog.open) dialog.close(); }
  function confirmSale() {
    const id = offered;
    if (!dialog.open) return;
    close();
    if (!canSell(id)) return;
    const g = GameState, price = quote(DB[id]);
    g.owned.splice(g.owned.indexOf(id),1);
    g[price.field] += price.amount;
    for (const key of ['modules','upgrades','upgradesBought']) delete g[key][id];
    const arrivals = HangarSlots.deliver(); // selects a remaining/delivered tank, or null in an empty garage
    saveProgress(); updateResources(); renderCarousel(); renderTree();
    const status = el('sale-status'); status.hidden = false;
    status.textContent = `${DB[id].n}: продажа за ${price.label}.` + (arrivals.length ? ` Доставлено: ${arrivals.map(i=>DB[i].n).join(', ')}.` : '');
    (document.querySelector('.tank-slot.selected .slot-select') || el('empty-research')).focus({preventScroll:true});
  }
  el('sale-confirm').onclick = confirmSale;
  el('sale-cancel').onclick = close;
  dialog.addEventListener('close', () => { if (!dialog.open) offered = null; });
  return {quote, open, close};
})();
