// Each vehicle-bearing crate has its own manifest. The ordinary resource ranges are unchanged.
const NATIONAL_BOX_CHANCE = .20;
const CONTAINERS = {
  ...Object.fromEntries(Object.entries(NationalCrates.catalog).map(([id,model]) => [id,{
    name:model.name, icon:'📦', color:model.accent, national:true, slotChance:0, vehicleChance:.10,
    vehicles:NATIONAL_TANKS.filter(t=>t.supplyBox===id).map(t=>t.id),
    drops:[['silver',5000,15000,60],['xp',2000,8000,30],['gold',50,200,10]]
  }])),
  [TreeEvent.boxId]: { name:'Ёлочный ларец', icon:'❆', color:'#d1af71', slotChance:0 }, // battle drop, never for sale
  collection: { name: 'Новогодний ящик', icon: '❄', cost: {gold: 500}, color: '#91c7d4',
    // This box has its own published manifest; a promo collectible is not automatically a crate prize.
    vehicleChance: 0.02, slotChance: 0.05, vehicles: ['M4A3E2','T71DA','JPANTHERII','T62A','TL7'],
    drops: [['silver', 100, 50000, 70], ['gold', 1, 650, 30]] },
  basic: { name: 'Полевой ящик', icon: '📦', cost: {silver: 25000}, color: '#96a486',
    drops: [['silver', 5000, 15000, 60], ['xp', 2000, 8000, 30], ['gold', 50, 200, 10]] },
  premium: { name: 'Офицерский резерв', icon: '🎁', cost: {gold: 500}, color: '#d0a76b',
    vehicleChance: 0.02, vehicles: ['PZ-II-J','T67'],
    drops: [['silver', 15000, 40000, 60], ['xp', 5000, 20000, 25], ['gold', 200, 600, 15]] }
};
// A separate permanent berth roll; the primary reward table is unchanged.
const slotChance = box => box.slotChance ?? 0.10;
const SUPPLIES = {
  silver: ['SILVER', 'Серебро', '₽', '💰', '#bdc3c7'],
  xp: ['XP', 'Опыт', 'XP', '⭐', '#82b4d6'],
  gold: ['GOLD', 'Золото', 'G', '🪙', '#e9c46d']
};

// Called once by the completed sortie settlement. A last rental can already have left
// the hangar; use the actual player's tank, never the selected tank, tree or opponent.
function nationalVictoryBox(g, won, random=Math.random) {
  const id='national-'+DB[g.player?.id]?.nat;
  if (g.training || !won || !CONTAINERS[id]?.national || random() >= NATIONAL_BOX_CHANCE) return null;
  g.inventory[id]=(g.inventory[id] || 0)+1;
  return id;
}

function migrateSupplyBoxes(inventory) {
  // Keep the number of paid-for boxes, including stock from retired events.
  const aliases = { event: 'basic', legendary: 'premium', flamebox: 'premium', titanbox: 'premium', lowlevels: 'premium' };
  const result = {};
  for (const [key, count] of Object.entries(inventory)) {
    const id = Object.hasOwn(CONTAINERS, key) ? key : aliases[key];
    if (Object.hasOwn(CONTAINERS, id) && Number.isSafeInteger(count) && count > 0) result[id] = (result[id] || 0) + count;
  }
  return result;
}

// Each box rolls independently at opening (also in bulk). The vehicle chance applies to the pool, not to each vehicle.
const missingPrize = id => !HangarSlots.received(id) || !!GameState.rentalBattles[id];
function rollPrimary(box, random) {
  let roll = random();
  if (box.vehicles) {
    const missing = box.vehicles.filter(missingPrize);
    const chance = missing.length ? box.vehicleChance : 0;
    if (roll < chance) {
      const tankId = missing[Math.floor(random() * missing.length)];
      HangarSlots.awardPermanent(tankId);
      return {type:'vehicle', id:tankId, amount:1};
    }
    roll = (roll - chance) / (1 - chance);
  }
  // Weights sum to 100 inside the resource pool, after the independent tank decision.
  let threshold=0;
  const [type,min,max] = box.drops.find(([, , ,weight]) => roll < (threshold+=weight)/100) || box.drops.at(-1);
  const [field] = SUPPLIES[type];
  const amount = min + Math.floor(random() * (max - min + 1));
  GameState[field] += amount;
  return { type, amount };
}

function openContainerDirect(id, random = Math.random) {
  if (!Object.hasOwn(CONTAINERS,id)) return null;
  if (id === TreeEvent.boxId) return TreeEvent.collect(GameState.tree2026, random); // no resources, tank or slot roll
  const box = CONTAINERS[id];
  const reward = rollPrimary(box, random);
  reward.slot = slotChance(box) > 0 && random() < slotChance(box) && GameState.garageSlots < Number.MAX_SAFE_INTEGER;
  if (reward.slot) {
    GameState.garageSlots++;
    reward.delivered = HangarSlots.deliver();
  }
  return reward;
}

function showContainerShop(tab = 'shop') {
  if (CrateView.active || GameState.gameActive) return;
  const dialog = document.getElementById('container-modal');
  if (!dialog.open) { dialog.showModal(); GarageViewer.suspend(); }
  document.getElementById('supply-feedback').textContent = '';
  switchTab(tab,dialog.querySelectorAll('.modal-tab')[tab==='inventory'?1:0]); updateInvCount();
}
function hideContainerShop() {
  const dialog=document.getElementById('container-modal');
  if(CrateView.active) CrateView.close();
  if(dialog.open) dialog.close();
}
document.getElementById('container-modal').addEventListener('close',()=>GarageViewer.syncSelection());
function switchTab(tab, btn) {
  const dialog=document.getElementById('container-modal');
  document.getElementById('supply-title').textContent=tab==='inventory'?'Инвентарь':'Контейнеры';
  document.getElementById('supply-feedback').textContent='';
  for(const t of dialog.querySelectorAll('.modal-tab')){
    t.classList.toggle('active',t===btn);t.setAttribute('aria-pressed',String(t===btn));
  }
  for(const panel of dialog.querySelectorAll('.tab-content'))panel.classList.toggle('active-tab',panel.id==='tab-'+tab);
  if(tab==='shop')renderContainerGrid();else renderInventoryGrid();
}
function refreshSupplyTab() {
  if (!document.getElementById('container-modal').open) return;
  if (document.getElementById('tab-inventory').classList.contains('active-tab')) renderInventoryGrid();
  else renderContainerGrid();
}
function openInventoryTab() { showContainerShop('inventory'); }

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

function buyContainer(cid) {
  if (CrateView.active) return;
  if (!Object.hasOwn(CONTAINERS,cid)) return;
  const c = CONTAINERS[cid];
  if (!c.cost) return; // earned-only containers

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
  saveProgress();
  showInvNotification(c.name, c.icon);
}

// Exactly one transaction for single or bulk. The animation, skip, close and reload
// can never consume another box or award anything (even if WebGL fails midway).
function unpack(cid, all) {
  if (CrateView.active || !Object.hasOwn(CONTAINERS,cid)) return;
  const stock = GameState.inventory[cid] || 0;
  if (!stock) return;
  const n = all ? stock : 1;
  if (all && n>10 && !confirm(`Открыть ${n} контейнеров?`)) return;
  const results = [];
  for(let i=0;i<n;i++) results.push(openContainerDirect(cid));
  if(n===stock)delete GameState.inventory[cid];else GameState.inventory[cid]=stock-n;
  saveProgress();
  updateResources();renderCarousel();updateInvCount();
  if (cid === TreeEvent.boxId) TreeDesk.refresh();
  CrateView.show(cid,n,receipt(results));
}
function openFromInventory(cid) { unpack(cid,false); }
function openAllFromInventory(cid) { unpack(cid,true); }

function receipt(results){
  const ornaments={},totals={},vehicles=new Set(),delivered=new Set();let slots=0;
  for(const r of results){
    if(r.type==='ornament') { ornaments[r.ornament]=(ornaments[r.ornament]||0)+1; continue; }
    if(r.id)vehicles.add(r.id);else totals[r.type]=(totals[r.type]||0)+r.amount;
    if(r.slot)slots++;for(const id of r.delivered||[])delivered.add(id);
  }
  const rows=[];
  for (const [id,n] of Object.entries(ornaments)) {
    const toy=TreeEvent.items[id];
    rows.push({ornament:id, title:`${toy.name} × ${n}`, detail:`${toy.rarity} · ${toy.effect} в слоте · в коллекции: ${GameState.tree2026[id]}`});
  }
  for(const id of new Set([...vehicles,...delivered])) rows.push({title:DB[id].n,vehicle:id,
    detail:GameState.pendingVehicles.includes(id)?'Ожидает слота · сохранено в инвентаре':vehicles.has(id)?'Получено · в ангаре':'Доставлено из очереди в ангар'});
  for(const [type,amount] of Object.entries(totals)){
    const [,label,unit]=SUPPLIES[type];rows.push({title:`${amount} ${unit}`,detail:label,tag:unit});
  }
  if(slots) rows.push({title:`Слоты ангара: +${slots}`,detail:`Постоянный бонус · всего мест: ${GameState.garageSlots}`,tag:'+1'});
  return rows;
}

function showInvNotification(name, icon) {
  if(document.getElementById('container-modal').open){document.getElementById('supply-feedback').textContent=`Добавлено: ${name}`;return;}
  const notif = document.createElement('div');
  notif.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.9);border:2px solid #2ecc71;border-radius:10px;padding:20px 30px;z-index:9999;text-align:center;animation:invNotif 1.5s forwards;pointer-events:none;';
  notif.innerHTML = '<div style="font-size:40px">' + icon + '</div><div style="color:#2ecc71;font-weight:bold;margin-top:5px">В инвентарь!</div><div style="color:#aaa;font-size:12px">' + name + '</div>';
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 1500);
}

function boxOdds(box) {
  if (box === CONTAINERS[TreeEvent.boxId]) return `Только одно украшение. ${TreeEvent.oddsText()}.`;
  const available = box.vehicles?.some(missingPrize), chance = available ? box.vehicleChance : 0;
  const vehicles = !box.vehicles ? '' : available ? `${chance * 100}% на танк — общий шанс для всех недостающих машин. ` :
    box.national ? 'Все машины этого ящика получены. ' : box === CONTAINERS.collection ? 'Все пять машин уже получены. ' : 'Обе машины уже получены навсегда. ';
  const resources = box.drops.map(([key,,,weight], i) => `${i ? SUPPLIES[key][1].toLowerCase() : SUPPLIES[key][1]} — ${((1-chance)*weight).toLocaleString('ru-RU',{maximumFractionDigits:2})}%`).join(', ');
  return `${vehicles}${resources}.` + (box.national ? ' Без дополнительного слота.' : ` Дополнительный слот ангара — ${slotChance(box) * 100}%.`);
}

function renderSupplyStatus(){
  document.getElementById('supply-balance').textContent=`Баланс: ${GameState.GOLD.toLocaleString('ru-RU')} G · ${GameState.SILVER.toLocaleString('ru-RU')} ₽`;
  document.getElementById('supply-capacity').textContent=`Слоты ангара: ${GameState.owned.length} / ${GameState.garageSlots}`;
  document.getElementById('supply-notice').textContent='Дополнительный слот ангара разыгрывается отдельно в каждом покупном ящике. Боевой ёлочный ларец даёт только украшение.';
}
document.getElementById('to-national').onclick=()=>{
  document.getElementById('national-crates-title').focus({preventScroll:true});
  document.getElementById('national-showcase').scrollIntoView({block:'start'});
};
function renderContainerGrid() {
  renderSupplyStatus();
  const host=document.getElementById('container-grid');host.replaceChildren();
  for(const [id,box] of Object.entries(CONTAINERS)){
    if (!box.cost) continue;
    const [currency,cost]=Object.entries(box.cost)[0],unit={silver:'₽',gold:'G'}[currency];
    const card=document.createElement('article');card.className='c-card';card.style.setProperty('--stripe',box.color);
    const list=(box.vehicles||[]).map(id=>`<li>${missingPrize(id)?'':'✓ '}${DB[id].n}${box===CONTAINERS.premium?' · навсегда':''}</li>`);
    list.push(...box.drops.map(([t,a,b])=>`<li>${SUPPLIES[t][1]}: ${a.toLocaleString('ru-RU')}–${b.toLocaleString('ru-RU')}</li>`));
    card.innerHTML=`${crateArt(id,box.name)}<div class="crate-copy"><small class="season-kicker">${id==='collection'?'ЗИМНЯЯ СЕРИЯ':'СНАБЖЕНИЕ'}</small>
      <h4 class="c-name">${box.name}</h4><p class="c-desc">${boxOdds(box)}</p><details class="crate-manifest"><summary>Состав контейнера</summary><ul>${list.join('')}</ul></details></div>
      <button class="winter-action c-buy" onclick="buyContainer('${id}')">КУПИТЬ · ${cost} ${unit}</button>`;
    host.append(card);
  }
  renderNationalShowcase(id=>{
    const box=CONTAINERS[id];
    return `<details class="crate-manifest"><summary>Награды · машин: ${box.vehicles.length}</summary>
      <p>${boxOdds(box)}</p><ul>${box.vehicles.map(k=>`<li>${missingPrize(k)?'':'✓ '}${DB[k].n}</li>`).join('')}
      ${box.drops.map(([t,min,max])=>`<li>${SUPPLIES[t][1]}: ${min.toLocaleString('ru-RU')}–${max.toLocaleString('ru-RU')}</li>`).join('')}</ul></details>`;
  });
}
function renderInventoryGrid() {
  renderSupplyStatus();
  TreeDesk.renderInventory();
  const grid=document.getElementById('inventory-grid');grid.replaceChildren();
  document.getElementById('inventory-empty').hidden=!!getInvTotal();
  const waiting=document.getElementById('vehicle-deliveries');waiting.hidden=!GameState.pendingVehicles.length;
  const deliveries=GameState.pendingVehicles.map(id=>{
    const term=HangarSlots.rentalTerm(id);return DB[id].n+(term?` (аренда на ${term})`:'');
  });
  waiting.textContent=waiting.hidden?'':`Ожидают слота: ${deliveries.join(', ')}. Машины сохранены и поступят в ангар по очереди, как только освободится или выпадет место.`;
  for(const [id,qty] of Object.entries(GameState.inventory)){
    const box=CONTAINERS[id];if(!box||qty<=0)continue;
    const card=document.createElement('article');card.className='inv-card';card.style.setProperty('--stripe',box.color);
    card.innerHTML=`${crateArt(id,box.name)}<div class="crate-copy"><small class="season-kicker">НА СКЛАДЕ · ${qty} ШТ.</small><h4 class="inv-name">${box.name} × ${qty}</h4>
      <p class="c-desc">${boxOdds(box)}</p></div>
      <button class="winter-action inv-open" onclick="openFromInventory('${id}')">ОТКРЫТЬ 1</button>
      ${qty>1?`<button class="winter-back inv-open-all" onclick="openAllFromInventory('${id}')">ОТКРЫТЬ ВСЕ</button>`:''}`;
    grid.append(card);
  }
}
