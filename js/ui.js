// js/ui.js
console.log('🔄 ui.js загружается...');

// ========== Боевые сообщения ==========
function combatMessage(msg, color) {
  var el = document.getElementById('combat-message');
  if (!el) return;
  el.innerText = msg;
  el.style.color = color || '#fff';
  el.style.opacity = 1;
  setTimeout(function() { el.style.opacity = 0; }, 1500);
}

// ========== Лог урона ==========
function dmgLog(msg, color) {
  var el = document.getElementById('dmg-log');
  if (!el) return;
  var d = document.createElement('div');
  d.className = 'dmg-msg';
  d.style.color = color || '#fff';
  d.innerText = msg;
  el.appendChild(d);
  setTimeout(function() { d.remove(); }, 2000);
}

// ========== Обновление ресурсов ==========
function updateResources() {
  var xp = document.getElementById('xp-val');
  var gold = document.getElementById('gold-val');
  var silver = document.getElementById('silver-val');
  var charges = document.getElementById('charges-val');
  if (xp) xp.innerText = GameState.XP;
  if (gold) gold.innerText = GameState.GOLD;
  if (silver) silver.innerText = GameState.SILVER;
  if (charges) charges.innerText = GameState.charges || 0;
  refreshSupplyTab();
  if (!document.getElementById('bay-research').hidden) renderTree();
}

// ========== Обмен XP на золото ==========
function exchangeXP() {
  if (GameState.XP >= 100) {
    GameState.XP -= 100;
    GameState.GOLD += 10;
    var msg = document.getElementById('exchange-msg');
    if (msg) { msg.innerText = "✅"; setTimeout(function() { msg.innerText = ""; }, 1500); }
    updateResources();
    saveProgress();
  }
}

// ========== Выбор нации ==========
function renderNatButtons() {
  const host = document.getElementById('nat-buttons');
  host.replaceChildren(...PLAYABLE_NATIONS.map(nat => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.nation = nat;
    button.setAttribute('aria-pressed',String(nat === GameState.curNat));
    button.className = 'n-btn' + (nat === GameState.curNat ? ' active-n' : '');
    button.textContent = CONFIG.NATIONS[nat].toLocaleUpperCase('ru-RU');
    button.onclick = () => setNat(nat);
    return button;
  }));
}

function setNat(nat) {
  if (!PLAYABLE_NATIONS.includes(nat)) return;
  const focused = document.activeElement?.dataset.nation === nat;
  GameState.curNat = nat;
  saveProgress();
  renderTree();
  revealTreeNode();
  if (focused) document.querySelector(`.n-btn[data-nation="${nat}"]`)?.focus({preventScroll:true});
}

// ========== Выбор снаряда ==========
function setShell(i) {
  if (GameState.player?.usesMagazine) i = 0;
  GameState.curShell = i;
  document.querySelectorAll('.shell-opt').forEach(function(e, j) { e.classList.toggle('active', j === i); });
  document.querySelectorAll('.m-shell').forEach(function(e, j) { e.classList.toggle('active', j === i); });
}

// ========== Расходники ==========
function useCons(i) {
  if (!GameState.gameActive || !GameState.player || GameState.player.dead || GameState.consumables[i]) return;
  var cons = CONFIG.CONSUMABLES[i];
  if (!cons) return;
  if (GameState.SILVER < cons.cost) { combatMessage("Нет серебра!", "#e74c3c"); return; }
  GameState.SILVER -= cons.cost;
  GameState.consumables[i] = true;
  var el = document.getElementById('cons' + (i + 1));
  if (el) { el.classList.add('used'); el.classList.remove('ready'); }
  var mel = document.getElementById('mcons' + (i + 1));
  if (mel) mel.classList.add('used');
  switch (i) {
    case 0: GameState.player.trackBroken = false; GameState.player.engineRestartAt = GameState.player.critTimers.engine = 0; combatMessage("🔧 Починено!", "#2ecc71"); snd('hit'); break;
    case 1: GameState.player.hp = Math.min(GameState.player.maxHp, GameState.player.hp + GameState.player.maxHp * 0.15); combatMessage("+15% HP", "#2ecc71"); snd('hit'); break;
    case 2: GameState.adrenalineActive = true; GameState.adrenalineTimer = BattleClock.date() + 10000; combatMessage("💉 Адреналин!", "#f39c12"); snd('hit'); break;
    case 3: GameState.player.onFire = false; GameState.player.hp = Math.min(GameState.player.maxHp, GameState.player.hp + GameState.player.maxHp * 0.05); combatMessage("🧯 Огонь потушен!", "#2ecc71"); snd('hit'); break;
    case 4: GameState.paiokActive = true; combatMessage("⛽ Доп.бачок! +5% урон", "#f39c12"); snd('hit'); break;
    case 5: GameState.fuelBoostActive = true; GameState.fuelBoostTimer = BattleClock.date() + 15000; combatMessage("⛽ Топливо 105!", "#f39c12"); snd('hit'); break;
  }
  saveProgress();
}

// ========== Бустеры ==========
function updateBoosterUI() {
  var el = document.getElementById('booster-display');
  if (!el) return;
  var html = '';
  var types = ['xp', 'gold', 'silver'];
  for (var ti = 0; ti < types.length; ti++) {
    var type = types[ti];
    var b = CONFIG.BOOSTERS[type];
    var active = GameState.boosters[type] > 0;
    var stock = GameState.boosterStock[type] || 0;
    html += '<div class="booster-item' + (active ? ' active' : '') + '" style="border-color:' + b.color + '">';
    html += '<span class="booster-icon">' + b.icon + '</span><span class="booster-info">';
    if (active) { html += '<span style="color:' + b.color + '">x' + b.multiplier + ' (' + GameState.boosters[type] + ')</span>'; }
    else { html += '<span style="color:#666">Выкл</span>'; }
    html += '</span><span class="booster-stock">' + stock + ' шт</span>';
    if (!active && stock > 0) { html += '<button class="btn btn-sm" style="background:' + b.color + '" onclick="activateBooster(\'' + type + '\')">ON</button>'; }
    else if (!active) { html += '<button class="btn btn-sm" onclick="buyBooster(\'' + type + '\')">' + b.costGold + 'G</button>'; }
    html += '</div>';
  }
  el.innerHTML = html;
}

function buyBooster(type) {
  var b = CONFIG.BOOSTERS[type];
  if (!b) return;
  if (GameState.GOLD < b.costGold) { alert("Мало золота!"); return; }
  GameState.GOLD -= b.costGold;
  GameState.boosterStock[type] = (GameState.boosterStock[type] || 0) + 3;
  updateResources();
  updateBoosterUI();
  saveProgress();
}

function activateBooster(type) {
  if (GameState.boosterStock[type] <= 0) return;
  GameState.boosterStock[type]--;
  GameState.boosters[type] += 3;
  updateBoosterUI();
  saveProgress();
}

// ========== Модули ==========
function showModules() {
  var tid = GameState.selected;
  var t = DB[tid];
  if (!t) return;
  var mods = GameState.modules[tid] || [null, null, null];
  var html = '<div class="module-panel"><h3>⚙️ Модули: ' + t.n + '</h3><div class="module-slots">';
  for (var i = 0; i < 3; i++) {
    var m = mods[i];
    var mod = m ? CONFIG.MODULES[m] : null;
    html += '<div class="module-slot' + (mod ? ' equipped' : '') + '" onclick="selectModule(' + i + ')">';
    if (mod) { html += '<span class="mod-icon">' + mod.icon + '</span><span class="mod-name">' + mod.name + '</span><span class="mod-desc">' + mod.desc + '</span>'; }
    else { html += '<span class="mod-empty">🔌 Слот ' + (i + 1) + '</span>'; }
    html += '</div>';
  }
  html += '</div><div class="module-shop" id="module-shop-list"></div>';
  html += '<button class="btn btn-close" onclick="hideModules()">❌ Закрыть</button></div>';
  document.getElementById('module-modal').innerHTML = html;
  document.getElementById('module-modal').classList.add('show');
}

function hideModules() { document.getElementById('module-modal').classList.remove('show'); }

function selectModule(slot) {
  var tid = GameState.selected;
  var mods = GameState.modules[tid] || [null, null, null];
  var el = document.getElementById('module-shop-list');
  var html = '<h4>🔌 Слот ' + (slot + 1) + ':</h4>';
  if (mods[slot]) { html += '<div class="mod-option" onclick="unequipModule(' + slot + ')"><span style="color:#e74c3c">❌ Снять</span></div>'; }
  for (var id in CONFIG.MODULES) {
    var m = CONFIG.MODULES[id];
    var eq = mods.indexOf(id) !== -1;
    html += '<div class="mod-option' + (eq ? ' disabled' : '') + '" onclick="' + (eq ? '' : 'equipModule(\'' + id + '\',' + slot + ')') + '">';
    html += m.icon + ' <b>' + m.name + '</b> ' + m.desc + '<span class="mod-cost">' + m.cost + '💰</span>';
    if (eq) { html += ' ✅'; }
    html += '</div>';
  }
  el.innerHTML = html;
}

function equipModule(modId, slot) {
  var tid = GameState.selected;
  var mod = CONFIG.MODULES[modId];
  if (!mod) return;
  if (GameState.SILVER < mod.cost) { alert("Мало серебра!"); return; }
  if (!GameState.modules[tid]) { GameState.modules[tid] = [null, null, null]; }
  if (GameState.modules[tid].indexOf(modId) !== -1) return;
  GameState.SILVER -= mod.cost;
  GameState.modules[tid][slot] = modId;
  updateResources();
  showModules();
  saveProgress();
}

function unequipModule(slot) {
  var tid = GameState.selected;
  if (!GameState.modules[tid]) return;
  GameState.modules[tid][slot] = null;
  showModules();
  saveProgress();
}

// ========== Прокачка танка ==========
function initTankUpgrades(tid) {
  if (!GameState.upgrades[tid]) { GameState.upgrades[tid] = { gun: 0, engine: 0, turret: 0 }; }
  if (!GameState.upgradesBought[tid]) { GameState.upgradesBought[tid] = { gun: [true,false,false], engine: [true,false,false], turret: [true,false,false] }; }
}

function showUpgrades() {
  var tid = GameState.selected;
  var t = DB[tid];
  if (!t) return;
  initTankUpgrades(tid);
  var u = GameState.upgrades[tid];
  var bought = GameState.upgradesBought[tid];
  var tier = t.tier;
  var costs = CONFIG.UPGRADE_COSTS[tier] || CONFIG.UPGRADE_COSTS[10] || [40000, 80000];
  var cats = [
    { key: 'gun', icon: '🔫', title: 'Орудие', items: CONFIG.UPGRADES.gun },
    { key: 'engine', icon: '⚙️', title: 'Двигатель', items: CONFIG.UPGRADES.engine },
    { key: 'turret', icon: '🛡️', title: t.turretArmor == null ? 'Рубка' : 'Башня', items: CONFIG.UPGRADES.turret }
  ];
  var html = '<div class="upgrade-panel"><h3>📈 Прокачка: ' + t.n + ' [' + (CONFIG.TIER_ROMAN[tier] || 'XI') + ']</h3><div class="upgrade-columns">';
  for (var ci = 0; ci < cats.length; ci++) {
    var cat = cats[ci];
    html += '<div class="upgrade-col"><div class="upgrade-col-title">' + cat.icon + ' ' + cat.title + '</div>';
    for (var lvl = 0; lvl < cat.items.length; lvl++) {
      var item = cat.items[lvl];
      var name = cat.key === 'turret' && t.turretArmor == null ? item.name.replace('башня','рубка') : item.name;
      var isBought = bought[cat.key][lvl];
      var isEquipped = u[cat.key] === lvl;
      var canBuy = !isBought && lvl > 0 && bought[cat.key][lvl - 1];
      var cost = lvl === 0 ? 0 : costs[lvl - 1];
      var canAfford = GameState.SILVER >= cost;
      var cardClass = 'upgrade-card';
      if (isEquipped) cardClass += ' equipped';
      else if (isBought) cardClass += ' bought';
      else if (!canBuy) cardClass += ' locked';
      html += '<div class="' + cardClass + '"><div class="upg-name">' + name + '</div><div class="upg-desc">' + item.desc + '</div>';
      if (isEquipped) { html += '<div class="upg-btn installed">✅ Установлено</div>'; }
      else if (isBought) { html += '<div class="upg-btn equip" onclick="equipUpgrade(\'' + tid + '\',\'' + cat.key + '\',' + lvl + ')">⚙️ Установить</div>'; }
      else if (canBuy && canAfford) { html += '<div class="upg-btn buy" onclick="buyUpgrade(\'' + tid + '\',\'' + cat.key + '\',' + lvl + ',' + cost + ')">💰 Купить ' + cost + '💰</div>'; }
      else if (canBuy && !canAfford) { html += '<div class="upg-btn buy no-money">💰 Нужно ' + cost + '💰</div>'; }
      else { html += '<div class="upg-btn locked-btn">🔒</div>'; }
      html += '</div></div>';
    }
  }
  html += '</div><button class="btn btn-close" style="margin-top:15px" onclick="hideUpgrades()">❌ Закрыть</button></div>';
  document.getElementById('upgrade-modal').innerHTML = html;
  document.getElementById('upgrade-modal').classList.add('show');
}

function hideUpgrades() { document.getElementById('upgrade-modal').classList.remove('show'); }

function buyUpgrade(tid, cat, lvl, cost) {
  if (GameState.SILVER < cost) { alert("Недостаточно серебра!"); return; }
  initTankUpgrades(tid);
  GameState.SILVER -= cost;
  GameState.upgradesBought[tid][cat][lvl] = true;
  GameState.upgrades[tid][cat] = lvl;
  updateResources();
  showUpgrades();
  saveProgress();
}

function equipUpgrade(tid, cat, lvl) {
  initTankUpgrades(tid);
  GameState.upgrades[tid][cat] = lvl;
  showUpgrades();
  saveProgress();
}

// ========== Промокод ==========
function showPromo() {
  var modal = document.getElementById('promo-modal');
  if (modal) modal.classList.add('show');
  var input = document.getElementById('promo-input');
  if (input) input.value = '';
  var result = document.getElementById('promo-result');
  if (result) result.innerText = '';
}

function hidePromo() { var modal = document.getElementById('promo-modal'); if (modal) modal.classList.remove('show'); }

function activatePromo() {
  var code = document.getElementById('promo-input').value.trim().toUpperCase();
  var result = document.getElementById('promo-result');
  if (!code) return;
  if (GameState.usedPromos.indexOf(code) !== -1) { if (result) { result.innerText = "⚠️ Уже использован!"; result.style.color = "#e74c3c"; } return; }
  var reward = CONFIG.PROMOCODES[code];
  if (reward) {
    var msg = "";
    if (reward.gold) { GameState.GOLD += reward.gold; msg += reward.gold + 'G '; }
    if (reward.silver) { GameState.SILVER += reward.silver; msg += reward.silver + '💰 '; }
    if (reward.xp) { GameState.XP += reward.xp; msg += reward.xp + 'XP '; }
    if (reward.charges) {
      GameState.charges = (GameState.charges || 0) + reward.charges;
      msg += reward.charges + ' ⚡ ';
    }
    if (reward.boosterXP) { GameState.boosterStock.xp += (reward.boosterXP || 0); }
    if (reward.boosterSilver) { GameState.boosterStock.silver += (reward.boosterSilver || 0); }
    GameState.usedPromos.push(code);
    if (result) { result.innerText = "✅ Успешно! " + msg; result.style.color = "#2ecc71"; }
    updateResources();
    renderCarousel();
    updateBoosterUI();
    if (typeof saveProgress === 'function') saveProgress();
  } else { if (result) { result.innerText = "❌ Неверный код!"; result.style.color = "#e74c3c"; } }
}

// ========== Продажа танка ==========
function sellTank(tid) { TankSales.open(tid); }

// ========== Тренировка ==========
function fillTrainNatSelect() {
  var s = document.getElementById('train-nat-select');
  if (!s) return;
  s.replaceChildren(...TRAINING_NATIONS.map(nat => new Option(CONFIG.NATIONS[nat],nat)));
}

function fillEnemySelect() {
  const nat = document.getElementById('train-nat-select').value;
  document.getElementById('enemy-select').replaceChildren(...Object.values(DB).filter(t => t.nat === nat).map(t =>
    new Option(`${t.n} [${CONFIG.TIER_ROMAN[t.tier]}]`, t.id)));
}

function toggleTraining() {
  var p = document.getElementById('training-panel');
  if (p) { p.style.display = p.style.display === 'none' ? 'block' : 'none'; }
}

// ========== Карусель танков ==========
function renderCarousel(fromCarousel = false) {
  GarageViewer.syncSelection(fromCarousel);
  var c = document.getElementById('tank-carousel');
  if (!c) return;
  c.innerHTML = '';
  var sorted = [].concat(GameState.owned).sort(function(a, b) {
    var ta = DB[a], tb = DB[b];
    if (!ta || !tb) return 0;
    if (tb.tier !== ta.tier) return tb.tier - ta.tier;
    return 0;
  });
  for (var si = 0; si < sorted.length; si++) {
    var id = sorted[si];
    var t = DB[id];
    if (!t) continue;
    var slot = document.createElement('div');
    slot.className = 'tank-slot' + (GameState.selected === id ? ' selected' : '');
    slot.dataset.tankId = id;
    var select = document.createElement('button');
    select.type = 'button';
    select.className = 'slot-select';
    select.setAttribute('aria-label', 'Выбрать для боя: ' + t.n);
    select.setAttribute('aria-description', CONFIG.NATIONS[t.nat]);
    select.title = t.n + ' · ' + CONFIG.NATIONS[t.nat];
    select.setAttribute('aria-pressed', String(GameState.selected === id));
    (function(tankId) {
      select.onclick = function() {
        GameState.selected = tankId;
        if (BRANCHES[DB[tankId].nat]) GameState.curNat = DB[tankId].nat;
        saveProgress();
        renderCarousel(true);
        renderTree();
        var active = c.querySelector('.selected .slot-select');
        if (active) active.focus({ preventScroll: true });
      };
    })(id);
    var sb = document.createElement('button');
    sb.className = 'sell-btn';
    sb.setAttribute('aria-label', 'Продать: ' + t.n);
    sb.type = 'button';
    sb.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 3h7l7 7-7 7-7-7Z"/><circle cx="7" cy="7" r="1"/></svg><span>Продать</span>';
    sb.title = t.n + ' · продать за ' + TankSales.quote(t).label;
    (function(tankId) {
      sb.onclick = function(e) { e.stopPropagation(); sellTank(tankId); };
    })(id);
    slot.appendChild(sb);
    var upg = GameState.upgrades[id];
    if (upg) {
      var total = (upg.gun || 0) + (upg.engine || 0) + (upg.turret || 0);
      if (total > 0) { var ui2 = document.createElement('div'); ui2.className = 'upg-indicator'; ui2.innerText = '⚙️' + total; slot.appendChild(ui2); }
    }
    var mods = GameState.modules[id] || [null, null, null];
    var modCount = mods.filter(function(m) { return m; }).length;
    if (modCount > 0) { var mi = document.createElement('div'); mi.className = 'mod-indicator'; mi.innerText = '🔧+' + modCount; slot.appendChild(mi); }
    var wrap = vehicleThumbnail(t);
    wrap.classList.add('slot-bg');
    var info = document.createElement('span');
    info.className = 'slot-info';
    var tierEl = document.createElement('span');
    tierEl.className = 'slot-tier';
    tierEl.innerText = CONFIG.TIER_ROMAN[t.tier] || 'XI';
    var nameEl = document.createElement('span');
    nameEl.className = 'slot-name';
    nameEl.innerText = t.n;
    var clsEl = document.createElement('span');
    clsEl.className = 'slot-cls';
    clsEl.innerText = CONFIG.TANK_CLASSES[t.cls];
    info.appendChild(tierEl);
    info.appendChild(nameEl);
    info.appendChild(clsEl);
    select.append(wrap, info);
    slot.appendChild(select);
    c.appendChild(slot);
  }
}

// ========== Таблица команд ==========
function updateScoreboard() {
  const alive = GameState.units.filter(u => !u.dead);
  document.getElementById('allies-list').textContent = alive.filter(u => u.team !== 'enemy').length;
  document.getElementById('enemies-list').textContent = alive.filter(u => u.team === 'enemy').length;
}

// ========== Экспорт всех функций ==========
window.combatMessage = combatMessage;
window.dmgLog = dmgLog;
window.updateResources = updateResources;
window.exchangeXP = exchangeXP;
window.setNat = setNat;
window.setShell = setShell;
window.useCons = useCons;
window.updateBoosterUI = updateBoosterUI;
window.buyBooster = buyBooster;
window.activateBooster = activateBooster;
window.showModules = showModules;
window.hideModules = hideModules;
window.selectModule = selectModule;
window.equipModule = equipModule;
window.unequipModule = unequipModule;
window.showUpgrades = showUpgrades;
window.hideUpgrades = hideUpgrades;
window.buyUpgrade = buyUpgrade;
window.equipUpgrade = equipUpgrade;
window.showPromo = showPromo;
window.hidePromo = hidePromo;
window.activatePromo = activatePromo;
window.sellTank = sellTank;
window.fillTrainNatSelect = fillTrainNatSelect;
window.fillEnemySelect = fillEnemySelect;
window.toggleTraining = toggleTraining;
window.renderCarousel = renderCarousel;

window.renderTree = renderTree;
window.renderNatButtons = renderNatButtons;
window.updateScoreboard = updateScoreboard;
window.showContainerShop = showContainerShop;
window.hideContainerShop = hideContainerShop;
window.switchTab = switchTab;
window.openInventoryTab = openInventoryTab;
window.updateInvCount = updateInvCount;

console.log('✅ ui.js загружена полностью!');