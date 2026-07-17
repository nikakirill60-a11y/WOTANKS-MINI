// js/perf-hud.js
// ========== ИНДИКАТОР ПИНГА И FPS ==========
console.log('📊 perf-hud.js загружен');

var perfLastFrame = performance.now();
var perfFrameCount = 0;
var perfFps = 60;
var perfPing = null;
var perfPingTimer = null;

// ========== FPS: неинвазивный хук на gameLoop ==========
var perfHooksPatched = false;
function patchPerfHooks() {
  if (perfHooksPatched) return;
  perfHooksPatched = true;

  var origGameLoop = window.gameLoop;
  if (typeof origGameLoop === 'function') {
    window.gameLoop = function () {
      var now = performance.now();
      perfFrameCount++;
      if (now - perfLastFrame >= 500) {
        perfFps = Math.round((perfFrameCount * 1000) / (now - perfLastFrame));
        perfFrameCount = 0;
        perfLastFrame = now;
        renderPerfHud();
      }
      return origGameLoop.apply(this, arguments);
    };
  }
}

// ========== PING: лёгкий запрос к Supabase ==========
async function measurePing() {
  if (!supabaseClient || !supabaseClient.from) { perfPing = null; renderPerfHud(); return; }
  var t0 = performance.now();
  try {
    await supabaseClient.from('users').select('username').limit(1);
    perfPing = Math.round(performance.now() - t0);
  } catch (e) {
    perfPing = null;
  }
  renderPerfHud();
}

function startPerfMonitor() {
  patchPerfHooks();
  measurePing();
  clearInterval(perfPingTimer);
  perfPingTimer = setInterval(measurePing, 5000);
  var hud = document.getElementById('perf-hud');
  if (hud) hud.style.display = 'block';
}

function stopPerfMonitor() {
  clearInterval(perfPingTimer);
  var hud = document.getElementById('perf-hud');
  if (hud) hud.style.display = 'none';
}

// ========== РЕНДЕР (ожидает <div id="perf-hud"></div>) ==========
function renderPerfHud() {
  var hud = document.getElementById('perf-hud');
  if (!hud) return;
  var fpsColor = perfFps >= 50 ? '#2ecc71' : perfFps >= 30 ? '#f1c40f' : '#e74c3c';
  var pingText = perfPing === null ? '—' : perfPing + ' ms';
  var pingColor = perfPing === null ? '#888' : perfPing < 80 ? '#2ecc71' : perfPing < 180 ? '#f1c40f' : '#e74c3c';
  hud.innerHTML = '<span style="color:' + fpsColor + '">' + perfFps + ' FPS</span> · <span style="color:' + pingColor + '">' + pingText + '</span>';
}

window.startPerfMonitor = startPerfMonitor;
window.stopPerfMonitor = stopPerfMonitor;
