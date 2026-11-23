// The inspection stand is read-only. Only the carousel/research tree selects a tank for battle.
const GarageViewer = (() => {
  const el = (id) => document.getElementById(id);
  const classNames = { lt: 'Лёгкий танк', mt: 'Средний танк', ht: 'Тяжёлый танк', td: 'ПТ-САУ' };
  let selectedId = null,
    inspectedId = null,
    request = null,
    showingId = null;
  let inspecting = true;

  function description(tank) {
    return [CONFIG.NATIONS[tank.nat], CONFIG.TIER_ROMAN[tank.tier] + ' ур.', classNames[tank.cls]]
      .filter(Boolean)
      .join(' · ');
  }

  function suspend() {
    request?.abort();
    request = null;
    showingId = null;
    DepotView.close();
    for (const id of ['bay-poster', 'bay-loading', 'bay-angles']) el(id).hidden = true;
  }

  function poster(reason) {
    DepotView.close();
    el('bay-angles').hidden = el('bay-loading').hidden = true;
    const panel = el('bay-poster'),
      img = panel.querySelector('img');
    img.src = 'models/' + DB[inspectedId].thumbnail;
    img.alt = 'Снимок 3D-модели: ' + DB[inspectedId].n;
    panel.querySelector('span').textContent = 'Снимок модели · ' + reason;
    panel.hidden = false;
  }

  async function showStand() {
    if (!inspecting || GameState.gameActive) {
      suspend();
      return;
    }
    const tank = DB[inspectedId];
    el('bay-kind').textContent = inspectedId === selectedId ? 'БОЕВАЯ МАШИНА' : 'ВЫСТАВОЧНЫЙ ОБРАЗЕЦ';
    el('bay-name').textContent = tank.n;
    el('bay-meta').textContent =
      description(tank) + (tank.mag ? ` · ${magazineName(tank)}: ${tank.mag} × ${shotDamage(tank)}` : '');
    el('bay-picker').value = inspectedId;
    const open = el('bay-open');
    open.hidden = false;
    open.href = 'models/' + tank.file;
    if (showingId === inspectedId) return;
    request?.abort();
    const ticket = new AbortController();
    request = ticket;
    showingId = inspectedId;
    el('bay-poster').hidden = el('bay-angles').hidden = true;
    el('bay-loading').hidden = false;
    let asset;
    try {
      asset = await BattleModels.load(tank.id, ticket.signal);
      if (ticket.signal.aborted) return;
      DepotView.mount(el('bay-viewport'), tank.id, asset, () => poster('потерян контекст WebGL'));
      el('bay-loading').hidden = true;
      el('bay-angles').hidden = false;
    } catch {
      if (!ticket.signal.aborted)
        poster(asset ? 'для вращения нужен WebGL 2' : 'не удалось загрузить геометрию');
    } finally {
      if (request === ticket) request = null;
    }
  }

  function setPane(inspection) {
    inspecting = inspection;
    el('bay-inspection').hidden = !inspection;
    el('bay-research').hidden = inspection;
    el('bay-inspect-tab').setAttribute('aria-pressed', String(inspection));
    el('bay-research-tab').setAttribute('aria-pressed', String(!inspection));
    if (!inspection) {
      renderTree();
      revealTreeNode();
    }
    showStand();
  }

  function inspect(id) {
    if (!DB[id]) return;
    inspectedId = id;
    setPane(true);
  }

  function updatePicker() {
    const picker = el('bay-picker');
    picker.replaceChildren(new Option('Для боя: ' + DB[selectedId].n, selectedId));
    for (const nat of PLAYABLE_NATIONS) {
      const group = document.createElement('optgroup');
      group.label = CONFIG.NATIONS[nat] + ' · осмотр без разблокировки';
      for (const t of BRANCHES[nat].tanks) {
        if (t.id !== selectedId) group.appendChild(new Option(CONFIG.TIER_ROMAN[t.tier]+' · '+t.n, t.id));
      }
      picker.appendChild(group);
    }
  }

  function syncSelection(fromCarousel = false) {
    const id = GameState.selected;
    if (selectedId === null) inspectedId = id;
    else if (selectedId !== id || fromCarousel) inspectedId = id;
    if (selectedId !== id) {
      selectedId = id;
      const tank = DB[id];
      el('dispatch-name').textContent = tank.n;
      el('dispatch-meta').textContent = description(tank);
      el('dispatch-hp').textContent = tank.hp;
      el('dispatch-dmg-label').textContent = damageLabel(tank);
      el('dispatch-dmg').textContent = damageSummary(tank);
      el('dispatch-drum').hidden = !tank.mag;
      if (tank.mag) el('dispatch-drum').textContent = `${magazineName(tank)} · удерживайте огонь для очереди`;
      el('dispatch-reload-label').textContent = tank.mag ? 'Полная перезарядка' : 'Перезарядка';
      el('dispatch-reload').textContent = (tank.reload / 1000).toLocaleString('ru-RU') + ' с';
      el('dispatch-pen').textContent = tank.pen + ' мм';
      el('dispatch-armor').textContent = armorLabel(tank) + ' мм';
      el('dispatch-speed').textContent = speedLabel(tank) + ' км/ч';
      el('dispatch-view').textContent = Math.round(tank.vr / BATTLE_UNITS_PER_METRE) + ' м';
      updatePicker();
    }
    el('fleet-count').textContent = String(GameState.owned.length).padStart(2, '0');
    if (fromCarousel && !inspecting) setPane(true);
    else showStand();
  }

  function init() {
    el('bay-inspect-tab').addEventListener('click', () => setPane(true));
    el('bay-research-tab').addEventListener('click', () => setPane(false));
    for (const button of el('bay-angles').querySelectorAll('button'))
      button.addEventListener('click', () => DepotView.view(button.dataset.view));
    el('bay-picker').addEventListener('change', (event) => {
      inspectedId = event.target.value;
      showStand();
    });
  }

  return { init, syncSelection, suspend, inspect };
})();
