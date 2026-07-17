// js/news.js
// ========== ЛЕНТА НОВОСТЕЙ В АНГАРЕ ==========
console.log('📰 news.js загружен');
// Таблица Supabase 'news': id (int8, автоинкремент), title, body, created_at

// Локальный фолбэк, если Supabase недоступен/таблица пуста
var NEWS_FALLBACK = [
  { id: 3, title: '🎖️ Боевой пропуск: Сезон 1', body: '30 уровней наград, три эксклюзивных танка в премиум-треке.', created_at: new Date().toISOString() },
  { id: 2, title: '🏪 Открыт внутриигровой рынок', body: 'Продавайте модули, бустеры, камуфляжи и коллекционные танки другим игрокам.', created_at: new Date().toISOString() },
  { id: 1, title: '🛡️ Новая боевая механика', body: 'Дифференцированное бронирование, разрушаемые здания, физика ландшафта и критические повреждения модулей.', created_at: new Date().toISOString() }
];

async function loadNews() {
  if (!supabaseClient || !supabaseClient.from) return NEWS_FALLBACK;
  try {
    const { data, error } = await supabaseClient.from('news').select('*').order('created_at', { ascending: false }).limit(20);
    if (error || !data || data.length === 0) return NEWS_FALLBACK;
    return data;
  } catch (e) {
    return NEWS_FALLBACK;
  }
}

// ========== РЕНДЕР (ожидает <div id="news-feed"></div>) ==========
async function renderNewsFeed() {
  var box = document.getElementById('news-feed');
  if (!box) return;
  box.innerHTML = 'Загрузка...';
  var news = await loadNews();
  box.innerHTML = '';

  var maxId = 0;
  news.forEach(function (n) {
    if (n.id > maxId) maxId = n.id;
    var item = document.createElement('div');
    item.style.cssText = 'background:#1a1a1a;border-left:3px solid #f1c40f;border-radius:4px;padding:8px 12px;margin-bottom:8px';
    var date = new Date(n.created_at).toLocaleDateString('ru-RU');
    item.innerHTML =
      '<div style="color:#f1c40f;font-weight:bold;font-size:13px">' + n.title + '</div>' +
      '<div style="color:#888;font-size:10px;margin:2px 0">' + date + '</div>' +
      '<div style="color:#ccc;font-size:12px">' + n.body + '</div>';
    box.appendChild(item);
  });

  GameState.newsLastSeenId = maxId;
  saveProgress();
  updateNewsBadge(0);
}

// ========== ЗНАЧОК НЕПРОЧИТАННЫХ (вызывать при входе в ангар) ==========
async function checkUnreadNews() {
  var news = await loadNews();
  var maxId = news.reduce(function (m, n) { return Math.max(m, n.id); }, 0);
  var unread = Math.max(0, maxId - (GameState.newsLastSeenId || 0));
  updateNewsBadge(unread);
  return unread;
}

function updateNewsBadge(count) {
  var badge = document.getElementById('news-badge');
  if (!badge) return;
  if (count > 0) { badge.style.display = 'inline-block'; badge.innerText = count; }
  else badge.style.display = 'none';
}

window.loadNews = loadNews;
window.renderNewsFeed = renderNewsFeed;
window.checkUnreadNews = checkUnreadNews;
