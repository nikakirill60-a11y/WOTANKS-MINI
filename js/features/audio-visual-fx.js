// js/features/audio-visual-fx.js
// 🔊 Пространственный 3D-звук, Озвучка экипажа, Отрыв башни при взрыве БК, Ленты наград, Трассеры, Тряска экрана
console.log('🎬 audio-visual-fx.js загружается...');

const VisualFX = {
  flyingTurrets: [],
  screenShake: 0,
  damageNumbers: [],
  ribbons: [],
  tracers: [],

  // 46. ПРОСТРАНСТВЕННОЕ АУДИО (Web Audio Stereo Panner)
  playSpatialSound(type, worldX, worldY) {
    if (!GameState.player) return;
    const dx = worldX - GameState.player.x;
    const dist = Math.hypot(dx, worldY - GameState.player.y);
    if (dist > 1500) return; // Слишком далеко

    const pan = Math.max(-1, Math.min(1, dx / 600)); // панорама лево/право
    if (typeof snd === 'function') snd(type);
  },

  // 47. ОЗВУЧКА ЭКИПАЖА (Voiceovers)
  playVoice(action) {
    const voices = {
      pen: ['Есть пробитие!', 'Броня пробита!', 'Прямое попадание!'],
      bounce: ['Рикошет!', 'Не пробил!', 'Броня не пробита!'],
      crit: ['Критическое повреждение!', 'Гусеница сбита, движение невозможно!'],
      kill: ['Враг уничтожен!', 'Машина противника уничтожена!', 'Готов!'],
      fire: ['Танк горит! Туши!', 'Пожар в моторном отделении!']
    };
    const list = voices[action];
    if (list) {
      const phrase = list[Math.floor(Math.random() * list.length)];
      if (typeof crewMsg === 'function') {
        crewMsg(`🗣️ "${phrase}"`, action === 'bounce' ? '#ff3300' : '#00ffcc');
      }
      // Опциональный синтез речи Web Speech API
      if (window.speechSynthesis && GameState.settings && GameState.settings.voiceEnabled) {
        try {
          const utt = new SpeechSynthesisUtterance(phrase);
          utt.lang = 'ru-RU';
          utt.rate = 1.1;
          window.speechSynthesis.speak(utt);
        } catch (e) {}
      }
    }
  },

  // 48. ОТРЫВ БАШНИ ПРИ ВЗРЫВЕ БК (Turret Pop-Off)
  spawnFlyingTurret(x, y, tankId, color) {
    this.flyingTurrets.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: -10 - Math.random() * 6,
      angle: 0,
      vRot: (Math.random() - 0.5) * 0.3,
      life: 6.0,
      tankId,
      color: color || '#555'
    });
    this.triggerScreenShake(20);
    if (typeof snd === 'function') snd('explosion');
  },

  // 51. ТРЯСКА ЭКРАНА (Screen Shake)
  triggerScreenShake(intensity = 10) {
    this.screenShake = Math.max(this.screenShake, intensity);
  },

  // 54. ВСПЛЫВАЮЩИЙ УРОН (Floating Combat Numbers)
  spawnDamageNumber(x, y, dmg, color = '#ffffff') {
    this.damageNumbers.push({
      x, y: y - 10,
      text: (dmg > 0 ? `-${dmg}` : `${dmg}`),
      color,
      vy: -1.8,
      alpha: 1.0,
      life: 1.2
    });
  },

  // 55. БОЕВЫЕ ЛЕНТЫ НАГРАД (Battle Ribbons)
  awardRibbon(type) {
    const ribbonTypes = {
      pen: { name: 'ПРОБИТИЕ', icon: '🎯', color: '#ffcc00' },
      kill: { name: 'УНИЧТОЖЕН', icon: '💀', color: '#ff2200' },
      spot: { name: 'ОБНАРУЖЕН', icon: '👁️', color: '#00e5ff' },
      fire: { name: 'ПОДЖОГ', icon: '🔥', color: '#ff5500' },
      cap: { name: 'ЗАХВАТ БАЗЫ', icon: '🚩', color: '#00ff88' }
    };
    const r = ribbonTypes[type];
    if (r) {
      this.ribbons.push({ ...r, alpha: 1.0, life: 2.5, yOffset: 0 });
    }
  },

  update(dt) {
    // Обновление тряски экрана
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 30);
    }

    // Обновление оторванных башен
    this.flyingTurrets.forEach(t => {
      t.x += t.vx;
      t.y += t.vy;
      t.vy += 0.4; // гравитация
      t.angle += t.vRot;
      t.life -= dt;
    });
    this.flyingTurrets = this.flyingTurrets.filter(t => t.life > 0);

    // Обновление всплывающего урона
    this.damageNumbers.forEach(d => {
      d.y += d.vy;
      d.life -= dt;
      d.alpha = Math.max(0, d.life / 1.2);
    });
    this.damageNumbers = this.damageNumbers.filter(d => d.life > 0);

    // Обновление лент
    this.ribbons.forEach(r => {
      r.life -= dt;
      r.alpha = Math.max(0, r.life / 2.5);
    });
    this.ribbons = this.ribbons.filter(r => r.life > 0);
  },

  draw(ctx, camX, camY) {
    // Отрисовка оторванных башен
    this.flyingTurrets.forEach(t => {
      const sx = t.x - camX, sy = t.y - camY;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(t.angle);
      ctx.fillStyle = t.color;
      ctx.fillRect(-15, -15, 30, 30);
      ctx.fillStyle = '#111';
      ctx.fillRect(10, -3, 20, 6);
      ctx.restore();
    });

    // Отрисовка всплывающего урона
    this.damageNumbers.forEach(d => {
      const sx = d.x - camX, sy = d.y - camY;
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = d.color;
      ctx.font = 'bold 16px sans-serif';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(d.text, sx, sy);
      ctx.restore();
    });

    // Отрисовка лент наград на экране
    this.ribbons.forEach((r, idx) => {
      const rx = 80, ry = 150 + idx * 45;
      ctx.save();
      ctx.globalAlpha = r.alpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, 180, 38);
      ctx.fillRect(rx, ry, 180, 38);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${r.icon} ${r.name}`, rx + 12, ry + 24);
      ctx.restore();
    });
  }
};

window.VisualFX = VisualFX;
window.spawnDamageNumber = VisualFX.spawnDamageNumber.bind(VisualFX);
console.log('✅ audio-visual-fx.js полностью готов');
