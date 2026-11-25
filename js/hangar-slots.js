// One capacity ledger per saved profile. Paid acquisitions need a berth now;
// earned rewards are never discarded, rerolled or made playable over capacity.
const HangarSlots = (() => {
  const free = (g = GameState) => g.garageSlots - g.owned.length;
  const received = id => GameState.owned.includes(id) || GameState.pendingVehicles.includes(id);
  function selectAvailable(g) {
    if (g.owned.includes(g.selected)) return;
    g.selected = g.owned[0] || null;
    const nat = DB[g.selected]?.nat;
    if (PLAYABLE_NATIONS.includes(nat)) g.curNat = nat;
  }
  function park(id) {
    if (received(id) || free() <= 0) return false;
    GameState.owned.push(id); selectAvailable(GameState); return true;
  }
  function award(id) {
    if (!received(id) && !park(id)) GameState.pendingVehicles.push(id);
  }
  function deliver(g = GameState) {
    const delivered = g.pendingVehicles.splice(0, Math.max(0, free(g)));
    g.owned.push(...delivered);
    selectAvailable(g);
    return delivered;
  }
  function restore(g) {
    // Grandfather an existing fleet, not extra free space. Selling never erases an earned slot.
    g.garageSlots = Math.max(BASE_GARAGE_SLOTS, g.owned.length, Number.isSafeInteger(g.garageSlots) ? g.garageSlots : 0);
    g.pendingVehicles = [...new Set(g.pendingVehicles.map(savedTankId))].filter(id =>
      id && ['collection','advent'].includes(DB[id].source) && !g.owned.includes(id));
    deliver(g);
  }
  const fullMessage = () => `Ангар заполнен (${GameState.owned.length}/${GameState.garageSlots}). Освободите место или получите слот из контейнера.`;
  return {free, received, park, award, deliver, restore, fullMessage};
})();
