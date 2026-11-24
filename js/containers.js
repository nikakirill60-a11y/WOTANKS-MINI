// Ordinary supply boxes keep their original resource tables. The collection has its own vehicle pool.
const CONTAINERS = {
  collection: { name: 'Коллекционный контейнер', icon: '❄', cost: {gold: 150}, color: '#91c7d4',
    vehicleChance: 0.05, vehicles: SPECIAL_TANKS.filter(t => t.source === 'collection').map(t => t.id),
    drops: [['silver', 10000, 30000], ['gold', 25, 100]] },
  basic: { name: 'Полевой ящик', icon: '📦', cost: {silver: 25000}, color: '#96a486',
    drops: [['silver', 5000, 15000], ['xp', 2000, 8000], ['gold', 50, 200]] },
  premium: { name: 'Офицерский резерв', icon: '🎁', cost: {gold: 500}, color: '#d0a76b',
    drops: [['silver', 15000, 40000], ['xp', 5000, 20000], ['gold', 200, 600]] },
  supply: { name: 'Склад снабжения', icon: '⚡', cost: {charges: 1}, color: '#76b8ba',
    drops: [['silver', 30000, 80000], ['xp', 15000, 40000], ['gold', 200, 1000]] }
};
const SUPPLIES = {
  silver: ['SILVER', 'Серебро', '₽', '💰', '#bdc3c7'],
  xp: ['XP', 'Опыт', 'XP', '⭐', '#82b4d6'],
  gold: ['GOLD', 'Золото', 'G', '🪙', '#e9c46d']
};

function migrateSupplyBoxes(inventory) {
  // Keep the number of paid-for boxes, including stock from retired events.
  const aliases = { event: 'basic', waffentrager: 'supply', legendary: 'premium', flamebox: 'premium', titanbox: 'premium', lowlevels: 'premium' };
  const result = {};
  for (const [key, count] of Object.entries(inventory)) {
    const id = Object.hasOwn(CONTAINERS, key) ? key : aliases[key];
    if (Object.hasOwn(CONTAINERS, id) && Number.isSafeInteger(count) && count > 0) result[id] = (result[id] || 0) + count;
  }
  return result;
}

// Each box rolls independently at opening (also in bulk). One pool roll, not 5% per vehicle.
function openContainerDirect(id, random = Math.random) {
  const box = CONTAINERS[id];
  if (!box) return null;
  let roll = random();
  if (box.vehicles) {
    const missing = box.vehicles.filter(id => !GameState.owned.includes(id));
    const chance = missing.length ? box.vehicleChance : 0;
    if (roll < chance) {
      const tankId = missing[Math.floor(random() * missing.length)];
      GameState.owned.push(tankId);
      return {type:'vehicle', id:tankId, amount:1, display:DB[tankId].n, icon:box.icon, color:box.color};
    }
    roll = (roll - chance) / (1 - chance);
  }
  // The resource entries are equiprobable. A complete collection goes directly here.
  const [type, min, max] = box.drops[Math.floor(roll * box.drops.length)];
  const [field, label, unit, icon, color] = SUPPLIES[type];
  const amount = min + Math.floor(random() * (max - min + 1));
  GameState[field] += amount;
  return { type, amount, label, display: amount + ' ' + unit, icon, color };
}

let containerAnimating = false;

function showContainerShop() {
  document.getElementById('container-modal').classList.add('show');
  switchTab('shop', document.querySelector('#container-modal .modal-tab'));
  updateInvCount();
}

function hideContainerShop() {
  document.getElementById('container-modal').classList.remove('show');
}

function switchTab(tab, btn) {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active-tab'));
  document.getElementById('tab-' + tab).classList.add('active-tab');

  if (tab === 'shop') renderContainerGrid();
  if (tab === 'inventory') renderInventoryGrid();
}

function openInventoryTab() {
  showContainerShop();
  switchTab('inventory', document.querySelectorAll('#container-modal .modal-tab')[1]);
}

function getInvTotal() {
  let total = 0;
  for (let cid in GameState.inventory) total += GameState.inventory[cid];
  return total;
}

function updateInvCount() {
  const el = document.getElementById('inv-count');
  if (el) el.innerText = getInvTotal();
  const badge = document.getElementById('inv-top-badge');
  if (badge) {
    const t = getInvTotal();
    badge.style.display = t > 0 ? 'flex' : 'none';
    badge.innerText = t;
  }
}

function buyCharges(count) {
  count = count || 1;
  const cost = count * 100;
  if (GameState.GOLD < cost) {
    alert("❌ Недостаточно золота! 1 заряд = 100 G (нужно: " + cost + " G)");
    return false;
  }
  GameState.GOLD -= cost;
  GameState.charges = (GameState.charges || 0) + count;
  updateResources();
  renderContainerGrid();
  if (typeof saveProgress === 'function') saveProgress();
  showInvNotification(count + " ⚡ Зарядов", "⚡");
  return true;
}
window.buyCharges = buyCharges;

function buyContainer(cid) {
  if (containerAnimating) return;
  const c = CONTAINERS[cid];
  if (!c) return;

  if (c.cost.charges) {
    const curCharges = GameState.charges || 0;
    if (curCharges < c.cost.charges) {
      if (confirm("⚡ Недостаточно зарядов! Купить 1 заряд за 100 золота?")) {
        if (!buyCharges(1)) return;
      } else {
        return;
      }
    }
    GameState.charges -= c.cost.charges;
  }
  if (c.cost.silver && GameState.SILVER < c.cost.silver) {
    alert("Недостаточно серебра!");
    return;
  }
  if (c.cost.gold && GameState.GOLD < c.cost.gold) {
    alert("Недостаточно золота!");
    return;
  }

  if (c.cost.silver) GameState.SILVER -= c.cost.silver;
  if (c.cost.gold) GameState.GOLD -= c.cost.gold;

  if (!GameState.inventory[cid]) GameState.inventory[cid] = 0;
  GameState.inventory[cid]++;

  updateResources();
  updateInvCount();
  renderContainerGrid();
  saveProgress();
  showInvNotification(c.name, c.icon);
}

function openFromInventory(cid) {
  if (containerAnimating) return;
  if (!GameState.inventory[cid] || GameState.inventory[cid] <= 0) return;

  GameState.inventory[cid]--;
  if (GameState.inventory[cid] <= 0) delete GameState.inventory[cid];

  const rwd = openContainerDirect(cid);
  if (!rwd) return;

  updateResources(); if (rwd.id) renderCarousel();
  showOpenAnim(cid, rwd);
  updateInvCount();
  saveProgress();
}

function openAllFromInventory(cid) {
  if (containerAnimating) return;
  const count = GameState.inventory[cid] || 0;
  if (count <= 0) return;
  if (count > 10 && !confirm("Открыть " + count + " контейнеров?")) return;

  let results = [];
  for (let i = 0; i < count; i++) {
    const rwd = openContainerDirect(cid);
    if (rwd) results.push(rwd);
  }

  delete GameState.inventory[cid];
  updateResources(); if (results.some(r => r.id)) renderCarousel();
  showBulkOpenResults(results, CONTAINERS[cid]);
  updateInvCount();
  renderInventoryGrid();
  saveProgress();
}

function showInvNotification(name, icon) {
  const notif = document.createElement('div');
  notif.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.9);border:2px solid #2ecc71;border-radius:10px;padding:20px 30px;z-index:9999;text-align:center;animation:invNotif 1.5s forwards;pointer-events:none;';
  notif.innerHTML = '<div style="font-size:40px">' + icon + '</div><div style="color:#2ecc71;font-weight:bold;margin-top:5px">В инвентарь!</div><div style="color:#aaa;font-size:12px">' + name + '</div>';
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 1500);
}

function showBulkOpenResults(results, container) {
  const totals = {};
  const names = [];
  for (const r of results) {
    if (r.type === 'vehicle') names.push(DB[r.id].n);
    else totals[r.type] = (totals[r.type] || 0) + r.amount;
  }
  showOpenAnim(null, { icon: container.icon, color: container.color,
    display: [...names,...Object.entries(totals).map(([type, n]) => `${n} ${SUPPLIES[type][2]}`)].join(' · ') });
}

function showOpenAnim(cid, reward) {
  containerAnimating = true;
  document.getElementById('container-opening').classList.add('show');
  document.getElementById('anim-container').style.display = 'none';
  const display = document.getElementById('reward-display');
  display.style.display = 'flex';
  display.innerHTML = `<div class="rwd-glow" style="color:${reward.color}"><div class="rwd-icon">${reward.id ? `<img src="models/${DB[reward.id].thumbnail}" alt="" style="max-width:220px">` : reward.icon}</div>
    <div class="rwd-text">${reward.display}</div></div><button class="btn rwd-collect" onclick="collectReward()">ЗАБРАТЬ</button>`;
}

function collectReward() {
  containerAnimating = false;
  document.getElementById('container-opening').classList.remove('show');
  renderContainerGrid(); renderInventoryGrid(); updateInvCount();
}

function collectionOdds(box) {
  const available = box.vehicles.some(id => !GameState.owned.includes(id));
  const chance = available ? box.vehicleChance * 100 : 0;
  const each = ((100 - chance) / box.drops.length).toLocaleString('ru-RU');
  return (available ? `${chance}% на танк — общий шанс для всех недостающих машин.` : 'Все пять машин уже в ангаре.') +
    ` Серебро — ${each}%, золото — ${each}%.`;
}

function renderContainerGrid() {
  const host = document.getElementById('container-grid');
  host.innerHTML = `<div class="supply-charges">⚡ Заряды снабжения: ${GameState.charges}
    <button class="btn btn-sm" onclick="buyCharges(1)">+1 заряд · 100 G</button></div>`;
  for (const [id, box] of Object.entries(CONTAINERS)) {
    const [currency, cost] = Object.entries(box.cost)[0];
    const unit = {silver: '₽', gold: 'G', charges: '⚡'}[currency];
    const card = document.createElement('div');
    card.className = 'c-card'; card.style.borderColor = box.color;
    const description = box.vehicles ? collectionOdds(box) : 'Одна из трёх наград с равным шансом';
    const vehicleList = (box.vehicles || []).map(id => `<div>${GameState.owned.includes(id) ? '✓ ' : ''}${DB[id].n}</div>`).join('');
    card.innerHTML = `<div class="c-icon">${box.icon}</div><div class="c-name">${box.name}</div>
      <div class="c-desc">${description}</div>
      <div class="c-drops">${vehicleList}${box.drops.map(([t,a,b]) => `<div>${SUPPLIES[t][1]}: ${a}–${b}</div>`).join('')}</div>
      <button class="btn c-buy" onclick="buyContainer('${id}')">КУПИТЬ · ${cost} ${unit}</button>`;
    host.append(card);
  }
}

function renderInventoryGrid() {
  const grid = document.getElementById('inventory-grid');
  grid.replaceChildren();
  document.getElementById('inventory-empty').style.display = getInvTotal() ? 'none' : 'block';
  for (const [id, qty] of Object.entries(GameState.inventory)) {
    const box = CONTAINERS[id];
    if (!box || qty <= 0) continue;
    const card = document.createElement('div'); card.className = 'inv-card';
    card.innerHTML = `<div class="inv-icon">${box.icon}</div><div class="inv-name">${box.name} × ${qty}</div>
      ${box.vehicles ? `<p class="c-desc">${collectionOdds(box)}</p>` : ''}
      <button class="btn inv-open" onclick="openFromInventory('${id}')">ОТКРЫТЬ 1</button>
      ${qty > 1 ? `<button class="btn inv-open-all" onclick="openAllFromInventory('${id}')">ОТКРЫТЬ ВСЕ</button>` : ''}`;
    grid.append(card);
  }
}
