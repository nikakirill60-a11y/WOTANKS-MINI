// Global daily boundaries are UTC, both online and offline. Offers are a function of
// the date, not of visits, account balance, or how often a player reloads the shop.
const WinterSeason = (() => {
  const DAY = 86400000, premium = SPECIAL_TANKS.filter(t => t.source === 'premium');
  const triples = [];
  for (let i=0; i<premium.length; i++) for (let j=i+1; j<premium.length; j++)
    for (let k=j+1; k<premium.length; k++) triples.push([premium[i],premium[j],premium[k]]);
  const now = () => Accounts.active ? Accounts.now() : Date.now();
  const dateKey = ms => new Date(ms).toISOString().slice(0,10);
  function offers(ms) {
    const day = Math.floor(ms / DAY);
    let seed = Math.imul(day ^ 0x6374a1, 0x21f0aaad);
    seed = Math.imul(seed ^ (seed >>> 15), 0x735a2d97);
    // Disjoint even/odd sets guarantee a midnight refresh never repeats the entire trio.
    return triples[2 * (((seed ^ (seed >>> 16)) >>> 0) % 5) + (day & 1)];
  }
  function reward(visit) {
    const resources = visit % 7 === 0 ? { GOLD:700, SILVER:50000 } : { GOLD:50, SILVER:10000, XP:1000 };
    return {resources, vehicle:visit === 15 ? 'BT42' : visit === 31 ? 'TL7OLEN' : null};
  }
  function visit(ms) {
    const day = dateKey(ms), dates = GameState.advent2026.dates;
    if (!day.startsWith('2026-12-') || dates.some(d => d >= day)) return null;
    dates.push(day); dates.sort();
    const r = reward(dates.length);
    for (const [field, amount] of Object.entries(r.resources)) GameState[field] += amount;
    if (r.vehicle) HangarSlots.award(r.vehicle);
    return r;
  }
  let midnight, previousDay;
  function refresh(force = false) {
    clearTimeout(midnight);
    // Don't credit the guest behind a pending login, or switch profiles during a match.
    if (document.hidden || Accounts.switching) return;
    const ms = now(), day = dateKey(ms);
    if (!GameState.gameActive) {
      const r = visit(ms);
      if (r) {
        updateResources(); if (r.vehicle) renderCarousel(); saveProgress();
        const note = document.getElementById('season-note');
        note.textContent = 'Адвент · подарок за визит №' + GameState.advent2026.dates.length + ': ' + rewardText(r);
        note.hidden = false;
      }
      if (force || day !== previousDay || r) {
        if (document.getElementById('calendar-modal').open) renderCalendar();
        if (document.getElementById('premium-modal').open) renderPremiumShop();
      }
    }
    previousDay = day;
    midnight = setTimeout(() => refresh(true), DAY - (ms % DAY) + 30);
  }
  function init() {
    document.addEventListener('visibilitychange', () => refresh(true));
    window.addEventListener('focus', () => refresh(true));
    window.addEventListener('pageshow', () => refresh(true));
    refresh(true);
  }
  return { now, dateKey, offers, reward, visit, refresh, init };
})();

function rewardText(reward) {
  const units = {GOLD:'G',SILVER:'₽',XP:'XP'};
  return [reward.vehicle && (DB[reward.vehicle].n + (GameState.pendingVehicles.includes(reward.vehicle) ? ' (ожидает слота)' : '')), ...Object.entries(reward.resources).map(([k,v]) =>
    v.toLocaleString('ru-RU') + ' ' + units[k])].filter(Boolean).join(' · ');
}
