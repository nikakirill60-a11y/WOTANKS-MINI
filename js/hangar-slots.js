// One capacity ledger per profile. A rental uses the same berth/delivery queue as a
// permanent vehicle; a time-limited grant attaches a remaining-battles counter.
const HangarSlots = (() => {
  const free = (g = GameState) => g.garageSlots - g.owned.length;
  const received = (id, g = GameState) => g.owned.includes(id) || g.pendingVehicles.includes(id);
  const plurals = new Intl.PluralRules('ru');
  function rentalTerm(id) {
    const n = GameState.rentalBattles[id];
    return n ? `${n} ${{one:'бой', few:'боя', many:'боёв'}[plurals.select(n)]}` : '';
  }
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
  function award(id, rentalBattles = 0) {
    if (received(id)) {
      if (!rentalBattles || !GameState.rentalBattles[id]) return false; // never downgrade a permanent vehicle
      GameState.rentalBattles[id] += rentalBattles; // keep the same berth or queue position
    } else {
      if (!park(id)) GameState.pendingVehicles.push(id);
      if (rentalBattles) GameState.rentalBattles[id] = rentalBattles;
    }
    return true;
  }
  // A permanent prize converts an active or queued rental in place, keeping its berth and equipment.
  function awardPermanent(id) {
    award(id);
    delete GameState.rentalBattles[id];
  }
  function deliver(g = GameState) {
    const delivered = g.pendingVehicles.splice(0, Math.max(0, free(g)));
    g.owned.push(...delivered);
    selectAvailable(g);
    return delivered;
  }
  function removeVehicle(id, g) {
    for (const list of [g.owned, g.pendingVehicles]) {
      const i = list.indexOf(id);
      if (i !== -1) list.splice(i, 1);
    }
    for (const key of ['rentalBattles','modules','upgrades','upgradesBought']) delete g[key][id];
  }
  function release(id) {
    removeVehicle(id, GameState);
    return deliver(); // FIFO, then select a remaining vehicle (or null in an empty garage)
  }
  // Book the sortie only once its live tank (including bonuses) is ready. On the
  // final sortie the garage berth can be released without touching that live tank.
  function useRentalBattle(id) {
    if (!GameState.rentalBattles[id] || !GameState.owned.includes(id)) return false;
    if (--GameState.rentalBattles[id] === 0) release(id);
    return true;
  }
  function restore(g, beforeRentalCounters) {
    // Grandfather an existing fleet, not extra free space. Selling never erases an earned slot.
    g.garageSlots = Math.max(BASE_GARAGE_SLOTS, g.owned.length, Number.isSafeInteger(g.garageSlots) ? g.garageSlots : 0);
    g.pendingVehicles = [...new Set(g.pendingVehicles.map(savedTankId))].filter(id =>
      id && ['collection','advent'].includes(DB[id].source) && !g.owned.includes(id));
    const saved = g.rentalBattles;
    g.rentalBattles = {};
    // Receipts cap the saved remainder; they are not a reason to refill it on load.
    const limits = new Map();
    for (const [code, {vehicle:id, rentalBattles}] of Object.entries(CONFIG.PROMOCODES)) {
      if (rentalBattles && g.usedPromos.includes(code)) limits.set(id, (limits.get(id) || 0) + rentalBattles);
    }
    for (const [id, limit] of limits) {
      if (!received(id, g)) continue;
      // Only the original ARTA grant existed before counters were saved.
      const arta = CONFIG.PROMOCODES.ARTA;
      const legacyArta = beforeRentalCounters && id === arta.vehicle && g.usedPromos.includes('ARTA') && limit === arta.rentalBattles;
      const n = legacyArta ? limit : saved[id];
      if (Number.isSafeInteger(n) && n > 0) g.rentalBattles[id] = Math.min(n, limit);
      else removeVehicle(id, g); // an exhausted/broken rental must not turn into permanent ownership
    }
    // T67 can also be owned outright. Only an explicit rental counter means a loan.
    if (received('T67', g) && Object.hasOwn(saved, 'T67')) {
      if (Number.isSafeInteger(saved.T67) && saved.T67 > 0) g.rentalBattles.T67 = Math.min(5, saved.T67);
      else removeVehicle('T67', g);
    }
    deliver(g);
  }
  const fullMessage = () => `Ангар заполнен (${GameState.owned.length}/${GameState.garageSlots}). Освободите место или получите слот из контейнера.`;
  return {free, received, park, award, awardPermanent, deliver, release, rentalTerm, useRentalBattle, restore, fullMessage};
})();
