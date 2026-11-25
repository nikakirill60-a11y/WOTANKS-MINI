// The depot displays only the equipped, owned vehicle. Research shows stats and an icon, not a second 3D viewer.
const GarageViewer = (() => {
  const el = (id) => document.getElementById(id);
  const classNames = { lt: 'Лёгкий танк', mt: 'Средний танк', ht: 'Тяжёлый танк', td: 'ПТ-САУ', spg: 'Артиллерийская САУ' };
  let selectedId,
    request = null,
    showingId = null;
  let inspecting = true;

  function description(tank) {
    const term = HangarSlots.rentalTerm(tank.id);
    return [CONFIG.NATIONS[tank.nat], CONFIG.TIER_ROMAN[tank.tier] + ' ур.', classNames[tank.cls], term && 'Аренда: ' + term]
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
    setVehicleCardArt(img, DB[selectedId]);
    img.alt = 'Изображение танка: ' + DB[selectedId].n;
    panel.querySelector('span').textContent = 'Статичный вид · ' + reason;
    panel.hidden = false;
  }

  async function showStand() {
    if (!inspecting || GameState.gameActive || el('container-modal').open) {
      suspend();
      return;
    }
    if (!GameState.owned.includes(selectedId)) {
      suspend();
      return;
    }
    const tank = DB[selectedId];
    el('bay-kind').textContent = ({collection:'КОЛЛЕКЦИОННАЯ МАШИНА',premium:'ПРЕМИУМ-МАШИНА',advent:'НАГРАДА АДВЕНТА'})[tank.source] || 'ИССЛЕДУЕМАЯ МАШИНА';
    el('bay-name').textContent = tank.n;
    el('bay-meta').textContent =
      description(tank) + (tank.mag ? ` · ${magazineName(tank)}: ${tank.mag} × ${shotDamage(tank)}` : '');
    if (showingId === selectedId) return;
    request?.abort();
    const ticket = new AbortController();
    request = ticket;
    showingId = selectedId;
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

  function syncSelection(fromCarousel = false) {
    const id = GameState.selected;
    if (selectedId !== id) {
      selectedId = id;
      const empty = !id;
      el('empty-depot').hidden = !empty;
      for (const key of ['vehicle-spec-heading','vehicle-spec','battle-controls']) el(key).hidden = empty;
      for (const btn of document.querySelectorAll('[data-needs-tank],#battle-controls button')) btn.disabled = empty;
      if (empty) {
        el('dispatch-name').textContent = el('bay-name').textContent = 'Ангар пуст';
        el('dispatch-drum').hidden = true;
        el('bay-kind').textContent = 'МОЯ ТЕХНИКА'; el('bay-meta').textContent = 'Ни одной машины для выезда';
      } else describeSelection(DB[id]);
    }
    el('dispatch-meta').textContent = id ? description(DB[id]) : ''; // balance can change without changing selection
    el('fleet-count').textContent = `${GameState.owned.length} / ${GameState.garageSlots}`;
    const waiting = el('fleet-pending');
    waiting.hidden = !GameState.pendingVehicles.length;
    waiting.textContent = `Ожидают слота: ${GameState.pendingVehicles.length}`;
    if (fromCarousel && !inspecting) setPane(true);
    else showStand();
  }

  function describeSelection(tank) {
    el('dispatch-name').textContent = tank.n;
    el('dispatch-hp').textContent = tank.hp;
    el('dispatch-dmg-label').textContent = damageLabel(tank);
    el('dispatch-dmg').textContent = damageSummary(tank);
    el('dispatch-drum').hidden = !tank.mag && tank.cls !== 'spg';
    if (tank.cls === 'spg') el('dispatch-drum').textContent = 'Арт-прицел · Shift на ПК или кнопка «Арт-прицел» на телефоне. Остановитесь для сведения.';
    if (tank.mag) el('dispatch-drum').textContent = `${magazineName(tank)} · удерживайте огонь для очереди`;
    el('dispatch-reload-label').textContent = tank.mag ? 'Полная перезарядка' : 'Перезарядка';
    el('dispatch-reload').textContent = (tank.reload / 1000).toLocaleString('ru-RU') + ' с';
    el('dispatch-pen').textContent = tank.pen + ' мм';
    el('dispatch-armor').textContent = armorLabel(tank) + ' мм';
    el('dispatch-speed').textContent = speedLabel(tank) + ' км/ч';
    el('dispatch-view').textContent = Math.round(tank.vr / BATTLE_UNITS_PER_METRE) + ' м';
  }

  function init() {
    el('empty-research').onclick = () => { setPane(false); el('nodes').querySelector('.available')?.focus(); };
    el('bay-inspect-tab').addEventListener('click', () => setPane(true));
    el('bay-research-tab').addEventListener('click', () => setPane(false));
    for (const button of el('bay-angles').querySelectorAll('button'))
      button.addEventListener('click', () => DepotView.view(button.dataset.view));
  }

  return { init, syncSelection, suspend };
})();
