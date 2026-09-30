// js/features/ui-controls-ux.js
// 🎮 Интерфейс, Управление, Геймпады, Радиальное меню (Z), Тактическая миникарта (M), Избранное, Фоторежим (F)
console.log('🕹️ ui-controls-ux.js загружается...');

const UIEngine = {
  // 86. РАДИАЛЬНОЕ МЕНЮ БЫСТРЫХ КОМАНД (Radial Wheel - Z)
  quickCommands: [
    { text: 'Атакую!', icon: '⚔️', sound: 'hit' },
    { text: 'Нужна помощь!', icon: '🆘', sound: 'warning' },
    { text: 'За мной!', icon: '🏃', sound: 'engine' },
    { text: 'Перезаряжаюсь!', icon: '⏱️', sound: 'reload' },
    { text: 'Так точно!', icon: '👍', sound: 'victory' },
    { text: 'Никак нет!', icon: '👎', sound: 'hit' }
  ],

  radialOpen: false,

  toggleRadialMenu(show) {
    this.radialOpen = (typeof show === 'boolean') ? show : !this.radialOpen;
    const el = document.getElementById('radial-menu-overlay');
    if (el) el.style.display = this.radialOpen ? 'flex' : 'none';
  },

  sendQuickCommand(idx) {
    const cmd = this.quickCommands[idx];
    if (cmd) {
      if (typeof crewMsg === 'function') crewMsg(`📢 [Команда]: ${cmd.icon} ${cmd.text}`, '#00ffcc');
      this.toggleRadialMenu(false);
    }
  },

  // 91. ИЗБРАННЫЕ ТАНКИ (Favorites Pinning)
  toggleFavoriteTank(tankId) {
    if (!GameState.favoriteTanks) GameState.favoriteTanks = [];
    const idx = GameState.favoriteTanks.indexOf(tankId);
    if (idx === -1) {
      GameState.favoriteTanks.push(tankId);
    } else {
      GameState.favoriteTanks.splice(idx, 1);
    }
    if (typeof saveProgress === 'function') saveProgress();
    if (typeof renderTankCarousel === 'function') renderTankCarousel();
  },

  // 90. ФИЛЬТРАЦИЯ КАРУСЕЛИ (Nation, Tier, Class, Favorites)
  filterCarousel(tanksList, filters = {}) {
    return tanksList.filter(tId => {
      const t = DB[tId];
      if (!t) return false;
      if (filters.favOnly && (!GameState.favoriteTanks || !GameState.favoriteTanks.includes(tId))) return false;
      if (filters.nation && t.nat !== filters.nation) return false;
      if (filters.tier && t.tier !== filters.tier) return false;
      if (filters.type && t.type !== filters.type) return false;
      return true;
    });
  },

  // 92. ФОТОРЕЖИМ / FREECAM (F)
  photoModeActive: false,
  togglePhotoMode() {
    this.photoModeActive = !this.photoModeActive;
    const hud = document.getElementById('hud');
    if (hud) hud.style.opacity = this.photoModeActive ? '0' : '1';
    if (typeof crewMsg === 'function') {
      crewMsg(this.photoModeActive ? '📷 ФОТОРЕЖИМ ВКЛЮЧЕН (Нажмите F для выхода)' : '📷 Фоторежим выключен', '#ffd700');
    }
  },

  // 88. ПОДДЕРЖКА ГЕЙМПАДОВ (Gamepad Support)
  pollGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp) return;

    // Стики
    const axisX = gp.axes[0]; // левый стик X
    const axisY = gp.axes[1]; // левый стик Y
    if (GameState.player && GameState.gameActive) {
      if (Math.abs(axisY) > 0.2) {
        GameState.player.move(axisY < 0 ? 1 : -1);
      }
      if (Math.abs(axisX) > 0.2) {
        GameState.player.rotate(axisX * 0.05);
      }
      // RT / Кнопка A для стрельбы
      if (gp.buttons[0].pressed || (gp.buttons[7] && gp.buttons[7].pressed)) {
        GameState.player.shoot();
      }
    }
  },

  // 95. КИЛЛФИД (Dynamic Killfeed)
  addKillfeedEntry(killerName, victimName, weapon = '💥') {
    const feed = document.getElementById('killfeed-container');
    if (!feed) return;
    const entry = document.createElement('div');
    entry.className = 'killfeed-item';
    entry.innerHTML = `<span class="killer">${killerName}</span> <span class="weapon">${weapon}</span> <span class="victim">${victimName}</span>`;
    feed.appendChild(entry);
    setTimeout(() => { entry.remove(); }, 4500);
  }
};

window.UIEngine = UIEngine;
console.log('✅ ui-controls-ux.js полностью готов');
