// The depot wheel uses earned in-game gold. The same cumulative intervals drive
// the actual draw, the dial painted by the desk and its published percentages.
const Roulette907 = (() => {
  const tank = 'NAT014', base = 150, step = 50;
  const boxes = Object.freeze(Object.keys(CONTAINERS).filter(id => CONTAINERS[id].national));
  const duplicateGold = TankSales.quote(DB[tank]).amount;
  let end = 0;
  const bands = Object.freeze([
    {key:'tank', title:DB[tank].n, weight:1, color:'#fe916f'},
    {key:'box', title:'Национальный ящик', weight:3, color:'#6fd5be'},
    {key:'gold', title:'Золото', weight:30, min:50, max:300, color:'#e9ba66'},
    {key:'silver', title:'Серебро', weight:66, min:5000, max:25000, color:'#a1b5c6'}
  ].map(b => {
    const start = end; end += b.weight; return Object.freeze({...b, start, end});
  }));

  function price(spins) {
    const cost = base + spins * step;
    return Number.isSafeInteger(spins) && spins >= 0 && Number.isSafeInteger(cost) ? cost : null;
  }
  function bandFor(prize) {
    const key = prize === tank || prize === 'duplicate' ? 'tank' : boxes.includes(prize) ? 'box' : prize;
    return bands.find(b => b.key === key);
  }
  function restore(state) {
    const spins = Number.isSafeInteger(state.spins) && state.spins >= 0 ? state.spins : 0;
    const {prize, amount} = state, band = bandFor(prize);
    const valid = price(spins - 1) !== null && Number.isSafeInteger(amount) && (prize === 'gold' || prize === 'silver'
      ? amount >= band.min && amount <= band.max
      : prize === 'duplicate' ? amount === duplicateGold : (prize === tank || boxes.includes(prize)) && amount === 1);
    return {spins, prize:valid ? prize : '', amount:valid ? amount : 0};
  }
  // A spin is one synchronous transaction. Nothing in animation, skip or close
  // can debit gold, roll again or deliver a second copy of the reward.
  function spin(random = Math.random) {
    const g = GameState, spins = g.roulette907.spins, cost = price(spins);
    if (g.gameActive || cost === null || !Number.isFinite(g.GOLD) || g.GOLD < cost) return null;
    const roll = random(), band = bands.find(b => roll < b.end / 100);
    let prize = band.key, amount = 1;
    if (prize === 'tank') {
      if (HangarSlots.received(tank) && !g.rentalBattles[tank]) { prize = 'duplicate'; amount = duplicateGold; }
      else prize = tank;
    } else if (prize === 'box') prize = boxes[Math.floor(random() * boxes.length)];
    else amount = band.min + Math.floor(random() * (band.max - band.min + 1));

    g.GOLD -= cost;
    if (prize === tank) HangarSlots.awardPermanent(tank);
    else if (band.key === 'box') g.inventory[prize] = (g.inventory[prize] || 0) + 1;
    else g[prize === 'silver' ? 'SILVER' : 'GOLD'] += amount;
    g.roulette907 = {spins:spins + 1, prize, amount};
    saveProgress();
    return g.roulette907;
  }
  return Object.freeze({tank, base, step, boxes, duplicateGold, bands, price, bandFor, restore, spin});
})();
