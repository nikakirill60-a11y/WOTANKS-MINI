// js/features/customization-attachments.js
// 🎨 Кастомизация танков: 3D-обвесы (фары, бревна, мешки, бочки), Отметки на стволе, 12 Камуфляжей, Гудки (Клаксоны), Аватары, Титулы
console.log('✨ customization-attachments.js загружается...');

const CustomizationEngine = {
  // 56. 3D ОБВЕСЫ
  attachments: {
    log: { name: 'Бревно самовытаскивания', icon: '🪵', slot: 'side', bonus: '+2% проходимость' },
    searchlight: { name: 'Прожектор «Луна»', icon: '🔦', slot: 'turret', bonus: '+10м обзор' },
    sandbags: { name: 'Мешки с песком', icon: '🧱', slot: 'front', bonus: '+3% броня лба' },
    fuel_drum: { name: 'Доп. бак с топливом', icon: '🛢️', slot: 'rear', bonus: '+2 км/ч макс. скорость' },
    track_links: { name: 'Запасные траки', icon: '⛓️', slot: 'hull', bonus: '+5% прочность гусениц' }
  },

  // 60. ПРИЦЕЛЫ (Crosshairs)
  crosshairStyles: ['classic', 'sniper_circle', 'scifi_hud', 'minimal_dot', 'arcade'],

  // 61. КЛАКСОНЫ (Horns)
  playHorn(style = 'standard') {
    if (typeof snd === 'function') snd('hit');
    if (typeof crewMsg === 'function') crewMsg('📢 БИП-БИП!', '#ffaa00');
  },

  // 64. ПРЕСТИЖНЫЕ ТИТУЛЫ
  titles: [
    { id: 't_rookie', name: 'Танкист', req: 'Старт' },
    { id: 't_ace', name: 'Гроза Рандома', req: '50 побед' },
    { id: 't_fist', name: 'Железный Кулак', req: '100 фрагов' },
    { id: 't_boss', name: 'Властелин Ваффентрагера', req: 'Победа за Blitzträger' },
    { id: 't_legend', name: 'Легенда Стали', req: '10 уровень техники' }
  ],

  // 63. АВАТАРЫ
  avatars: [
    { id: 'av_default', icon: '🎖️', name: 'Командир' },
    { id: 'av_krieger', icon: '⚡', name: 'Фон Кригер' },
    { id: 'av_bear', icon: '🐻', name: 'Русский Медведь' },
    { id: 'av_eagle', icon: '🦅', name: 'Грозный Орел' },
    { id: 'av_wolf', icon: '🐺', name: 'Ночной Волк' },
    { id: 'av_gold', icon: '👑', name: 'Золотой Император' }
  ],

  // 57. ОТМЕТКИ НА ОРУДИИ (Marks on Gun)
  getGunMarksCount(tankId) {
    const battles = (GameState.modules && GameState.modules[tankId + '_battles']) || 0;
    if (battles >= 100) return 3; // 3 звезды / кольца
    if (battles >= 50) return 2;
    if (battles >= 20) return 1;
    return 0;
  },

  // ОТРИСОВКА ОБВЕСОВ И ОТМЕТОК
  drawAttachments(ctx, tank) {
    if (!tank) return;

    // 57. Отрисовка отметок на стволе
    const marks = this.getGunMarksCount(tank.id);
    if (marks > 0) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < marks; i++) {
        ctx.fillRect(tank.stats.w / 2 + 10 + i * 5, -2, 2, 4);
      }
      ctx.restore();
    }

    // 56. Отрисовка бревна на борту
    ctx.save();
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(-tank.stats.w / 2, tank.stats.h / 2 - 3, tank.stats.w, 4);
    ctx.restore();
  }
};

window.CustomizationEngine = CustomizationEngine;
console.log('✅ customization-attachments.js полностью готов');
