// Only the disc animates. The receipt and the next price always come from the
// active profile, including when a spin was interrupted by Escape or a reload.
const RouletteDesk = (() => {
  const el = key => document.getElementById('roulette-' + key);
  const dialog = el('modal'), disc = el('disc'), rules = Roulette907;
  const num = new Intl.NumberFormat('ru-RU').format;
  const gold = n => `${num(n)} G`;
  const allowed = () => document.getElementById('entry-screen').hidden && !GameState.gameActive && !battleLaunch && !Accounts.switching;
  let busy = false, timer = 0, animation, angle = 0;

  // Conic-gradient zero and the fixed pointer both start at twelve o'clock.
  disc.style.backgroundImage = 'conic-gradient(' + rules.bands.map(b => `${b.color} ${b.start}% ${b.end}%`).join(',') + ')';
  for (let i = 0; i < 10; i++) {
    const tick = document.createElement('span');
    tick.style.transform = `rotate(${i * 36}deg)`;
    tick.textContent = String(i * 10).padStart(2, '0'); disc.append(tick);
  }
  for (const b of rules.bands) {
    const row = document.createElement('li'), name = document.createElement('b'), detail = document.createElement('small'), chance = document.createElement('strong');
    row.dataset.sector = b.key; row.style.setProperty('--prize-ink', b.color); name.textContent = b.title; chance.textContent = b.weight + '%';
    detail.textContent = b.key === 'tank' ? 'Коллекционная машина навсегда' : b.key === 'box'
      ? `По ${num(b.weight / rules.boxes.length)}%: ${rules.boxes.map(id => NationalCrates.catalog[id].country).join(', ')}` : `${num(b.min)}–${num(b.max)} ${b.key === 'gold' ? 'G' : '₽'}`;
    row.append(name, detail, chance); el('odds').append(row);
  }
  el('terms').textContent = `Танк без места ждёт в инвентаре. Если 907 уже получен или ожидает слота, вместо дубликата — ${gold(rules.duplicateGold)}.`;
  const angleFor = b => b ? (360 - (b.start + b.end) * 1.8) % 360 : 125;
  const rotate = deg => `rotate(${deg}deg)`;

  function receipt() {
    const {spins, prize, amount} = GameState.roulette907, b = rules.bandFor(prize), mark = el('mark');
    const queued = GameState.pendingVehicles.includes(rules.tank);
    el('inventory').hidden = !((b?.key === 'box' && GameState.inventory[prize] > 0) || (prize === rules.tank && queued));
    document.querySelector('.roulette-receipt').style.setProperty('--prize-ink', b?.color || '#acb7b1');
    el('serial').textContent = b ? `ПОСЛЕДНИЙ ПРОКРУТ / № ${num(spins)}` : 'ВЕДОМОСТЬ ВЫДАЧИ';
    if (!b) { mark.textContent = '—'; el('result').textContent = 'Здесь появится результат'; el('detail').textContent = 'Один прокрут — одна награда.'; return; }
    if (b.key === 'box' || b.key === 'tank') {
      const img = new Image(); img.alt = ''; img.src = b.key === 'box' ? `assets/crates/${prize}.webp` : 'models/' + DB[rules.tank].thumbnail; mark.replaceChildren(img);
    } else mark.textContent = b.key === 'gold' ? 'G' : '₽';
    let title, detail;
    if (prize === rules.tank) {
      title = DB[rules.tank].n; detail = queued ? 'Ожидает свободного слота в инвентаре.' : GameState.owned.includes(prize) ? 'Машина в вашем ангаре.' : 'Коллекционная машина получена.';
    } else if (b.key === 'box') { title = CONTAINERS[prize].name; detail = 'Выдан один закрытый ящик.'; }
    else if (prize === 'duplicate') { title = '+' + gold(amount); detail = 'Компенсация за повторный Объект 907.'; }
    else { title = `+${num(amount)} ${prize === 'gold' ? 'G' : '₽'}`; detail = b.title + ' зачислено на баланс.'; }
    el('result').textContent = title; el('detail').textContent = `${detail} Цена прокрута: ${gold(rules.price(spins - 1))}.`;
  }
  function refreshWallet() {
    if (!dialog.open) return;
    const n = GameState.roulette907.spins, cost = rules.price(n), funds = GameState.GOLD;
    el('balance').textContent = gold(funds);
    el('odds').querySelector('[data-sector="tank"] small').textContent = HangarSlots.received(rules.tank) && !GameState.rentalBattles[rules.tank]
      ? `Уже получен · замена на ${gold(rules.duplicateGold)}` : 'Коллекционная машина навсегда';
    el('spin').disabled = busy || cost === null || funds < cost;
    el('spin').textContent = busy ? 'Вращение…' : cost === null ? 'Лимит прокрутов' : `Крутить · ${gold(cost)}`;
    el('cost-rule').textContent = `Первый прокрут — ${gold(rules.base)}, затем +${gold(rules.step)} за каждый. Только игровое золото. Цена сохраняется при выходе.`;
    el('short').textContent = !busy && cost !== null && funds < cost ? `Не хватает ${gold(cost - funds)}.` : '';
  }
  function cancelMotion() { clearTimeout(timer); animation?.cancel(); animation = null; busy = false; }
  function open() {
    if (dialog.open || !allowed()) return;
    cancelMotion(); angle = angleFor(rules.bandFor(GameState.roulette907.prize)); disc.style.transform = rotate(angle);
    el('tank').src = 'models/' + DB[rules.tank].thumbnail;
    dialog.showModal(); GarageViewer.suspend(); receipt(); refreshWallet();
  }
  function spin(e) {
    if (!dialog.open || !allowed() || busy || e.detail > 1) return;
    const result = rules.spin();
    if (!result) { refreshWallet(); return; }
    busy = true;
    updateResources(); updateInvCount(); if (result.prize === rules.tank) renderCarousel();
    const from = angle, b = rules.bandFor(result.prize); angle = angleFor(b);
    disc.style.transform = rotate(angle);
    const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches && typeof disc.animate === 'function';
    if (motion) {
      el('inventory').hidden = true; el('mark').textContent = '↻'; el('serial').textContent = 'ПРОКРУТ № ' + num(result.spins);
      el('result').textContent = 'Вращение…'; el('detail').textContent = 'Можно закрыть окно: награда уже учтена.';
      animation = disc.animate([{transform:rotate(from)}, {transform:rotate(from + 3 * 360 + (angle - from + 360) % 360)}],
        {duration:1550, easing:'cubic-bezier(.15,.68,.1,1)'});
    } else receipt();
    // Also absorb the second tap of a double-click with reduced motion enabled.
    timer = setTimeout(() => {
      cancelMotion(); if (!dialog.open) return;
      receipt(); refreshWallet();
      // On a short phone the payment bar can be pinned over the receipt. Reveal
      // that receipt inside the dialog, without scrolling the hangar behind it.
      if (el('detail').getBoundingClientRect().bottom > el('spin').closest('footer').getBoundingClientRect().top) dialog.scrollTop = dialog.scrollHeight;
    }, motion ? 1560 : 250);
  }
  el('open').onclick = open; el('spin').onclick = spin;
  el('back').onclick = () => dialog.close();
  el('inventory').onclick = () => { if (dialog.open && !busy) { dialog.close(); openInventoryTab(); } };
  dialog.addEventListener('close', () => { if (!dialog.open) { cancelMotion(); GarageViewer.syncSelection(); } });
  return {refreshWallet};
})();
