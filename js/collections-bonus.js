// js/collections-bonus.js
// ========== КОЛЛЕКЦИОННЫЙ БОНУС ==========
console.log('🏅 collections-bonus.js загружен');

// Наборы вычисляются лениво при первой проверке (после того как COLLECTION_DB
// уже подмешан в DB через initContainers()).
var COLLECTION_SETS = null;

function buildCollectionSets() {
  COLLECTION_SETS = {};

  // По нациям (только коллекционные танки COLLECTION_DB, без MAUSKONIG-эксклюзива)
  for (var id in COLLECTION_DB) {
    var t = COLLECTION_DB[id];
    var key = 'nation_' + t.nat;
    COLLECTION_SETS[key] = COLLECTION_SETS[key] || { label: 'Коллекция: ' + (CONFIG.NATIONS[t.nat] || t.nat), tanks: [], reward: { gold: 300, badge: key } };
    COLLECTION_SETS[key].tanks.push(id);
  }

  // По сериям
  var series = { titan: 'Titan', flame: 'Огнемётная серия' };
  for (var s in series) {
    var ids = [];
    for (var id2 in COLLECTION_DB) {
      if (COLLECTION_DB[id2][s]) ids.push(id2);
    }
    if (ids.length > 0) {
      COLLECTION_SETS['series_' + s] = { label: 'Серия: ' + series[s], tanks: ids, reward: { gold: 500, badge: 'series_' + s } };
    }
  }
}

function checkCollectionBonuses() {
  if (!COLLECTION_SETS) buildCollectionSets();
  var newlyClaimed = [];

  for (var key in COLLECTION_SETS) {
    if (GameState.collectionBonusesClaimed.indexOf(key) !== -1) continue;
    var set = COLLECTION_SETS[key];
    var complete = set.tanks.every(function (id) { return GameState.owned.indexOf(id) !== -1; });
    if (complete) {
      GameState.collectionBonusesClaimed.push(key);
      if (set.reward.gold) GameState.GOLD += set.reward.gold;
      newlyClaimed.push(set);
      if (GameState.player) crewMsg('🏅 Коллекция собрана: ' + set.label + '! +' + set.reward.gold + 'G', '#f1c40f');
    }
  }

  if (newlyClaimed.length) { updateResources(); saveProgress(); }
  if (typeof renderCollectionBadges === 'function') renderCollectionBadges();
  return newlyClaimed;
}

// ========== РЕНДЕР ЗНАЧКОВ В ПРОФИЛЕ ==========
// Ожидает <div id="collection-badges"></div>
function renderCollectionBadges() {
  if (!COLLECTION_SETS) buildCollectionSets();
  var box = document.getElementById('collection-badges');
  if (!box) return;
  box.innerHTML = '';
  GameState.collectionBonusesClaimed.forEach(function (key) {
    var set = COLLECTION_SETS[key];
    if (!set) return;
    var b = document.createElement('span');
    b.style.cssText = 'display:inline-block;background:#1a1a2e;border:1px solid #f1c40f;color:#f1c40f;border-radius:12px;padding:4px 10px;margin:3px;font-size:11px';
    b.innerText = '🏅 ' + set.label;
    box.appendChild(b);
  });
}

window.checkCollectionBonuses = checkCollectionBonuses;
window.renderCollectionBadges = renderCollectionBadges;
