// Guest slot only. Cloud snapshots use the same field allowlist, never the guest slot. Never serialize a running match or any account credentials.
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
  VK100:'VK10001P', MAUSCH:'MAUSCHEN', T54O:'T54L', JPANTHER2:'JPANTHERII', T34_USA:'T34HEAVY',
  OB430II:'OBJ430II', OB430U:'OBJ430U', PANTHER2:'PANTHERII', GRILLE:'GRILLE15',
  STUG3:'STUG3G', JGPZ4:'JGPZIV', JPANTHER:'JAGDP', JAGTIGER:'JAGDTIGER', JGE100:'JGPZE100',
  T1HVY:'T1HEAVY', T57HVY:'T57HEAVY', M3YOH:'MIIIY', M5YOH:'MVY', M6YOH:'MVIY',
  M3STUART:'M3ST', M5STUART:'M5ST', CHAFFEE:'M24', XM551:'SHERIDAN',
  // Original T28 was the US TD; HELLCAT already denotes the tier-VI M18, never the new V.
  T28:'T28-US', T25AT:'T25-AT', T28PROT:'T28-PROTOTYPE',
  S85B:'SU85B', S85:'SU85', S100:'SU100', S152:'SU152', OB704:'OBJ704', OB268:'OBJ268',
  RENOTSU:'R-OTSU', CHIHA_JP:'CHI-HA', CHIHE:'CHI-HE', CHINU:'CHI-NU', CHITO:'CHI-TO', CHIRI:'CHI-RI',
  STA1:'STA-1', TYPE61:'TYPE-61', STB1:'STB-1', MITSU108:'MITSU-108', OI:'O-I', ONI:'O-NI', OHO:'O-HO',
  TYPE4:'TYPE-4-H', TYPE5:'TYPE-5-H',
  // R35 and AMX 13 90 from the old French tree are not Renault FT or B-C 12 t.
  AMX38:'AMX-38', SAU40:'SAU-40', S35CA:'S35-CA', ARLV39:'ARL-V39', AC46:'AMX-AC-46', AC48:'AMX-AC-48', FOCH155:'FOCH-155',
  BDRG1B:'BDR-G1-B', ARL44:'ARL-44', AMXM445:'AMX-M4-45', AMX50100:'AMX-50-100', AMX50120:'AMX-50-120', AMX50B:'AMX-50-B',
  AMX65T:'AMX-65-T', AMXM451:'AMX-M4-51', AMXM454:'AMX-M4-54', AMXELC:'AMX-ELC-BIS', AMX12T:'AMX-12-T', AMX1375:'AMX-13-75',
  BC25TAP:'B-C-25-T-AP', BC25T:'B-C-25-T',
  // OB263 in the original saves was X after S12254, never the new IX after SU-101.
  S100M1:'SU-100M1', S101:'SU-101', S12254:'SU-122-54', OB263:'OBJ-263-X',
  VK30D:'VK-3001-D', VK30D2:'VK-3002-D', INDIEN:'INDIEN-PZ', LEOPA:'LEOPARD-PT-A', LEO1:'LEOPARD-1',
  VK45A:'VK-4502-A', VK45B:'VK-4502-B', VK72:'VK-7201-K'
});
function savedTankId(id) {
  if (typeof id !== 'string') return null;
  return Object.hasOwn(DB,id) ? id : Object.hasOwn(oldTankKeys,id) ? oldTankKeys[id] : null;
}

function decodeProgress(data) {
  if (!isProgressObject(data)) throw new Error('Invalid save');
  const defaults = initialProgress();
  const restored = restoreField(defaults, data);
  restored.owned = [...new Set(restored.owned.map(savedTankId).filter(Boolean))];
  // An explicitly sold last tank is not a new/corrupt profile. Never respawn it on reload.
  const savedEmpty = Array.isArray(data.owned) && !data.owned.length && data.selected === null;
  if (!restored.owned.length && !savedEmpty) restored.owned = defaults.owned;
  restored.selected = savedTankId(data.selected);
  HangarSlots.restore(restored, !Object.hasOwn(data, 'rentalBattles'));
  // Pre-1.4.2 tracked possession, not sales. A surviving research vehicle proves
  // its prerequisite path, never a sibling, special vehicle or unrecorded sold leaf.
  const known = new Set((Array.isArray(data.researched) ? data.researched : []).map(savedTankId)
    .filter(id => id && !DB[id].source));
  for (let id of restored.owned) if (!DB[id].source && !restored.rentalBattles[id]) {
    known.add(id);
    if (!Array.isArray(data.researched)) while ((id=researchParent(id))) known.add(id);
  }
  restored.researched = [...known];
  if (!PLAYABLE_NATIONS.includes(data.curNat)) {
    const nat = DB[restored.selected]?.nat;
    restored.curNat = PLAYABLE_NATIONS.includes(nat) ? nat : defaults.curNat;
  }
  restored.advent2026.dates = [...new Set(restored.advent2026.dates.filter(d =>
    typeof d === 'string' && /^2026-12-(0[1-9]|[12][0-9]|3[01])$/.test(d)))].sort();
  // Only supported equipment on existing tanks survives migration.
  for (const key of ['modules', 'upgrades', 'upgradesBought']) {
    const entries = restored[key];
    restored[key] = Object.fromEntries(Object.entries(entries).flatMap(([id,v]) => {
      const canonical = savedTankId(id);
      return canonical && (id === canonical || !Object.hasOwn(entries,canonical)) ? [[canonical,v]] : [];
    }));
  }
  restored.settings.lookSensitivity = Math.max(.3, Math.min(2.5, restored.settings.lookSensitivity));
  // Retired currency + unopened stock (including its older alias), atomically
  // folded into the balance. None of these keys is in the migrated snapshot.
  for (const count of [data.charges,restored.inventory.supply,restored.inventory.waffentrager])
    if (Number.isSafeInteger(count) && count>0) restored.GOLD=Math.min(Number.MAX_SAFE_INTEGER,restored.GOLD+100*count);
  restored.inventory = migrateSupplyBoxes(restored.inventory);
  restored.tree2026 = TreeEvent.counts(restored.tree2026);
  restored.treeSlots2026 = TreeEvent.restoreSlots(restored.treeSlots2026, restored.tree2026);
  // The module UI expects arrays, not arbitrary nested save data.
  for (const [id, slots] of Object.entries(restored.modules)) {
    if (!Array.isArray(slots)) { delete restored.modules[id]; continue; }
    restored.modules[id] = slots.slice(0,3).map(k => Object.hasOwn(CONFIG.MODULES,k) ? k : null);
  }
  for (const [id, levels] of Object.entries(restored.upgrades)) {
    restored.upgrades[id] = Object.fromEntries(Object.keys(CONFIG.UPGRADES).filter(k =>
      Number.isInteger(levels?.[k]) && levels[k] >= 0 && levels[k] < CONFIG.UPGRADES[k].length).map(k => [k,levels[k]]));
  }
  for (const [id, flags] of Object.entries(restored.upgradesBought)) {
    restored.upgradesBought[id] = Object.fromEntries(Object.keys(CONFIG.UPGRADES).map(k =>
      [k, CONFIG.UPGRADES[k].map((_,i) => i===0 || flags?.[k]?.[i] === true)]));
  }
  return restored;
}

function progressSnapshot() {
  return JSON.stringify(Object.fromEntries(progressFields.map(key => [key, GameState[key]])));
}

function loadProgress() {
  Object.assign(GameState, initialProgress());
  let raw;
  try {
    raw = localStorage.getItem(LOCAL_SAVE_KEY);
    const data = raw === null ? readLegacyProgress() : JSON.parse(raw);
    Object.assign(GameState, decodeProgress(data));
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
  if (Accounts.active) { Accounts.capture(); return; }
  if (!canSaveProgress) return;
  try {
    const snapshot = progressSnapshot();
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
