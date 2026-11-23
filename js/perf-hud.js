// В локальном бою показываем частоту кадров. Сетевого пинга здесь нет.
let perfHud = null;
let perfSince = 0;
let perfFrames = 0;

function startPerfMonitor() {
  perfSince = performance.now();
  perfFrames = 0;
  perfHud = document.getElementById('perf-hud');
  perfHud.textContent = '— FPS';
  perfHud.style.display = 'block';
}

function countPerfFrame() {
  if (!perfHud) return;
  perfFrames++;
  const now = performance.now();
  if (now - perfSince < 500 || perfFrames < 2) return;
  const fps = Math.round(perfFrames * 1000 / (now - perfSince));
  perfHud.textContent = (fps || '< 1') + ' FPS';
  perfHud.style.color = fps >= 50 ? '#2ecc71' : fps >= 30 ? '#f1c40f' : '#e74c3c';
  perfFrames = 0;
  perfSince = now;
}

function stopPerfMonitor() {
  if (perfHud) perfHud.style.display = 'none';
  perfHud = null;
}
