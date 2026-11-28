// Global daily boundaries are UTC, both online and offline. Offers are a function of
// the date, not of visits, account balance, or how often a player reloads the shop.
const WinterSeason = (() => {
  const DAY = 86400000, premium = SPECIAL_TANKS.filter(t => t.source === 'premium');
  const now = () => Accounts.active ? Accounts.now() : Date.now();
  const dateKey = ms => new Date(ms).toISOString().slice(0,10);
  function offers(ms) {
    const day = Math.floor(ms / DAY);
    // Three equally spaced positions on a ring. Every vehicle gets a turn within
    // ceil(pool/3) days; reloading or changing profile cannot reroll the shop.
    const n=premium.length, offset=((day%n)+n)%n;
    return [0,1,2].map(i=>premium[(offset+Math.floor(i*n/3))%n]);
  }
  function saleDates(ms) {
    const next=new Map();
    for(let d=0; next.size<premium.length && d<premium.length; d++) {
      const when=ms+d*DAY;
      for(const t of offers(when)) if(!next.has(t.id)) next.set(t.id,when);
    }
    return premium.map(tank=>({tank,when:next.get(tank.id)}));
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
  return { now, dateKey, offers, saleDates, reward, visit, refresh, init };
})();

function rewardText(reward) {
  const units = {GOLD:'G',SILVER:'₽',XP:'XP'};
  return [reward.vehicle && (DB[reward.vehicle].n + (GameState.pendingVehicles.includes(reward.vehicle) ? ' (ожидает слота)' : '')), ...Object.entries(reward.resources).map(([k,v]) =>
    v.toLocaleString('ru-RU') + ' ' + units[k])].filter(Boolean).join(' · ');
}
