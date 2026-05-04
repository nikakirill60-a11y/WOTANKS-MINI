// js/ui.js
console.log('?? ui.js §©§¡§¤§²§µ§¨§¡§¦§´§³§Á...');

// ========== §³§°§°§¢§»§¦§¯§ª§Á §¿§¬§ª§±§¡§¨§¡ ==========
function crewMsg(msg, color) {
  var el = document.getElementById('crew-msg');
  if (!el) return;
  el.innerText = msg;
  el.style.color = color || '#fff';
  el.style.opacity = 1;
  setTimeout(function() { el.style.opacity = 0; }, 1500);
}

// ========== §­§°§¤ §µ§²§°§¯§¡ ==========
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

// ========== §°§¢§¯§°§£§­§¦§¯§ª§¦ §²§¦§³§µ§²§³§°§£ ==========
function updateResources() {
  var xp = document.getElementById('xp-val');
  var gold = document.getElementById('gold-val');
  var silver = document.getElementById('silver-val');
  if (xp) xp.innerText = GameState.XP;
  if (gold) gold.innerText = GameState.GOLD;
  if (silver) silver.innerText = GameState.SILVER;
}

// ========== §°§¢§®§¦§¯ XP §¯§¡ §©§°§­§°§´§° ==========
function exchangeXP() {
  if (GameState.XP >= 100) {
    GameState.XP -= 100;
    GameState.GOLD += 10;
    var msg = document.getElementById('exchange-msg');
    if (msg) { msg.innerText = "?"; setTimeout(function() { msg.innerText = ""; }, 1500); }
    updateResources();
  }
}

// ========== §£§½§¢§°§² §¯§¡§¸§ª§ª ==========
function setNat(nat, btn) {
  GameState.curNat = nat;
  renderTree();
  document.querySelectorAll('.n-btn').forEach(function(b) { b.classList.remove('active-n'); });
  if (btn) btn.classList.add('active-n');
}

// ========== §£§½§¢§°§² §³§¯§¡§²§Á§¥§¡ ==========
function setShell(i) {
  GameState.curShell = i;
  document.querySelectorAll('.shell-opt').forEach(function(e, j) { e.classList.toggle('active', j === i); });
  document.querySelectorAll('.m-shell').forEach(function(e, j) { e.classList.toggle('active', j === i); });
}

// ========== §²§¡§³§·§°§¥§¯§ª§¬§ª ==========
function useCons(i) {
  if (!GameState.gameActive || !GameState.player || GameState.player.dead || GameState.consumables[i]) return;
  var cons = CONFIG.CONSUMABLES[i];
  if (!cons) return;
  if (GameState.SILVER < cons.cost) { crewMsg("§¯§Ö§ä §ã§Ö§â§Ö§Ò§â§Ñ!", "#e74c3c"); return; }
  GameState.SILVER -= cons.cost;
  GameState.consumables[i] = true;
  var el = document.getElementById('cons' + (i + 1));
  if (el) el.classList.add('used');
  var mel = document.getElementById('mcons' + (i + 1));
  if (mel) mel.classList.add('used');
  switch (i) {
    case 0: GameState.player.trackBroken = false; crewMsg("§±§à§é§Ú§ß§Ö§ß§à!", "#2ecc71"); snd('hit'); break;
    case 1: GameState.player.hp = Math.min(GameState.player.maxHp, GameState.player.hp + GameState.player.maxHp * 0.15); crewMsg("+15%HP", "#2ecc71"); snd('hit'); break;
    case 2: GameState.adrenalineActive = true; GameState.adrenalineTimer = Date.now() + 10000; crewMsg("§¡§Õ§â§Ö§ß§Ñ§Ý§Ú§ß!", "#f39c12"); snd('hit'); break;
    case 3: GameState.player.onFire = false; GameState.player.hp = Math.min(GameState.player.maxHp, GameState.player.hp + GameState.player.maxHp * 0.05); crewMsg("§°§Ô§à§ß§î §á§à§ä§å§ê§Ö§ß!", "#2ecc71"); snd('hit'); break;
    case 4: GameState.paiokActive = true; crewMsg("§¥§à§á.§á§Ñ§×§Ü! +5% §å§â§à§ß", "#f39c12"); snd('hit'); break;
    case 5: GameState.fuelBoostActive = true; GameState.fuelBoostTimer = Date.now() + 15000; crewMsg("§´§à§á§Ý§Ú§Ó§à 105!", "#f39c12"); snd('hit'); break;
  }
}

// ========== §¢§µ§³§´§¦§²§½ ==========
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
    else { html += '<span style="color:#666">§Ó§í§Ü§Ý</span>'; }
    html += '</span><span class="booster-stock">' + stock + '§ê§ä</span>';
    if (!active && stock > 0) { html += '<button class="btn btn-sm" style="background:' + b.color + '" onclick="activateBooster(\'' + type + '\')">ON</button>'; }
    else if (!active) { html += '<button class="btn btn-sm" onclick="buyBooster(\'' + type + '\')">' + b.costGold + 'G</button>'; }
    html += '</div>';
  }
  el.innerHTML = html;
}

function buyBooster(type) {
  var b = CONFIG.BOOSTERS[type];
  if (!b) return;
  if (GameState.GOLD < b.costGold) { alert("§®§Ñ§Ý§à §Ù§à§Ý§à§ä§Ñ!"); return; }
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

// ========== §®§°§¥§µ§­§ª ==========
function showModules() {
  var tid = GameState.selected;
  var t = DB[tid];
  if (!t) return;
  var mods = GameState.modules[tid] || [null, null, null];
  var html = '<div class="module-panel"><h3>?? §®§à§Õ§å§Ý§Ú: ' + t.n + '</h3><div class="module-slots">';
  for (var i = 0; i < 3; i++) {
    var m = mods[i];
    var mod = m ? CONFIG.MODULES[m] : null;
    html += '<div class="module-slot' + (mod ? ' equipped' : '') + '" onclick="selectModule(' + i + ')">';
    if (mod) { html += '<span class="mod-icon">' + mod.icon + '</span><span class="mod-name">' + mod.name + '</span><span class="mod-desc">' + mod.desc + '</span>'; }
    else { html += '<span class="mod-empty">+ §³§Ý§à§ä ' + (i + 1) + '</span>'; }
    html += '</div>';
  }
  html += '</div><div class="module-shop" id="module-shop-list"></div>';
  html += '<button class="btn btn-close" onclick="hideModules()">§©§¡§¬§²§½§´§¾</button></div>';
  document.getElementById('module-modal').innerHTML = html;
  document.getElementById('module-modal').classList.add('show');
}

function hideModules() { document.getElementById('module-modal').classList.remove('show'); }

function selectModule(slot) {
  var tid = GameState.selected;
  var mods = GameState.modules[tid] || [null, null, null];
  var el = document.getElementById('module-shop-list');
  var html = '<h4>§³§Ý§à§ä ' + (slot + 1) + ':</h4>';
  if (mods[slot]) { html += '<div class="mod-option" onclick="unequipModule(' + slot + ')"><span style="color:#e74c3c">? §³§ß§ñ§ä§î</span></div>'; }
  for (var id in CONFIG.MODULES) {
    var m = CONFIG.MODULES[id];
    var eq = mods.indexOf(id) !== -1;
    html += '<div class="mod-option' + (eq ? ' disabled' : '') + '" onclick="' + (eq ? '' : 'equipModule(\'' + id + '\',' + slot + ')') + '">';
    html += m.icon + ' <b>' + m.name + '</b> ' + m.desc + '<span class="mod-cost">' + m.cost + '?</span>';
    if (eq) { html += ' ?'; }
    html += '</div>';
  }
  el.innerHTML = html;
}

function equipModule(modId, slot) {
  var tid = GameState.selected;
  var mod = CONFIG.MODULES[modId];
  if (!mod) return;
  if (GameState.SILVER < mod.cost) { alert("§®§Ñ§Ý§à §ã§Ö§â§Ö§Ò§â§Ñ!"); return; }
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

// ========== §±§²§°§¬§¡§¹§¬§¡ §´§¡§¯§¬§°§£ ==========
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
    { key: 'gun', icon: '??', title: '§°§â§å§Õ§Ú§Ö', items: CONFIG.UPGRADES.gun },
    { key: 'engine', icon: '??', title: '§¥§Ó§Ú§Ô§Ñ§ä§Ö§Ý§î', items: CONFIG.UPGRADES.engine },
    { key: 'turret', icon: '???', title: '§¢§Ñ§ê§ß§ñ', items: CONFIG.UPGRADES.turret }
  ];
  var html = '<div class="upgrade-panel"><h3>?? §±§â§à§Ü§Ñ§é§Ü§Ñ: ' + t.n + ' [' + (CONFIG.TIER_ROMAN[tier] || 'XI') + ']</h3><div class="upgrade-columns">';
  for (var ci = 0; ci < cats.length; ci++) {
    var cat = cats[ci];
    html += '<div class="upgrade-col"><div class="upgrade-col-title">' + cat.icon + ' ' + cat.title + '</div>';
    for (var lvl = 0; lvl < cat.items.length; lvl++) {
      var item = cat.items[lvl];
      var isBought = bought[cat.key][lvl];
      var isEquipped = u[cat.key] === lvl;
      var canBuy = !isBought && lvl > 0 && bought[cat.key][lvl - 1];
      var cost = lvl === 0 ? 0 : costs[lvl - 1];
      var canAfford = GameState.SILVER >= cost;
      var cardClass = 'upgrade-card';
      if (isEquipped) cardClass += ' equipped';
      else if (isBought) cardClass += ' bought';
      else if (!canBuy) cardClass += ' locked';
      html += '<div class="' + cardClass + '"><div class="upg-name">' + item.name + '</div><div class="upg-desc">' + item.desc + '</div>';
      if (isEquipped) { html += '<div class="upg-btn installed">§µ§³§´§¡§¯§°§£§­§¦§¯§°</div>'; }
      else if (isBought) { html += '<div class="upg-btn equip" onclick="equipUpgrade(\'' + tid + '\',\'' + cat.key + '\',' + lvl + ')">§µ§³§´§¡§¯§°§£§ª§´§¾</div>'; }
      else if (canBuy && canAfford) { html += '<div class="upg-btn buy" onclick="buyUpgrade(\'' + tid + '\',\'' + cat.key + '\',' + lvl + ',' + cost + ')">§¬§µ§±§ª§´§¾ ' + cost + '?</div>'; }
      else if (canBuy && !canAfford) { html += '<div class="upg-btn buy no-money">§¯§µ§¨§¯§° ' + cost + '?</div>'; }
      else { html += '<div class="upg-btn locked-btn">??</div>'; }
      html += '</div></div>';
    }
  }
  html += '</div><button class="btn btn-close" style="margin-top:15px" onclick="hideUpgrades()">§©§¡§¬§²§½§´§¾</button></div>';
  document.getElementById('upgrade-modal').innerHTML = html;
  document.getElementById('upgrade-modal').classList.add('show');
}

function hideUpgrades() { document.getElementById('upgrade-modal').classList.remove('show'); }

function buyUpgrade(tid, cat, lvl, cost) {
  if (GameState.SILVER < cost) { alert("§¯§Ö§Õ§à§ã§ä§Ñ§ä§à§é§ß§à §ã§Ö§â§Ö§Ò§â§Ñ!"); return; }
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

// ========== §¬§£§¦§³§´ ==========
function updateQuestUI() {
  var q = GameState.quest23;
  if (!q) return;
  if (q.claimed) { var widget = document.getElementById('quest-widget'); if (widget) widget.style.display = 'none'; return; }
  var widget = document.getElementById('quest-widget');
  if (widget) widget.style.display = 'block';
  var pct = Math.min(100, (q.kills / q.target) * 100);
  var bar = document.getElementById('quest-bar');
  var text = document.getElementById('quest-text');
  var btn = document.getElementById('quest-claim-btn');
  if (bar) bar.style.width = pct + '%';
  if (text) text.innerText = q.kills + ' / ' + q.target;
  if (q.kills >= q.target) { if (btn) btn.style.display = 'block'; if (text) text.style.display = 'none'; }
  else { if (btn) btn.style.display = 'none'; if (text) text.style.display = 'block'; }
}

function claimQuestReward() {
  if (!GameState.quest23.claimed) {
    GameState.quest23.claimed = true;
    if (GameState.owned.indexOf('T3485VIC') === -1) { GameState.owned.push('T3485VIC'); }
    alert("?? §´§Ñ§ß§Ü §´-34-85 §±§à§Ò§Ö§Õ§ß§í§Û §á§à§Ý§å§é§Ö§ß!");
    updateResources();
    renderCarousel();
    updateQuestUI();
    saveProgress();
  }
}

// ========== §±§²§°§®§°§¬§°§¥ ==========
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
  if (GameState.usedPromos.indexOf(code) !== -1) { if (result) { result.innerText = "§µ§Ø§Ö §Ú§ã§á§à§Ý§î§Ù§à§Ó§Ñ§ß!"; result.style.color = "#e74c3c"; } return; }
  var reward = CONFIG.PROMOCODES[code];
  if (reward) {
    var msg = "";
    if (reward.gold) { GameState.GOLD += reward.gold; msg += reward.gold + 'G '; }
    if (reward.silver) { GameState.SILVER += reward.silver; msg += reward.silver + '? '; }
    if (reward.xp) { GameState.XP += reward.xp; msg += reward.xp + 'XP '; }
    if (reward.tank) {
      if (GameState.owned.indexOf(reward.tank) === -1) { GameState.owned.push(reward.tank); msg += '§´§Ñ§ß§Ü: ' + DB[reward.tank].n; }
      else { msg += '+500G'; GameState.GOLD += 500; }
    }
    if (reward.boosterXP) { GameState.boosterStock.xp += (reward.boosterXP || 0); }
    if (reward.boosterSilver) { GameState.boosterStock.silver += (reward.boosterSilver || 0); }
    GameState.usedPromos.push(code);
    if (result) { result.innerText = "§µ§ã§á§Ö§ê§ß§à! " + msg; result.style.color = "#2ecc71"; }
    updateResources();
    renderCarousel();
    updateBoosterUI();
    saveProgress();
  } else { if (result) { result.innerText = "§¯§Ö§Ó§Ö§â§ß§í§Û §Ü§à§Õ!"; result.style.color = "#e74c3c"; } }
}

// ========== §±§²§°§¥§¡§¨§¡ §´§¡§¯§¬§¡ ==========
function sellTank(tid) {
  if (GameState.owned.length <= 1) { alert("§¯§Ö§Ý§î§Ù§ñ §á§â§à§Õ§Ñ§ä§î §á§à§ã§Ý§Ö§Õ§ß§Ú§Û §ä§Ñ§ß§Ü!"); return; }
  var t = DB[tid];
  var price = t.collection ? t.tier * 15000 : t.gold ? t.gold * 200 : t.tier * 5000;
  if (confirm('§±§â§à§Õ§Ñ§ä§î ' + t.n + ' §Ù§Ñ ' + price + '??')) {
    GameState.SILVER += price;
    GameState.owned = GameState.owned.filter(function(id) { return id !== tid; });
    if (GameState.selected === tid) GameState.selected = GameState.owned[0];
    delete GameState.upgrades[tid];
    delete GameState.upgradesBought[tid];
    delete GameState.modules[tid];
    updateResources();
    renderCarousel();
    renderTree();
    saveProgress();
  }
}

// ========== §´§²§¦§¯§ª§²§°§£§¬§¡ ==========
function fillTrainNatSelect() {
  var s = document.getElementById('train-nat-select');
  if (!s) return;
  s.innerHTML = '';
  var nats = [];
  var keys = Object.keys(DB);
  for (var i = 0; i < keys.length; i++) {
    var n = DB[keys[i]].nat;
    if (nats.indexOf(n) === -1) nats.push(n);
  }
  for (var j = 0; j < nats.length; j++) {
    var o = document.createElement('option');
    o.value = nats[j];
    o.innerText = CONFIG.NATIONS[nats[j]] || nats[j];
    s.appendChild(o);
  }
}

function fillEnemySelect() {
  var nat = document.getElementById('train-nat-select').value;
  var s = document.getElementById('enemy-select');
  if (!s) return;
  s.innerHTML = '';
  var ids = Object.keys(DB).filter(function(id) { return DB[id].nat === nat; }).sort(function(a, b) { return DB[a].tier - DB[b].tier; });
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    var o = document.createElement('option');
    o.value = id;
    o.innerText = DB[id].n + ' [' + (CONFIG.TIER_ROMAN[DB[id].tier] || 'XI') + ']';
    s.appendChild(o);
  }
}

function toggleTraining() {
  var p = document.getElementById('training-panel');
  if (p) { p.style.display = p.style.display === 'none' ? 'block' : 'none'; }
}

// ========== §¬§¡§²§µ§³§¦§­§¾ §´§¡§¯§¬§°§£ ==========
function renderCarousel() {
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
    var isColl = t.collection || false;
    var isFlame = t.flame || false;
    var isMissile = t.missile || false;
    var isTitan = t.titan || false;
    var isDual = t.dualGun || false;
    var slot = document.createElement('div');
    slot.className = 'tank-slot';
    if (t.premium && !isColl) slot.className += ' premium-slot';
    if (isColl) slot.className += ' collection-slot';
    if (isFlame) slot.className += ' flame-slot';
    if (isTitan) slot.className += ' titan-slot';
    if (isDual) slot.className += ' dualgun-slot';
    if (isMissile) slot.style.borderColor = '#00ccff';
    if (GameState.selected === id) slot.className += ' selected';
    (function(tankId) {
      slot.onclick = function(e) {
        if (e.target.classList.contains('sell-btn')) return;
        GameState.selected = tankId;
        renderCarousel();
        renderTree();
      };
    })(id);
    var sb = document.createElement('button');
    sb.className = 'sell-btn';
    sb.innerText = '?';
    (function(tankId) {
      sb.onclick = function(e) { e.stopPropagation(); sellTank(tankId); };
    })(id);
    slot.appendChild(sb);
    if (isColl || isDual) {
      var bg = document.createElement('div');
      bg.className = 'coll-badge';
      if (isFlame) bg.className += ' flame-badge';
      if (isTitan) bg.className += ' titan-badge';
      if (isDual) bg.className += ' dualgun-badge';
      if (isMissile) bg.style.background = '#00ccff';
      bg.innerText = isFlame ? '??' : (isMissile ? '??' : (isTitan ? '??' : (isDual ? '??' : '¡ï')));
      slot.appendChild(bg);
    }
    var upg = GameState.upgrades[id];
    if (upg) {
      var total = (upg.gun || 0) + (upg.engine || 0) + (upg.turret || 0);
      if (total > 0) { var ui2 = document.createElement('div'); ui2.className = 'upg-indicator'; ui2.innerText = '??' + total; slot.appendChild(ui2); }
    }
    var mods = GameState.modules[id] || [null, null, null];
    var modCount = mods.filter(function(m) { return m; }).length;
    if (modCount > 0) { var mi = document.createElement('div'); mi.className = 'mod-indicator'; mi.innerText = '??+' + modCount; slot.appendChild(mi); }
    var wrap = document.createElement('div');
    wrap.className = 'slot-bg';
    var cv = document.createElement('canvas');
    cv.width = 140;
    cv.height = 80;
    drawTankIcon(cv, id);
    wrap.appendChild(cv);
    var info = document.createElement('div');
    info.className = 'slot-info';
    var tierEl = document.createElement('span');
    tierEl.className = 'slot-tier';
    tierEl.innerText = CONFIG.TIER_ROMAN[t.tier] || 'XI';
    var nameEl = document.createElement('span');
    nameEl.className = 'slot-name';
    if (isFlame) nameEl.style.color = '#ff4500';
    else if (isMissile) nameEl.style.color = '#00ccff';
    else if (isTitan) nameEl.style.color = '#4a8fb5';
    else if (isDual) nameEl.style.color = '#ffd700';
    else if (isColl) nameEl.style.color = getRarityColor(t.tier);
    nameEl.innerText = t.n;
    var clsEl = document.createElement('span');
    clsEl.className = 'slot-cls';
    clsEl.innerText = isFlame ? '??§°§´' : (isMissile ? '??§­§´' : (isTitan ? '??' + CONFIG.TANK_CLASSES[t.cls || 'mt'] : (isDual ? '??' + CONFIG.TANK_CLASSES[t.cls || 'mt'] : CONFIG.TANK_CLASSES[t.cls || 'mt'])));
    info.appendChild(tierEl);
    info.appendChild(nameEl);
    info.appendChild(clsEl);
    slot.appendChild(wrap);
    slot.appendChild(info);
    c.appendChild(slot);
  }
}

// ========== §ª§¬§°§¯§¬§¡ §´§¡§¯§¬§¡ ==========
function drawTankIcon(canvas, tankId) {
  var ctx2 = canvas.getContext('2d');
  var t = DB[tankId];
  if (!t) return;
  ctx2.clearRect(0, 0, canvas.width, canvas.height);
  ctx2.save();
  ctx2.translate(canvas.width / 2, canvas.height / 2);
  ctx2.scale(0.8, 0.8);
  var a = -Math.PI / 6;
  var s = t.s || 1;
  var bc = t.nc || '#666';
  if (t.flame) bc = '#ff4500';
  else if (t.missile) bc = '#00ccff';
  else if (t.titan) bc = '#4a8fb5';
  else if (t.dualGun) bc = '#8a8a8a';
  else if (t.collection) bc = getRarityColor(t.tier);
  else if (t.premium) bc = '#f39c12';
  ctx2.save();
  ctx2.rotate(a);
  ctx2.fillStyle = bc;
  var bW = t.isLong ? 80 : (t.dualGun ? 70 : 44);
  ctx2.fillRect(-bW / 2 * s, -14 * s, bW * s, 28 * s);
  ctx2.fillStyle = "#111";
  ctx2.fillRect(-bW / 2 * s - 2, -16 * s, (bW + 4) * s, 6 * s);
  ctx2.fillRect(-bW / 2 * s - 2, 10 * s, (bW + 4) * s, 6 * s);
  ctx2.restore();
  ctx2.save();
  var off = (t.off || 0) * s;
  ctx2.translate(Math.cos(a) * off, Math.sin(a) * off);
  ctx2.rotate(a);
  ctx2.fillStyle = bc;
  ctx2.filter = 'brightness(1.2)';
  var turSz = t.dualGun ? 14 : 10;
  ctx2.fillRect(-turSz * s, -turSz * s, turSz * 2 * s, turSz * 2 * s);
  ctx2.filter = 'none';
  if (t.flame) {
    ctx2.fillStyle = "#333";
    ctx2.fillRect(5 * s, -5 * s, 25 * s, 10 * s);
    ctx2.fillStyle = "#ff4500";
    ctx2.fillRect(28 * s, -4 * s, 6 * s, 8 * s);
  } else if (t.dualGun) {
    var gunLen = 35 * s;
    var gunW = 2.5 * s;
    var sp = 4 * s;
    ctx2.fillStyle = "#444";
    ctx2.fillRect(5 * s, -sp - gunW, gunLen, gunW * 2);
    ctx2.fillRect(5 * s, sp - gunW, gunLen, gunW * 2);
    ctx2.fillStyle = "#333";
    ctx2.fillRect(2 * s, -sp - gunW - 1, 5 * s, (sp + gunW) * 2 + 2);
  } else {
    ctx2.fillStyle = "#111";
    ctx2.fillRect(5 * s, -3 * s, 35 * s, 6 * s);
  }
  ctx2.restore();
  ctx2.restore();
}

// ========== §¥§¦§²§¦§£§° §²§¡§©§£§ª§´§ª§Á ==========
function renderTree() {
  var nodes = document.getElementById('nodes');
  var tc = document.getElementById('tree-canvas');
  if (!nodes || !tc) return;
  var ctx3 = tc.getContext('2d');
  var sc = nodeScale;
  nodes.innerHTML = '';
  ctx3.clearRect(0, 0, tc.width, tc.height);
  ctx3.strokeStyle = "#444";
  ctx3.lineWidth = 2 * sc;
  for (var id in DB) {
    var t = DB[id];
    if (t.nat !== GameState.curNat || t.collection) continue;
    var sx = t.x * sc;
    var sy = t.y * sc;
    if (t.p && DB[t.p] && !DB[t.p].collection) {
      ctx3.beginPath();
      ctx3.moveTo(DB[t.p].x * sc + 62 * sc, DB[t.p].y * sc + 24 * sc);
      ctx3.lineTo(sx, sy + 24 * sc);
      ctx3.stroke();
    }
    var div = document.createElement('div');
    div.className = 'node';
    if (GameState.owned.indexOf(id) !== -1) div.className += ' owned';
    if (GameState.selected === id) div.className += ' selected';
    if (t.premium) div.className += ' premium-glow';
    div.style.cssText = 'left:' + sx + 'px;top:' + sy + 'px;width:' + (120 * sc) + 'px;height:' + (48 * sc) + 'px;font-size:' + (9 * sc) + 'px';
    var cost = t.gold ? t.gold + 'G' : (t.xp !== undefined ? t.xp + 'XP' : '');
    var clsStr = CONFIG.TANK_CLASSES[t.cls || 'mt'] || '';
    var mag = t.mag && t.mag > 1 ? '??' + t.mag : '';
    var dualTag = t.dualGun ? '?? ' : '';
    div.innerHTML = '<b style="color:' + (t.premium ? '#f1c40f' : '#fff') + '">' + dualTag + (t.premium ? '¡ï ' : '') + t.n + '</b><br><span style="color:#f1c40f">[' + (CONFIG.TIER_ROMAN[t.tier] || 'XI') + ']</span> ' + clsStr + ' ' + mag + '<br>' + cost;
    (function(tankId, tankData) {
      div.onclick = function() {
        if (GameState.owned.indexOf(tankId) !== -1) { GameState.selected = tankId; }
        else if (tankData.gold) {
          if (GameState.GOLD >= tankData.gold) { GameState.GOLD -= tankData.gold; GameState.owned.push(tankId); GameState.selected = tankId; }
        } else if (tankData.xp !== undefined && GameState.XP >= tankData.xp && (!tankData.p || GameState.owned.indexOf(tankData.p) !== -1)) {
          GameState.XP -= tankData.xp;
          GameState.owned.push(tankId);
          GameState.selected = tankId;
        }
        renderTree();
        renderCarousel();
        updateResources();
        saveProgress();
      };
    })(id, t);
    nodes.appendChild(div);
  }
}

// ========== §´§¡§¢§­§ª§¸§¡ §¬§°§®§¡§¯§¥ ==========
function updateScoreboard() {
  var al = document.getElementById('allies-list');
  var en = document.getElementById('enemies-list');
  if (!al || !en) return;
  al.innerHTML = '<b>§³§°§À§©§¯§ª§¬§ª</b><br>';
  en.innerHTML = '<b>§£§²§¡§¤§ª</b><br>';
  for (var i = 0; i < GameState.units.length; i++) {
    var u = GameState.units[i];
    if (u.team === 'enemy' && !u.visible && !u.dead) continue;
    var mk = u.flame ? '??' : (u.missile ? '??' : (u.titan ? '??' : (u.dualGun ? '??' : (u.collection ? '¡ï' : ''))));
    var sp = '<span class="' + (u.dead ? 'dead' : '') + '">' + (CONFIG.TIER_ROMAN[u.tier] || 'XI') + '|' + mk + u.name + '</span><br>';
    if (u.team === 'enemy') en.innerHTML += sp;
    else al.innerHTML += sp;
  }
}

// ========== §´§¡§¢§­§ª§¸§¡ §­§ª§¥§¦§²§°§£ ==========
function showLeaderboard() {
  console.log('?? §°§ä§Ü§â§í§Ó§Ñ§Ö§Þ §ä§Ñ§Ò§Ý§Ú§è§å §Ý§Ú§Õ§Ö§â§à§Ó');
  var modal = document.getElementById('leaderboard-modal');
  if (modal) modal.classList.add('show');
  loadLeaderboard();
}

function hideLeaderboard() {
  var modal = document.getElementById('leaderboard-modal');
  if (modal) modal.classList.remove('show');
}

function switchLBTab(tab, btn) {
  document.querySelectorAll('.lb-tab').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.lb-content').forEach(function(c) { c.classList.remove('active-lb'); });
  var content = document.getElementById('lb-' + tab);
  if (content) content.classList.add('active-lb');
  if (tab === 'online') { loadOnlinePlayers(); }
}

async function loadLeaderboard() {
  console.log('?? §©§Ñ§Ô§â§å§Ø§Ñ§Ö§Þ §ä§Ñ§Ò§Ý§Ú§è§å §Ý§Ú§Õ§Ö§â§à§Ó');
  var listEl = document.getElementById('lb-global-list');
  if (!supabaseClient) {
    if (listEl) listEl.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">?? §¯§Ö§ä §ã§à§Ö§Õ§Ú§ß§Ö§ß§Ú§ñ</div>';
    return;
  }
  try {
    const result = await getLeaderboard(100);
    if (!result.success || !result.data || result.data.length === 0) {
      if (listEl) listEl.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">?? §±§à§Ü§Ñ §ß§Ú§Ü§à§Ô§à §ß§Ö§ä</div>';
      return;
    }
    var html = '';
    result.data.forEach(function(user, index) {
      var place = index + 1;
      var medal = '?';
      var medalClass = '';
      if (place === 1) { medal = '??'; medalClass = 'gold'; }
      else if (place === 2) { medal = '??'; medalClass = 'silver'; }
      else if (place === 3) { medal = '??'; medalClass = 'bronze'; }
      var isYou = currentUser && user.username === currentUser ? ' you' : '';
      var winRate = user.total_battles > 0 ? Math.round((user.total_wins / user.total_battles) * 100) : 0;
      html += '<div class="lb-row' + isYou + '">';
      html += '<div class="lb-row-rank ' + medalClass + '">' + medal + ' ' + place + '</div>';
      html += '<div class="lb-row-name"><span class="lb-row-name-icon">' + (isYou ? '??' : '??') + '</span><span>' + user.username + (isYou ? ' (§£§í)' : '') + '</span></div>';
      html += '<div class="lb-row-value lb-row-xp">' + user.xp.toLocaleString() + ' XP</div>';
      html += '<div class="lb-row-value">' + user.total_battles + '</div>';
      html += '<div class="lb-row-value">' + user.total_wins + ' (' + winRate + '%)</div>';
      html += '<div class="lb-row-value">' + user.total_kills + '</div>';
      html += '</div>';
    });
    if (listEl) listEl.innerHTML = html;
  } catch (error) {
    console.error('? §°§ê§Ú§Ò§Ü§Ñ §Ý§Ú§Õ§Ö§â§à§Ó:', error);
    if (listEl) listEl.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">§°§ê§Ú§Ò§Ü§Ñ</div>';
  }
}

async function loadOnlinePlayers() {
  console.log('?? §©§Ñ§Ô§â§å§Ø§Ñ§Ö§Þ §à§ß§Ý§Ñ§Û§ß §Ú§Ô§â§à§Ü§à§Ó');
  var onlineListEl = document.getElementById('lb-online-list');
  var emptyEl = document.getElementById('lb-online-empty');
  if (!supabaseClient) {
    if (onlineListEl) onlineListEl.innerHTML = '';
    if (emptyEl) { emptyEl.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">?? §°§ß§Ý§Ñ§Û§ß §ß§Ö§Õ§à§ã§ä§å§á§Ö§ß</div>'; emptyEl.style.display = 'block'; }
    return;
  }
  try {
    const result = await getOnlinePlayers();
    if (!result.success || !result.data || result.data.length === 0) {
      if (onlineListEl) onlineListEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (onlineListEl) onlineListEl.innerHTML = '';
    result.data.forEach(function(player) {
      var tank = DB[player.selected_tank];
      var tankName = tank ? tank.n : 'Unknown';
      var timeAgo = getTimeAgo(new Date(player.last_online));
      var card = document.createElement('div');
      card.className = 'online-card';
      card.innerHTML = '<div style="font-size:16px;margin-bottom:5px;">' + (tank && tank.nc ? '<span style="color:' + tank.nc + '">???</span>' : '??') + '</div>';
      card.innerHTML += '<div class="online-name"><span class="online-status"></span>' + player.username + '</div>';
      card.innerHTML += '<div class="online-tank">' + tankName + '</div>';
      card.innerHTML += '<div class="online-time">' + timeAgo + '</div>';
      if (onlineListEl) onlineListEl.appendChild(card);
    });
  } catch (error) {
    console.error('? §°§ê§Ú§Ò§Ü§Ñ §à§ß§Ý§Ñ§Û§ß:', error);
    if (emptyEl) emptyEl.style.display = 'block';
  }
}

function getTimeAgo(date) {
  var seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return '§´§à§Ý§î§Ü§à §é§ä§à';
  var minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + '§Þ §ß§Ñ§Ù§Ñ§Õ';
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + '§é §ß§Ñ§Ù§Ñ§Õ';
  var days = Math.floor(hours / 24);
  return days + '§Õ §ß§Ñ§Ù§Ñ§Õ';
}

// ========== §¿§¬§³§±§°§²§´ §£§³§¦§· §¶§µ§¯§¬§¸§ª§« ==========
window.crewMsg = crewMsg;
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
window.updateQuestUI = updateQuestUI;
window.claimQuestReward = claimQuestReward;
window.showPromo = showPromo;
window.hidePromo = hidePromo;
window.activatePromo = activatePromo;
window.sellTank = sellTank;
window.fillTrainNatSelect = fillTrainNatSelect;
window.fillEnemySelect = fillEnemySelect;
window.toggleTraining = toggleTraining;
window.renderCarousel = renderCarousel;
window.drawTankIcon = drawTankIcon;
window.renderTree = renderTree;
window.updateScoreboard = updateScoreboard;
window.showLeaderboard = showLeaderboard;
window.hideLeaderboard = hideLeaderboard;
window.switchLBTab = switchLBTab;
window.loadLeaderboard = loadLeaderboard;
window.loadOnlinePlayers = loadOnlinePlayers;
window.showContainerShop = showContainerShop;
window.hideContainerShop = hideContainerShop;
window.switchTab = switchTab;
window.openInventoryTab = openInventoryTab;
window.updateInvCount = updateInvCount;
window.collectReward = collectReward;

console.log('? ui.js §©§¡§¤§²§µ§¨§¦§¯§¡ §±§°§­§¯§°§³§´§¾§À!');