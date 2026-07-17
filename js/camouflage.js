// js/camouflage.js
// ========== КАМУФЛЯЖИ ==========
console.log('🎨 camouflage.js загружен');

function buyCamo(camoId) {
  var camo = CONFIG.CAMOS[camoId];
  if (!camo) return { success: false, error: 'Нет такого камуфляжа' };
  if (GameState.camos[camoId]) return { success: false, error: 'Уже куплен' };

  if (camo.currency === 'gold') {
    if (GameState.GOLD < camo.cost) return { success: false, error: 'Недостаточно золота' };
    GameState.GOLD -= camo.cost;
  } else {
    if (GameState.SILVER < camo.cost) return { success: false, error: 'Недостаточно серебра' };
    GameState.SILVER -= camo.cost;
  }

  GameState.camos[camoId] = true;
  updateResources();
  saveProgress();
  return { success: true };
}

function equipCamo(tankId, camoId) {
  if (camoId && !GameState.camos[camoId]) return { success: false, error: 'Камуфляж не куплен' };
  if (camoId) {
    GameState.equippedCamo[tankId] = camoId;
  } else {
    delete GameState.equippedCamo[tankId];
  }
  saveProgress();
  return { success: true };
}

// ========== РЕНДЕР МАГАЗИНА КАМУФЛЯЖЕЙ ==========
// Ожидает контейнер <div id="camo-grid"></div> в реальном Index.html
function renderCamoShop() {
  var grid = document.getElementById('camo-grid');
  if (!grid) return;
  grid.innerHTML = '';

  for (var id in CONFIG.CAMOS) {
    (function (camoId) {
      var c = CONFIG.CAMOS[camoId];
      var owned = !!GameState.camos[camoId];
      var equipped = GameState.equippedCamo[GameState.selected] === camoId;
      var card = document.createElement('div');
      card.className = 'camo-card' + (equipped ? ' equipped' : '');
      card.style.cssText = 'border:2px solid ' + c.color + ';background:#1a1a1a;border-radius:8px;padding:10px;text-align:center;cursor:pointer;';
      card.innerHTML =
        '<div style="font-size:28px">' + c.icon + '</div>' +
        '<div style="color:#fff;font-weight:bold;margin:4px 0">' + c.name + '</div>' +
        '<div style="color:#2ecc71;font-size:11px">+' + Math.round(c.camoBonus * 100) + '% маскировка</div>' +
        (owned
          ? '<div style="color:' + (equipped ? '#f1c40f' : '#aaa') + ';font-size:12px;margin-top:4px">' + (equipped ? '✅ Надет' : 'Нажмите, чтобы надеть') + '</div>'
          : '<div style="color:' + (c.currency === 'gold' ? '#f1c40f' : '#bdc3c7') + ';font-size:12px;margin-top:4px">' + c.cost + (c.currency === 'gold' ? ' G' : ' ₽') + '</div>');

      card.onclick = function () {
        if (!owned) {
          var res = buyCamo(camoId);
          if (!res.success) { alert(res.error); return; }
        }
        equipCamo(GameState.selected, equipped ? null : camoId);
        renderCamoShop();
      };
      grid.appendChild(card);
    })(id);
  }
}

window.buyCamo = buyCamo;
window.equipCamo = equipCamo;
window.renderCamoShop = renderCamoShop;
