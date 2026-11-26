// Opening a case only adds to the collection. The four branch controls are the
// only way to change the loadout; native selects work with touch and a keyboard.
const TreeDesk = (() => {
  const el = id => document.getElementById(id), dialog = el('tree-modal');
  const fmt = new Intl.NumberFormat('ru-RU'), { items, keys, boxId, slotCount } = TreeEvent;
  const hooks = Array.from({length:slotCount}, (_, i) => {
    const hook = document.createElement('label'), number = i + 1;
    hook.className = 'tree-hook'; hook.dataset.slot = number;
    hook.innerHTML = `<span class="tree-hook-number" aria-hidden="true">${number}</span><span class="tree-plus" aria-hidden="true">+</span><img alt="" hidden>`;
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Слот ' + number); select.setAttribute('aria-describedby','tree-help');
    select.add(new Option('Пусто', ''));
    for (const id of keys) select.add(new Option(items[id].name, id));
    select.addEventListener('change', () => {
      const id = select.value || null, old = GameState.treeSlots2026[i];
      if (dialog.open && !CrateView.active && !GameState.gameActive && !battleLaunch && !Accounts.switching && TreeEvent.setSlot(GameState, i, id)) {
        saveProgress();
        el('tree-change').textContent = `Слот ${number}: ${id ? items[id].name : 'свободен'}.` + (old ? ` В запасе снова доступно украшение «${items[old].name}».` : '');
      }
      refresh();
    });
    hook.append(select); el('tree-branches').append(hook);
    return { hook, select, img:hook.querySelector('img') };
  });

  function refresh() {
    if (!dialog.open) return;
    const owned = GameState.tree2026, slots = GameState.treeSlots2026;
    const pct = TreeEvent.bonuses(slots), stock = GameState.inventory[boxId] || 0;
    el('tree-stock').textContent = fmt.format(stock); el('tree-unpack').disabled = !stock; el('tree-unpack-all').hidden = stock < 2;
    for (const k of ['silver','xp','gold']) el('tree-'+k).textContent = `+${fmt.format(pct[k])}%`;
    el('tree-chance').textContent = TreeEvent.dropChance(slots) + '%';
    el('tree-total').textContent = `Занято: ${slots.filter(Boolean).length} / ${slotCount}`;
    hooks.forEach(({hook,select,img}, i) => {
      const id = slots[i]; hook.classList.toggle('filled', !!id); img.hidden = !id;
      hook.title = `Слот ${i+1}: ${id ? items[id].name : 'повесить игрушку'}`;
      if (id) img.src = `assets/ornaments/${id}.webp`; else img.removeAttribute('src');
      select.options[0].textContent = id ? 'Снять игрушку' : 'Пусто';
      for (const opt of Array.from(select.options).slice(1)) {
        const k = opt.value, free = TreeEvent.freeCopies(GameState, k);
        opt.disabled = k !== id && !free;
        opt.textContent = items[k].name + (k === id ? ' · на этой ветке' : ` · в запасе: ${fmt.format(free)}`);
      }
      select.value = id || '';
    });
    const list = el('tree-manifest'); list.replaceChildren();
    for (const id of keys) {
      const toy = items[id], count = owned[id], free = TreeEvent.freeCopies(GameState, id);
      const row = document.createElement('article'); row.className='tree-toy'; row.dataset.toy=id;
      // Names, descriptions and asset paths come from the fixed manifest, never from a save.
      row.innerHTML = `<img src="assets/ornaments/${id}.webp" alt=""><div><small>${toy.rarity} · ${toy.odds}%</small><h4>${toy.name}</h4><p>${toy.effect}</p><p class="tree-quantity">На ёлке: ${count-free} · В запасе: ${fmt.format(free)}</p></div>`;
      list.append(row);
    }
  }
  el('tree-open').addEventListener('click', () => {
    if (dialog.open || CrateView.active || GameState.gameActive || battleLaunch || Accounts.switching) return;
    dialog.showModal(); dialog.scrollTop=0; el('tree-change').textContent=''; GarageViewer.suspend(); refresh();
  });
  el('tree-case-inspect').addEventListener('click', () => CrateView.show(boxId));
  el('tree-unpack').addEventListener('click', () => openFromInventory(boxId));
  el('tree-unpack-all').addEventListener('click', () => openAllFromInventory(boxId));
  dialog.addEventListener('close', () => GarageViewer.syncSelection());
  return {refresh};
})();
