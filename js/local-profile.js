// One save per browser. Never serialize a running match or any account credentials.
const LOCAL_SAVE_KEY = 'ct_progress_v1';
const progressFields = Object.keys(initialProgress());
let canSaveProgress = false;
let lastSavedProgress = null;

function isProgressObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Restore known fields and their types. Empty objects are inventory maps keyed by tank/item ID.
function restoreField(fallback, value) {
  if (Array.isArray(fallback)) return Array.isArray(value) ? value : fallback;
  if (isProgressObject(fallback)) {
    if (!isProgressObject(value)) return fallback;
    const keys = Object.keys(fallback);
    if (!keys.length) return value;
    return Object.fromEntries(keys.map(key => [key, restoreField(fallback[key], value[key])]));
  }
  if (typeof fallback === 'number') return Number.isFinite(value) && value >= 0 ? value : fallback;
  return typeof value === typeof fallback ? value : fallback;
}

function readLegacyProgress() {
  function read(key) {
    const raw = localStorage.getItem(key);
    try { return JSON.parse(raw); } catch { return null; }
  }
  const users = read('ct_users');
  const accounts = isProgressObject(users) ? Object.values(users) : [];
  // On shared devices don't select an account or import shared reward flags into an empty garage.
  if (accounts.length !== 1 || !isProgressObject(accounts[0]?.data)) return {};
  return accounts[0].data;
}

function setSaveStatus(message, warning) {
  const status = document.getElementById('save-status');
  if (status.textContent !== message) status.textContent = message;
  status.classList.toggle('warning', warning);
}

// Only these vehicle identities have a different key in the original local saves.
// Never infer an unlock from a tier, equipment entry or a similarly named vehicle.
const oldTankKeys = Object.freeze({
  ST1:'STI', STRV21:'STRVFM21', PZ2:'PZII', SP1C:'SPIC', T1CUNN:'T1C', OB140:'OBJ140', RHMB:'RHMBWT',
  PZ4D:'PZIVD', VK30P:'VK3001P', VK36H:'VK3601H', TIGER1:'TIGERI', TIGER2:'TIGERII',
  VK100:'VK10001P', MAUSCH:'MAUSCHEN', T54O:'T54L'
});
function savedTankId(id) {
  if (typeof id !== 'string') return null;
  return Object.hasOwn(DB,id) ? id : Object.hasOwn(oldTankKeys,id) ? oldTankKeys[id] : null;
}

function loadProgress() {
  let raw;
  try {
    raw = localStorage.getItem(LOCAL_SAVE_KEY);
    const data = raw === null ? readLegacyProgress() : JSON.parse(raw);
    if (!isProgressObject(data)) throw new Error('Invalid save');
    const defaults = initialProgress();
    const restored = restoreField(defaults, data);
    restored.owned = [...new Set(restored.owned.map(savedTankId).filter(Boolean))];
    if (!restored.owned.length) restored.owned = defaults.owned;
    restored.selected = savedTankId(restored.selected);
    if (!restored.owned.includes(restored.selected)) restored.selected = restored.owned[0];
    if (!PLAYABLE_NATIONS.includes(data.curNat)) restored.curNat = DB[restored.selected].nat;
    // Only supported equipment on existing tanks survives migration.
    for (const key of ['modules', 'upgrades', 'upgradesBought']) {
      const entries = restored[key];
      restored[key] = Object.fromEntries(Object.entries(entries).flatMap(([id,v]) => {
        const canonical = savedTankId(id);
        return canonical && (id === canonical || !Object.hasOwn(entries,canonical)) ? [[canonical,v]] : [];
      }));
    }
    restored.settings.lookSensitivity = Math.max(.3, Math.min(2.5, restored.settings.lookSensitivity));
    restored.inventory = migrateSupplyBoxes(restored.inventory);
    Object.assign(GameState, restored);
    canSaveProgress = true;
    lastSavedProgress = raw;
  } catch {
    // Storage can be blocked (including for file://) or contain an unreadable save. Still allow play.
    // In particular, don't replace an unreadable save with a fresh one on the first autosave.
    canSaveProgress = false;
    setSaveStatus(raw ? 'Не удалось прочитать прогресс · без записи' : 'Хранилище недоступно · без сохранения', true);
  }
}

function saveProgress() {
  if (!canSaveProgress) return;
  try {
    const snapshot = JSON.stringify(Object.fromEntries(progressFields.map(key => [key, GameState[key]])));
    if (snapshot !== lastSavedProgress) {
      localStorage.setItem(LOCAL_SAVE_KEY, snapshot);
      lastSavedProgress = snapshot;
    }
    setSaveStatus('Сохранение в этом браузере', false);
  } catch {
    setSaveStatus('Не удалось сохранить прогресс', true);
  }
}

function startAutosave() {
  saveProgress();
  setInterval(saveProgress, 5000);
  window.addEventListener('pagehide', saveProgress);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveProgress();
  });
}
