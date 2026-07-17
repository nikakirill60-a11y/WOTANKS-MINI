// js/blueprints.js
// ========== СИСТЕМА ЧЕРТЕЖЕЙ ==========
console.log('📐 blueprints.js загружен');

// Фрагмент чертежа выпадает из контейнеров и из наград боевого пропуска.
function addBlueprintFragment(tankId, amount) {
  amount = amount || 1;
  var have = GameState.blueprints[tankId] || 0;
  var max = CONFIG.BLUEPRINTS_PER_TANK;
  have = Math.min(max, have + amount);
  GameState.blueprints[tankId] = have;

  if (have >= max && GameState.owned.indexOf(tankId) === -1 && DB[tankId] && !DB[tankId].collection) {
    // Чертёж собран полностью — танк исследуется бесплатно
    GameState.owned.push(tankId);
    GameState.blueprints[tankId] = 0;
    if (GameState.player) crewMsg('📐 Чертёж собран! ' + DB[tankId].n + ' открыт бесплатно!', '#2ecc71');
  }
  saveProgress();
  return GameState.blueprints[tankId];
}

// Скидка на XP-исследование танка от неполного чертежа (10% за фрагмент)
function getBlueprintDiscount(tankId) {
  var frags = GameState.blueprints[tankId] || 0;
  return Math.min(0.9, frags * CONFIG.BLUEPRINT_DISCOUNT_PER_FRAGMENT);
}

function getDiscountedXPCost(tankId, baseXpCost) {
  var discount = getBlueprintDiscount(tankId);
  return Math.ceil(baseXpCost * (1 - discount));
}

// ========== РЕНДЕР ПАНЕЛИ ЧЕРТЕЖЕЙ ==========
// Ожидает <div id="blueprints-grid"></div> в реальном Index.html
function renderBlueprintsGrid() {
  var grid = document.getElementById('blueprints-grid');
  if (!grid) return;
  grid.innerHTML = '';

  for (var id in GameState.blueprints) {
    var frags = GameState.blueprints[id];
    if (frags <= 0 || !DB[id]) continue;
    var card = document.createElement('div');
    card.style.cssText = 'background:#1a1a1a;border:1px solid #555;border-radius:6px;padding:8px;margin:4px;text-align:center;min-width:110px;display:inline-block';
    card.innerHTML =
      '<div style="color:#fff;font-weight:bold;font-size:12px">' + DB[id].n + '</div>' +
      '<div style="background:#333;border-radius:4px;height:8px;margin:4px 0"><div style="background:#3498db;height:100%;border-radius:4px;width:' + (frags / CONFIG.BLUEPRINTS_PER_TANK * 100) + '%"></div></div>' +
      '<div style="color:#3498db;font-size:11px">' + frags + '/' + CONFIG.BLUEPRINTS_PER_TANK + ' (-' + Math.round(getBlueprintDiscount(id) * 100) + '% XP)</div>';
    grid.appendChild(card);
  }
}

window.addBlueprintFragment = addBlueprintFragment;
window.getBlueprintDiscount = getBlueprintDiscount;
window.getDiscountedXPCost = getDiscountedXPCost;
window.renderBlueprintsGrid = renderBlueprintsGrid;
