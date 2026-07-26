// js/settings.js
// ========== ПАНЕЛЬ НАСТРОЕК ==========
console.log('⚙️ settings.js загружен');
// GameState.settings = { volume: 0..1, showTracks: bool, lang: 'ru'|'en' }
// Значения по умолчанию и загрузка/сохранение — см. auth.js (loadProgress/saveProgress).

// Небольшой словарь для локализации интерфейса. Полный перевод всех текстов
// игры (сотни строк в HTML/JS) — отдельная большая задача; здесь переводится
// сама панель настроек и несколько ключевых элементов шапки, чтобы
// переключатель языка ощутимо на что-то влиял, и его легко расширять дальше.
const I18N = {
  ru: {
    settingsTitle: '⚙️ Настройки',
    volume: '🔊 Громкость звука',
    showTracks: '🛞 Следы гусениц',
    showTracksHint: 'Выключите на слабых устройствах для роста FPS',
    lang: '🌐 Язык интерфейса',
    close: 'Закрыть',
    xp: 'ОПЫТ', gold: 'ЗОЛОТО', silver: 'СЕРЕБРО'
  },
  en: {
    settingsTitle: '⚙️ Settings',
    volume: '🔊 Sound volume',
    showTracks: '🛞 Track marks',
    showTracksHint: 'Turn off on weak devices to improve FPS',
    lang: '🌐 Interface language',
    close: 'Close',
    xp: 'XP', gold: 'GOLD', silver: 'SILVER'
  }
};

function t(key) {
  var lang = (GameState.settings && GameState.settings.lang) || 'ru';
  return (I18N[lang] && I18N[lang][key]) || I18N.ru[key] || key;
}

// ========== ПРИМЕНЕНИЕ НАСТРОЕК ==========
function applySettings() {
  if (!GameState.settings) GameState.settings = { volume: 1, showTracks: true, lang: 'ru' };

  // Громкость — через мастер-гейн AudioSystem (см. audio.js)
  if (typeof AudioSystem !== 'undefined' && AudioSystem.setVolume) {
    AudioSystem.setVolume(GameState.settings.volume);
  }

  // Язык — обновляем документ и открытую панель настроек, если она видима
  document.documentElement.lang = GameState.settings.lang === 'en' ? 'en' : 'ru';
  renderSettingsPanel();
}

// ========== ХУК: СКРЫТИЕ СЛЕДОВ ГУСЕНИЦ ПРИ ОТРИСОВКЕ ==========
// Неинвазивно оборачиваем draw() — если showTracks выключен, на время
// отрисовки подменяем GameState.tracks на пустой массив (сама физика/лог
// следов в update() продолжает работать как обычно).
var settingsDrawHookPatched = false;
function patchSettingsDrawHook() {
  if (settingsDrawHookPatched) return;
  settingsDrawHookPatched = true;
  var origDraw = window.draw;
  if (typeof origDraw !== 'function') return;
  window.draw = function () {
    if (GameState.settings && GameState.settings.showTracks === false) {
      var saved = GameState.tracks;
      GameState.tracks = [];
      try { origDraw.apply(this, arguments); }
      finally { GameState.tracks = saved; }
    } else {
      origDraw.apply(this, arguments);
    }
  };
}
patchSettingsDrawHook();

// ========== UI ==========
function ensureSettingsModal() {
  var modal = document.getElementById('settings-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'settings-modal';
  modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1500;justify-content:center;align-items:center;';
  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) { if (e.target === modal) hideSettings(); });
  return modal;
}

function renderSettingsPanel() {
  var modal = document.getElementById('settings-modal');
  if (!modal || modal.style.display === 'none') return;
  buildSettingsHtml(modal);
}

function buildSettingsHtml(modal) {
  var s = GameState.settings || { volume: 1, showTracks: true, lang: 'ru' };
  modal.innerHTML =
    '<div style="background:#1a1a2e;border:2px solid #3498db;border-radius:10px;width:90%;max-width:420px;padding:18px;box-shadow:0 0 30px rgba(52,152,219,0.4)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
        '<h3 style="color:#3498db;margin:0">' + t('settingsTitle') + '</h3>' +
        '<button class="btn btn-sm" style="background:#e74c3c" onclick="hideSettings()">✕</button>' +
      '</div>' +

      '<div style="margin-bottom:16px">' +
        '<label style="color:#fff;font-size:13px;display:block;margin-bottom:6px">' + t('volume') + ': <span id="settings-volume-val">' + Math.round(s.volume * 100) + '%</span></label>' +
        '<input type="range" min="0" max="100" value="' + Math.round(s.volume * 100) + '" style="width:100%" oninput="setSettingVolume(this.value)">' +
      '</div>' +

      '<div style="margin-bottom:16px">' +
        '<label style="color:#fff;font-size:13px;display:flex;align-items:center;gap:8px;cursor:pointer">' +
          '<input type="checkbox" ' + (s.showTracks ? 'checked' : '') + ' onchange="setSettingTracks(this.checked)"> ' + t('showTracks') +
        '</label>' +
        '<div style="color:#888;font-size:10px;margin-top:2px">' + t('showTracksHint') + '</div>' +
      '</div>' +

      '<div style="margin-bottom:6px">' +
        '<label style="color:#fff;font-size:13px;display:block;margin-bottom:6px">' + t('lang') + '</label>' +
        '<select style="width:100%;padding:6px;background:#111;color:#fff;border:1px solid #555;border-radius:4px" onchange="setSettingLang(this.value)">' +
          '<option value="ru"' + (s.lang !== 'en' ? ' selected' : '') + '>Русский</option>' +
          '<option value="en"' + (s.lang === 'en' ? ' selected' : '') + '>English</option>' +
        '</select>' +
      '</div>' +
    '</div>';
}

function showSettings() {
  var modal = ensureSettingsModal();
  modal.style.display = 'flex';
  buildSettingsHtml(modal);
}

function hideSettings() {
  var modal = document.getElementById('settings-modal');
  if (modal) modal.style.display = 'none';
}

function setSettingVolume(v) {
  GameState.settings.volume = Math.max(0, Math.min(1, v / 100));
  var lbl = document.getElementById('settings-volume-val');
  if (lbl) lbl.innerText = Math.round(GameState.settings.volume * 100) + '%';
  if (typeof AudioSystem !== 'undefined' && AudioSystem.setVolume) AudioSystem.setVolume(GameState.settings.volume);
  if (typeof saveProgress === 'function') saveProgress();
}

function setSettingTracks(checked) {
  GameState.settings.showTracks = checked;
  if (typeof saveProgress === 'function') saveProgress();
}

function setSettingLang(lang) {
  GameState.settings.lang = lang;
  applySettings();
  if (typeof saveProgress === 'function') saveProgress();
}

window.applySettings = applySettings;
window.showSettings = showSettings;
window.hideSettings = hideSettings;
window.setSettingVolume = setSettingVolume;
window.setSettingTracks = setSettingTracks;
window.setSettingLang = setSettingLang;
