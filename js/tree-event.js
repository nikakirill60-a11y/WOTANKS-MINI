// Rules of the winter build. Owned copies and the four player-chosen branches are separate.
const TreeEvent = (() => {
  const items = {
    gingerbread: { name:'Пряник', rarity:'Обычное', odds:70, effect:'+5% к серебру', silver:5 },
    deer: { name:'Олень', rarity:'Необычное', odds:24, effect:'+5% к опыту', xp:5 },
    fir: { name:'Ёлка', rarity:'Эпическое', odds:5, effect:'+5% к золоту', gold:5 },
    bauble: { name:'Шар', rarity:'Легендарное', odds:1, effect:'+10% ко всем трём наградам', silver:10, xp:10, gold:10 }
  };
  const boxId = 'ornament', keys = Object.keys(items), slotCount = 4;
  const counts = raw => Object.fromEntries(keys.map(k => [k, Number.isSafeInteger(raw?.[k]) && raw[k] >= 0 ? raw[k] : 0]));
  const emptySlots = () => Array(slotCount).fill(null);
  const known = id => typeof id === 'string' && Object.hasOwn(items, id);

  // Never equip something during migration. Preserve valid positions, ignoring a fifth
  // slot, unknown IDs and duplicate placements beyond the number of copies owned.
  function restoreSlots(raw, owned) {
    const left = counts(owned);
    return emptySlots().map((_, i) => {
      const id = Array.isArray(raw) ? raw[i] : null;
      if (!known(id) || !left[id]) return null;
      left[id]--; return id;
    });
  }
  const freeCopies = (g, id) => g.tree2026[id] - g.treeSlots2026.filter(k => k === id).length;
  function setSlot(g, index, id) {
    if (!Number.isInteger(index) || index < 0 || index >= slotCount || g.treeSlots2026[index] === id) return false;
    if (id !== null && (!known(id) || freeCopies(g, id) <= 0)) return false;
    // Replacing/removing changes only the assignment; the old toy is immediately available again.
    g.treeSlots2026[index] = id;
    return true;
  }
  const dropChance = slots => slots.includes('bauble') ? 30 : 20;
  function bonuses(slots) {
    const p = { silver:0, xp:0, gold:0 };
    for (const id of slots) if (id) for (const k of Object.keys(p)) p[k] += items[id][k] || 0;
    return p;
  }
  // Only the final battle settlement rolls a case. Neither sealed cases nor loose toys grant bonuses.
  function settle(g, base, random = Math.random) {
    const percent = bonuses(g.treeSlots2026), extra = {};
    for (const k of Object.keys(percent)) extra[k] = Math.floor(base[k] * percent[k] / 100);
    const chance = dropChance(g.treeSlots2026), dropped = random() < chance / 100;
    if (dropped) g.inventory[boxId] = (g.inventory[boxId] || 0) + 1;
    return { extra, chance, dropped };
  }
  function collect(owned, random = Math.random) {
    const roll = random(); let cumulative = 0;
    for (const k of keys) {
      cumulative += items[k].odds;
      if (roll < cumulative / 100) {
        owned[k]++;
        return { type:'ornament', ornament:k, amount:1 };
      }
    }
    throw RangeError('Ornament roll outside [0,1)');
  }
  const oddsText = () => keys.map(k => `${items[k].name} — ${items[k].odds}%`).join(', ');
  return { items, keys, boxId, slotCount, counts, emptySlots, restoreSlots, freeCopies, setSlot, dropChance, bonuses, settle, collect, oddsText };
})();
