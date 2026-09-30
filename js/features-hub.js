// js/features-hub.js
// 🌐 Глобальный координатор всех 100 фич: Интеграция с Supabase, UI, Хоткеи, Модальные окна
console.log('🌟 features-hub.js загружается...');

const FeaturesHub = {
  init() {
    console.log('🚀 Инициализация FeaturesHub (100 Фич)...');
    this.injectStyles();
    this.injectModals();
    this.injectBattleHUD();
    this.bindKeyboardShortcuts();
    this.startAutoSyncLoop();
    this.startLiveActivityTicker();
    console.log('✅ FeaturesHub готов к работе!');
  },

  // 1. АВТОСИНХРОНИЗАЦИЯ С SUPABASE КАЖДЫЕ 30 СЕКУНД
  startAutoSyncLoop() {
    setInterval(() => {
      if (typeof SupabaseFeatures !== 'undefined' && SupabaseFeatures.autoCloudSync) {
        SupabaseFeatures.autoCloudSync();
      }
    }, 30000);
  },

  // 14. ЖИВАЯ БЕГУЩАЯ СТРОКА СОБЫТИЙ СЕРВЕРА
  startLiveActivityTicker() {
    const ticker = document.getElementById('live-activity-ticker');
    if (!ticker) return;
    const events = SupabaseFeatures.getLiveServerEvents();
    let idx = 0;
    setInterval(() => {
      if (events.length > 0) {
        ticker.innerHTML = `📢 <b>Сервер:</b> ${events[idx % events.length].text} <span style="color:#888">(${events[idx % events.length].time})</span>`;
        idx++;
      }
    }, 6000);
  },

  // СТИЛИ ДЛЯ ВСЕХ 100 НОВЫХ ЭЛЕМЕНТОВ
  injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.id = 'features-hub-styles';
    styleEl.innerHTML = `
      /* Топ бар и лента событий */
      #live-activity-ticker {
        background: linear-gradient(90deg, rgba(20,20,30,0.95), rgba(40,40,60,0.95));
        border-bottom: 1px solid #00e5ff;
        color: #fff;
        padding: 6px 15px;
        font-size: 13px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .extra-top-btns {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .btn-feature {
        background: #2c3e50;
        color: #fff;
        border: 1px solid #4a69bd;
        padding: 5px 10px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 12px;
        cursor: pointer;
        transition: 0.2s;
      }
      .btn-feature:hover {
        background: #34495e;
        border-color: #00e5ff;
        box-shadow: 0 0 8px rgba(0,229,255,0.4);
      }

      /* Модальные окна */
      .f-modal {
        display: none;
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        z-index: 9999;
        justify-content: center;
        align-items: center;
      }
      .f-modal-content {
        background: #1a1a24;
        border: 2px solid #00e5ff;
        border-radius: 8px;
        width: 90%;
        max-width: 780px;
        max-height: 85vh;
        overflow-y: auto;
        padding: 20px;
        color: #fff;
        box-shadow: 0 0 25px rgba(0, 229, 255, 0.3);
      }
      .f-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #333;
        padding-bottom: 10px;
        margin-bottom: 15px;
      }
      .f-close-btn {
        background: #e74c3c;
        border: none;
        color: #fff;
        font-size: 16px;
        font-weight: bold;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
      }

      /* Боевой HUD для снарядов и снаряжения */
      #hud-ammo-panel {
        position: absolute;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        z-index: 100;
        background: rgba(10, 15, 25, 0.75);
        padding: 6px 12px;
        border-radius: 6px;
        border: 1px solid #00e5ff;
      }
      .shell-btn {
        background: #1e272e;
        border: 1px solid #576574;
        color: #fff;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: 11px;
        min-width: 55px;
      }
      .shell-btn.active {
        background: #00d2d3;
        color: #000;
        border-color: #fff;
        font-weight: bold;
      }
      #sixth-sense-icon {
        display: none;
        position: absolute;
        top: 25%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 64px;
        animation: pulseBulb 0.6s infinite alternate;
        z-index: 200;
      }
      #sixth-sense-icon.active { display: block; }
      @keyframes pulseBulb {
        from { transform: translate(-50%, -50%) scale(0.9); opacity: 0.7; }
        to { transform: translate(-50%, -50%) scale(1.2); opacity: 1; filter: drop-shadow(0 0 15px #ffcc00); }
      }

      /* Киллфид */
      #killfeed-container {
        position: absolute;
        top: 60px;
        right: 15px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        z-index: 100;
        pointer-events: none;
      }
      .killfeed-item {
        background: rgba(0, 0, 0, 0.75);
        border-left: 3px solid #ff4757;
        padding: 4px 10px;
        border-radius: 3px;
        font-size: 12px;
        color: #fff;
      }
      .killfeed-item .killer { color: #2ed573; font-weight: bold; }
      .killfeed-item .victim { color: #ff6b81; font-weight: bold; }

      /* Радиальное меню Z */
      #radial-menu-overlay {
        display: none;
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 9000;
        justify-content: center;
        align-items: center;
      }
      .radial-grid {
        display: grid;
        grid-template-columns: repeat(3, 110px);
        gap: 12px;
      }
      .radial-item {
        background: #1e272e;
        border: 2px solid #00e5ff;
        color: #fff;
        padding: 15px 5px;
        text-align: center;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        font-size: 13px;
      }
      .radial-item:hover {
        background: #00e5ff;
        color: #000;
      }
    `;
    document.head.appendChild(styleEl);
  },

  // ВСТАВКА МОДАЛЬНЫХ ОКОН ДЛЯ СИСТЕМ
  injectModals() {
    const modalsHtml = `
      <!-- Бегущая строка -->
      <div id="live-activity-ticker">📢 Загрузка ленты событий сервера...</div>

      <!-- Модалка Кланов -->
      <div id="modal-clans" class="f-modal">
        <div class="f-modal-content">
          <div class="f-modal-header">
            <h2>🛡️ КЛАНОВАЯ СИСТЕМА (SUPABASE)</h2>
            <button class="f-close-btn" onclick="FeaturesHub.closeModal('modal-clans')">✖</button>
          </div>
          <div id="clans-content">Загрузка данных кланов...</div>
        </div>
      </div>

      <!-- Модалка Почты -->
      <div id="modal-mailbox" class="f-modal">
        <div class="f-modal-content">
          <div class="f-modal-header">
            <h2>📬 ПОЧТОВЫЙ ЯЩИК И НАГРАДЫ</h2>
            <button class="f-close-btn" onclick="FeaturesHub.closeModal('modal-mailbox')">✖</button>
          </div>
          <div id="mailbox-content">Загрузка писем...</div>
        </div>
      </div>

      <!-- Модалка Мирового Босса -->
      <div id="modal-worldboss" class="f-modal">
        <div class="f-modal-content">
          <div class="f-modal-header">
            <h2>👹 ГЛОБАЛЬНЫЙ МИРОВОЙ БОСС: ЛЕВИАФАН</h2>
            <button class="f-close-btn" onclick="FeaturesHub.closeModal('modal-worldboss')">✖</button>
          </div>
          <div id="worldboss-content">Загрузка состояния рейда...</div>
        </div>
      </div>

      <!-- Модалка Рейтинга / Лиг -->
      <div id="modal-ranked" class="f-modal">
        <div class="f-modal-content">
          <div class="f-modal-header">
            <h2>🏅 РЕЙТИНГОВАЯ ЛИГА И ТИТУЛЫ</h2>
            <button class="f-close-btn" onclick="FeaturesHub.closeModal('modal-ranked')">✖</button>
          </div>
          <div id="ranked-content">Загрузка лиги...</div>
        </div>
      </div>

      <!-- Модалка 30-дневного Календаря -->
      <div id="modal-calendar" class="f-modal">
        <div class="f-modal-content">
          <div class="f-modal-header">
            <h2>📅 30-ДНЕВНЫЙ КАЛЕНДАРЬ НАГРАД</h2>
            <button class="f-close-btn" onclick="FeaturesHub.closeModal('modal-calendar')">✖</button>
          </div>
          <div id="calendar-content">Загрузка календаря...</div>
        </div>
      </div>

      <!-- Модалка Колеса Фортуны -->
      <div id="modal-wheel" class="f-modal">
        <div class="f-modal-content" style="text-align:center;">
          <div class="f-modal-header">
            <h2>🎡 КОЛЕСО ФОРТУНЫ</h2>
            <button class="f-close-btn" onclick="FeaturesHub.closeModal('modal-wheel')">✖</button>
          </div>
          <div style="font-size:64px;margin:20px 0;">🎡</div>
          <button class="btn" style="background:#f39c12;font-size:18px;padding:12px 24px;" onclick="FeaturesHub.spinWheelAction()">КРУТИТЬ ЗА 100 🪙</button>
          <div id="wheel-result" style="margin-top:20px;font-size:16px;font-weight:bold;color:#00ffcc;"></div>
        </div>
      </div>

      <!-- Модалка Сейфов -->
      <div id="modal-vaults" class="f-modal">
        <div class="f-modal-content">
          <div class="f-modal-header">
            <h2>🏦 СЕЙФЫ ЗОЛОТА И СЕРЕБРА</h2>
            <button class="f-close-btn" onclick="FeaturesHub.closeModal('modal-vaults')">✖</button>
          </div>
          <div id="vaults-content">Загрузка сейфов...</div>
        </div>
      </div>

      <!-- Модалка Спец. Режимов -->
      <div id="modal-special-modes" class="f-modal">
        <div class="f-modal-content">
          <div class="f-modal-header">
            <h2>🎮 СПЕЦИАЛЬНЫЕ РЕЖИМЫ СРАЖЕНИЙ</h2>
            <button class="f-close-btn" onclick="FeaturesHub.closeModal('modal-special-modes')">✖</button>
          </div>
          <div id="special-modes-content">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <button class="btn" style="background:#8e44ad;padding:15px;" onclick="SpecialModes.setMode('mad_games');startBattle(7);FeaturesHub.closeModal('modal-special-modes');">⚡ MAD GAMES (Закись + Хамелеон)</button>
              <button class="btn" style="background:#2980b9;padding:15px;" onclick="SpecialModes.setMode('gravity');startBattle(7);FeaturesHub.closeModal('modal-special-modes');">🌕 ГРАВИТАЦИЯ (Полеты + Отдача)</button>
              <button class="btn" style="background:#c0392b;padding:15px;" onclick="SpecialModes.setMode('boss_rush');startBattle(7);FeaturesHub.closeModal('modal-special-modes');">👹 БОСС-РАШ (Волны ботов)</button>
              <button class="btn" style="background:#d35400;padding:15px;" onclick="SpecialModes.setMode('gun_game');startBattle(7);FeaturesHub.closeModal('modal-special-modes');">🔫 ОРУЖЕЙНАЯ ГОНКА (Прокачка за килл)</button>
              <button class="btn" style="background:#27ae60;padding:15px;" onclick="SpecialModes.initPolygon();FeaturesHub.closeModal('modal-special-modes');">🎯 ТРЕНИРОВОЧНЫЙ ПОЛИГОН</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Радиальное меню Z -->
      <div id="radial-menu-overlay" onclick="FeaturesHub.closeRadial(event)">
        <div class="radial-grid">
          <div class="radial-item" onclick="UIEngine.sendQuickCommand(0)">⚔️ Атакую!</div>
          <div class="radial-item" onclick="UIEngine.sendQuickCommand(1)">🆘 Помощь!</div>
          <div class="radial-item" onclick="UIEngine.sendQuickCommand(2)">🏃 За мной!</div>
          <div class="radial-item" onclick="UIEngine.sendQuickCommand(3)">⏱️ КД!</div>
          <div class="radial-item" onclick="UIEngine.sendQuickCommand(4)">👍 Так точно!</div>
          <div class="radial-item" onclick="UIEngine.sendQuickCommand(5)">👎 Отмена!</div>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = modalsHtml;
    document.body.appendChild(container);

    // Добавление кнопок в гараж
    const topBtns = document.querySelector('.top-btns');
    if (topBtns) {
      const extraDiv = document.createElement('div');
      extraDiv.className = 'extra-top-btns';
      extraDiv.innerHTML = `
        <button class="btn-feature" onclick="FeaturesHub.openClans()">🛡️ КЛАНЫ</button>
        <button class="btn-feature" onclick="FeaturesHub.openMailbox()">📬 ПОЧТА</button>
        <button class="btn-feature" onclick="FeaturesHub.openWorldBoss()">👹 БОСС-РЕЙД</button>
        <button class="btn-feature" onclick="FeaturesHub.openRanked()">🏅 ЛИГА</button>
        <button class="btn-feature" onclick="FeaturesHub.openCalendar()">📅 НАГРАДЫ</button>
        <button class="btn-feature" onclick="FeaturesHub.openWheel()">🎡 КОЛЕСО</button>
        <button class="btn-feature" onclick="FeaturesHub.openVaults()">🏦 СЕЙФЫ</button>
        <button class="btn-feature" style="background:#e67e22;" onclick="FeaturesHub.openSpecialModes()">🔥 РЕЖИМЫ</button>
      `;
      topBtns.parentElement.appendChild(extraDiv);
    }
  },

  // БОЕВОЙ HUD (Снаряды, Лампочка, Киллфид)
  injectBattleHUD() {
    const hud = document.getElementById('hud');
    if (!hud) return;

    const ammoPanel = document.createElement('div');
    ammoPanel.id = 'hud-ammo-panel';
    ammoPanel.innerHTML = `
      <div id="ammo-selector-bar" style="display:flex;gap:6px;"></div>
      <div style="border-left:1px solid #555;margin:0 4px;"></div>
      <button class="shell-btn" onclick="CombatMechanics.useRepairKit(GameState.player)"><span>🔧</span><span>[4] Рем</span></button>
      <button class="shell-btn" onclick="CombatMechanics.useMedkit(GameState.player)"><span>💊</span><span>[5] Апт</span></button>
      <button class="shell-btn" onclick="CombatMechanics.deploySmokeScreen(GameState.player)"><span>💨</span><span>[6] Дым</span></button>
      <button class="shell-btn" onclick="CombatMechanics.callArtilleryStrike(GameState.player.x, GameState.player.y)"><span>🎯</span><span>[7] Арта</span></button>
    `;
    hud.appendChild(ammoPanel);

    const bulb = document.createElement('div');
    bulb.id = 'sixth-sense-icon';
    bulb.innerText = '💡';
    hud.appendChild(bulb);

    const killfeed = document.createElement('div');
    killfeed.id = 'killfeed-container';
    hud.appendChild(killfeed);

    CombatMechanics.renderAmmoBar();
  },

  // ГОРЯЧИЕ КЛАВИШИ
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (!GameState.gameActive) return;
      if (e.key === '1') CombatMechanics.setShellType('AP');
      if (e.key === '2') CombatMechanics.setShellType('APCR');
      if (e.key === '3') CombatMechanics.setShellType('HEAT');
      if (e.key === '4') CombatMechanics.useRepairKit(GameState.player);
      if (e.key === '5') CombatMechanics.useMedkit(GameState.player);
      if (e.key === '6') CombatMechanics.deploySmokeScreen(GameState.player);
      if (e.key === '7') CombatMechanics.callArtilleryStrike(GameState.player.x, GameState.player.y);
      if (e.key === 'z' || e.key === 'Z' || e.key === 'я' || e.key === 'Я') UIEngine.toggleRadialMenu();
      if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') UIEngine.togglePhotoMode();
      if (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') CustomizationEngine.playHorn();
    });
  },

  // МОДАЛЬНЫЕ ОКНА: ОТКРЫТИЕ И РЕНДЕРИНГ
  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  },
  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  },
  closeRadial(e) {
    if (e.target.id === 'radial-menu-overlay') {
      UIEngine.toggleRadialMenu(false);
    }
  },

  async openClans() {
    this.openModal('modal-clans');
    const container = document.getElementById('clans-content');
    const clans = await SupabaseFeatures.getClansList();
    container.innerHTML = `
      <div style="margin-bottom:15px;display:flex;gap:10px;">
        <input type="text" id="new-clan-name" placeholder="Название клана" style="flex:1;padding:8px;">
        <input type="text" id="new-clan-tag" placeholder="ТЕГ" maxlength="5" style="width:70px;padding:8px;">
        <button class="btn" style="background:#27ae60;" onclick="FeaturesHub.createClanAction()">Создать (2,500 🪙)</button>
      </div>
      <h3>Список кланов сервера:</h3>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
        ${clans.map(c => `
          <div style="background:#222;padding:10px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <span style="font-size:20px;">${c.emblem || '🛡️'}</span>
              <b>[${c.tag}] ${c.name}</b> (Ур. ${c.level || 1})
              <div style="font-size:12px;color:#aaa;">Лидер: ${c.leader} | Участников: ${(c.members || []).length}</div>
            </div>
            <button class="btn btn-sm" onclick="alert('Заявка в клан [${c.tag}] отправлена!')">Вступить</button>
          </div>
        `).join('')}
      </div>
    `;
  },

  async createClanAction() {
    const name = document.getElementById('new-clan-name').value;
    const tag = document.getElementById('new-clan-tag').value;
    if (!name || !tag) return alert('Введите название и тег!');
    const res = await SupabaseFeatures.createClan(name, tag);
    if (!res.success) return alert(res.error);
    alert(`🎉 Клан [${tag}] ${name} успешно создан!`);
    this.openClans();
  },

  async openMailbox() {
    this.openModal('modal-mailbox');
    const container = document.getElementById('mailbox-content');
    const mails = await SupabaseFeatures.getMailbox();
    container.innerHTML = mails.map(m => `
      <div style="background:#222;border-left:4px solid #00e5ff;padding:12px;margin-bottom:10px;border-radius:4px;">
        <div style="display:flex;justify-content:space-between;">
          <b>${m.title}</b>
          <span style="color:#888;font-size:12px;">${m.date}</span>
        </div>
        <div style="color:#aaa;font-size:12px;margin:4px 0;">От: ${m.from}</div>
        <p style="font-size:13px;margin:8px 0;">${m.text}</p>
        ${m.claimed ? '<span style="color:#2ed573;font-size:12px;">✅ Награда получена</span>' : `
          <button class="btn btn-sm" style="background:#f39c12;" onclick="FeaturesHub.claimMail('${m.id}')">Забрать награду 🎁</button>
        `}
      </div>
    `).join('');
  },

  async claimMail(mailId) {
    const res = await SupabaseFeatures.claimMailAttachment(mailId);
    if (res.success) {
      alert('🎁 Награда успешно зачислена на аккаунт!');
      this.openMailbox();
      if (typeof updateUI === 'function') updateUI();
    }
  },

  async openWorldBoss() {
    this.openModal('modal-worldboss');
    const container = document.getElementById('worldboss-content');
    const boss = await SupabaseFeatures.getWorldBossStatus();
    const hpPct = Math.round((boss.currentHp / boss.maxHp) * 100);
    container.innerHTML = `
      <div style="text-align:center;margin-bottom:15px;">
        <div style="font-size:48px;">👹</div>
        <h3>${boss.name}</h3>
        <div style="background:#333;height:24px;border-radius:12px;overflow:hidden;margin:10px 0;border:1px solid #ff3300;">
          <div style="background:linear-gradient(90deg, #ff3300, #ff9900);width:${hpPct}%;height:100%;transition:0.3s;"></div>
        </div>
        <div>HP: ${boss.currentHp.toLocaleString()} / ${boss.maxHp.toLocaleString()} (${hpPct}%)</div>
      </div>
      <h4>Этапы наград рейда:</h4>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${boss.tierMilestones.map(m => `
          <div style="background:#222;padding:8px;border-radius:4px;display:flex;justify-content:space-between;">
            <span>Цель: ${m.hpTarget.toLocaleString()} HP</span>
            <span style="color:#f1c40f;">${m.reward}</span>
            <span>${m.claimed ? '✅ Получено' : '🔒 В процессе'}</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  openRanked() {
    this.openModal('modal-ranked');
    const container = document.getElementById('ranked-content');
    const rating = GameState.rankedRating || 1000;
    const league = SupabaseFeatures.getRankLeague(rating);
    container.innerHTML = `
      <div style="text-align:center;padding:20px;background:#222;border-radius:8px;">
        <div style="font-size:48px;">${league.icon}</div>
        <h2 style="color:${league.color};">${league.name}</h2>
        <div style="font-size:24px;margin:10px 0;font-weight:bold;">${rating} MMR</div>
        <p style="color:#aaa;">Сражайтесь в рейтинговых боях, чтобы повысить лигу и получить награды сезона!</p>
      </div>
    `;
  },

  openCalendar() {
    this.openModal('modal-calendar');
    const container = document.getElementById('calendar-content');
    const days = EconomyEngine.getDailyCalendarData();
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(6, 1fr);gap:8px;">
        ${days.map(d => `
          <div style="background:${d.claimed ? '#1b3a24' : '#222'};border:1px solid ${d.claimed ? '#2ed573' : '#444'};padding:8px;border-radius:4px;text-align:center;">
            <div style="font-size:12px;color:#aaa;">День ${d.day}</div>
            <div style="font-size:12px;font-weight:bold;margin:4px 0;color:#f1c40f;">${d.reward.text}</div>
            ${d.claimed ? '<span style="color:#2ed573;font-size:11px;">Получено</span>' : `
              <button class="btn btn-sm" style="font-size:10px;padding:2px 6px;" onclick="EconomyEngine.claimDailyCalendar(${d.day});FeaturesHub.openCalendar();">Забрать</button>
            `}
          </div>
        `).join('')}
      </div>
    `;
  },

  openWheel() {
    this.openModal('modal-wheel');
    document.getElementById('wheel-result').innerText = '';
  },

  spinWheelAction() {
    const res = EconomyEngine.spinWheel();
    if (res) {
      document.getElementById('wheel-result').innerText = `🎉 ВЫИГРЫШ: ${res.name}!`;
    }
  },

  openVaults() {
    this.openModal('modal-vaults');
    const container = document.getElementById('vaults-content');
    const v = GameState.vaults || { gold: 0, silver: 0, maxGold: 1000, maxSilver: 200000 };
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;text-align:center;">
        <div style="background:#222;padding:15px;border-radius:6px;border:1px solid #ffd700;">
          <div style="font-size:36px;">🪙</div>
          <h3>Золотой Сейф</h3>
          <div style="font-size:20px;font-weight:bold;color:#ffd700;margin:10px 0;">${v.gold} / ${v.maxGold || 1000} 🪙</div>
        </div>
        <div style="background:#222;padding:15px;border-radius:6px;border:1px solid #c0c0c0;">
          <div style="font-size:36px;">🥈</div>
          <h3>Серебряный Сейф</h3>
          <div style="font-size:20px;font-weight:bold;color:#c0c0c0;margin:10px 0;">${v.silver} / ${v.maxSilver || 200000} 🥈</div>
        </div>
      </div>
      <div style="text-align:center;margin-top:20px;">
        <button class="btn" style="background:#27ae60;font-size:16px;padding:10px 20px;" onclick="EconomyEngine.openVaults();FeaturesHub.openVaults();">🔓 ОТКРЫТЬ И ЗАБРАТЬ РЕСУРСЫ</button>
      </div>
    `;
  },

  openSpecialModes() {
    this.openModal('modal-special-modes');
  }
};

window.FeaturesHub = FeaturesHub;
console.log('✅ features-hub.js полностью готов');
