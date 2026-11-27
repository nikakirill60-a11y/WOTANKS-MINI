// The hangar guide and both combat selectors read the same profiles as Tank.fire().
const ShellUI = (() => {
  const el = id => document.getElementById(id), system = KPZ_CALIBRATION;
  function comparison(index) {
    const a = system.standard[index], b = system.calibrated[index];
    if (a === b) return [];
    const rows = [['Базовый урон', a.alpha, b.alpha]];
    if (a.ricochetDeg !== undefined) rows.push(
      ['Угол рикошета', a.ricochetDeg + '°', b.ricochetDeg + '°'],
      ['Нормализация', a.normalizationDeg + '°', b.normalizationDeg + '°']);
    if (a.lossPct !== undefined) rows.push(['Потеря пробития', a.lossPct + '%', b.lossPct + '%']);
    return rows;
  }
  const unchanged = 'На ОФ калибровка не влияет.';
  function guide() {
    const index = el('kpz-ammo').selectedIndex, rows = comparison(index);
    el('kpz-comparison').hidden = !rows.length;
    el('kpz-comparison').tBodies[0].replaceChildren(...rows.map(cells => {
      const tr = document.createElement('tr');
      for (const value of cells) tr.insertCell().textContent = value;
      return tr;
    }));
    el('kpz-ammo-note').textContent = index === 0 ? 'Рикошет проверяется до нормализации.' :
      index === 1 ? 'В CITY TANKS эта потеря применяется один раз при попадании в броню.' : unchanged;
  }
  function garage(tank) {
    const box = el('kpz-guide');
    box.hidden = tank?.weapon !== 'calibration';
    if (!box.hidden) guide();
    else box.open = false;
  }
  function status(p, now) {
    const c = p.calibration, busy = c.until !== null, btn = el('calibrate-btn');
    const state = busy ? (c.active ? 'Выход' : 'Вход') + ' · ' +
      (Math.ceil(Math.max(0, c.until - now) / 100) / 10).toFixed(1).replace('.', ',') + ' с' : c.active ? 'Вкл' : 'Выкл';
    if (el('calibration-state').textContent !== state) {
      el('calibration-state').textContent = state;
      el('calibration-controls').classList.toggle('calibrated', c.active);
      btn.setAttribute('aria-pressed', String(c.active));
      btn.disabled = busy;
    }
  }
  function select(index) {
    const p = GameState.player;
    if (!p || !Number.isInteger(index) || index < 0 || index > 2) return;
    if (p.usesMagazine || p.isSPG) index = 0;
    GameState.curShell = index;
    const rounds = p.calibration ? system.standard : CONFIG.SHELLS;
    for (const [selector, mobile] of [['.shell-opt', false], ['.m-shell', true]]) {
      document.querySelectorAll(selector).forEach((button, j) => {
        const name = rounds[j].name;
        button.textContent = mobile ? (name === 'Подкал' ? 'ПК' : name) : `${j + 1}:${name}`;
        button.classList.toggle('active', index === j);
        button.setAttribute('aria-pressed', String(index === j));
      });
    }
    el('calibration-controls').hidden = !p.calibration;
    if (p.calibration) {
      const rows = comparison(index);
      el('calibration-info-label').textContent = 'Параметры ' + rounds[index].name;
      const stats = el('calibration-stats');
      // All cells are local profile constants. Highlight the column in use, not merely the direction of the change.
      stats.innerHTML = rows.length ? '<small>Обычный → калибровка</small>' + rows.map(([name, a, b]) =>
        `<div><span>${name}:</span> <span><b>${a}</b> → <b>${b}</b></span></div>`).join('') : unchanged;
      status(p, BattleClock.now());
    }
  }
  function start(p) {
    el('calibration-info').open = GameState.controlMode !== 'mobile';
    select(p.calibration ? el('kpz-ammo').selectedIndex : GameState.curShell);
  }
  return { garage, guide, status, select, start };
})();

function setShell(i) { ShellUI.select(i); }
