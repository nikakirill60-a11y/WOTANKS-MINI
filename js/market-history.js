// js/market-history.js
// ========== ИСТОРИЯ ЦЕН РЫНКА ==========
console.log('📈 market-history.js загружен');
// Ожидает таблицу Supabase 'market_history': id, item_type, item_id, price,
// currency, seller, buyer, sold_at (см. supabase-migration.sql). Заполняется
// автоматически из SocialSystem.buyOffer() при каждой продаже.

async function loadMarketHistory(itemId, itemType, limit) {
  if (!supabaseClient || !supabaseClient.from) return [];
  try {
    const { data, error } = await supabaseClient
      .from('market_history')
      .select('*')
      .eq('item_id', itemId)
      .eq('item_type', itemType)
      .order('sold_at', { ascending: false })
      .limit(limit || 30);
    if (error || !data) return [];
    return data;
  } catch (e) {
    console.error('⚠️ Ошибка загрузки истории цен:', e);
    return [];
  }
}

function ensureHistoryModal() {
  var modal = document.getElementById('price-history-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'price-history-modal';
  modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1500;justify-content:center;align-items:center;';
  modal.innerHTML =
    '<div style="background:#1a1a2e;border:2px solid #8e44ad;border-radius:10px;width:90%;max-width:480px;max-height:80vh;overflow-y:auto;padding:16px;box-shadow:0 0 30px rgba(142,68,173,0.4)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
        '<h3 style="color:#bb8fce;margin:0" id="price-history-title">📈 История цен</h3>' +
        '<button class="btn btn-sm" style="background:#e74c3c" onclick="document.getElementById(\'price-history-modal\').style.display=\'none\'">✕</button>' +
      '</div>' +
      '<div id="price-history-summary" style="color:#ccc;font-size:12px;margin-bottom:10px"></div>' +
      '<div id="price-history-chart" style="margin-bottom:10px"></div>' +
      '<div id="price-history-list" style="font-size:11px;color:#aaa"></div>' +
    '</div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.style.display = 'none'; });
  return modal;
}

async function showPriceHistory(itemId, itemType, displayName) {
  var modal = ensureHistoryModal();
  modal.style.display = 'flex';
  document.getElementById('price-history-title').innerText = '📈 История цен: ' + (displayName || itemId);
  document.getElementById('price-history-summary').innerText = 'Загрузка...';
  document.getElementById('price-history-chart').innerHTML = '';
  document.getElementById('price-history-list').innerHTML = '';

  var sales = await loadMarketHistory(itemId, itemType, 30);
  if (sales.length === 0) {
    document.getElementById('price-history-summary').innerText = 'Продаж этого предмета пока не было.';
    return;
  }

  var silverSales = sales.filter(function (s) { return s.currency !== 'gold'; });
  var goldSales = sales.filter(function (s) { return s.currency === 'gold'; });
  var summaryParts = [];
  [{ label: '₽', arr: silverSales }, { label: 'G', arr: goldSales }].forEach(function (grp) {
    if (grp.arr.length === 0) return;
    var prices = grp.arr.map(function (s) { return s.price; });
    var min = Math.min.apply(null, prices), max = Math.max.apply(null, prices);
    var avg = Math.round(prices.reduce(function (a, b) { return a + b; }, 0) / prices.length);
    summaryParts.push('Средняя: ' + avg + grp.label + ' (мин ' + min + grp.label + ' / макс ' + max + grp.label + ', ' + grp.arr.length + ' продаж)');
  });
  document.getElementById('price-history-summary').innerHTML = summaryParts.join('<br>');

  // Простой SVG-график по последним продажам (самые старые слева)
  var chartHost = document.getElementById('price-history-chart');
  var chartData = (silverSales.length >= goldSales.length ? silverSales : goldSales).slice(0, 15).reverse();
  if (chartData.length >= 2) {
    var w = 420, h = 100, pad = 10;
    var prices = chartData.map(function (s) { return s.price; });
    var min = Math.min.apply(null, prices), max = Math.max.apply(null, prices);
    var range = (max - min) || 1;
    var pts = chartData.map(function (s, i) {
      var x = pad + (i / (chartData.length - 1)) * (w - pad * 2);
      var y = h - pad - ((s.price - min) / range) * (h - pad * 2);
      return x + ',' + y;
    }).join(' ');
    var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:100px;background:#111;border-radius:6px">' +
      '<polyline points="' + pts + '" fill="none" stroke="#8e44ad" stroke-width="2"/>' +
      chartData.map(function (s, i) {
        var x = pad + (i / (chartData.length - 1)) * (w - pad * 2);
        var y = h - pad - ((s.price - min) / range) * (h - pad * 2);
        return '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#f1c40f"/>';
      }).join('') +
      '</svg>';
    chartHost.innerHTML = svg;
  }

  var listHtml = sales.slice(0, 15).map(function (s) {
    var d = new Date(s.sold_at).toLocaleDateString('ru-RU');
    return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #333">' +
      '<span>' + d + '</span><span style="color:' + (s.currency === 'gold' ? '#f1c40f' : '#bdc3c7') + '">' + s.price + (s.currency === 'gold' ? 'G' : '₽') + '</span></div>';
  }).join('');
  document.getElementById('price-history-list').innerHTML = listHtml;
}

window.loadMarketHistory = loadMarketHistory;
window.showPriceHistory = showPriceHistory;
